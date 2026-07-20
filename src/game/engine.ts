import type { CampaignInput, GameEvent, GameState, ProductKey } from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value);

const productCosts: Record<ProductKey, number> = {
  everyday: 0,
  savings: 220_000,
  mortgage: 650_000,
  sme: 900_000,
};

const productNames: Record<ProductKey, string> = {
  everyday: 'Everyday Account',
  savings: 'High-Yield Savings',
  mortgage: 'Home Mortgage',
  sme: 'SME Banking',
};

function event(day: number, tone: GameEvent['tone'], title: string, body: string): GameEvent {
  return { id: `${day}-${title}-${Math.random().toString(36).slice(2, 7)}`, day, tone, title, body };
}

function addEvent(state: GameState, nextEvent: GameEvent): GameState {
  return { ...state, events: [nextEvent, ...state.events].slice(0, 8) };
}

function ratios(cash: number, loans: number, deposits: number, compliance: number) {
  const equity = Math.max(1, cash + loans - deposits);
  const capitalRatio = clamp((equity / Math.max(1, loans * 0.72)) * 100, 4, 40);
  const liquidityRatio = clamp((cash / Math.max(1, deposits)) * 100, 2, 100);
  const loanToDeposit = loans / Math.max(1, deposits);
  const riskScore = clamp(18 + loanToDeposit * 29 + Math.max(0, 75 - compliance) * 0.45, 5, 95);
  return { capitalRatio, liquidityRatio, riskScore };
}

export function emptyGame(): GameState {
  return {
    version: 2,
    setupComplete: false,
    founderName: '',
    background: 'Operations',
    bankName: 'Nordic Trust',
    brandTheme: 'forest',
    difficulty: 'balanced',
    day: 1,
    year: 1,
    cash: 6_000_000,
    personalCash: 120_000,
    deposits: 14_000_000,
    loans: 9_000_000,
    profit: 0,
    revenue: 0,
    expenses: 0,
    reputation: 48,
    satisfaction: 72,
    customers: 420,
    employees: 9,
    branches: 1,
    depositRate: 2.7,
    loanRate: 6.4,
    capitalRatio: 15.4,
    liquidityRatio: 42.8,
    compliance: 78,
    riskScore: 34,
    marketShare: 1.05,
    sharePrice: 24.8,
    educationLevel: 0,
    careerLevel: 0,
    skillPoints: 0,
    products: ['everyday'],
    events: [],
  };
}

export function createCampaign(input: CampaignInput): GameState {
  const difficultyCash = input.difficulty === 'relaxed' ? 7_500_000 : input.difficulty === 'hard' ? 4_800_000 : 6_000_000;
  const state = {
    ...emptyGame(),
    ...input,
    setupComplete: true,
    cash: difficultyCash,
  };

  return addEvent(
    state,
    event(1, 'positive', 'Your bank is open', `${input.bankName} has received its banking licence and welcomed its first customers.`),
  );
}

export function advanceDay(state: GameState): GameState {
  const difficultyGrowth = state.difficulty === 'relaxed' ? 1.18 : state.difficulty === 'hard' ? 0.82 : 1;
  const staffingPressure = clamp(state.customers / Math.max(1, state.employees * 72), 0.7, 1.65);
  const rateAppeal = clamp(1 + (state.depositRate - 2.5) * 0.09 - (state.loanRate - 6.2) * 0.045, 0.72, 1.28);
  const marketPulse = 0.92 + Math.random() * 0.2;
  const productPower = 1 + (state.products.length - 1) * 0.12;
  const newCustomers = Math.max(
    0,
    round((state.branches * 2.6 + state.reputation / 18) * difficultyGrowth * rateAppeal * marketPulse * productPower),
  );

  const averageDeposit = 8_500 + Math.random() * 10_000;
  const depositInflow = round(newCustomers * averageDeposit);
  const dailyOutflow = round(state.deposits * (0.00045 + Math.max(0, 2.35 - state.depositRate) * 0.00011));
  const demand = state.customers * (32 + Math.random() * 24) + newCustomers * 11_000;
  const lendingCapacity = state.cash * clamp(0.025 + state.compliance / 10_000, 0.026, 0.042);
  const approvedLoans = round(Math.min(lendingCapacity, demand * (1 - state.riskScore / 170)));

  const interestIncome = state.loans * (state.loanRate / 100) / 365;
  const depositExpense = state.deposits * (state.depositRate / 100) / 365;
  const feeIncome = state.customers * (2.7 + state.products.length * 0.75);
  const payroll = state.employees * 210;
  const branchCost = state.branches * 930;
  const complianceCost = 420 + Math.max(0, 88 - state.compliance) * 17;
  const revenue = round(interestIncome + feeIncome);
  const expenses = round(depositExpense + payroll + branchCost + complianceCost);
  const profit = revenue - expenses;

  const deposits = Math.max(0, state.deposits + depositInflow - dailyOutflow);
  const loans = Math.max(0, state.loans + approvedLoans);
  const cash = Math.max(0, state.cash + depositInflow - dailyOutflow - approvedLoans + profit);

  const serviceChange = staffingPressure > 1.1 ? -0.35 * staffingPressure : 0.12;
  const pricingChange = state.loanRate > 8 ? -0.2 : state.depositRate > 3.1 ? 0.12 : 0;
  const satisfaction = clamp(state.satisfaction + serviceChange + pricingChange, 30, 98);
  const reputationChange = satisfaction > 80 ? 0.08 : satisfaction < 58 ? -0.14 : 0.02;
  const reputation = clamp(state.reputation + reputationChange, 1, 100);
  const nextRatios = ratios(cash, loans, deposits, state.compliance);
  const marketShare = clamp((state.customers + newCustomers) / 40_000 * 100, 0.1, 40);
  const sharePrice = Math.max(5, 15 + reputation * 0.18 + marketShare * 1.5 + profit / 15_000);
  const nextDay = state.day + 1;
  const year = 1 + Math.floor((nextDay - 1) / 365);

  let next: GameState = {
    ...state,
    day: nextDay,
    year,
    cash,
    deposits,
    loans,
    profit,
    revenue,
    expenses,
    customers: state.customers + newCustomers,
    satisfaction,
    reputation,
    marketShare,
    sharePrice,
    ...nextRatios,
  };

  if (nextDay % 11 === 0) {
    next = addEvent(next, event(nextDay, 'neutral', 'Local market update', `Demand remained healthy and ${newCustomers} new customers joined today.`));
  } else if (nextDay % 17 === 0) {
    next = addEvent(next, event(nextDay, nextRatios.liquidityRatio < 18 ? 'warning' : 'positive', 'Treasury review', `Liquidity is now ${nextRatios.liquidityRatio.toFixed(1)}%.`));
  } else if (nextDay % 23 === 0) {
    next = addEvent(next, event(nextDay, satisfaction < 60 ? 'warning' : 'positive', 'Customer pulse', `Customer satisfaction measured ${satisfaction.toFixed(0)}/100.`));
  }

  return next;
}

export function setRates(state: GameState, depositRate: number, loanRate: number): GameState {
  return {
    ...state,
    depositRate: clamp(depositRate, 0.5, 6),
    loanRate: clamp(loanRate, 2.5, 14),
  };
}

export function runMarketingCampaign(state: GameState): GameState {
  const cost = 150_000;
  if (state.cash < cost) return state;
  const gained = 35 + round(Math.random() * 25);
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      customers: state.customers + gained,
      reputation: clamp(state.reputation + 2.2, 1, 100),
      satisfaction: clamp(state.satisfaction + 0.8, 1, 100),
    },
    event(state.day, 'positive', 'Campaign launched', `${gained} customers joined after a targeted local campaign.`),
  );
}

export function hireEmployee(state: GameState): GameState {
  const cost = 90_000;
  if (state.cash < cost) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      employees: state.employees + 1,
      satisfaction: clamp(state.satisfaction + 1.5, 1, 100),
    },
    event(state.day, 'positive', 'New employee hired', 'Service capacity increased across customer operations.'),
  );
}

export function openBranch(state: GameState): GameState {
  const cost = 2_200_000;
  if (state.cash < cost) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      branches: state.branches + 1,
      employees: state.employees + 4,
      customers: state.customers + 110,
      reputation: clamp(state.reputation + 3, 1, 100),
    },
    event(state.day, 'positive', 'New branch opened', 'A new city district is now served by your bank.'),
  );
}

export function launchProduct(state: GameState, key: ProductKey): GameState {
  const cost = productCosts[key];
  if (state.products.includes(key) || state.cash < cost) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      products: [...state.products, key],
      reputation: clamp(state.reputation + 1.8, 1, 100),
      satisfaction: clamp(state.satisfaction + 1.2, 1, 100),
    },
    event(state.day, 'positive', `${productNames[key]} launched`, 'The new product is live and customer acquisition has improved.'),
  );
}

export function investInCompliance(state: GameState): GameState {
  const cost = 300_000;
  if (state.cash < cost) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      compliance: clamp(state.compliance + 10, 1, 100),
      riskScore: clamp(state.riskScore - 6, 1, 100),
      reputation: clamp(state.reputation + 1, 1, 100),
    },
    event(state.day, 'positive', 'Compliance programme completed', 'Controls and regulatory readiness have improved.'),
  );
}

export function takeCourse(state: GameState): GameState {
  const cost = 30_000;
  if (state.personalCash < cost) return state;
  return addEvent(
    {
      ...state,
      personalCash: state.personalCash - cost,
      educationLevel: state.educationLevel + 1,
      skillPoints: state.skillPoints + 2,
    },
    event(state.day, 'positive', 'Executive course completed', 'You gained two skill points in banking and leadership.'),
  );
}

export function applyForPromotion(state: GameState): GameState {
  if (state.skillPoints < 2 || state.careerLevel >= 4) return state;
  return addEvent(
    {
      ...state,
      skillPoints: state.skillPoints - 2,
      careerLevel: state.careerLevel + 1,
      personalCash: state.personalCash + 55_000,
      reputation: clamp(state.reputation + 1.2, 1, 100),
    },
    event(state.day, 'positive', 'Career milestone reached', 'Your founder profile and earning power have improved.'),
  );
}

export function takeDividend(state: GameState): GameState {
  const gross = 100_000;
  if (state.cash < 1_200_000) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - gross,
      personalCash: state.personalCash + 65_000,
      reputation: clamp(state.reputation - 0.5, 1, 100),
    },
    event(state.day, 'neutral', 'Founder dividend paid', 'A dividend was transferred to your personal finances after tax.'),
  );
}

export function acquireCompetitor(state: GameState): GameState {
  const cost = 8_000_000;
  if (state.cash < cost || state.reputation < 68) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      deposits: state.deposits + 13_000_000,
      loans: state.loans + 10_000_000,
      customers: state.customers + 900,
      employees: state.employees + 18,
      branches: state.branches + 2,
      reputation: clamp(state.reputation + 4, 1, 100),
    },
    event(state.day, 'positive', 'Regional acquisition completed', 'Two branches and a substantial customer portfolio joined the group.'),
  );
}
