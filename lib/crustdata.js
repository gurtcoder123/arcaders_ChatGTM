import { clean, crust, list, safeUrl } from "./providers.js";

const companyFields = [
  "basic_info.name", "basic_info.primary_domain", "basic_info.website", "basic_info.description",
  "basic_info.employee_count_range", "locations.headquarters"
];

function domainOf(value) {
  const domain = clean(value).toLowerCase();
  return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain) ? domain : "";
}

function company(record, kind) {
  const basic = record?.basic_info;
  const name = clean(basic?.name);
  if (!name) return null;
  const domain = domainOf(basic.primary_domain);
  return {
    kind,
    recordId: Number.isSafeInteger(record.crustdata_company_id) ? record.crustdata_company_id : null,
    name,
    domain,
    url: safeUrl(basic.website) || (domain && safeUrl("https://" + domain)),
    description: clean(basic.description, 800),
    headquarters: clean(record.locations?.headquarters) || clean(record.locations?.country),
    employees: Number.isFinite(record.headcount?.total) ? record.headcount.total : clean(basic.employee_count_range),
    founded: Number.isFinite(basic.year_founded) ? basic.year_founded : null,
    fundingUsd: Number.isFinite(record.funding?.total_investment_usd) ? record.funding.total_investment_usd : null,
    lastFundingRound: clean(record.funding?.last_round_type),
    lastFundingDate: clean(record.funding?.last_fundraise_date),
    updatedAt: clean(record.updated_at, 32)
  };
}

export async function enrichCompanies(key, values, signal) {
  const data = await crust("/company/enrich", {
    [key]: values,
    ...(key === "domains" && { exact_match: true }),
    fields: ["basic_info", "locations", "headcount", "funding"]
  }, signal);

  return list(data).flatMap(row => {
    const matchedOn = clean(row?.matched_on).toLowerCase();
    const matches = list(row?.matches).map(match => company(match?.company_data, "profile")).filter(Boolean);
    const exact = matches.filter(item => key === "domains" ? item.domain === matchedOn : item.name.toLowerCase() === matchedOn);
    return (exact.length ? exact : matches).slice(0, 2).map(item => ({
      ...item, matchedOn, unambiguous: exact.length === 1 && item === exact[0]
    }));
  });
}

export async function findCompanies(search, signal) {
  const data = await crust("/company/search", {
    search: { query: search.query, mode: "hybrid" },
    fields: companyFields,
    limit: search.kind === "prospect" ? 5 : 6
  }, signal);
  return list(data?.companies).map(row => company(row, search.kind)).filter(Boolean);
}

export async function findWeb(query, signal) {
  const data = await crust("/web/search/live", { query, sources: ["web"], page: 1 }, signal);
  if (data?.success === false) throw new Error("Web search failed");
  const pages = [];
  const seen = new Set();
  for (const item of list(data?.results)) {
    const url = safeUrl(item?.url);
    const name = clean(item?.title);
    const description = clean(item?.snippet, 600);
    if (!url || !name || !description || seen.has(url)) continue;
    seen.add(url);
    pages.push({ kind: "web", name, url, description, domain: new URL(url).hostname });
    if (pages.length === 6) break;
  }
  return pages;
}

const roleField = "experience.employment_details.current.title";
const personProfile = "social_handles.professional_network_identifier.profile_url";
const employerField = "experience.employment_details.current.company_id";

function roleMatches(title, roleKeywords) {
  const normalized = title.toLowerCase();
  return roleKeywords.some(keyword => normalized.includes(keyword.toLowerCase()));
}

export async function findPeople(companies, roleKeywords, signal) {
  const targets = new Map(companies.map(item => [item.recordId, item]));
  const data = await crust("/person/search", {
    filters: {
      op: "and",
      conditions: [
        { field: employerField, type: "in", value: [...targets.keys()] },
        { op: "or", conditions: roleKeywords.map(value => ({ field: roleField, type: "(.)", value })) }
      ]
    },
    fields: [
      "basic_profile.name", personProfile, roleField,
      "experience.employment_details.current.crustdata_company_id"
    ],
    limit: 24
  }, signal);

  const groups = new Map();
  const seen = new Set();
  for (const row of list(data?.profiles)) {
    const name = clean(row?.basic_profile?.name);
    const url = safeUrl(row?.social_handles?.professional_network_identifier?.profile_url);
    const job = list(row?.experience?.employment_details?.current).find(item =>
      targets.has(item?.crustdata_company_id) && roleMatches(clean(item.title), roleKeywords)
    );
    if (!name || !job || !url || seen.has(url)) continue;
    const employer = targets.get(job.crustdata_company_id);
    const group = groups.get(employer.recordId) ?? [];
    if (group.length === 2) continue;
    group.push({ kind: "person", name, url, company: employer.name, title: clean(job.title), companySourceId: employer.id });
    seen.add(url);
    groups.set(employer.recordId, group);
  }
  const matrix = [...groups.values()];
  return [...matrix.map(group => group[0]), ...matrix.flatMap(group => group.slice(1))].slice(0, 6);
}

function profileKey(value) {
  const url = safeUrl(value);
  if (!url) return "";
  const parsed = new URL(url);
  return parsed.hostname.replace(/^www\./, "").toLowerCase() + parsed.pathname.replace(/\/$/, "").toLowerCase();
}

export async function findBusinessEmails(people, signal) {
  const data = await crust("/person/contact/enrich", {
    professional_network_profile_urls: people.map(person => person.url),
    fields: ["contact.business_emails"],
    verified: true
  }, signal);
  const emails = new Map();
  for (const row of list(data)) {
    if (row?.match_status === "redacted") continue;
    const key = profileKey(row?.matched_on);
    if (!key) continue;
    const candidates = list(row?.matches).flatMap(match => list(match?.person_data?.contact?.business_emails));
    const email = candidates.find(item => item?.status === "deliverable" &&
      /^[A-Z0-9.!_+%-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(clean(item.email, 254)));
    if (email) emails.set(key, { email: clean(email.email, 254), emailStatus: "Deliverable · Crustdata" });
  }
  return people.map(person => ({ ...person, ...emails.get(profileKey(person.url)) }));
}
