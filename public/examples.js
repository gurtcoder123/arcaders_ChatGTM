export const lenses = [
  { id: "auto", label: "Research home", icon: "home" },
  { id: "company", label: "Company intelligence", icon: "building" },
  { id: "market", label: "Market entry & GTM", icon: "compass" },
  { id: "competition", label: "Competitor analysis", icon: "layers" },
  { id: "prospects", label: "Customer discovery", icon: "users" }
];

export const examples = [
  {
    id: "company", icon: "building", title: "Company snapshot",
    description: "Understand a business and its growth signals.",
    query: "Profile LedgerPeak, a fictional B2B payments platform. What does it sell, who buys it, and what are its commercial risks?",
    liveQuery: "Profile Retool. What does it sell, who buys it, and what are its commercial risks?"
  },
  {
    id: "market", icon: "compass", title: "Market entry",
    description: "Find an initial segment and a route to market.",
    query: "Build a go-to-market plan for entering India's mid-market with an accounts payable automation product."
  },
  {
    id: "competition", icon: "layers", title: "Competitive landscape",
    description: "Compare rivals, substitutes, and positioning.",
    query: "Map the competitive landscape for accounts payable automation in India. Where could a new entrant differentiate?"
  },
  {
    id: "prospects", icon: "users", title: "Find potential customers",
    description: "Identify target accounts and buyer contacts.",
    query: "Find potential customers and CFO contacts for accounts payable automation at mid-sized Indian logistics companies."
  }
];
