import { advanceDaysV84 } from "./gameplay";
import type { GameState } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";

function runLocalMarketingMonth(state: GameState): GameState {
  let customerGain = 0;
  let reputationGain = 0;
  const branchOffices = state.branchOffices.map((branch) => {
    const budget = branch.managerBudget ?? 0;
    const customers = branch.localCustomers ?? 0;
    const spareCapacity = Math.max(0, branch.capacity - customers);
    const manager = state.employeeRoster.find((employee) => employee.id === branch.managerId);
    const managerFactor = manager ? clamp((manager.skill + manager.leadership) / 140, .65, 1.35) : .45;
    const priorityFactor = branch.operatingPriority === "growth" ? 1.25 : branch.operatingPriority === "profitability" ? .7 : 1;
    const possible = round(Math.sqrt(Math.max(0, budget) / 1_000) * 2.4 * managerFactor * priorityFactor);
    const gained = Math.min(spareCapacity, possible);
    customerGain += gained;
    reputationGain += budget > 0 ? Math.min(.25, budget / 240_000) : 0;
    return gained > 0 ? { ...branch, localCustomers: customers + gained } : branch;
  });
  if (customerGain === 0) return state;
  return addEvent({
    ...state,
    branchOffices,
    customers: state.customers + customerGain,
    customersGained: state.customersGained + customerGain,
    reputation: clamp(state.reputation + reputationGain, 1, 100),
  }, createEvent(state.day, "positive", "Local campaigns produced new relationships", `${customerGain} new customers were converted across branches with enough service capacity. Branches at full capacity received no artificial growth bonus.`));
}

export function advanceDaysV84Final(state: GameState, days: number): GameState {
  let current = state;
  for (let index = 0; index < days; index += 1) {
    const beforeDay = current.day;
    let next = advanceDaysV84(current, 1);
    if (next.day === beforeDay) break;
    if (next.day % 30 === 0) next = runLocalMarketingMonth(next);
    current = next;
  }
  return current;
}
