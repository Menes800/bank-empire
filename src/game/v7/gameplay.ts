import { chooseDecisionV5 } from "../v5/gameplay";
import { advanceDaysV6 } from "../v6/gameplay";
import type {
  ActiveLoan,
  BankProject,
  BranchOffice,
  BranchProfile,
  CEOInboxTask,
  CollectionCase,
  CompetitorMove,
  ExecutiveRole,
  GameState,
} from "../types";
import { addEvent, clamp, createEvent, round, seededValue } from "../utils";

export type BranchFundingMode = "cash" | "financed";
export type CollectionAction = "reminder" | "payment-plan" | "external-collections" | "enforce-collateral" | "write-off";

const stageOrder = ["startup", "regional", "national", "group", "empire"] as const;
const nonPerformingStatuses = new Set(["overdue", "collections", "defaulted", "delinquent"]);

function taskExists(state: GameState, sourceId: string, category: CEOInboxTask["category"]) {
  return state.ceoInbox.some((task) => task.sourceId === sourceId && task.category === category && task.status === "open");
}

function pushTask(state: GameState, task: CEOInboxTask): GameState {
  if (task.sourceId && taskExists(state, task.sourceId, task.category)) return state;
  return { ...state, ceoInbox: [task, ...state.ceoInbox].slice(0, 30) };
}

function convertRoutineDecisionToInbox(state: GameState): GameState {
  const decision = state.pendingDecision;
  if (!decision || decision.id.startsWith("v5-")) return state;
  const ownerRole: ExecutiveRole = decision.category === "people" || decision.category === "customer" ? "COO" : decision.category === "market" ? "CMO" : decision.category === "technology" ? "CTO" : "CRO";
  const page = decision.category === "people" ? "leadership" : decision.category === "customer" ? "clients" : decision.category === "market" ? "market" : decision.category === "technology" ? "network" : "risk";
  const task: CEOInboxTask = {
    id: `inbox-decision-${decision.id}-${state.day}`,
    createdDay: state.day,
    category: decision.category === "customer" ? "credit" : decision.category === "market" ? "market" : decision.category === "technology" ? "project" : decision.category === "people" ? "people" : "risk",
    title: decision.title,
    summary: decision.description,
    urgency: decision.category === "regulatory" ? "critical" : "important",
    page,
    status: "open",
    ownerRole,
    sourceId: decision.id,
    decision,
  };
  return pushTask({ ...state, pendingDecision: null }, task);
}

function demandForProfile(branch: BranchOffice, district: GameState["districts"][number]) {
  if (branch.profile === "mortgage") return district.mortgageDemand;
  if (branch.profile === "business") return district.businessDemand;
  if (branch.profile === "wealth") return district.wealthDemand;
  return district.retailDemand;
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
  const localCoverage = clamp(localCustomers / Math.max(1, state.customers), .2, 1);
  const depositPool = state.deposits * clamp(.42 + localCoverage * .35, .45, .78);
  const loanPool = state.loans * clamp(.38 + localCoverage * .34, .42, .72);
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

export function getBranchEconomicsV7(state: GameState, branch: BranchOffice) {
  const employees = state.employeeRoster.filter((employee) => employee.assignedBranchId === branch.id || employee.id === branch.managerId);
  const unnamedEmployees = Math.max(0, state.employees - state.employeeRoster.length);
  const totalBranchSlots = state.branchOffices.reduce((sum, office) => sum + office.staffSlots, 0);
  const allocatedUnnamedEmployees = unnamedEmployees * branch.staffSlots / Math.max(1, totalBranchSlots);
  const operationsEfficiency = state.background === "Operations" ? .9 : 1;
  const annualPayroll = (employees.reduce((sum, employee) => sum + employee.salary, 0) + allocatedUnnamedEmployees * 52_000) * operationsEfficiency;
  const payroll = round(annualPayroll / 12);
  const priority = branch.operatingPriority ?? "balanced";
  const requestedMarketing = branch.managerBudget ?? 0;
  const marketingCap = priority === "profitability" ? 10_000 : priority === "balanced" ? 25_000 : priority === "deposits" || priority === "business" ? 35_000 : 60_000;
  const marketing = Math.min(requestedMarketing, marketingCap);
  const operations = 6_000 + branch.level * 2_500 + employees.length * 600;
  const rent = round(branch.monthlyRent);
  const cost = round(rent + payroll + marketing + operations);
  const customers = branch.localCustomers ?? Math.min(branch.capacity, 220 + branch.level * 85);
  const deposits = branch.localDeposits ?? 0;
  const loans = branch.localLoans ?? 0;
  const relationshipIncome = branch.profile === "wealth" ? 560 : branch.profile === "business" ? 455 : branch.profile === "mortgage" ? 385 : 310;
  const productBreadth = 1 + Math.max(0, state.products.length - 1) * .065;
  const serviceFactor = .72 + branch.satisfaction / 220;
  const feeIncome = customers * relationshipIncome * productBreadth * serviceFactor;
  const depositMargin = deposits * Math.max(.55, state.baseRate - state.depositRate + 1.25) / 100 / 12;
  const lendingMargin = loans * Math.max(1.25, state.loanRate - state.baseRate) / 100 / 12;
  const revenue = round(feeIncome + depositMargin + lendingMargin);
  const profit = round(revenue - cost);
  return { employees, annualPayroll, payroll, rent, marketing, operations, cost, revenue, profit, customers, deposits, loans };
}

export function getBranchUpgradeEconomicsV7(state: GameState, branch: BranchOffice) {
  const current = getBranchEconomicsV7(state, branch);
  const cost = branch.level === 1 ? 1_150_000 : branch.level === 2 ? 2_100_000 : 0;
  const capacityGain = branch.level < 3 ? round(branch.capacity * 0.45) : 0;
  const capacityUse = current.customers / Math.max(1, branch.capacity) * 100;
  const demandUnlock = clamp((capacityUse - 72) / 28, 0, 1);
  const expectedNewCustomers = round(capacityGain * demandUnlock * 0.9);
  const revenuePerCustomer = current.revenue / Math.max(1, current.customers);
  const monthlyRevenueGain = branch.level < 3 ? round(expectedNewCustomers * revenuePerCustomer + current.revenue * 0.025) : 0;
  const operationsEfficiency = state.background === "Operations" ? 0.9 : 1;
  const monthlyCostGain = branch.level < 3 ? round(3 * 52_000 / 12 * operationsEfficiency + branch.monthlyRent * 0.06 + 5_000) : 0;
  const monthlyProfitGain = monthlyRevenueGain - monthlyCostGain;
  const paybackMonths = monthlyProfitGain > 0 ? cost / monthlyProfitGain : null;
  const viable = branch.level < 3 && capacityUse >= 75 && monthlyProfitGain > 0;
  return { cost, capacityGain, capacityUse, expectedNewCustomers, monthlyRevenueGain, monthlyCostGain, monthlyProfitGain, paybackMonths, viable };
}

function runBranchAccounting(state: GameState): GameState {
  const balanced = syncBranchBalanceSheet(state);
  let totalBranchProfit = 0;
  const branchOffices = balanced.branchOffices.map((branch) => {
    const district = balanced.districts.find((item) => item.id === branch.districtId);
    if (!district) return branch;
    const manager = balanced.employeeRoster.find((employee) => employee.id === branch.managerId);
    const managerQuality = manager ? clamp((manager.skill + manager.leadership + manager.loyalty * .3) / 215, .55, 1.28) : .72;
    const mandate = branch.managerMandate ?? "manual";
    const mandateEffect = mandate === "growth" ? 1.15 : mandate === "autonomous" ? 1.08 : mandate === "guarded" ? 1.03 : .98;
    const profileDemand = demandForProfile(branch, district);
    const targetCustomers = Math.min(branch.capacity, round((district.population * .006 + profileDemand * 3.1) * managerQuality * mandateEffect * (1 - district.competition / 190)));
    const previousCustomers = branch.localCustomers ?? Math.min(branch.capacity, Math.max(120, round(targetCustomers * .78)));
    const localCustomers = clamp(round(previousCustomers * .72 + targetCustomers * .28), 20, branch.capacity);
    const updated = { ...branch, localCustomers };
    const economics = getBranchEconomicsV7(balanced, updated);
    totalBranchProfit += economics.profit;
    const lastManagerAction = manager && mandate !== "manual"
      ? `${manager.name} ran the ${branch.localFocus ?? "service"} mandate with ${mandate} authority.`
      : manager ? `${manager.name} reported results but waited for approval.` : "No branch manager is accountable for local performance.";
    return {
      ...updated,
      managerBudget: economics.marketing,
      lastMonthRevenue: economics.revenue,
      lastMonthCost: economics.cost,
      lastMonthProfit: economics.profit,
      lifetimeProfit: (branch.lifetimeProfit ?? 0) + economics.profit,
      lastManagerAction,
    };
  });
  const total = round(totalBranchProfit);
  return addEvent(
    { ...balanced, branchOffices },
    createEvent(state.day, total >= 0 ? "positive" : "warning", "Branch economics reconciled", `${branchOffices.length} locations reported a combined local result of ${total >= 0 ? "+" : "−"}${state.currency} ${Math.abs(round(total / 1000))}k. The consolidated group ledger already includes ordinary operations, so cash was not charged or credited a second time.`),
  );
}

function collectionCaseForLoan(state: GameState, loan: ActiveLoan): CollectionCase {
  const existing = state.collectionCases.find((item) => item.loanId === loan.id && !item.closed);
  const monthlyPayment = loan.principal / 120 + loan.outstanding * loan.rate / 100 / 12;
  const expectedRecovery = round(loan.outstanding * clamp(loan.collateral / 100 * .78 + .08, .18, .92));
  const stage: CollectionCase["stage"] = loan.status === "collections" ? "external-collections" : loan.status === "defaulted" ? "enforcement" : loan.daysPastDue >= 60 ? "workout" : "early-arrears";
  return {
    id: existing?.id ?? `collection-${loan.id}-${state.day}`,
    loanId: loan.id,
    customerName: loan.customerName,
    openedDay: existing?.openedDay ?? state.day,
    stage,
    daysPastDue: loan.daysPastDue,
    missedAmount: round(monthlyPayment * Math.max(1, loan.missedPayments ?? 1)),
    expectedRecovery,
    agencyCost: existing?.agencyCost ?? 0,
    assignedTo: existing?.assignedTo ?? "Credit operations",
    lastAction: existing?.lastAction ?? "Case opened for review",
    closed: false,
  };
}

function runLoanPerformanceCycle(state: GameState): GameState {
  let cashAdjustment = 0;
  let newlyTroubled = 0;
  const cycle = Math.floor(state.day / 30);
  const activeLoans = state.activeLoans.map((loan) => {
    if (loan.status === "written-off" || loan.outstanding <= 0) return loan;
    const macro = state.economicCycle === "recession" ? 1.8 : state.economicCycle === "slowdown" ? 1.35 : state.economicCycle === "boom" ? .7 : 1;
    const risk = { A: .018, B: .045, C: .095, D: .18 }[loan.riskGrade] * macro;
    const roll = seededValue(`${state.worldSeed}-${loan.id}-${cycle}-loan-performance`);
    const monthlyPayment = loan.principal / 120 + loan.outstanding * loan.rate / 100 / 12;
    let status = loan.status;
    let daysPastDue = loan.daysPastDue;
    let missedPayments = loan.missedPayments ?? 0;
    let nextPaymentDay = loan.nextPaymentDay;

    if (status === "watch") status = "late";
    if (status === "delinquent") status = daysPastDue >= 60 ? "overdue" : "late";

    if (status === "performing" || status === "restructured") {
      if (roll < risk) {
        status = "late";
        daysPastDue = 30;
        missedPayments += 1;
        cashAdjustment -= monthlyPayment;
        newlyTroubled += 1;
      }
    } else if (status === "late") {
      if (roll > .56) {
        status = "performing";
        daysPastDue = 0;
        missedPayments = 0;
      } else {
        status = "overdue";
        daysPastDue = Math.max(60, daysPastDue + 30);
        missedPayments += 1;
        cashAdjustment -= monthlyPayment;
      }
    } else if (status === "overdue") {
      if (roll > .72) {
        status = "restructured";
        daysPastDue = 0;
        nextPaymentDay = state.day + 30;
      } else {
        status = "collections";
        daysPastDue = Math.max(90, daysPastDue + 30);
        missedPayments += 1;
        nextPaymentDay = state.day + 9_999;
      }
    } else if (status === "collections" && daysPastDue < 150) {
      daysPastDue += 30;
    } else if (status === "collections") {
      status = "defaulted";
      daysPastDue += 30;
    }

    return { ...loan, status, daysPastDue, missedPayments, nextPaymentDay, recoveryEstimate: round(loan.outstanding * clamp(loan.collateral / 100 * .78 + .08, .18, .92)) };
  });

  const troubled = activeLoans.filter((loan) => nonPerformingStatuses.has(loan.status) || loan.status === "late");
  const collectionCases = [
    ...troubled.map((loan) => collectionCaseForLoan({ ...state, activeLoans }, loan)),
    ...state.collectionCases.filter((item) => item.closed || !troubled.some((loan) => loan.id === item.loanId)),
  ].slice(0, 50);
  const nonPerformingBalance = activeLoans.filter((loan) => nonPerformingStatuses.has(loan.status)).reduce((sum, loan) => sum + loan.outstanding, 0);
  let next: GameState = {
    ...state,
    activeLoans,
    collectionCases,
    cash: Math.max(0, state.cash + cashAdjustment),
    nplRatio: state.loans > 0 ? clamp(nonPerformingBalance / state.loans * 100, 0, 100) : 0,
  };
  if (newlyTroubled > 0) next = addEvent(next, createEvent(state.day, "warning", "Payments missed", `${newlyTroubled} large relationship${newlyTroubled === 1 ? " has" : "s have"} entered arrears and now requires collections follow-up.`));
  return next;
}

function runCollectionsAutomation(state: GameState): GameState {
  const cro = state.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  if (!cro || state.automation.lending === "manual") return state;
  let next = state;
  const openCases = state.collectionCases.filter((item) => !item.closed).slice(0, 3);
  for (const collectionCase of openCases) {
    const loan = next.activeLoans.find((item) => item.id === collectionCase.loanId);
    if (!loan) continue;
    const action: CollectionAction = loan.status === "defaulted" ? "enforce-collateral" : loan.daysPastDue >= 90 ? "external-collections" : state.automation.lending === "conservative" ? "payment-plan" : "reminder";
    next = takeCollectionAction(next, loan.id, action, true);
  }
  return next;
}

function runCompetitorCycle(state: GameState): GameState {
  if (state.competitors.length === 0) return state;
  const cycle = Math.floor(state.day / 30);
  const competitor = state.competitors[cycle % state.competitors.length];
  const moveIndex = Math.floor(seededValue(`${state.worldSeed}-${competitor.id}-${cycle}-competitor-move`) * 4);
  const type: CompetitorMove["type"] = ["pricing", "branch", "digital", "talent"][moveIndex] as CompetitorMove["type"];
  let description = "";
  let impact = 0;
  const competitors = state.competitors.map((item) => {
    if (item.id !== competitor.id) return item;
    if (type === "pricing") {
      description = `${item.name} raised its deposit rate and is targeting price-sensitive savers.`;
      impact = 7;
      return { ...item, depositRate: item.depositRate + .18, customers: item.customers + 90, deposits: item.deposits + 1_100_000 };
    }
    if (type === "branch") {
      description = `${item.name} opened another location and increased local coverage.`;
      impact = 9;
      return { ...item, branches: item.branches + 1, customers: item.customers + 130, marketShare: item.marketShare + .12 };
    }
    if (type === "digital") {
      description = `${item.name} released a digital-service upgrade aimed at younger customers.`;
      impact = 6;
      return { ...item, digitalLevel: clamp(item.digitalLevel + 4, 1, 100), reputation: clamp(item.reputation + 1, 1, 100) };
    }
    description = `${item.name} is recruiting experienced branch and risk employees from the market.`;
    impact = 5;
    return { ...item, reputation: clamp(item.reputation + .5, 1, 100) };
  });
  const move: CompetitorMove = { id: `move-${competitor.id}-${state.day}`, day: state.day, competitorId: competitor.id, competitorName: competitor.name, type, title: `${competitor.name}: ${type} move`, description, impact };
  const task: CEOInboxTask = { id: `inbox-${move.id}`, createdDay: state.day, category: "market", title: move.title, summary: description, urgency: impact >= 8 ? "important" : "routine", page: "market", status: "open", ownerRole: "CMO", sourceId: move.id };
  return pushTask({ ...state, competitors, competitorMoves: [move, ...state.competitorMoves].slice(0, 24), customers: Math.max(0, state.customers - Math.ceil(impact / 2)), customersLost: state.customersLost + Math.ceil(impact / 2), marketShare: Math.max(.05, state.marketShare - impact * .006) }, task);
}

function generateOperationsInbox(state: GameState): GameState {
  let next = state;
  for (const branch of state.branchOffices) {
    const capacityUse = (branch.localCustomers ?? 0) / Math.max(1, branch.capacity) * 100;
    if (!branch.managerId) {
      next = pushTask(next, { id: `inbox-manager-${branch.id}-${state.day}`, createdDay: state.day, category: "network", title: `${branch.name} has no accountable manager`, summary: "Appoint a qualified manager before granting local authority.", urgency: "important", page: "network", status: "open", ownerRole: "COO", sourceId: `manager-${branch.id}` });
    } else if (capacityUse > 92) {
      next = pushTask(next, { id: `inbox-capacity-${branch.id}-${state.day}`, createdDay: state.day, category: "network", title: `${branch.name} is above safe capacity`, summary: `${capacityUse.toFixed(0)}% of service capacity is in use. Delegate a service mandate or approve an upgrade.`, urgency: "important", page: "network", status: "open", ownerRole: "COO", sourceId: `capacity-${branch.id}` });
    } else if ((branch.lastMonthProfit ?? 0) < 0) {
      next = pushTask(next, { id: `inbox-profit-${branch.id}-${state.day}`, createdDay: state.day, category: "network", title: `${branch.name} is loss-making`, summary: `The latest local result was -$${Math.abs(round((branch.lastMonthProfit ?? 0) / 1000))}k. Review product focus, staffing and manager authority.`, urgency: "important", page: "network", status: "open", ownerRole: "COO", sourceId: `profit-${branch.id}` });
    }
  }
  for (const collectionCase of state.collectionCases.filter((item) => !item.closed)) {
    next = pushTask(next, { id: `inbox-collection-${collectionCase.id}`, createdDay: state.day, category: "credit", title: `${collectionCase.customerName} is ${collectionCase.daysPastDue} days past due`, summary: `Expected recovery is $${round(collectionCase.expectedRecovery / 1000)}k. Choose a workout, external collections or enforcement strategy.`, urgency: collectionCase.daysPastDue >= 90 ? "critical" : "important", page: "clients", status: "open", ownerRole: "CRO", sourceId: collectionCase.id });
  }
  if (state.liquidityRatio < 18) next = pushTask(next, { id: `inbox-liquidity-${state.day}`, createdDay: state.day, category: "risk", title: "Liquidity requires a treasury decision", summary: `Liquidity is ${state.liquidityRatio.toFixed(1)}%. Slow lending, raise deposits or secure funding.`, urgency: state.liquidityRatio < 10 ? "critical" : "important", page: "risk", status: "open", ownerRole: "CFO", sourceId: "liquidity" });
  for (const project of state.projects.filter((item) => item.status === "delayed")) next = pushTask(next, { id: `inbox-project-${project.id}-${state.day}`, createdDay: state.day, category: "project", title: `${project.name} is delayed`, summary: "Management needs to recover the delivery plan or accept a later opening date.", urgency: "important", page: "network", status: "open", ownerRole: project.kind === "mobile-bank" || project.kind === "core-banking" ? "CTO" : "COO", sourceId: project.id });
  return next;
}

function amendLatestCashFlow(before: GameState, after: GameState): GameState {
  const delta = after.cash - before.cash;
  const history = after.cashFlowHistory.map((row, index) => index === after.cashFlowHistory.length - 1 && row.day === after.day ? { ...row, otherMovements: row.otherMovements + (after.cash - row.closingCash), closingCash: after.cash } : row);
  return delta === 0 ? after : { ...after, cashFlowHistory: history };
}

export function advanceDaysV7(state: GameState, days: number): GameState {
  let current = state;
  for (let index = 0; index < days; index += 1) {
    if (current.gameOverReason || current.pendingDecision?.id.startsWith("v5-")) break;
    const before = current;
    let next = advanceDaysV6(current, 1);
    if (next.day === before.day) break;
    next = convertRoutineDecisionToInbox(next);
    if (next.day % 30 === 0) {
      next = runBranchAccounting(next);
      next = runLoanPerformanceCycle(next);
      next = runCollectionsAutomation(next);
      next = runCompetitorCycle(next);
      next = generateOperationsInbox(next);
    }
    current = amendLatestCashFlow(before, next);
  }
  return current;
}

export function getBranchOpeningAssessment(state: GameState, districtId: string) {
  const district = state.districts.find((item) => item.id === districtId);
  if (!district) return { allowed: false, cashAllowed: false, financeAllowed: false, reasons: ["Market not found"], upfront: 0, financedAmount: 0 };
  const reasons: string[] = [];
  const stageAllowed = stageOrder.indexOf(state.campaignStage) >= stageOrder.indexOf(district.requiredStage);
  if (!stageAllowed) reasons.push(`Reach ${district.requiredStage} stage`);
  if (state.branchOffices.some((branch) => branch.districtId === districtId)) reasons.push("A branch already operates here");
  if (state.projects.some((project) => project.districtId === districtId && project.status !== "completed")) reasons.push("An expansion project is already active here");
  const upfront = round(district.openingCost * .3);
  const financedAmount = district.openingCost - upfront;
  const cashAllowed = stageAllowed && reasons.length === 0 && state.cash >= district.openingCost;
  const financeAllowed = stageAllowed && reasons.length === 0 && state.cash >= upfront && state.boardConfidence >= 45 && state.liquidityRatio >= 12;
  if (state.cash < upfront) reasons.push(`Need at least $${round(upfront / 1000)}k liquid cash`);
  if (state.boardConfidence < 45) reasons.push("Board confidence must be at least 45");
  if (state.liquidityRatio < 12) reasons.push("Liquidity must be at least 12%");
  return { allowed: cashAllowed || financeAllowed, cashAllowed, financeAllowed, reasons, upfront, financedAmount };
}

export function startBranchProjectV7(state: GameState, districtId: string, profile: BranchProfile, fundingMode: BranchFundingMode): GameState {
  const district = state.districts.find((item) => item.id === districtId);
  const assessment = getBranchOpeningAssessment(state, districtId);
  if (!district || !assessment.allowed) return state;
  if (fundingMode === "cash" && !assessment.cashAllowed) return state;
  if (fundingMode === "financed" && !assessment.financeAllowed) return state;
  const duration = 62 + round(district.competition * .28);
  const cashCost = fundingMode === "cash" ? district.openingCost : assessment.upfront;
  const funding = fundingMode === "financed" ? assessment.financedAmount : 0;
  const project: BankProject = { id: `project-branch-${districtId}-${state.day}`, name: `Open ${district.name}`, kind: "branch", status: "active", startDay: state.day, durationDays: duration, remainingDays: duration, budget: district.openingCost, spent: 0, risk: 18 + district.competition * .3, districtId, profile };
  const next = {
    ...state,
    cash: state.cash - cashCost,
    wholesaleFunding: state.wholesaleFunding + funding,
    wholesaleFundingRate: funding > 0 ? state.wholesaleFundingRate + .04 : state.wholesaleFundingRate,
    projects: [project, ...state.projects],
  };
  return addEvent(next, createEvent(state.day, "neutral", "Branch expansion approved", fundingMode === "financed" ? `${district.name} enters delivery with $${round(assessment.upfront / 1000)}k equity and $${round(assessment.financedAmount / 1000)}k project funding.` : `${district.name} enters delivery and is fully funded from liquid cash.`));
}

export function takeCollectionAction(state: GameState, loanId: string, action: CollectionAction, automated = false): GameState {
  const loan = state.activeLoans.find((item) => item.id === loanId);
  if (!loan || loan.status === "written-off") return state;
  const collectionCase = state.collectionCases.find((item) => item.loanId === loanId && !item.closed) ?? collectionCaseForLoan(state, loan);
  let next = state;
  let updatedLoan = loan;
  let updatedCase = collectionCase;
  let eventTitle = "Collections action completed";
  let eventBody = "";

  if (action === "reminder") {
    const cost = 1_200;
    updatedLoan = { ...loan, status: loan.daysPastDue >= 60 ? "overdue" : "late", nextPaymentDay: state.day + 14 };
    updatedCase = { ...collectionCase, stage: "early-arrears", agencyCost: collectionCase.agencyCost + cost, lastAction: "Formal reminder and customer contact", assignedTo: automated ? "CRO mandate" : "Credit operations" };
    next = { ...next, cash: Math.max(0, next.cash - cost) };
    eventBody = `${loan.customerName} received a formal reminder. A response is expected within 14 days.`;
  } else if (action === "payment-plan") {
    const cost = 4_500;
    updatedLoan = { ...loan, status: "restructured", daysPastDue: 0, missedPayments: 0, rate: Math.max(.5, loan.rate - .15), nextPaymentDay: state.day + 30 };
    updatedCase = { ...collectionCase, stage: "workout", agencyCost: collectionCase.agencyCost + cost, lastAction: "Payment plan agreed", assignedTo: automated ? "CRO mandate" : "Workout team", closed: true };
    next = { ...next, cash: Math.max(0, next.cash - cost), reputation: clamp(next.reputation + .15, 1, 100) };
    eventBody = `${loan.customerName} accepted a structured payment plan and returned to monitored servicing.`;
  } else if (action === "external-collections") {
    const cost = 12_000;
    updatedLoan = { ...loan, status: "collections", daysPastDue: Math.max(90, loan.daysPastDue), nextPaymentDay: state.day + 9_999 };
    updatedCase = { ...collectionCase, stage: "external-collections", agencyCost: collectionCase.agencyCost + cost, lastAction: "Transferred to external collections", assignedTo: "External recovery agency" };
    next = { ...next, cash: Math.max(0, next.cash - cost) };
    eventBody = `${loan.customerName} was transferred to external collections. Recovery is uncertain and agency costs now apply.`;
  } else if (action === "enforce-collateral") {
    const recovery = round(loan.outstanding * clamp(loan.collateral / 100 * .78, .12, .88));
    const loss = Math.max(0, loan.outstanding - recovery);
    updatedLoan = { ...loan, status: "written-off", outstanding: 0, recoveryEstimate: recovery, nextPaymentDay: state.day + 9_999 };
    updatedCase = { ...collectionCase, stage: "closed", lastAction: "Collateral enforced", assignedTo: "Recovery and legal", expectedRecovery: recovery, closed: true };
    next = { ...next, cash: next.cash + recovery, loans: Math.max(0, next.loans - loan.outstanding), creditLosses: next.creditLosses + loss, loanLossReserve: Math.max(0, next.loanLossReserve - Math.min(next.loanLossReserve, loss)) };
    eventTitle = "Collateral enforced";
    eventBody = `${loan.customerName} produced $${round(recovery / 1000)}k recovery and $${round(loss / 1000)}k credit loss.`;
  } else {
    const loss = loan.outstanding;
    updatedLoan = { ...loan, status: "written-off", outstanding: 0, recoveryEstimate: 0, nextPaymentDay: state.day + 9_999 };
    updatedCase = { ...collectionCase, stage: "closed", lastAction: "Balance written off", assignedTo: "Finance", expectedRecovery: 0, closed: true };
    next = { ...next, loans: Math.max(0, next.loans - loss), creditLosses: next.creditLosses + loss, loanLossReserve: Math.max(0, next.loanLossReserve - Math.min(next.loanLossReserve, loss)) };
    eventTitle = "Loan written off";
    eventBody = `${loan.customerName} was written off with a final loss of $${round(loss / 1000)}k.`;
  }

  next = {
    ...next,
    activeLoans: next.activeLoans.map((item) => item.id === loanId ? updatedLoan : item),
    collectionCases: [updatedCase, ...next.collectionCases.filter((item) => item.id !== updatedCase.id)].slice(0, 50),
    ceoInbox: next.ceoInbox.map((task) => task.sourceId === updatedCase.id ? { ...task, status: "resolved" } : task),
  };
  return addEvent(next, createEvent(state.day, action === "enforce-collateral" || action === "write-off" ? "warning" : "neutral", eventTitle, eventBody));
}

export function resolveInboxTask(state: GameState, taskId: string): GameState {
  return { ...state, ceoInbox: state.ceoInbox.map((task) => task.id === taskId ? { ...task, status: "resolved" } : task) };
}

export function resolveInboxDecision(state: GameState, taskId: string, choiceId: string): GameState {
  const task = state.ceoInbox.find((item) => item.id === taskId);
  if (!task?.decision) return resolveInboxTask(state, taskId);
  const handled = chooseDecisionV5({ ...state, pendingDecision: task.decision }, choiceId);
  return { ...handled, pendingDecision: null, ceoInbox: handled.ceoInbox.map((item) => item.id === taskId ? { ...item, status: "resolved" } : item) };
}

export function delegateInboxTask(state: GameState, taskId: string): GameState {
  const task = state.ceoInbox.find((item) => item.id === taskId);
  if (!task || task.status !== "open") return state;
  const executive = task.ownerRole ? state.employeeRoster.find((employee) => employee.executiveRole === task.ownerRole) : undefined;
  const branchManagerAvailable = task.category === "network" && state.branchOffices.some((branch) => branch.managerId && branch.managerMandate !== "manual");
  if (!executive && !branchManagerAvailable) return state;
  let next = state;
  if (task.category === "risk" && executive) next = { ...next, cash: next.cash + 350_000, wholesaleFunding: next.wholesaleFunding + 350_000 };
  if (task.category === "network") next = { ...next, branchOffices: next.branchOffices.map((branch) => task.sourceId?.includes(branch.id) ? { ...branch, capacity: branch.capacity + 35, satisfaction: clamp(branch.satisfaction + 1.5, 1, 100) } : branch) };
  if (task.category === "market") next = { ...next, brandStrength: clamp(next.brandStrength + .7, 1, 100), customers: next.customers + 4 };
  if (task.category === "project") next = { ...next, projects: next.projects.map((project) => project.id === task.sourceId ? { ...project, remainingDays: Math.max(1, project.remainingDays - 5), status: "active" } : project), cash: Math.max(0, next.cash - 10_000) };
  if (task.category === "credit" && task.sourceId) {
    const collectionCase = next.collectionCases.find((item) => item.id === task.sourceId);
    if (collectionCase) next = takeCollectionAction(next, collectionCase.loanId, collectionCase.daysPastDue >= 90 ? "external-collections" : "payment-plan", true);
  }
  const owner = executive?.name ?? "Delegated branch management";
  next = { ...next, ceoInbox: next.ceoInbox.map((item) => item.id === taskId ? { ...item, status: "delegated" } : item) };
  return addEvent(next, createEvent(state.day, "positive", `${task.title} delegated`, `${owner} handled the matter without another CEO interruption.`));
}
