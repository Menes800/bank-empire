import { delegateInboxTask, resolveInboxDecision } from "../v7/gameplay";
import { advanceDaysV8 } from "../v8/gameplay";
import { startBranchUpgrade } from "../v4/gameplay";
import type { BranchOffice, CEOInboxTask, ExecutiveRole, GameState, ManagementArea } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";
import { calculateBranchLedgerV9, refreshBranchLedgersV9 } from "./branch";
import { ensureV9State, getBranchOperationsV9, getOpenCeoDecisionsV9, getTechnologyEffectsV9, readV9, writeV9, type BranchSpecializationV9, type ManagementReportV9 } from "./model";
import { completeV9Projects, startAdvancedBranchUpgradeV9 } from "./projects";

export { completeActiveTechnologyV9, startAdvancedBranchUpgradeV9, startTechnologyV9, TECHNOLOGY_TRACK_ORDER_V9, unlockTechnologyTreeV9 } from "./projects";
export { letManagementFixBranchV9, normalizeBalanceSheetV9, runCfoStabilizationV9, setBranchSpecializationV9, setDensityV9, setUpgradeAuthorityV9 } from "./operations";

const ownerArea: Record<ExecutiveRole, ManagementArea> = { CFO: "treasury", COO: "operations", CRO: "lending", CMO: "marketing", CTO: "operations" };

function reportTitle(role: ExecutiveRole, category: CEOInboxTask["category"], count: number) {
  const categoryLabel: Record<CEOInboxTask["category"], string> = {
    network: "branch and capacity matters",
    credit: "credit and collections matters",
    people: "workforce matters",
    market: "competitor moves",
    risk: "treasury and risk matters",
    project: "delivery matters",
  };
  return `${role} handled ${count} ${categoryLabel[category]}`;
}

function addManagementReport(state: GameState, report: ManagementReportV9): GameState {
  const v9 = readV9(state);
  return writeV9(state, { ...v9, managementReports: [report, ...v9.managementReports].slice(0, 36) });
}
function runFullAutomaticUpgradesV9(state: GameState): GameState {
  if (state.managementControl.operations !== "automatic") return state;
  let next = state;
  for (const original of state.branchOffices) {
    const branch = next.branchOffices.find((item) => item.id === original.id);
    if (!branch || !branch.managerId) continue;
    const operations = getBranchOperationsV9(next, branch.id);
    if (operations.upgradeAuthority !== "full" || operations.pendingProjectId) continue;
    const ledger = operations.ledger ?? calculateBranchLedgerV9(next, branch);
    const upgrade = ledger.recommendations.find((item) => item.id === "upgrade");
    if (!upgrade || next.cash < upgrade.costNow + 750_000) continue;
    if (operations.effectiveLevel < 3) next = startBranchUpgrade(next, branch.id);
    else next = startAdvancedBranchUpgradeV9(next, branch.id, suggestedSpecialization(branch));
  }
  return next;
}

function runDetailedBranchAccountingV9(state: GameState): GameState {
  let next = refreshBranchLedgersV9(state);
  const v9 = readV9(next);
  let cashAdjustment = 0;
  let revenueAdjustment = 0;
  let costAdjustment = 0;
  const branchOffices = next.branchOffices.map((branch) => {
    const ledger = v9.branches[branch.id]?.ledger ?? calculateBranchLedgerV9(next, branch);
    const previousRevenue = branch.lastMonthRevenue ?? 0;
    const previousCost = branch.lastMonthCost ?? 0;
    const previousProfit = branch.lastMonthProfit ?? 0;
    cashAdjustment += ledger.profit - previousProfit;
    revenueAdjustment += ledger.income.total - previousRevenue;
    costAdjustment += ledger.costs.total - previousCost;
    return {
      ...branch,
      lastMonthRevenue: ledger.income.total,
      lastMonthCost: ledger.costs.total,
      lastMonthProfit: ledger.profit,
      lifetimeProfit: (branch.lifetimeProfit ?? 0) + (ledger.profit - previousProfit),
      lastManagerAction: v9.branches[branch.id]?.lastCooAction ?? branch.lastManagerAction,
    };
  });
  next = {
    ...next,
    branchOffices,
    cash: Math.max(0, next.cash + cashAdjustment),
    totalProfit: next.totalProfit + cashAdjustment,
    profit: next.profit + cashAdjustment / 30,
    revenue: next.revenue + revenueAdjustment / 30,
    expenses: Math.max(0, next.expenses + costAdjustment / 30),
  };
  const networkResult = branchOffices.reduce((sum, branch) => sum + (branch.lastMonthProfit ?? 0), 0);
  return addEvent(next, createEvent(state.day, networkResult >= 0 ? "positive" : "warning", "Detailed branch accounts closed", `${branchOffices.length} branches produced a combined monthly result of ${networkResult >= 0 ? "+" : "-"}$${Math.abs(round(networkResult / 1000))}k after full income and cost allocation.`));
}

function runExecutiveImpactV9(state: GameState): GameState {
  const executive = (role: ExecutiveRole) => state.employeeRoster.find((employee) => employee.executiveRole === role);
  const quality = (role: ExecutiveRole) => {
    const person = executive(role);
    return person ? clamp((person.skill + person.leadership + (person.performance ?? person.skill)) / 300, .35, 1) : 0;
  };
  const cfo = quality("CFO");
  const coo = quality("COO");
  const cro = quality("CRO");
  const cmo = quality("CMO");
  const cto = quality("CTO");
  const tech = getTechnologyEffectsV9(state);

  const customerGain = round((8 + state.brandStrength * .08) * cmo * (1 + tech.feeIncome / 100));
  const depositGain = round(customerGain * (9_000 + state.reputation * 65));
  const operatingSaving = round(state.expenses * 30 * (coo * .012 + tech.operatingCostReduction / 100));
  const treasurySaving = round(state.wholesaleFunding * state.wholesaleFundingRate / 100 / 12 * cfo * .035);
  const creditImprovement = cro * (.08 + tech.compliance * .004);

  return {
    ...state,
    cash: Math.max(0, state.cash + operatingSaving + treasurySaving),
    customers: state.customers + customerGain,
    customersGained: state.customersGained + customerGain,
    deposits: state.deposits + depositGain,
    nplRatio: clamp(state.nplRatio - creditImprovement, 0, 100),
    compliance: clamp(state.compliance + cro * .18 + tech.compliance * .025, 1, 100),
    digitalLevel: clamp(state.digitalLevel + cto * .12 + tech.digitalCapacity * .01, 1, 100),
    cyberSecurity: clamp(state.cyberSecurity + cto * .1 + tech.cyber * .015, 1, 100),
    branchOffices: state.branchOffices.map((branch) => ({ ...branch, satisfaction: clamp(branch.satisfaction + coo * .18, 1, 100) })),
    wholesaleFundingRate: Math.max(state.baseRate + .2, state.wholesaleFundingRate - cfo * .015),
  };
}

function routeManagementInboxV9(state: GameState): GameState {
  let next = ensureV9State(state);
  const handled = new Map<string, { role: ExecutiveRole; category: CEOInboxTask["category"]; titles: string[] }>();
  const candidates = next.ceoInbox.filter((task) => task.status === "open");

  for (const original of candidates) {
    const task = next.ceoInbox.find((item) => item.id === original.id);
    if (!task || task.status !== "open" || !task.ownerRole) continue;
    const executive = next.employeeRoster.find((employee) => employee.executiveRole === task.ownerRole);
    if (!executive) continue;
    const mode = next.managementControl[ownerArea[task.ownerRole]];
    if (mode === "manual" || task.urgency === "critical") continue;

    let handledTask = false;
    if (task.decision) {
      if (mode === "automatic") {
        const choice = task.decision.choices[Math.min(1, task.decision.choices.length - 1)] ?? task.decision.choices[0];
        if (choice) {
          next = resolveInboxDecision(next, task.id, choice.id);
          handledTask = true;
        }
      }
    } else {
      const beforeStatus = task.status;
      next = delegateInboxTask(next, task.id);
      handledTask = beforeStatus !== next.ceoInbox.find((item) => item.id === task.id)?.status;
    }
    if (!handledTask) continue;
    const key = `${task.ownerRole}-${task.category}`;
    const bucket = handled.get(key) ?? { role: task.ownerRole, category: task.category, titles: [] };
    bucket.titles.push(task.title);
    handled.set(key, bucket);
  }

  for (const bucket of handled.values()) {
    const report: ManagementReportV9 = {
      id: `management-report-${bucket.role}-${bucket.category}-${next.day}-${bucket.titles.length}`,
      day: next.day,
      ownerRole: bucket.role,
      category: bucket.category,
      title: reportTitle(bucket.role, bucket.category, bucket.titles.length),
      summary: `${bucket.titles.slice(0, 3).join(" · ")}${bucket.titles.length > 3 ? ` · plus ${bucket.titles.length - 3} more` : ""}.`,
      handledCount: bucket.titles.length,
      itemTitles: bucket.titles,
    };
    next = addManagementReport(next, report);
  }
  return next;
}

function archiveHandledInboxV9(state: GameState): GameState {
  const v9 = readV9(state);
  const cutoff = state.day - v9.autoArchiveDays;
  const completed = state.ceoInbox.filter((task) => task.status !== "open");
  const shouldArchive = new Set(completed.filter((task, index) => task.createdDay <= cutoff || index >= 18).map((task) => task.id));
  if (shouldArchive.size === 0) return state;
  const moved = state.ceoInbox.filter((task) => shouldArchive.has(task.id));
  return writeV9({ ...state, ceoInbox: state.ceoInbox.filter((task) => !shouldArchive.has(task.id)) }, { ...v9, inboxArchive: [...moved, ...v9.inboxArchive].slice(0, 80) });
}

export function clearRoutineInboxV9(state: GameState): GameState {
  let next = ensureV9State(state);
  const v9 = readV9(next);
  const routine = next.ceoInbox.filter((task) => task.status === "open" && task.urgency !== "critical" && !task.decision);
  const routineIds = new Set(routine.map((task) => task.id));
  next = { ...next, ceoInbox: next.ceoInbox.map((task) => routineIds.has(task.id) ? { ...task, status: "delegated" as const } : task) };
  const report: ManagementReportV9 | null = routine.length > 0 ? {
    id: `management-report-cleanup-${next.day}`,
    day: next.day,
    ownerRole: "COO",
    category: "network",
    title: `Management cleared ${routine.length} routine CEO matters`,
    summary: "Legacy routine items were transferred to the accountable executives and removed from the CEO decision count.",
    handledCount: routine.length,
    itemTitles: routine.map((task) => task.title),
  } : null;
  return report ? writeV9(next, { ...v9, managementReports: [report, ...v9.managementReports].slice(0, 36) }) : next;
}
function suggestedSpecialization(branch: BranchOffice): BranchSpecializationV9 { if (branch.profile === "business") return "business-centre"; if (branch.profile === "mortgage") return "mortgage-centre"; if (branch.profile === "wealth") return "wealth-office"; return "self-service"; }

export function advanceDaysV9(state: GameState, days: number): GameState {
  let current = routeManagementInboxV9(ensureV9State(state));
  for (let index = 0; index < days; index += 1) {
    if (current.gameOverReason || current.pendingDecision || getOpenCeoDecisionsV9(current).length > 0) break;
    const beforeDay = current.day;
    let next = advanceDaysV8(current, 1);
    if (next.day === beforeDay) break;
    next = completeV9Projects(next);
    next = routeManagementInboxV9(next);
    if (next.day % 30 === 0) {
      next = runDetailedBranchAccountingV9(next);
      next = runFullAutomaticUpgradesV9(next);
      next = runExecutiveImpactV9(next);
      next = routeManagementInboxV9(next);
      const v9 = readV9(next);
      next = writeV9(next, { ...v9, lastManagementCycleDay: next.day });
      next = archiveHandledInboxV9(next);
    }
    current = next;
  }
  return current;
}
