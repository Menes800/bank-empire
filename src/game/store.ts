import { defaultExecutiveMandates, emptyGame, getBranchEconomicsV7, repairCampaignState } from "./engine";
import type { EmployeeDepartment, EmployeeProfile, GameState } from "./types";
import { addEvent, calculateRatios, clamp, createEvent, normaliseCurrencyTextState, round } from "./utils";

const STORAGE_KEY = "bank-empire-save-v4";
const CHECKPOINT_KEY = "bank-empire-checkpoint-v5";
const CORRUPT_SAVE_KEY = "bank-empire-corrupt-save-v4";
const LEGACY_KEYS = ["bank-empire-save-v3", "bank-empire-save-v2", "bank-empire-save-v1"];

function preserveCorruptSave(raw: string): void {
  try {
    if (localStorage.getItem(CORRUPT_SAVE_KEY)) return;
    localStorage.setItem(CORRUPT_SAVE_KEY, JSON.stringify({
      capturedAt: new Date().toISOString(),
      raw,
    }));
  } catch {
    // Loading must still fall back safely if storage is full or unavailable.
  }
}

function checkpointPeriod(day: number): number {
  return Math.floor(Math.max(0, day) / 30);
}

function savedCheckpointPeriod(): number {
  try {
    const saved = localStorage.getItem(CHECKPOINT_KEY);
    if (!saved) return 0;
    const parsed = JSON.parse(saved) as Partial<GameState>;
    return checkpointPeriod(parsed.day ?? 0);
  } catch {
    return 0;
  }
}

function inferDepartment(employee: EmployeeProfile): EmployeeDepartment {
  if (employee.executiveRole) return "Executive";
  if (employee.department) return employee.department;
  const value = `${employee.role} ${employee.trait}`.toLowerCase();
  if (employee.assignedBranchId || value.includes("branch") || value.includes("customer") || value.includes("operations")) return "Branch Operations";
  if (value.includes("credit") || value.includes("risk") || value.includes("collection")) return "Credit & Collections";
  if (value.includes("finance") || value.includes("treasury") || value.includes("capital")) return "Finance & Treasury";
  if (value.includes("marketing") || value.includes("growth") || value.includes("relationship") || value.includes("wealth")) return "Customer Growth";
  if (value.includes("technology") || value.includes("system") || value.includes("digital") || value.includes("cyber")) return "Technology";
  return "Branch Operations";
}

function migrateEmployee(employee: EmployeeProfile): EmployeeProfile {
  return {
    ...employee,
    department: inferDepartment(employee),
    reportsTo: employee.reportsTo ?? null,
    performance: employee.performance ?? Math.round(employee.skill * .72 + employee.energy * .28),
    workload: employee.workload ?? 76,
    wellbeing: employee.wellbeing ?? employee.energy,
    potential: employee.potential ?? Math.min(95, employee.skill + 9),
    tenureMonths: employee.tenureMonths ?? 1,
    nationality: employee.nationality ?? "NO",
    leadershipStyle: employee.leadershipStyle ?? "Practical",
    strengths: employee.strengths ?? [employee.trait],
    weaknesses: employee.weaknesses ?? ["Limited track record in this bank"],
    workHistory: employee.workHistory ?? [employee.role],
    ceoRelationship: employee.ceoRelationship ?? 50,
    boardRelationship: employee.boardRelationship ?? 50,
    peerRelationship: employee.peerRelationship ?? 55,
    quitRisk: employee.quitRisk ?? Math.max(5, 55 - employee.loyalty),
    ambition: employee.ambition ?? Math.min(95, employee.leadership + 8),
    strategyOpinion: employee.strategyOpinion ?? "Build the bank with disciplined growth.",
    decisionHistory: employee.decisionHistory ?? [],
  };
}

function depositBalancePerCustomer(state: GameState) {
  const productValue =
    (state.products.includes("savings") ? 8_000 : 0) +
    (state.products.includes("wealth") ? 10_000 : 0) +
    (state.products.includes("sme") ? 6_000 : 0) +
    (state.products.includes("cards") ? 1_500 : 0);
  return clamp(18_000 + productValue + state.reputation * 100, 18_000, 46_000);
}

function repairDepositBase(state: GameState): GameState {
  const target = state.customers * depositBalancePerCustomer(state);
  const localDeposits = state.branchOffices.reduce((sum, branch) => sum + (branch.localDeposits ?? 0), 0);
  if (state.customers < 50 || state.deposits >= Math.max(localDeposits, target * .1)) return state;
  const deposits = round(Math.max(localDeposits, target * .72, 1_000_000));
  const increase = Math.max(0, deposits - state.deposits);
  const cash = state.cash + increase;
  const ratios = calculateRatios(cash, state.loans, deposits, state.wholesaleFunding, state.compliance, state.nplRatio, state.reputation, state.satisfaction);
  return addEvent(
    { ...state, cash, deposits, ...ratios },
    createEvent(state.day, "positive", "Customer deposit base reconciled", `Legacy customer accounts were restored to ${deposits.toLocaleString(state.locale)} ${state.currency}. Matching cash and deposit liabilities were added without changing shareholder equity.`),
  );
}

function refreshDerivedEconomics(state: GameState): GameState {
  const ratios = calculateRatios(state.cash, state.loans, state.deposits, state.wholesaleFunding, state.compliance, state.nplRatio, state.reputation, state.satisfaction);
  const current = { ...state, ...ratios };
  return {
    ...current,
    branchOffices: current.branchOffices.map((branch) => {
      const economics = getBranchEconomicsV7(current, branch);
      return { ...branch, lastMonthRevenue: economics.revenue, lastMonthCost: economics.cost, lastMonthProfit: economics.profit };
    }),
  };
}

export function loadGame(): GameState {
  let saved: string | null = null;
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    saved = current ?? legacy ?? null;
    if (!saved) return emptyGame();

    const parsed = JSON.parse(saved) as Partial<GameState> & { version?: number };
    const base = emptyGame();
    const legacyCapitalBoost = typeof parsed.version === "number" && parsed.version < 3 ? 3_000_000 : 0;
    const migrated: GameState = {
      ...base,
      ...parsed,
      version: 88,
      currency: parsed.currency ?? "NOK",
      homeMarket: parsed.homeMarket ?? "NO",
      locale: parsed.locale ?? "nb-NO",
      nameStyle: parsed.nameStyle ?? "mixed",
      bankMark: parsed.bankMark ?? base.bankMark,
      slogan: parsed.slogan ?? base.slogan,
      firstBranchName: parsed.firstBranchName ?? parsed.branchOffices?.[0]?.name ?? base.firstBranchName,
      founderStory: parsed.founderStory ?? base.founderStory,
      worldSeed: parsed.worldSeed ?? base.worldSeed,
      cash: (parsed.cash ?? base.cash) + legacyCapitalBoost,
      competitors: parsed.competitors ?? base.competitors,
      objectives: parsed.objectives ?? base.objectives,
      history: parsed.history ?? base.history,
      achievements: parsed.achievements ?? [],
      loanApplications: parsed.loanApplications ?? [],
      pendingDecision: parsed.pendingDecision ?? null,
      serviceIntervention: parsed.serviceIntervention && parsed.serviceIntervention.endDay > (parsed.day ?? 1) ? parsed.serviceIntervention : null,
      gameOverReason: parsed.gameOverReason ?? null,
      districts: parsed.districts ?? base.districts,
      branchOffices: (parsed.branchOffices ?? base.branchOffices).map((branch) => ({
        ...branch,
        managerMandate: branch.managerMandate ?? (branch.managerId ? "autonomous" : "manual"),
        localFocus: branch.localFocus ?? "service",
        managerBudget: branch.managerBudget ?? (branch.managerId ? 30_000 : 0),
        managerControl: branch.managerControl ?? Boolean(branch.managerId),
        operatingPriority: branch.operatingPriority ?? "balanced",
        upgradeAuthority: branch.upgradeAuthority ?? "profitable",
        pendingUpgradeRecommendation: branch.pendingUpgradeRecommendation ?? false,
        localCustomers: branch.localCustomers ?? Math.min(branch.capacity, 220 + branch.level * 85),
        localDeposits: branch.localDeposits ?? 0,
        localLoans: branch.localLoans ?? 0,
        lastMonthRevenue: branch.lastMonthRevenue ?? 0,
        lastMonthCost: branch.lastMonthCost ?? 0,
        lastMonthProfit: branch.lastMonthProfit ?? 0,
        lifetimeProfit: branch.lifetimeProfit ?? 0,
        lastManagerAction: branch.lastManagerAction ?? "Awaiting the next management review.",
      })),
      projects: parsed.projects ?? [],
      employeeRoster: (parsed.employeeRoster ?? base.employeeRoster).map(migrateEmployee),
      candidatePool: (parsed.candidatePool ?? base.candidatePool).map(migrateEmployee),
      automation: { ...base.automation, ...(parsed.automation ?? {}) },
      managementControl: { ...base.managementControl, ...(parsed.managementControl ?? {}) },
      executiveMandates: { ...defaultExecutiveMandates(), ...(parsed.executiveMandates ?? {}) },
      managementLog: parsed.managementLog ?? [],
      customerSegments: parsed.customerSegments ?? base.customerSegments,
      productTerms: { ...base.productTerms, ...(parsed.productTerms ?? {}) },
      activeLoans: (parsed.activeLoans ?? []).map((loan) => ({
        ...loan,
        status: loan.status === "watch" ? "late" : loan.status === "delinquent" ? (loan.daysPastDue >= 60 ? "overdue" : "late") : loan.status,
        missedPayments: loan.missedPayments ?? Math.floor((loan.daysPastDue ?? 0) / 30),
        lastPaymentDay: loan.lastPaymentDay ?? loan.originatedDay,
        recoveryEstimate: loan.recoveryEstimate ?? Math.round(loan.outstanding * Math.min(.9, Math.max(.18, loan.collateral / 100 * .78 + .08))),
      })),
      collectionCases: parsed.collectionCases ?? [],
      ceoInbox: parsed.ceoInbox ?? [],
      competitorMoves: parsed.competitorMoves ?? [],
      boardMembers: parsed.boardMembers ?? base.boardMembers,
      reports: parsed.reports ?? [],
      tutorialSteps: parsed.tutorialSteps ?? base.tutorialSteps,
      dismissedAdvisorIds: parsed.dismissedAdvisorIds ?? [],
      campaignStage: parsed.campaignStage ?? base.campaignStage,
      campaignXp: parsed.campaignXp ?? 0,
      strategicFocus: parsed.strategicFocus ?? "balanced",
      strategyReviewDay: parsed.strategyReviewDay && parsed.strategyReviewDay > (parsed.day ?? 1) ? parsed.strategyReviewDay : (parsed.day ?? 1) + 90,
      monthlyBudget: parsed.monthlyBudget ?? base.monthlyBudget,
      cashFlowHistory: parsed.cashFlowHistory ?? [],
      events: parsed.events ?? [],
      devModeUsed: parsed.devModeUsed ?? false,
      bankruptcyProtection: parsed.bankruptcyProtection ?? false,
    };
    const repaired = normaliseCurrencyTextState(refreshDerivedEconomics(repairCampaignState(repairDepositBase(migrated))));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(repaired));
    return repaired;
  } catch {
    if (saved) preserveCorruptSave(saved);
    return emptyGame();
  }
}

export function saveGame(state: GameState): void {
  const repaired = repairCampaignState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(repaired));
  const period = checkpointPeriod(repaired.day);
  if (repaired.setupComplete && !repaired.gameOverReason && !repaired.pendingDecision && period >= 1 && period > savedCheckpointPeriod()) {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(repaired));
  }
}

export function hasCheckpoint(): boolean {
  return Boolean(localStorage.getItem(CHECKPOINT_KEY));
}

export function restoreCheckpoint(): GameState | null {
  try {
    const saved = localStorage.getItem(CHECKPOINT_KEY);
    if (!saved) return null;
    const state = JSON.parse(saved) as GameState;
    const base = emptyGame();
    const restored = refreshDerivedEconomics(repairCampaignState({
      ...base,
      ...state,
      version: 88,
      managementControl: { ...base.managementControl, ...(state.managementControl ?? {}) },
      executiveMandates: { ...defaultExecutiveMandates(), ...(state.executiveMandates ?? {}) },
      managementLog: state.managementLog ?? [],
      collectionCases: state.collectionCases ?? [],
      ceoInbox: state.ceoInbox ?? [],
      competitorMoves: state.competitorMoves ?? [],
      devModeUsed: state.devModeUsed ?? false,
      bankruptcyProtection: state.bankruptcyProtection ?? false,
      pendingDecision: null,
      gameOverReason: null,
      liquidityBreachDays: 0,
      capitalBreachDays: 0,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    return restored;
  } catch {
    return null;
  }
}

export function clearGame(): GameState {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CHECKPOINT_KEY);
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  return emptyGame();
}

export type {
  AutomationMode,
  BrandTheme,
  BranchFocus,
  BranchMandate,
  BranchPriority,
  BranchProfile,
  CampaignStage,
  CurrencyCode,
  Difficulty,
  ExecutivePermission,
  ExecutiveRole,
  GameState,
  HomeMarket,
  LendingPolicy,
  ManagementArea,
  ManagementControlMode,
  ManagementLogEntry,
  MandatePreset,
  NameStyle,
  ProductKey,
  ProductPreset,
  UpgradeAuthority,
} from "./types";
