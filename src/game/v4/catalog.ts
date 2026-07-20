import type {
  AutomationPlan,
  BoardMember,
  BranchOffice,
  CustomerSegment,
  District,
  EmployeeProfile,
  ProductKey,
  ProductTerms,
  TutorialStep,
} from "../types";

export const STAGE_ORDER = ["startup", "regional", "national", "group", "empire"] as const;

export const DISTRICTS: District[] = [
  { id: "harbour", name: "Harbour Quarter", description: "Mixed households and small businesses near the first branch.", population: 18_000, incomeIndex: 94, competition: 38, digitalAffinity: 58, retailDemand: 78, mortgageDemand: 62, businessDemand: 64, wealthDemand: 24, openingCost: 1_900_000, monthlyRent: 56_000, requiredStage: "startup", mapX: 26, mapY: 62 },
  { id: "garden", name: "Garden Suburbs", description: "Families, commuters and strong mortgage demand.", population: 32_000, incomeIndex: 108, competition: 42, digitalAffinity: 64, retailDemand: 72, mortgageDemand: 92, businessDemand: 34, wealthDemand: 42, openingCost: 2_400_000, monthlyRent: 72_000, requiredStage: "startup", mapX: 58, mapY: 70 },
  { id: "central", name: "Central Business District", description: "Premium offices, corporate deposits and intense competition.", population: 25_000, incomeIndex: 132, competition: 82, digitalAffinity: 79, retailDemand: 58, mortgageDemand: 44, businessDemand: 94, wealthDemand: 78, openingCost: 4_800_000, monthlyRent: 165_000, requiredStage: "regional", mapX: 48, mapY: 39 },
  { id: "university", name: "University District", description: "Students and young professionals with high digital expectations.", population: 27_000, incomeIndex: 82, competition: 55, digitalAffinity: 94, retailDemand: 88, mortgageDemand: 26, businessDemand: 31, wealthDemand: 12, openingCost: 2_200_000, monthlyRent: 68_000, requiredStage: "regional", mapX: 72, mapY: 31 },
  { id: "industrial", name: "Industrial Belt", description: "SMEs, logistics firms and higher credit risk.", population: 21_000, incomeIndex: 91, competition: 33, digitalAffinity: 52, retailDemand: 42, mortgageDemand: 31, businessDemand: 96, wealthDemand: 16, openingCost: 3_100_000, monthlyRent: 84_000, requiredStage: "regional", mapX: 18, mapY: 28 },
  { id: "ridge", name: "Ridge Estates", description: "Affluent households and wealth-management potential.", population: 14_000, incomeIndex: 168, competition: 70, digitalAffinity: 73, retailDemand: 38, mortgageDemand: 66, businessDemand: 48, wealthDemand: 98, openingCost: 5_500_000, monthlyRent: 185_000, requiredStage: "national", mapX: 82, mapY: 59 },
  { id: "coast", name: "Coastal Region", description: "A broader regional market requiring stronger management.", population: 58_000, incomeIndex: 103, competition: 61, digitalAffinity: 67, retailDemand: 76, mortgageDemand: 71, businessDemand: 69, wealthDemand: 35, openingCost: 7_500_000, monthlyRent: 240_000, requiredStage: "national", mapX: 35, mapY: 13 },
];

const employee = (id: string, name: string, role: string, skill: number, leadership: number, salary: number, trait: string): EmployeeProfile => ({
  id, name, role, executiveRole: null, salary, skill, leadership, loyalty: 70 + (skill % 17), energy: 88, trait, assignedBranchId: null,
});

export function initialEmployees(): EmployeeProfile[] {
  return [
    employee("emp-anna", "Anna Vik", "Branch manager", 68, 72, 68_000, "Reliable operator"),
    employee("emp-marius", "Marius Dahl", "Senior adviser", 66, 48, 57_000, "Strong relationships"),
    employee("emp-elin", "Elin Strand", "Credit analyst", 72, 51, 61_000, "Careful underwriter"),
    employee("emp-jonas", "Jonas Berg", "Customer adviser", 58, 42, 49_000, "Fast learner"),
  ];
}

export function initialCandidates(seed = 1): EmployeeProfile[] {
  const suffix = Math.max(1, seed);
  return [
    employee(`cand-cfo-${suffix}`, "Sofia Lund", "Finance director", 84, 79, 118_000, "Capital discipline"),
    employee(`cand-coo-${suffix}`, "Henrik Moen", "Operations director", 78, 86, 112_000, "Branch optimiser"),
    employee(`cand-cro-${suffix}`, "Nora Solheim", "Risk director", 88, 75, 121_000, "Conservative judgement"),
    employee(`cand-cmo-${suffix}`, "Amir Rahman", "Marketing director", 76, 82, 105_000, "Growth strategist"),
    employee(`cand-cto-${suffix}`, "Ida Nilsen", "Technology director", 86, 74, 116_000, "Digital transformer"),
    employee(`cand-adviser-${suffix}`, "Lucas Holm", "Wealth adviser", 73, 55, 64_000, "Premium network"),
  ];
}

export function initialSegments(): CustomerSegment[] {
  return [
    { key: "students", name: "Students", customers: 72, satisfaction: 72, loyalty: 52, profitability: 18, churnRisk: 26, preferredChannel: "digital" },
    { key: "young", name: "Young professionals", customers: 88, satisfaction: 74, loyalty: 61, profitability: 39, churnRisk: 19, preferredChannel: "digital" },
    { key: "families", name: "Families", customers: 134, satisfaction: 76, loyalty: 74, profitability: 68, churnRisk: 11, preferredChannel: "advisor" },
    { key: "affluent", name: "Affluent households", customers: 24, satisfaction: 68, loyalty: 65, profitability: 83, churnRisk: 17, preferredChannel: "advisor" },
    { key: "seniors", name: "Seniors", customers: 47, satisfaction: 79, loyalty: 82, profitability: 45, churnRisk: 8, preferredChannel: "branch" },
    { key: "small-business", name: "Small businesses", customers: 39, satisfaction: 71, loyalty: 67, profitability: 76, churnRisk: 15, preferredChannel: "advisor" },
    { key: "corporate", name: "Corporate clients", customers: 7, satisfaction: 65, loyalty: 55, profitability: 91, churnRisk: 24, preferredChannel: "advisor" },
    { key: "property", name: "Property investors", customers: 9, satisfaction: 69, loyalty: 62, profitability: 88, churnRisk: 21, preferredChannel: "advisor" },
  ];
}

const terms = (key: ProductKey, customerRate: number, monthlyFee: number, approvalThreshold: number, serviceLevel: number): ProductTerms => ({ key, customerRate, monthlyFee, approvalThreshold, serviceLevel, marketingBudget: 0 });

export function initialProductTerms(): Record<ProductKey, ProductTerms> {
  return {
    everyday: terms("everyday", 0, 39, 50, 60),
    savings: terms("savings", 2.7, 0, 45, 55),
    mortgage: terms("mortgage", 6.4, 49, 67, 72),
    sme: terms("sme", 7.2, 249, 70, 70),
    cards: terms("cards", 18.5, 59, 58, 62),
    insurance: terms("insurance", 0, 129, 55, 68),
    wealth: terms("wealth", 0, 899, 72, 88),
  };
}

export function initialBoard(): BoardMember[] {
  return [
    { id: "board-ingrid", name: "Ingrid Aasen", archetype: "Former savings-bank CEO", priority: "risk", support: 74, influence: 28 },
    { id: "board-victor", name: "Victor Berg", archetype: "Growth investor", priority: "growth", support: 61, influence: 24 },
    { id: "board-sara", name: "Sara Mahmoud", archetype: "Customer representative", priority: "customers", support: 69, influence: 18 },
    { id: "board-oyvind", name: "Øyvind Lie", archetype: "Technology founder", priority: "technology", support: 58, influence: 17 },
    { id: "board-kari", name: "Kari Foss", archetype: "Institutional owner", priority: "profit", support: 65, influence: 13 },
  ];
}

export function initialTutorial(): TutorialStep[] {
  return [
    { id: "tutorial-rates", title: "Set a competitive price", description: "Review deposit and loan pricing before advancing a full month.", completed: false, page: "banking" },
    { id: "tutorial-project", title: "Plan your first expansion", description: "Open the network map and start a branch or digital project.", completed: false, page: "network" },
    { id: "tutorial-leader", title: "Build a leadership team", description: "Hire a candidate and appoint the bank's first executive.", completed: false, page: "leadership" },
    { id: "tutorial-credit", title: "Review a real credit case", description: "Approve, counter or decline a large loan application.", completed: false, page: "clients" },
    { id: "tutorial-report", title: "Read the business", description: "Review a completed monthly financial report.", completed: false, page: "reports" },
  ];
}

export function initialV4Fields() {
  const firstBranch: BranchOffice = {
    id: "branch-harbour-1", districtId: "harbour", name: "Harbour Branch", level: 1, profile: "retail", capacity: 520, staffSlots: 7, monthlyRent: 56_000, satisfaction: 75, openedDay: 1, managerId: "emp-anna", managerMandate: "guarded", localFocus: "service", managerBudget: 25_000,
  };
  const automation: AutomationPlan = { treasury: "manual", lending: "manual", marketing: "manual", operations: "manual" };
  return {
    campaignStage: "startup" as const,
    campaignXp: 0,
    strategicFocus: "balanced" as const,
    strategyReviewDay: 91,
    districts: DISTRICTS.map((district) => ({ ...district })),
    branchOffices: [firstBranch],
    projects: [],
    employeeRoster: initialEmployees().map((person) => person.id === "emp-anna" ? { ...person, assignedBranchId: firstBranch.id } : person),
    candidatePool: initialCandidates(),
    automation,
    customerSegments: initialSegments(),
    productTerms: initialProductTerms(),
    activeLoans: [],
    boardMembers: initialBoard(),
    reports: [],
    tutorialSteps: initialTutorial(),
    dismissedAdvisorIds: [],
    monthlyBudget: 1_250_000,
    cashFlowHistory: [],
  };
}
