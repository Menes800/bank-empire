import { FIRST_NAMES, LAST_NAMES, formatMonthKey } from './config';
import type {
  BankStrategy,
  Branch,
  BranchMonthReport,
  Employee,
  GameDate,
  GameState,
  InboxItem,
  LoanApplication,
} from './types';

const roundMoney = (value: number) => Math.round(value / 1_000) * 1_000;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const nextDate = ({ year, month }: GameDate): GameDate =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

const strategyDemand = (strategy: BankStrategy) => {
  if (strategy === 'mortgages') return 1.28;
  if (strategy === 'small-business') return 0.82;
  if (strategy === 'service') return 1.05;
  return 1;
};

const strategyLoanSize = (strategy: BankStrategy) => {
  if (strategy === 'small-business') return 1.55;
  if (strategy === 'mortgages') return 1.12;
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

const maybeHireLocally = (branch: Branch, queueSize: number, capacity: number, monthNumber: number) => {
  const hasManager = branch.employees.some((employee) => employee.role === 'branch-manager');
  const loanAdvisors = branch.employees.filter((employee) => employee.role === 'lending-advisor');
  if (!hasManager || queueSize <= capacity * 1.35 || loanAdvisors.length >= 4) {
    return { employees: branch.employees, action: null as string | null };
  }

  const newAdvisor: Employee = {
    id: `${branch.id}-advisor-${monthNumber}-${loanAdvisors.length + 1}`,
    name: employeeName(monthNumber * 5 + queueSize),
    role: 'lending-advisor',
    skill: 56 + (monthNumber % 15),
    morale: 76,
    monthlySalary: 52_000,
  };

  return {
    employees: [...branch.employees, newAdvisor],
    action: `Filialleder ansatte ${newAdvisor.name} som lånerådgiver for å ta ned køen.`,
  };
};

const simulateBranch = (
  branch: Branch,
  strategy: BankStrategy,
  date: GameDate,
): { branch: Branch; report: BranchMonthReport } => {
  const monthNumber = date.year * 12 + date.month;
  const monthKey = formatMonthKey(date.year, date.month);
  const lendingAdvisors = branch.employees.filter((employee) => employee.role === 'lending-advisor');
  const customerAdvisors = branch.employees.filter((employee) => employee.role === 'customer-advisor');
  const averageLendingSkill = lendingAdvisors.length
    ? lendingAdvisors.reduce((sum, employee) => sum + employee.skill, 0) / lendingAdvisors.length
    : 0;

  const marketingLift = Math.min(4.5, branch.localMarketingBudget / 11_000);
  const reputationLift = branch.reputation / 13;
  const applicationsReceived = Math.max(
    2,
    Math.round((3.2 + marketingLift + reputationLift) * strategyDemand(strategy)),
  );

  const newApplications = Array.from({ length: applicationsReceived }, (_, index) =>
    applicationFor(branch, strategy, monthNumber, index),
  );
  const agedQueue = branch.loanQueue.map((application) => ({
    ...application,
    waitingMonths: application.waitingMonths + 1,
  }));
  const fullQueue = [...agedQueue, ...newApplications];

  const capacityPerAdvisor = 5 + Math.round(averageLendingSkill / 22);
  const processingCapacity = Math.max(0, lendingAdvisors.length * capacityPerAdvisor);
  const processed = fullQueue.slice(0, processingCapacity);
  const approvalThreshold = strategy === 'small-business' ? 62 : strategy === 'mortgages' ? 70 : 66;
  const approved = processed.filter((application) => application.risk <= approvalThreshold);
  const approvedAmount = approved.reduce((sum, application) => sum + application.amount, 0);
  const remainingQueue = fullQueue.slice(processingCapacity);

  const organicCustomers = Math.max(
    1,
    Math.round(customerAdvisors.length * 1.5 + branch.reputation / 30 + branch.localMarketingBudget / 28_000),
  );
  const newCustomers = approved.length + organicCustomers;
  const nextCustomers = branch.customers + newCustomers;
  const nextLoanBook = Math.max(0, branch.loanBook * 0.994 + approvedAmount);
  const nextDeposits = Math.max(0, branch.deposits * 0.998 + newCustomers * 62_000);

  const salaryCost = branch.employees.reduce((sum, employee) => sum + employee.monthlySalary, 0);
  const interestRevenue = nextLoanBook * 0.0042;
  const depositRevenue = nextDeposits * 0.0007;
  const serviceRevenue = nextCustomers * 40;
  const creditLosses = nextLoanBook * (0.00028 + Math.max(0, 58 - branch.reputation) * 0.000006);
  const revenue = roundMoney(interestRevenue + depositRevenue + serviceRevenue);
  const expenses = roundMoney(
    salaryCost + branch.rentMonthly + branch.localMarketingBudget + creditLosses,
  );
  const profit = revenue - expenses;

  const hireResult = maybeHireLocally(branch, remainingQueue.length, processingCapacity, monthNumber);
  const managerActions: string[] = [];
  if (hireResult.action) managerActions.push(hireResult.action);
  if (remainingQueue.length === 0 && fullQueue.length > 0) {
    managerActions.push('Teamet behandlet hele lånekøen denne måneden.');
  }
  const previousReport = branch.reports.at(-1);
  if (profit > 0 && previousReport && previousReport.profit <= 0) {
    managerActions.push('Filialen gikk over i månedlig overskudd.');
  }

  const nextReputation = clamp(
    branch.reputation + (remainingQueue.length > 12 ? -2 : 1) + (strategy === 'service' ? 1 : 0),
    20,
    95,
  );

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
      employees: hireResult.employees,
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
    kind: totalQueue > 18 || totalProfit < -250_000 ? 'warning' : 'report',
    title: `Ledelsesrapport – ${monthKey}`,
    body: `Banken behandlet ${totalApproved} nye lån og leverte ${totalProfit >= 0 ? 'overskudd' : 'underskudd'} på ${Math.abs(totalProfit).toLocaleString('nb-NO')} kr. Samlet lånekø er ${totalQueue}.${actionSentence}`,
    read: false,
  };
};

export const simulateNextMonth = (state: GameState): GameState => {
  const date = nextDate(state.date);
  const monthKey = formatMonthKey(date.year, date.month);
  const results = state.branches.map((branch) => simulateBranch(branch, state.strategy, date));
  const totalProfit = results.reduce((sum, result) => sum + result.report.profit, 0);

  return {
    ...state,
    date,
    cash: roundMoney(state.cash + totalProfit),
    equity: roundMoney(state.equity + totalProfit),
    branches: results.map((result) => result.branch),
    inbox: [managementReport(monthKey, results), ...state.inbox].slice(0, 24),
  };
};
