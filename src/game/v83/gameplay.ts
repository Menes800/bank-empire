import { advanceDaysV8 } from "../v8/gameplay";
import type { BranchOffice, GameState } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";

const MARKETING_MIN = 0;
const MARKETING_MAX = 120_000;

function demandForProfile(branch: BranchOffice, district: GameState["districts"][number]) {
  if (branch.profile === "mortgage") return district.mortgageDemand;
  if (branch.profile === "business") return district.businessDemand;
  if (branch.profile === "wealth") return district.wealthDemand;
  return district.retailDemand;
}

function priorityDemand(branch: BranchOffice) {
  const priority = branch.operatingPriority ?? "balanced";
  if (priority === "growth") return 1.18;
  if (priority === "deposits") return 1.07;
  if (priority === "business") return 1.06;
  if (priority === "profitability") return .94;
  return 1;
}

function defaultMarketingBudget(branch: BranchOffice) {
  if ((branch.operatingPriority ?? "balanced") === "growth") return 42_000 + branch.level * 8_000;
  if ((branch.operatingPriority ?? "balanced") === "profitability") return 8_000;
  return 18_000 + branch.level * 4_000;
}

function profileFeeIncome(branch: BranchOffice, customers: number) {
  const feePerCustomer = branch.profile === "wealth"
    ? 220
    : branch.profile === "business"
      ? 175
      : branch.profile === "mortgage"
        ? 145
        : 125;
  return customers * feePerCustomer;
}

function calculateBranchEconomy(state: GameState, branch: BranchOffice) {
  const district = state.districts.find((item) => item.id === branch.districtId);
  if (!district) return null;

  const manager = state.employeeRoster.find((employee) => employee.id === branch.managerId);
  const managerQuality = manager
    ? clamp((manager.skill + manager.leadership + manager.loyalty * .3) / 205, .62, 1.32)
    : .68;
  const managerActive = Boolean(manager && branch.managerControl && branch.managerMandate !== "manual");
  const cmo = state.employeeRoster.find((employee) => employee.executiveRole === "CMO");
  const cmoEffect = cmo && state.managementControl.marketing !== "manual"
    ? 1 + clamp((cmo.skill + cmo.leadership - 110) / 1_000, 0, .12)
    : 1;

  const marketingBudget = clamp(
    branch.managerBudget ?? defaultMarketingBudget(branch),
    MARKETING_MIN,
    MARKETING_MAX,
  );
  const marketingLift = marketingBudget <= 0
    ? 0
    : Math.min(.28, Math.sqrt(marketingBudget / 100_000) * .22) * cmoEffect;
  const profileDemand = demandForProfile(branch, district);
  const competitionEffect = clamp(1 - district.competition / 230, .48, .96);
  const targetCustomers = Math.min(
    branch.capacity,
    round(
      (district.population * .0062 + profileDemand * 3.35) *
      managerQuality *
      priorityDemand(branch) *
      competitionEffect *
      (1 + marketingLift),
    ),
  );

  const previousCustomers = branch.localCustomers ?? Math.min(
    branch.capacity,
    Math.max(140, round(targetCustomers * .76)),
  );
  const growthSpeed = managerActive ? .34 : .2;
  const localCustomers = clamp(
    round(previousCustomers * (1 - growthSpeed) + targetCustomers * growthSpeed),
    20,
    branch.capacity,
  );

  const focus = branch.localFocus ?? "service";
  const depositMultiplier = focus === "deposits" ? 1.22 : focus === "business" ? 1.1 : 1;
  const lendingMultiplier = focus === "lending" ? 1.2 : branch.profile === "mortgage" ? 1.14 : 1;
  const localDeposits = Math.max(0, round(localCustomers * district.incomeIndex * 245 * depositMultiplier));
  const localLoans = Math.max(0, round(localCustomers * district.incomeIndex * 156 * lendingMultiplier));

  const feeIncome = profileFeeIncome(branch, localCustomers);
  const depositIncome = localDeposits * .0031;
  const lendingIncome = localLoans * Math.max(1.35, state.loanRate - state.baseRate) / 100 / 12 * 1.18;
  const relationshipIncome = localCustomers * branch.level * 18;
  const lastMonthRevenue = round(feeIncome + depositIncome + lendingIncome + relationshipIncome);

  const staffingCost = branch.staffSlots * 4_850;
  const managerCost = manager ? manager.salary * .09 : 0;
  const lastMonthCost = round(branch.monthlyRent + staffingCost + managerCost + marketingBudget);
  const lastMonthProfit = round(lastMonthRevenue - lastMonthCost);
  const capacityUse = localCustomers / Math.max(1, branch.capacity) * 100;
  const satisfactionChange = capacityUse > 96
    ? -2.2
    : capacityUse > 88
      ? -.7
      : managerActive
        ? .55
        : -.3;
  const satisfaction = clamp(branch.satisfaction + satisfactionChange, 35, 96);
  const customerChange = localCustomers - previousCustomers;

  const marketingSummary = marketingBudget === 0
    ? "without paid local marketing"
    : `with a ${round(marketingBudget / 1_000)}k local marketing budget`;
  const lastManagerAction = managerActive
    ? `${manager?.name} ran the ${branch.operatingPriority ?? "balanced"} plan ${marketingSummary}; ${customerChange >= 0 ? "+" : ""}${customerChange} customers and ${lastMonthProfit >= 0 ? "+" : ""}${round(lastMonthProfit / 1_000)}k result.`
    : manager
      ? `${manager.name} reported the result, but local execution is still waiting for CEO approval.`
      : "No branch manager is accountable for local performance.";

  return {
    marketingBudget,
    localCustomers,
    localDeposits,
    localLoans,
    lastMonthRevenue,
    lastMonthCost,
    lastMonthProfit,
    satisfaction,
    lastManagerAction,
  };
}

function runBranchEconomyV83(state: GameState): GameState {
  let profitCorrection = 0;
  let revenueCorrection = 0;
  let costCorrection = 0;
  let marketingSpend = 0;

  const branchOffices = state.branchOffices.map((branch) => {
    const result = calculateBranchEconomy(state, branch);
    if (!result) return branch;

    const previousRevenue = branch.lastMonthRevenue ?? 0;
    const previousCost = branch.lastMonthCost ?? 0;
    const previousProfit = branch.lastMonthProfit ?? previousRevenue - previousCost;
    profitCorrection += result.lastMonthProfit - previousProfit;
    revenueCorrection += result.lastMonthRevenue - previousRevenue;
    costCorrection += result.lastMonthCost - previousCost;
    marketingSpend += result.marketingBudget;

    return {
      ...branch,
      managerBudget: result.marketingBudget,
      localCustomers: result.localCustomers,
      localDeposits: result.localDeposits,
      localLoans: result.localLoans,
      lastMonthRevenue: result.lastMonthRevenue,
      lastMonthCost: result.lastMonthCost,
      lastMonthProfit: result.lastMonthProfit,
      lifetimeProfit: (branch.lifetimeProfit ?? 0) + (result.lastMonthProfit - previousProfit),
      satisfaction: result.satisfaction,
      lastManagerAction: result.lastManagerAction,
    };
  });

  const delegatedSourceIds = new Set(
    branchOffices
      .filter((branch) => branch.managerId && branch.managerControl)
      .flatMap((branch) => {
        const severeLoss = (branch.lastMonthProfit ?? 0) < -150_000;
        const extremeCapacity = (branch.localCustomers ?? 0) / Math.max(1, branch.capacity) * 100 > 98;
        return severeLoss || extremeCapacity
          ? []
          : [`profit-${branch.id}`, `capacity-${branch.id}`];
      }),
  );

  const ceoInbox = state.ceoInbox.map((task) => {
    if (task.status !== "open" || !task.sourceId || !delegatedSourceIds.has(task.sourceId)) return task;
    return { ...task, status: "delegated" as const };
  });

  const totalProfit = branchOffices.reduce((sum, branch) => sum + (branch.lastMonthProfit ?? 0), 0);
  const profitableBranches = branchOffices.filter((branch) => (branch.lastMonthProfit ?? 0) >= 0).length;
  const corrected: GameState = {
    ...state,
    branchOffices,
    ceoInbox,
    cash: Math.max(0, state.cash + profitCorrection),
    totalProfit: state.totalProfit + profitCorrection,
    revenue: state.revenue + revenueCorrection / 30,
    expenses: state.expenses + costCorrection / 30,
  };

  return addEvent(
    corrected,
    createEvent(
      state.day,
      totalProfit >= 0 ? "positive" : "warning",
      "Branch management report",
      `${profitableBranches}/${branchOffices.length} branches were profitable. Network result was ${totalProfit >= 0 ? "+" : ""}${round(totalProfit / 1_000)}k after ${round(marketingSpend / 1_000)}k in local marketing. Routine branch follow-up stayed with managers.`,
    ),
  );
}

export function setBranchMarketingBudget(state: GameState, branchId: string, monthlyBudget: number): GameState {
  const budget = clamp(round(monthlyBudget / 1_000) * 1_000, MARKETING_MIN, MARKETING_MAX);
  return {
    ...state,
    branchOffices: state.branchOffices.map((branch) => branch.id === branchId
      ? {
          ...branch,
          managerBudget: budget,
          lastManagerAction: `CEO set a ${round(budget / 1_000)}k monthly local marketing ceiling. The branch manager controls execution within that limit.`,
        }
      : branch),
  };
}

export function advanceDaysV83(state: GameState, days: number): GameState {
  let current = state;
  for (let index = 0; index < days; index += 1) {
    if (current.gameOverReason && !current.bankruptcyProtection) break;
    const beforeDay = current.day;
    let next = advanceDaysV8(current, 1);
    if (next.day === beforeDay) break;
    if (next.day % 30 === 0) next = runBranchEconomyV83(next);
    current = next;
  }
  return current;
}
