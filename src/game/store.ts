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

    const parsed = JSON.parse(saved) as Partial<GameState>;
    const base = emptyGame();
    const legacyCapitalBoost = typeof parsed.version === "number" && parsed.version < 3 ? 3_000_000 : 0;
    const migrated: GameState = {
      ...base,
      ...parsed,
      version: 4,
      cash: (parsed.cash ?? base.cash) + legacyCapitalBoost,
      competitors: parsed.competitors ?? base.competitors,
      objectives: parsed.objectives ?? base.objectives,
      history: parsed.history ?? base.history,
      achievements: parsed.achievements ?? [],
      loanApplications: parsed.loanApplications ?? [],
      pendingDecision: parsed.pendingDecision ?? null,
      gameOverReason: parsed.gameOverReason ?? null,
      districts: parsed.districts ?? base.districts,
      branchOffices: parsed.branchOffices ?? base.branchOffices,
      projects: parsed.projects ?? [],
      employeeRoster: parsed.employeeRoster ?? base.employeeRoster,
      candidatePool: parsed.candidatePool ?? base.candidatePool,
      automation: { ...base.automation, ...(parsed.automation ?? {}) },
      customerSegments: parsed.customerSegments ?? base.customerSegments,
      productTerms: { ...base.productTerms, ...(parsed.productTerms ?? {}) },
      activeLoans: parsed.activeLoans ?? [],
      boardMembers: parsed.boardMembers ?? base.boardMembers,
      reports: parsed.reports ?? [],
      tutorialSteps: parsed.tutorialSteps ?? base.tutorialSteps,
      dismissedAdvisorIds: parsed.dismissedAdvisorIds ?? [],
      campaignStage: parsed.campaignStage ?? base.campaignStage,
      campaignXp: parsed.campaignXp ?? 0,
      strategicFocus: parsed.strategicFocus ?? "balanced",
      monthlyBudget: parsed.monthlyBudget ?? base.monthlyBudget,
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
    const restored = { ...state, pendingDecision: null, gameOverReason: null, liquidityBreachDays: 0, capitalBreachDays: 0 };
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
  BranchProfile,
  CampaignStage,
  Difficulty,
  ExecutiveRole,
  GameState,
  LendingPolicy,
  ProductKey,
} from "./types";
