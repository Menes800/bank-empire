import type { BranchOffice, CEOInboxTask, ExecutiveRole, GameState } from "../types";
import { TECH_CATALOG_V9, type TechnologyEffectsV9, type TechnologyNodeV9 } from "./catalog";
export { TECH_CATALOG_V9 } from "./catalog";
export type { TechnologyEffectsV9, TechnologyNodeV9, TechnologyTrackV9 } from "./catalog";

export type DensityModeV9 = "comfortable" | "compact";
export type BranchLevelV9 = 1 | 2 | 3 | 4 | 5;
export type TechnologyStatusV9 = "locked" | "available" | "researching" | "completed";
export type UpgradeAuthorityV9 = "manual" | "small" | "profitable" | "full";
export type BranchSpecializationV9 =
  | "standard"
  | "regional-hub"
  | "flagship"
  | "business-centre"
  | "mortgage-centre"
  | "wealth-office"
  | "self-service"
  | "digital-advisory"
  | "operations-hub";
export type TechnologyProgressV9 = {
  id: string;
  level: number;
  status: TechnologyStatusV9;
  activeProjectId?: string;
  completedDay?: number;
};

export type BranchRecommendationV9 = {
  id: "campaign" | "staffing" | "priority" | "specialize" | "digitalize" | "upgrade" | "downscale" | "close";
  title: string;
  description: string;
  costNow: number;
  expectedMonthlyEffect: number;
  capacityChange: number;
  risk: "low" | "medium" | "high";
  breakEvenMonths: number | null;
};

export type BranchLedgerV9 = {
  day: number;
  income: {
    depositMargin: number;
    loanInterest: number;
    feesAndServices: number;
    businessBanking: number;
    wealthAndProducts: number;
    total: number;
  };
  costs: {
    salaries: number;
    premises: number;
    localMarketing: number;
    technologyProcessing: number;
    creditLosses: number;
    otherOperating: number;
    total: number;
  };
  profit: number;
  mainProblem: string;
  breakEvenCustomers: number;
  additionalCustomersToBreakEven: number;
  breakEvenDeposits: number;
  breakEvenLoans: number;
  currentCapacity: number;
  expectedCapacity: number;
  forecast30: number;
  forecast90: number;
  forecast180: number;
  ageMonths: number;
  openingPhase: boolean;
  lossClassification: "profitable" | "expected-opening-loss" | "structural-loss" | "temporary-loss";
  recommendations: BranchRecommendationV9[];
};

export type BranchOperationsV9 = {
  effectiveLevel: BranchLevelV9;
  specialization: BranchSpecializationV9;
  lossStreak: number;
  upgradeAuthority: UpgradeAuthorityV9;
  ledger?: BranchLedgerV9;
  pendingProjectId?: string;
  lastCooAction?: string;
};

export type ManagementReportV9 = {
  id: string;
  day: number;
  ownerRole: ExecutiveRole;
  category: CEOInboxTask["category"];
  title: string;
  summary: string;
  handledCount: number;
  itemTitles: string[];
};

export type V9State = {
  schemaVersion: 9;
  density: DensityModeV9;
  branches: Record<string, BranchOperationsV9>;
  technologies: Record<string, TechnologyProgressV9>;
  managementReports: ManagementReportV9[];
  inboxArchive: CEOInboxTask[];
  autoArchiveDays: number;
  devTechUnlocked: boolean;
  lastManagementCycleDay: number;
};

export type GameStateWithV9 = GameState & { v9?: V9State };

const zeroEffects: TechnologyEffectsV9 = {
  operatingCostReduction: 0,
  digitalCapacity: 0,
  staffEfficiency: 0,
  creditSpeed: 0,
  fraudReduction: 0,
  compliance: 0,
  cyber: 0,
  projectSpeed: 0,
  feeIncome: 0,
};



function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }
function round(value: number) { return Math.round(value); }

function defaultSpecialization(branch: BranchOffice): BranchSpecializationV9 {
  if (branch.profile === "business") return "business-centre";
  if (branch.profile === "mortgage") return "mortgage-centre";
  if (branch.profile === "wealth") return "wealth-office";
  return "standard";
}

function createTechnologyProgress(): Record<string, TechnologyProgressV9> {
  return Object.fromEntries(TECH_CATALOG_V9.map((node) => [node.id, { id: node.id, level: 0, status: node.prerequisites.length === 0 ? "available" : "locked" }])) as Record<string, TechnologyProgressV9>;
}

function createBranchOperations(branch: BranchOffice): BranchOperationsV9 {
  return {
    effectiveLevel: branch.level,
    specialization: defaultSpecialization(branch),
    lossStreak: (branch.lastMonthProfit ?? 0) < 0 ? 1 : 0,
    upgradeAuthority: branch.upgradeAuthority ?? "profitable",
  };
}

export function createInitialV9State(state: GameState): V9State {
  return {
    schemaVersion: 9,
    density: "comfortable",
    branches: Object.fromEntries(state.branchOffices.map((branch) => [branch.id, createBranchOperations(branch)])),
    technologies: createTechnologyProgress(),
    managementReports: [],
    inboxArchive: [],
    autoArchiveDays: 90,
    devTechUnlocked: false,
    lastManagementCycleDay: 0,
  };
}

export function readV9(state: GameState): V9State {
  const existing = (state as GameStateWithV9).v9;
  if (!existing) return createInitialV9State(state);
  const technologies = { ...createTechnologyProgress(), ...(existing.technologies ?? {}) };
  const branches = { ...(existing.branches ?? {}) };
  for (const branch of state.branchOffices) branches[branch.id] = { ...createBranchOperations(branch), ...(branches[branch.id] ?? {}) };
  return {
    ...existing,
    schemaVersion: 9,
    density: existing.density ?? "comfortable",
    branches,
    technologies,
    managementReports: existing.managementReports ?? [],
    inboxArchive: existing.inboxArchive ?? [],
    autoArchiveDays: existing.autoArchiveDays ?? 90,
    devTechUnlocked: existing.devTechUnlocked ?? false,
    lastManagementCycleDay: existing.lastManagementCycleDay ?? 0,
  };
}

export function writeV9(state: GameState, v9: V9State): GameState {
  return { ...state, v9 } as GameState;
}

export function ensureV9State(state: GameState): GameState {
  return writeV9(state, readV9(state));
}

export function getBranchOperationsV9(state: GameState, branchId: string): BranchOperationsV9 {
  const branch = state.branchOffices.find((item) => item.id === branchId);
  const existing = readV9(state).branches[branchId];
  return existing ?? (branch ? createBranchOperations(branch) : { effectiveLevel: 1, specialization: "standard", lossStreak: 0, upgradeAuthority: "profitable" });
}

export function getTechnologyEffectsV9(state: GameState): TechnologyEffectsV9 {
  const v9 = readV9(state);
  return TECH_CATALOG_V9.reduce((total, node) => {
    const level = v9.technologies[node.id]?.level ?? 0;
    if (level <= 0) return total;
    for (const [key, value] of Object.entries(node.effects) as Array<[keyof TechnologyEffectsV9, number]>) total[key] += value * level;
    return total;
  }, { ...zeroEffects });
}

export function technologyAvailabilityV9(state: GameState, node: TechnologyNodeV9) {
  const v9 = readV9(state);
  const progress = v9.technologies[node.id] ?? { id: node.id, level: 0, status: "locked" as const };
  const prerequisitesMet = v9.devTechUnlocked || node.prerequisites.every((required) => (v9.technologies[required.id]?.level ?? 0) >= required.level);
  const maxed = progress.level >= node.maxLevel;
  const researching = Boolean(progress.activeProjectId) || progress.status === "researching";
  const status: TechnologyStatusV9 = maxed ? "completed" : researching ? "researching" : prerequisitesMet ? "available" : "locked";
  return { progress: { ...progress, status }, prerequisitesMet, maxed, researching };
}



export function getOpenCeoDecisionsV9(state: GameState) {
  return state.ceoInbox.filter((task) => task.status === "open" && (Boolean(task.decision) || task.urgency === "critical" || !task.ownerRole));
}

