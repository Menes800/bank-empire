import { initialCompetitors } from "./catalog";
import { createObjectives } from "./objectives";
import type { CampaignInput, EmployeeProfile, GameState } from "./types";
import { addEvent, createEvent, historyPoint } from "./utils";
import { initialV4Fields } from "./v4/catalog";
import { employeeDepartment } from "./v8/gameplay";

export { PRODUCT_CATALOG } from "./catalog";
export * from "./simulation";
export * from "./actions";
export * from "./v4/gameplay";
export * from "./v4/advisor";
export * from "./v41/pacing";
export * from "./v5/gameplay";
export * from "./v6/gameplay";
export * from "./v7/gameplay";
export * from "./v8/gameplay";
export * from "./v83/gameplay";

function enrichEmployee(employee: EmployeeProfile): EmployeeProfile {
  return {
    ...employee,
    department: employee.department ?? employeeDepartment(employee),
    reportsTo: employee.reportsTo ?? null,
    performance: employee.performance ?? Math.round(employee.skill * .72 + employee.energy * .28),
    workload: employee.workload ?? 76,
    wellbeing: employee.wellbeing ?? employee.energy,
    potential: employee.potential ?? Math.min(95, employee.skill + 9),
    tenureMonths: employee.tenureMonths ?? 1,
  };
}

export function emptyGame(): GameState {
  const v4 = initialV4Fields();
  const base: GameState = {
    version: 8,
    setupComplete: false,
    founderName: "",
    background: "Operations",
    bankName: "Nordic Trust",
    brandTheme: "forest",
    difficulty: "balanced",
    day: 1,
    week: 1,
    quarter: 1,
    year: 1,
    cash: 8_000_000,
    personalCash: 120_000,
    deposits: 12_000_000,
    loans: 8_000_000,
    wholesaleFunding: 0,
    wholesaleFundingRate: 4.2,
    loanLossReserve: 260_000,
    totalProfit: 0,
    profit: 0,
    revenue: 0,
    expenses: 0,
    creditLosses: 0,
    reputation: 48,
    satisfaction: 72,
    brandStrength: 46,
    boardConfidence: 68,
    customers: 420,
    customersGained: 0,
    customersLost: 0,
    employees: 9,
    branches: 1,
    digitalLevel: 28,
    cyberSecurity: 62,
    fraudLosses: 0,
    depositRate: 2.7,
    loanRate: 6.4,
    lendingPolicy: "balanced",
    capitalRatio: 15.4,
    liquidityRatio: 42.8,
    compliance: 78,
    riskScore: 34,
    nplRatio: 1.9,
    bankRunRisk: 4,
    capitalBreachDays: 0,
    liquidityBreachDays: 0,
    marketShare: 1.05,
    sharePrice: 24.8,
    educationLevel: 0,
    careerLevel: 0,
    skillPoints: 0,
    products: ["everyday"],
    baseRate: 3.75,
    inflation: 2.8,
    unemployment: 3.6,
    consumerConfidence: 66,
    gdpGrowth: 1.7,
    economicCycle: "growth",
    competitors: initialCompetitors(),
    objectives: [],
    pendingDecision: null,
    loanApplications: [],
    history: [],
    achievements: [],
    events: [],
    gameOverReason: null,
    ...v4,
    branchOffices: v4.branchOffices.map((branch) => ({ ...branch, managerControl: true, operatingPriority: "balanced", upgradeAuthority: "profitable", pendingUpgradeRecommendation: false })),
    employeeRoster: v4.employeeRoster.map(enrichEmployee),
    candidatePool: v4.candidatePool.map(enrichEmployee),
    collectionCases: [],
    ceoInbox: [],
    competitorMoves: [],
    managementControl: { treasury: "major", lending: "major", marketing: "major", operations: "automatic" },
    devModeUsed: false,
    bankruptcyProtection: false,
  };
  return { ...base, objectives: createObjectives(base, 1), history: [historyPoint(base)] };
}

export function createCampaign(input: CampaignInput): GameState {
  const difficultyCash = input.difficulty === "relaxed" ? 10_000_000 : input.difficulty === "hard" ? 6_500_000 : 8_000_000;
  let state: GameState = { ...emptyGame(), ...input, setupComplete: true, cash: difficultyCash, version: 8 };

  if (input.background === "Finance") {
    state = {
      ...state,
      compliance: 82,
      loanLossReserve: 340_000,
      capitalRatio: 16.2,
      employeeRoster: state.employeeRoster.map((employee) => employee.role === "Credit analyst" ? { ...employee, skill: employee.skill + 5, department: "Credit & Collections" } : employee),
    };
  } else if (input.background === "Sales") {
    state = {
      ...state,
      customers: 470,
      reputation: 51,
      brandStrength: 52,
      customerSegments: state.customerSegments.map((segment) => ({ ...segment, customers: Math.round(segment.customers * 1.12) })),
    };
  } else {
    const operationsEmployee = enrichEmployee({
      id: "emp-operations",
      name: "Mina Hauge",
      role: "Operations coordinator",
      executiveRole: null,
      salary: 52_000,
      skill: 62,
      leadership: 48,
      loyalty: 80,
      energy: 91,
      trait: "Efficient organiser",
      assignedBranchId: null,
      department: "Branch Operations",
    });
    state = { ...state, employees: 10, satisfaction: 75, employeeRoster: [...state.employeeRoster, operationsEmployee] };
  }

  state = { ...state, objectives: createObjectives(state, 1), history: [historyPoint(state)] };
  return addEvent(state, createEvent(1, "positive", "Your bank is open", `${input.bankName} has received its banking licence and welcomed its first customers.`));
}
