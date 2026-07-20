import type { GameState } from "../types";
import { calculateBranchLedgerV9 } from "./branch";
import { getBranchOperationsV9, getTechnologyEffectsV9, readV9 } from "./model";

function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }

export type BankHealthV9 = {
  bankValue: number;
  equity: number;
  expectedCreditLoss: number;
  earningsValue: number;
  franchiseValue: number;
  technologyValue: number;
  branchValue: number;
  riskDiscount: number;
  liquidAssetRatio: number;
  loanToDepositRatio: number;
  fundingConcentration: number;
  depositStability: number;
  liquidityForecast30: number;
  liquidityForecast90: number;
  runRiskDrivers: Array<{ label: string; value: string; severity: "low" | "medium" | "high" }>;
  recommendedAction: string;
};

export function getBankHealthV9(state: GameState): BankHealthV9 {
  const v9 = readV9(state);
  const tech = getTechnologyEffectsV9(state);
  const nonPerforming = state.activeLoans.filter((loan) => ["overdue", "collections", "defaulted", "delinquent"].includes(loan.status)).reduce((sum, loan) => sum + loan.outstanding, 0);
  const expectedCreditLoss = Math.max(state.loanLossReserve, nonPerforming * .52 + state.loans * state.nplRatio / 100 * .18);
  const equity = state.cash + state.loans - expectedCreditLoss - state.deposits - state.wholesaleFunding;
  const annualisedProfit = state.reports.length > 0 ? state.reports.slice(0, 4).reduce((sum, report) => sum + report.netIncome, 0) : state.profit * 365;
  const earningsValue = Math.max(0, annualisedProfit) * clamp(5.8 - state.riskScore / 35, 2.2, 6.5);
  const franchiseValue = state.customers * (240 + state.reputation * 4) + state.brandStrength * 75_000 + state.marketShare * 180_000;
  const completedTechLevels = Object.values(v9.technologies).reduce((sum, progress) => sum + progress.level, 0);
  const technologyValue = state.digitalLevel * 85_000 + completedTechLevels * 420_000 + tech.digitalCapacity * 60_000;
  const branchValue = state.branchOffices.reduce((sum, branch) => {
    const operations = getBranchOperationsV9(state, branch.id);
    const ledger = operations.ledger ?? calculateBranchLedgerV9(state, branch);
    const specializationPremium = operations.specialization === "standard" ? 1 : 1.14;
    return sum + (branch.capacity * 1_500 + operations.effectiveLevel * 420_000 + Math.max(0, ledger.profit) * 14) * specializationPremium;
  }, 0);
  const grossValue = Math.max(0, equity) + earningsValue + franchiseValue + technologyValue + branchValue;
  const riskFactor = clamp((state.riskScore + state.bankRunRisk + state.nplRatio * 4 + Math.max(0, 70 - state.compliance)) / 260, .03, .58);
  const riskDiscount = grossValue * riskFactor;
  const bankValue = Math.max(0, grossValue - riskDiscount);

  const fundingBase = Math.max(1, state.deposits + state.wholesaleFunding);
  const liquidAssetRatio = state.cash / fundingBase * 100;
  const loanToDepositRatio = state.loans / Math.max(1, state.deposits) * 100;
  const fundingConcentration = state.wholesaleFunding / fundingBase * 100;
  const rateSupport = clamp((state.depositRate - state.baseRate + 1.4) * 8, -12, 15);
  const depositStability = clamp(58 + state.reputation * .22 + state.satisfaction * .12 + rateSupport - fundingConcentration * .38 - state.bankRunRisk * .25, 5, 98);
  const monthlyOperating = state.profit * 30;
  const stressedWithdrawal30 = state.deposits * (1 - depositStability / 100) * .08;
  const stressedWithdrawal90 = state.deposits * (1 - depositStability / 100) * .18;
  const liquidityForecast30 = state.cash + monthlyOperating - stressedWithdrawal30;
  const liquidityForecast90 = state.cash + monthlyOperating * 3 - stressedWithdrawal90;

  const runRiskDrivers: BankHealthV9["runRiskDrivers"] = [];
  runRiskDrivers.push({ label: "Deposit base", value: `${loanToDepositRatio.toFixed(0)}% loan-to-deposit`, severity: loanToDepositRatio > 170 ? "high" : loanToDepositRatio > 120 ? "medium" : "low" });
  runRiskDrivers.push({ label: "Funding concentration", value: `${fundingConcentration.toFixed(1)}% wholesale`, severity: fundingConcentration > 35 ? "high" : fundingConcentration > 18 ? "medium" : "low" });
  runRiskDrivers.push({ label: "Deposit stability", value: `${depositStability.toFixed(0)}/100`, severity: depositStability < 45 ? "high" : depositStability < 65 ? "medium" : "low" });
  runRiskDrivers.push({ label: "Compliance confidence", value: `${state.compliance.toFixed(0)}/100`, severity: state.compliance < 55 ? "high" : state.compliance < 72 ? "medium" : "low" });
  runRiskDrivers.push({ label: "30-day liquid buffer", value: `${liquidAssetRatio.toFixed(1)}%`, severity: liquidityForecast30 < 0 || liquidAssetRatio < 8 ? "high" : liquidAssetRatio < 16 ? "medium" : "low" });

  const highest = runRiskDrivers.find((driver) => driver.severity === "high") ?? runRiskDrivers.find((driver) => driver.severity === "medium");
  let recommendedAction = "Maintain the current funding mix and continue growing stable customer deposits.";
  if (highest?.label === "Deposit base") recommendedAction = "Slow net lending and shift marketing and branch priorities toward stable deposits.";
  else if (highest?.label === "Funding concentration") recommendedAction = "Replace concentrated wholesale funding with customer deposits and longer-dated sources.";
  else if (highest?.label === "Deposit stability") recommendedAction = "Improve deposit pricing, service confidence and customer diversification.";
  else if (highest?.label === "Compliance confidence") recommendedAction = "Prioritise KYC, AML and regulatory reporting before pursuing more growth.";
  else if (highest?.label === "30-day liquid buffer") recommendedAction = "Raise an immediate liquidity buffer and pause discretionary lending commitments.";

  return { bankValue, equity, expectedCreditLoss, earningsValue, franchiseValue, technologyValue, branchValue, riskDiscount, liquidAssetRatio, loanToDepositRatio, fundingConcentration, depositStability, liquidityForecast30, liquidityForecast90, runRiskDrivers, recommendedAction };
}

