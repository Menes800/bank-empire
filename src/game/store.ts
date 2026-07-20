import { emptyGame } from "./engine";
import type { GameState } from "./types";

const STORAGE_KEY = "bank-empire-save-v3";
const LEGACY_KEYS = ["bank-empire-save-v2", "bank-empire-save-v1"];

export function loadGame(): GameState {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(
      Boolean,
    );
    const saved = current ?? legacy;
    if (!saved) return emptyGame();

    const parsed = JSON.parse(saved) as Partial<GameState>;
    const base = emptyGame();
    const legacyCapitalBoost = parsed.version !== 3 ? 3_000_000 : 0;
    const migrated: GameState = {
      ...base,
      ...parsed,
      version: 3,
      cash: (parsed.cash ?? base.cash) + legacyCapitalBoost,
      competitors: parsed.competitors ?? base.competitors,
      objectives: parsed.objectives ?? base.objectives,
      history: parsed.history ?? base.history,
      achievements: parsed.achievements ?? [],
      loanApplications: parsed.loanApplications ?? [],
      pendingDecision: parsed.pendingDecision ?? null,
      gameOverReason: parsed.gameOverReason ?? null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return emptyGame();
  }
}

export function saveGame(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearGame(): GameState {
  localStorage.removeItem(STORAGE_KEY);
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  return emptyGame();
}

export type {
  BrandTheme,
  Difficulty,
  GameState,
  LendingPolicy,
  ProductKey,
} from "./types";
