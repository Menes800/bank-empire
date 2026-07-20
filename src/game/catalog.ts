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

export const DECISIONS: DecisionEvent[] = [
  {
    id: "complaint-wave",
    title: "A wave of customer complaints",
    description:
      "Customers are reporting long response times after a rapid period of growth. The press has started asking questions.",
    category: "customer",
    choices: [
      {
        id: "hire-temp",
        label: "Bring in temporary support",
        description:
          "Costs NOK 240k, but protects satisfaction and reputation.",
        effect: {
          cash: -240_000,
          employees: 3,
          satisfaction: 6,
          reputation: 2,
        },
      },
      {
        id: "digital-queue",
        label: "Push customers to digital service",
        description:
          "Cheaper, but less personal. Works best with a strong app.",
        effect: {
          cash: -80_000,
          digitalLevel: 4,
          satisfaction: -2,
          brandStrength: 2,
        },
      },
      {
        id: "wait-it-out",
        label: "Wait for the pressure to pass",
        description:
          "No immediate cost, but the customer impact may be severe.",
        effect: { satisfaction: -8, reputation: -4, boardConfidence: -3 },
      },
    ],
  },
  {
    id: "regulator-review",
    title: "The regulator requests a thematic review",
    description:
      "Your growth has attracted attention. The regulator wants documentation of customer due diligence and credit controls.",
    category: "regulatory",
    choices: [
      {
        id: "full-review",
        label: "Run a full independent review",
        description: "Expensive, but significantly strengthens compliance.",
        effect: {
          cash: -420_000,
          compliance: 12,
          reputation: 2,
          boardConfidence: 3,
        },
      },
      {
        id: "internal-review",
        label: "Handle it internally",
        description: "Lower cost with a moderate control improvement.",
        effect: { cash: -140_000, compliance: 5, boardConfidence: 1 },
      },
      {
        id: "minimum-response",
        label: "Submit the minimum required",
        description: "Preserves cash, but increases future regulatory risk.",
        effect: { compliance: -8, reputation: -2, boardConfidence: -5 },
      },
    ],
  },
  {
    id: "cyber-incident",
    title: "Suspicious activity in online banking",
    description:
      "The security team has identified abnormal login attempts. No customer losses have been confirmed yet.",
    category: "technology",
    choices: [
      {
        id: "shutdown",
        label: "Temporarily shut down online banking",
        description: "Safest option, but customers will be frustrated.",
        effect: {
          cash: -180_000,
          cyberSecurity: 10,
          satisfaction: -4,
          compliance: 3,
        },
      },
      {
        id: "silent-patch",
        label: "Patch quietly overnight",
        description: "Balanced response with some residual risk.",
        effect: { cash: -90_000, cyberSecurity: 5, fraudLosses: 25_000 },
      },
      {
        id: "monitor",
        label: "Continue monitoring",
        description: "No immediate disruption, but losses could rise.",
        effect: { cyberSecurity: -5, fraudLosses: 160_000, reputation: -3 },
      },
    ],
  },
  {
    id: "star-manager",
    title: "A competitor approaches your star branch manager",
    description:
      "One of your best leaders has received an attractive offer and asks for a retention package.",
    category: "people",
    choices: [
      {
        id: "retain",
        label: "Match the offer",
        description: "Keep the manager and signal that talent is valued.",
        effect: { cash: -190_000, satisfaction: 2, boardConfidence: 2 },
      },
      {
        id: "promote",
        label: "Offer a group role",
        description: "More responsibility and a smaller cash package.",
        effect: {
          cash: -95_000,
          employees: 1,
          brandStrength: 2,
          boardConfidence: 1,
        },
      },
      {
        id: "let-go",
        label: "Let the manager leave",
        description: "Protects costs, but capacity and morale suffer.",
        effect: { employees: -1, satisfaction: -3, reputation: -1 },
      },
    ],
  },
  {
    id: "rate-war",
    title: "A competitor starts a deposit rate war",
    description:
      "A digital challenger has raised savings rates aggressively and is targeting your customers.",
    category: "market",
    choices: [
      {
        id: "match",
        label: "Match the campaign",
        description: "Protect deposits, but compress the interest margin.",
        effect: { deposits: 650_000, cash: 480_000, brandStrength: 2 },
      },
      {
        id: "loyalty",
        label: "Launch a loyalty bonus",
        description: "Target existing customers instead of changing all rates.",
        effect: { cash: -210_000, satisfaction: 5, reputation: 2 },
      },
      {
        id: "hold-price",
        label: "Hold your pricing",
        description: "Defend margins and accept some customer losses.",
        effect: { deposits: -520_000, customers: -28, boardConfidence: -1 },
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
    },
  ];
}
