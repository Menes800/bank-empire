import { startBranchUpgrade } from "../v4/gameplay";
import { resolveInboxDecision, takeCollectionAction, type CollectionAction } from "../v7/gameplay";
import { advanceDaysV8, getWorkforceDepartments } from "../v8/gameplay";
import type { ExecutiveMandate, ExecutivePermission, ExecutiveRole, GameState, ManagementLogEntry, MandatePreset } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";
import {
  repairCampaignState,
  setExecutiveMandatePreset as setPresetBase,
  toggleExecutivePermission as togglePermissionBase,
  updateExecutiveMandateLimits as updateLimitsBase,
} from "./gameplay";
import { generateCandidateMarket, seededValue } from "./generation";

type InboxTask = GameState["ceoInbox"][number];

export type MandateTaskAssessmentV88 = {
  role?: ExecutiveRole;
  executiveName?: string;
  permission: ExecutivePermission;
  canExecute: boolean;
  requiresCEO: boolean;
  reason: string;
  estimatedCost: number;
  estimatedRisk: number;
};

function hasAny(mandate: ExecutiveMandate, permissions: ExecutivePermission[]) {
  return permissions.some((permission) => mandate.permissions.includes(permission));
}

function syncLegacyControls(state: GameState): GameState {
  const mandates = state.executiveMandates;
  const treasury = hasAny(mandates.CFO, ["liquidity", "funding", "rates"]) ? "major" as const : "manual" as const;
  const lending = hasAny(mandates.CRO, ["lending", "creditTerms", "collections", "collateral"]) ? "major" as const : "manual" as const;
  const marketing = hasAny(mandates.CMO, ["campaigns", "competitorResponse", "localGrowth"]) ? "major" as const : "manual" as const;
  const operations = mandates.COO.permissions.includes("branchManagers") ? "major" as const : "manual" as const;
  return {
    ...state,
    managementControl: { ...state.managementControl, treasury, lending, marketing, operations },
    // Old broad automation must never bypass the detailed mandate checks below.
    automation: { ...state.automation, treasury: "manual", lending: "manual", marketing: "manual", operations: "manual" },
  };
}

export function setExecutiveMandatePresetV889(state: GameState, role: ExecutiveRole, preset: Exclude<MandatePreset, "custom">) {
  return syncLegacyControls(setPresetBase(state, role, preset));
}
export function toggleExecutivePermissionV889(state: GameState, role: ExecutiveRole, permission: ExecutivePermission) {
  return syncLegacyControls(togglePermissionBase(state, role, permission));
}
export function updateExecutiveMandateLimitsV889(state: GameState, role: ExecutiveRole, patch: Partial<Pick<ExecutiveMandate, "spendLimit" | "riskLimit">>) {
  return syncLegacyControls(updateLimitsBase(state, role, patch));
}

function effectiveRole(task: InboxTask): ExecutiveRole | undefined {
  return task.category === "people" ? "COO" : task.ownerRole;
}

function executiveQuality(state: GameState, role: ExecutiveRole) {
  const executive = state.employeeRoster.find((employee) => employee.executiveRole === role);
  if (!executive) return 0;
  return clamp(executive.skill * .38 + executive.leadership * .34 + (executive.performance ?? executive.skill) * .18 + executive.loyalty * .1, 1, 100);
}

function findTaskBranch(state: GameState, task: InboxTask) {
  return state.branchOffices.find((branch) => task.sourceId?.includes(branch.id) || task.title.includes(branch.name));
}

function capacityCandidate(state: GameState, role: ExecutiveRole) {
  const mandate = state.executiveMandates[role];
  return [...state.candidatePool]
    .filter((candidate) => !candidate.executiveRole && candidate.salary * 1.5 <= mandate.spendLimit && candidate.salary * 1.5 <= Math.max(0, state.cash - 100_000))
    .sort((a, b) => b.skill + b.leadership + b.loyalty * .25 - (a.skill + a.leadership + a.loyalty * .25))[0];
}

function taskPermission(state: GameState, task: InboxTask): ExecutivePermission {
  const title = task.title.toLowerCase();
  if (task.decision) {
    if (task.decision.category === "people") return "retention";
    if (task.decision.category === "customer") return "transfers";
    if (task.decision.category === "market") return "competitorResponse";
    if (task.decision.category === "technology") return "techProjects";
    return "compliance";
  }
  if (task.category === "network") {
    if (title.includes("manager")) return "branchManagers";
    if (title.includes("loss-making")) return "transfers";
    return "localUpgrades";
  }
  if (task.category === "credit") {
    const collection = state.collectionCases.find((item) => item.id === task.sourceId);
    return collection && collection.daysPastDue >= 120 ? "collateral" : "collections";
  }
  if (task.category === "people") {
    if (title.includes("retention") || title.includes("offer")) return "retention";
    if (title.includes("training")) return "training";
    const candidate = capacityCandidate(state, "COO");
    if (candidate && state.executiveMandates.COO.permissions.includes("hiring")) return "hiring";
    if (state.executiveMandates.COO.permissions.includes("training")) return "training";
    return candidate ? "hiring" : "training";
  }
  if (task.category === "market") return title.includes("campaign") || title.includes("growth") ? "campaigns" : "competitorResponse";
  if (task.category === "project") return task.ownerRole === "CTO" ? (title.includes("cyber") || title.includes("security") ? "patching" : "techProjects") : "localUpgrades";
  if (title.includes("compliance") || title.includes("regulatory")) return "compliance";
  if (title.includes("liquidity") || title.includes("funding")) return "funding";
  return "riskLimits";
}

function choiceScore(choice: NonNullable<InboxTask["decision"]>["choices"][number]) {
  const effect = choice.effect;
  return (effect.cash ?? 0) / 100_000 + (effect.customers ?? 0) / 20 + (effect.reputation ?? 0) * 3 + (effect.satisfaction ?? 0) * 2 + (effect.compliance ?? 0) * 3 + (effect.digitalLevel ?? 0) * 2 + (effect.cyberSecurity ?? 0) * 3 + (effect.boardConfidence ?? 0) * 2 + (effect.brandStrength ?? 0) * 2 - Math.max(0, effect.fraudLosses ?? 0) / 50_000;
}

function selectExecutiveChoice(state: GameState, task: InboxTask, role: ExecutiveRole) {
  if (!task.decision) return undefined;
  const ranked = [...task.decision.choices].sort((a, b) => choiceScore(b) - choiceScore(a));
  const roll = seededValue(`${state.worldSeed}-${state.day}-${task.id}-${role}-decision`);
  return roll <= executiveQuality(state, role) / 115 || ranked.length === 1 ? ranked[0] : ranked[Math.min(1, ranked.length - 1)];
}

function decisionRisk(choice: NonNullable<InboxTask["decision"]>["choices"][number] | undefined) {
  if (!choice) return 0;
  const effect = choice.effect;
  const downside = Math.max(0, -(effect.reputation ?? 0)) * 5 + Math.max(0, -(effect.compliance ?? 0)) * 6 + Math.max(0, -(effect.satisfaction ?? 0)) * 3 + Math.max(0, -(effect.boardConfidence ?? 0)) * 4 + Math.max(0, effect.fraudLosses ?? 0) / 20_000;
  return clamp(20 + downside, 5, 95);
}

function taskEstimate(state: GameState, task: InboxTask, role: ExecutiveRole) {
  const title = task.title.toLowerCase();
  if (task.decision) {
    const choice = selectExecutiveChoice(state, task, role);
    return { cost: Math.max(0, -(choice?.effect.cash ?? 0)), risk: decisionRisk(choice) };
  }
  if (task.category === "network") {
    const branch = findTaskBranch(state, task);
    if (title.includes("manager")) return { cost: 0, risk: 18 };
    if (title.includes("loss-making")) return { cost: 25_000, risk: 24 };
    return { cost: branch ? branch.level === 1 ? 1_150_000 : branch.level === 2 ? 2_100_000 : 0 : 125_000, risk: 38 };
  }
  if (task.category === "people") {
    const candidate = capacityCandidate(state, role);
    return { cost: candidate && taskPermission(state, task) === "hiring" ? round(candidate.salary * 1.5) : 45_000, risk: candidate ? 32 : 20 };
  }
  if (task.category === "market") return { cost: 75_000, risk: 34 };
  if (task.category === "project") return { cost: 60_000, risk: title.includes("cyber") || title.includes("security") ? 24 : 42 };
  if (task.category === "credit") {
    const collection = state.collectionCases.find((item) => item.id === task.sourceId);
    return { cost: collection && collection.daysPastDue >= 120 ? 20_000 : collection && collection.daysPastDue >= 90 ? 12_000 : 4_500, risk: collection && collection.daysPastDue >= 120 ? 68 : collection && collection.daysPastDue >= 90 ? 52 : 28 };
  }
  if (title.includes("compliance") || title.includes("regulatory")) return { cost: 90_000, risk: 22 };
  if (title.includes("liquidity") || title.includes("funding")) return { cost: Math.min(1_500_000, Math.max(350_000, round(state.deposits * .02))), risk: 30 };
  return { cost: 50_000, risk: 35 };
}

function branchUpgradeAuthorityReason(state: GameState, task: InboxTask, cost: number): string | null {
  if (task.category !== "network" || taskPermission(state, task) !== "localUpgrades") return null;
  const branch = findTaskBranch(state, task);
  if (!branch) return "The branch requiring approval could not be identified";
  if (branch.managerControl === false) return "Local operations are reserved for CEO control";
  const authority = branch.upgradeAuthority ?? "manual";
  if (authority === "manual") return "Branch upgrades are reserved for CEO approval";
  if (authority === "small" && (branch.level !== 1 || cost > 1_250_000)) return "The upgrade exceeds the branch's small-investment authority";
  if (authority === "profitable") {
    const capacityUse = (branch.localCustomers ?? 0) / Math.max(1, branch.capacity) * 100;
    const expectedGain = Math.max(28_000, (branch.lastMonthProfit ?? 0) * .28 + Math.max(0, capacityUse - 78) * 4_200);
    const paybackMonths = cost / Math.max(1, expectedGain);
    if (paybackMonths > 24) return `Expected payback of ${paybackMonths.toFixed(0)} months exceeds branch authority`;
  }
  return null;
}

export function getMandateAssessmentV88(state: GameState, task: InboxTask): MandateTaskAssessmentV88 {
  const role = effectiveRole(task);
  const permission = taskPermission(state, task);
  const executive = role ? state.employeeRoster.find((employee) => employee.executiveRole === role) : undefined;
  const estimate = role ? taskEstimate(state, task, role) : { cost: 0, risk: 100 };
  const alwaysCEO = task.urgency === "critical" || /acquisition|capital raise|executive dismissal/i.test(task.title);
  const authorityReason = role ? branchUpgradeAuthorityReason(state, task, estimate.cost) : null;
  let reason = "Within mandate";
  if (!role) reason = "No executive owner is assigned";
  else if (!executive) reason = `Appoint a ${role} first`;
  else if (alwaysCEO) reason = "Critical or strategic matters always stay with the CEO";
  else if (authorityReason) reason = authorityReason;
  else if (!state.executiveMandates[role].permissions.includes(permission)) reason = `${permission} is not included in the ${role} mandate`;
  else if (estimate.cost > state.executiveMandates[role].spendLimit) reason = `Authority required: ${estimate.cost.toLocaleString(state.locale)} ${state.currency}; mandate limit is ${state.executiveMandates[role].spendLimit.toLocaleString(state.locale)} ${state.currency}`;
  else if (estimate.risk > state.executiveMandates[role].riskLimit) reason = `Estimated risk ${estimate.risk.toFixed(0)} exceeds the mandate limit of ${state.executiveMandates[role].riskLimit.toFixed(0)}`;
  else if (!(task.category === "risk" && /liquidity|funding/i.test(task.title)) && state.cash < estimate.cost + 100_000) reason = "The bank does not have enough free cash for this action";
  const canExecute = reason === "Within mandate";
  return { role, executiveName: executive?.name, permission, canExecute, requiresCEO: !canExecute, reason, estimatedCost: estimate.cost, estimatedRisk: estimate.risk };
}

function logAction(state: GameState, entry: Omit<ManagementLogEntry, "id" | "day">): GameState {
  const log: ManagementLogEntry = { ...entry, id: `management-${state.day}-${entry.role}-${state.managementLog.length}`, day: state.day };
  return { ...state, managementLog: [log, ...state.managementLog].slice(0, 100) };
}
function markTask(state: GameState, taskId: string, status: "delegated" | "resolved") {
  return { ...state, ceoInbox: state.ceoInbox.map((item) => item.id === taskId ? { ...item, status } : item) };
}
function alreadyEscalated(state: GameState, task: InboxTask, role: ExecutiveRole) {
  return state.managementLog.some((entry) => entry.role === role && entry.outcome === "escalated" && entry.title === task.title && entry.day >= task.createdDay);
}
function taskDepartment(task: InboxTask) {
  const title = task.title.toLowerCase();
  if (title.includes("technology")) return "Technology" as const;
  if (title.includes("credit") || title.includes("collections")) return "Credit & Collections" as const;
  if (title.includes("finance") || title.includes("treasury")) return "Finance & Treasury" as const;
  if (title.includes("growth") || title.includes("marketing")) return "Customer Growth" as const;
  return "Branch Operations" as const;
}

function executePeopleTask(state: GameState, task: InboxTask, executiveId: string) {
  const candidate = capacityCandidate(state, "COO");
  const department = taskDepartment(task);
  if (candidate && taskPermission(state, task) === "hiring") {
    const cost = round(candidate.salary * 1.5);
    const employee = { ...candidate, executiveRole: null, department, reportsTo: executiveId, role: `${department} specialist`, assignedBranchId: null, workload: 72, wellbeing: Math.max(candidate.wellbeing ?? candidate.energy, 78), decisionHistory: [] };
    return { state: { ...state, cash: state.cash - cost, employees: state.employees + 1, employeeRoster: [...state.employeeRoster, employee], candidatePool: state.candidatePool.filter((item) => item.id !== candidate.id) }, amount: cost, detail: `${candidate.name} joined ${department}; headcount and sustainable capacity increased.` };
  }
  const cost = 45_000;
  return { state: { ...state, cash: state.cash - cost, employeeRoster: state.employeeRoster.map((employee) => employee.department === department ? { ...employee, skill: clamp(employee.skill + 2, 1, employee.potential ?? 100), performance: clamp((employee.performance ?? employee.skill) + 2, 1, 100), wellbeing: clamp((employee.wellbeing ?? employee.energy) + 4, 1, 100), workload: clamp((employee.workload ?? 80) - 5, 20, 130) } : employee) }, amount: cost, detail: `${department} received a targeted training and workload-recovery plan.` };
}

function executeNetworkTask(state: GameState, task: InboxTask, executiveId: string) {
  const branch = findTaskBranch(state, task);
  if (!branch) return { state, amount: 0, detail: "No matching branch could be changed automatically." };
  const title = task.title.toLowerCase();
  if (title.includes("manager")) {
    const used = new Set(state.branchOffices.map((item) => item.managerId).filter(Boolean));
    const manager = state.employeeRoster.filter((employee) => !employee.executiveRole && !used.has(employee.id) && employee.leadership >= 45).sort((a, b) => b.leadership + b.skill - a.leadership - a.skill)[0];
    if (!manager) return { state, amount: 0, detail: "No qualified internal manager was available." };
    return { state: { ...state, employeeRoster: state.employeeRoster.map((employee) => employee.id === manager.id ? { ...employee, assignedBranchId: branch.id, department: "Branch Operations" as const, reportsTo: executiveId } : employee), branchOffices: state.branchOffices.map((item) => item.id === branch.id ? { ...item, managerId: manager.id, managerMandate: "autonomous" as const, lastManagerAction: `${manager.name} appointed under the COO mandate.` } : item) }, amount: 0, detail: `${manager.name} was appointed to ${branch.name}.` };
  }
  if (title.includes("loss-making")) {
    const cost = 25_000;
    return { state: { ...state, cash: state.cash - cost, branchOffices: state.branchOffices.map((item) => item.id === branch.id ? { ...item, operatingPriority: "profitability" as const, localFocus: "business" as const, managerMandate: "guarded" as const, lastManagerAction: "COO initiated a profitability recovery plan." } : item) }, amount: cost, detail: `${branch.name} moved to a guarded profitability plan.` };
  }
  const cost = branch.level === 1 ? 1_150_000 : 2_100_000;
  const upgraded = startBranchUpgrade(state, branch.id);
  return { state: upgraded, amount: upgraded === state ? 0 : cost, detail: upgraded === state ? `${branch.name} could not start the upgrade.` : `${branch.name} started a level ${branch.level + 1} capacity upgrade.` };
}

function collectionActionFor(state: GameState, task: InboxTask): CollectionAction | undefined {
  const collection = state.collectionCases.find((item) => item.id === task.sourceId);
  if (!collection) return undefined;
  if (collection.daysPastDue >= 120 && state.executiveMandates.CRO.permissions.includes("collateral")) return "enforce-collateral";
  if (collection.daysPastDue >= 90) return "external-collections";
  return "payment-plan";
}

export function delegateInboxTaskV88(state: GameState, taskId: string): GameState {
  const task = state.ceoInbox.find((item) => item.id === taskId);
  if (!task || task.status !== "open") return state;
  const assessment = getMandateAssessmentV88(state, task);
  if (!assessment.role || !assessment.executiveName || !assessment.canExecute) {
    if (assessment.role && assessment.executiveName && !alreadyEscalated(state, task, assessment.role)) return logAction(state, { role: assessment.role, title: task.title, detail: assessment.reason, amount: assessment.estimatedCost || undefined, outcome: "escalated" });
    return state;
  }
  const role = assessment.role;
  const executive = state.employeeRoster.find((employee) => employee.executiveRole === role)!;
  const qualityFactor = .78 + executiveQuality(state, role) / 260;
  let next = state;
  let amount = assessment.estimatedCost;
  let detail = `${executive.name} completed the action under the ${state.executiveMandates[role].preset} mandate.`;

  if (task.decision) {
    const choice = selectExecutiveChoice(state, task, role);
    if (!choice) return state;
    next = resolveInboxDecision(next, task.id, choice.id);
    detail = `${executive.name} chose “${choice.label}”. Skill and leadership influenced the selection.`;
  } else if (task.category === "people") {
    const result = executePeopleTask(next, task, executive.id); next = result.state; amount = result.amount; detail = result.detail;
  } else if (task.category === "network") {
    const result = executeNetworkTask(next, task, executive.id); next = result.state; amount = result.amount; detail = result.detail;
    if (next === state) return logAction(state, { role, title: task.title, detail, outcome: "escalated" });
  } else if (task.category === "market") {
    const gained = Math.max(5, round(assessment.estimatedCost / 6_500 * qualityFactor));
    next = { ...next, cash: next.cash - assessment.estimatedCost, brandStrength: clamp(next.brandStrength + 1.4 * qualityFactor, 1, 100), reputation: clamp(next.reputation + .25 * qualityFactor, 1, 100), customers: next.customers + gained, customersGained: next.customersGained + gained };
    detail = `${executive.name} added ${gained} customers and strengthened the brand.`;
  } else if (task.category === "project") {
    const project = next.projects.find((item) => item.id === task.sourceId);
    next = { ...next, cash: next.cash - assessment.estimatedCost, cyberSecurity: task.ownerRole === "CTO" ? clamp(next.cyberSecurity + 4.5 * qualityFactor, 1, 100) : next.cyberSecurity, digitalLevel: task.ownerRole === "CTO" ? clamp(next.digitalLevel + .8 * qualityFactor, 1, 100) : next.digitalLevel, projects: next.projects.map((item) => item.id === task.sourceId ? { ...item, remainingDays: Math.max(1, item.remainingDays - round(4 * qualityFactor)), risk: clamp(item.risk - 5 * qualityFactor, 1, 100), status: "active" } : item) };
    detail = project ? `${executive.name} funded a recovery sprint for ${project.name}.` : `${executive.name} completed a targeted technology intervention.`;
  } else if (task.category === "credit") {
    const collection = next.collectionCases.find((item) => item.id === task.sourceId);
    const action = collectionActionFor(next, task);
    if (collection && action) {
      next = takeCollectionAction(next, collection.loanId, action, true);
      detail = `${executive.name} selected ${action.replace(/-/g, " ")} based on arrears, collateral authority and risk limit.`;
    }
  } else if (/compliance|regulatory/i.test(task.title)) {
    next = { ...next, cash: next.cash - assessment.estimatedCost, compliance: clamp(next.compliance + 5.5 * qualityFactor, 1, 100), riskScore: clamp(next.riskScore - 3 * qualityFactor, 1, 100), boardConfidence: clamp(next.boardConfidence + .7 * qualityFactor, 1, 100) };
    detail = `${executive.name} completed a proportional remediation plan.`;
  } else if (/liquidity|funding/i.test(task.title)) {
    const funding = assessment.estimatedCost;
    next = { ...next, cash: next.cash + funding, wholesaleFunding: next.wholesaleFunding + funding, wholesaleFundingRate: next.wholesaleFundingRate + .02, liquidityRatio: clamp(next.liquidityRatio + Math.max(1.5, funding / Math.max(1, next.deposits) * 100), 0, 100) };
    detail = `${executive.name} secured ${funding.toLocaleString(next.locale)} ${next.currency} of normal funding.`;
  } else {
    next = { ...next, cash: next.cash - assessment.estimatedCost, riskScore: clamp(next.riskScore - 2 * qualityFactor, 1, 100), boardConfidence: clamp(next.boardConfidence + .25 * qualityFactor, 1, 100) };
  }

  next = markTask(next, task.id, task.decision ? "resolved" : "delegated");
  next = logAction(next, { role, title: task.title, detail, amount: amount || undefined, outcome: task.decision ? "completed" : "reported" });
  return addEvent(next, createEvent(state.day, "positive", `${task.title} handled`, `${executive.name} acted under the ${state.executiveMandates[role].preset} ${role} mandate. ${detail}`));
}

function autoHandleInbox(state: GameState) {
  let next = state;
  for (const task of state.ceoInbox.filter((item) => item.status === "open" && item.ownerRole && item.urgency !== "critical")) next = delegateInboxTaskV88(next, task.id);
  return next;
}
function recentAction(state: GameState, role: ExecutiveRole, title: string, days = 28) {
  return state.managementLog.some((entry) => entry.role === role && entry.title === title && entry.day >= state.day - days && entry.outcome !== "escalated");
}
function queueMandateTask(state: GameState, task: InboxTask) {
  if (state.ceoInbox.some((item) => item.sourceId === task.sourceId && item.status === "open")) return state;
  return delegateInboxTaskV88({ ...state, ceoInbox: [task, ...state.ceoInbox].slice(0, 40) }, task.id);
}

function runRoleActions(state: GameState) {
  let next = state;
  if (next.employeeRoster.some((employee) => employee.executiveRole === "CFO") && next.liquidityRatio < 20 && !recentAction(next, "CFO", "Treasury liquidity intervention", 14)) next = queueMandateTask(next, { id: `mandate-liquidity-${next.day}`, createdDay: next.day, category: "risk", title: "Treasury liquidity intervention", summary: `Liquidity is ${next.liquidityRatio.toFixed(1)}%.`, urgency: next.liquidityRatio < 10 ? "critical" : "important", page: "risk", status: "open", ownerRole: "CFO", sourceId: "mandate-liquidity" });
  if (next.employeeRoster.some((employee) => employee.executiveRole === "CTO") && next.cyberSecurity < 76 && !recentAction(next, "CTO", "Cyber resilience intervention", 28)) next = queueMandateTask(next, { id: `mandate-cyber-${next.day}`, createdDay: next.day, category: "project", title: "Cyber resilience intervention", summary: `Cyber security is ${next.cyberSecurity.toFixed(0)}.`, urgency: next.cyberSecurity < 48 ? "critical" : "important", page: "network", status: "open", ownerRole: "CTO", sourceId: "mandate-cyber" });
  if (next.employeeRoster.some((employee) => employee.executiveRole === "CMO") && (next.brandStrength < 50 || next.customersLost > next.customersGained + 3) && !recentAction(next, "CMO", "Customer defence response", 28)) next = queueMandateTask(next, { id: `mandate-growth-${next.day}`, createdDay: next.day, category: "market", title: "Customer defence response", summary: "Customer momentum or brand strength is below target.", urgency: "important", page: "market", status: "open", ownerRole: "CMO", sourceId: "mandate-growth" });
  if (next.employeeRoster.some((employee) => employee.executiveRole === "CRO") && next.compliance < 75 && !recentAction(next, "CRO", "Compliance remediation", 28)) next = queueMandateTask(next, { id: `mandate-compliance-${next.day}`, createdDay: next.day, category: "risk", title: "Compliance remediation", summary: `Compliance is ${next.compliance.toFixed(0)}.`, urgency: next.compliance < 50 ? "critical" : "important", page: "risk", status: "open", ownerRole: "CRO", sourceId: "mandate-compliance" });
  const coo = next.employeeRoster.find((employee) => employee.executiveRole === "COO");
  const pressure = getWorkforceDepartments(next).filter((department) => department.department !== "Executive" && department.workload > 105).sort((a, b) => b.workload - a.workload)[0];
  if (coo && pressure && !recentAction(next, "COO", `${pressure.department} capacity plan`, 21)) next = queueMandateTask(next, { id: `mandate-capacity-${pressure.department}-${next.day}`, createdDay: next.day, category: "people", title: `${pressure.department} capacity plan`, summary: `${pressure.workload.toFixed(0)}% workload.`, urgency: pressure.workload > 122 ? "critical" : "important", page: "leadership", status: "open", ownerRole: "COO", sourceId: `mandate-capacity-${pressure.department}` });
  return next;
}

function refreshTalent(state: GameState) {
  const active = state.candidatePool.filter((candidate) => (candidate.availableUntilDay ?? state.day + 90) > state.day);
  const additions = active.length < 14 ? generateCandidateMarket(`${state.worldSeed}-${state.day}`, state.homeMarket, state.nameStyle, state.day, 18) : [];
  let next: GameState = { ...state, candidatePool: [...active, ...additions].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 22), employeeRoster: state.employeeRoster.map((employee) => ({ ...employee, skill: Math.min(employee.potential ?? employee.skill, employee.skill + ((employee.potential ?? employee.skill) > employee.skill && seededValue(`${state.worldSeed}-${state.day}-${employee.id}-growth`) > .55 ? 1 : 0)), quitRisk: clamp((employee.quitRisk ?? Math.max(5, 55 - employee.loyalty)) + ((employee.wellbeing ?? employee.energy) < 55 ? 4 : -1), 2, 95) })) };
  const poachable = next.employeeRoster.filter((employee) => !employee.executiveRole && (employee.performance ?? employee.skill) >= 82 && employee.loyalty < 58 && (employee.quitRisk ?? 0) > 45).sort((a, b) => (b.performance ?? b.skill) - (a.performance ?? a.skill))[0];
  if (poachable && seededValue(`${state.worldSeed}-${state.day}-${poachable.id}-poach`) > .76) next = addEvent({ ...next, employeeRoster: next.employeeRoster.filter((employee) => employee.id !== poachable.id), branchOffices: next.branchOffices.map((branch) => branch.managerId === poachable.id ? { ...branch, managerId: null, lastManagerAction: `${poachable.name} was recruited by a competitor.` } : branch), employees: Math.max(0, next.employees - 1) }, createEvent(state.day, "warning", `${poachable.name} joined a competitor`, "A high-performing employee left after loyalty and retention risk remained unresolved."));
  return next;
}

export function advanceDaysV889(state: GameState, days: number): GameState {
  let current = syncLegacyControls(repairCampaignState(state));
  for (let index = 0; index < days; index += 1) {
    const before = current.day;
    let next = advanceDaysV8(current, 1);
    if (next.day === before) break;
    next = autoHandleInbox(syncLegacyControls(repairCampaignState(next)));
    if (next.day % 7 === 0) next = runRoleActions(next);
    if (next.day % 30 === 0) next = syncLegacyControls(repairCampaignState(refreshTalent(next)));
    current = next;
  }
  return current;
}
