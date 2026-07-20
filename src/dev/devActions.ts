import type { BranchOffice, EmployeeProfile, ExecutiveRole, GameState, ProductKey } from "../game/types";

function dev(state: GameState, patch: Partial<GameState>): GameState {
  return { ...state, ...patch, devModeUsed: true };
}

export function addDevCash(state: GameState, amount: number): GameState {
  return dev(state, { cash: Math.max(0, state.cash + amount) });
}

export function addDevCustomers(state: GameState, amount: number): GameState {
  return dev(state, { customers: Math.max(0, state.customers + amount), deposits: Math.max(0, state.deposits + amount * 18_000), cash: Math.max(0, state.cash + amount * 18_000) });
}

export function unlockDevBank(state: GameState): GameState {
  const products: ProductKey[] = ["everyday", "savings", "mortgage", "sme", "cards", "insurance", "wealth"];
  return dev(state, { campaignStage: "empire", campaignXp: Math.max(state.campaignXp, 25_000), products, reputation: Math.max(85, state.reputation), digitalLevel: Math.max(82, state.digitalLevel), boardConfidence: Math.max(80, state.boardConfidence) });
}

export function fillDevExecutives(state: GameState): GameState {
  const roles: ExecutiveRole[] = ["CFO", "COO", "CRO", "CMO", "CTO"];
  let roster = state.employeeRoster.map((employee) => ({ ...employee }));
  let candidates = [...state.candidatePool];
  for (const role of roles) {
    if (roster.some((employee) => employee.executiveRole === role)) continue;
    const candidate = candidates.shift();
    if (candidate) roster.push({ ...candidate, executiveRole: role, department: "Executive", reportsTo: null, performance: candidate.performance ?? 78, workload: 72, wellbeing: candidate.wellbeing ?? 84, tenureMonths: candidate.tenureMonths ?? 0 });
    else {
      const employee: EmployeeProfile = { id: `dev-${role.toLowerCase()}`, name: `DEV ${role}`, role: `${role} test executive`, executiveRole: role, salary: 100_000, skill: 82, leadership: 82, loyalty: 90, energy: 90, trait: "Playtest executive", assignedBranchId: null, department: "Executive", reportsTo: null, performance: 82, workload: 72, wellbeing: 90, potential: 86, tenureMonths: 0 };
      roster.push(employee);
    }
  }
  return dev(state, { employeeRoster: roster, candidatePool: candidates, employees: Math.max(state.employees, roster.length), managementControl: { treasury: "automatic", lending: "automatic", marketing: "automatic", operations: "automatic" }, automation: { treasury: "balanced", lending: "balanced", marketing: "balanced", operations: "balanced" } });
}

export function createDevOverdueLoan(state: GameState): GameState {
  const id = `dev-overdue-${state.day}-${state.activeLoans.length}`;
  const outstanding = 480_000;
  const loan = { id, customerName: "Berg Family", segment: "Mortgage", principal: 520_000, outstanding, rate: 6.8, riskGrade: "C" as const, collateral: 78, status: "overdue" as const, daysPastDue: 67, originatedDay: Math.max(1, state.day - 240), nextPaymentDay: state.day + 14, missedPayments: 2, lastPaymentDay: state.day - 67, recoveryEstimate: 330_000 };
  const collection = { id: `collection-${id}`, loanId: id, customerName: loan.customerName, openedDay: state.day, stage: "workout" as const, daysPastDue: 67, missedAmount: 8_900, expectedRecovery: 330_000, agencyCost: 0, assignedTo: "Credit operations", lastAction: "Playtest case created", closed: false };
  return dev(state, { activeLoans: [loan, ...state.activeLoans], collectionCases: [collection, ...state.collectionCases], loans: state.loans + outstanding, ceoInbox: [{ id: `inbox-${collection.id}`, createdDay: state.day, category: "credit", title: "Berg Family is 67 days past due", summary: "Playtest workout case with collateral and multiple collection options.", urgency: "important", page: "clients", status: "open", ownerRole: "CRO", sourceId: collection.id }, ...state.ceoInbox] });
}

function updateFirstBranch(state: GameState, patch: Partial<BranchOffice>): GameState {
  const first = state.branchOffices[0];
  if (!first) return state;
  return dev(state, { branchOffices: state.branchOffices.map((branch) => branch.id === first.id ? { ...branch, ...patch } : branch) });
}

export function createDevProfitableBranch(state: GameState): GameState {
  const first = state.branchOffices[0];
  if (!first) return state;
  return updateFirstBranch(state, { managerControl: true, operatingPriority: "profitability", upgradeAuthority: "profitable", localCustomers: Math.round(first.capacity * .82), localDeposits: 14_500_000, localLoans: 8_200_000, lastMonthRevenue: 245_000, lastMonthCost: 132_000, lastMonthProfit: 113_000, lifetimeProfit: 1_180_000, satisfaction: 84, lastManagerAction: "Playtest profitable branch scenario loaded." });
}

export function createDevFailingBranch(state: GameState): GameState {
  const first = state.branchOffices[0];
  if (!first) return state;
  return updateFirstBranch(state, { managerControl: true, operatingPriority: "balanced", localCustomers: Math.round(first.capacity * .44), localDeposits: 2_100_000, localLoans: 1_600_000, lastMonthRevenue: 72_000, lastMonthCost: 158_000, lastMonthProfit: -86_000, lifetimeProfit: -410_000, satisfaction: 51, lastManagerAction: "Playtest loss-making branch scenario loaded." });
}

export function fillDevBranchCapacity(state: GameState): GameState {
  const first = state.branchOffices[0];
  if (!first) return state;
  return updateFirstBranch(state, { localCustomers: Math.round(first.capacity * .98), pendingUpgradeRecommendation: true, lastManagerAction: "Playtest capacity scenario loaded at 98%." });
}

export function completeDevProjects(state: GameState): GameState {
  let branches = [...state.branchOffices];
  for (const project of state.projects.filter((item) => item.status !== "completed")) {
    if (project.kind === "branch" && project.districtId && project.profile && !branches.some((branch) => branch.districtId === project.districtId)) {
      const district = state.districts.find((item) => item.id === project.districtId);
      if (district) branches.push({ id: `dev-branch-${district.id}-${state.day}`, districtId: district.id, name: `${district.name} Branch`, level: 1, profile: project.profile, capacity: 650, staffSlots: 8, monthlyRent: district.monthlyRent, satisfaction: 72, openedDay: state.day, managerId: null, managerMandate: "manual", localFocus: "service", managerBudget: 0, managerControl: true, operatingPriority: "balanced", upgradeAuthority: "profitable", pendingUpgradeRecommendation: false, localCustomers: 180, localDeposits: 2_800_000, localLoans: 1_600_000, lastMonthRevenue: 0, lastMonthCost: 0, lastMonthProfit: 0, lifetimeProfit: 0, lastManagerAction: "Project completed by DEV panel." });
    }
    if (project.kind === "branch-upgrade" && project.branchId) branches = branches.map((branch) => branch.id === project.branchId ? { ...branch, level: Math.min(3, branch.level + 1) as 1 | 2 | 3, capacity: Math.round(branch.capacity * 1.45), staffSlots: branch.staffSlots + 3 } : branch);
  }
  return dev(state, { projects: state.projects.map((project) => ({ ...project, status: "completed", remainingDays: 0, spent: project.budget })), branchOffices: branches, branches: branches.length, digitalLevel: Math.max(state.digitalLevel, state.projects.some((item) => item.kind === "mobile-bank" || item.kind === "core-banking") ? 72 : state.digitalLevel) });
}

export function toggleDevBankruptcyProtection(state: GameState): GameState {
  return dev(state, { bankruptcyProtection: !state.bankruptcyProtection, gameOverReason: null, liquidityBreachDays: 0, capitalBreachDays: 0 });
}
