import type { Competitor, DecisionEvent, ProductKey } from "./types";

export const PRODUCT_CATALOG: Record<
  ProductKey,
  {
    name: string;
    description: string;
    cost: number;
    unlockReputation: number;
  }
> = {
  everyday: {
    name: "Everyday Account",
    description: "Core current account, payments and debit services.",
    cost: 0,
    unlockReputation: 0,
  },
  savings: {
    name: "High-Yield Savings",
    description: "Accelerates deposit growth and customer retention.",
    cost: 220_000,
    unlockReputation: 0,
  },
  mortgage: {
    name: "Home Mortgage",
    description: "Builds a large secured retail lending portfolio.",
    cost: 650_000,
    unlockReputation: 45,
  },
  sme: {
    name: "SME Banking",
    description: "Serves local companies with loans and fee services.",
    cost: 900_000,
    unlockReputation: 52,
  },
  cards: {
    name: "Credit Cards",
    description: "High fee income, but stronger fraud controls are needed.",
    cost: 1_100_000,
    unlockReputation: 58,
  },
  insurance: {
    name: "Insurance",
    description: "Adds stable commission income and deeper relationships.",
    cost: 1_750_000,
    unlockReputation: 64,
  },
  wealth: {
    name: "Wealth Management",
    description: "Premium advisory income for affluent customers.",
    cost: 3_200_000,
    unlockReputation: 72,
  },
};

export const SERVICE_REASSIGNMENT = {
  durationDays: 30,
  serviceCapacityMultiplier: 2,
  customerGrowthMultiplier: 0.65,
  minimumDailyServiceChange: 0.28,
} as const;

export const DECISIONS: DecisionEvent[] = [
  {
    id: "complaint-wave",
    title: "Service pressure is becoming visible",
    description:
      "Response times are rising after a period of growth. Management needs a clear service strategy, not another temporary patch.",
    category: "customer",
    choices: [
      {
        id: "reassign-teams",
        label: "Reassign teams for 30 days",
        description:
          "Move capacity from sales to service. Customer experience improves, but growth slows temporarily.",
        effect: { satisfaction: 4, brandStrength: -1, boardConfidence: 1 },
      },
      {
        id: "service-recovery",
        label: "Launch a focused recovery programme",
        description:
          "A limited NOK 90k programme improves training, queue management and communication.",
        effect: { cash: -90_000, satisfaction: 7, reputation: 2 },
      },
      {
        id: "priority-service",
        label: "Prioritise key customer segments",
        description:
          "Protect the most profitable relationships while accepting weaker service elsewhere.",
        effect: { satisfaction: -3, brandStrength: 2, boardConfidence: 1 },
      },
    ],
  },
  {
    id: "regulator-review",
    title: "Regulatory controls need attention",
    description:
      "Growth has exposed gaps in documentation and monitoring. The board wants a proportionate remediation plan.",
    category: "regulatory",
    choices: [
      {
        id: "independent-review",
        label: "Commission an independent review",
        description:
          "NOK 180k buys a fast and credible control review with a strong long-term effect.",
        effect: { cash: -180_000, compliance: 11, reputation: 2, boardConfidence: 3 },
      },
      {
        id: "phased-remediation",
        label: "Run phased internal remediation",
        description:
          "Use existing teams and a small specialist budget. Progress is slower, but affordable.",
        effect: { cash: -60_000, compliance: 6, boardConfidence: 1 },
      },
      {
        id: "defer-controls",
        label: "Submit a plan and defer the work",
        description:
          "Preserves cash now, but leaves the bank more exposed to future supervisory action.",
        effect: { compliance: -5, reputation: -2, boardConfidence: -4 },
      },
    ],
  },
  {
    id: "cyber-incident",
    title: "Suspicious activity in online banking",
    description:
      "Security monitoring has identified abnormal login attempts. No confirmed customer loss has occurred yet.",
    category: "technology",
    choices: [
      {
        id: "isolate-investigate",
        label: "Isolate systems and investigate",
        description:
          "A controlled NOK 120k response reduces risk substantially, with a short service interruption.",
        effect: { cash: -120_000, cyberSecurity: 10, satisfaction: -2, compliance: 3 },
      },
      {
        id: "overnight-patch",
        label: "Deploy a controlled overnight patch",
        description:
          "A balanced NOK 45k response with some residual exposure.",
        effect: { cash: -45_000, cyberSecurity: 6, fraudLosses: 15_000 },
      },
      {
        id: "accept-monitor",
        label: "Accept the risk and monitor",
        description:
          "No project cost, but the bank carries greater operational and fraud exposure.",
        effect: { cyberSecurity: -4, fraudLosses: 100_000, reputation: -2 },
      },
    ],
  },
  {
    id: "star-manager",
    title: "A key manager is considering another offer",
    description:
      "A competitor has approached one of the bank's strongest operators. The issue is career structure as much as salary.",
    category: "people",
    choices: [
      {
        id: "career-package",
        label: "Offer a career and retention package",
        description:
          "A targeted NOK 60k package protects continuity and signals a stronger leadership culture.",
        effect: { cash: -60_000, satisfaction: 2, boardConfidence: 2 },
      },
      {
        id: "broaden-role",
        label: "Broaden the manager's mandate",
        description:
          "Offer more responsibility instead of a large cash payment.",
        effect: { brandStrength: 2, boardConfidence: 1 },
      },
      {
        id: "build-bench",
        label: "Let the manager leave and build the bench",
        description:
          "Accept short-term disruption to avoid dependence on one individual.",
        effect: { employees: -1, satisfaction: -2, reputation: -1, boardConfidence: 1 },
      },
    ],
  },
  {
    id: "rate-war",
    title: "A competitor is targeting your deposit customers",
    description:
      "A digital challenger has launched an aggressive savings campaign. Choose whether to defend price, relationships or margin.",
    category: "market",
    choices: [
      {
        id: "targeted-pricing",
        label: "Use targeted retention pricing",
        description:
          "Spend NOK 75k on selected customers rather than repricing the entire deposit book.",
        effect: { cash: -75_000, deposits: 420_000, satisfaction: 3 },
      },
      {
        id: "service-defence",
        label: "Compete on service and trust",
        description:
          "Protect the brand and accept modest deposit leakage instead of starting a price war.",
        effect: { deposits: -140_000, brandStrength: 4, reputation: 2 },
      },
      {
        id: "broad-match",
        label: "Match the campaign broadly",
        description:
          "A larger NOK 110k campaign protects volume, but management accepts lower near-term margin.",
        effect: { cash: -110_000, deposits: 720_000, brandStrength: 2 },
      },
    ],
  },
];

export function initialCompetitors(): Competitor[] {
  return [
    {
      id: "fjord",
      name: "Fjord Community Bank",
      strategy: "conservative",
      customers: 2_600,
      deposits: 38_000_000,
      loans: 27_000_000,
      reputation: 61,
      marketShare: 6.3,
      depositRate: 2.45,
      loanRate: 6.75,
      branches: 3,
      digitalLevel: 42,
      acquisitionPrice: 11_000_000,
      specialty: "Local relationships and conservative mortgages",
      enteredDay: 1,
    },
    {
      id: "nova",
      name: "Nova Digital",
      strategy: "digital",
      customers: 4_100,
      deposits: 44_000_000,
      loans: 31_000_000,
      reputation: 68,
      marketShare: 9.8,
      depositRate: 3.1,
      loanRate: 6.15,
      branches: 0,
      digitalLevel: 91,
      acquisitionPrice: 19_000_000,
      specialty: "Mobile-first everyday banking",
      enteredDay: 1,
    },
    {
      id: "crown",
      name: "Crown Private Bank",
      strategy: "premium",
      customers: 1_350,
      deposits: 63_000_000,
      loans: 39_000_000,
      reputation: 76,
      marketShare: 3.2,
      depositRate: 2.2,
      loanRate: 7.2,
      branches: 2,
      digitalLevel: 67,
      acquisitionPrice: 24_000_000,
      specialty: "Private banking and wealth management",
      enteredDay: 1,
    },
    {
      id: "union",
      name: "Union Commercial",
      strategy: "business",
      customers: 3_250,
      deposits: 57_000_000,
      loans: 46_000_000,
      reputation: 64,
      marketShare: 7.4,
      depositRate: 2.65,
      loanRate: 6.55,
      branches: 4,
      digitalLevel: 58,
      acquisitionPrice: 22_000_000,
      specialty: "SME and commercial relationships",
      enteredDay: 1,
    },
    {
      id: "civic",
      name: "Civic Savings",
      strategy: "community",
      customers: 2_900,
      deposits: 41_000_000,
      loans: 29_000_000,
      reputation: 73,
      marketShare: 6.8,
      depositRate: 2.8,
      loanRate: 6.7,
      branches: 5,
      digitalLevel: 46,
      acquisitionPrice: 16_500_000,
      specialty: "Community banking and customer service",
      enteredDay: 1,
    },
    {
      id: "metro",
      name: "Metro Direct",
      strategy: "volume",
      customers: 5_600,
      deposits: 49_000_000,
      loans: 43_000_000,
      reputation: 56,
      marketShare: 12.1,
      depositRate: 3,
      loanRate: 5.95,
      branches: 2,
      digitalLevel: 76,
      acquisitionPrice: 20_500_000,
      specialty: "Low-price, high-volume retail banking",
      enteredDay: 1,
    },
    {
      id: "horizon",
      name: "Horizon Bank",
      strategy: "challenger",
      customers: 2_150,
      deposits: 28_000_000,
      loans: 24_000_000,
      reputation: 62,
      marketShare: 5.2,
      depositRate: 3.2,
      loanRate: 6.25,
      branches: 1,
      digitalLevel: 84,
      acquisitionPrice: 13_500_000,
      specialty: "Fast product launches and aggressive growth",
      enteredDay: 1,
    },
  ];
}
