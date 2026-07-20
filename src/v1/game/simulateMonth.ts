import { FIRST_NAMES, LAST_NAMES, formatMonthKey } from './config';
import type {
  BankStrategy,
  Branch,
  BranchMonthReport,
  Employee,
  GameDate,
  GameState,
  InboxItem,
  LendingPolicy,
  LoanApplication,
} from './types';

const roundMoney = (value: number) => Math.round(value / 1_000) * 1_000;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const nextDate = ({ year, month }: GameDate): GameDate =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

const strategyDemand = (strategy: BankStrategy) => {
  if (strategy === 'mortgages') return 1.24;
  if (strategy === 'small-business') return 0.84;
  if (strategy === 'service') return 1.06;
  return 1;
};

const strategyLoanSize = (strategy: BankStrategy) => {
  if (strategy === 'small-business') return 1.5;
  if (strategy === 'mortgages') return 1.12;
  return 1;
};

const mandateDemand = (branch: Branch) => {
  if (branch.mandate === 'profit') return 0.82;
  if (branch.mandate === 'growth') return 1.28;
  if (branch.mandate === 'service') return 1.08;
  return 1;
};

const marketDemand = (branch: Branch) => {
  if (branch.market === 'business') return 0.78;
  if (branch.market === 'mixed') return 1.08;
  return 1;
};

const employeeName = (seed: number) =>
  `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[(seed * 3) % LAST_NAMES.length]}`;

const applicationFor = (
  branch: Branch,
  strategy: BankStrategy,
  monthNumber: number,
  index: number,
): LoanApplication => {
  const baseAmount = branch.market === 'business' ? 2_400_000 : branch.market === 'mixed' ? 1_450_000 : 1_850_000;
  const amountVariation = 0.72 + ((monthNumber * 11 + index * 7) % 55) / 100;
  return {
    id: `${branch.id}-${monthNumber}-${index}`,
    customerName: employeeName(monthNumber + index + branch.name.length),
    amount: roundMoney(baseAmount * strategyLoanSize(strategy) * amountVariation),
    risk: 34 + ((monthNumber * 17 + index * 13 + branch.name.length) % 43),
    waitingMonths: 0,
  };
};

const maybeHireLocally = (
  branch: Branch,
  queueSize: number,
  capacity: number,
  monthNumber: number,
  nextCustomers: number,
) => {
  const hasManager = branch.employees.some((employee) => employee.role === 'branch-manager');
  if (!hasManager) return { employees: branch.employees, actions: [] as string[] };

  const loanAdvisors = branch.employees.filter((employee) => employee.role === 'lending-advisor');
  const customerAdvisors = branch.employees.filter((employee) => employee.role === 'customer-advisor');
  const queueThreshold = branch.staffingPolicy === 'lean' ? 1.9 : branch.staffingPolicy === 'growth' ? 0.75 : 1.2;
  const maxLoanAdvisors = branch.staffingPolicy === 'lean' ? 3 : branch.staffingPolicy === 'growth' ? 7 : 5;
  const customersPerAdvisor = branch.staffingPolicy === 'lean' ? 900 : branch.staffingPolicy === 'growth' ? 520 : 700;
  const maxCustomerAdvisors = branch.staffingPolicy === 'lean' ? 2 : branch.staffingPolicy === 'growth' ? 4 : 3;

  if (queueSize > Math.max(4, capacity * queueThreshold) && loanAdvisors.length < maxLoanAdvisors) {
    const newAdvisor: Employee = {
      id: `${branch.id}-loan-${monthNumber}-${loanAdvisors.length + 1}`,
      name: employeeName(monthNumber * 5 + queueSize),
      role: 'lending-advisor',
      skill: 56 + (monthNumber % 15),
      morale: 77,
      monthlySalary: 52_000,
    };
    return {
      employees: [...branch.employees, newAdvisor],
      actions: [`Filialleder ansatte ${newAdvisor.name} som lånerådgiver for å ta ned køen.`],
    };
  }

  const servicePressure = nextCustomers / Math.max(1, customerAdvisors.length);
  if (servicePressure > customersPerAdvisor && customerAdvisors.length < maxCustomerAdvisors) {
    const newAdvisor: Employee = {
      id: `${branch.id}-customer-${monthNumber}-${customerAdvisors.length + 1}`,
      name: employeeName(monthNumber * 7 + nextCustomers),
      role: 'customer-advisor',
      skill: 55 + ((monthNumber + nextCustomers) % 16),
      morale: 79,
      monthlySalary: 48_000,
    };
    return {
      employees: [...branch.employees, newAdvisor],
      actions: [`Filialleder ansatte ${newAdvisor.name} som kunderådgiver for å bevare servicenivået.`],
    };
  }

  return { employees: branch.employees, actions: [] as string[] };
};

const approvalThresholdFor = (
  strategy: BankStrategy,
  lendingPolicy: LendingPolicy,
) => {
  const policyThreshold = lendingPolicy === 'cautious' ? 57 : lendingPolicy === 'growth' ? 74 : 66;
  if (strategy === 'small-business') return policyThreshold - 3;
  if (strategy === 'mortgages') return policyThreshold + 2;
  return policyThreshold;
};

const simulateBranch = (
  branch: Branch,
  strategy: BankStrategy,
  lendingPolicy: LendingPolicy,
  date: GameDate,
): { branch: Branch; report: BranchMonthReport } => {
  const monthNumber = date.year * 12 + date.month;
  const monthKey = formatMonthKey(date.year, date.month);
  const lendingAdvisors = branch.employees.filter((employee) => employee.role === 'lending-advisor');
  const customerAdvisors = branch.employees.filter((employee) => employee.role === 'customer-advisor');
  const manager = branch.employees.find((employee) => employee.role === 'branch-manager');
  const averageLendingSkill = lendingAdvisors.length
    ? lendingAdvisors.reduce((sum, employee) => sum + employee.skill, 0) / lendingAdvisors.length
    : 0;

  const marketingLift = Math.min(7, branch.localMarketingBudget / 10_000);
  const reputationLift = branch.reputation / 15;
  const applicationsReceived = clamp(
    Math.round(
      (2.4 + marketingLift + reputationLift) *
      strategyDemand(strategy) *
      mandateDemand(branch) *
      marketDemand(branch),
    ),
    2,
    34,
  );

  const newApplications = Array.from({ length: applicationsReceived }, (_, index) =>
    applicationFor(branch, strategy, monthNumber, index),
  );
  const agedQueue = branch.loanQueue.map((application) => ({
    ...application,
    waitingMonths: application.waitingMonths + 1,
  }));
  const fullQueue = [...agedQueue, ...newApplications];

  const managerMultiplier = manager ? 0.9 + manager.skill / 500 : 0.8;
  const capacityPerAdvisor = 5 + Math.round(averageLendingSkill / 22);
  const processingCapacity = Math.max(0, Math.round(lendingAdvisors.length * capacityPerAdvisor * managerMultiplier));
  const processed = fullQueue.slice(0, processingCapacity);
  const approvalThreshold = approvalThresholdFor(strategy, lendingPolicy);
  const approved = processed.filter((application) => application.risk <= approvalThreshold);
  const approvedAmount = approved.reduce((sum, application) => sum + application.amount, 0);
  const remainingQueue = fullQueue.slice(processingCapacity);

  const mandateCustomerLift = branch.mandate === 'growth' ? 3 : branch.mandate === 'service' ? 2 : branch.mandate === 'profit' ? -1 : 0;
  const organicCustomers = Math.max(
    0,
    Math.round(
      customerAdvisors.length * 1.7 +
      branch.reputation / 32 +
      branch.localMarketingBudget / 26_000 +
      mandateCustomerLift,
    ),
  );
  const queueChurn = remainingQueue.length > 16 ? Math.round((remainingQueue.length - 14) / 3) : 0;
  const newCustomers = Math.max(0, approved.length + organicCustomers - queueChurn);
  const nextCustomers = Math.max(0, branch.customers + newCustomers);
  const nextLoanBook = Math.max(0, branch.loanBook * 0.994 + approvedAmount);
  const nextDeposits = Math.max(0, branch.deposits * 0.998 + newCustomers * 64_000);

  const salaryCost = branch.employees.reduce((sum, employee) => sum + employee.monthlySalary, 0);
  const interestRevenue = nextLoanBook * 0.00445;
  const depositRevenue = nextDeposits * 0.00072;
  const serviceMultiplier = branch.mandate === 'service' ? 1.18 : branch.mandate === 'profit' ? 0.92 : 1;
  const serviceRevenue = nextCustomers * 43 * serviceMultiplier;
  const lendingRiskMultiplier = lendingPolicy === 'cautious' ? 0.75 : lendingPolicy === 'growth' ? 1.38 : 1;
  const creditLosses = nextLoanBook *
    (0.00025 + Math.max(0, 58 - branch.reputation) * 0.000006) *
    lendingRiskMultiplier;
  const revenue = roundMoney(interestRevenue + depositRevenue + serviceRevenue);
  const expenses = roundMoney(
    salaryCost + branch.rentMonthly + branch.localMarketingBudget + creditLosses,
  );
  const profit = revenue - expenses;

  const hireResult = maybeHireLocally(branch, remainingQueue.length, processingCapacity, monthNumber, nextCustomers);
  const managerActions = [...hireResult.actions];
  if (remainingQueue.length === 0 && fullQueue.length > 0) {
    managerActions.push('Teamet behandlet hele lånekøen denne måneden.');
  }
  if (profit > 0 && (branch.reports.at(-1)?.profit ?? -1) <= 0) {
    managerActions.push('Filialen gikk over i månedlig overskudd.');
  }
  if (remainingQueue.length > 15 && branch.staffingPolicy === 'lean') {
    managerActions.push('Filialleder varsler at den stramme bemanningsrammen nå gir merkbar ventetid.');
  }

  const reputationChange =
    (remainingQueue.length > 15 ? -2 : remainingQueue.length < 5 ? 1 : 0) +
    (branch.mandate === 'service' ? 1 : 0) +
    (queueChurn > 0 ? -1 : 0);
  const nextReputation = clamp(branch.reputation + reputationChange, 20, 95);
  const workload = remainingQueue.length / Math.max(1, processingCapacity);
  const nextEmployees = hireResult.employees.map((employee) => ({
    ...employee,
    morale: clamp(employee.morale + (workload > 1.5 ? -2 : workload < 0.5 ? 1 : 0), 35, 95),
  }));

  const report: BranchMonthReport = {
    monthKey,
    applicationsReceived,
    applicationsProcessed: processed.length,
    loansApproved: approved.length,
    newCustomers,
    revenue,
    expenses,
    profit,
    queueEnd: remainingQueue.length,
    managerActions,
  };

  return {
    branch: {
      ...branch,
      reputation: nextReputation,
      customers: nextCustomers,
      deposits: roundMoney(nextDeposits),
      loanBook: roundMoney(nextLoanBook),
      employees: nextEmployees,
      loanQueue: remainingQueue,
      reports: [...branch.reports.slice(-11), report],
    },
    report,
  };
};

const managementReport = (
  monthKey: string,
  results: Array<{ branch: Branch; report: BranchMonthReport }>,
): InboxItem => {
  const totalProfit = results.reduce((sum, result) => sum + result.report.profit, 0);
  const totalApproved = results.reduce((sum, result) => sum + result.report.loansApproved, 0);
  const totalQueue = results.reduce((sum, result) => sum + result.report.queueEnd, 0);
  const localActions = results.flatMap((result) => result.report.managerActions);
  const actionSentence = localActions.length
    ? ` Lederne håndterte dette lokalt: ${localActions.join(' ')}`
    : ' Ingen saker krevde din godkjenning.';

  return {
    id: `management-${monthKey}`,
    monthKey,
    kind: totalQueue > 20 || totalProfit < -300_000 ? 'warning' : 'report',
    title: `Ledelsesrapport – ${monthKey}`,
    body: `Banken behandlet ${totalApproved} nye lån og leverte ${totalProfit >= 0 ? 'overskudd' : 'underskudd'} på ${Math.abs(totalProfit).toLocaleString('nb-NO')} kr. Samlet lånekø er ${totalQueue}.${actionSentence}`,
    read: false,
  };
};

export const simulateNextMonth = (state: GameState): GameState => {
  const date = nextDate(state.date);
  const monthKey = formatMonthKey(date.year, date.month);
  const results = state.branches.map((branch) =>
    simulateBranch(branch, state.strategy, state.lendingPolicy, date),
  );
  const totalProfit = results.reduce((sum, result) => sum + result.report.profit, 0);

  return {
    ...state,
    date,
    cash: roundMoney(state.cash + totalProfit),
    equity: roundMoney(state.equity + totalProfit),
    branches: results.map((result) => result.branch),
    inbox: [managementReport(monthKey, results), ...state.inbox].slice(0, 30),
  };
};