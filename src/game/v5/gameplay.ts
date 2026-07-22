import { chooseDecision, takeCourse, applyForPromotion, takeDividend } from "../actions";
import { advanceDaysPolished } from "../v41/pacing";
import { approveLoanRefined, counterLoanRefined, declineLoanRefined, setAutomationMode } from "../v4/gameplay";
import type { AutomationMode, DecisionEvent, EmployeeProfile, ExecutiveRole, GameState } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";

export type LiquidityForecast = {
  level: "stable" | "watch" | "warning" | "critical";
  runwayDays: number;
  dailyCashChange: number;
  cause: string;
  recommendation: string;
};

const ROLE_KEYWORDS: Record<ExecutiveRole, string[]> = {
  CFO: ["finance", "treasury", "capital", "account", "funding"],
  COO: ["operation", "branch", "organiser", "delivery", "service"],
  CRO: ["risk", "credit", "underwriter", "compliance", "conservative"],
  CMO: ["marketing", "growth", "sales", "brand", "relationship"],
  CTO: ["technology", "digital", "cyber", "system", "transformer"],
};

export function executiveRoleFit(employee: EmployeeProfile, role: ExecutiveRole) {
  const text = `${employee.role} ${employee.trait}`.toLowerCase();
  const keywordHits = ROLE_KEYWORDS[role].filter((keyword) => text.includes(keyword)).length;
  const specialistBonus = Math.min(28, keywordHits * 12);
  return Math.round(clamp(employee.skill * 0.48 + employee.leadership * 0.34 + employee.loyalty * 0.08 + specialistBonus, 0, 100));
}

export function bestExecutiveRole(employee: EmployeeProfile): { role: ExecutiveRole; fit: number } {
  const roles: ExecutiveRole[] = ["CFO", "COO", "CRO", "CMO", "CTO"];
  return roles
    .map((role) => ({ role, fit: executiveRoleFit(employee, role) }))
    .sort((a, b) => b.fit - a.fit)[0];
}

export function shortlistExecutiveCandidates(candidates: EmployeeProfile[], role: ExecutiveRole, limit = 3) {
  return [...candidates]
    .sort((a, b) => executiveRoleFit(b, role) - executiveRoleFit(a, role) || b.leadership - a.leadership || a.salary - b.salary)
    .slice(0, Math.max(0, limit));
}

export function getFounderBonuses(state: GameState) {
  const educationSaving = state.educationLevel * 0.8;
  const careerSaving = state.careerLevel * 0.55;
  return {
    operatingEfficiency: educationSaving + careerSaving,
    riskControl: state.educationLevel * 1.5,
    boardInfluence: state.careerLevel * 2.5,
    reputationInfluence: state.careerLevel * 1.2,
    projectLeadership: state.careerLevel >= 2 ? state.careerLevel - 1 : 0,
  };
}

function applyFounderInfluence(state: GameState): GameState {
  if (state.educationLevel === 0 && state.careerLevel === 0) return state;
  const bonuses = getFounderBonuses(state);
  const saving = Math.max(0, state.expenses * bonuses.operatingEfficiency / 100);
  let next: GameState = {
    ...state,
    cash: state.cash + saving,
    profit: state.profit + saving,
    totalProfit: state.totalProfit + saving,
    riskScore: clamp(state.riskScore - state.educationLevel * 0.008, 1, 100),
    boardConfidence: clamp(state.boardConfidence + state.careerLevel * 0.006, 1, 100),
    reputation: clamp(state.reputation + state.careerLevel * 0.0025, 1, 100),
  };
  if (state.day % 30 === 0 && bonuses.projectLeadership > 0) {
    next = {
      ...next,
      projects: next.projects.map((project) => project.status === "active" || project.status === "delayed"
        ? { ...project, remainingDays: Math.max(0, project.remainingDays - bonuses.projectLeadership) }
        : project),
    };
  }
  return next;
}

export function getLiquidityForecast(state: GameState): LiquidityForecast {
  const history = state.history.slice(-10);
  const first = history[0];
  const last = history[history.length - 1];
  const elapsed = Math.max(1, (last?.day ?? state.day) - (first?.day ?? state.day - 1));
  const historicalChange = first && last ? (last.cash - first.cash) / elapsed : state.profit;
  const dailyCashChange = Math.min(historicalChange, state.profit);
  const burn = Math.max(0, -dailyCashChange);
  const runwayDays = burn > 100 ? Math.max(0, Math.round(state.cash / burn)) : 999;

  const loanPressure = state.customersGained > 0 && state.loans > state.deposits * 0.9;
  const projectPressure = state.projects.some((project) => project.status !== "completed");
  const cause = loanPressure
    ? "Loan growth is using cash faster than deposits are arriving."
    : projectPressure && state.cash < 2_000_000
      ? "Active projects and daily operations are consuming the remaining cash buffer."
      : state.profit < 0
        ? "The bank is currently losing cash through normal operations."
        : state.liquidityRatio < 18
          ? "The liquid buffer is too small compared with customer deposits."
          : "Cash generation and liquidity are currently stable.";

  let level: LiquidityForecast["level"] = "stable";
  if (state.liquidityRatio < 8 || runwayDays <= 10 || state.liquidityBreachDays > 0) level = "critical";
  else if (state.liquidityRatio < 13 || runwayDays <= 25) level = "warning";
  else if (state.liquidityRatio < 20 || runwayDays <= 55) level = "watch";

  const recommendation = level === "critical"
    ? "Raise funding or capital immediately, and stop new lending until the buffer recovers."
    : level === "warning"
      ? "Slow lending, improve deposit pricing and keep enough cash for withdrawals."
      : level === "watch"
        ? "Review treasury and avoid committing most of the cash to new projects."
        : "No emergency action is required.";

  return { level, runwayDays, dailyCashChange, cause, recommendation };
}

function managementEvent(state: GameState, role: ExecutiveRole, title: string, body: string, tone: "positive" | "warning" | "neutral" = "neutral") {
  return addEvent(state, createEvent(state.day, tone, `${role} report · ${title}`, body));
}

function runMonthlyDelegation(state: GameState): GameState {
  let next = state;
  const executive = (role: ExecutiveRole) => next.employeeRoster.find((employee) => employee.executiveRole === role);

  const cfo = executive("CFO");
  if (cfo && next.automation.treasury !== "manual") {
    const mode = next.automation.treasury;
    const target = mode === "conservative" ? 32 : mode === "growth" ? 18 : 25;
    if (next.liquidityRatio < target) {
      const amount = Math.min(mode === "growth" ? 1_500_000 : 3_000_000, Math.max(750_000, next.deposits * 0.05));
      next = {
        ...next,
        cash: next.cash + amount,
        wholesaleFunding: next.wholesaleFunding + amount,
        wholesaleFundingRate: clamp(next.baseRate + 1.2 + next.riskScore / 110, 2, 14),
        liquidityRatio: clamp(next.liquidityRatio + amount / Math.max(1, next.deposits) * 100, 0, 100),
      };
      next = managementEvent(next, "CFO", "liquidity protected", `Raised $${Math.round(amount / 1000)}k of wholesale funding to move toward a ${target}% liquidity target.`, "positive");
    } else {
      next = managementEvent(next, "CFO", "buffer reviewed", `Liquidity is above the ${target}% mandate target. No funding was required.`);
    }
  }

  const cro = executive("CRO");
  if (cro && next.automation.lending !== "manual" && next.loanApplications.length > 0) {
    const application = next.loanApplications[0];
    const mode = next.automation.lending;
    const approve = mode === "growth" ? application.riskGrade !== "D" : mode === "balanced" ? ["A", "B"].includes(application.riskGrade) : application.riskGrade === "A";
    const counter = !approve && mode !== "conservative" && application.riskGrade === "C";
    next = approve ? approveLoanRefined(next, application.id) : counter ? counterLoanRefined(next, application.id) : declineLoanRefined(next, application.id);
    next = managementEvent(next, "CRO", "credit case handled", `${application.customerName} was ${approve ? "approved" : counter ? "given a smaller counter-offer" : "declined"} under the ${mode} mandate.`, approve ? "positive" : "neutral");
  }

  const cmo = executive("CMO");
  if (cmo && next.automation.marketing !== "manual") {
    const mode = next.automation.marketing;
    const spend = mode === "growth" ? 220_000 : mode === "balanced" ? 110_000 : 55_000;
    if (next.cash > spend + 500_000) {
      const gained = round((cmo.skill + cmo.leadership) * (mode === "growth" ? 1.4 : mode === "balanced" ? 0.8 : 0.42));
      next = { ...next, cash: next.cash - spend, customers: next.customers + gained, brandStrength: clamp(next.brandStrength + gained / 180, 1, 100) };
      next = managementEvent(next, "CMO", "campaign delivered", `Spent $${Math.round(spend / 1000)}k and attracted approximately ${gained} customers.`, "positive");
    }
  }

  const coo = executive("COO");
  if (coo && next.automation.operations !== "manual") {
    const mode = next.automation.operations;
    const improvement = mode === "growth" ? 3 : mode === "balanced" ? 2 : 1;
    next = {
      ...next,
      satisfaction: clamp(next.satisfaction + improvement * 0.4, 1, 100),
      branchOffices: next.branchOffices.map((branch) => ({ ...branch, satisfaction: clamp(branch.satisfaction + improvement, 1, 100), capacity: branch.capacity + (mode === "growth" ? 18 : 6) })),
      projects: next.projects.map((project) => project.status !== "completed" ? { ...project, remainingDays: Math.max(0, project.remainingDays - improvement) } : project),
    };
    next = managementEvent(next, "COO", "network optimised", `Improved service capacity and removed ${improvement} delivery days from active projects.`, "positive");
  }

  const cto = executive("CTO");
  if (cto) {
    const gain = Math.max(1, round((cto.skill + cto.leadership) / 95));
    next = { ...next, digitalLevel: clamp(next.digitalLevel + gain, 1, 100), cyberSecurity: clamp(next.cyberSecurity + gain * 0.7, 1, 100) };
    next = managementEvent(next, "CTO", "technology roadmap advanced", `Digital capability improved by ${gain} and cyber controls were strengthened.`, "positive");
  }

  return next;
}

function liquidityCrisis(state: GameState): DecisionEvent {
  const forecast = getLiquidityForecast(state);
  return {
    id: "v5-liquidity-crisis",
    title: "Emergency liquidity meeting",
    description: `${forecast.cause} The bank has entered a supervised recovery window instead of failing immediately. Choose a rescue action now.`,
    category: "regulatory",
    choices: [
      { id: "v5-emergency-funding", label: "Secure emergency funding", description: "Borrow $6m immediately. Fast and reliable, but future interest costs increase.", effect: {} },
      { id: "v5-sell-loans", label: "Sell part of the loan book", description: "Release cash quickly at a 10% discount and reduce future interest income.", effect: {} },
      { id: "v5-equity-rescue", label: "Issue emergency equity", description: "Raise $5m and strengthen capital, but dilute owners and pressure the share price.", effect: {} },
      { id: "v5-accept-resolution", label: "Accept regulatory resolution", description: "End the campaign and review why the bank failed.", effect: {} },
    ],
  };
}

function capitalCrisis(): DecisionEvent {
  return {
    id: "v5-capital-crisis",
    title: "Capital restoration required",
    description: "The bank has breached its capital requirement. The regulator has granted one final restoration meeting before withdrawing the licence.",
    category: "regulatory",
    choices: [
      { id: "v5-equity-rescue", label: "Issue emergency equity", description: "Raise $5m and restore the capital buffer immediately.", effect: {} },
      { id: "v5-sell-loans", label: "Reduce risk-weighted assets", description: "Sell part of the loan portfolio at a discount to reduce capital pressure.", effect: {} },
      { id: "v5-accept-resolution", label: "Accept regulatory resolution", description: "End the campaign and review the failure.", effect: {} },
    ],
  };
}

export function advanceDaysV5(state: GameState, days: number): GameState {
  let current = state;
  for (let index = 0; index < days; index += 1) {
    if (current.pendingDecision || current.gameOverReason) break;
    current = advanceDaysPolished(current, 1);
    current = applyFounderInfluence(current);
    if (current.day % 30 === 0 && !current.pendingDecision) current = runMonthlyDelegation(current);

    if (current.gameOverReason?.includes("illiquid")) {
      current = { ...current, gameOverReason: null, liquidityBreachDays: 0, pendingDecision: liquidityCrisis(current) };
      current = addEvent(current, createEvent(current.day, "warning", "Emergency recovery window opened", "The regulator paused resolution so management can attempt one final liquidity rescue."));
    } else if (current.gameOverReason?.includes("capital ratio")) {
      current = { ...current, gameOverReason: null, capitalBreachDays: 0, pendingDecision: capitalCrisis() };
    }
  }
  return current;
}

export function chooseDecisionV5(state: GameState, choiceId: string): GameState {
  if (!state.pendingDecision?.id.startsWith("v5-")) return chooseDecision(state, choiceId);
  if (choiceId === "v5-emergency-funding") {
    const amount = 6_000_000;
    return managementEvent({ ...state, pendingDecision: null, cash: state.cash + amount, wholesaleFunding: state.wholesaleFunding + amount, wholesaleFundingRate: clamp(state.baseRate + 2.1, 3, 15), liquidityRatio: clamp(state.liquidityRatio + 22, 0, 100), liquidityBreachDays: 0, bankRunRisk: clamp(state.bankRunRisk - 25, 0, 100), boardConfidence: clamp(state.boardConfidence - 2, 1, 100) }, "CFO", "emergency facility secured", "The bank borrowed $6m and reopened with a materially stronger liquidity buffer.", "warning");
  }
  if (choiceId === "v5-sell-loans") {
    const sold = Math.min(3_000_000, state.loans);
    const proceeds = sold * 0.9;
    return addEvent({ ...state, pendingDecision: null, cash: state.cash + proceeds, loans: state.loans - sold, creditLosses: state.creditLosses + sold * 0.1, liquidityRatio: clamp(state.liquidityRatio + 14, 0, 100), liquidityBreachDays: 0, capitalBreachDays: 0 }, createEvent(state.day, "warning", "Loan portfolio sold", `$${Math.round(sold / 1000)}k of loans were sold at a 10% discount to protect the bank.`));
  }
  if (choiceId === "v5-equity-rescue") {
    return addEvent({ ...state, pendingDecision: null, cash: state.cash + 5_000_000, capitalRatio: clamp(state.capitalRatio + 5.5, 0, 100), liquidityRatio: clamp(state.liquidityRatio + 12, 0, 100), sharePrice: Math.max(3, state.sharePrice * 0.84), capitalBreachDays: 0, liquidityBreachDays: 0, boardConfidence: clamp(state.boardConfidence - 4, 1, 100) }, createEvent(state.day, "warning", "Emergency equity issued", "New investors supplied $5m of capital. Existing owners were diluted, but the bank survived."));
  }
  if (choiceId === "v5-accept-resolution") return { ...state, pendingDecision: null, gameOverReason: "Management accepted regulatory resolution after the bank could not restore a safe liquidity or capital position." };
  return state;
}

export function hireCandidateToRole(state: GameState, candidateId: string, role: ExecutiveRole): GameState {
  const candidate = state.candidatePool.find((item) => item.id === candidateId);
  if (!candidate || state.cash < candidate.salary * 2 || executiveRoleFit(candidate, role) < 58) return state;
  const employee = { ...candidate, executiveRole: role };
  return addEvent({ ...state, cash: state.cash - candidate.salary * 2, employeeRoster: [...state.employeeRoster.map((item) => item.executiveRole === role ? { ...item, executiveRole: null } : item), employee], candidatePool: state.candidatePool.filter((item) => item.id !== candidateId), employees: state.employees + 1 }, createEvent(state.day, "positive", `${role} mandate filled`, `${candidate.name} joined as ${role} with a ${executiveRoleFit(candidate, role)}% role fit.`));
}

export function appointExecutiveV5(state: GameState, employeeId: string, role: ExecutiveRole): GameState {
  const employee = state.employeeRoster.find((item) => item.id === employeeId);
  if (!employee || employee.leadership < 55 || executiveRoleFit(employee, role) < 58) return state;
  return addEvent({ ...state, employeeRoster: state.employeeRoster.map((item) => item.id === employeeId ? { ...item, executiveRole: role } : item.executiveRole === role ? { ...item, executiveRole: null } : item) }, createEvent(state.day, "positive", `${role} appointed`, `${employee.name} now owns the mandate with a ${executiveRoleFit(employee, role)}% role fit.`));
}

export function setAutomationModeV5(state: GameState, area: keyof GameState["automation"], mode: AutomationMode): GameState {
  return setAutomationMode(state, area, mode);
}

export function takeFounderCourse(state: GameState): GameState {
  const next = takeCourse(state);
  if (next === state) return state;
  return addEvent({ ...next, compliance: clamp(next.compliance + 2, 1, 100), riskScore: clamp(next.riskScore - 1.5, 1, 100) }, createEvent(state.day, "positive", "Founder expertise applied", "The course now provides a permanent operating-efficiency and risk-control benefit."));
}

export function advanceFounderCareer(state: GameState): GameState {
  const next = applyForPromotion(state);
  if (next === state) return state;
  return addEvent({ ...next, boardConfidence: clamp(next.boardConfidence + 2, 1, 100), brandStrength: clamp(next.brandStrength + 1, 1, 100) }, createEvent(state.day, "positive", "Founder influence increased", "Your new status improves board authority, reputation and project leadership."));
}

export const takeFounderDividend = (state: GameState) => takeDividend(state);
