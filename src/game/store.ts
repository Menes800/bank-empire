import { emptyGame } from "./engine";
import type { GameState } from "./types";

const STORAGE_KEY = "bank-empire-save-v4";
const CHECKPOINT_KEY = "bank-empire-checkpoint-v5";
const LEGACY_KEYS = ["bank-empire-save-v3", "bank-empire-save-v2", "bank-empire-save-v1"];

export function loadGame(): GameState {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    const saved = current ?? legacy;
    if (!saved) return emptyGame();

    const parsed = JSON.parse(saved) as Partial<GameState> & { version?: number };
    const base = emptyGame();
    const legacyCapitalBoost = typeof parsed.version === "number" && parsed.version < 3 ? 3_000_000 : 0;
    const migrated: GameState = {
      ...base,
      ...parsed,
      version: 7,
      cash: (parsed.cash ?? base.cash) + legacyCapitalBoost,
      competitors: parsed.competitors ?? base.competitors,
      objectives: parsed.objectives ?? base.objectives,
      history: parsed.history ?? base.history,
      achievements: parsed.achievements ?? [],
      loanApplications: parsed.loanApplications ?? [],
      pendingDecision: parsed.pendingDecision ?? null,
      gameOverReason: parsed.gameOverReason ?? null,
      districts: parsed.districts ?? base.districts,
      branchOffices: (parsed.branchOffices ?? base.branchOffices).map((branch) => ({
        ...branch,
        managerMandate: branch.managerMandate ?? (branch.managerId ? "guarded" : "manual"),
        localFocus: branch.localFocus ?? "service",
        managerBudget: branch.managerBudget ?? (branch.managerId ? 25_000 : 0),
        localCustomers: branch.localCustomers ?? Math.min(branch.capacity, 220 + branch.level * 85),
        localDeposits: branch.localDeposits ?? 0,
        localLoans: branch.localLoans ?? 0,
        lastMonthRevenue: branch.lastMonthRevenue ?? 0,
        lastMonthCost: branch.lastMonthCost ?? 0,
        lastMonthProfit: branch.lastMonthProfit ?? 0,
        lifetimeProfit: branch.lifetimeProfit ?? 0,
        lastManagerAction: branch.lastManagerAction ?? "Awaiting the first v0.7 monthly close.",
      })),
      projects: parsed.projects ?? [],
      employeeRoster: parsed.employeeRoster ?? base.employeeRoster,
      candidatePool: parsed.candidatePool ?? base.candidatePool,
      automation: { ...base.automation, ...(parsed.automation ?? {}) },
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
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return emptyGame();
  }
}

export function saveGame(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (state.setupComplete && !state.gameOverReason && !state.pendingDecision && state.day >= 30 && state.day % 30 === 0) {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(state));
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
    const restored: GameState = { ...state, version: 7, collectionCases: state.collectionCases ?? [], ceoInbox: state.ceoInbox ?? [], competitorMoves: state.competitorMoves ?? [], pendingDecision: null, gameOverReason: null, liquidityBreachDays: 0, capitalBreachDays: 0 };
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
  BranchProfile,
  CampaignStage,
  Difficulty,
  ExecutiveRole,
  GameState,
  LendingPolicy,
  ProductKey,
  ProductPreset,
} from "./types";
