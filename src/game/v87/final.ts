import type { GameState } from "../types";
import { advanceDaysV87, prepareV87State } from "./gameplay";

function continuousCashHistory(state: GameState): GameState {
  const rows = state.cashFlowHistory;
  if (rows.length === 0) return state;
  const last = rows[rows.length - 1];
  if (Math.abs(last.closingCash - state.cash) > 2) return { ...state, cashFlowHistory: [] };

  let start = rows.length - 1;
  for (let index = rows.length - 1; index > 0; index -= 1) {
    const current = rows[index];
    const previous = rows[index - 1];
    const identity = current.openingCash + current.depositInflows - current.customerWithdrawals + current.loanRepayments - current.newLending + current.operatingProfit + current.fundingChange + current.otherMovements;
    if (Math.abs(identity - current.closingCash) > 2 || Math.abs(previous.closingCash - current.openingCash) > 2) break;
    start = index - 1;
  }
  return start === 0 ? state : { ...state, cashFlowHistory: rows.slice(start) };
}

export function prepareV87Final(state: GameState): GameState {
  return continuousCashHistory(prepareV87State(state));
}

export function advanceDaysV87Final(state: GameState, days: number): GameState {
  let current = prepareV87Final(state);
  for (let index = 0; index < days; index += 1) {
    const next = advanceDaysV87(current, 1);
    if (next.day === current.day) break;
    current = continuousCashHistory(next);
  }
  return current;
}
