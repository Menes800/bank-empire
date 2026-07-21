import { approveLoanRefined, counterLoanRefined, declineLoanRefined, startBranchUpgrade } from "../v4/gameplay";
import { chooseDecisionV5 } from "../v5/gameplay";
import { takeCollectionAction } from "../v7/gameplay";
import { branchForApplication } from "../v84/gameplay";
import { advanceDaysV85, delegateInboxTaskV85, getDelegationTarget, prepareV85State } from "../v85/gameplay";
import type { BranchOffice, CEOInboxTask, EmployeeProfile, GameState, LoanApplication } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";

const firstNames = ["Aksel", "Ingrid", "Sander", "Lea", "Emil", "Nora", "Maja", "Isak", "Selma", "Jon"];
const lastNames = ["Bakke", "Lie", "Solberg", "Hagen", "Moen", "Lund", "Strand", "Vik", "Dahl", "Berg"];

function deterministic(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function employeeKind(employee: EmployeeProfile, branch?: BranchOffice) {
  if (branch?.managerId === employee.id || /branch manager/i.test(employee.role)) return "manager" as const;
  const text = `${employee.role} ${employee.department ?? ""} ${employee.trait}`.toLowerCase();
  if (/credit|loan|mortgage|risk|underwrit/.test(text)) return "credit" as const;
  if (/growth|relationship|sales|marketing/.test(text)) return "growth" as const;
  if (/operation|coordinator|support|service desk/.test(text)) return "support" as const;
  return "customer" as const;
}

function loanBranchId(state: GameState, loanId: string) {
  if (state.branchOffices.length === 0) return null;
  const index = Math.abs([...loanId].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % state.branchOffices.length;
  return state.branchOffices[index]?.id ?? null;
}

function branchFromTask(state: GameState, task: CEOInboxTask) {
  return state.branchOffices.find((branch) => Boolean(task.sourceId?.includes(branch.id)) || task.title.toLowerCase().includes(branch.name.toLowerCase()));
}

function ensureOneManagerPerBranch(state: GameState): GameState {
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  const used = new Set<string>();
  const assignments = new Map<string, string>();

  const branchOffices = state.branchOffices.map((branch) => {
    let managerId = branch.managerId;
    if (managerId && used.has(managerId)) managerId = null;

    if (!managerId && coo && state.managementControl.operations !== "manual") {
      const candidates = state.employeeRoster
        .filter((employee) => !employee.executiveRole && !used.has(employee.id) && employee.leadership >= 50)
        .sort((a, b) => {
          const aLocal = a.assignedBranchId === branch.id ? 30 : 0;
          const bLocal = b.assignedBranchId === branch.id ? 30 : 0;
          const aManager = /manager/i.test(a.role) ? 20 : 0;
          const bManager = /manager/i.test(b.role) ? 20 : 0;
          return b.leadership + bLocal + bManager - (a.leadership + aLocal + aManager);
        });
      managerId = candidates[0]?.id ?? null;
    }

    if (managerId) {
      used.add(managerId);
      assignments.set(managerId, branch.id);
    }

    return {
      ...branch,
      managerId,
      managerControl: Boolean(managerId) && (branch.managerControl ?? true),
      managerMandate: managerId ? (branch.managerMandate ?? "autonomous") : "manual",
    };
  });

  const employeeRoster = state.employeeRoster.map((employee) => assignments.has(employee.id)
    ? { ...employee, assignedBranchId: assignments.get(employee.id) ?? null, role: /manager/i.test(employee.role) ? employee.role : "Branch manager" }
    : employee);

  return { ...state, branchOffices, employeeRoster };
}

function workloadForExecutive(state: GameState, employee: EmployeeProfile) {
  const role = employee.executiveRole;
  if (!role) return employee.workload ?? 70;
  const owned = state.ceoInbox.filter((task) => task.status === "open" && task.ownerRole === role).length;
  const rolePressure = role === "CFO"
    ? Math.max(0, 22 - state.liquidityRatio) * 1.4
    : role === "COO"
      ? state.branchOffices.filter((branch) => !branch.managerId || (branch.lastMonthProfit ?? 0) < -100_000).length * 8
      : role === "CRO"
        ? state.loanApplications.length * 3 + state.collectionCases.filter((item) => !item.closed).length * 5
        : role === "CMO"
          ? state.competitorMoves.slice(0, 4).length * 2
          : state.projects.filter((project) => project.status !== "completed" && (project.kind === "mobile-bank" || project.kind === "core-banking")).length * 8;
  return clamp(round(54 + owned * 7 + rolePressure), 35, 125);
}

function recalculateRoleWorkloads(state: GameState): GameState {
  const employeeRoster = state.employeeRoster.map((employee) => {
    if (employee.executiveRole) return { ...employee, workload: workloadForExecutive(state, employee) };
    if (!employee.assignedBranchId) {
      const departmentPressure = employee.department === "Credit & Collections"
        ? state.loanApplications.length * 4 + state.collectionCases.filter((item) => !item.closed).length * 5
        : employee.department === "Technology"
          ? state.projects.filter((project) => project.status !== "completed").length * 4
          : 0;
      return { ...employee, workload: clamp(round(52 + departmentPressure), 35, 110) };
    }

    const branch = state.branchOffices.find((item) => item.id === employee.assignedBranchId);
    if (!branch) return { ...employee, workload: 55 };
    const team = state.employeeRoster.filter((item) => item.assignedBranchId === branch.id && !item.executiveRole);
    const kind = employeeKind(employee, branch);
    const sameKind = Math.max(1, team.filter((item) => employeeKind(item, branch) === kind).length);
    const customers = branch.localCustomers ?? 0;
    const applications = state.loanApplications.filter((application) => branchForApplication(state, application)?.id === branch.id).length;
    const activeLoans = state.activeLoans.filter((loan) => loanBranchId(state, loan.id) === branch.id && loan.status !== "written-off").length;
    const openLocalMatters = state.ceoInbox.filter((task) => task.status === "open" && task.sourceId?.includes(branch.id)).length;
    const marketing = branch.managerBudget ?? 0;

    let workload = 55;
    if (kind === "manager") workload = 42 + team.length * 2.2 + openLocalMatters * 8 + (branch.managerControl ? 4 : 12);
    if (kind === "credit") workload = 38 + applications * 17 / sameKind + activeLoans * 1.4 / sameKind;
    if (kind === "customer") workload = 38 + customers / (sameKind * 10);
    if (kind === "growth") workload = 36 + marketing / Math.max(4_000, sameKind * 5_000) + customers / (sameKind * 28);
    if (kind === "support") workload = 40 + customers / (sameKind * 20) + team.length * 1.4;

    return { ...employee, workload: clamp(round(workload), 32, 125) };
  });
  return { ...state, employeeRoster };
}

function updateMonthlyWellbeing(state: GameState): GameState {
  return {
    ...state,
    employeeRoster: state.employeeRoster.map((employee) => {
      const workload = employee.workload ?? 70;
      const current = employee.wellbeing ?? employee.energy;
      const change = workload > 108 ? -7 : workload > 95 ? -3 : workload < 68 ? 2 : 0;
      return {
        ...employee,
        wellbeing: clamp(current + change, 25, 100),
        energy: clamp(employee.energy + Math.sign(change), 25, 100),
        performance: clamp((employee.performance ?? employee.skill) + (workload > 112 ? -2 : workload < 82 ? 1 : 0), 25, 100),
      };
    }),
  };
}

function staffingThreshold(branch: BranchOffice) {
  const mandate = branch.managerMandate ?? "manual";
  if (mandate === "growth") return 84;
  if (mandate === "autonomous") return 94;
  if (mandate === "guarded") return 106;
  return 999;
}

function roleForHire(state: GameState, branch: BranchOffice) {
  const team = state.employeeRoster.filter((employee) => employee.assignedBranchId === branch.id && !employee.executiveRole);
  const kinds = (["credit", "customer", "support", "growth"] as const).map((kind) => {
    const members = team.filter((employee) => employeeKind(employee, branch) === kind);
    const peak = members.length === 0 ? 115 : Math.max(...members.map((employee) => employee.workload ?? 70));
    return { kind, peak, count: members.length };
  });
  return kinds.sort((a, b) => b.peak - a.peak || a.count - b.count)[0]?.kind ?? "customer";
}

function createLocalHire(state: GameState, branch: BranchOffice, kind: "credit" | "customer" | "support" | "growth") {
  const seed = `${branch.id}-${state.day}-${state.employeeRoster.length}-${kind}`;
  const first = firstNames[Math.floor(deterministic(seed) * firstNames.length) % firstNames.length];
  const last = lastNames[Math.floor(deterministic(`${seed}-last`) * lastNames.length) % lastNames.length];
  const skill = 56 + Math.floor(deterministic(`${seed}-skill`) * 18);
  const leadership = 38 + Math.floor(deterministic(`${seed}-lead`) * 22);
  const config = kind === "credit"
    ? { role: "Loan adviser", department: "Credit & Collections" as const, salary: 66_000 }
    : kind === "growth"
      ? { role: "Relationship adviser", department: "Customer Growth" as const, salary: 62_000 }
      : kind === "support"
        ? { role: "Operations coordinator", department: "Branch Operations" as const, salary: 56_000 }
        : { role: "Customer adviser", department: "Branch Operations" as const, salary: 58_000 };
  const employee: EmployeeProfile = {
    id: `emp-local-${branch.id}-${state.day}-${state.employeeRoster.length}`,
    name: `${first} ${last}`,
    role: config.role,
    executiveRole: null,
    salary: config.salary,
    skill,
    leadership,
    loyalty: 72,
    energy: 88,
    trait: "Local operator",
    assignedBranchId: branch.id,
    department: config.department,
    reportsTo: branch.managerId,
    performance: skill,
    workload: 58,
    wellbeing: 86,
    potential: Math.min(94, skill + 10),
    tenureMonths: 0,
  };
  return employee;
}

function runBranchStaffing(state: GameState): GameState {
  let next = state;
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  const reports: string[] = [];

  for (const branch of state.branchOffices) {
    if (!branch.managerId || !branch.managerControl || branch.managerMandate === "manual") continue;
    const team = next.employeeRoster.filter((employee) => employee.assignedBranchId === branch.id && !employee.executiveRole);
    const peak = team.length === 0 ? 120 : Math.max(...team.map((employee) => employee.workload ?? 70));
    const threshold = staffingThreshold(branch);
    const severePressure = peak >= threshold;
    const headroom = Math.max(0, branch.staffSlots - team.length);
    const localResult = branch.lastMonthProfit ?? 0;
    const financiallyAllowed = localResult > -80_000 || peak > 108 || branch.operatingPriority === "growth";
    if (!severePressure || headroom <= 0 || !financiallyAllowed) continue;

    const kind = roleForHire(next, branch);
    const employee = createLocalHire(next, branch, kind);
    const recruitmentCost = 15_000 + employee.salary * .15;
    if (next.cash < recruitmentCost + 500_000) continue;
    next = {
      ...next,
      cash: next.cash - recruitmentCost,
      employees: next.employees + 1,
      employeeRoster: [...next.employeeRoster, employee],
      branchOffices: next.branchOffices.map((item) => item.id === branch.id ? { ...item, lastManagerAction: `${state.employeeRoster.find((person) => person.id === branch.managerId)?.name ?? "The branch manager"} hired ${employee.name} as ${employee.role.toLowerCase()} after sustained role pressure.` } : item),
    };
    reports.push(`${branch.name} hired ${employee.name} as ${employee.role.toLowerCase()} within the ${branch.managerMandate} staffing mandate.`);
  }

  if (reports.length > 0) {
    next = addEvent(next, createEvent(state.day, "positive", `${coo?.name ?? "Branch management"} completed the monthly staffing review`, reports.join(" ")));
  }
  return recalculateRoleWorkloads(next);
}

function runBranchUpgradeAuthority(state: GameState): GameState {
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  if (!coo || state.managementControl.operations === "manual") return state;
  let next = state;

  for (const branch of state.branchOffices) {
    if (branch.level >= 3 || (branch.upgradeAuthority ?? "manual") === "manual") continue;
    if (next.projects.some((project) => project.branchId === branch.id && project.status !== "completed")) continue;
    const team = next.employeeRoster.filter((employee) => employee.assignedBranchId === branch.id && !employee.executiveRole);
    const peak = team.length ? Math.max(...team.map((employee) => employee.workload ?? 70)) : 0;
    const capacityUse = (branch.localCustomers ?? 0) / Math.max(1, branch.capacity) * 100;
    const authority = branch.upgradeAuthority ?? "manual";
    const smallAllowed = authority === "small" && branch.level === 1 && (capacityUse > 97 || peak > 112);
    const profitableAllowed = authority === "profitable" && (branch.lastMonthProfit ?? 0) > 0 && (capacityUse > 84 || peak > 100);
    if (!smallAllowed && !profitableAllowed) continue;

    const upgraded = startBranchUpgrade(next, branch.id);
    if (upgraded === next) continue;
    next = addEvent(upgraded, createEvent(state.day, "positive", `${coo.name} approved a local capacity upgrade`, `${branch.name} met the ${authority} authority rule. The investment entered delivery without a routine CEO approval.`));
  }
  return next;
}

export function croApprovalLimit(state: GameState) {
  const cro = state.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  if (!cro || state.managementControl.lending === "manual") return 0;
  return state.managementControl.lending === "automatic" ? 10_000_000 : 5_000_000;
}

export function requiresCEOApproval(state: GameState, application: LoanApplication) {
  const limit = croApprovalLimit(state);
  if (limit === 0) return true;
  const concentrationLimit = Math.max(limit, state.loans * .14);
  return application.amount > limit || application.amount > concentrationLimit || (application.segment === "Commercial property" && application.amount > 7_500_000 && application.collateral < 50);
}

function routeCreditExceptions(state: GameState): GameState {
  const cro = state.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  if (!cro || state.managementControl.lending === "manual" || state.loanApplications.length === 0) return state;
  let next = state;
  let approved = 0;
  let countered = 0;
  let declined = 0;

  for (const application of [...state.loanApplications]) {
    if (requiresCEOApproval(next, application)) continue;
    const decline = application.riskGrade === "D" || application.defaultChance >= 10 || application.collateral < 42;
    const counter = !decline && (application.riskGrade === "C" || application.defaultChance >= 6 || application.collateral < 65);
    if (decline) {
      next = declineLoanRefined(next, application.id);
      declined += 1;
    } else if (counter) {
      next = counterLoanRefined(next, application.id);
      countered += 1;
    } else if (next.cash >= application.amount + 350_000) {
      next = approveLoanRefined(next, application.id);
      approved += 1;
    }
  }

  if (approved + countered + declined > 0) {
    next = addEvent(next, createEvent(state.day, "positive", `${cro.name} completed the central credit queue`, `${approved} approved, ${countered} returned with revised terms and ${declined} declined inside the CRO mandate. Only true concentration or authority exceptions remain.`));
  }
  return next;
}

function routeCollections(state: GameState): GameState {
  const cro = state.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  if (!cro || state.managementControl.lending === "manual") return state;
  let next = state;
  let handled = 0;

  for (const collectionCase of state.collectionCases.filter((item) => !item.closed)) {
    const loan = next.activeLoans.find((item) => item.id === collectionCase.loanId);
    if (!loan) continue;
    const expectedLoss = Math.max(0, loan.outstanding - collectionCase.expectedRecovery);
    if (expectedLoss > 2_000_000) continue;
    if (collectionCase.stage === "external-collections" && loan.daysPastDue < 120) continue;

    if (loan.daysPastDue >= 120) next = takeCollectionAction(next, loan.id, "enforce-collateral", true);
    else if (loan.daysPastDue >= 90) next = takeCollectionAction(next, loan.id, "external-collections", true);
    else next = takeCollectionAction(next, loan.id, "payment-plan", true);
    handled += 1;
  }

  if (handled > 0) next = addEvent(next, createEvent(state.day, "neutral", `${cro.name} advanced ${handled} recovery case${handled === 1 ? "" : "s"}`, "Routine arrears and recoveries stayed with credit operations. Only unusually large expected losses will escalate."));
  return next;
}

function routineTechnologyTask(task: CEOInboxTask) {
  if (!task.decision || task.decision.category !== "technology") return false;
  const text = `${task.title} ${task.summary}`.toLowerCase();
  return !/confirmed loss|customer data|data leak|licence|regulator|major outage|ransom/.test(text);
}

function routeTechnologyOperations(state: GameState): GameState {
  const cto = state.employeeRoster.find((employee) => employee.executiveRole === "CTO");
  if (!cto) return state;
  const task = state.ceoInbox.find((item) => item.status === "open" && routineTechnologyTask(item));
  if (!task?.decision) return state;
  const choice = task.decision.choices.find((item) => /controlled|patch/i.test(`${item.label} ${item.description}`))
    ?? task.decision.choices.find((item) => /isolate|investigate/i.test(`${item.label} ${item.description}`))
    ?? task.decision.choices[0];
  if (!choice) return state;
  const handled = chooseDecisionV5({ ...state, pendingDecision: task.decision }, choice.id);
  const ceoInbox = handled.ceoInbox.map((item) => item.id === task.id ? { ...item, status: "delegated" as const, ownerRole: "CTO" as const } : item);
  return addEvent({ ...handled, pendingDecision: null, ceoInbox }, createEvent(state.day, "positive", `${cto.name} contained a routine cyber event`, `${choice.label} was executed under the CTO mandate. No confirmed customer loss required CEO intervention.`));
}

function normaliseInbox(state: GameState): GameState {
  const cro = state.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  const cmo = state.employeeRoster.find((employee) => employee.executiveRole === "CMO");
  const cto = state.employeeRoster.find((employee) => employee.executiveRole === "CTO");
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  const newest = new Map<string, string>();
  for (const task of [...state.ceoInbox].sort((a, b) => b.createdDay - a.createdDay)) {
    if (task.status === "open" && task.sourceId && !newest.has(task.sourceId)) newest.set(task.sourceId, task.id);
  }

  const ceoInbox = state.ceoInbox.map((original) => {
    let task = original;
    if (task.status === "open" && task.sourceId && newest.get(task.sourceId) !== task.id) return { ...task, status: "delegated" as const };
    if (task.status !== "open") return task;
    if (task.urgency === "routine") return { ...task, status: "delegated" as const };

    const branch = branchFromTask(state, task);
    if (branch && task.sourceId?.startsWith("profit-")) {
      const repeatCount = state.ceoInbox.filter((item) => item.id !== task.id && item.sourceId === task.sourceId && item.status !== "open").length;
      const result = branch.lastMonthProfit ?? 0;
      task = {
        ...task,
        title: repeatCount > 1 ? `${branch.name} remains loss-making after repeated management action` : `${branch.name} is materially loss-making`,
        summary: `Month ending day ${state.day}: ${result >= 0 ? "+" : "−"}NOK ${Math.abs(round(result / 1_000))}k. ${repeatCount > 1 ? "The recovery plan has not solved the underlying issue." : "Management is preparing a recovery plan."}`,
        urgency: repeatCount > 2 ? "critical" : task.urgency,
      };
      const manager = branch.managerId ? state.employeeRoster.find((employee) => employee.id === branch.managerId) : undefined;
      const severe = result <= -200_000 || repeatCount > 2;
      if (!severe && (manager || coo)) return { ...task, status: "delegated" as const, ownerRole: coo ? "COO" as const : task.ownerRole };
    }

    if (task.category === "market" && cmo && task.urgency !== "critical") return { ...task, status: "delegated" as const, ownerRole: "CMO" as const };
    if (task.category === "credit" && cro && task.sourceId) {
      const collectionCase = state.collectionCases.find((item) => item.id === task.sourceId);
      const loan = collectionCase ? state.activeLoans.find((item) => item.id === collectionCase.loanId) : undefined;
      const expectedLoss = collectionCase && loan ? Math.max(0, loan.outstanding - collectionCase.expectedRecovery) : 0;
      if (!collectionCase || collectionCase.closed || expectedLoss <= 2_000_000) return { ...task, status: "delegated" as const, ownerRole: "CRO" as const };
    }
    if (routineTechnologyTask(task) && cto) return { ...task, ownerRole: "CTO" as const };
    return task;
  });

  return { ...state, ceoInbox: ceoInbox.slice(0, 36) };
}

function repairLifetimeResults(state: GameState): GameState {
  if (state.day < 30) return state;
  return {
    ...state,
    branchOffices: state.branchOffices.map((branch) => ({
      ...branch,
      lifetimeProfit: (branch.lifetimeProfit ?? 0) === 0 && (branch.lastMonthProfit ?? 0) !== 0 ? branch.lastMonthProfit : branch.lifetimeProfit,
    })),
  };
}

export function prepareV86State(state: GameState): GameState {
  let next = prepareV85State(state);
  next = ensureOneManagerPerBranch(next);
  next = recalculateRoleWorkloads(next);
  next = routeCreditExceptions(next);
  next = routeCollections(next);
  next = routeTechnologyOperations(next);
  next = normaliseInbox(next);
  next = repairLifetimeResults(next);
  return recalculateRoleWorkloads(next);
}

export function advanceDaysV86(state: GameState, days: number): GameState {
  let current = prepareV86State(state);
  for (let index = 0; index < days; index += 1) {
    const beforeDay = current.day;
    let next = advanceDaysV85(current, 1);
    if (next.day === beforeDay) break;
    next = prepareV86State(next);
    if (next.day % 30 === 0) {
      next = updateMonthlyWellbeing(next);
      next = runBranchStaffing(next);
      next = runBranchUpgradeAuthority(next);
      next = prepareV86State(next);
    }
    current = next;
  }
  return current;
}

export function getDelegationTargetV86(state: GameState, task: CEOInboxTask) {
  return getDelegationTarget(state, task);
}

export function delegateInboxTaskV86(state: GameState, taskId: string): GameState {
  const task = state.ceoInbox.find((item) => item.id === taskId);
  if (!task || !getDelegationTargetV86(state, task)) return state;
  return prepareV86State(delegateInboxTaskV85(state, taskId));
}
