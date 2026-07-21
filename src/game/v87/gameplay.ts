import { getBranchEconomics } from "../v84/gameplay";
import { advanceDaysV86, prepareV86State } from "../v86/gameplay";
import type { BranchOffice, CashFlowSnapshot, EmployeeProfile, GameState } from "../types";
import { addEvent, calculateRatios, clamp, createEvent, round } from "../utils";

function depositBalancePerCustomer(state: GameState) {
  const productValue =
    (state.products.includes("savings") ? 8_000 : 0) +
    (state.products.includes("wealth") ? 10_000 : 0) +
    (state.products.includes("sme") ? 6_000 : 0) +
    (state.products.includes("cards") ? 1_500 : 0);
  return clamp(18_000 + productValue + state.reputation * 100, 18_000, 46_000);
}

function severeDepositGap(state: GameState) {
  const target = state.customers * depositBalancePerCustomer(state);
  const localDeposits = state.branchOffices.reduce((sum, branch) => sum + (branch.localDeposits ?? 0), 0);
  return state.customers >= 50 && state.deposits < Math.max(localDeposits, target * 0.1);
}

function repairDepositBase(state: GameState): GameState {
  if (!severeDepositGap(state)) return state;
  const target = state.customers * depositBalancePerCustomer(state);
  const localDeposits = state.branchOffices.reduce((sum, branch) => sum + (branch.localDeposits ?? 0), 0);
  const repairedDeposits = round(Math.max(localDeposits, target * 0.72, 1_000_000));
  const increase = Math.max(0, repairedDeposits - state.deposits);
  const cash = state.cash + increase;
  const ratios = calculateRatios(cash, state.loans, repairedDeposits, state.wholesaleFunding, state.compliance, state.nplRatio, state.reputation, state.satisfaction);
  return addEvent({ ...state, cash, deposits: repairedDeposits, ...ratios }, createEvent(state.day, "positive", "Customer deposit base reconciled", `Legacy customer accounts were reconciled to NOK ${round(repairedDeposits / 1_000_000)}m. The matching cash and deposit liability were restored without changing shareholder equity.`));
}

function branchWeight(branch: BranchOffice, kind: "deposits" | "loans") {
  const customers = Math.max(40, branch.localCustomers ?? 0);
  const profile = kind === "deposits"
    ? branch.profile === "wealth" ? 1.45 : branch.profile === "business" ? 1.25 : 1
    : branch.profile === "mortgage" ? 1.5 : branch.profile === "business" ? 1.35 : branch.profile === "wealth" ? 1.15 : 1;
  return customers * profile;
}

function syncBranchBalanceSheet(state: GameState): GameState {
  if (state.branchOffices.length === 0) return state;
  const localCustomers = state.branchOffices.reduce((sum, branch) => sum + Math.max(0, branch.localCustomers ?? 0), 0);
  const localCoverage = clamp(localCustomers / Math.max(1, state.customers), 0.2, 1);
  const depositPool = state.deposits * clamp(0.42 + localCoverage * 0.35, 0.45, 0.78);
  const loanPool = state.loans * clamp(0.38 + localCoverage * 0.34, 0.42, 0.72);
  const depositWeight = state.branchOffices.reduce((sum, branch) => sum + branchWeight(branch, "deposits"), 0);
  const loanWeight = state.branchOffices.reduce((sum, branch) => sum + branchWeight(branch, "loans"), 0);

  return {
    ...state,
    branchOffices: state.branchOffices.map((branch) => ({
      ...branch,
      localDeposits: round(depositPool * branchWeight(branch, "deposits") / Math.max(1, depositWeight)),
      localLoans: round(loanPool * branchWeight(branch, "loans") / Math.max(1, loanWeight)),
    })),
  };
}

function loanBranchId(state: GameState, loanId: string) {
  if (state.branchOffices.length === 0) return null;
  const index = Math.abs([...loanId].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % state.branchOffices.length;
  return state.branchOffices[index]?.id ?? null;
}

function desiredBranchHeadcount(state: GameState, branch: BranchOffice) {
  const customers = branch.localCustomers ?? 0;
  const applications = state.loanApplications.filter((application) => {
    const index = state.branchOffices.length > 0 ? Math.abs([...application.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % state.branchOffices.length : 0;
    return state.branchOffices[index]?.id === branch.id;
  }).length;
  const activeLoans = state.activeLoans.filter((loan) => loanBranchId(state, loan.id) === branch.id && loan.status !== "written-off").length;
  const customerAdvisers = Math.max(1, Math.ceil(customers / 180));
  const creditAdvisers = Math.max(1, Math.ceil(applications / 4 + activeLoans / 45));
  const support = customers > 360 || branch.level >= 2 ? 1 : 0;
  const growth = (branch.managerBudget ?? 0) >= 25_000 && branch.operatingPriority !== "profitability" ? 1 : 0;
  return clamp(1 + customerAdvisers + creditAdvisers + support + growth, 4, branch.staffSlots);
}

function isFlexibleLocalHire(employee: EmployeeProfile) {
  return employee.id.startsWith("emp-local-") || employee.id.startsWith("auto-") || /local operator|management-recommended hire/i.test(employee.trait);
}

function runBranchCostControl(state: GameState): GameState {
  let next = state;
  const actions: string[] = [];
  const managerIds = new Set(state.branchOffices.map((branch) => branch.managerId).filter((id): id is string => Boolean(id)));

  for (const branch of state.branchOffices) {
    if (!branch.managerId || !branch.managerControl || branch.managerMandate === "manual" || branch.managerMandate === "growth") continue;
    const team = next.employeeRoster.filter((employee) => employee.assignedBranchId === branch.id && !employee.executiveRole);
    const desired = desiredBranchHeadcount(next, branch);
    const surplus = team.length - desired;
    const averageWorkload = team.reduce((sum, employee) => sum + (employee.workload ?? 70), 0) / Math.max(1, team.length);
    const shouldReduce = surplus > 0 && ((branch.lastMonthProfit ?? 0) < 0 || averageWorkload < 72);
    if (!shouldReduce) continue;

    const limit = branch.managerMandate === "guarded" ? 3 : 1;
    const candidates = team
      .filter((employee) => !managerIds.has(employee.id))
      .sort((a, b) => Number(isFlexibleLocalHire(b)) - Number(isFlexibleLocalHire(a)) || (a.workload ?? 70) - (b.workload ?? 70));
    const selected = candidates.slice(0, Math.min(limit, surplus));
    if (selected.length === 0) continue;

    const released = new Set(selected.filter(isFlexibleLocalHire).map((employee) => employee.id));
    const movable = selected.filter((employee) => !released.has(employee.id));
    const targetBranches = next.branchOffices.filter((item) => item.id !== branch.id && item.managerId).sort((a, b) => {
      const aTeam = next.employeeRoster.filter((employee) => employee.assignedBranchId === a.id && !employee.executiveRole).length;
      const bTeam = next.employeeRoster.filter((employee) => employee.assignedBranchId === b.id && !employee.executiveRole).length;
      return (aTeam - desiredBranchHeadcount(next, a)) - (bTeam - desiredBranchHeadcount(next, b));
    });

    let employeeRoster = next.employeeRoster.filter((employee) => !released.has(employee.id));
    for (const employee of movable) {
      const target = targetBranches.find((item) => employeeRoster.filter((person) => person.assignedBranchId === item.id && !person.executiveRole).length < desiredBranchHeadcount({ ...next, employeeRoster }, item));
      if (target) employeeRoster = employeeRoster.map((person) => person.id === employee.id ? { ...person, assignedBranchId: target.id, reportsTo: target.managerId } : person);
    }

    const manager = next.employeeRoster.find((employee) => employee.id === branch.managerId);
    const description = `${released.size > 0 ? `${released.size} temporary contract${released.size === 1 ? "" : "s"} ended` : ""}${released.size > 0 && movable.length > 0 ? " and " : ""}${movable.length > 0 ? `${movable.length} employee${movable.length === 1 ? " was" : "s were"} reassigned` : ""}`;
    next = {
      ...next,
      employeeRoster,
      employees: employeeRoster.length,
      branchOffices: next.branchOffices.map((item) => item.id === branch.id ? { ...item, lastManagerAction: `${manager?.name ?? "The branch manager"} reduced overstaffing toward ${desired} roles: ${description}.` } : item),
    };
    actions.push(`${branch.name}: ${description} after the branch review found ${team.length} staff against a need for about ${desired}.`);
  }

  return actions.length > 0 ? addEvent(next, createEvent(state.day, "neutral", "Branch staffing was rebalanced", actions.join(" "))) : next;
}

function refreshBranchSnapshots(state: GameState): GameState {
  return {
    ...state,
    branchOffices: state.branchOffices.map((branch) => {
      const economics = getBranchEconomics(state, branch);
      return {
        ...branch,
        lastMonthRevenue: economics.revenue,
        lastMonthCost: economics.cost,
        lastMonthProfit: economics.profit,
        lastManagerAction: branch.lastManagerAction?.replace(/\$(?=\d)/g, "NOK "),
      };
    }),
  };
}

function normaliseCurrencyCopy(state: GameState): GameState {
  const normalise = (value: string) => value.replace(/\$(?=\d)/g, "NOK ").replace(/NOK\s+NOK\s+/g, "NOK ");
  return {
    ...state,
    events: state.events.map((event) => ({ ...event, title: normalise(event.title), body: normalise(event.body) })),
    ceoInbox: state.ceoInbox.map((task) => ({ ...task, title: normalise(task.title), summary: normalise(task.summary) })),
    branchOffices: state.branchOffices.map((branch) => ({ ...branch, lastManagerAction: branch.lastManagerAction ? normalise(branch.lastManagerAction) : branch.lastManagerAction })),
  };
}

function reconcileCashFlow(before: GameState, after: GameState): GameState {
  const depositChange = after.deposits - before.deposits;
  const loanChange = after.loans - before.loans;
  const fundingChange = after.wholesaleFunding - before.wholesaleFunding;
  const depositInflows = Math.max(0, depositChange);
  const customerWithdrawals = Math.max(0, -depositChange);
  const newLending = Math.max(0, loanChange);
  const loanRepayments = Math.max(0, -loanChange);
  const knownClosing = before.cash + depositInflows - customerWithdrawals + loanRepayments - newLending + after.profit + fundingChange;
  const snapshot: CashFlowSnapshot = {
    day: after.day,
    openingCash: before.cash,
    depositInflows,
    customerWithdrawals,
    loanRepayments,
    newLending,
    operatingProfit: after.profit,
    fundingChange,
    otherMovements: after.cash - knownClosing,
    closingCash: after.cash,
  };
  return { ...after, cashFlowHistory: [...after.cashFlowHistory.filter((row) => row.day !== after.day), snapshot].slice(-120) };
}

export function prepareV87State(state: GameState): GameState {
  let next = prepareV86State(state);
  const hadGap = severeDepositGap(next);
  next = repairDepositBase(next);
  next = syncBranchBalanceSheet(next);
  if (hadGap) next = refreshBranchSnapshots(next);
  next = normaliseCurrencyCopy(next);
  return { ...next, employees: next.employeeRoster.length, branches: next.branchOffices.length };
}

export function advanceDaysV87(state: GameState, days: number): GameState {
  let current = prepareV87State(state);
  for (let index = 0; index < days; index += 1) {
    const before = current;
    let next = advanceDaysV86(current, 1);
    if (next.day === before.day) break;
    next = repairDepositBase(next);
    next = syncBranchBalanceSheet(next);
    if (next.day % 30 === 0) {
      next = runBranchCostControl(next);
      next = refreshBranchSnapshots(next);
    }
    next = normaliseCurrencyCopy(next);
    current = reconcileCashFlow(before, { ...next, employees: next.employeeRoster.length, branches: next.branchOffices.length });
  }
  return current;
}
