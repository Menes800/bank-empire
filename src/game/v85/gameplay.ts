import { chooseDecisionV5 } from "../v5/gameplay";
import { delegateInboxTask } from "../v7/gameplay";
import { advanceDaysV84Final } from "../v84/advance";
import { prepareV84State } from "../v84/gameplay";
import type { CEOInboxTask, ExecutiveRole, GameState } from "../types";
import { addEvent, clamp, createEvent } from "../utils";

export type ExecutiveDevelopmentFocus = "leadership" | "specialist" | "recovery";

export type DelegationTarget = {
  employeeId: string;
  name: string;
  title: string;
  role: ExecutiveRole | "BRANCH_MANAGER";
};

const roleTitles: Record<ExecutiveRole, string> = {
  CFO: "Chief Financial Officer",
  COO: "Chief Operating Officer",
  CRO: "Chief Risk Officer",
  CMO: "Chief Marketing Officer",
  CTO: "Chief Technology Officer",
};

function branchFromTask(state: GameState, task: CEOInboxTask) {
  return state.branchOffices.find((branch) =>
    Boolean(task.sourceId?.includes(branch.id)) || task.title.toLowerCase().includes(branch.name.toLowerCase()),
  );
}

export function getDelegationTarget(state: GameState, task: CEOInboxTask): DelegationTarget | null {
  if (task.decision) return null;

  if (task.ownerRole) {
    const executive = state.employeeRoster.find((employee) => employee.executiveRole === task.ownerRole);
    if (executive) {
      return {
        employeeId: executive.id,
        name: executive.name,
        title: roleTitles[task.ownerRole],
        role: task.ownerRole,
      };
    }
  }

  if (task.category === "network") {
    const branch = branchFromTask(state, task);
    const manager = branch?.managerId
      ? state.employeeRoster.find((employee) => employee.id === branch.managerId)
      : undefined;
    if (branch && manager && branch.managerControl && branch.managerMandate !== "manual") {
      return {
        employeeId: manager.id,
        name: manager.name,
        title: `${branch.name} Branch Manager`,
        role: "BRANCH_MANAGER",
      };
    }
  }

  return null;
}

function isSevereBranchMatter(state: GameState, task: CEOInboxTask) {
  const branch = branchFromTask(state, task);
  if (!branch) return task.urgency === "critical";
  const capacityUse = (branch.localCustomers ?? 0) / Math.max(1, branch.capacity) * 100;
  const severeLoss = (branch.lastMonthProfit ?? 0) <= -200_000;
  return task.urgency === "critical" || severeLoss || capacityUse > 98;
}

function updateBranchMatterCopy(state: GameState, task: CEOInboxTask): CEOInboxTask {
  const branch = branchFromTask(state, task);
  if (!branch || !task.sourceId?.startsWith("profit-")) return task;
  const result = branch.lastMonthProfit ?? 0;
  const previousInterventions = state.ceoInbox.filter((item) => item.id !== task.id && item.sourceId === task.sourceId && item.status !== "open").length;
  return {
    ...task,
    title: previousInterventions > 0 ? `${branch.name} remains loss-making after management action` : `${branch.name} is materially loss-making`,
    summary: `Month ending day ${state.day}: ${result >= 0 ? "+" : "-"}$${Math.abs(Math.round(result / 1_000))}k. ${previousInterventions > 0 ? "Earlier management action did not solve the underlying problem." : "Management needs a specific recovery plan."}`,
    urgency: previousInterventions > 1 ? "critical" : task.urgency,
  };
}

function collapseDuplicateOpenTasks(tasks: CEOInboxTask[]) {
  const newestBySource = new Map<string, string>();
  for (const task of [...tasks].sort((a, b) => b.createdDay - a.createdDay)) {
    if (task.status !== "open" || !task.sourceId) continue;
    if (!newestBySource.has(task.sourceId)) newestBySource.set(task.sourceId, task.id);
  }
  return tasks.map((task) => task.status === "open" && task.sourceId && newestBySource.get(task.sourceId) !== task.id
    ? { ...task, status: "delegated" as const }
    : task);
}

function normaliseCEOInbox(state: GameState): GameState {
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  const cro = state.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  const cmo = state.employeeRoster.find((employee) => employee.executiveRole === "CMO");

  const cleaned = collapseDuplicateOpenTasks(state.ceoInbox)
    .filter((task) => task.urgency !== "routine")
    .map((original) => {
      let task = updateBranchMatterCopy(state, original);
      if (task.status !== "open") return task;

      if (task.category === "market" && task.urgency !== "critical") {
        return { ...task, status: "delegated" as const, ownerRole: cmo ? "CMO" : task.ownerRole };
      }

      if (task.category === "credit" && !task.decision && task.urgency !== "critical") {
        return { ...task, status: "delegated" as const, ownerRole: cro ? "CRO" : task.ownerRole };
      }

      if (task.category === "network") {
        const branch = branchFromTask(state, task);
        const branchManager = branch?.managerId ? state.employeeRoster.find((employee) => employee.id === branch.managerId) : undefined;
        const localOwnerAvailable = Boolean(branch && branchManager && branch.managerControl && branch.managerMandate !== "manual");
        const cooAvailable = Boolean(coo && state.managementControl.operations !== "manual");
        if (!isSevereBranchMatter(state, task) && (localOwnerAvailable || cooAvailable)) {
          return { ...task, status: "delegated" as const, ownerRole: cooAvailable ? "COO" : task.ownerRole };
        }
      }

      return task;
    });

  return { ...state, ceoInbox: cleaned.slice(0, 30) };
}

function isRoutineRegulatoryDecision(task: CEOInboxTask) {
  const decision = task.decision;
  if (!decision || decision.category !== "regulatory" || decision.id.startsWith("v5-")) return false;
  const text = `${task.title} ${task.summary}`.toLowerCase();
  return !text.includes("licence") && !text.includes("resolution") && !text.includes("capital restoration") && !text.includes("emergency liquidity");
}

function routeRoutineRegulatoryWork(state: GameState): GameState {
  const cro = state.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  if (!cro || state.managementControl.lending === "manual") return state;
  const task = state.ceoInbox.find((item) => item.status === "open" && isRoutineRegulatoryDecision(item));
  if (!task?.decision) return state;

  const selectedChoice = task.decision.choices.find((choice) => /internal|phased|remediation|review/i.test(`${choice.label} ${choice.description}`))
    ?? task.decision.choices[0];
  if (!selectedChoice) return state;

  const handled = chooseDecisionV5({ ...state, pendingDecision: task.decision }, selectedChoice.id);
  const next = {
    ...handled,
    pendingDecision: null,
    ceoInbox: handled.ceoInbox.map((item) => item.id === task.id ? { ...item, status: "delegated" as const, ownerRole: "CRO" as const } : item),
  };
  return addEvent(next, createEvent(state.day, "positive", `${cro.name} opened a regulatory remediation plan`, `${selectedChoice.label} was approved under the CRO mandate. The CEO received the outcome instead of an operating task.`));
}

export function prepareV85State(state: GameState): GameState {
  return normaliseCEOInbox(routeRoutineRegulatoryWork(prepareV84State(state)));
}

export function advanceDaysV85(state: GameState, days: number): GameState {
  let current = prepareV85State(state);
  for (let index = 0; index < days; index += 1) {
    const beforeDay = current.day;
    const next = advanceDaysV84Final(current, 1);
    if (next.day === beforeDay) break;
    current = prepareV85State(next);
  }
  return current;
}

export function delegateInboxTaskV85(state: GameState, taskId: string): GameState {
  const task = state.ceoInbox.find((item) => item.id === taskId);
  if (!task || !getDelegationTarget(state, task)) return state;
  return prepareV85State(delegateInboxTask(state, taskId));
}

export function developExecutive(state: GameState, employeeId: string, focus: ExecutiveDevelopmentFocus): GameState {
  const employee = state.employeeRoster.find((item) => item.id === employeeId && item.executiveRole);
  const cost = focus === "recovery" ? 24_000 : focus === "leadership" ? 55_000 : 48_000;
  if (!employee || state.cash < cost) return state;

  const employeeRoster = state.employeeRoster.map((item) => {
    if (item.id !== employeeId) return item;
    if (focus === "leadership") {
      return { ...item, leadership: clamp(item.leadership + 4, 1, 100), performance: clamp((item.performance ?? item.skill) + 2, 1, 100), loyalty: clamp(item.loyalty + 1, 1, 100) };
    }
    if (focus === "specialist") {
      return { ...item, skill: clamp(item.skill + 4, 1, 100), performance: clamp((item.performance ?? item.skill) + 2, 1, 100), potential: clamp((item.potential ?? item.skill) + 1, 1, 100) };
    }
    return { ...item, wellbeing: clamp((item.wellbeing ?? item.energy) + 10, 1, 100), energy: clamp(item.energy + 8, 1, 100), workload: clamp((item.workload ?? 75) - 8, 20, 140) };
  });

  const label = focus === "leadership" ? "executive coaching" : focus === "specialist" ? "specialist development" : "a recovery programme";
  return addEvent({ ...state, cash: state.cash - cost, employeeRoster }, createEvent(state.day, "positive", `${employee.name} completed ${label}`, `${employee.executiveRole} capability improved over a structured development period.`));
}
