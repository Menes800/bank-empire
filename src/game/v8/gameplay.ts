import { startBranchUpgrade } from "../v4/gameplay";
import { advanceDaysV7, getBranchUpgradeEconomicsV7 } from "../v7/gameplay";
import type {
  BranchFocus,
  BranchMandate,
  BranchPriority,
  EmployeeDepartment,
  EmployeeProfile,
  ExecutiveRole,
  GameState,
  ManagementArea,
  ManagementControlMode,
  UpgradeAuthority,
} from "../types";
import { addEvent, clamp, createEvent } from "../utils";

const departmentOrder: EmployeeDepartment[] = ["Executive", "Branch Operations", "Credit & Collections", "Finance & Treasury", "Customer Growth", "Technology"];

const departmentLeader: Record<EmployeeDepartment, ExecutiveRole | null> = {
  Executive: null,
  "Branch Operations": "COO",
  "Credit & Collections": "CRO",
  "Finance & Treasury": "CFO",
  "Customer Growth": "CMO",
  Technology: "CTO",
};

const departmentArea: Record<EmployeeDepartment, ManagementArea | null> = {
  Executive: null,
  "Branch Operations": "operations",
  "Credit & Collections": "lending",
  "Finance & Treasury": "treasury",
  "Customer Growth": "marketing",
  Technology: "operations",
};

const priorityInternal: Record<BranchPriority, { focus: BranchFocus; mandate: BranchMandate }> = {
  balanced: { focus: "service", mandate: "autonomous" },
  growth: { focus: "deposits", mandate: "growth" },
  deposits: { focus: "deposits", mandate: "autonomous" },
  business: { focus: "business", mandate: "autonomous" },
  profitability: { focus: "business", mandate: "guarded" },
};

const roleByDepartment: Record<Exclude<EmployeeDepartment, "Executive">, string> = {
  "Branch Operations": "Customer adviser",
  "Credit & Collections": "Credit specialist",
  "Finance & Treasury": "Finance analyst",
  "Customer Growth": "Growth specialist",
  Technology: "Systems analyst",
};

const hireNames = ["Maya Berg", "Noah Solvik", "Lea Nystad", "Elias Strand", "Sara Viken", "Oskar Holm", "Amalie Dahl", "Theo Lunde"];

function stableIndex(seed: string, length: number) {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return length === 0 ? 0 : hash % length;
}

export function employeeDepartment(employee: EmployeeProfile): EmployeeDepartment {
  if (employee.executiveRole) return "Executive";
  if (employee.department) return employee.department;
  const text = `${employee.role} ${employee.trait}`.toLowerCase();
  if (employee.assignedBranchId || text.includes("branch") || text.includes("customer") || text.includes("operations")) return "Branch Operations";
  if (text.includes("credit") || text.includes("risk") || text.includes("collection")) return "Credit & Collections";
  if (text.includes("finance") || text.includes("treasury") || text.includes("capital")) return "Finance & Treasury";
  if (text.includes("marketing") || text.includes("growth") || text.includes("relationship") || text.includes("wealth")) return "Customer Growth";
  if (text.includes("technology") || text.includes("system") || text.includes("digital") || text.includes("cyber")) return "Technology";
  return "Branch Operations";
}

function workloadForDepartment(state: GameState, department: EmployeeDepartment, headcount: number) {
  const people = Math.max(1, headcount);
  if (department === "Executive") return clamp(58 + state.ceoInbox.filter((task) => task.status === "open").length * 3, 35, 125);
  if (department === "Branch Operations") return clamp(55 + state.customers / people / 23 + state.branchOffices.length * 4, 35, 135);
  if (department === "Credit & Collections") return clamp(48 + state.activeLoans.length * 4 / people + state.loanApplications.length * 12 / people + state.collectionCases.filter((item) => !item.closed).length * 18 / people, 35, 140);
  if (department === "Finance & Treasury") return clamp(52 + (state.loans + state.deposits) / 4_000_000 / people + (state.liquidityRatio < 20 ? 18 : 0), 35, 130);
  if (department === "Customer Growth") return clamp(52 + state.customers / people / 42 + state.competitorMoves.slice(0, 4).length * 3, 35, 135);
  return clamp(48 + (100 - state.digitalLevel) * .28 + (100 - state.cyberSecurity) * .24, 35, 130);
}

export function getWorkforceDepartments(state: GameState) {
  return departmentOrder.map((department) => {
    const employees = state.employeeRoster.filter((employee) => employeeDepartment(employee) === department);
    const workload = workloadForDepartment(state, department, employees.length);
    const performance = employees.length > 0 ? employees.reduce((sum, employee) => sum + (employee.performance ?? employee.skill), 0) / employees.length : 0;
    const wellbeing = employees.length > 0 ? employees.reduce((sum, employee) => sum + (employee.wellbeing ?? employee.energy), 0) / employees.length : 0;
    const leaderRole = departmentLeader[department];
    const leader = leaderRole ? state.employeeRoster.find((employee) => employee.executiveRole === leaderRole) : undefined;
    const status = workload > 105 ? "overloaded" : workload > 90 ? "pressure" : workload < 62 ? "capacity" : "healthy";
    return { department, employees, headcount: employees.length, workload, performance, wellbeing, leaderRole, leader, status };
  });
}

export function setManagementControl(state: GameState, area: ManagementArea, mode: ManagementControlMode): GameState {
  const automationMode = mode === "manual" ? "manual" : mode === "automatic" ? "balanced" : "conservative";
  return {
    ...state,
    managementControl: { ...state.managementControl, [area]: mode },
    automation: { ...state.automation, [area]: automationMode },
  };
}

export function setBranchManagerControl(state: GameState, branchId: string, managerControl: boolean): GameState {
  return {
    ...state,
    branchOffices: state.branchOffices.map((branch) => branch.id === branchId ? {
      ...branch,
      managerControl,
      managerMandate: managerControl && branch.managerId ? priorityInternal[branch.operatingPriority ?? "balanced"].mandate : "manual",
    } : branch),
  };
}

export function setBranchPriority(state: GameState, branchId: string, operatingPriority: BranchPriority): GameState {
  const internal = priorityInternal[operatingPriority];
  return {
    ...state,
    branchOffices: state.branchOffices.map((branch) => branch.id === branchId ? {
      ...branch,
      operatingPriority,
      localFocus: internal.focus,
      managerMandate: branch.managerControl && branch.managerId ? internal.mandate : "manual",
    } : branch),
  };
}

export function setBranchUpgradeAuthority(state: GameState, branchId: string, upgradeAuthority: UpgradeAuthority): GameState {
  return { ...state, branchOffices: state.branchOffices.map((branch) => branch.id === branchId ? { ...branch, upgradeAuthority } : branch) };
}

function assignAutomaticManagers(state: GameState): GameState {
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  if (!coo || state.managementControl.operations === "manual") return state;
  let roster = [...state.employeeRoster];
  let branches = [...state.branchOffices];
  const used = new Set(branches.map((branch) => branch.managerId).filter(Boolean));

  branches = branches.map((branch) => {
    if (!branch.managerControl || branch.managerId) return branch;
    const candidate = roster
      .filter((employee) => !employee.executiveRole && !used.has(employee.id) && employee.leadership >= 45)
      .sort((a, b) => (b.leadership + b.skill) - (a.leadership + a.skill))[0];
    if (!candidate) return branch;
    used.add(candidate.id);
    roster = roster.map((employee) => employee.id === candidate.id ? { ...employee, assignedBranchId: branch.id, department: "Branch Operations", reportsTo: coo.id } : employee);
    const internal = priorityInternal[branch.operatingPriority ?? "balanced"];
    return { ...branch, managerId: candidate.id, managerMandate: internal.mandate, localFocus: internal.focus, lastManagerAction: `${coo.name} appointed ${candidate.name} to run the branch.` };
  });

  return { ...state, branchOffices: branches, employeeRoster: roster };
}

function pushUniqueTask(state: GameState, task: GameState["ceoInbox"][number]) {
  if (task.sourceId && state.ceoInbox.some((item) => item.sourceId === task.sourceId && item.status === "open")) return state;
  return { ...state, ceoInbox: [task, ...state.ceoInbox].slice(0, 40) };
}

function runAutomaticBranchUpgrades(state: GameState): GameState {
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  if (!coo || state.managementControl.operations === "manual") return state;
  let next = state;

  for (const original of state.branchOffices) {
    const branch = next.branchOffices.find((item) => item.id === original.id);
    if (!branch || !branch.managerControl || !branch.managerId || branch.level >= 3) continue;
    if (next.projects.some((project) => project.branchId === branch.id && project.status !== "completed")) continue;
    const economics = getBranchUpgradeEconomicsV7(next, branch);
    const paybackMonths = economics.paybackMonths ?? Number.POSITIVE_INFINITY;
    const recommended = economics.viable && (economics.capacityUse >= 91 || (economics.capacityUse >= 84 && (branch.lastMonthProfit ?? 0) > 35_000));
    if (!recommended) {
      next = { ...next, branchOffices: next.branchOffices.map((item) => item.id === branch.id ? { ...item, pendingUpgradeRecommendation: false } : item) };
      continue;
    }

    const authority = branch.upgradeAuthority ?? "manual";
    const canAfford = next.cash >= economics.cost + 500_000;
    const mayAutoApprove = authority === "small" ? branch.level === 1 && economics.cost <= 1_250_000 : authority === "profitable" ? paybackMonths <= 24 : false;

    if (mayAutoApprove && canAfford && state.managementControl.operations === "automatic") {
      next = startBranchUpgrade(next, branch.id);
      next = { ...next, branchOffices: next.branchOffices.map((item) => item.id === branch.id ? { ...item, pendingUpgradeRecommendation: false, lastManagerAction: `${coo.name} and the branch manager approved a level ${branch.level + 1} expansion with ${paybackMonths.toFixed(0)} month payback.` } : item) };
      next = addEvent(next, createEvent(state.day, "positive", `${branch.name} upgrade approved`, `${coo.name} approved the investment under the automatic profitable-upgrade mandate.`));
    } else {
      next = { ...next, branchOffices: next.branchOffices.map((item) => item.id === branch.id ? { ...item, pendingUpgradeRecommendation: true } : item) };
      next = pushUniqueTask(next, {
        id: `upgrade-${branch.id}-${state.day}`,
        createdDay: state.day,
        category: "network",
        title: `${branch.name} recommends expansion`,
        summary: `${economics.capacityUse.toFixed(0)}% capacity · ${paybackMonths.toFixed(0)} month payback · ${state.currency} ${Math.round(economics.monthlyProfitGain / 1000)}k expected monthly improvement.`,
        urgency: economics.capacityUse >= 97 ? "critical" : "important",
        page: "network",
        status: "open",
        ownerRole: "COO",
        sourceId: `upgrade-${branch.id}`,
      });
    }
  }
  return next;
}

function createDepartmentHire(state: GameState, department: Exclude<EmployeeDepartment, "Executive">, leaderId: string): GameState {
  const index = stableIndex(`${department}-${state.day}-${state.employeeRoster.length}`, hireNames.length);
  const name = hireNames[index];
  const salary = department === "Technology" || department === "Finance & Treasury" ? 66_000 : department === "Credit & Collections" ? 62_000 : 54_000;
  const employee: EmployeeProfile = {
    id: `auto-${department.toLowerCase().replace(/[^a-z]+/g, "-")}-${state.day}-${state.employeeRoster.length}`,
    name,
    role: roleByDepartment[department],
    executiveRole: null,
    salary,
    skill: 59 + stableIndex(`${name}-skill`, 16),
    leadership: 38 + stableIndex(`${name}-leadership`, 18),
    loyalty: 72,
    energy: 88,
    trait: "Management-recommended hire",
    assignedBranchId: null,
    department,
    reportsTo: leaderId,
    performance: 65,
    workload: 72,
    wellbeing: 82,
    potential: 68 + stableIndex(`${name}-potential`, 18),
    tenureMonths: 0,
  };
  return addEvent({ ...state, cash: Math.max(0, state.cash - salary * 1.5), employeeRoster: [...state.employeeRoster, employee], employees: state.employees + 1 }, createEvent(state.day, "positive", `${name} hired`, `${department} filled a normal capacity need automatically within its management mandate.`));
}

function runWorkforceReview(state: GameState): GameState {
  const beforeDepartments = getWorkforceDepartments(state);
  const workloadByDepartment = new Map(beforeDepartments.map((item) => [item.department, item.workload]));
  let next: GameState = {
    ...state,
    employeeRoster: state.employeeRoster.map((employee) => {
      const department = employeeDepartment(employee);
      const workload = workloadByDepartment.get(department) ?? 75;
      const overloadPenalty = Math.max(0, workload - 95) * .42;
      const performance = clamp(employee.skill * .58 + employee.leadership * .16 + employee.energy * .18 + (employee.potential ?? 65) * .08 - overloadPenalty, 25, 98);
      const wellbeing = clamp((employee.wellbeing ?? employee.energy) + (88 - workload) * .08, 25, 98);
      const loyalty = clamp(employee.loyalty + (wellbeing - 65) * .015 + (performance - 65) * .01, 20, 98);
      return { ...employee, department, workload, performance, wellbeing, loyalty, potential: employee.potential ?? clamp(employee.skill + 8, 45, 95), tenureMonths: (employee.tenureMonths ?? 0) + 1 };
    }),
  };

  for (const summary of getWorkforceDepartments(next)) {
    if (summary.department === "Executive" || summary.workload <= 105) continue;
    const leaderRole = departmentLeader[summary.department];
    const leader = leaderRole ? next.employeeRoster.find((employee) => employee.executiveRole === leaderRole) : undefined;
    const area = departmentArea[summary.department];
    const mode = area ? next.managementControl[area] : "manual";
    if (!leader || !area || mode === "manual") continue;

    if (mode === "automatic" && next.cash > 500_000) {
      next = createDepartmentHire(next, summary.department, leader.id);
    } else {
      next = pushUniqueTask(next, {
        id: `workforce-${summary.department}-${state.day}`,
        createdDay: state.day,
        category: "people",
        title: `${summary.department} needs capacity`,
        summary: `${summary.workload.toFixed(0)}% workload. ${leader.name} recommends an internal move, training plan or one additional hire.`,
        urgency: summary.workload > 118 ? "critical" : "important",
        page: "leadership",
        status: "open",
        ownerRole: leaderRole ?? undefined,
        sourceId: `workforce-${summary.department}`,
      });
    }
  }

  const overloaded = getWorkforceDepartments(next).filter((item) => item.status === "overloaded").length;
  return addEvent(next, createEvent(state.day, overloaded > 0 ? "warning" : "positive", "Monthly workforce review", overloaded > 0 ? `${overloaded} department${overloaded === 1 ? " is" : "s are"} above sustainable workload. Management handled routine capacity actions and escalated only material decisions.` : "Workload, performance and wellbeing remain within normal management limits."));
}

function runManagementOverhaulCycle(state: GameState): GameState {
  let next = assignAutomaticManagers(state);
  next = runAutomaticBranchUpgrades(next);
  next = runWorkforceReview(next);
  return next;
}

export function advanceDaysV8(state: GameState, days: number): GameState {
  let current = state;
  for (let index = 0; index < days; index += 1) {
    if (current.gameOverReason && !current.bankruptcyProtection) break;
    const beforeDay = current.day;
    let next = advanceDaysV7(current, 1);
    if (next.gameOverReason && next.bankruptcyProtection) {
      next = addEvent({ ...next, gameOverReason: null, cash: Math.max(250_000, next.cash), liquidityRatio: Math.max(10, next.liquidityRatio), capitalRatio: Math.max(8, next.capitalRatio), liquidityBreachDays: 0, capitalBreachDays: 0 }, createEvent(next.day, "warning", "DEV bankruptcy protection used", "The test save was stabilised so playtesting could continue."));
    }
    if (next.day === beforeDay) break;
    if (next.day % 30 === 0) next = runManagementOverhaulCycle(next);
    current = next;
  }
  return current;
}

export function approveBranchUpgradeRecommendation(state: GameState, branchId: string): GameState {
  const branch = state.branchOffices.find((item) => item.id === branchId);
  if (!branch || branch.level >= 3) return state;
  const upgraded = startBranchUpgrade(state, branchId);
  if (upgraded === state) return state;
  return {
    ...upgraded,
    branchOffices: upgraded.branchOffices.map((item) => item.id === branchId ? { ...item, pendingUpgradeRecommendation: false } : item),
    ceoInbox: upgraded.ceoInbox.map((task) => task.sourceId === `upgrade-${branchId}` ? { ...task, status: "resolved" } : task),
  };
}
