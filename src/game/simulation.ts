import { DECISIONS } from "./catalog";
import { evaluateObjectives, unlockAchievements } from "./objectives";
import type { Competitor, GameState, LoanApplication } from "./types";
import {
  addEvent,
  calculateRatios,
  clamp,
  createEvent,
  historyPoint,
  randomBetween,
  round,
} from "./utils";

function generateLoanApplication(state: GameState): LoanApplication {
  const names = [
    "Hansen Property AS",
    "Nordlys Logistics",
    "Berg Family",
    "Green Grid Solutions",
    "Oslo Workshop AS",
    "Aurora Apartments",
    "Lindberg Retail",
  ];
  const segments: LoanApplication["segment"][] = [
    "Mortgage",
    "SME",
    "Commercial property",
  ];
  const grades: LoanApplication["riskGrade"][] = ["A", "B", "B", "C", "C", "D"];
  const riskGrade = grades[Math.floor(Math.random() * grades.length)];
  const riskMap = { A: 1.2, B: 2.8, C: 6.5, D: 12.5 };
  const collateralMap = { A: 92, B: 80, C: 64, D: 38 };
  const amount = round(randomBetween(350_000, 3_800_000) / 50_000) * 50_000;
  return {
    id: `loan-${state.day}-${Math.random().toString(36).slice(2, 8)}`,
    customerName: names[Math.floor(Math.random() * names.length)],
    segment: segments[Math.floor(Math.random() * segments.length)],
    amount,
    rate: clamp(state.loanRate + riskMap[riskGrade] * 0.13, 3, 15),
    riskGrade,
    defaultChance: riskMap[riskGrade],
    collateral: collateralMap[riskGrade],
  };
}

function updateEconomy(state: GameState) {
  if (state.day % 30 !== 0) {
    return {
      baseRate: state.baseRate,
      inflation: state.inflation,
      unemployment: state.unemployment,
      consumerConfidence: state.consumerConfidence,
      gdpGrowth: state.gdpGrowth,
      economicCycle: state.economicCycle,
    };
  }

  const shock = randomBetween(-0.34, 0.34);
  const gdpGrowth = clamp(state.gdpGrowth + shock, -3.8, 5.2);
  const inflation = clamp(state.inflation + randomBetween(-0.22, 0.22), 0.5, 8);
  const unemployment = clamp(
    state.unemployment - gdpGrowth * 0.025 + randomBetween(-0.08, 0.08),
    1.8,
    10,
  );
  const consumerConfidence = clamp(
    state.consumerConfidence +
      gdpGrowth * 0.7 -
      inflation * 0.15 +
      randomBetween(-2.5, 2.5),
    25,
    95,
  );
  const baseRate = clamp(
    state.baseRate +
      (inflation > 4
        ? 0.25
        : inflation < 1.5
          ? -0.25
          : randomBetween(-0.1, 0.1)),
    0.25,
    9,
  );
  const economicCycle =
    gdpGrowth > 3.2
      ? "boom"
      : gdpGrowth > 1.5
        ? "growth"
        : gdpGrowth > 0
          ? "stable"
          : gdpGrowth > -1.5
            ? "slowdown"
            : "recession";

  return {
    baseRate,
    inflation,
    unemployment,
    consumerConfidence,
    gdpGrowth,
    economicCycle,
  } as const;
}

function updateCompetitors(state: GameState, marketMood: number): Competitor[] {
  return state.competitors.map((competitor) => {
    const strategyGrowth =
      competitor.strategy === "digital"
        ? competitor.digitalLevel / 160
        : competitor.strategy === "volume"
          ? 0.5
          : competitor.strategy === "premium"
            ? competitor.reputation / 220
            : 0.24;
    const gained = Math.max(
      0,
      round((0.7 + strategyGrowth) * marketMood * randomBetween(0.65, 1.35)),
    );
    const deposits =
      competitor.deposits + gained * randomBetween(8_000, 24_000);
    const loans = competitor.loans + gained * randomBetween(4_000, 16_000);
    const reputation = clamp(
      competitor.reputation + randomBetween(-0.04, 0.06),
      35,
      92,
    );
    const reprice = state.day % 30 === 0 ? randomBetween(-0.15, 0.15) : 0;
    return {
      ...competitor,
      customers: competitor.customers + gained,
      deposits,
      loans,
      reputation,
      depositRate: clamp(competitor.depositRate + reprice, 1, 6),
      loanRate: clamp(competitor.loanRate + reprice * 0.7, 3, 12),
      acquisitionPrice:
        round(
          (deposits * 0.12 + loans * 0.08 + competitor.customers * 1_900) /
            100_000,
        ) * 100_000,
    };
  });
}

export function advanceDay(state: GameState): GameState {
  if (state.gameOverReason || state.pendingDecision) return state;

  const nextDay = state.day + 1;
  const economy = updateEconomy({ ...state, day: nextDay });
  const difficultyGrowth =
    state.difficulty === "relaxed"
      ? 1.16
      : state.difficulty === "hard"
        ? 0.84
        : 1;
  const marketMood = clamp(
    0.7 + economy.consumerConfidence / 180 + economy.gdpGrowth / 20,
    0.45,
    1.45,
  );
  const competitors = updateCompetitors({ ...state, day: nextDay }, marketMood);
  const competitorPressure = clamp(
    competitors.reduce(
      (sum, item) => sum + item.reputation + item.digitalLevel,
      0,
    ) / Math.max(1, competitors.length * 180),
    0.35,
    1,
  );
  const staffingPressure = clamp(
    state.customers / Math.max(1, state.employees * 72),
    0.55,
    2,
  );
  const depositRateAppeal = clamp(
    1 + (state.depositRate - economy.baseRate * 0.62) * 0.11,
    0.55,
    1.45,
  );
  const loanRateAppeal = clamp(
    1 - (state.loanRate - (economy.baseRate + 2.5)) * 0.055,
    0.55,
    1.35,
  );
  const productPower = 1 + (state.products.length - 1) * 0.095;
  const digitalPower = 0.78 + state.digitalLevel / 220;
  const salesBonus = state.background === "Sales" ? 1.12 : 1;
  const grossCustomerDemand =
    (state.branches * 2.7 + state.reputation / 17 + state.brandStrength / 24) *
    difficultyGrowth *
    marketMood *
    productPower *
    digitalPower *
    salesBonus *
    depositRateAppeal *
    (1.12 - competitorPressure * 0.18) *
    randomBetween(0.82, 1.2);
  const customersGained = Math.max(0, round(grossCustomerDemand));
  const serviceChurn = Math.max(0, staffingPressure - 1) * 0.0018;
  const pricingChurn =
    Math.max(0, economy.baseRate * 0.55 - state.depositRate) * 0.00032;
  const trustChurn = Math.max(0, 58 - state.reputation) * 0.000035;
  const customersLost = Math.max(
    0,
    round(
      state.customers * (0.00035 + serviceChurn + pricingChurn + trustChurn),
    ),
  );
  const customers = Math.max(
    1,
    state.customers + customersGained - customersLost,
  );

  const savingsBonus = state.products.includes("savings") ? 1.2 : 1;
  const averageDeposit = randomBetween(8_500, 19_000) * savingsBonus;
  const newDeposits = customersGained * averageDeposit;
  const lostDeposits = customersLost * randomBetween(9_000, 25_000);
  const organicDepositGrowth =
    state.deposits * randomBetween(-0.0002, 0.00055) * marketMood;
  let bankRunOutflow = 0;
  if (state.bankRunRisk > 55) {
    bankRunOutflow =
      state.deposits * randomBetween(0.001, 0.004) * (state.bankRunRisk / 100);
  }
  const deposits = Math.max(
    0,
    state.deposits +
      newDeposits -
      lostDeposits +
      organicDepositGrowth -
      bankRunOutflow,
  );

  const policyMultiplier =
    state.lendingPolicy === "conservative"
      ? 0.64
      : state.lendingPolicy === "aggressive"
        ? 1.38
        : 1;
  const mortgagePower = state.products.includes("mortgage") ? 1.22 : 0.8;
  const smePower = state.products.includes("sme") ? 1.15 : 0.88;
  const lendingDemand =
    customers *
    randomBetween(22, 45) *
    loanRateAppeal *
    marketMood *
    mortgagePower *
    smePower;
  const lendingCapacity = Math.max(
    0,
    state.cash * (0.012 + state.compliance / 9_500),
  );
  const newLoans = round(
    Math.min(
      lendingCapacity,
      lendingDemand * policyMultiplier * (1 - state.riskScore / 190),
    ),
  );
  const repayments = state.loans * randomBetween(0.00042, 0.0007);
  const recessionMultiplier =
    economy.economicCycle === "recession"
      ? 2.25
      : economy.economicCycle === "slowdown"
        ? 1.45
        : economy.economicCycle === "boom"
          ? 0.72
          : 1;
  const policyLossMultiplier =
    state.lendingPolicy === "conservative"
      ? 0.7
      : state.lendingPolicy === "aggressive"
        ? 1.48
        : 1;
  const financeBonus = state.background === "Finance" ? 0.84 : 1;
  const creditLosses = round(
    state.loans *
      (0.000025 + state.nplRatio * 0.00001) *
      recessionMultiplier *
      policyLossMultiplier *
      financeBonus *
      randomBetween(0.72, 1.25),
  );
  const loans = Math.max(0, state.loans + newLoans - repayments - creditLosses);
  const nplRatio = clamp(
    state.nplRatio +
      (policyMultiplier - 1) * 0.012 +
      Math.max(0, economy.unemployment - 4) * 0.008 +
      (economy.economicCycle === "recession" ? 0.025 : -0.006),
    0.5,
    15,
  );

  const productFeePower =
    1 +
    (state.products.includes("cards") ? 0.3 : 0) +
    (state.products.includes("insurance") ? 0.22 : 0) +
    (state.products.includes("wealth") ? 0.45 : 0) +
    (state.products.includes("sme") ? 0.18 : 0);
  const interestIncome = (state.loans * (state.loanRate / 100)) / 365;
  const depositExpense = (state.deposits * (state.depositRate / 100)) / 365;
  const wholesaleExpense =
    (state.wholesaleFunding * (state.wholesaleFundingRate / 100)) / 365;
  const feeIncome =
    customers * (2.5 + state.products.length * 0.7) * productFeePower;
  const branchEfficiency = state.background === "Operations" ? 0.9 : 1;
  const payroll = state.employees * 218 * branchEfficiency;
  const branchCost = state.branches * 980 * branchEfficiency;
  const digitalCost = state.digitalLevel * 24;
  const complianceCost = 480 + Math.max(0, 90 - state.compliance) * 18;
  const fraudExposure = state.products.includes("cards") ? 1.35 : 0.65;
  const fraudLosses = round(
    Math.max(0, 72 - state.cyberSecurity) *
      fraudExposure *
      randomBetween(4, 15),
  );
  const revenue = round(interestIncome + feeIncome);
  const expenses = round(
    depositExpense +
      wholesaleExpense +
      payroll +
      branchCost +
      digitalCost +
      complianceCost +
      creditLosses +
      fraudLosses,
  );
  const profit = revenue - expenses;
  const totalProfit = state.totalProfit + profit;
  const cash = Math.max(
    0,
    state.cash +
      newDeposits -
      lostDeposits +
      organicDepositGrowth -
      bankRunOutflow -
      newLoans +
      repayments +
      profit +
      creditLosses,
  );
  const loanLossReserve = Math.max(
    0,
    state.loanLossReserve + Math.max(0, profit) * 0.04 - creditLosses * 0.35,
  );

  const serviceChange =
    staffingPressure > 1.1 ? -0.42 * staffingPressure : 0.12;
  const pricingChange =
    state.loanRate > economy.baseRate + 5
      ? -0.17
      : state.depositRate > economy.baseRate * 0.7
        ? 0.12
        : 0;
  const digitalChange =
    state.digitalLevel > 65 ? 0.08 : state.digitalLevel < 30 ? -0.05 : 0;
  const satisfaction = clamp(
    state.satisfaction + serviceChange + pricingChange + digitalChange,
    20,
    98,
  );
  const reputation = clamp(
    state.reputation +
      (satisfaction > 80 ? 0.08 : satisfaction < 58 ? -0.15 : 0.015) -
      (bankRunOutflow / Math.max(1, state.deposits)) * 18,
    1,
    100,
  );
  const brandStrength = clamp(
    state.brandStrength +
      (reputation - state.reputation) * 0.45 +
      customersGained * 0.002,
    1,
    100,
  );
  const nextRatios = calculateRatios(
    cash,
    loans,
    deposits,
    state.wholesaleFunding,
    state.compliance,
    nplRatio,
    reputation,
    satisfaction,
  );

  const totalKnownMarket =
    customers +
    competitors.reduce((sum, competitor) => sum + competitor.customers, 0) +
    28_000;
  const marketShare = clamp((customers / totalKnownMarket) * 100, 0.1, 55);
  const competitorsWithShare = competitors.map((competitor) => ({
    ...competitor,
    marketShare: (competitor.customers / totalKnownMarket) * 100,
  }));
  const sharePrice = Math.max(
    3,
    12 +
      reputation * 0.16 +
      marketShare * 2.4 +
      totalProfit / 140_000 -
      nextRatios.riskScore * 0.06,
  );
  const boardConfidence = clamp(
    state.boardConfidence +
      (profit > 0 ? 0.04 : -0.09) +
      (nextRatios.capitalRatio >= 12.5 ? 0.025 : -0.08),
    1,
    100,
  );
  const capitalBreachDays =
    nextRatios.capitalRatio < 4 ? state.capitalBreachDays + 1 : 0;
  const liquidityBreachDays =
    cash <= 0 || nextRatios.liquidityRatio < 2
      ? state.liquidityBreachDays + 1
      : 0;

  let next: GameState = {
    ...state,
    ...economy,
    day: nextDay,
    week: 1 + Math.floor(((nextDay - 1) % 365) / 7),
    quarter: Math.min(4, 1 + Math.floor(((nextDay - 1) % 365) / 91.25)),
    year: 1 + Math.floor((nextDay - 1) / 365),
    cash,
    deposits,
    loans,
    loanLossReserve,
    totalProfit,
    profit,
    revenue,
    expenses,
    creditLosses,
    fraudLosses,
    reputation,
    satisfaction,
    brandStrength,
    boardConfidence,
    customers,
    customersGained,
    customersLost,
    nplRatio,
    marketShare,
    sharePrice,
    capitalBreachDays,
    liquidityBreachDays,
    competitors: competitorsWithShare,
    ...nextRatios,
  };

  if (nextDay % 5 === 0 && next.loanApplications.length < 5) {
    next = {
      ...next,
      loanApplications: [
        ...next.loanApplications,
        generateLoanApplication(next),
      ],
    };
  }

  if (nextDay % 14 === 0 && !next.pendingDecision) {
    const available = DECISIONS.filter(
      (decision) =>
        !next.events.some(
          (item) => item.title === decision.title && nextDay - item.day < 70,
        ),
    );
    const pool = available.length > 0 ? available : DECISIONS;
    next = {
      ...next,
      pendingDecision: pool[Math.floor(Math.random() * pool.length)],
    };
  }

  if (nextDay % 30 === 0) {
    next = addEvent(
      next,
      createEvent(
        nextDay,
        economy.economicCycle === "recession" ||
          economy.economicCycle === "slowdown"
          ? "warning"
          : "neutral",
        "Monthly economic report",
        `The economy is in ${economy.economicCycle}. The policy rate is ${economy.baseRate.toFixed(2)}% and GDP growth is ${economy.gdpGrowth.toFixed(1)}%.`,
      ),
    );
  }
  if (bankRunOutflow > 0) {
    next = addEvent(
      next,
      createEvent(
        nextDay,
        "warning",
        "Deposit pressure",
        `Customers withdrew an additional NOK ${round(bankRunOutflow).toLocaleString("en-GB")} as confidence weakened.`,
      ),
    );
  } else if (nextDay % 11 === 0) {
    next = addEvent(
      next,
      createEvent(
        nextDay,
        "neutral",
        "Trading update",
        `${customersGained} customers joined and ${customersLost} left today. Daily profit was NOK ${profit.toLocaleString("en-GB")}.`,
      ),
    );
  }

  next = evaluateObjectives(next);
  next = unlockAchievements(next);
  next = {
    ...next,
    history: [...next.history, historyPoint(next)].slice(-120),
  };

  if (next.liquidityBreachDays >= 5) {
    next = {
      ...next,
      gameOverReason:
        "The bank remained critically illiquid for five days and was placed into resolution.",
    };
  } else if (next.capitalBreachDays >= 7) {
    next = {
      ...next,
      gameOverReason:
        "The capital ratio remained below the regulatory minimum for seven days.",
    };
  } else if (next.compliance <= 15) {
    next = {
      ...next,
      gameOverReason:
        "The banking licence was withdrawn after severe compliance failures.",
    };
  }

  return next;
}

export function advanceDays(state: GameState, count: number): GameState {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    if (next.pendingDecision || next.gameOverReason) break;
    next = advanceDay(next);
  }
  return next;
}
