import type { BranchOffice, CEOInboxTask, EmployeeProfile, ExecutiveRole, GameState, ProductKey } from "../game/types";
import { advanceDaysV9, clearRoutineInboxV9, completeActiveTechnologyV9, letManagementFixBranchV9, normalizeBalanceSheetV9, unlockTechnologyTreeV9 } from "../game/v9/gameplay";
import { refreshBranchLedgersV9 } from "../game/v9/branch";
import { completeV9Projects } from "../game/v9/projects";
import { createInitialV9State, ensureV9State, readV9, writeV9 } from "../game/v9/model";

function dev(state: GameState): GameState {
  return { ...ensureV9State(state), devModeUsed: true };
}

function firstBranch(state: GameState) {
  return state.branchOffices[0];
}

function scenarioManagerId(state: GameState) {
  return state.employeeRoster.find((employee) => !employee.executiveRole && employee.leadership >= 45)?.id ?? null;
}

function addBranchScenario(state: GameState, kind: "profitable" | "loss" | "opening"): GameState {
  const base = firstBranch(state);
  if (!base) return dev(state);
  const profitable = kind === "profitable";
  const opening = kind === "opening";
  const branch: BranchOffice = {
    ...base,
    id: `dev-${kind}-${state.day}-${state.branchOffices.length}`,
    name: profitable ? "DEV Profitable Branch" : opening ? "DEV Opening Branch" : "DEV Structural Loss Branch",
    openedDay: opening ? state.day : state.day - (profitable ? 540 : 420),
    managerId: scenarioManagerId(state),
    managerControl: true,
    managerMandate: "autonomous",
    operatingPriority: profitable ? "profitability" : opening ? "growth" : "balanced",
    localCustomers: profitable ? 980 : opening ? 35 : 70,
    localDeposits: profitable ? 18_000_000 : opening ? 420_000 : 650_000,
    localLoans: profitable ? 9_000_000 : opening ? 180_000 : 480_000,
    staffSlots: profitable ? 5 : opening ? 6 : 11,
    capacity: profitable ? 1_300 : opening ? 700 : 950,
    monthlyRent: profitable ? 18_000 : opening ? 42_000 : 92_000,
    lastMonthRevenue: 0,
    lastMonthCost: 0,
    lastMonthProfit: 0,
    lifetimeProfit: 0,
    pendingUpgradeRecommendation: false,
    lastManagerAction: "DEV scenario loaded.",
  };
  return dev(refreshBranchLedgersV9({ ...state, branchOffices: [branch, ...state.branchOffices], branches: state.branches + 1 }));
}

export function addDevCash(state: GameState, amount: number): GameState {
  return dev({ ...state, cash: Math.max(0, state.cash + amount) });
}

export function addDevCustomers(state: GameState, amount: number): GameState {
  return dev({ ...state, customers: Math.max(0, state.customers + amount), customersGained: state.customersGained + amount, deposits: Math.max(0, state.deposits + amount * 12_000), cash: Math.max(0, state.cash + amount * 12_000) });
}

export function unlockDevBank(state: GameState): GameState {
  const products: ProductKey[] = ["everyday", "savings", "mortgage", "sme", "cards", "insurance", "wealth"];
  return dev({ ...state, campaignStage: "empire", careerLevel: 4, campaignXp: Math.max(state.campaignXp, 25_000), products, cash: Math.max(state.cash, 100_000_000), reputation: Math.max(85, state.reputation), digitalLevel: Math.max(85, state.digitalLevel), boardConfidence: Math.max(80, state.boardConfidence) });
}

export function fillDevExecutives(state: GameState): GameState {
  const roles: ExecutiveRole[] = ["CFO", "COO", "CRO", "CMO", "CTO"];
  let roster = state.employeeRoster.map((employee) => ({ ...employee }));
  let candidates = [...state.candidatePool];
  for (const role of roles) {
    if (roster.some((employee) => employee.executiveRole === role)) continue;
    const candidate = candidates.shift();
    const employee: EmployeeProfile = candidate
      ? { ...candidate, executiveRole: role, department: "Executive", reportsTo: null, skill: Math.max(78, candidate.skill), leadership: Math.max(78, candidate.leadership), performance: Math.max(78, candidate.performance ?? candidate.skill), workload: 72, wellbeing: candidate.wellbeing ?? 84, tenureMonths: candidate.tenureMonths ?? 0 }
      : { id: `dev-${role.toLowerCase()}`, name: `DEV ${role}`, role: `${role} test executive`, executiveRole: role, salary: 100_000, skill: 82, leadership: 82, loyalty: 90, energy: 90, trait: "Playtest executive", assignedBranchId: null, department: "Executive", reportsTo: null, performance: 82, workload: 72, wellbeing: 90, potential: 86, tenureMonths: 0 };
    roster.push(employee);
  }
  return dev({ ...state, employeeRoster: roster, candidatePool: candidates, employees: Math.max(state.employees, roster.length), managementControl: { treasury: "automatic", lending: "automatic", marketing: "automatic", operations: "automatic" }, automation: { treasury: "balanced", lending: "balanced", marketing: "balanced", operations: "balanced" } });
}

export function createDevOverdueLoan(state: GameState): GameState {
  const id = `dev-overdue-${state.day}-${state.activeLoans.length}`;
  const outstanding = 480_000;
  const loan = { id, customerName: "Berg Family", segment: "Mortgage", principal: 520_000, outstanding, rate: 6.8, riskGrade: "C" as const, collateral: 78, status: "overdue" as const, daysPastDue: 67, originatedDay: Math.max(1, state.day - 240), nextPaymentDay: state.day + 14, missedPayments: 2, lastPaymentDay: state.day - 67, recoveryEstimate: 330_000 };
  const collection = { id: `collection-${id}`, loanId: id, customerName: loan.customerName, openedDay: state.day, stage: "workout" as const, daysPastDue: 67, missedAmount: 8_900, expectedRecovery: 330_000, agencyCost: 0, assignedTo: "Credit operations", lastAction: "Playtest case created", closed: false };
  return dev({ ...state, activeLoans: [loan, ...state.activeLoans], collectionCases: [collection, ...state.collectionCases], loans: state.loans + outstanding, ceoInbox: [{ id: `inbox-${collection.id}`, createdDay: state.day, category: "credit", title: "Berg Family is 67 days past due", summary: "Playtest workout case with collateral and multiple collection options.", urgency: "important", page: "clients", status: "open", ownerRole: "CRO", sourceId: collection.id }, ...state.ceoInbox] });
}

export function createDevProfitableBranch(state: GameState) { return addBranchScenario(state, "profitable"); }
export function createDevFailingBranch(state: GameState) { return addBranchScenario(state, "loss"); }
export function createDevOpeningBranch(state: GameState) { return addBranchScenario(state, "opening"); }

export function fillDevBranchCapacity(state: GameState): GameState {
  const branch = firstBranch(state);
  if (!branch) return dev(state);
  return dev(refreshBranchLedgersV9({ ...state, branchOffices: state.branchOffices.map((item) => item.id === branch.id ? { ...item, localCustomers: Math.round(item.capacity * .98), pendingUpgradeRecommendation: true } : item) }));
}

export function setDevBranchLevel(state: GameState, level: 3 | 4 | 5): GameState {
  const branch = firstBranch(state);
  if (!branch) return dev(state);
  const prepared = dev({ ...state, branchOffices: state.branchOffices.map((item) => item.id === branch.id ? { ...item, level: Math.min(3, level) as 1 | 2 | 3, capacity: item.capacity + Math.max(0, level - item.level) * 260 } : item) });
  const v9 = readV9(prepared);
  const current = v9.branches[branch.id] ?? createInitialV9State(prepared).branches[branch.id];
  return dev(refreshBranchLedgersV9(writeV9(prepared, { ...v9, branches: { ...v9.branches, [branch.id]: { ...current, effectiveLevel: level, pendingProjectId: undefined } } })));
}

export function generateDevCooRecommendation(state: GameState): GameState {
  const prepared = refreshBranchLedgersV9(dev(state));
  const branch = [...prepared.branchOffices].sort((a, b) => (a.lastMonthProfit ?? 0) - (b.lastMonthProfit ?? 0))[0];
  return branch ? dev(letManagementFixBranchV9(prepared, branch.id)) : prepared;
}

export function completeDevProjects(state: GameState): GameState {
  const completed = { ...state, projects: state.projects.map((project) => ({ ...project, status: "completed" as const, remainingDays: 0, spent: project.budget })) };
  return dev(completeV9Projects(completed));
}

export function unlockDevTechnologyTree(state: GameState) { return dev(unlockTechnologyTreeV9(state)); }
export function completeDevTechnology(state: GameState) { return dev(completeActiveTechnologyV9(state)); }

export function createDevLiquidityCrisis(state: GameState): GameState {
  return dev({ ...state, cash: Math.max(50_000, state.deposits * .015), wholesaleFunding: Math.max(state.wholesaleFunding, state.deposits * .65), liquidityRatio: 4, bankRunRisk: 82, boardConfidence: Math.min(state.boardConfidence, 42) });
}

export function normalizeDevBalanceSheet(state: GameState) { return dev(normalizeBalanceSheetV9(state)); }
export function clearDevRoutineInbox(state: GameState) { return dev(clearRoutineInboxV9(state)); }

export function createDevStrategicDecision(state: GameState): GameState {
  const decisionId = `dev-strategic-decision-${state.day}`;
  const task: CEOInboxTask = {
    id: `dev-strategic-${state.day}`,
    createdDay: state.day,
    category: "risk",
    urgency: "critical",
    title: "Strategic capital allocation decision",
    summary: "The board requests CEO approval for a major capital and funding programme outside management mandate.",
    page: "risk",
    status: "open",
    ownerRole: "CFO",
    sourceId: decisionId,
    decision: {
      id: decisionId,
      title: "Protect capital or growth",
      description: "Choose how the bank should balance resilience and expansion.",
      category: "regulatory",
      choices: [
        { id: "buffer", label: "Build capital buffer", description: "Slow growth and protect resilience.", effect: { cash: 1_000_000, reputation: 1 } },
        { id: "growth", label: "Protect growth", description: "Accept higher funding risk for faster expansion.", effect: { customers: 500, boardConfidence: 2 } },
      ],
    },
  };
  return dev({ ...state, ceoInbox: [task, ...state.ceoInbox] });
}

export function simulateDevTwelveMonths(state: GameState): GameState {
  let next = dev(state);
  for (let month = 0; month < 12; month += 1) {
    next = clearRoutineInboxV9(next);
    next = advanceDaysV9(next, 30);
    if (next.gameOverReason || next.pendingDecision) break;
  }
  return dev(next);
}

export function resetDevSystem(state: GameState, system: "branches" | "technology" | "risk" | "inbox"): GameState {
  const prepared = dev(state);
  const initial = createInitialV9State(prepared);
  const v9 = readV9(prepared);
  if (system === "branches") return dev(writeV9(prepared, { ...v9, branches: initial.branches }));
  if (system === "technology") return dev(writeV9({ ...prepared, projects: prepared.projects.filter((project) => !project.id.startsWith("v9-tech-")) }, { ...v9, technologies: initial.technologies, devTechUnlocked: false }));
  if (system === "risk") return dev(normalizeBalanceSheetV9({ ...prepared, bankRunRisk: 10, riskScore: 25, nplRatio: Math.min(prepared.nplRatio, 2.5) }));
  return dev(writeV9({ ...prepared, ceoInbox: [] }, { ...v9, managementReports: [], inboxArchive: [] }));
}

export function toggleDevBankruptcyProtection(state: GameState): GameState {
  return dev({ ...state, bankruptcyProtection: !state.bankruptcyProtection, gameOverReason: null, liquidityBreachDays: 0, capitalBreachDays: 0 });
}
