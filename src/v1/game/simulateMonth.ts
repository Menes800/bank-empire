import { COUNTRY_DEFINITIONS, FIRST_NAMES, LAST_NAMES, formatMonthKey } from './config';
import type {
  Branch,
  BranchMonthReport,
  CampaignKind,
  Employee,
  EmployeeRole,
  GameDate,
  GameState,
  InboxItem,
  LoanApplication,
  ProductId,
} from './types';

const roundMoney = (value: number) => Math.round(value / 1_000) * 1_000;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const nextDate = ({ year, month }: GameDate): GameDate =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

const employeeName = (seed: number) =>
  `${FIRST_NAMES[Math.abs(seed) % FIRST_NAMES.length]} ${LAST_NAMES[Math.abs(seed * 3) % LAST_NAMES.length]}`;

const techLevel = (state: GameState, id: GameState['technologies'][number]['id']) =>
  state.technologies.find((technology) => technology.id === id)?.level ?? 0;
const hasExecutive = (state: GameState, role: GameState['executives'][number]['role']) =>
  state.executives.some((executive) => executive.role === role && executive.hired);
const product = (state: GameState, id: ProductId) => state.products.find((item) => item.id === id);

const strategyDemand = (state: GameState) => {
  if (state.strategy === 'mortgages') return 1.18;
  if (state.strategy === 'small-business') return 0.9;
  if (state.strategy === 'service') return 1.08;
  if (state.strategy === 'digital') return 1.13;
  if (state.strategy === 'wealth') return 0.82;
  return 1;
};

const mandateDemand = (branch: Branch) => {
  if (branch.mandate === 'profit') return 0.84;
  if (branch.mandate === 'growth') return 1.24;
  if (branch.mandate === 'service') return 1.06;
  return 1;
};

const campaignLift = (state: GameState, branch: Branch, kind?: CampaignKind) =>
  state.campaigns
    .filter((campaign) => campaign.monthsRemaining > 0)
    .filter((campaign) => campaign.scope === 'global' || campaign.scope === branch.country)
    .filter((campaign) => !kind || campaign.kind === kind || campaign.kind === 'brand')
    .reduce((sum, campaign) => sum + Math.min(0.45, campaign.monthlyBudget / 1_000_000), 0);

const segmentFor = (branch: Branch, state: GameState, index: number): LoanApplication['segment'] => {
  if (branch.market === 'business' || state.strategy === 'small-business') return index % 4 === 0 ? 'mortgage' : 'business';
  if (state.strategy === 'mortgages' || branch.market === 'residential') return index % 6 === 0 ? 'personal' : 'mortgage';
  if (branch.market === 'wealth') return index % 3 === 0 ? 'business' : 'mortgage';
  return index % 5 === 0 ? 'business' : index % 4 === 0 ? 'personal' : 'mortgage';
};

const applicationFor = (
  branch: Branch,
  state: GameState,
  monthNumber: number,
  index: number,
): LoanApplication => {
  const segment = segmentFor(branch, state, index);
  const baseAmount = segment === 'business' ? 3_600_000 : segment === 'personal' ? 310_000 : 2_250_000;
  const country = COUNTRY_DEFINITIONS.find((item) => item.code === branch.country);
  const marketFactor = branch.market === 'wealth' ? 1.35 : branch.market === 'business' ? 1.18 : 1;
  const variation = 0.68 + ((monthNumber * 11 + index * 7 + branch.name.length) % 70) / 100;
  return {
    id: `${branch.id}-${monthNumber}-${index}`,
    customerName: employeeName(monthNumber + index + branch.name.length),
    amount: roundMoney(baseAmount * marketFactor * (country?.demand ?? 1) * variation),
    risk: 30 + ((monthNumber * 17 + index * 13 + branch.name.length) % 51),
    waitingMonths: 0,
    segment,
  };
};

const hireEmployee = (
  branch: Branch,
  role: EmployeeRole,
  monthNumber: number,
  seed: number,
): Employee => {
  const salary: Record<EmployeeRole, number> = {
    'branch-manager': 72_000,
    'lending-advisor': 55_000,
    'customer-advisor': 50_000,
    'business-advisor': 63_000,
    'wealth-advisor': 68_000,
    'operations-specialist': 52_000,
  };
  return {
    id: `${branch.id}-${role}-${monthNumber}-${branch.employees.length + 1}`,
    name: employeeName(seed),
    role,
    skill: 56 + (Math.abs(seed) % 19),
    morale: 78,
    monthlySalary: salary[role],
    tenureMonths: 0,
  };
};

const maybeHireLocally = (
  branch: Branch,
  queueSize: number,
  capacity: number,
  nextCustomers: number,
  monthNumber: number,
): { employees: Employee[]; actions: string[] } => {
  const manager = branch.employees.find((employee) => employee.role === 'branch-manager');
  if (!manager) return { employees: branch.employees, actions: ['Filialen mangler leder og kan ikke ansette lokalt.'] };

  const policyThreshold = branch.staffingPolicy === 'lean' ? 1.85 : branch.staffingPolicy === 'growth' ? 0.7 : 1.15;
  const maxTeam = branch.staffingPolicy === 'lean' ? 6 : branch.staffingPolicy === 'growth' ? 14 : 10;
  if (branch.employees.length >= maxTeam) return { employees: branch.employees, actions: [] };

  if (queueSize > Math.max(5, capacity * policyThreshold)) {
    const businessQueue = branch.loanQueue.filter((application) => application.segment === 'business').length;
    const role: EmployeeRole = businessQueue > queueSize * 0.4 ? 'business-advisor' : 'lending-advisor';
    const newEmployee = hireEmployee(branch, role, monthNumber, queueSize + manager.skill);
    return {
      employees: [...branch.employees, newEmployee],
      actions: [`${manager.name} ansatte ${newEmployee.name} som ${role === 'business-advisor' ? 'bedriftsrådgiver' : 'lånerådgiver'} for å ta ned køen.`],
    };
  }

  const serviceStaff = branch.employees.filter((employee) => employee.role === 'customer-advisor').length;
  const customersPerAdvisor = branch.staffingPolicy === 'growth' ? 520 : branch.staffingPolicy === 'lean' ? 1_000 : 720;
  if (nextCustomers / Math.max(1, serviceStaff) > customersPerAdvisor) {
    const newEmployee = hireEmployee(branch, 'customer-advisor', monthNumber, nextCustomers + manager.skill);
    return {
      employees: [...branch.employees, newEmployee],
      actions: [`${manager.name} ansatte ${newEmployee.name} som kunderådgiver for å bevare servicenivået.`],
    };
  }

  return { employees: branch.employees, actions: [] };
};

const approvalThreshold = (state: GameState, segment: LoanApplication['segment']) => {
  const base = state.lendingPolicy === 'cautious' ? 56 : state.lendingPolicy === 'growth' ? 74 : 66;
  const cro = hasExecutive(state, 'CRO') ? 2 : 0;
  const engine = techLevel(state, 'credit-engine');
  return base + cro + Math.floor(engine / 2) - (segment === 'business' ? 3 : 0);
};

const simulateBranch = (
  branch: Branch,
  state: GameState,
  date: GameDate,
): { branch: Branch; report: BranchMonthReport; approvedBySegment: Record<LoanApplication['segment'], number> } => {
  const monthNumber = date.year * 12 + date.month;
  const monthKey = formatMonthKey(date.year, date.month);
  const country = COUNTRY_DEFINITIONS.find((item) => item.code === branch.country);
  const competitors = state.competitors.filter((item) => item.country === branch.country);
  const competitorPressure = competitors.length
    ? competitors.reduce((sum, item) => sum + item.strength * item.aggression, 0) / competitors.length / 10_000
    : 0.22;
  const lendingStaff = branch.employees.filter((employee) =>
    ['lending-advisor', 'business-advisor', 'wealth-advisor'].includes(employee.role),
  );
  const customerStaff = branch.employees.filter((employee) => employee.role === 'customer-advisor');
  const manager = branch.employees.find((employee) => employee.role === 'branch-manager');
  const averageSkill = lendingStaff.length
    ? lendingStaff.reduce((sum, employee) => sum + employee.skill, 0) / lendingStaff.length
    : 0;

  const productDemand =
    (product(state, 'mortgage')?.enabled ? 0.24 : -0.2) +
    (product(state, 'personal-loan')?.enabled ? 0.06 : 0) +
    (product(state, 'sme-loan')?.enabled ? 0.1 : 0);
  const marketing = branch.localMarketingBudget / 180_000 + campaignLift(state, branch);
  const digital = techLevel(state, 'mobile-bank') * 0.045 + (state.strategy === 'digital' ? 0.16 : 0);
  const demandFactor =
    (country?.demand ?? 1) *
    strategyDemand(state) *
    mandateDemand(branch) *
    (1 + productDemand + marketing + digital - competitorPressure * 0.25);
  const applicationsReceived = clamp(Math.round((4 + branch.reputation / 11) * demandFactor), 3, 90);

  const newApplications = Array.from({ length: applicationsReceived }, (_, index) =>
    applicationFor(branch, state, monthNumber, index),
  );
  const agedQueue = branch.loanQueue.map((application) => ({ ...application, waitingMonths: application.waitingMonths + 1 }));
  const fullQueue = [...agedQueue, ...newApplications];

  const managerMultiplier = manager ? 0.88 + manager.skill / 430 : 0.76;
  const technologyMultiplier = 1 + techLevel(state, 'credit-engine') * 0.12 + techLevel(state, 'core-banking') * 0.04;
  const cooMultiplier = hasExecutive(state, 'COO') ? 1.1 : 1;
  const capacityPerAdvisor = 5 + averageSkill / 18;
  const processingCapacity = Math.max(0, Math.round(lendingStaff.length * capacityPerAdvisor * managerMultiplier * technologyMultiplier * cooMultiplier));
  const processed = fullQueue.slice(0, processingCapacity);
  const approved = processed.filter((application) => application.risk <= approvalThreshold(state, application.segment));
  const approvedAmount = approved.reduce((sum, application) => sum + application.amount, 0);
  const remainingQueue = fullQueue.slice(processingCapacity);

  const crmLift = techLevel(state, 'crm') * 0.7;
  const serviceLift = branch.mandate === 'service' ? 3 : branch.mandate === 'growth' ? 2 : branch.mandate === 'profit' ? -1 : 0;
  const organicCustomers = Math.max(
    0,
    Math.round(customerStaff.length * 2.1 + branch.reputation / 18 + marketing * 5 + crmLift + serviceLift),
  );
  const queueChurn = remainingQueue.length > 18 ? Math.round((remainingQueue.length - 15) / 3) : 0;
  const newCustomers = Math.max(0, approved.length + organicCustomers - queueChurn);
  const customerAttrition = Math.max(0, Math.round((66 - branch.satisfaction) / 8));
  const nextCustomers = Math.max(0, branch.customers + newCustomers - customerAttrition);

  const loanRunoff = 0.993;
  const nextLoanBook = Math.max(0, branch.loanBook * loanRunoff + approvedAmount);
  const savings = product(state, 'savings');
  const savingsAppeal = savings?.enabled ? clamp(1.05 - (savings.price - 3.2) * 0.08, 0.72, 1.35) : 0.55;
  const savingsCampaign = 1 + campaignLift(state, branch, 'savings');
  const nextDeposits = Math.max(0, branch.deposits * 0.998 + newCustomers * 74_000 * savingsAppeal * savingsCampaign);

  const mortgageMargin = product(state, 'mortgage')?.targetMargin ?? 1.7;
  const personalMargin = product(state, 'personal-loan')?.enabled ? product(state, 'personal-loan')?.targetMargin ?? 4.8 : 0;
  const businessMargin = product(state, 'sme-loan')?.enabled ? product(state, 'sme-loan')?.targetMargin ?? 2.6 : mortgageMargin;
  const mixMargin = branch.market === 'business' ? businessMargin : branch.market === 'wealth' ? (mortgageMargin + businessMargin) / 2 : mortgageMargin + personalMargin * 0.08;
  const netInterestRevenue = nextLoanBook * (mixMargin / 100) / 12;
  const depositContribution = nextDeposits * ((savings?.targetMargin ?? 0.65) / 100) / 12;
  const card = product(state, 'cards');
  const serviceRevenue = card?.enabled ? nextCustomers * Math.max(20, card.price) : nextCustomers * 8;
  const wealthRevenue = product(state, 'wealth')?.enabled && branch.market === 'wealth' ? nextDeposits * 0.00065 : 0;
  const revenue = roundMoney(netInterestRevenue + depositContribution + serviceRevenue + wealthRevenue);

  const salaryCost = branch.employees.reduce((sum, employee) => sum + employee.monthlySalary, 0);
  const riskMultiplier = state.lendingPolicy === 'cautious' ? 0.72 : state.lendingPolicy === 'growth' ? 1.38 : 1;
  const croReduction = hasExecutive(state, 'CRO') ? 0.84 : 1;
  const fraudReduction = 1 - techLevel(state, 'fraud') * 0.045;
  const creditLosses = nextLoanBook * (0.00024 + Math.max(0, 58 - branch.reputation) * 0.000006) * riskMultiplier * croReduction * fraudReduction;
  const expenses = roundMoney(salaryCost + branch.rentMonthly + branch.localMarketingBudget + creditLosses);
  const profit = revenue - expenses;

  const queueRatio = remainingQueue.length / Math.max(1, processingCapacity);
  const staffMorale = branch.employees.reduce((sum, employee) => sum + employee.morale, 0) / Math.max(1, branch.employees.length);
  const satisfactionChange =
    (queueRatio > 1.3 ? -4 : queueRatio < 0.45 ? 2 : 0) +
    (branch.mandate === 'service' ? 2 : 0) +
    (staffMorale > 80 ? 1 : staffMorale < 58 ? -2 : 0);
  const nextSatisfaction = clamp(branch.satisfaction + satisfactionChange, 35, 96);
  const nextReputation = clamp(
    branch.reputation + (nextSatisfaction > 80 ? 1 : nextSatisfaction < 58 ? -2 : 0) + (profit > 0 ? 1 : 0),
    20,
    96,
  );

  const hireResult = maybeHireLocally(branch, remainingQueue.length, processingCapacity, nextCustomers, monthNumber);
  const managerActions = [...hireResult.actions];
  if (remainingQueue.length === 0 && fullQueue.length > 0) managerActions.push('Teamet behandlet hele lånekøen denne måneden.');
  if (profit > 0 && (branch.reports.at(-1)?.profit ?? -1) <= 0) managerActions.push('Filialen gikk over i månedlig overskudd.');
  if (remainingQueue.length > 20 && branch.staffingPolicy === 'lean') managerActions.push('Den stramme bemanningsrammen gir nå merkbar ventetid.');

  const nextEmployees = hireResult.employees.map((employee) => ({
    ...employee,
    tenureMonths: employee.tenureMonths + 1,
    morale: clamp(employee.morale + (queueRatio > 1.4 ? -3 : queueRatio < 0.45 ? 1 : 0) + (hasExecutive(state, 'CHRO') ? 1 : 0), 35, 96),
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
    satisfaction: nextSatisfaction,
    managerActions,
  };

  const approvedBySegment = approved.reduce<Record<LoanApplication['segment'], number>>(
    (acc, application) => ({ ...acc, [application.segment]: acc[application.segment] + 1 }),
    { mortgage: 0, personal: 0, business: 0 },
  );

  return {
    branch: {
      ...branch,
      reputation: nextReputation,
      satisfaction: nextSatisfaction,
      customers: nextCustomers,
      deposits: roundMoney(nextDeposits),
      loanBook: roundMoney(nextLoanBook),
      employees: nextEmployees,
      loanQueue: remainingQueue,
      reports: [...branch.reports.slice(-23), report],
    },
    report,
    approvedBySegment,
  };
};

const updateObjectives = (state: GameState, monthlyProfit: number) => {
  const profitableBranches = state.branches.filter((branch) => (branch.reports.at(-1)?.profit ?? 0) > 0).length;
  const customers = state.branches.reduce((sum, branch) => sum + branch.customers, 0);
  const countries = new Set(state.branches.map((branch) => branch.country)).size;
  let rewards = 0;
  const objectives = state.objectives.map((objective) => {
    const progress = objective.id === 'profit' ? (monthlyProfit > 0 ? 1 : 0)
      : objective.id === 'network' ? profitableBranches
      : objective.id === 'international' ? countries
      : objective.id === 'scale' ? customers
      : objective.progress;
    const completed = objective.completed || progress >= objective.target;
    if (completed && !objective.completed) rewards += objective.reward;
    return { ...objective, progress, completed };
  });
  return { objectives, rewards };
};

const managementReport = (
  state: GameState,
  monthKey: string,
  results: Array<ReturnType<typeof simulateBranch>>,
  monthlyProfit: number,
): InboxItem => {
  const totalApproved = results.reduce((sum, result) => sum + result.report.loansApproved, 0);
  const totalQueue = results.reduce((sum, result) => sum + result.report.queueEnd, 0);
  const localActions = results.flatMap((result) => result.report.managerActions).slice(0, 4);
  const actionSentence = localActions.length
    ? ` Lederne håndterte lokalt: ${localActions.join(' ')}`
    : ' Ingen vanlige driftssaker krevde din godkjenning.';
  const countries = new Set(state.branches.map((branch) => branch.country)).size;
  return {
    id: `management-${monthKey}`,
    monthKey,
    kind: totalQueue > 35 || monthlyProfit < -1_000_000 ? 'warning' : 'report',
    title: `Konsernrapport – ${monthKey}`,
    body: `Banken driver ${state.branches.length} filialer i ${countries} land, behandlet ${totalApproved} lån og leverte ${monthlyProfit >= 0 ? 'overskudd' : 'underskudd'} på ${Math.abs(monthlyProfit).toLocaleString('nb-NO')} kr. Samlet kø er ${totalQueue}.${actionSentence}`,
    read: false,
  };
};

export const simulateNextMonth = (state: GameState): GameState => {
  const date = nextDate(state.date);
  const monthKey = formatMonthKey(date.year, date.month);
  const results = state.branches.map((branch) => simulateBranch(branch, state, date));
  const branches = results.map((result) => result.branch);
  const branchRevenue = results.reduce((sum, result) => sum + result.report.revenue, 0);
  const branchExpenses = results.reduce((sum, result) => sum + result.report.expenses, 0);
  const executiveCost = state.executives.filter((executive) => executive.hired).reduce((sum, executive) => sum + executive.monthlySalary, 0);
  const campaignCost = state.campaigns.reduce((sum, campaign) => sum + campaign.monthlyBudget, 0);
  const technologyCost = state.technologies.reduce((sum, technology) => sum + technology.level * 22_000, 0);
  const internationalCost = Math.max(0, new Set(branches.map((branch) => branch.country)).size - 1) * 180_000;
  const cfoReduction = hasExecutive(state, 'CFO') ? 0.9 : 1;
  const hqExpenses = roundMoney((executiveCost + campaignCost + technologyCost + internationalCost) * cfoReduction);
  const revenue = branchRevenue;
  const expenses = branchExpenses + hqExpenses;
  const monthlyProfit = revenue - expenses;
  const customers = branches.reduce((sum, branch) => sum + branch.customers, 0);
  const loanBook = branches.reduce((sum, branch) => sum + branch.loanBook, 0);
  const deposits = branches.reduce((sum, branch) => sum + branch.deposits, 0);
  const equityBeforeRewards = roundMoney(state.equity + monthlyProfit);
  const capitalRatio = clamp((equityBeforeRewards / Math.max(1, loanBook)) * 100, 3, 40);

  const countries = state.countries.map((country) => {
    const definition = COUNTRY_DEFINITIONS.find((item) => item.code === country.code);
    const unlocked = country.unlocked || Boolean(definition && equityBeforeRewards >= definition.requiredEquity && state.reputation >= definition.requiredReputation);
    const entered = branches.some((branch) => branch.country === country.code);
    const localCampaign = state.campaigns.filter((campaign) => campaign.scope === country.code || campaign.scope === 'global').reduce((sum, campaign) => sum + campaign.monthlyBudget, 0);
    return {
      ...country,
      unlocked,
      entered,
      awareness: clamp(country.awareness + (entered ? 1 : 0) + Math.round(localCampaign / 1_000_000), 0, 95),
      regulatoryStanding: clamp(country.regulatoryStanding + (capitalRatio > 10 ? 1 : -1) + (hasExecutive(state, 'CRO') ? 1 : 0), 25, 96),
    };
  });

  const campaigns = state.campaigns
    .map((campaign) => ({ ...campaign, monthsRemaining: campaign.monthsRemaining - 1 }))
    .filter((campaign) => campaign.monthsRemaining > 0);
  const competitors = state.competitors.map((competitor, index) => ({
    ...competitor,
    aggression: clamp(competitor.aggression + (((date.month + index) % 4) - 1), 30, 92),
    strength: clamp(competitor.strength + (date.month % 6 === index % 6 ? 1 : 0), 35, 95),
  }));

  const products = state.products.map((item) => {
    const added = item.id === 'mortgage' ? results.reduce((sum, result) => sum + result.approvedBySegment.mortgage, 0)
      : item.id === 'personal-loan' ? results.reduce((sum, result) => sum + result.approvedBySegment.personal, 0)
      : item.id === 'sme-loan' ? results.reduce((sum, result) => sum + result.approvedBySegment.business, 0)
      : item.id === 'savings' ? Math.round(results.reduce((sum, result) => sum + result.report.newCustomers, 0) * 0.75)
      : item.id === 'cards' ? Math.round(results.reduce((sum, result) => sum + result.report.newCustomers, 0) * 0.82)
      : item.id === 'wealth' ? Math.round(branches.filter((branch) => branch.market === 'wealth').reduce((sum, branch) => sum + (branch.reports.at(-1)?.newCustomers ?? 0), 0) * 0.25)
      : 0;
    return { ...item, customers: item.enabled ? item.customers + added : item.customers };
  });

  const provisional: GameState = {
    ...state,
    date,
    branches,
    products,
    campaigns,
    competitors,
    countries,
    equity: equityBeforeRewards,
    cash: roundMoney(state.cash + monthlyProfit),
    reputation: clamp(state.reputation + (monthlyProfit > 0 ? 1 : monthlyProfit < -1_000_000 ? -2 : 0), 25, 95),
    history: [...state.history.slice(-35), {
      monthKey,
      revenue,
      expenses,
      profit: monthlyProfit,
      customers,
      branches: branches.length,
      countries: new Set(branches.map((branch) => branch.country)).size,
      loanBook,
      deposits,
      capitalRatio,
    }],
  };

  const objectiveUpdate = updateObjectives(provisional, monthlyProfit);
  const milestoneItems = objectiveUpdate.objectives
    .filter((objective, index) => objective.completed && !state.objectives[index]?.completed)
    .map<InboxItem>((objective) => ({
      id: `objective-${objective.id}-${monthKey}`,
      monthKey,
      kind: 'milestone',
      title: `Mål fullført: ${objective.title}`,
      body: `${objective.description} Styret frigjør ${objective.reward.toLocaleString('nb-NO')} kr i vekstkapital.`,
      read: false,
    }));

  return {
    ...provisional,
    cash: roundMoney(provisional.cash + objectiveUpdate.rewards),
    equity: roundMoney(provisional.equity + objectiveUpdate.rewards),
    objectives: objectiveUpdate.objectives,
    inbox: [
      ...milestoneItems,
      managementReport(provisional, monthKey, results, monthlyProfit),
      ...state.inbox,
    ].slice(0, 60),
  };
};
