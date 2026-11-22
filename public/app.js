import { examples, lenses } from "./examples.js";

const icons = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  home: '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-3 6v-3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2 5.2-5.2 2 2-5.2z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/><circle cx="9" cy="7" r="4"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "arrow-right": '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  "arrow-up-right": '<path d="M7 17 17 7M7 7h10v10"/>',
  sparkle: '<path d="M12 2.5c.8 5.6 3.9 8.7 9.5 9.5-5.6.8-8.7 3.9-9.5 9.5-.8-5.6-3.9-8.7-9.5-9.5 5.6-.8 8.7-3.9 9.5-9.5Z"/>',
  sliders: '<path d="M5 4v16m7-16v16m7-16v16M3 8h4m3 8h4m3-6h4"/>',
  file: '<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Zm0 0v7h7M8 14h8m-8 3h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  mailbox: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>'
};

const icon = name => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[name] || "") + "</svg>";
const byId = id => document.getElementById(id);
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
));
const labelFor = id => lenses.find(lens => lens.id === id)?.label || "Research brief";
const categories = {
  profile: "Company profile", market: "Market participant", competitor: "Competitor candidate",
  prospect: "Potential customer", web: "Public web", person: "Professional profile"
};
const tones = { evidence: "Evidence", assessment: "Assessment", recommendation: "Recommendation" };
const stages = { planning: "Define the research scope", gathering: "Gather Crustdata evidence", contacts: "Check decision-maker profiles", writing: "Write the brief" };
const focusQuestion = () => byId("question").focus({ preventScroll: true });
const setView = view => {
  for (const id of ["home", "working", "brief"]) byId(id).hidden = id !== view;
  window.scrollTo(0, 0);
};

let mode = "checking";
let current;
let running;
let tab = "analysis";
let selectedLens = "auto";
let history = [];
try {
  const stored = JSON.parse(sessionStorage.getItem("chatgtm.briefs") || "[]");
  if (Array.isArray(stored)) history = stored.slice(0, 8);
} catch {
  // Browser storage may be unavailable.
}

function renderNav() {
  byId("lens-nav").innerHTML = lenses.map(lens => `
    <button type="button" class="nav-item ${selectedLens === lens.id ? "active" : ""}" data-lens="${lens.id}"
      aria-current="${selectedLens === lens.id ? "page" : "false"}">${icon(lens.icon)}<span>${lens.label}</span></button>`).join("");
  byId("recent").innerHTML = history.length ? history.map((report, index) => `
    <button type="button" class="recent-item ${report === current ? "recent-active" : ""}" data-recent="${index}">
      ${icon("file")}<span>${escape(report.title)}</span>
    </button>`).join("") : '<p class="recent-empty">Your briefs will appear here.</p>';
}

function setLens(lens) {
  selectedLens = lens;
  byId("lens").value = lens;
  renderNav();
}

function closeMenu() {
  document.body.classList.remove("nav-open");
  byId("menu-toggle").setAttribute("aria-expanded", "false");
  byId("nav-scrim").hidden = true;
}

function openHome(lens = "auto", clear = true, focus = true) {
  running?.abort();
  running = undefined;
  current = undefined;
  setLens(lens);
  byId("breadcrumb").textContent = labelFor(lens);
  if (clear) byId("question").value = "";
  byId("question-error").hidden = true;
  closeMenu();
  setView("home");
  if (focus) focusQuestion();
}

function setMode(value) {
  mode = value;
  byId("mode-pill").dataset.mode = value;
  byId("connection-dot").dataset.mode = value;
  byId("mode-label").textContent = { live: "Live research", sample: "Sample mode", offline: "Research unavailable" }[value];
  byId("connection-detail").textContent = { live: "Live research enabled", sample: "Sample workspace", offline: "Connection unavailable" }[value];
}

function setProgress(stage) {
  const sequence = ["planning", "gathering", ...(stage === "contacts" || byId("progress-list").dataset.contacts ? ["contacts"] : []), "writing"];
  if (stage === "contacts") byId("progress-list").dataset.contacts = "true";
  const currentIndex = sequence.indexOf(stage);
  byId("progress-list").innerHTML = sequence.map((step, index) => `
    <li class="${index < currentIndex ? "done" : index === currentIndex ? "in-progress" : ""}">
      <span>${index < currentIndex ? icon("check") : index === currentIndex ? '<i class="spinner"></i>' : "·"}</span>${stages[step]}
    </li>`).join("");
  byId("announcement").textContent = stages[stage] || "";
}

function showError(message) {
  const notice = byId("question-error");
  notice.textContent = message;
  notice.hidden = false;
}

async function runResearch() {
  if (running) return;
  const query = byId("question").value.trim();
  if (query.length < 3) {
    showError("Enter a research question of at least 3 characters.");
    focusQuestion();
    return;
  }
  const lens = byId("lens").value;
  const abort = new AbortController();
  running = abort;
  byId("question-error").hidden = true;
  byId("working-query").textContent = query;
  delete byId("progress-list").dataset.contacts;
  setProgress("planning");
  setView("working");
  byId("cancel").focus();
  try {
    const response = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, lens }),
      signal: abort.signal
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(detail?.error || "Research is temporarily unavailable. Try again.");
    }
    if (!response.body || !response.headers.get("content-type")?.includes("application/x-ndjson")) {
      throw new Error("Research is temporarily unavailable. Try again.");
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let result;
    const consume = line => {
      if (!line.trim() || running !== abort) return;
      const event = JSON.parse(line);
      if (event.type === "progress") setProgress(event.stage);
      if (event.type === "error") throw new Error(event.error);
      if (event.type === "report") result = event.report;
    };
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop();
        lines.forEach(consume);
      }
      consume(buffer);
    } finally {
      reader.releaseLock();
    }
    if (running !== abort) return;
    if (!result) throw new Error("The research connection ended early. Run the brief again.");
    history = [result, ...history.filter(item => item.query !== result.query || item.lens !== result.lens)].slice(0, 8);
    try {
      sessionStorage.setItem("chatgtm.briefs", JSON.stringify(history));
    } catch {
      // The brief remains available in this page.
    }
    running = undefined;
    openBrief(result);
  } catch (error) {
    if (running !== abort) return;
    running = undefined;
    setView("home");
    showError(error instanceof TypeError || error instanceof SyntaxError
      ? "Could not connect to the research service. Try again." : error.message);
    focusQuestion();
  }
}

function openBrief(report) {
  running?.abort();
  running = undefined;
  current = report;
  tab = "analysis";
  setLens(report.lens);
  byId("breadcrumb").textContent = "Research brief";
  closeMenu();
  renderBrief();
  setView("brief");
  byId("brief-title").focus({ preventScroll: true });
  byId("announcement").textContent = "Research brief ready.";
}

function safeLink(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? escape(url.href) : "";
  } catch {
    return "";
  }
}

function citations(ids) {
  return (ids ?? []).map(id => `<button type="button" class="citation" data-source="${escape(id)}"
    aria-label="View source ${escape(id)}">${escape(id)}</button>`).join("");
}

function sourceLink(url, text) {
  const safe = safeLink(url);
  return safe ? `<a class="source-link" href="${safe}" target="_blank" rel="noopener noreferrer">${escape(text)} ${icon("arrow-up-right")}</a>` : "";
}

function empty(message, image) {
  return `<div class="empty-panel">${icon(image)}<p>${escape(message)}</p></div>`;
}

function analysis(report) {
  return `
    <section class="summary-card"><h2>Executive summary</h2>
      <p>${escape(report.summary)}</p><div class="citations">${citations(report.summarySources)}</div>
    </section>
    ${report.sections.map(section => `
      <section class="brief-section"><h2>${escape(section.title)}</h2>
        ${section.findings.map(item => `<article class="finding">
          <span class="finding-kind ${escape(item.kind)}">${escape(tones[item.kind] || "Finding")}</span>
          <h3>${escape(item.title)}</h3><p>${escape(item.body)}</p>
          <div class="citations">${citations(item.sources)}</div>
        </article>`).join("")}
      </section>`).join("")}
    ${report.limitations.length ? `<section class="limitations"><h2>Coverage and limitations</h2><ul>
      ${report.limitations.map(item => `<li>${escape(item)}</li>`).join("")}</ul></section>` : ""}`;
}

function formatCompany(item) {
  const funded = Number.isFinite(item.fundingUsd) && item.fundingUsd > 0
    ? new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact" }).format(item.fundingUsd) : "";
  const data = [
    ["Headquarters", item.headquarters], ["Employees", Number.isFinite(item.employees) ? item.employees.toLocaleString() : item.employees],
    ["Founded", item.founded], ["Funding reported", funded], ["Last reported round", item.lastFundingRound]
  ].filter(([, value]) => value);
  return `<article class="record">
    <div class="record-top"><span class="record-icon">${icon("building")}</span><div>
      <div class="record-label">${escape((item.categories ?? [item.kind]).map(kind => categories[kind]).filter(Boolean).join(" · "))}</div>
      <h3>${escape(item.name)}</h3></div><div class="record-citation">${citations([item.id])}</div>
    </div>
    ${item.description ? `<p>${escape(item.description)}</p>` : ""}
    ${data.length ? `<dl class="record-details">${data.map(([key, value]) => `<div><dt>${key}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>` : ""}
    ${sourceLink(item.url, item.domain || "Company website")}
  </article>`;
}

function formatPerson(person) {
  const address = /^[A-Z0-9.!_+%-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(person.email ?? "") ? escape(person.email) : "";
  return `<article class="record">
    <div class="record-top"><span class="record-icon">${icon("users")}</span><div>
      <div class="record-label">${escape(person.company)}</div><h3>${escape(person.name)}</h3></div>
      <div class="record-citation">${citations([person.id])}</div></div>
    <p>${escape(person.title)}</p>
    <div class="person-email">${icon("mailbox")}${address && current.mode === "live"
      ? `<a href="mailto:${address}">${address}</a>`
      : `<span>${address || "Business email unavailable"}</span>`}
      ${address ? `<small>${escape(person.emailStatus)}</small>` : ""}
    </div>
    ${sourceLink(person.url, "Professional profile")}
  </article>`;
}

function formatSource(item) {
  const name = item.kind === "person" ? item.name + " · " + item.company : item.name;
  return `<article class="source-row" id="source-${escape(item.id)}" tabindex="-1">
    <span class="source-id">${escape(item.id)}</span>
    <div><span class="record-label">${escape(current.mode === "sample" ? "Fictional sample record" : categories[item.kind] || "Crustdata record")}</span>
    <h3>${escape(name)}</h3>${item.description || item.title ? `<p>${escape(item.description || item.title)}</p>` : ""}
    ${item.updatedAt ? `<p class="source-date">Record updated ${escape(item.updatedAt.slice(0, 10))}</p>` : ""}
    ${sourceLink(item.url, item.domain || "View original")}</div>
  </article>`;
}

function renderBrief() {
  const report = current;
  const tabs = [
    ["analysis", "Analysis"], ["companies", "Companies", report.companies.length],
    ["people", "People", report.people.length], ["sources", "Sources", report.sources.length]
  ];
  const panels = {
    analysis: () => analysis(report),
    companies: () => report.companies.length ? '<div class="record-grid">' + report.companies.map(formatCompany).join("") + "</div>"
      : empty("No company records were returned for this brief.", "building"),
    people: () => report.people.length ? '<div class="record-grid">' + report.people.map(formatPerson).join("") + "</div>"
      : empty("No decision-maker profiles are available for this brief. Ask for buyer contacts at named companies or in a specific segment.", "users"),
    sources: () => report.sources.length ? '<div class="source-list">' + report.sources.map(formatSource).join("") + "</div>"
      : empty("This brief has no retrieved source records.", "globe")
  };
  byId("brief").innerHTML = `
    <header class="report-header">
      <div>
        <p class="report-label">${icon("file")} ${escape(labelFor(report.lens))}</p>
        <h1 id="brief-title" tabindex="-1">${escape(report.title)}</h1>
        <p class="report-question">${escape(report.query)}</p>
      </div>
      <button type="button" class="secondary-button download-button" data-download>${icon("download")} Download brief</button>
    </header>
    ${report.mode === "sample" ? '<p class="sample-notice"><strong>Sample brief</strong> · Fictional records and contact details.</p>' : ""}
    <nav class="report-tabs" aria-label="Brief sections">
      ${tabs.map(([id, label, count]) => `<button type="button" data-tab="${id}" aria-pressed="${id === tab}">
        ${label}${count !== undefined ? `<span>${count}</span>` : ""}</button>`).join("")}
    </nav>
    <div class="report-panel">${panels[tab]()}</div>`;
}

function downloadBrief() {
  const report = current;
  const body = [
    "# " + report.title, report.mode === "sample" ? "Sample brief · Fictional records and contacts" : "Live research brief",
    report.query, "## Executive summary", report.summary + (report.summarySources.length ? " [" + report.summarySources.join(", ") + "]" : ""),
    ...report.sections.flatMap(section => ["## " + section.title, ...section.findings.map(item =>
      "- **" + item.title + "** (" + tones[item.kind] + ") " + item.body + (item.sources.length ? " [" + item.sources.join(", ") + "]" : ""))]),
    ...(report.limitations.length ? ["## Coverage and limitations", ...report.limitations.map(item => "- " + item)] : []),
    ...(report.people.length ? ["## Decision-makers", ...report.people.map(item =>
      "- " + [item.name, item.title, item.company, item.email, item.emailStatus, item.url].filter(Boolean).join(" · "))] : []),
    ...(report.sources.length ? ["## Sources", ...report.sources.map(item =>
      "- [" + item.id + "] " + [item.name, item.url, item.description].filter(Boolean).join(" · "))] : [])
  ].join("\n\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/markdown; charset=utf-8" }));
  const download = document.createElement("a");
  download.href = url;
  download.download = "chatgtm-brief.md";
  download.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function drawOrbit() {
  const canvas = byId("hero-art");
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const x = width * 0.69;
  const y = height * 0.46;
  const radius = Math.min(width * 0.42, height * 0.56);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
  glow.addColorStop(0, "rgba(120, 105, 255, .25)");
  glow.addColorStop(1, "rgba(120, 105, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const ring = (wide, tall, angle, color) => {
    ctx.beginPath();
    ctx.ellipse(x, y, radius * wide, radius * tall, angle, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.stroke();
  };
  for (let i = 1; i <= 4; i++) ring(.53 + i * .22, .24 + i * .16, -.41, "rgba(167, 153, 255, .16)");
  ring(.92, .92, 0, "rgba(173, 165, 255, .37)");
  for (let i = 1; i < 7; i++) ring(i * .13, .92, -.29, "rgba(167, 153, 255, .13)");
  for (let i = -8; i <= 8; i++) {
    const phi = i * Math.PI / 19;
    const yDot = Math.sin(phi) * radius * .91;
    const span = Math.cos(phi) * radius * .91;
    for (let j = 0; j < 24; j++) {
      const longitude = j * Math.PI / 23;
      const dx = Math.cos(longitude) * span;
      const dz = Math.sin(longitude);
      const wave = Math.cos(i * .77 + j * .53) * Math.cos(j * .39 - i * .7);
      const positionX = x + dx * .96 + yDot * .27;
      const positionY = y + yDot * .96 - dx * .27;
      ctx.fillStyle = "rgba(183, 169, 255, " + (.15 + dz * .27 + (wave > .11 ? .29 : 0)) + ")";
      ctx.beginPath();
      ctx.arc(positionX, positionY, wave > .11 ? 1.65 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const nodes = [[-.62, -.47], [.45, -.53], [.67, .37], [-.49, .58]];
  ctx.strokeStyle = "rgba(197, 181, 255, .34)";
  ctx.beginPath();
  nodes.forEach(([dx, dy], i) => i ? ctx.lineTo(x + dx * radius, y + dy * radius) : ctx.moveTo(x + dx * radius, y + dy * radius));
  ctx.stroke();
  for (const [dx, dy] of nodes) {
    const pointX = x + dx * radius;
    const pointY = y + dy * radius;
    ctx.beginPath();
    ctx.arc(pointX, pointY, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(179, 153, 255, .25)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pointX, pointY, 3.3, 0, Math.PI * 2);
    ctx.fillStyle = "#d9c9ff";
    ctx.fill();
  }
}

document.querySelectorAll("[data-icon]").forEach(element => { element.innerHTML = icon(element.dataset.icon); });
byId("lens").innerHTML = lenses.map(lens => `<option value="${lens.id}">${lens.id === "auto" ? "Auto-detect lens" : lens.label}</option>`).join("");
byId("example-grid").innerHTML = examples.map(example => `
  <button type="button" class="example-card ${example.id}" data-example="${example.id}">
    <span class="example-top"><span class="example-icon">${icon(example.icon)}</span><span class="example-arrow">${icon("arrow-up-right")}</span></span>
    <strong>${example.title}</strong><span class="example-description">${example.description}</span>
  </button>`).join("");
renderNav();

byId("composer").addEventListener("submit", event => {
  event.preventDefault();
  void runResearch();
});
byId("lens").addEventListener("change", event => {
  setLens(event.target.value);
  byId("breadcrumb").textContent = labelFor(selectedLens);
});
byId("lens-nav").addEventListener("click", event => {
  const button = event.target.closest("[data-lens]");
  if (button) openHome(button.dataset.lens, false);
});
byId("recent").addEventListener("click", event => {
  const button = event.target.closest("[data-recent]");
  if (button) openBrief(history[Number(button.dataset.recent)]);
});
byId("example-grid").addEventListener("click", event => {
  const button = event.target.closest("[data-example]");
  if (!button) return;
  const example = examples.find(item => item.id === button.dataset.example);
  openHome(example.id, false);
  byId("question").value = mode === "live" ? example.liveQuery ?? example.query : example.query;
  if (mode === "sample") void runResearch();
});
byId("brief").addEventListener("click", event => {
  const tabButton = event.target.closest("[data-tab]");
  const citation = event.target.closest("[data-source]");
  if (tabButton) {
    tab = tabButton.dataset.tab;
    renderBrief();
    byId("brief").querySelector('[data-tab="' + tab + '"]').focus();
  }
  if (citation) {
    tab = "sources";
    renderBrief();
    byId("source-" + citation.dataset.source)?.focus();
  }
  if (event.target.closest("[data-download]")) downloadBrief();
});
byId("new-brief").addEventListener("click", () => openHome());
byId("brand").addEventListener("click", () => openHome());
byId("cancel").addEventListener("click", () => openHome(selectedLens, false));
byId("menu-toggle").addEventListener("click", () => {
  if (document.body.classList.contains("nav-open")) return closeMenu();
  document.body.classList.add("nav-open");
  byId("nav-scrim").hidden = false;
  byId("menu-toggle").setAttribute("aria-expanded", "true");
});
byId("nav-scrim").addEventListener("click", closeMenu);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMenu();
  if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest("input, textarea, select, [contenteditable]") && !running) {
    event.preventDefault();
    openHome(selectedLens, false);
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && event.target === byId("question")) {
    byId("composer").requestSubmit();
  }
});

new ResizeObserver(drawOrbit).observe(byId("hero-art"));
fetch("/api/research").then(async response => {
  if (!response.ok) throw new Error("Unavailable");
  setMode((await response.json()).mode === "live" ? "live" : "sample");
}).catch(() => setMode("offline"));
