import type { BranchOffice, GameState } from "../types";
import { addEvent, clamp, createEvent, round } from "../utils";
import { calculateBranchLedgerV9 } from "./branch";
import { getBankHealthV9 } from "./health";
import { getBranchOperationsV9, readV9, writeV9, type BranchRecommendationV9, type BranchSpecializationV9, type DensityModeV9, type ManagementReportV9, type UpgradeAuthorityV9 } from "./model";
import { startAdvancedBranchUpgradeV9 } from "./projects";
import { setBranchUpgradeAuthority } from "../v8/gameplay";

function addManagementReport(state: GameState, report: ManagementReportV9): GameState { const v9 = readV9(state); return writeV9(state, { ...v9, managementReports: [report, ...v9.managementReports].slice(0, 36) }); }

export function setDensityV9(state: GameState, density: DensityModeV9): GameState {
  const v9 = readV9(state);
  return writeV9(state, { ...v9, density });
}


export function setUpgradeAuthorityV9(state: GameState, branchId: string, authority: UpgradeAuthorityV9): GameState {
  const v9 = readV9(state);
  const current = getBranchOperationsV9(state, branchId);
  const baseAuthority = authority === "full" ? "profitable" : authority;
  const next = setBranchUpgradeAuthority(state, branchId, baseAuthority);
  return writeV9(next, { ...v9, branches: { ...v9.branches, [branchId]: { ...current, upgradeAuthority: authority } } });
}

export function setBranchSpecializationV9(state: GameState, branchId: string, specialization: BranchSpecializationV9): GameState {
  const v9 = readV9(state);
  const current = getBranchOperationsV9(state, branchId);
  return writeV9(state, { ...v9, branches: { ...v9.branches, [branchId]: { ...current, specialization } } });
}
function recommendationScore(recommendation: BranchRecommendationV9) {
  if (recommendation.id === "close") return -1;
  const monthlyCost = recommendation.costNow / 24;
  const riskPenalty = recommendation.risk === "high" ? 18_000 : recommendation.risk === "medium" ? 7_000 : 0;
  return recommendation.expectedMonthlyEffect - monthlyCost - riskPenalty;
}

function suggestedSpecialization(branch: BranchOffice): BranchSpecializationV9 {
  if (branch.profile === "business") return "business-centre";
  if (branch.profile === "mortgage") return "mortgage-centre";
  if (branch.profile === "wealth") return "wealth-office";
  return "self-service";
}

export function letManagementFixBranchV9(state: GameState, branchId: string): GameState {
  const branch = state.branchOffices.find((item) => item.id === branchId);
  const coo = state.employeeRoster.find((employee) => employee.executiveRole === "COO");
  if (!branch || !coo || !branch.managerId || state.managementControl.operations === "manual") return state;
  const ledger = getBranchOperationsV9(state, branchId).ledger ?? calculateBranchLedgerV9(state, branch);
  const recommendation = [...ledger.recommendations].sort((a, b) => recommendationScore(b) - recommendationScore(a))[0];
  if (!recommendation || recommendationScore(recommendation) < 0 || state.cash < recommendation.costNow + 200_000) return state;
  let next = { ...state, cash: Math.max(0, state.cash - recommendation.costNow) };
  let actionText = recommendation.title;

  if (recommendation.id === "campaign") {
    const customers = Math.min(90, Math.max(25, ledger.additionalCustomersToBreakEven));
    next = { ...next, customers: next.customers + customers, deposits: next.deposits + customers * 12_000, branchOffices: next.branchOffices.map((item) => item.id === branchId ? { ...item, localCustomers: (item.localCustomers ?? 0) + customers, localDeposits: (item.localDeposits ?? 0) + customers * 12_000, operatingPriority: "deposits", localFocus: "deposits" } : item) };
  } else if (recommendation.id === "staffing") {
    next = { ...next, branchOffices: next.branchOffices.map((item) => item.id === branchId ? { ...item, staffSlots: Math.max(4, item.staffSlots - 1), capacity: Math.max(250, item.capacity - 55) } : item) };
  } else if (recommendation.id === "priority") {
    next = { ...next, branchOffices: next.branchOffices.map((item) => item.id === branchId ? { ...item, operatingPriority: "profitability", localFocus: "business" } : item) };
  } else if (recommendation.id === "specialize") {
    next = setBranchSpecializationV9(next, branchId, suggestedSpecialization(branch));
  } else if (recommendation.id === "digitalize") {
    next = setBranchSpecializationV9(next, branchId, "self-service");
    next = { ...next, branchOffices: next.branchOffices.map((item) => item.id === branchId ? { ...item, staffSlots: Math.max(4, item.staffSlots - 1), capacity: item.capacity + 150 } : item) };
  } else if (recommendation.id === "upgrade") {
    return startAdvancedBranchUpgradeV9(next, branchId, suggestedSpecialization(branch));
  } else if (recommendation.id === "downscale") {
    next = { ...next, branchOffices: next.branchOffices.map((item) => item.id === branchId ? { ...item, staffSlots: Math.max(4, item.staffSlots - 1), capacity: Math.max(300, item.capacity - 100), monthlyRent: round(item.monthlyRent * .88) } : item) };
  }

  const v9 = readV9(next);
  const operations = getBranchOperationsV9(next, branchId);
  const report: ManagementReportV9 = {
    id: `coo-fix-${branchId}-${next.day}`,
    day: next.day,
    ownerRole: "COO",
    category: "network",
    title: `${coo.name} acted on ${branch.name}`,
    summary: `${actionText}. Expected monthly improvement: $${round(recommendation.expectedMonthlyEffect / 1000)}k.`,
    handledCount: 1,
    itemTitles: [recommendation.title],
  };
  return writeV9(next, {
    ...v9,
    branches: { ...v9.branches, [branchId]: { ...operations, lastCooAction: `${coo.name}: ${actionText}.` } },
    managementReports: [report, ...v9.managementReports].slice(0, 36),
  });
}

export function runCfoStabilizationV9(state: GameState): GameState {
  const cfo = state.employeeRoster.find((employee) => employee.executiveRole === "CFO");
  if (!cfo || state.managementControl.treasury === "manual") return state;
  const health = getBankHealthV9(state);
  const needed = Math.max(0, state.deposits * .16 - state.cash);
  const funding = Math.max(350_000, Math.min(Math.max(needed, state.deposits * .035), Math.max(750_000, state.deposits * .12)));
  let next = {
    ...state,
    cash: state.cash + funding,
    wholesaleFunding: state.wholesaleFunding + funding,
    depositRate: Math.min(state.baseRate + 1.2, state.depositRate + .12),
    bankRunRisk: clamp(state.bankRunRisk - 7, 0, 100),
    boardConfidence: clamp(state.boardConfidence - (health.fundingConcentration > 35 ? 1.5 : .5), 1, 100),
  };
  const report: ManagementReportV9 = {
    id: `cfo-stabilization-${state.day}`,
    day: state.day,
    ownerRole: "CFO",
    category: "risk",
    title: `${cfo.name} executed a liquidity stabilisation plan`,
    summary: `$${round(funding / 1000)}k funding buffer added and deposit pricing strengthened.`,
    handledCount: 1,
    itemTitles: [health.recommendedAction],
  };
  next = addManagementReport(next, report);
  return addEvent(next, createEvent(state.day, "warning", "Liquidity stabilisation executed", report.summary));
}

export function normalizeBalanceSheetV9(state: GameState): GameState {
  const targetDeposits = Math.max(state.deposits, state.loans * .86);
  const targetWholesale = Math.min(state.wholesaleFunding, targetDeposits * .22);
  const targetCash = Math.max(state.cash, (targetDeposits + targetWholesale) * .18);
  return {
    ...state,
    deposits: round(targetDeposits),
    wholesaleFunding: round(targetWholesale),
    cash: round(targetCash),
    liquidityRatio: clamp(targetCash / Math.max(1, targetDeposits + targetWholesale) * 100, 0, 100),
    bankRunRisk: Math.min(state.bankRunRisk, 14),
  };
}
