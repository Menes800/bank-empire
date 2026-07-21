import type { GameState } from "../types";
import { addEvent, clamp, createEvent } from "../utils";

export function investFounderCapitalV810(state: GameState): GameState {
  const amount = 50_000;
  if (state.personalCash < amount) return state;
  return addEvent({
    ...state,
    personalCash: state.personalCash - amount,
    cash: state.cash + amount,
    boardConfidence: clamp(state.boardConfidence + 0.8, 1, 100),
    reputation: clamp(state.reputation + 0.15, 1, 100),
  }, createEvent(state.day, "positive", "Founder capital invested", "The founder injected personal capital into the bank, strengthening alignment with the board and depositors."));
}
