import type { ExecutiveRole, GameState } from "../types";
import { clamp } from "../utils";

export type ReputationDriver = {
  key: "service" | "brand" | "compliance" | "technology" | "financial";
  title: string;
  owner: ExecutiveRole;
  level: number;
  dailyEffect: number;
  explanation: string;
};

export function getReputationDrivers(state: GameState): ReputationDriver[] {
  const technology = (state.digitalLevel + state.cyberSecurity) / 2;
  const financialLevel = clamp((state.capitalRatio * 2 + state.liquidityRatio) / 3, 0, 100);
  const financialEffect = state.capitalRatio < 9 || state.liquidityRatio < 12
    ? -0.065
    : state.capitalRatio >= 12.5 && state.liquidityRatio >= 18
      ? 0.012
      : -0.01;

  return [
    {
      key: "service",
      title: "Customer service",
      owner: "COO",
      level: state.satisfaction,
      dailyEffect: clamp((state.satisfaction - 70) * 0.003, -0.15, 0.08),
      explanation: state.satisfaction < 58 ? "Poor service is actively damaging public trust." : state.satisfaction >= 80 ? "Strong service is steadily improving trust." : "Service is close to neutral.",
    },
    {
      key: "brand",
      title: "Brand and market presence",
      owner: "CMO",
      level: state.brandStrength,
      dailyEffect: clamp((state.brandStrength - 50) * 0.0015, -0.06, 0.06),
      explanation: state.brandStrength >= 70 ? "A visible, credible brand supports recovery." : state.brandStrength < 40 ? "Weak market visibility slows customer trust." : "Brand strength is making a modest contribution.",
    },
    {
      key: "compliance",
      title: "Compliance and conduct",
      owner: "CRO",
      level: state.compliance,
      dailyEffect: clamp((state.compliance - 72) * 0.0012, -0.08, 0.04),
      explanation: state.compliance >= 85 ? "Strong controls protect institutional trust." : state.compliance < 60 ? "Control weaknesses are damaging credibility." : "Compliance is broadly stable.",
    },
    {
      key: "technology",
      title: "Technology reliability",
      owner: "CTO",
      level: technology,
      dailyEffect: clamp((technology - 58) * 0.0008, -0.05, 0.04),
      explanation: technology >= 75 ? "Reliable digital services support customer confidence." : technology < 45 ? "Weak technology is creating trust friction." : "Technology is close to neutral.",
    },
    {
      key: "financial",
      title: "Financial resilience",
      owner: "CFO",
      level: financialLevel,
      dailyEffect: financialEffect,
      explanation: financialEffect > 0 ? "Capital and liquidity are comfortably above operating floors." : financialEffect < -0.04 ? "Weak capital or liquidity is a material trust risk." : "The balance sheet is adequate but not yet reassuring.",
    },
  ];
}

export function reputationDailyDrift(state: GameState): number {
  return clamp(getReputationDrivers(state).reduce((sum, driver) => sum + driver.dailyEffect, 0), -0.18, 0.12);
}

export function reputationDirection(state: GameState) {
  const drift = reputationDailyDrift(state);
  return drift > 0.025 ? "improving" : drift < -0.025 ? "deteriorating" : "stable";
}

export function reputationLevelLabel(value: number) {
  return value >= 80 ? "Excellent" : value >= 65 ? "Strong" : value >= 50 ? "Credible" : value >= 30 ? "Weak" : "Very poor";
}

export function reputationNarrative(state: GameState) {
  const drivers = getReputationDrivers(state).sort((a, b) => a.dailyEffect - b.dailyEffect);
  const weakest = drivers[0];
  const strongest = [...drivers].sort((a, b) => b.dailyEffect - a.dailyEffect)[0];
  const direction = reputationDirection(state);
  if (direction === "improving") return `Trust is recovering. ${strongest.title} is the strongest support, while ${weakest.title.toLowerCase()} remains the main constraint.`;
  if (direction === "deteriorating") return `Trust is falling. ${weakest.title} is the largest negative pressure and needs management attention.`;
  return `Trust is broadly stable. ${strongest.title} offsets pressure from ${weakest.title.toLowerCase()}.`;
}

export type RiskContribution = {
  key: "base" | "funding" | "credit" | "compliance" | "capital";
  title: string;
  points: number;
  explanation: string;
};

export function getRiskContributions(state: GameState): RiskContribution[] {
  const loanToDeposit = state.loans / Math.max(1, state.deposits);
  return [
    { key: "base", title: "Operating baseline", points: 12, explanation: "The minimum structural risk of running a bank." },
    { key: "funding", title: "Funding mismatch", points: loanToDeposit * 24, explanation: state.deposits < 100_000 ? "The loan book has almost no customer-deposit funding." : `Loans equal ${(loanToDeposit * 100).toFixed(0)}% of deposits.` },
    { key: "credit", title: "Credit quality", points: state.nplRatio * 4.2, explanation: `NPL ratio is ${state.nplRatio.toFixed(2)}%.` },
    { key: "compliance", title: "Control weakness", points: Math.max(0, 75 - state.compliance) * 0.5, explanation: state.compliance >= 75 ? "Compliance is not adding risk." : `Compliance is ${state.compliance.toFixed(0)}, below the 75 control benchmark.` },
    { key: "capital", title: "Capital shortfall", points: Math.max(0, 11 - state.capitalRatio) * 2.4, explanation: state.capitalRatio >= 11 ? "Capital is not adding risk." : `Capital ratio is ${state.capitalRatio.toFixed(1)}%, below the 11% risk benchmark.` },
  ];
}

export function riskLevelLabel(score: number) {
  return score <= 25 ? "Low" : score <= 45 ? "Moderate" : score <= 65 ? "Elevated" : score <= 80 ? "High" : "Critical";
}

export function riskNarrative(state: GameState) {
  const primary = getRiskContributions(state).filter((item) => item.key !== "base").sort((a, b) => b.points - a.points)[0];
  return `${riskLevelLabel(state.riskScore)} group risk. The largest driver is ${primary.title.toLowerCase()}: ${primary.explanation}`;
}
