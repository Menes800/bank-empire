import { emptyGame } from './engine';
import type { GameState } from './types';

const STORAGE_KEY = 'bank-empire-save-v2';

export function loadGame(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyGame();
    const parsed = JSON.parse(saved) as Partial<GameState>;
    return { ...emptyGame(), ...parsed, version: 2 };
  } catch {
    return emptyGame();
  }
}

export function saveGame(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearGame(): GameState {
  localStorage.removeItem(STORAGE_KEY);
  return emptyGame();
}

export type { GameState, BrandTheme, Difficulty, ProductKey } from './types';
