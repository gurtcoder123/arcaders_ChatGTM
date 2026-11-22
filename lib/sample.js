import { examples } from "../public/examples.js";

const company = (id, name, kind, description, headquarters, employees) =>
  ({ id, name, kind, description, headquarters, employees });
const finding = (title, body, kind, ...sources) => ({ title, body, kind, sources });

const ledger = company("C1", "LedgerPeak", "profile", "Payments orchestration for B2B platforms with invoice reconciliation and configurable routing.", "Bengaluru, India", "51–200");
const move = company("C1", "Aster Freight", "prospect", "Regional third-party logistics provider coordinating payments across a network of carriers.", "Pune, India", "201–500");
const ship = company("C2", "Northline Logistics", "prospect", "Multi-branch freight and warehousing operator with a distributed supplier network.", "Gurugram, India", "201–500");
const rival = company("C1", "InvoiceFern", "competitor", "Invoice capture and approval workflows for mid-sized finance teams.", "Bengaluru, India", "51–200");
const platform = company("C2", "Bookstride", "competitor", "ERP and accounting suite with embedded vendor payments and expense workflows.", "Mumbai, India", "201–500");

const samples = {
  company: {
    title: "LedgerPeak company snapshot",
    summary: "LedgerPeak illustrates a payments platform aimed at finance and product teams that manage fragmented B2B payment flows. Its clearest wedge is helping platforms reconcile invoices and payments across providers.",
    summarySources: ["C1"],
    companies: [ledger],
    sections: [{
      title: "Business and buyers",
      findings: [
        finding("Payments plus reconciliation", "The sample profile combines configurable payment routing with invoice reconciliation. Product teams may buy orchestration, while finance operations would typically own the reconciliation workflow.", "assessment", "C1"),
        finding("Likely distribution", "An integration with vertical SaaS platforms could put LedgerPeak closer to recurring transaction volume. Validate implementation time before making that the main sales pitch.", "recommendation", "C1")
      ]
    }, {
      title: "Commercial risks",
      findings: [
        finding("Switching and reliability", "Prospects may demand redundancy, implementation support and auditable failover before replacing payment infrastructure. Test the proposition through a single payment route first.", "assessment", "C1")
      ]
    }]
  },
  market: {
    title: "Accounts payable automation in India",
    summary: "Start with multi-location logistics operators that work with many carriers and suppliers. A focused pilot around invoice-to-payment reconciliation offers a measurable reason for finance teams to adopt the product.",
    summarySources: ["C1", "C2"],
    companies: [move, ship],
    sections: [{
      title: "Beachhead and positioning",
      findings: [
        finding("Prioritize multi-branch logistics", "Test the hypothesis that branch-level invoice approvals and carrier reconciliation cause delays. Qualify accounts against invoice volume, turnaround times and the number of approval handoffs.", "assessment", "C1", "C2"),
        finding("Sell a finance outcome", "Position the product around fewer manual exceptions and faster invoice closure. Lead with a workflow that can sit alongside the buyer's accounting system.", "recommendation")
      ]
    }, {
      title: "First 90 days",
      findings: [
        finding("Days 1–30 · Validate the workflow", "Interview controllers and accounts payable managers. Collect baseline metrics for manual touches, exception volume and time to approve an invoice.", "recommendation"),
        finding("Days 31–90 · Run two pilots", "Start with one branch per pilot and a single supplier category. Agree on invoice approval time, exception rate and successful reconciliation before rollout.", "recommendation")
      ]
    }]
  },
  competition: {
    title: "The AP automation competitive landscape",
    summary: "Point solutions compete on fast invoice capture and approval. ERP suites compete on integration and an existing footprint. A new entrant could test a deeper workflow for multi-branch, supplier-heavy operations.",
    summarySources: ["C1", "C2"],
    companies: [rival, platform],
    sections: [{
      title: "Where competitors overlap",
      findings: [
        finding("InvoiceFern · workflow specialist", "The sample profile emphasizes capture and approvals. This positioning is likely to appeal to finance teams looking for a discrete automation project.", "assessment", "C1"),
        finding("Bookstride · suite substitute", "The sample profile lists vendor payments within an accounting suite. Existing customers may prefer its embedded workflow when it covers their approvals and reconciliation.", "assessment", "C2")
      ]
    }, {
      title: "Differentiation to test",
      findings: [
        finding("Own invoice exceptions after capture", "Show how the product resolves a disputed carrier invoice across branches and creates an audit trail. Measure handling time against the buyer's current process.", "recommendation", "C1", "C2")
      ]
    }]
  },
  prospects: {
    title: "Buyer shortlist for AP automation",
    summary: "Aster Freight and Northline Logistics illustrate the target account profile. Both have vendor-heavy operations where the finance team could benefit from structured invoice approval and reconciliation.",
    summarySources: ["C1", "C2"],
    companies: [move, ship],
    people: [
      { id: "P1", kind: "person", name: "Meera Shah", title: "Chief Financial Officer", company: "Aster Freight", companySourceId: "C1", email: "meera@aster-freight.example", emailStatus: "Sample address" },
      { id: "P2", kind: "person", name: "Arjun Rao", title: "Head of Finance", company: "Northline Logistics", companySourceId: "C2", email: "arjun@northline-logistics.example", emailStatus: "Sample address" }
    ],
    sections: [{
      title: "Account fit",
      findings: [
        finding("Aster Freight", "A carrier network points to a possible need for consistent invoice matching. Ask the CFO how disputed or incomplete carrier invoices are handled today.", "assessment", "C1", "P1"),
        finding("Northline Logistics", "Multiple operating branches suggest a potential approval bottleneck. Ask whether finance teams reconcile supplier payments centrally or branch by branch.", "assessment", "C2", "P2")
      ]
    }, {
      title: "Outreach angle",
      findings: [
        finding("Make the first call about exceptions", "Ask for a walkthrough of one supplier invoice from receipt to payment. Offer a pilot that measures manual interventions and time to closure.", "recommendation", "C1", "C2")
      ]
    }]
  }
};

export function sampleReport(id) {
  const sample = samples[id];
  const people = sample.people ?? [];
  return {
    ...sample, people, sources: [...sample.companies, ...people],
    query: examples.find(example => example.id === id).query,
    mode: "sample", lens: id, createdAt: new Date().toISOString(),
    limitations: ["This sample uses fictional companies, profiles, and contact details. It illustrates how a research brief is organized."]
  };
}
