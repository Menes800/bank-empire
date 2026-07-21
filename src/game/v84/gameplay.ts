import { advanceDaysV8 } from "../v8/gameplay";
import type { ActiveLoan, BranchOffice, EmployeeProfile, GameState, LoanApplication } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";

const branchRoleWords = ["branch", "customer", "adviser", "advisor", "credit", "mortgage", "operations"];

function deterministic(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function belongsInBranch(employee: EmployeeProfile) {
  if (employee.executiveRole) return false;
  const text = `${employee.department ?? ""} ${employee.role} ${employee.trait}`.toLowerCase();
  return employee.department === "Branch Operations" || employee.department === "Credit & Collections" || branchRoleWords.some((word) => text.includes(word));
}

export function branchForApplication(state: GameState, application: LoanApplication): BranchOffice | undefined {
  if (state.branchOffices.length === 0) return undefined;
  const index = Math.floor(deterministic(application.id) * state.branchOffices.length);
  return state.branchOffices[index] ?? state.branchOffices[0];
}

function employeesForBranch(state: GameState, branchId: string) {
  const branch = state.branchOffices.find((item) => item.id === branchId);
  return state.employeeRoster.filter((employee) => employee.assignedBranchId === branchId || employee.id === branch?.managerId);
}

export function getBranchEconomics(state: GameState, branch: BranchOffice) {
  const employees = employeesForBranch(state, branch.id);
  const annualPayroll = employees.reduce((sum, employee) => sum + employee.salary, 0);
  const payroll = round(annualPayroll / 12);
  const rent = round(branch.monthlyRent);
  const priority = branch.operatingPriority ?? "balanced";
  const requestedMarketing = branch.managerBudget ?? 0;
  const marketingCap = priority === "profitability" ? 10_000 : priority === "balanced" ? 25_000 : priority === "deposits" || priority === "business" ? 35_000 : 60_000;
  const marketing = Math.min(requestedMarketing, marketingCap);
  const operations = 7_000 + branch.level * 3_500 + employees.length * 800;
  const cost = round(rent + payroll + marketing + operations);
  const customers = branch.localCustomers ?? Math.min(branch.capacity, 220 + branch.level * 85);
  const deposits = branch.localDeposits ?? 0;
  const loans = branch.localLoans ?? 0;
  const relationshipIncome = branch.profile === "wealth" ? 390 : branch.profile === "business" ? 315 : branch.profile === "mortgage" ? 245 : 220;
  const productBreadth = 1 + Math.max(0, state.products.length - 1) * .065;
  const serviceFactor = .72 + branch.satisfaction / 220;
  const feeIncome = customers * relationshipIncome * productBreadth * serviceFactor;
  const depositMargin = deposits * Math.max(.55, state.baseRate - state.depositRate + 1.25) / 100 / 12;
  const lendingMargin = loans * Math.max(1.25, state.loanRate - state.baseRate) / 100 / 12;
  const revenue = round(feeIncome + depositMargin + lendingMargin);
  const profit = round(revenue - cost);
  return { employees, annualPayroll, payroll, rent, marketing, operations, cost, revenue, profit, customers, deposits, loans };
}

function assignUnplacedBranchEmployees(state: GameState): GameState {
  if (state.branchOffices.length === 0) return state;
  let cursor = 0;
  const roster = state.employeeRoster.map((employee) => {
    if (employee.assignedBranchId || !belongsInBranch(employee)) return employee;
    const branch = state.branchOffices[cursor % state.branchOffices.length];
    cursor += 1;
    return { ...employee, assignedBranchId: branch.id };
  });
  return { ...state, employeeRoster: roster };
}

function cleanCEOInbox(state: GameState): GameState {
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  const cro = state.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  const cmo = state.employeeRoster.find((employee) => employee.executiveRole === "CMO");
  const ceoInbox = state.ceoInbox.filter((task) => {
    if (task.status !== "open") return task.urgency !== "routine";
    if (task.decision) return true;
    if (task.urgency === "routine") return false;
    if (task.category === "market" && cmo && state.managementControl.marketing !== "manual") return false;
    if (task.category === "network" && coo && state.managementControl.operations !== "manual") {
      const severe = task.urgency === "critical" || task.title.toLowerCase().includes("expansion");
      return severe;
    }
    if (task.category === "credit" && cro && state.managementControl.lending !== "manual") return task.urgency === "critical";
    return true;
  });
  return ceoInbox.length === state.ceoInbox.length ? state : { ...state, ceoInbox };
}

function routineMandate(branch: BranchOffice) {
  const mandate = branch.managerMandate ?? "manual";
  if (mandate === "growth") return 1_200_000;
  if (mandate === "autonomous") return 800_000;
  if (mandate === "guarded") return 350_000;
  return 0;
}

function approveRoutineApplication(state: GameState, application: LoanApplication, branch: BranchOffice, adviserName: string): GameState {
  const loan: ActiveLoan = {
    id: `loan-${application.id}-${state.day}`,
    customerName: application.customerName,
    segment: application.segment,
    principal: application.amount,
    outstanding: application.amount,
    rate: application.rate,
    riskGrade: application.riskGrade,
    collateral: application.collateral,
    status: "performing",
    daysPastDue: 0,
    originatedDay: state.day,
    nextPaymentDay: state.day + 30,
    missedPayments: 0,
    lastPaymentDay: state.day,
    recoveryEstimate: round(application.amount * clamp(application.collateral / 100 * .78 + .08, .18, .92)),
  };
  return {
    ...state,
    cash: Math.max(0, state.cash - application.amount),
    loans: state.loans + application.amount,
    customers: state.customers + 1,
    activeLoans: [loan, ...state.activeLoans].slice(0, 120),
    loanApplications: state.loanApplications.filter((item) => item.id !== application.id),
    branchOffices: state.branchOffices.map((item) => item.id === branch.id ? {
      ...item,
      localLoans: (item.localLoans ?? 0) + application.amount,
      localCustomers: Math.min(item.capacity, (item.localCustomers ?? 0) + 1),
      lastManagerAction: `${adviserName} approved ${application.customerName}'s ${application.segment.toLowerCase()} application inside the local credit mandate.`,
    } : item),
  };
}

function runBranchLoanDesks(state: GameState): GameState {
  let next = state;
  let approved = 0;
  let declined = 0;
  const handledByBranch = new Map<string, number>();

  for (const application of [...state.loanApplications]) {
    const branch = branchForApplication(next, application);
    if (!branch?.managerId || branch.managerMandate === "manual") continue;
    const branchEmployees = employeesForBranch(next, branch.id);
    const advisers = branchEmployees.filter((employee) => belongsInBranch(employee));
    const capacity = Math.max(1, advisers.length * 3);
    const handled = handledByBranch.get(branch.id) ?? 0;
    if (handled >= capacity) continue;

    const limit = routineMandate(branch);
    const ordinaryRisk = application.riskGrade === "A" || application.riskGrade === "B" || (application.riskGrade === "C" && branch.managerMandate === "growth" && application.collateral >= 75);
    const automaticDecline = application.riskGrade === "D" && application.amount <= limit;
    const adviser = advisers.sort((a, b) => b.skill - a.skill)[0] ?? next.employeeRoster.find((employee) => employee.id === branch.managerId);
    if (!adviser) continue;

    if (automaticDecline) {
      next = {
        ...next,
        loanApplications: next.loanApplications.filter((item) => item.id !== application.id),
        branchOffices: next.branchOffices.map((item) => item.id === branch.id ? { ...item, lastManagerAction: `${adviser.name} declined a high-risk ${application.segment.toLowerCase()} request inside policy.` } : item),
      };
      declined += 1;
      handledByBranch.set(branch.id, handled + 1);
      continue;
    }

    if (ordinaryRisk && application.amount <= limit && next.cash >= application.amount + 250_000) {
      next = approveRoutineApplication(next, application, branch, adviser.name);
      approved += 1;
      handledByBranch.set(branch.id, handled + 1);
    }
  }

  if (approved + declined > 0) {
    next = addEvent(next, createEvent(state.day, "positive", "Local loan desks completed their review", `${approved} routine application${approved === 1 ? " was" : "s were"} approved and ${declined} high-risk application${declined === 1 ? " was" : "s were"} declined by branch staff. Only exceptions remain for central review.`));
  }
  return next;
}

function rebalanceBranchMonth(state: GameState): GameState {
  const summaries: string[] = [];
  let totalBranchProfit = 0;

  const branchOffices = state.branchOffices.map((branch) => {
    const economics = getBranchEconomics(state, branch);
    totalBranchProfit += economics.profit;
    const manager = state.employeeRoster.find((employee) => employee.id === branch.managerId);
    summaries.push(`${branch.name}: ${economics.profit >= 0 ? "+" : "−"}NOK ${Math.abs(round(economics.profit / 1000))}k, ${economics.employees.length} staff, NOK ${round(economics.marketing / 1000)}k marketing.`);
    return {
      ...branch,
      managerBudget: economics.marketing,
      lastMonthRevenue: economics.revenue,
      lastMonthCost: economics.cost,
      lastMonthProfit: economics.profit,
      lifetimeProfit: (branch.lifetimeProfit ?? 0) + economics.profit,
      lastManagerAction: manager ? `${manager.name} closed the month with ${economics.employees.length} assigned staff, ${economics.customers} customers and ${economics.profit >= 0 ? "+" : "−"}NOK ${Math.abs(round(economics.profit / 1000))}k result.` : "The branch has no accountable manager.",
    };
  });

  return addEvent({ ...state, branchOffices }, createEvent(state.day, totalBranchProfit >= 0 ? "positive" : "neutral", "Branch economics reconciled", summaries.join(" ")));
}

export function prepareV84State(state: GameState): GameState {
  return cleanCEOInbox(assignUnplacedBranchEmployees(state));
}

export function advanceDaysV84(state: GameState, days: number): GameState {
  let current = prepareV84State(state);
  for (let index = 0; index < days; index += 1) {
    const beforeDay = current.day;
    let next = advanceDaysV8(current, 1);
    if (next.day === beforeDay) break;
    if (next.day % 7 === 0) next = runBranchLoanDesks(next);
    if (next.day % 30 === 0) next = rebalanceBranchMonth(next);
    current = cleanCEOInbox(assignUnplacedBranchEmployees(next));
  }
  return current;
}

export function assignEmployeeToBranch(state: GameState, employeeId: string, branchId: string | null): GameState {
  if (branchId && !state.branchOffices.some((branch) => branch.id === branchId)) return state;
  return {
    ...state,
    employeeRoster: state.employeeRoster.map((employee) => employee.id === employeeId && !employee.executiveRole ? { ...employee, assignedBranchId: branchId } : employee),
  };
}

export function trainEmployee(state: GameState, employeeId: string): GameState {
  const employee = state.employeeRoster.find((item) => item.id === employeeId);
  const cost = 18_000;
  if (!employee || state.cash < cost) return state;
  return addEvent({
    ...state,
    cash: state.cash - cost,
    employeeRoster: state.employeeRoster.map((item) => item.id === employeeId ? {
      ...item,
      skill: clamp(item.skill + 3, 1, 100),
      performance: clamp((item.performance ?? item.skill) + 2, 1, 100),
      potential: clamp((item.potential ?? item.skill) + 1, 1, 100),
      wellbeing: clamp((item.wellbeing ?? item.energy) + 2, 1, 100),
    } : item),
  }, createEvent(state.day, "positive", `${employee.name} completed development training`, "Skill, performance and wellbeing improved through a focused development programme."));
}
