import type { BankProject, GameState } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";
import { TECH_CATALOG_V9, ensureV9State, getBranchOperationsV9, getTechnologyEffectsV9, readV9, technologyAvailabilityV9, writeV9, type BranchSpecializationV9, type TechnologyTrackV9 } from "./model";

export function startAdvancedBranchUpgradeV9(state: GameState, branchId: string, specialization?: BranchSpecializationV9): GameState {
  const branch = state.branchOffices.find((item) => item.id === branchId);
  if (!branch) return state;
  const current = getBranchOperationsV9(state, branchId);
  if (current.effectiveLevel < 3 || current.effectiveLevel >= 5 || current.pendingProjectId) return state;
  const targetLevel = (current.effectiveLevel + 1) as 4 | 5;
  const cost = targetLevel === 4 ? 3_800_000 : 7_500_000;
  if (state.cash < cost + 500_000) return state;
  const tech = getTechnologyEffectsV9(state);
  const durationDays = Math.max(80, round((targetLevel === 4 ? 150 : 240) * (1 - clamp(tech.projectSpeed / 100, 0, .35))));
  const id = `v9-branch-upgrade-${branchId}-${targetLevel}-${state.day}`;
  const project: BankProject = {
    id,
    name: `${branch.name} Level ${targetLevel} transformation`,
    kind: "integration",
    status: "active",
    startDay: state.day,
    durationDays,
    remainingDays: durationDays,
    budget: cost,
    spent: 0,
    risk: targetLevel === 4 ? 24 : 34,
    branchId,
  };
  const v9 = readV9(state);
  const branches = {
    ...v9.branches,
    [branchId]: {
      ...current,
      specialization: specialization ?? current.specialization,
      pendingProjectId: id,
      lastCooAction: `Level ${targetLevel} transformation approved. Delivery is expected in ${durationDays} days.`,
    },
  };
  const next = writeV9({ ...state, cash: state.cash - cost, projects: [project, ...state.projects] }, { ...v9, branches });
  return addEvent(next, createEvent(state.day, "neutral", `${branch.name} transformation approved`, `The COO started a Level ${targetLevel} branch programme with a ${durationDays}-day delivery plan.`));
}
export function startTechnologyV9(state: GameState, technologyId: string): GameState {
  const node = TECH_CATALOG_V9.find((item) => item.id === technologyId);
  if (!node) return state;
  const availability = technologyAvailabilityV9(state, node);
  if (!availability.prerequisitesMet || availability.maxed || availability.researching) return state;
  const activeCount = state.projects.filter((project) => project.status !== "completed" && project.id.startsWith("v9-tech-")).length;
  if (activeCount >= 2) return state;
  const nextLevel = availability.progress.level + 1;
  const levelCost = round(node.cost * (1 + (nextLevel - 1) * .42));
  if (state.cash < levelCost + 350_000) return state;
  const tech = getTechnologyEffectsV9(state);
  const cto = state.employeeRoster.find((employee) => employee.executiveRole === "CTO");
  const ctoSpeed = cto ? Math.max(0, cto.skill + cto.leadership - 120) / 500 : 0;
  const durationDays = Math.max(45, round(node.durationDays * (1 + (nextLevel - 1) * .18) * (1 - clamp(tech.projectSpeed / 100 + ctoSpeed, 0, .4))));
  const id = `v9-tech-${node.id}-${nextLevel}-${state.day}`;
  const project: BankProject = {
    id,
    name: `${node.name} · Level ${nextLevel}`,
    kind: "integration",
    status: "active",
    startDay: state.day,
    durationDays,
    remainingDays: durationDays,
    budget: levelCost,
    spent: 0,
    risk: 16 + node.tier * 5,
  };
  const v9 = readV9(state);
  const technologies = {
    ...v9.technologies,
    [node.id]: { ...availability.progress, status: "researching" as const, activeProjectId: id },
  };
  const next = writeV9({ ...state, cash: state.cash - levelCost, projects: [project, ...state.projects] }, { ...v9, technologies });
  return addEvent(next, createEvent(state.day, "neutral", `${node.name} started`, `Technology Level ${nextLevel} is funded and expected in ${durationDays} days.`));
}
export function completeV9Projects(state: GameState): GameState {
  let next = ensureV9State(state);
  let v9 = readV9(next);
  let branches = { ...v9.branches };
  let technologies = { ...v9.technologies };
  let branchChanged = false;
  let techChanged = false;

  for (const branch of next.branchOffices) {
    const operations = branches[branch.id];
    if (!operations?.pendingProjectId) continue;
    const project = next.projects.find((item) => item.id === operations.pendingProjectId);
    if (!project || project.status !== "completed") continue;
    const match = project.id.match(/-([45])-\d+$/);
    const targetLevel = Number(match?.[1] ?? operations.effectiveLevel) as 4 | 5;
    branches[branch.id] = {
      ...operations,
      effectiveLevel: targetLevel,
      pendingProjectId: undefined,
      lastCooAction: `Level ${targetLevel} transformation completed. The new operating model is live.`,
    };
    const capacityGain = targetLevel === 4 ? 280 : 450;
    const staffGain = targetLevel === 4 ? 2 : 3;
    next = {
      ...next,
      branchOffices: next.branchOffices.map((item) => item.id === branch.id ? { ...item, capacity: item.capacity + capacityGain, staffSlots: item.staffSlots + staffGain, satisfaction: clamp(item.satisfaction + 4, 1, 100) } : item),
      campaignXp: next.campaignXp + (targetLevel === 4 ? 260 : 420),
      reputation: clamp(next.reputation + (targetLevel === 4 ? 1.5 : 2.5), 1, 100),
    };
    branchChanged = true;
  }

  for (const node of TECH_CATALOG_V9) {
    const progress = technologies[node.id];
    if (!progress?.activeProjectId) continue;
    const project = next.projects.find((item) => item.id === progress.activeProjectId);
    if (!project || project.status !== "completed") continue;
    const level = Math.min(node.maxLevel, progress.level + 1);
    technologies[node.id] = { id: node.id, level, status: level >= node.maxLevel ? "completed" : "available", completedDay: next.day };
    const multiplier = level;
    next = {
      ...next,
      digitalLevel: clamp(next.digitalLevel + (node.effects.digitalCapacity ?? 0) * .32 * multiplier, 1, 100),
      cyberSecurity: clamp(next.cyberSecurity + (node.effects.cyber ?? 0) * .55 * multiplier, 1, 100),
      compliance: clamp(next.compliance + (node.effects.compliance ?? 0) * .45 * multiplier, 1, 100),
      fraudLosses: Math.max(0, next.fraudLosses * (1 - (node.effects.fraudReduction ?? 0) / 100)),
      campaignXp: next.campaignXp + 80 + node.tier * 35,
    };
    techChanged = true;
  }

  if (!branchChanged && !techChanged) return next;
  v9 = readV9(next);
  return writeV9(next, { ...v9, branches, technologies });
}
export function unlockTechnologyTreeV9(state: GameState): GameState {
  const v9 = readV9(state);
  return writeV9(state, { ...v9, devTechUnlocked: true });
}
export function completeActiveTechnologyV9(state: GameState): GameState {
  const active = state.projects.find((project) => project.id.startsWith("v9-tech-") && project.status !== "completed");
  if (!active) return state;
  const next = { ...state, projects: state.projects.map((project) => project.id === active.id ? { ...project, status: "completed" as const, remainingDays: 0, spent: project.budget } : project) };
  return completeV9Projects(next);
}
export const TECHNOLOGY_TRACK_ORDER_V9: TechnologyTrackV9[] = ["core", "digital", "automation", "data", "cyber", "compliance", "payments"];
