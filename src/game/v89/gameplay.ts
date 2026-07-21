import { approveLoanRefined, counterLoanRefined, declineLoanRefined, getCreditRecommendation, startBranchUpgrade, startStrategicProject } from "../v4/gameplay";
import type { BankProject, BranchOffice, ExecutivePermission, ExecutiveRole, GameState, LoanApplication, ManagementLogEntry, ProjectKind } from "../types";
import { clamp, round } from "../utils";
import { advanceDaysV889, delegateInboxTaskV88, getMandateAssessmentV88 } from "../v88/mandates";
import { repairCampaignState } from "../v88/gameplay";

export type ConnectedAssessmentV89 = ReturnType<typeof getMandateAssessmentV88> & {
  strategic: boolean;
  severity: "routine" | "important" | "critical";
};

export type CreditAssessmentV89 = {
  application: LoanApplication;
  action: "approve" | "counter" | "decline";
  role: "CRO";
  permission: ExecutivePermission;
  executiveName?: string;
  canExecute: boolean;
  requiresCEO: boolean;
  reason: string;
  exposureLimit: number;
  estimatedRisk: number;
};

export type StrategicProgrammeKind = Extract<ProjectKind, "mobile-bank" | "core-banking" | "head-office">;
export type ProgrammeConfigV89 = {
  kind: StrategicProgrammeKind;
  title: string;
  summary: string;
  ownerRole: ExecutiveRole;
  permission: ExecutivePermission;
  budget: number;
  duration: number;
  risk: number;
  requiredStage: GameState["campaignStage"];
  benefits: string[];
};

export const PROGRAMMES_V89: ProgrammeConfigV89[] = [
  { kind: "mobile-bank", title: "Mobile bank 2.0", summary: "A modern digital channel that reduces branch pressure and improves customer growth.", ownerRole: "CTO", permission: "techProjects", budget: 2_600_000, duration: 120, risk: 32, requiredStage: "startup", benefits: ["+18 digital level", "+3 satisfaction", "+5 brand strength"] },
  { kind: "core-banking", title: "Core banking renewal", summary: "Replace the bank's core platform to improve resilience, compliance and product delivery.", ownerRole: "CTO", permission: "techProjects", budget: 5_500_000, duration: 210, risk: 48, requiredStage: "regional", benefits: ["+15 cyber security", "+10 digital level", "+5 compliance"] },
  { kind: "head-office", title: "Regional head office", summary: "Create management capacity for a larger branch network and regional expansion.", ownerRole: "COO", permission: "localUpgrades", budget: 8_000_000, duration: 270, risk: 36, requiredStage: "regional", benefits: ["+5 reputation", "+7 board confidence", "Regional management capacity"] },
];

const stageOrder: GameState["campaignStage"][] = ["startup", "regional", "national", "group", "empire"];
const strategicPattern = /acquisition|capital raise|issue equity|executive dismissal|dismiss executive|withdraw(?:al)? of (?:the )?licen[cs]e|licen[cs]e withdrawal|management fraud|executive fraud|related-party|conflict of interest|regulatory resolution|bankruptcy|merger|sell the bank|change of control/i;

function logAction(state: GameState, entry: Omit<ManagementLogEntry, "id" | "day">): GameState {
  const duplicate = state.managementLog.find((item) => item.role === entry.role && item.title === entry.title && item.detail === entry.detail && item.day >= state.day - 2);
  if (duplicate) return state;
  const log: ManagementLogEntry = { ...entry, id: `management-v89-${state.day}-${entry.role}-${state.managementLog.length}`, day: state.day };
  return { ...state, managementLog: [log, ...state.managementLog].slice(0, 120) };
}

function resolvedTask(state: GameState, sourceId: string): GameState {
  return { ...state, ceoInbox: state.ceoInbox.map((task) => task.sourceId === sourceId ? { ...task, status: "resolved" } : task) };
}

function severity(task: GameState["ceoInbox"][number]): ConnectedAssessmentV89["severity"] {
  return task.urgency === "critical" ? "critical" : task.urgency === "important" ? "important" : "routine";
}

export function getMandateAssessmentV89(state: GameState, task: GameState["ceoInbox"][number]): ConnectedAssessmentV89 {
  const softened = task.urgency === "critical" ? { ...task, urgency: "important" as const } : task;
  const base = getMandateAssessmentV88(state, softened);
  const strategic = strategicPattern.test(`${task.title} ${task.summary}`);
  if (strategic) return { ...base, canExecute: false, requiresCEO: true, reason: "Strategic authority is reserved for the CEO", strategic, severity: severity(task) };
  return { ...base, strategic, severity: severity(task) };
}

export function delegateInboxTaskV89(state: GameState, taskId: string): GameState {
  const task = state.ceoInbox.find((item) => item.id === taskId);
  if (!task || task.status !== "open") return state;
  const assessment = getMandateAssessmentV89(state, task);
  if (!assessment.canExecute) return state;
  const softenedState: GameState = task.urgency === "critical" ? {
    ...state,
    ceoInbox: state.ceoInbox.map((item) => item.id === taskId ? { ...item, urgency: "important" } : item),
  } : state;
  const handled = delegateInboxTaskV88(softenedState, taskId);
  return { ...handled, ceoInbox: handled.ceoInbox.map((item) => item.id === taskId ? { ...item, urgency: task.urgency } : item) };
}

function gradeRisk(application: LoanApplication) {
  const grade = { A: 12, B: 25, C: 48, D: 76 }[application.riskGrade];
  return clamp(grade + application.defaultChance * 1.8 + Math.max(0, 70 - application.collateral) * .45, 1, 100);
}

export function getCreditAssessmentV89(state: GameState, application: LoanApplication): CreditAssessmentV89 {
  const recommendation = getCreditRecommendation(state, application);
  const executive = state.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  const mandate = state.executiveMandates.CRO;
  const recommendedAction = recommendation.action as CreditAssessmentV89["action"];
  const permission: ExecutivePermission = recommendedAction === "counter" ? "creditTerms" : "lending";
  const exposureLimit = Math.max(750_000, mandate.spendLimit * 4);
  const estimatedRisk = gradeRisk(application);
  let reason = "Within CRO mandate";
  if (!executive) reason = "Appoint a CRO first";
  else if (!mandate.permissions.includes(permission)) reason = `${permission} is not included in the CRO mandate`;
  else if (recommendedAction !== "decline" && application.amount > exposureLimit) reason = `Exposure ${application.amount.toLocaleString(state.locale)} ${state.currency} exceeds the CRO limit of ${exposureLimit.toLocaleString(state.locale)} ${state.currency}`;
  else if (recommendedAction !== "decline" && estimatedRisk > mandate.riskLimit) reason = `Estimated credit risk ${estimatedRisk.toFixed(0)} exceeds the CRO risk limit of ${mandate.riskLimit.toFixed(0)}`;
  else if (recommendedAction !== "decline" && state.cash < Math.abs(recommendation.liquidityImpact) + 150_000) reason = "The bank does not have enough free cash for this exposure";
  else if (recommendedAction !== "decline" && state.liquidityRatio < 12) reason = `Liquidity ${state.liquidityRatio.toFixed(1)}% is below the 12% lending floor`;
  else if (recommendedAction !== "decline" && state.capitalRatio < 9) reason = `Capital ratio ${state.capitalRatio.toFixed(1)}% is below the 9% lending floor`;
  const canExecute = reason === "Within CRO mandate";
  return { application, action: recommendedAction, role: "CRO", permission, executiveName: executive?.name, canExecute, requiresCEO: !canExecute, reason, exposureLimit, estimatedRisk };
}

function ensureCreditException(state: GameState, assessment: CreditAssessmentV89): GameState {
  const sourceId = `credit-application-${assessment.application.id}`;
  if (state.ceoInbox.some((task) => task.sourceId === sourceId && task.status === "open")) return state;
  const task: GameState["ceoInbox"][number] = {
    id: `inbox-${sourceId}-${state.day}`,
    createdDay: state.day,
    category: "credit",
    title: `${assessment.application.customerName} requires credit authority`,
    summary: assessment.reason,
    urgency: assessment.estimatedRisk >= 75 ? "critical" : "important",
    page: "clients",
    status: "open",
    ownerRole: "CRO",
    sourceId,
  };
  return { ...state, ceoInbox: [task, ...state.ceoInbox].slice(0, 40) };
}

export function processCreditApplicationsV89(state: GameState): GameState {
  let next = state;
  for (const original of [...state.loanApplications]) {
    const application = next.loanApplications.find((item) => item.id === original.id);
    if (!application) continue;
    const assessment = getCreditAssessmentV89(next, application);
    if (!assessment.canExecute) {
      next = ensureCreditException(next, assessment);
      continue;
    }
    const before = next;
    next = assessment.action === "approve" ? approveLoanRefined(next, application.id) : assessment.action === "counter" ? counterLoanRefined(next, application.id) : declineLoanRefined(next, application.id);
    if (next === before) {
      next = ensureCreditException(next, { ...assessment, canExecute: false, requiresCEO: true, reason: "The recommended action could not be funded from the current balance sheet" });
      continue;
    }
    next = resolvedTask(next, `credit-application-${application.id}`);
    next = logAction(next, {
      role: "CRO",
      title: `Credit · ${application.customerName}`,
      detail: `${assessment.executiveName} ${assessment.action === "approve" ? "approved" : assessment.action === "counter" ? "issued a counter-offer for" : "declined"} ${application.amount.toLocaleString(next.locale)} ${next.currency}. Risk ${assessment.estimatedRisk.toFixed(0)} was assessed against a ${next.executiveMandates.CRO.riskLimit.toFixed(0)} limit.`,
      amount: assessment.action === "approve" ? application.amount : assessment.action === "counter" ? round(application.amount * .72) : undefined,
      outcome: "completed",
    });
  }
  return next;
}

export function reconcileManagementV89(state: GameState): GameState {
  let next = repairCampaignState(state);
  for (const task of [...next.ceoInbox].filter((item) => item.status === "open")) {
    const assessment = getMandateAssessmentV89(next, task);
    if (assessment.canExecute) next = delegateInboxTaskV89(next, task.id);
  }
  next = processCreditApplicationsV89(next);
  return next;
}

export function advanceDaysV89(state: GameState, days: number): GameState {
  let current = reconcileManagementV89(state);
  for (let index = 0; index < days; index += 1) {
    const before = current.day;
    current = advanceDaysV889(current, 1);
    if (current.day === before) break;
    current = reconcileManagementV89(current);
  }
  return current;
}

export function getProgrammeAssessmentV89(state: GameState, kind: StrategicProgrammeKind) {
  const config = PROGRAMMES_V89.find((item) => item.kind === kind)!;
  const project = state.projects.find((item) => item.kind === kind && item.status !== "completed");
  const completed = state.projects.find((item) => item.kind === kind && item.status === "completed");
  const executive = state.employeeRoster.find((employee) => employee.executiveRole === config.ownerRole);
  const mandate = state.executiveMandates[config.ownerRole];
  const reasons: string[] = [];
  if (project) reasons.push("Programme is already active");
  if (completed) reasons.push("Programme has already been completed");
  if (stageOrder.indexOf(state.campaignStage) < stageOrder.indexOf(config.requiredStage)) reasons.push(`Reach ${config.requiredStage} stage`);
  if (state.cash < config.budget) reasons.push(`Need ${config.budget.toLocaleString(state.locale)} ${state.currency} liquid cash`);
  const mandateReasons: string[] = [];
  if (!executive) mandateReasons.push(`Appoint a ${config.ownerRole}`);
  else if (!mandate.permissions.includes(config.permission)) mandateReasons.push(`${config.permission} is not in the ${config.ownerRole} mandate`);
  else if (config.budget > mandate.spendLimit) mandateReasons.push(`Budget exceeds the ${config.ownerRole} limit of ${mandate.spendLimit.toLocaleString(state.locale)} ${state.currency}`);
  else if (config.risk > mandate.riskLimit) mandateReasons.push(`Risk ${config.risk} exceeds the ${config.ownerRole} limit of ${mandate.riskLimit.toFixed(0)}`);
  return { config, project, completed, canStart: reasons.length === 0, canDelegate: reasons.length === 0 && mandateReasons.length === 0, reasons, mandateReasons, executiveName: executive?.name };
}

export function startProgrammeV89(state: GameState, kind: StrategicProgrammeKind, approvedByCEO = false): GameState {
  const assessment = getProgrammeAssessmentV89(state, kind);
  if (!assessment.canStart || (!assessment.canDelegate && !approvedByCEO)) return state;
  const started = startStrategicProject(state, kind);
  if (started === state) return state;
  const role = assessment.config.ownerRole;
  const detail = approvedByCEO && !assessment.canDelegate
    ? `The CEO approved the programme above the ${role} mandate. ${assessment.executiveName ?? role} owns delivery.`
    : `${assessment.executiveName} launched the programme inside the ${role} mandate.`;
  return logAction(started, { role, title: assessment.config.title, detail, amount: assessment.config.budget, outcome: "completed" });
}

export function branchMetricsV89(branch: BranchOffice) {
  const customers = branch.localCustomers ?? Math.min(branch.capacity, 260 + branch.level * 100);
  const revenue = branch.lastMonthRevenue ?? customers * 70;
  const staffing = branch.staffSlots * 5_400;
  const rent = branch.monthlyRent;
  const managerCost = 0;
  const localActivity = branch.managerBudget ?? 0;
  const cost = branch.lastMonthCost ?? rent + staffing + managerCost + localActivity;
  const profit = branch.lastMonthProfit ?? revenue - cost;
  const capacityUse = customers / Math.max(1, branch.capacity) * 100;
  return { customers, revenue, staffing, rent, managerCost, localActivity, cost, profit, capacityUse, deposits: branch.localDeposits ?? 0, loans: branch.localLoans ?? 0 };
}

export function getBranchDiagnosisV89(state: GameState, branch: BranchOffice) {
  const metrics = branchMetricsV89(branch);
  const district = state.districts.find((item) => item.id === branch.districtId);
  const reasons: string[] = [];
  if (metrics.customers < branch.capacity * .5) reasons.push("Customer volume is too low for the current cost base");
  if (metrics.staffing > metrics.revenue * .55) reasons.push("Staffing cost is high relative to local revenue");
  if (metrics.rent > metrics.revenue * .28) reasons.push("Rent is consuming a large share of revenue");
  if ((district?.competition ?? 0) > 65) reasons.push("Local competition is limiting customer acquisition");
  if (!branch.managerId) reasons.push("No accountable branch manager is in place");
  const recommendation = metrics.capacityUse > 92 ? "Prepare a capacity upgrade" : metrics.profit < 0 ? "Run a profitability recovery plan" : metrics.capacityUse < 55 ? "Build local demand before adding capacity" : "Maintain the current operating plan";
  return { metrics, reasons: reasons.length ? reasons : ["No material structural weakness detected"], recommendation };
}

export function getBranchUpgradePlanV89(state: GameState, branchId: string) {
  const branch = state.branchOffices.find((item) => item.id === branchId);
  if (!branch) return null;
  const metrics = branchMetricsV89(branch);
  const cost = branch.level === 1 ? 1_150_000 : branch.level === 2 ? 2_100_000 : 0;
  const capacityGain = branch.level < 3 ? round(branch.capacity * .45) : 0;
  const monthlyRevenueGain = Math.max(28_000, metrics.profit * .28 + Math.max(0, metrics.capacityUse - 78) * 4_200);
  const monthlyCostGain = branch.level < 3 ? branch.staffSlots * 1_350 + 18_000 : 0;
  const monthlyProfitGain = monthlyRevenueGain - monthlyCostGain;
  const paybackMonths = cost / Math.max(1, monthlyProfitGain);
  const risk = clamp(24 + Math.max(0, 70 - metrics.capacityUse) * .25, 12, 55);
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  const mandate = state.executiveMandates.COO;
  const authority = branch.upgradeAuthority ?? "manual";
  const authorityAllows = authority === "small" ? branch.level === 1 && cost <= 1_250_000 : authority === "profitable" ? paybackMonths <= 24 : false;
  const canDelegate = Boolean(coo && mandate.permissions.includes("localUpgrades") && authorityAllows && cost <= mandate.spendLimit && risk <= mandate.riskLimit && state.cash >= cost);
  const reasons: string[] = [];
  if (branch.level >= 3) reasons.push("Branch is already at maximum level");
  if (state.projects.some((project) => project.branchId === branch.id && project.status !== "completed")) reasons.push("An upgrade is already active");
  if (state.cash < cost) reasons.push(`Need ${cost.toLocaleString(state.locale)} ${state.currency} liquid cash`);
  if (!coo) reasons.push("COO position is vacant");
  if (!mandate.permissions.includes("localUpgrades")) reasons.push("Local upgrades are not in the COO mandate");
  if (!authorityAllows) reasons.push(authority === "manual" ? "Branch rules reserve upgrades for the CEO" : "The upgrade does not meet the branch authority rule");
  if (cost > mandate.spendLimit) reasons.push(`Cost exceeds the COO limit of ${mandate.spendLimit.toLocaleString(state.locale)} ${state.currency}`);
  if (risk > mandate.riskLimit) reasons.push(`Risk ${risk.toFixed(0)} exceeds the COO limit of ${mandate.riskLimit.toFixed(0)}`);
  return { branch, cost, capacityGain, monthlyRevenueGain, monthlyCostGain, monthlyProfitGain, paybackMonths, risk, canDelegate, canStart: branch.level < 3 && !state.projects.some((project) => project.branchId === branch.id && project.status !== "completed") && state.cash >= cost, reasons, cooName: coo?.name };
}

export function approveBranchUpgradeV89(state: GameState, branchId: string, approvedByCEO = false): GameState {
  const plan = getBranchUpgradePlanV89(state, branchId);
  if (!plan || !plan.canStart || (!plan.canDelegate && !approvedByCEO)) return state;
  const started = startBranchUpgrade(state, branchId);
  if (started === state) return state;
  const detail = approvedByCEO && !plan.canDelegate ? `The CEO approved the investment above the COO mandate. ${plan.cooName ?? "Operations"} owns delivery.` : `${plan.cooName} approved the investment inside the COO mandate.`;
  return logAction(started, { role: "COO", title: `Upgrade · ${plan.branch.name}`, detail, amount: plan.cost, outcome: "completed" });
}

export function activeProgrammeForV89(state: GameState, kind: StrategicProgrammeKind): BankProject | undefined {
  return state.projects.find((project) => project.kind === kind && project.status !== "completed");
}
