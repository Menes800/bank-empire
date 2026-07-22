import { deriveCampaignStage } from "../v4/gameplay";
import { generateDistrictsForMarket } from "../v4/catalog";
import { advanceDaysV8 } from "../v8/gameplay";
import { delegateInboxTask, takeCollectionAction } from "../v7/gameplay";
import type { BankProject, BranchProfile, CampaignStage, ExecutiveMandate, ExecutivePermission, ExecutiveRole, GameEvent, GameState, ManagementLogEntry, MandatePreset } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";
import { generateCandidateMarket, generateCompetitorEntrant, seededValue } from "./generation";

export type BranchFundingMode = "cash" | "financed";
const roles: ExecutiveRole[] = ["CFO", "COO", "CRO", "CMO", "CTO"];
const stageOrder: CampaignStage[] = ["startup", "regional", "national", "group", "empire"];

export const MANDATE_PERMISSION_LABELS: Record<ExecutiveRole, { key: ExecutivePermission; label: string }[]> = {
  COO: [["hiring", "Hire within approved headcount"], ["transfers", "Move people between teams"], ["retention", "Approve retention actions"], ["training", "Approve training plans"], ["branchManagers", "Appoint branch managers"], ["layoffs", "Reduce local headcount"], ["localUpgrades", "Approve local upgrades"]].map(([key, label]) => ({ key: key as ExecutivePermission, label })),
  CFO: [["liquidity", "Manage liquidity buffer"], ["funding", "Secure normal funding"], ["rates", "Adjust treasury pricing"], ["capitalBuffer", "Protect capital buffer"], ["investments", "Approve minor investments"]].map(([key, label]) => ({ key: key as ExecutivePermission, label })),
  CRO: [["lending", "Handle routine lending"], ["creditTerms", "Adjust credit terms"], ["collections", "Run collections"], ["collateral", "Realise collateral"], ["compliance", "Run compliance remediation"], ["riskLimits", "Adjust risk limits"]].map(([key, label]) => ({ key: key as ExecutivePermission, label })),
  CMO: [["campaigns", "Launch campaigns"], ["marketingBudget", "Allocate marketing budget"], ["competitorResponse", "Respond to competitors"], ["customerSegments", "Prioritise customer groups"], ["localGrowth", "Approve local growth actions"]].map(([key, label]) => ({ key: key as ExecutivePermission, label })),
  CTO: [["cyberIncidents", "Handle cyber incidents"], ["patching", "Approve patching"], ["vendors", "Manage technology vendors"], ["itPurchases", "Approve IT purchases"], ["technicalDebt", "Reduce technical debt"], ["techProjects", "Approve minor tech projects"]].map(([key, label]) => ({ key: key as ExecutivePermission, label })),
};

const cautious: Record<ExecutiveRole, ExecutivePermission[]> = {
  COO: ["transfers", "training", "branchManagers"], CFO: ["liquidity", "capitalBuffer"], CRO: ["lending", "collections", "compliance"], CMO: ["customerSegments", "competitorResponse"], CTO: ["cyberIncidents", "patching"],
};
const balanced: Record<ExecutiveRole, ExecutivePermission[]> = {
  COO: ["hiring", "transfers", "retention", "training", "branchManagers", "localUpgrades"], CFO: ["liquidity", "funding", "rates", "capitalBuffer", "investments"], CRO: ["lending", "creditTerms", "collections", "compliance", "riskLimits"], CMO: ["campaigns", "marketingBudget", "competitorResponse", "customerSegments", "localGrowth"], CTO: ["cyberIncidents", "patching", "vendors", "itPurchases", "technicalDebt"],
};

function mandate(role: ExecutiveRole, preset: Exclude<MandatePreset, "custom">): ExecutiveMandate {
  return {
    role,
    preset,
    permissions: preset === "cautious" ? cautious[role] : preset === "balanced" ? balanced[role] : MANDATE_PERMISSION_LABELS[role].map((item) => item.key),
    spendLimit: preset === "cautious" ? 75_000 : preset === "balanced" ? 350_000 : 1_500_000,
    riskLimit: preset === "cautious" ? 25 : preset === "balanced" ? 50 : 75,
    alwaysEscalate: ["Critical regulatory breach", "Executive dismissal", "Acquisition", "Capital raise", "Action above spend limit"],
  };
}

export function defaultExecutiveMandates(): Record<ExecutiveRole, ExecutiveMandate> {
  return { CFO: mandate("CFO", "balanced"), COO: mandate("COO", "balanced"), CRO: mandate("CRO", "balanced"), CMO: mandate("CMO", "balanced"), CTO: mandate("CTO", "balanced") };
}

function logAction(state: GameState, entry: Omit<ManagementLogEntry, "id" | "day">): GameState {
  const log: ManagementLogEntry = { ...entry, id: `management-${state.day}-${entry.role}-${state.managementLog.length}`, day: state.day };
  return { ...state, managementLog: [log, ...state.managementLog].slice(0, 100) };
}

export function setExecutiveMandatePreset(state: GameState, role: ExecutiveRole, preset: Exclude<MandatePreset, "custom">): GameState {
  return { ...state, executiveMandates: { ...state.executiveMandates, [role]: mandate(role, preset) } };
}
export function toggleExecutivePermission(state: GameState, role: ExecutiveRole, permission: ExecutivePermission): GameState {
  const current = state.executiveMandates[role];
  const permissions = current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission];
  return { ...state, executiveMandates: { ...state.executiveMandates, [role]: { ...current, preset: "custom", permissions } } };
}
export function updateExecutiveMandateLimits(state: GameState, role: ExecutiveRole, patch: Partial<Pick<ExecutiveMandate, "spendLimit" | "riskLimit">>): GameState {
  const current = state.executiveMandates[role];
  return { ...state, executiveMandates: { ...state.executiveMandates, [role]: { ...current, preset: "custom", spendLimit: patch.spendLimit === undefined ? current.spendLimit : clamp(patch.spendLimit, 0, 25_000_000), riskLimit: patch.riskLimit === undefined ? current.riskLimit : clamp(patch.riskLimit, 0, 100) } } };
}

function stageRequirements(stage: CampaignStage, state: GameState): string[] {
  if (stage === "startup") return [];
  const targets: { customers: number; branches: number; reputation?: number; digital?: number; marketShare?: number } = {
    regional: { customers: 1_200, branches: 2, reputation: 55 },
    national: { customers: 4_000, branches: 3, digital: 58 },
    group: { customers: 12_000, branches: 5, reputation: 72 },
    empire: { customers: 30_000, branches: 8, marketShare: 18 },
  }[stage];
  const reasons: string[] = [];
  if (state.customers < targets.customers) reasons.push(`${targets.customers.toLocaleString("en-GB")} customers (${state.customers.toLocaleString("en-GB")} now)`);
  if (state.branchOffices.length < targets.branches) reasons.push(`${targets.branches} operating branches (${state.branchOffices.length} now)`);
  if (targets.reputation !== undefined && state.reputation < targets.reputation) reasons.push(`Reputation ${targets.reputation} (${state.reputation.toFixed(0)} now)`);
  if (targets.digital !== undefined && state.digitalLevel < targets.digital) reasons.push(`Digital level ${targets.digital} (${state.digitalLevel.toFixed(0)} now)`);
  if (targets.marketShare !== undefined && state.marketShare < targets.marketShare) reasons.push(`Market share ${targets.marketShare}% (${state.marketShare.toFixed(1)}% now)`);
  return reasons;
}

export function getExpansionAssessmentV88(state: GameState, districtId: string) {
  const game = repairCampaignState(state);
  const district = game.districts.find((item) => item.id === districtId);
  if (!district) return { allowed: false, cashAllowed: false, financeAllowed: false, status: "missing" as const, reasons: ["Market not found"], cashReasons: ["Market not found"], financeReasons: ["Market not found"], upfront: 0, financedAmount: 0 };
  const existingBranches = game.branchOffices.filter((branch) => branch.districtId === districtId).length;
  const maxBranches = Math.max(1, district.maxBranches ?? 1);
  const occupied = existingBranches > 0;
  const atCapacity = existingBranches >= maxBranches;
  const activeProject = game.projects.some((project) => project.districtId === districtId && project.status !== "completed");
  const stageLocked = stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(district.requiredStage);
  const hard: string[] = [];
  if (atCapacity) hard.push(`This market has reached its limit of ${maxBranches} branch${maxBranches === 1 ? "" : "es"}`);
  if (activeProject) hard.push("An expansion project is already active here");
  if (stageLocked) hard.push(`Unlock ${district.requiredStage} stage`, ...stageRequirements(district.requiredStage, game));
  const upfront = round(district.openingCost * .3);
  const financedAmount = district.openingCost - upfront;
  const cashReasons = [...hard];
  const financeReasons = [...hard];
  if (game.cash < district.openingCost) cashReasons.push(`Need ${district.openingCost.toLocaleString(game.locale)} ${game.currency} in liquid cash`);
  if (game.cash < upfront) financeReasons.push(`Need ${upfront.toLocaleString(game.locale)} ${game.currency} upfront`);
  if (game.boardConfidence < 45) financeReasons.push(`Board confidence 45 required (${game.boardConfidence.toFixed(0)} now)`);
  if (game.liquidityRatio < 12) financeReasons.push(`Liquidity 12% required (${game.liquidityRatio.toFixed(1)}% now)`);
  const cashAllowed = cashReasons.length === 0;
  const financeAllowed = financeReasons.length === 0;
  return { allowed: cashAllowed || financeAllowed, cashAllowed, financeAllowed, status: atCapacity ? "owned" as const : activeProject ? "project" as const : stageLocked ? "locked" as const : cashAllowed || financeAllowed ? "available" as const : "funding" as const, reasons: [...new Set([...cashReasons, ...financeReasons])], cashReasons, financeReasons, upfront, financedAmount, existingBranches, maxBranches, occupied };
}

export function startBranchProjectV88(state: GameState, districtId: string, profile: BranchProfile, fundingMode: BranchFundingMode): GameState {
  const game = repairCampaignState(state);
  const district = game.districts.find((item) => item.id === districtId);
  const assessment = getExpansionAssessmentV88(game, districtId);
  if (!district || fundingMode === "cash" && !assessment.cashAllowed || fundingMode === "financed" && !assessment.financeAllowed) return game;
  const duration = 62 + round(district.competition * .28);
  const funding = fundingMode === "financed" ? assessment.financedAmount : 0;
  const project: BankProject = { id: `project-branch-${districtId}-${game.day}`, name: `Open ${district.name}`, kind: "branch", status: "active", startDay: game.day, durationDays: duration, remainingDays: duration, budget: district.openingCost, spent: 0, risk: 18 + district.competition * .3, districtId, profile };
  const next = { ...game, cash: game.cash - (fundingMode === "cash" ? district.openingCost : assessment.upfront), wholesaleFunding: game.wholesaleFunding + funding, wholesaleFundingRate: funding ? game.wholesaleFundingRate + .04 : game.wholesaleFundingRate, projects: [project, ...game.projects] };
  return addEvent(next, createEvent(game.day, "neutral", "Branch expansion approved", fundingMode === "financed" ? `${district.name} enters delivery with ${assessment.upfront.toLocaleString(game.locale)} ${game.currency} upfront and project funding for the balance.` : `${district.name} enters delivery and is fully funded from liquid cash.`));
}

function metric(state: GameState, key: GameState["objectives"][number]["metric"]): number {
  return key === "customers" ? state.customers : key === "profit" ? state.totalProfit : key === "reputation" ? state.reputation : key === "capitalRatio" ? state.capitalRatio : key === "liquidityRatio" ? state.liquidityRatio : key === "compliance" ? state.compliance : state.marketShare;
}
function completeObjectives(state: GameState): GameState {
  let cash = 0, reputation = 0;
  const objectives = state.objectives.map((item) => {
    if (item.completed || item.failed || metric(state, item.metric) < item.target) return item;
    cash += item.rewardCash; reputation += item.rewardReputation; return { ...item, completed: true };
  });
  return cash || reputation ? addEvent({ ...state, objectives, cash: state.cash + cash, reputation: clamp(state.reputation + reputation, 1, 100) }, createEvent(state.day, "positive", "Board objective completed", "An already-achieved board target was closed automatically and its reward was applied.")) : { ...state, objectives };
}
function consolidateEvents(events: GameEvent[]): GameEvent[] {
  const groups: Array<{ key: string; event: GameEvent; count: number }> = [];
  for (const event of [...events].sort((a, b) => b.day - a.day)) {
    const key = event.title.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
    const found = groups.find((group) => group.key === key && Math.abs(group.event.day - event.day) <= 30);
    if (found) found.count += 1; else groups.push({ key, event, count: 1 });
  }
  return groups.map(({ event, count }) => count > 1 ? { ...event, body: `${event.body} Consolidated from ${count} related updates.` } : event).sort((a, b) => b.day - a.day).slice(0, 80);
}
function hydrateMandates(state: GameState): Record<ExecutiveRole, ExecutiveMandate> {
  const defaults = defaultExecutiveMandates();
  return roles.reduce((all, role) => { const current = state.executiveMandates?.[role]; all[role] = current ? { ...defaults[role], ...current, permissions: current.permissions ?? defaults[role].permissions, alwaysEscalate: current.alwaysEscalate ?? defaults[role].alwaysEscalate } : defaults[role]; return all; }, {} as Record<ExecutiveRole, ExecutiveMandate>);
}

function hydrateDistricts(state: GameState) {
  const generated = generateDistrictsForMarket(state.homeMarket ?? "NO");
  const current = new Map((state.districts ?? []).map((district) => [district.id, district]));
  return generated.map((district) => {
    const saved = current.get(district.id);
    return saved ? {
      ...district,
      ...saved,
      name: district.name,
      city: district.city,
      region: district.region,
      description: district.description,
      maxBranches: district.maxBranches,
      mapX: district.mapX,
      mapY: district.mapY,
    } : district;
  });
}

function hydrateCompetitors(state: GameState) {
  const competitors = [...(state.competitors ?? [])];
  const entrants: GameState["competitors"] = [];
  while (competitors.length < 7) {
    const entrantIndex = competitors.length + (state.competitorHistory?.length ?? 0);
    const entrant = generateCompetitorEntrant(state.worldSeed, state.homeMarket ?? "NO", state.day, entrantIndex, competitors.map((item) => item.name));
    competitors.push(entrant);
    entrants.push(entrant);
  }
  const totalCustomers = Math.max(1, state.customers + competitors.reduce((sum, competitor) => sum + Math.max(0, competitor.customers), 0));
  return {
    competitors: competitors.slice(0, 8).map((competitor) => ({ ...competitor, marketShare: Math.max(0, competitor.customers) / totalCustomers * 100 })),
    entrants,
  };
}

function hydrateBranchNetwork(state: GameState, districts: GameState["districts"]) {
  const districtById = new Map(districts.map((district) => [district.id, district]));
  const counts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  const availableDistricts = districts.flatMap((district) => Array.from({ length: Math.max(1, district.maxBranches) }, () => district.id));
  let slotCursor = 0;

  return state.branchOffices.map((branch) => {
    let districtId = districtById.has(branch.districtId) ? branch.districtId : districts[0]?.id ?? branch.districtId;
    const district = districtById.get(districtId);
    const currentCount = counts.get(districtId) ?? 0;
    if (branch.id.startsWith("branch-acquired-") && district && currentCount >= district.maxBranches) {
      const nextDistrict = availableDistricts.slice(slotCursor).find((id) => (counts.get(id) ?? 0) < (districtById.get(id)?.maxBranches ?? 1));
      if (nextDistrict) {
        districtId = nextDistrict;
        slotCursor = Math.max(slotCursor, availableDistricts.indexOf(nextDistrict));
      }
    }
    counts.set(districtId, (counts.get(districtId) ?? 0) + 1);
    const assignedDistrict = districtById.get(districtId);
    const profileLabel = branch.profile === "mortgage" ? "Mortgage Centre" : branch.profile === "wealth" ? "Private Bank" : branch.profile === "business" ? "Business Hub" : "Branch";
    const naturalName = `${assignedDistrict?.city ?? assignedDistrict?.name ?? branch.name} ${profileLabel}`;
    const occurrence = (nameCounts.get(naturalName) ?? 0) + 1;
    nameCounts.set(naturalName, occurrence);
    return {
      ...branch,
      districtId,
      name: branch.id.startsWith("branch-acquired-") ? `${naturalName}${occurrence > 1 ? ` ${occurrence}` : ""}` : branch.name,
      portfolioStatus: branch.portfolioStatus ?? "stable",
      recoveryPlan: branch.recoveryPlan ?? null,
      underperformingMonths: branch.underperformingMonths ?? 0,
      cooLastReviewDay: branch.cooLastReviewDay ?? 0,
    };
  });
}

export function repairCampaignState(state: GameState): GameState {
  const current = Math.max(0, stageOrder.indexOf(state.campaignStage));
  const derived = Math.max(0, stageOrder.indexOf(deriveCampaignStage(state)));
  const worldSeed = state.worldSeed || Math.abs(Math.round(seededValue(`${state.bankName}-${state.founderName}`) * 2_000_000_000));
  const candidates = state.candidatePool?.length >= 10 ? state.candidatePool : [...(state.candidatePool ?? []), ...generateCandidateMarket(worldSeed, state.homeMarket ?? "NO", state.nameStyle ?? "mixed", state.day, 18)].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 20);
  const districts = hydrateDistricts(state);
  const field = hydrateCompetitors(state);
  const competitors = field.competitors;
  const branchOffices = hydrateBranchNetwork(state, districts);
  const totalMarketCustomers = Math.max(1, state.customers + competitors.reduce((sum, competitor) => sum + competitor.customers, 0));
  const policy = state.cooNetworkPolicy;
  const next: GameState = {
    ...state, version: 88, currency: state.currency ?? "NOK", homeMarket: state.homeMarket ?? "NO", locale: state.locale ?? "nb-NO", nameStyle: state.nameStyle ?? "mixed",
    bankMark: state.bankMark || state.bankName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), slogan: state.slogan ?? "Built for lasting trust.", firstBranchName: state.firstBranchName ?? state.branchOffices[0]?.name ?? "Central Branch", founderStory: state.founderStory ?? "Built from one branch, disciplined growth and clear accountability.", worldSeed,
    campaignStage: stageOrder[Math.max(current, derived)], executiveMandates: hydrateMandates(state), managementLog: state.managementLog ?? [], candidatePool: candidates,
    cooNetworkPolicy: {
      enabled: policy?.enabled ?? true,
      priority: policy?.priority ?? "profitability",
      investmentLimit: policy?.investmentLimit ?? 1_500_000,
      reviewDays: policy?.reviewDays ?? 90,
      breakEvenDays: policy?.breakEvenDays ?? 180,
      autoHireManagers: policy?.autoHireManagers ?? true,
    },
    districts,
    branchOffices: branchOffices.map((branch, index) => index === 0 && state.firstBranchName && branch.openedDay === 1 ? { ...branch, name: state.firstBranchName } : branch),
    competitors,
    competitorHistory: (state.competitorHistory ?? []).slice(0, 24),
    competitorMoves: [
      ...field.entrants.map((entrant) => ({ id: `move-entry-${entrant.id}-${state.day}`, day: state.day, competitorId: entrant.id, competitorName: entrant.name, type: "entry" as const, title: `${entrant.name} entered the market`, description: `${entrant.name} launched as a ${entrant.strategy} bank focused on ${entrant.specialty?.toLowerCase() ?? "a defined customer segment"}.`, impact: 4 })),
      ...(state.competitorMoves ?? []),
    ].slice(0, 18),
    marketShare: state.customers / totalMarketCustomers * 100,
    events: consolidateEvents(state.events ?? []),
  };
  return completeObjectives(next);
}

function permission(task: GameState["ceoInbox"][number]): ExecutivePermission {
  if (task.category === "network") return task.title.toLowerCase().includes("upgrade") ? "localUpgrades" : "branchManagers";
  if (task.category === "credit") return "collections";
  if (task.category === "people") return "hiring";
  if (task.category === "market") return "competitorResponse";
  if (task.category === "project") return task.ownerRole === "CTO" ? "techProjects" : "localUpgrades";
  return task.title.toLowerCase().includes("compliance") ? "compliance" : "liquidity";
}
function autoHandleInbox(state: GameState): GameState {
  let next = state;
  for (const task of state.ceoInbox.filter((item) => item.status === "open" && item.ownerRole && item.urgency !== "critical")) {
    const role = task.ownerRole as ExecutiveRole;
    const executive = next.employeeRoster.find((employee) => employee.executiveRole === role);
    if (!executive || !next.executiveMandates[role].permissions.includes(permission(task))) continue;
    const handled = delegateInboxTask(next, task.id);
    if (handled !== next) next = logAction(handled, { role, title: task.title, detail: `${executive.name} handled this under the ${next.executiveMandates[role].preset} mandate and reported after execution.`, outcome: "reported" });
  }
  return next;
}

function runRoleActions(state: GameState): GameState {
  let next = state;
  const executive = (role: ExecutiveRole) => next.employeeRoster.find((employee) => employee.executiveRole === role);
  const cfo = executive("CFO");
  if (cfo && next.executiveMandates.CFO.permissions.includes("funding") && next.liquidityRatio < Math.max(12, next.executiveMandates.CFO.riskLimit * .4)) {
    const amount = Math.min(Math.max(200_000, next.deposits * .015), Math.max(200_000, next.executiveMandates.CFO.spendLimit * 2));
    next = logAction({ ...next, cash: next.cash + amount, wholesaleFunding: next.wholesaleFunding + amount, liquidityRatio: clamp(next.liquidityRatio + 2.5, 0, 100) }, { role: "CFO", title: "Liquidity buffer restored", detail: `${cfo.name} secured normal funding inside the treasury mandate.`, amount, outcome: "completed" });
  }
  const cmo = executive("CMO");
  if (cmo && next.executiveMandates.CMO.permissions.includes("campaigns") && next.cash > 900_000) {
    const spend = Math.min(75_000, next.executiveMandates.CMO.spendLimit);
    if (spend) next = logAction({ ...next, cash: next.cash - spend, brandStrength: clamp(next.brandStrength + 1.2, 1, 100), customers: next.customers + Math.max(3, round(spend / 8_000)) }, { role: "CMO", title: "Local growth campaign", detail: `${cmo.name} allocated a targeted campaign within the approved ceiling.`, amount: spend, outcome: "completed" });
  }
  const cto = executive("CTO");
  if (cto && next.executiveMandates.CTO.permissions.includes("patching") && next.cyberSecurity < 78 && next.cash > 700_000) {
    const spend = Math.min(60_000, next.executiveMandates.CTO.spendLimit);
    if (spend) next = logAction({ ...next, cash: next.cash - spend, cyberSecurity: clamp(next.cyberSecurity + 4.5, 1, 100), digitalLevel: clamp(next.digitalLevel + .7, 1, 100) }, { role: "CTO", title: "Security patch programme", detail: `${cto.name} approved routine patching and supplier work.`, amount: spend, outcome: "completed" });
  }
  const coo = executive("COO");
  if (coo && next.executiveMandates.COO.permissions.includes("branchManagers")) {
    const used = new Set(next.branchOffices.map((branch) => branch.managerId).filter(Boolean));
    const vacancy = next.branchOffices.find((branch) => !branch.managerId && branch.managerControl);
    const manager = next.employeeRoster.filter((employee) => !employee.executiveRole && !used.has(employee.id) && employee.leadership >= 45).sort((a, b) => b.leadership + b.skill - a.leadership - a.skill)[0];
    if (vacancy && manager) next = logAction({ ...next, employeeRoster: next.employeeRoster.map((employee) => employee.id === manager.id ? { ...employee, assignedBranchId: vacancy.id, department: "Branch Operations", reportsTo: coo.id } : employee), branchOffices: next.branchOffices.map((branch) => branch.id === vacancy.id ? { ...branch, managerId: manager.id, managerMandate: "autonomous", lastManagerAction: `${coo.name} appointed ${manager.name}.` } : branch) }, { role: "COO", title: `Manager appointed at ${vacancy.name}`, detail: `${manager.name} was promoted from the internal roster.`, outcome: "completed" });
  }
  const cro = executive("CRO");
  const collection = next.collectionCases.find((item) => !item.closed);
  if (cro && collection && next.executiveMandates.CRO.permissions.includes("collections")) {
    const loan = next.activeLoans.find((item) => item.id === collection.loanId);
    if (loan) { const action = loan.daysPastDue >= 90 && next.executiveMandates.CRO.permissions.includes("collateral") ? "external-collections" : "payment-plan"; const handled = takeCollectionAction(next, loan.id, action, true); if (handled !== next) next = logAction(handled, { role: "CRO", title: `${collection.customerName} collections action`, detail: `${cro.name} selected ${action.replace("-", " ")} within mandate.`, outcome: "completed" }); }
  }
  return next;
}

function refreshTalent(state: GameState): GameState {
  const active = state.candidatePool.filter((candidate) => (candidate.availableUntilDay ?? state.day + 90) > state.day);
  const additions = active.length < 14 ? generateCandidateMarket(`${state.worldSeed}-${state.day}`, state.homeMarket, state.nameStyle, state.day, 18) : [];
  let next: GameState = { ...state, candidatePool: [...active, ...additions].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 22), employeeRoster: state.employeeRoster.map((employee) => ({ ...employee, skill: Math.min(employee.potential ?? employee.skill, employee.skill + ((employee.potential ?? employee.skill) > employee.skill && seededValue(`${state.worldSeed}-${state.day}-${employee.id}-growth`) > .55 ? 1 : 0)), quitRisk: clamp((employee.quitRisk ?? Math.max(5, 55 - employee.loyalty)) + ((employee.wellbeing ?? employee.energy) < 55 ? 4 : -1), 2, 95) })) };
  const poachable = next.employeeRoster.filter((employee) => !employee.executiveRole && (employee.performance ?? employee.skill) >= 82 && employee.loyalty < 58 && (employee.quitRisk ?? 0) > 45).sort((a, b) => (b.performance ?? b.skill) - (a.performance ?? a.skill))[0];
  if (poachable && seededValue(`${state.worldSeed}-${state.day}-${poachable.id}-poach`) > .76) next = addEvent({ ...next, employeeRoster: next.employeeRoster.filter((employee) => employee.id !== poachable.id), branchOffices: next.branchOffices.map((branch) => branch.managerId === poachable.id ? { ...branch, managerId: null, lastManagerAction: `${poachable.name} was recruited by a competitor.` } : branch), employees: Math.max(0, next.employees - 1) }, createEvent(state.day, "warning", `${poachable.name} joined a competitor`, "A high-performing employee left after loyalty and retention risk remained unresolved."));
  return next;
}

export function reputationDelta30(state: GameState): number {
  const previous = [...state.history].reverse().find((point) => point.day <= state.day - 30)?.reputation ?? state.history[0]?.reputation ?? state.reputation;
  return state.reputation - previous;
}
export function advanceDaysV88(state: GameState, days: number): GameState {
  let current = repairCampaignState(state);
  for (let index = 0; index < days; index += 1) {
    const before = current.day;
    let next = advanceDaysV8(current, 1);
    if (next.day === before) break;
    next = autoHandleInbox(repairCampaignState(next));
    if (next.day % 30 === 0) next = repairCampaignState(refreshTalent(runRoleActions(next)));
    current = next;
  }
  return current;
}
