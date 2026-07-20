import { chooseDecisionV5, advanceDaysV5 } from "../v5/gameplay";
import { setStrategicFocus } from "../v4/gameplay";
import type {
  BranchFocus,
  BranchMandate,
  CashFlowSnapshot,
  GameState,
  LoanApplication,
  ProductKey,
  ProductPreset,
  ProductTerms,
} from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";

export type CreditRecommendation = {
  action: "approve" | "counter" | "decline";
  label: string;
  reason: string;
  expectedProfit: number;
  liquidityImpact: number;
  risk: "Low" | "Medium" | "High";
};

const branchMandateSpend: Record<BranchMandate, number> = {
  manual: 0,
  guarded: 15_000,
  autonomous: 30_000,
  growth: 55_000,
};

function recordCashFlow(before: GameState, after: GameState): GameState {
  const depositChange = after.deposits - before.deposits;
  const loanChange = after.loans - before.loans;
  const fundingChange = after.wholesaleFunding - before.wholesaleFunding;
  const depositInflows = Math.max(0, depositChange);
  const customerWithdrawals = Math.max(0, -depositChange);
  const newLending = Math.max(0, loanChange);
  const loanRepayments = Math.max(0, -loanChange);
  const knownClosing = before.cash + depositInflows - customerWithdrawals + loanRepayments - newLending + after.profit + fundingChange;
  const snapshot: CashFlowSnapshot = {
    day: after.day,
    openingCash: before.cash,
    depositInflows,
    customerWithdrawals,
    loanRepayments,
    newLending,
    operatingProfit: after.profit,
    fundingChange,
    otherMovements: after.cash - knownClosing,
    closingCash: after.cash,
  };
  return { ...after, cashFlowHistory: [...after.cashFlowHistory, snapshot].slice(-120) };
}

export function getCashFlowSummary(state: GameState, days = 30) {
  const rows = state.cashFlowHistory.slice(-days);
  const first = rows[0];
  const last = rows[rows.length - 1];
  return rows.reduce((summary, row) => ({
    openingCash: first?.openingCash ?? state.cash,
    depositInflows: summary.depositInflows + row.depositInflows,
    customerWithdrawals: summary.customerWithdrawals + row.customerWithdrawals,
    loanRepayments: summary.loanRepayments + row.loanRepayments,
    newLending: summary.newLending + row.newLending,
    operatingProfit: summary.operatingProfit + row.operatingProfit,
    fundingChange: summary.fundingChange + row.fundingChange,
    otherMovements: summary.otherMovements + row.otherMovements,
    closingCash: last?.closingCash ?? state.cash,
    days: rows.length,
  }), {
    openingCash: first?.openingCash ?? state.cash,
    depositInflows: 0,
    customerWithdrawals: 0,
    loanRepayments: 0,
    newLending: 0,
    operatingProfit: 0,
    fundingChange: 0,
    otherMovements: 0,
    closingCash: last?.closingCash ?? state.cash,
    days: rows.length,
  });
}

function applyStrategy(state: GameState, previousDay: number): GameState {
  let next = state;
  const weekly = state.day % 7 === 0;
  const focus = state.strategicFocus;

  if (focus === "efficiency") {
    const saving = Math.max(0, state.expenses * 0.045);
    next = { ...next, cash: next.cash + saving, profit: next.profit + saving, totalProfit: next.totalProfit + saving };
  } else if (focus === "growth" && weekly && next.cash > 400_000) {
    const spend = 32_000;
    const gained = Math.max(3, round(8 + next.brandStrength / 12));
    next = { ...next, cash: next.cash - spend, customers: next.customers + gained, brandStrength: clamp(next.brandStrength + 0.25, 1, 100), riskScore: clamp(next.riskScore + 0.12, 1, 100) };
  } else if (focus === "trust" && weekly) {
    next = { ...next, satisfaction: clamp(next.satisfaction + 0.35, 1, 100), reputation: clamp(next.reputation + 0.18, 1, 100), compliance: clamp(next.compliance + 0.22, 1, 100) };
  } else if (focus === "digital" && weekly && next.cash > 450_000) {
    next = { ...next, cash: next.cash - 42_000, digitalLevel: clamp(next.digitalLevel + 0.7, 1, 100), cyberSecurity: clamp(next.cyberSecurity + 0.32, 1, 100), satisfaction: clamp(next.satisfaction + 0.08, 1, 100) };
  } else if (focus === "balanced" && weekly) {
    next = { ...next, boardConfidence: clamp(next.boardConfidence + 0.08, 1, 100), satisfaction: clamp(next.satisfaction + 0.06, 1, 100) };
  }

  if (previousDay < state.strategyReviewDay && next.day >= state.strategyReviewDay) {
    next = addEvent(
      { ...next, strategyReviewDay: next.day + 90 },
      createEvent(next.day, "neutral", "90-day strategy review", `The ${focus} plan completed its review cycle. Results remain active and management has opened the next 90-day period.`),
    );
  }
  return next;
}

function runBranchManagers(state: GameState): GameState {
  let next = state;
  const reports: string[] = [];

  for (const originalBranch of state.branchOffices) {
    const branch = next.branchOffices.find((item) => item.id === originalBranch.id);
    if (!branch?.managerId) continue;
    const manager = next.employeeRoster.find((employee) => employee.id === branch.managerId);
    const mandate = branch.managerMandate ?? "manual";
    const focus = branch.localFocus ?? "service";
    if (!manager || mandate === "manual") continue;

    const baseSpend = branchMandateSpend[mandate];
    const spend = Math.min(branch.managerBudget ?? baseSpend, baseSpend);
    if (next.cash < spend + 250_000) {
      reports.push(`${branch.name}: ${manager.name} paused local spending because the group cash buffer is too low.`);
      continue;
    }

    const quality = clamp((manager.skill + manager.leadership + manager.loyalty * 0.35) / 235, 0.45, 1.25);
    const intensity = mandate === "growth" ? 1.45 : mandate === "autonomous" ? 1 : 0.62;
    let updatedBranch = branch;
    next = { ...next, cash: next.cash - spend };

    if (focus === "service") {
      const capacityGain = round(34 * quality * intensity);
      updatedBranch = { ...updatedBranch, capacity: updatedBranch.capacity + capacityGain, satisfaction: clamp(updatedBranch.satisfaction + 2.4 * quality * intensity, 1, 100) };
      next = { ...next, satisfaction: clamp(next.satisfaction + 0.35 * quality * intensity, 1, 100) };
      reports.push(`${branch.name}: ${manager.name} used $${Math.round(spend / 1000)}k to add ${capacityGain} service capacity and improve local satisfaction.`);
    } else if (focus === "deposits") {
      const customers = round(14 * quality * intensity);
      const deposits = round(95_000 * quality * intensity);
      next = { ...next, customers: next.customers + customers, deposits: next.deposits + deposits, cash: next.cash + deposits, brandStrength: clamp(next.brandStrength + 0.25 * intensity, 1, 100) };
      reports.push(`${branch.name}: ${manager.name} added about ${customers} customers and $${Math.round(deposits / 1000)}k of local deposits.`);
    } else if (focus === "lending") {
      if (next.liquidityRatio < 18 || next.cash < 750_000) {
        const deposits = round(70_000 * quality);
        next = { ...next, deposits: next.deposits + deposits, cash: next.cash + deposits };
        reports.push(`${branch.name}: lending growth was blocked by treasury limits, so ${manager.name} prioritised $${Math.round(deposits / 1000)}k of deposits instead.`);
      } else {
        const lending = Math.min(round(120_000 * quality * intensity), Math.max(0, next.cash * 0.025));
        next = { ...next, cash: next.cash - lending, loans: next.loans + lending, customers: next.customers + Math.max(1, round(3 * intensity)) };
        reports.push(`${branch.name}: ${manager.name} originated $${Math.round(lending / 1000)}k of controlled local lending.`);
      }
    } else {
      const deposits = round(110_000 * quality * intensity);
      const lending = next.liquidityRatio >= 22 ? round(45_000 * quality * intensity) : 0;
      next = { ...next, deposits: next.deposits + deposits, cash: next.cash + deposits - lending, loans: next.loans + lending, customers: next.customers + Math.max(1, round(4 * intensity)), reputation: clamp(next.reputation + 0.15 * intensity, 1, 100) };
      reports.push(`${branch.name}: ${manager.name} developed business relationships, adding $${Math.round(deposits / 1000)}k deposits${lending ? ` and $${Math.round(lending / 1000)}k lending` : ""}.`);
    }

    next = { ...next, branchOffices: next.branchOffices.map((item) => item.id === branch.id ? updatedBranch : item) };
  }

  if (reports.length > 0) {
    next = addEvent(next, createEvent(next.day, "positive", "Branch management report", reports.join(" ")));
  }
  return next;
}

function delegateRoutineDecision(state: GameState): GameState {
  const decision = state.pendingDecision;
  if (!decision || decision.id.startsWith("v5-")) return state;

  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  const cmo = state.employeeRoster.find((employee) => employee.executiveRole === "CMO");
  const delegatedBranches = state.branchOffices.filter((branch) => branch.managerId && (branch.managerMandate ?? "manual") !== "manual");

  if (decision.id === "complaint-wave" && ((coo && state.automation.operations !== "manual") || delegatedBranches.length > 0)) {
    const mode = coo ? state.automation.operations : delegatedBranches.some((branch) => branch.managerMandate === "growth" || branch.managerMandate === "autonomous") ? "balanced" : "conservative";
    const choice = mode === "growth" || mode === "balanced" ? "service-recovery" : "reassign-teams";
    const handled = chooseDecisionV5(state, choice);
    return addEvent(handled, createEvent(state.day, "positive", "Service issue delegated", `${coo?.name ?? "The branch management team"} handled the operational service decision under the ${mode} mandate. The CEO was not interrupted.`));
  }

  if (decision.id === "star-manager" && coo && state.automation.operations !== "manual") {
    const choice = state.automation.operations === "growth" ? "career-package" : "broaden-role";
    const handled = chooseDecisionV5(state, choice);
    return addEvent(handled, createEvent(state.day, "neutral", "People decision delegated", `${coo.name} handled the retention case within the operations mandate.`));
  }

  if (decision.id === "rate-war" && cmo && state.automation.marketing !== "manual") {
    const choice = state.automation.marketing === "growth" ? "broad-match" : state.automation.marketing === "conservative" ? "service-defence" : "targeted-pricing";
    const handled = chooseDecisionV5(state, choice);
    return addEvent(handled, createEvent(state.day, "neutral", "Market response delegated", `${cmo.name} responded to competitor pricing under the ${state.automation.marketing} marketing mandate.`));
  }

  return state;
}

export function advanceDaysV6(state: GameState, days: number): GameState {
  let current = state;
  for (let index = 0; index < days; index += 1) {
    if (current.pendingDecision || current.gameOverReason) break;
    const before = current;
    let next = advanceDaysV5(current, 1);
    if (next.day === before.day) break;
    next = applyStrategy(next, before.day);
    if (next.day % 30 === 0 && !next.pendingDecision) next = runBranchManagers(next);
    next = delegateRoutineDecision(next);
    current = recordCashFlow(before, next);
  }
  return current;
}

export function setStrategicPlan(state: GameState, focus: GameState["strategicFocus"]): GameState {
  const updated = setStrategicFocus(state, focus);
  return addEvent({ ...updated, strategyReviewDay: state.day + 90 }, createEvent(state.day, "neutral", "90-day CEO plan approved", `${focus[0].toUpperCase() + focus.slice(1)} is now an operating plan with real effects until the next review on day ${state.day + 90}.`));
}

export function setBranchMandate(state: GameState, branchId: string, mandate: BranchMandate): GameState {
  const manager = state.branchOffices.find((branch) => branch.id === branchId)?.managerId;
  if (!manager && mandate !== "manual") return state;
  const managerBudget = branchMandateSpend[mandate];
  return { ...state, branchOffices: state.branchOffices.map((branch) => branch.id === branchId ? { ...branch, managerMandate: mandate, managerBudget } : branch) };
}

export function setBranchFocus(state: GameState, branchId: string, localFocus: BranchFocus): GameState {
  return { ...state, branchOffices: state.branchOffices.map((branch) => branch.id === branchId ? { ...branch, localFocus } : branch) };
}

export function assignBranchManager(state: GameState, branchId: string, employeeId: string | null): GameState {
  const branch = state.branchOffices.find((item) => item.id === branchId);
  const employee = employeeId ? state.employeeRoster.find((item) => item.id === employeeId) : null;
  if (!branch || (employeeId && (!employee || employee.leadership < 45 || employee.executiveRole))) return state;
  return {
    ...state,
    branchOffices: state.branchOffices.map((item) => item.id === branchId ? { ...item, managerId: employeeId, managerMandate: employeeId ? item.managerMandate ?? "guarded" : "manual" } : item),
    employeeRoster: state.employeeRoster.map((person) => person.id === employeeId ? { ...person, assignedBranchId: branchId } : person.assignedBranchId === branchId ? { ...person, assignedBranchId: null } : person),
  };
}

export function applyProductPreset(state: GameState, key: ProductKey, preset: ProductPreset): GameState {
  const current = state.productTerms[key];
  const depositProduct = key === "savings";
  const creditProduct = key === "mortgage" || key === "sme" || key === "cards";
  let patch: Partial<ProductTerms>;

  if (preset === "competitive") {
    patch = { customerRate: depositProduct ? current.customerRate + 0.35 : creditProduct ? Math.max(0, current.customerRate - 0.4) : current.customerRate, monthlyFee: Math.max(0, round(current.monthlyFee * 0.65)), approvalThreshold: Math.max(35, current.approvalThreshold - 7), serviceLevel: Math.max(58, current.serviceLevel) };
  } else if (preset === "premium") {
    patch = { customerRate: depositProduct ? current.customerRate + 0.15 : creditProduct ? current.customerRate - 0.1 : current.customerRate, monthlyFee: round(current.monthlyFee * 1.3 + 10), approvalThreshold: Math.min(90, current.approvalThreshold + 4), serviceLevel: Math.min(96, current.serviceLevel + 14) };
  } else if (preset === "conservative") {
    patch = { customerRate: depositProduct ? Math.max(0, current.customerRate - 0.2) : creditProduct ? current.customerRate + 0.45 : current.customerRate, monthlyFee: current.monthlyFee, approvalThreshold: Math.min(92, current.approvalThreshold + 12), serviceLevel: Math.max(55, current.serviceLevel - 3) };
  } else {
    patch = { approvalThreshold: creditProduct ? 68 : 52, serviceLevel: 70, monthlyFee: current.monthlyFee };
  }

  const terms = { ...current, ...patch, key };
  return {
    ...state,
    productTerms: { ...state.productTerms, [key]: terms },
    depositRate: key === "savings" ? terms.customerRate : state.depositRate,
    loanRate: key === "mortgage" ? terms.customerRate : state.loanRate,
  };
}

export function getCreditRecommendation(state: GameState, application: LoanApplication): CreditRecommendation {
  const expectedInterest = application.amount * application.rate / 100 * 2.5;
  const expectedLoss = application.amount * application.defaultChance / 100 * Math.max(0.15, 1 - application.collateral / 100);
  const expectedProfit = expectedInterest - expectedLoss;
  const liquidityImpact = -application.amount;
  const liquidityTight = state.liquidityRatio < 18 || state.cash < application.amount * 1.4;
  const highRisk = application.riskGrade === "D" || application.defaultChance >= 8;
  const mediumRisk = application.riskGrade === "C" || application.defaultChance >= 4.5;

  if (highRisk || (liquidityTight && application.riskGrade !== "A")) {
    return { action: "decline", label: "CRO recommends decline", reason: highRisk ? "Expected credit loss is too high for the offered return." : "The bank cannot safely fund this loan with the current liquidity buffer.", expectedProfit, liquidityImpact, risk: "High" };
  }
  if (mediumRisk || application.collateral < 65 || liquidityTight) {
    return { action: "counter", label: "CRO recommends counter-offer", reason: "Reduce the amount and improve pricing to protect liquidity and loss coverage.", expectedProfit: expectedProfit * 0.72, liquidityImpact: application.amount * -0.72, risk: "Medium" };
  }
  return { action: "approve", label: "CRO recommends approval", reason: "Risk, collateral and expected return fit the current balance sheet.", expectedProfit, liquidityImpact, risk: "Low" };
}
