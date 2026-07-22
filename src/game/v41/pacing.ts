import { DECISIONS } from "../catalog";
import { advanceDaysRefined } from "../v4/gameplay";
import type { DecisionEvent, GameState } from "../types";
import { seededValue } from "../utils";

function wasRecentlyHandled(state: GameState, decision: DecisionEvent, days = 150) {
  return state.events.some(
    (event) => event.title === decision.title && state.day - event.day < days,
  );
}

function getDecision(state: GameState, id: string) {
  const decision = DECISIONS.find((item) => item.id === id);
  return decision && !wasRecentlyHandled(state, decision) ? decision : null;
}

function chooseRoutineDecision(state: GameState) {
  const available = DECISIONS.filter((decision) => !wasRecentlyHandled(state, decision));
  const pool = available.length > 0 ? available : DECISIONS;
  return pool[Math.floor(seededValue(`${state.worldSeed}-${state.day}-routine-decision`) * pool.length)] ?? null;
}

function applyCalmPacing(state: GameState): GameState {
  const currentLoanPrefix = `loan-${state.day}-`;
  const loanApplications = state.loanApplications
    .filter((application) => state.day % 10 === 0 || !application.id.startsWith(currentLoanPrefix))
    .slice(-3);

  let next: GameState = {
    ...state,
    loanApplications,
    pendingDecision: null,
    events: state.events.filter(
      (event) => !(event.day === state.day && event.title === "Trading update"),
    ),
  };

  if (state.day % 15 === 0) {
    const critical =
      (state.compliance < 40 && getDecision(state, "regulator-review")) ||
      (state.cyberSecurity < 38 && getDecision(state, "cyber-incident")) ||
      (state.satisfaction < 48 && getDecision(state, "complaint-wave")) ||
      (state.customersLost > Math.max(25, state.customersGained * 2) && getDecision(state, "rate-war"));

    if (critical) return { ...next, pendingDecision: critical };
  }

  if (state.day >= 45 && state.day % 60 === 0) {
    next = { ...next, pendingDecision: chooseRoutineDecision(next) };
  }

  return next;
}

export function advanceDaysPolished(state: GameState, days: number): GameState {
  let current = state;
  for (let index = 0; index < days; index += 1) {
    if (current.pendingDecision || current.gameOverReason) break;
    const before = current.day;
    current = advanceDaysRefined(current, 1);
    if (current.day === before) break;
    current = applyCalmPacing(current);
  }
  return current;
}
