export type GameState = {
  bankName: string;
  cash: number;
  deposits: number;
  loans: number;
  reputation: number;
  day: number;
};

const STORAGE_KEY = 'bank-empire-save-v1';

export const initialState: GameState = {
  bankName: 'Nordic Trust',
  cash: 5000000,
  deposits: 12000000,
  loans: 8000000,
  reputation: 50,
  day: 1,
};

export function loadGame(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...initialState, ...JSON.parse(saved) } : initialState;
  } catch {
    return initialState;
  }
}

export function saveGame(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function advanceDay(state: GameState): GameState {
  const interestIncome = Math.round(state.loans * 0.0008);
  const depositCost = Math.round(state.deposits * 0.00025);
  return {
    ...state,
    cash: state.cash + interestIncome - depositCost,
    day: state.day + 1,
  };
}
