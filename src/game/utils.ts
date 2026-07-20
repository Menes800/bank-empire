import type { GameEvent, GameState, HistoryPoint } from "./types";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const round = (value: number) => Math.round(value);
export const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
const displayCurrency = (value: string) => value.replace(/NOK\s*/g, "$");

export function createEvent(day: number, tone: GameEvent["tone"], title: string, body: string): GameEvent {
  return {
    id: `${day}-${title}-${Math.random().toString(36).slice(2, 8)}`,
    day,
    tone,
    title: displayCurrency(title),
    body: displayCurrency(body),
  };
}

export function addEvent(state: GameState, nextEvent: GameEvent): GameState {
  return { ...state, events: [{ ...nextEvent, title: displayCurrency(nextEvent.title), body: displayCurrency(nextEvent.body) }, ...state.events].slice(0, 18) };
}

export function calculateRatios(
  cash: number,
  loans: number,
  deposits: number,
  wholesaleFunding: number,
  compliance: number,
  nplRatio: number,
  reputation: number,
  satisfaction: number,
) {
  const equity = cash + loans - deposits - wholesaleFunding;
  const riskWeightedAssets = Math.max(1, loans * (0.62 + nplRatio / 100));
  const capitalRatio = clamp((equity / riskWeightedAssets) * 100, 2, 45);
  const liquidityRatio = clamp((cash / Math.max(1, deposits)) * 100, 0, 100);
  const loanToDeposit = loans / Math.max(1, deposits);
  const riskScore = clamp(
    12 + loanToDeposit * 24 + nplRatio * 4.2 + Math.max(0, 75 - compliance) * 0.5 + Math.max(0, 11 - capitalRatio) * 2.4,
    4,
    99,
  );
  const bankRunRisk = clamp(
    Math.max(0, 19 - liquidityRatio) * 2.5 + Math.max(0, 58 - compliance) * 0.35 + Math.max(0, 58 - reputation) * 0.72 + Math.max(0, 58 - satisfaction) * 0.42 + Math.max(0, 55 - (100 - riskScore)) * 0.25,
    0,
    100,
  );
  return { capitalRatio, liquidityRatio, riskScore, bankRunRisk };
}

export function historyPoint(state: GameState): HistoryPoint {
  return { day: state.day, cash: state.cash, deposits: state.deposits, loans: state.loans, profit: state.profit, customers: state.customers, reputation: state.reputation, sharePrice: state.sharePrice };
}
