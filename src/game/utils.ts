import type { CurrencyCode, DecisionEvent, GameEvent, GameState, HistoryPoint } from "./types";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const round = (value: number) => Math.round(value);

export function hashSeed(value: string | number): number {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededValue(seed: string | number): number {
  let value = hashSeed(seed) || 1;
  value += 0x6d2b79f5;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

export function createSeededRandom(seed: string | number): () => number {
  let value = hashSeed(seed) || 1;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ mixed >>> 15, mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
    return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
  };
}

export const randomBetween = (min: number, max: number, random: () => number) => min + random() * (max - min);

const UNNAMED_EMPLOYEE_ANNUAL_SALARY = 52_000;

export function annualPayrollCost(state: GameState): number {
  const namedPayroll = state.employeeRoster.reduce((sum, employee) => sum + employee.salary, 0);
  const unnamedEmployees = Math.max(0, state.employees - state.employeeRoster.length);
  const operationsEfficiency = state.background === "Operations" ? .9 : 1;
  return (namedPayroll + unnamedEmployees * UNNAMED_EMPLOYEE_ANNUAL_SALARY) * operationsEfficiency;
}

export const monthlyPayrollCost = (state: GameState) => annualPayrollCost(state) / 12;
export const dailyPayrollCost = (state: GameState) => annualPayrollCost(state) / 365;

export function formatCurrencyText(value: string, currency: CurrencyCode): string {
  return value
    .replace(/\$\s*(?=\d)/g, `${currency} `)
    .replace(/\b(?:NOK|SEK|DKK|EUR|GBP|USD|CHF|JPY)\s+(?=[\d−-])/g, `${currency} `);
}

function normaliseDecisionCurrency(decision: DecisionEvent, currency: CurrencyCode): DecisionEvent {
  return {
    ...decision,
    title: formatCurrencyText(decision.title, currency),
    description: formatCurrencyText(decision.description, currency),
    choices: decision.choices.map((choice) => ({
      ...choice,
      label: formatCurrencyText(choice.label, currency),
      description: formatCurrencyText(choice.description, currency),
    })),
  };
}

export function normaliseCurrencyTextState(state: GameState): GameState {
  const currency = state.currency;
  return {
    ...state,
    events: state.events.map((event) => ({ ...event, title: formatCurrencyText(event.title, currency), body: formatCurrencyText(event.body, currency) })),
    pendingDecision: state.pendingDecision ? normaliseDecisionCurrency(state.pendingDecision, currency) : null,
    ceoInbox: state.ceoInbox.map((task) => ({
      ...task,
      title: formatCurrencyText(task.title, currency),
      summary: formatCurrencyText(task.summary, currency),
      decision: task.decision ? normaliseDecisionCurrency(task.decision, currency) : undefined,
    })),
    branchOffices: state.branchOffices.map((branch) => ({ ...branch, lastManagerAction: branch.lastManagerAction ? formatCurrencyText(branch.lastManagerAction, currency) : branch.lastManagerAction })),
    managementLog: state.managementLog.map((entry) => ({ ...entry, title: formatCurrencyText(entry.title, currency), detail: formatCurrencyText(entry.detail, currency) })),
    competitorMoves: state.competitorMoves.map((move) => ({ ...move, title: formatCurrencyText(move.title, currency), description: formatCurrencyText(move.description, currency) })),
    objectives: state.objectives.map((objective) => ({ ...objective, title: formatCurrencyText(objective.title, currency), description: formatCurrencyText(objective.description, currency) })),
  };
}

export function createEvent(day: number, tone: GameEvent["tone"], title: string, body: string): GameEvent {
  return {
    id: `event-${day}-${hashSeed(`${tone}-${title}-${body}`).toString(36)}`,
    day,
    tone,
    title,
    body,
  };
}

export function addEvent(state: GameState, nextEvent: GameEvent): GameState {
  let event = {
    ...nextEvent,
    title: formatCurrencyText(nextEvent.title, state.currency),
    body: formatCurrencyText(nextEvent.body, state.currency),
  };
  const normalisedEvent = event;
  let suffix = 2;
  while (state.events.some((existing) => existing.id === event.id)) {
    event = { ...normalisedEvent, id: `${nextEvent.id}-${suffix}` };
    suffix += 1;
  }
  return { ...state, events: [event, ...state.events].slice(0, 18) };
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
