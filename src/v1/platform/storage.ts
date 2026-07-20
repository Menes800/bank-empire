import type { Branch, GameState } from '../game/types';

const SAVE_KEY = 'bank-empire-v1-alpha';

const migrateBranch = (branch: Branch): Branch => ({
  ...branch,
  mandate: branch.mandate ?? 'balanced',
  staffingPolicy: branch.staffingPolicy ?? 'balanced',
});

const migrateSave = (parsed: GameState): GameState => ({
  ...parsed,
  gameVersion: '1.0.0-alpha.2',
  lendingPolicy: parsed.lendingPolicy ?? 'balanced',
  branches: parsed.branches.map(migrateBranch),
});

export const loadV1Save = (): GameState | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    return parsed.saveVersion === 1 ? migrateSave(parsed) : null;
  } catch {
    return null;
  }
};

export const saveV1Game = (state: GameState) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // A blocked browser save should never stop the simulation itself.
  }
};

export const clearV1Save = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage failures and keep the game usable.
  }
};