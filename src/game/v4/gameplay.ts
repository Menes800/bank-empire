import { advanceDays as baseAdvanceDays } from "../simulation";
import type {
  ActiveLoan,
  AutomationMode,
  BankProject,
  BranchProfile,
  CampaignStage,
  ExecutiveRole,
  FinancialReport,
  GameState,
  ProductKey,
  ProductTerms,
} from "../types";
import { addEvent, clamp, createEvent, createSeededRandom, round } from "../utils";
import { initialCandidates, STAGE_ORDER } from "./catalog";

const stageRank = (stage: CampaignStage) => STAGE_ORDER.indexOf(stage);

export function deriveCampaignStage(state: GameState): CampaignStage {
  if (state.customers >= 30_000 && state.marketShare >= 18 && state.branchOffices.length >= 8) return "empire";
  if (state.customers >= 12_000 && state.branchOffices.length >= 5 && state.reputation >= 72) return "group";
  if (state.customers >= 4_000 && state.branchOffices.length >= 3 && state.digitalLevel >= 58) return "national";
  if (state.customers >= 1_200 && state.branchOffices.length >= 2 && state.reputation >= 55) return "regional";
  return "startup";
}

export function stageProgress(state: GameState) {
  const stage = deriveCampaignStage(state);
  const targets: Record<CampaignStage, { customers: number; branches: number; reputation: number; digital: number }> = {
    startup: { customers: 1_200, branches: 2, reputation: 55, digital: 35 },
    regional: { customers: 4_000, branches: 3, reputation: 62, digital: 58 },
    national: { customers: 12_000, branches: 5, reputation: 72, digital: 70 },
    group: { customers: 30_000, branches: 8, reputation: 82, digital: 82 },
    empire: { customers: 60_000, branches: 12, reputation: 90, digital: 92 },
  };
  const target = targets[stage];
  const progress = Math.min(100, Math.round((
    Math.min(1, state.customers / target.customers) +
    Math.min(1, state.branchOffices.length / target.branches) +
    Math.min(1, state.reputation / target.reputation) +
    Math.min(1, state.digitalLevel / target.digital)
  ) * 25));
  return { stage, target, progress };
}

function completeProject(state: GameState, project: BankProject): GameState {
  let next = state;
  if (project.kind === "branch" && project.districtId && project.profile) {
    const district = state.districts.find((item) => item.id === project.districtId);
    if (district) {
      next = {
        ...next,
        branchOffices: [...next.branchOffices, {
          id: `branch-${district.id}-${state.day}`,
          districtId: district.id,
          name: `${district.name} Branch`,
          level: 1,
          profile: project.profile,
          capacity: 650,
          staffSlots: 8,
          monthlyRent: district.monthlyRent,
          satisfaction: 72,
          openedDay: state.day,
          managerId: null,
        }],
        branches: next.branches + 1,
        employees: next.employees + 3,
        customers: next.customers + round(80 + district.population / 260),
        reputation: clamp(next.reputation + 2.4, 1, 100),
        campaignXp: next.campaignXp + 180,
      };
    }
  } else if (project.kind === "branch-upgrade" && project.branchId) {
    next = {
      ...next,
      branchOffices: next.branchOffices.map((branch) => branch.id === project.branchId ? {
        ...branch,
        level: Math.min(3, branch.level + 1) as 1 | 2 | 3,
        capacity: round(branch.capacity * 1.45),
        staffSlots: branch.staffSlots + 3,
        satisfaction: clamp(branch.satisfaction + 5, 1, 100),
      } : branch),
      reputation: clamp(next.reputation + 1.2, 1, 100),
      campaignXp: next.campaignXp + 110,
    };
  } else if (project.kind === "mobile-bank") {
    next = { ...next, digitalLevel: clamp(next.digitalLevel + 18, 1, 100), satisfaction: clamp(next.satisfaction + 3, 1, 100), brandStrength: clamp(next.brandStrength + 5, 1, 100), campaignXp: next.campaignXp + 160 };
  } else if (project.kind === "core-banking") {
    next = { ...next, digitalLevel: clamp(next.digitalLevel + 10, 1, 100), cyberSecurity: clamp(next.cyberSecurity + 15, 1, 100), compliance: clamp(next.compliance + 5, 1, 100), campaignXp: next.campaignXp + 220 };
  } else if (project.kind === "head-office") {
    next = { ...next, reputation: clamp(next.reputation + 5, 1, 100), boardConfidence: clamp(next.boardConfidence + 7, 1, 100), campaignXp: next.campaignXp + 300 };
  } else if (project.kind === "integration") {
    next = { ...next, satisfaction: clamp(next.satisfaction + 4, 1, 100), boardConfidence: clamp(next.boardConfidence + 4, 1, 100), campaignXp: next.campaignXp + 250 };
  }
  return addEvent(next, createEvent(state.day, "positive", `${project.name} completed`, "The project is operational and its benefits are now reflected across the bank."));
}

function advanceProjects(state: GameState, random: () => number): GameState {
  let next = state;
  const projects = state.projects.map((project) => {
    if (project.status === "completed") return project;
    const expectedRole: ExecutiveRole = project.kind === "mobile-bank" || project.kind === "core-banking" ? "CTO" : "COO";
    const executive = state.employeeRoster.find((employee) => employee.executiveRole === expectedRole);
    const leadershipBonus = executive ? Math.max(0, executive.leadership - 60) / 120 : 0;
    const delayChance = Math.max(0.003, project.risk / 2200 - leadershipBonus / 100);
    const delayed = random() < delayChance;
    const remainingDays = Math.max(0, project.remainingDays - (delayed ? 0 : 1));
    const status: BankProject["status"] = delayed ? "delayed" : remainingDays === 0 ? "completed" : "active";
    const updated: BankProject = { ...project, remainingDays, status, spent: Math.min(project.budget, project.spent + project.budget / Math.max(1, project.durationDays)) };
    if (remainingDays === 0) next = completeProject(next, updated);
    return updated;
  });
  return { ...next, projects };
}

function executiveBonus(state: GameState, role: ExecutiveRole) {
  const executive = state.employeeRoster.find((employee) => employee.executiveRole === role);
  return executive ? (executive.skill + executive.leadership) / 200 : 0;
}

function applyAutomation(state: GameState): GameState {
  let next = state;
  const cfo = executiveBonus(state, "CFO");
  const coo = executiveBonus(state, "COO");
  const cro = executiveBonus(state, "CRO");
  const cmo = executiveBonus(state, "CMO");
  const cto = executiveBonus(state, "CTO");

  if (state.automation.treasury !== "manual" && cfo > 0) {
    const target = state.automation.treasury === "conservative" ? 32 : state.automation.treasury === "growth" ? 18 : 25;
    if (state.liquidityRatio < target && state.wholesaleFunding < state.deposits * 0.35) {
      const amount = Math.min(75_000 * cfo, Math.max(0, state.deposits * 0.002));
      next = { ...next, cash: next.cash + amount, wholesaleFunding: next.wholesaleFunding + amount };
    }
  }
  if (state.automation.lending !== "manual" && cro > 0) {
    const desired = state.automation.lending === "conservative" ? "conservative" : state.automation.lending === "growth" ? "aggressive" : "balanced";
    next = { ...next, lendingPolicy: desired, compliance: clamp(next.compliance + cro * 0.03, 1, 100) };
  }
  if (state.automation.marketing !== "manual" && cmo > 0) {
    const spend = state.automation.marketing === "growth" ? 6_000 : state.automation.marketing === "conservative" ? 1_500 : 3_500;
    if (next.cash > spend + 800_000) next = { ...next, cash: next.cash - spend, brandStrength: clamp(next.brandStrength + cmo * 0.045, 1, 100), customers: next.customers + Math.max(0, round(cmo * (state.automation.marketing === "growth" ? 2.2 : 1))) };
  }
  if (state.automation.operations !== "manual" && coo > 0) {
    next = { ...next, branchOffices: next.branchOffices.map((branch) => ({ ...branch, satisfaction: clamp(branch.satisfaction + coo * 0.025, 1, 100) })), satisfaction: clamp(next.satisfaction + coo * 0.012, 1, 100) };
  }
  if (cto > 0 && state.day % 7 === 0) next = { ...next, digitalLevel: clamp(next.digitalLevel + cto * 0.08, 1, 100), cyberSecurity: clamp(next.cyberSecurity + cto * 0.05, 1, 100) };
  return next;
}

function updateActiveLoans(state: GameState, random: () => number): GameState {
  let cashDelta = 0;
  let losses = 0;
  const activeLoans: ActiveLoan[] = state.activeLoans.map((loan) => {
    if (loan.status === "defaulted") return loan;
    const macroStress = state.economicCycle === "recession" ? 1.8 : state.economicCycle === "slowdown" ? 1.25 : 0.85;
    const riskBase = { A: 0.00004, B: 0.0001, C: 0.00023, D: 0.00055 }[loan.riskGrade] * macroStress;
    let status: ActiveLoan["status"] = loan.status;
    let daysPastDue = loan.daysPastDue;
    if (random() < riskBase) {
      daysPastDue += 30;
      status = daysPastDue >= 90 ? "defaulted" : daysPastDue >= 30 ? "delinquent" : "watch";
    }
    let outstanding = loan.outstanding;
    let nextPaymentDay = loan.nextPaymentDay;
    if (state.day >= loan.nextPaymentDay && status !== "defaulted") {
      const principalPayment = Math.min(outstanding, loan.principal / 120);
      const interestPayment = outstanding * loan.rate / 100 / 12;
      outstanding = Math.max(0, outstanding - principalPayment);
      cashDelta += principalPayment + interestPayment;
      nextPaymentDay += 30;
      if (daysPastDue > 0 && random() > 0.55) daysPastDue = Math.max(0, daysPastDue - 30);
      if (daysPastDue === 0) status = "performing";
    }
    if (status === "defaulted") losses += Math.max(0, outstanding - outstanding * loan.collateral / 100);
    return { ...loan, outstanding, nextPaymentDay, daysPastDue, status };
  });
  return { ...state, activeLoans, cash: Math.max(0, state.cash + cashDelta - losses), creditLosses: state.creditLosses + losses, loans: Math.max(0, state.loans - Math.min(state.loans, losses)) };
}

function updateSegments(state: GameState): GameState {
  const totalExisting = Math.max(1, state.customerSegments.reduce((sum, segment) => sum + segment.customers, 0));
  const branchCapacity = state.branchOffices.reduce((sum, branch) => sum + branch.capacity, 0);
  const servicePressure = state.customers / Math.max(1, branchCapacity + state.digitalLevel * 20);
  const customerSegments = state.customerSegments.map((segment) => {
    const targetCustomers = Math.max(1, round(state.customers * segment.customers / totalExisting));
    const channelFit = segment.preferredChannel === "digital" ? state.digitalLevel : segment.preferredChannel === "branch" ? state.branchOffices.length * 14 : state.employeeRoster.length * 5;
    const satisfaction = clamp(segment.satisfaction + (channelFit - 55) * 0.004 - Math.max(0, servicePressure - 1) * 0.16, 25, 98);
    const loyalty = clamp(segment.loyalty + (satisfaction - 70) * 0.006, 20, 98);
    const churnRisk = clamp(42 - loyalty * 0.32 + Math.max(0, servicePressure - 1) * 20, 2, 70);
    return { ...segment, customers: targetCustomers, satisfaction, loyalty, churnRisk };
  });
  return { ...state, customerSegments };
}

function createMonthlyReport(state: GameState): FinancialReport {
  const feeIncome = Math.max(0, state.customers * (2.5 + state.products.length * 0.7) * 30);
  const interestIncome = Math.max(0, state.revenue * 30 - feeIncome);
  const operatingExpenses = Math.max(0, state.expenses * 30 - state.creditLosses);
  const netIncome = state.profit * 30;
  const assets = state.cash + state.loans + state.loanLossReserve;
  const liabilities = state.deposits + state.wholesaleFunding;
  return {
    id: `report-${state.year}-${state.quarter}-${state.day}`,
    day: state.day,
    year: state.year,
    quarter: state.quarter,
    interestIncome,
    feeIncome,
    operatingExpenses,
    creditLosses: state.creditLosses * 30,
    netIncome,
    assets,
    liabilities,
    equity: assets - liabilities,
    operatingCashFlow: netIncome + state.creditLosses - Math.max(0, state.customersGained * 800),
    budgetVariance: state.monthlyBudget - operatingExpenses,
  };
}

function updateBoard(state: GameState): GameState {
  const boardMembers = state.boardMembers.map((member) => {
    let change = 0;
    if (member.priority === "growth") change = state.customersGained > state.customersLost ? 0.8 : -0.7;
    if (member.priority === "risk") change = state.capitalRatio >= 12.5 && state.liquidityRatio >= 18 ? 0.7 : -1.5;
    if (member.priority === "customers") change = state.satisfaction >= 72 ? 0.7 : -0.9;
    if (member.priority === "profit") change = state.profit > 0 ? 0.8 : -1.2;
    if (member.priority === "technology") change = state.digitalLevel >= 55 ? 0.6 : -0.5;
    return { ...member, support: clamp(member.support + change, 1, 100) };
  });
  const influence = Math.max(1, boardMembers.reduce((sum, member) => sum + member.influence, 0));
  const confidence = boardMembers.reduce((sum, member) => sum + member.support * member.influence, 0) / influence;
  return { ...state, boardMembers, boardConfidence: clamp(confidence, 1, 100) };
}

function updateTutorial(state: GameState): GameState {
  return { ...state, tutorialSteps: state.tutorialSteps.map((step) => {
    if (step.completed) return step;
    const completed =
      (step.id === "tutorial-rates" && state.day > 3) ||
      (step.id === "tutorial-project" && state.projects.length > 0) ||
      (step.id === "tutorial-leader" && state.employeeRoster.some((employee) => employee.executiveRole)) ||
      (step.id === "tutorial-credit" && state.activeLoans.length > 0) ||
      (step.id === "tutorial-report" && state.reports.length > 0);
    return { ...step, completed };
  }) };
}

function advanceV4Day(state: GameState): GameState {
  const random = createSeededRandom(`${state.worldSeed}-${state.day}-v4`);
  let next = updateSegments(updateActiveLoans(applyAutomation(advanceProjects(state, random)), random));
  if (next.day % 30 === 0) {
    next = updateBoard(next);
    next = { ...next, reports: [createMonthlyReport(next), ...next.reports].slice(0, 36), candidatePool: next.candidatePool.length < 4 ? initialCandidates(next.day) : next.candidatePool };
  }
  const previousStage = next.campaignStage;
  const campaignStage = deriveCampaignStage(next);
  next = { ...next, campaignStage, campaignXp: next.campaignXp + 1, branches: next.branchOffices.length, employees: Math.max(next.employees, next.employeeRoster.length) };
  if (stageRank(campaignStage) > stageRank(previousStage)) next = addEvent(next, createEvent(next.day, "positive", `${campaignStage[0].toUpperCase() + campaignStage.slice(1)} stage unlocked`, "New markets, leadership options and strategic systems are now available."));
  return updateTutorial(next);
}

export function advanceDaysRefined(state: GameState, days: number): GameState {
  let current = state;
  for (let index = 0; index < days; index += 1) {
    if (current.pendingDecision || current.gameOverReason) break;
    const before = current.day;
    current = baseAdvanceDays(current, 1);
    if (current.day === before) break;
    current = advanceV4Day(current);
  }
  return current;
}

export function startBranchProject(state: GameState, districtId: string, profile: BranchProfile): GameState {
  const district = state.districts.find((item) => item.id === districtId);
  if (!district || stageRank(state.campaignStage) < stageRank(district.requiredStage) || state.branchOffices.some((branch) => branch.districtId === districtId) || state.projects.some((project) => project.districtId === districtId && project.status !== "completed")) return state;
  const duration = 75 + round(district.competition * 0.35);
  if (state.cash < district.openingCost) return state;
  const project: BankProject = { id: `project-branch-${districtId}-${state.day}`, name: `Open ${district.name}`, kind: "branch", status: "active", startDay: state.day, durationDays: duration, remainingDays: duration, budget: district.openingCost, spent: 0, risk: 22 + district.competition * 0.35, districtId, profile };
  return addEvent({ ...state, cash: state.cash - district.openingCost, projects: [project, ...state.projects] }, createEvent(state.day, "neutral", "Branch project approved", `${district.name} will open in approximately ${duration} days.`));
}

export function startStrategicProject(state: GameState, kind: "mobile-bank" | "core-banking" | "head-office"): GameState {
  const config = {
    "mobile-bank": { name: "Next-generation mobile bank", duration: 120, budget: 2_600_000, risk: 32 },
    "core-banking": { name: "Core banking modernisation", duration: 210, budget: 5_500_000, risk: 48 },
    "head-office": { name: "Regional head office", duration: 270, budget: 8_000_000, risk: 36 },
  }[kind];
  if (state.cash < config.budget || state.projects.some((project) => project.kind === kind && project.status !== "completed")) return state;
  const project: BankProject = { id: `project-${kind}-${state.day}`, name: config.name, kind, status: "active", startDay: state.day, durationDays: config.duration, remainingDays: config.duration, budget: config.budget, spent: 0, risk: config.risk };
  return addEvent({ ...state, cash: state.cash - config.budget, projects: [project, ...state.projects] }, createEvent(state.day, "neutral", "Strategic project started", `${config.name} has entered delivery.`));
}

export function startBranchUpgrade(state: GameState, branchId: string): GameState {
  const branch = state.branchOffices.find((item) => item.id === branchId);
  if (!branch || branch.level >= 3 || state.projects.some((project) => project.branchId === branchId && project.status !== "completed")) return state;
  const budget = branch.level === 1 ? 1_150_000 : 2_100_000;
  if (state.cash < budget) return state;
  const duration = branch.level === 1 ? 60 : 95;
  const project: BankProject = { id: `project-upgrade-${branchId}-${state.day}`, name: `Upgrade ${branch.name}`, kind: "branch-upgrade", status: "active", startDay: state.day, durationDays: duration, remainingDays: duration, budget, spent: 0, risk: 24, branchId };
  return { ...state, cash: state.cash - budget, projects: [project, ...state.projects] };
}

export function hireCandidateRefined(state: GameState, candidateId: string): GameState {
  const candidate = state.candidatePool.find((item) => item.id === candidateId);
  if (!candidate || state.cash < candidate.salary * 2) return state;
  return addEvent({ ...state, cash: state.cash - candidate.salary * 2, employeeRoster: [...state.employeeRoster, candidate], candidatePool: state.candidatePool.filter((item) => item.id !== candidateId), employees: state.employees + 1 }, createEvent(state.day, "positive", `${candidate.name} hired`, `${candidate.role} joined the bank with the trait “${candidate.trait}”.`));
}

export function appointExecutive(state: GameState, employeeId: string, executiveRole: ExecutiveRole): GameState {
  const candidate = state.employeeRoster.find((item) => item.id === employeeId);
  if (!candidate || candidate.leadership < 60) return state;
  return addEvent({ ...state, employeeRoster: state.employeeRoster.map((employee) => employee.id === employeeId ? { ...employee, executiveRole } : employee.executiveRole === executiveRole ? { ...employee, executiveRole: null } : employee) }, createEvent(state.day, "positive", `${executiveRole} appointed`, `${candidate.name} now owns the ${executiveRole} mandate.`));
}

export function setAutomationMode(state: GameState, area: keyof GameState["automation"], mode: AutomationMode): GameState {
  return { ...state, automation: { ...state.automation, [area]: mode } };
}

export function updateProductTerms(state: GameState, key: ProductKey, patch: Partial<ProductTerms>): GameState {
  return { ...state, productTerms: { ...state.productTerms, [key]: { ...state.productTerms[key], ...patch, key } } };
}

function convertApplication(state: GameState, applicationId: string, amountFactor: number, rateBonus: number): GameState {
  const application = state.loanApplications.find((item) => item.id === applicationId);
  if (!application) return state;
  const amount = round(application.amount * amountFactor);
  if (state.cash < amount) return state;
  const loan: ActiveLoan = { id: `active-${application.id}`, customerName: application.customerName, segment: application.segment, principal: amount, outstanding: amount, rate: application.rate + rateBonus, riskGrade: application.riskGrade, collateral: application.collateral, status: "performing", daysPastDue: 0, originatedDay: state.day, nextPaymentDay: state.day + 30 };
  return addEvent({ ...state, cash: state.cash - amount, loans: state.loans + amount, activeLoans: [loan, ...state.activeLoans], loanApplications: state.loanApplications.filter((item) => item.id !== applicationId), customers: state.customers + 1 }, createEvent(state.day, application.riskGrade === "D" ? "warning" : "positive", amountFactor < 1 ? "Credit counter-offer accepted" : "Credit approved", `${application.customerName} received ${round(amount / 1000)}k at ${loan.rate.toFixed(2)}%.`));
}

export const approveLoanRefined = (state: GameState, applicationId: string) => convertApplication(state, applicationId, 1, 0);
export const counterLoanRefined = (state: GameState, applicationId: string) => convertApplication(state, applicationId, 0.72, 0.55);
export function declineLoanRefined(state: GameState, applicationId: string): GameState {
  const application = state.loanApplications.find((item) => item.id === applicationId);
  if (!application) return state;
  return addEvent({ ...state, loanApplications: state.loanApplications.filter((item) => item.id !== applicationId) }, createEvent(state.day, "neutral", "Credit declined", `${application.customerName} did not meet the bank's current risk appetite.`));
}

export function restructureLoan(state: GameState, loanId: string): GameState {
  const loan = state.activeLoans.find((item) => item.id === loanId);
  if (!loan || (loan.status !== "delinquent" && loan.status !== "watch")) return state;
  return { ...state, activeLoans: state.activeLoans.map((item) => item.id === loanId ? { ...item, status: "restructured", daysPastDue: 0, rate: item.rate + 0.35, nextPaymentDay: state.day + 45 } : item), reputation: clamp(state.reputation + 0.2, 1, 100) };
}

export function setStrategicFocus(state: GameState, strategicFocus: GameState["strategicFocus"]): GameState {
  const boardMembers = state.boardMembers.map((member) => {
    const aligned = member.priority === "growth" && strategicFocus === "growth" || member.priority === "customers" && strategicFocus === "trust" || member.priority === "profit" && strategicFocus === "efficiency" || member.priority === "technology" && strategicFocus === "digital" || strategicFocus === "balanced";
    return { ...member, support: clamp(member.support + (aligned ? 3 : -0.5), 1, 100) };
  });
  return addEvent({ ...state, strategicFocus, boardMembers }, createEvent(state.day, "neutral", "Group strategy updated", `Management selected ${strategicFocus} as the current strategic focus.`));
}

export function setMonthlyBudget(state: GameState, monthlyBudget: number): GameState {
  return { ...state, monthlyBudget: clamp(monthlyBudget, 250_000, 50_000_000) };
}

export function dismissAdvisor(state: GameState, insightId: string): GameState {
  return state.dismissedAdvisorIds.includes(insightId) ? state : { ...state, dismissedAdvisorIds: [...state.dismissedAdvisorIds, insightId] };
}
