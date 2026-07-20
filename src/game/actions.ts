import { PRODUCT_CATALOG } from "./catalog";
import type { GameState, LendingPolicy, ProductKey } from "./types";
import { addEvent, clamp, createEvent, round } from "./utils";

export function setRates(
  state: GameState,
  depositRate: number,
  loanRate: number,
): GameState {
  return {
    ...state,
    depositRate: clamp(depositRate, 0.25, 8),
    loanRate: clamp(loanRate, 2.5, 16),
  };
}

export function setLendingPolicy(
  state: GameState,
  lendingPolicy: LendingPolicy,
): GameState {
  return addEvent(
    { ...state, lendingPolicy },
    createEvent(
      state.day,
      "neutral",
      "Credit policy changed",
      `The bank is now using a ${lendingPolicy} lending policy.`,
    ),
  );
}

export function chooseDecision(state: GameState, choiceId: string): GameState {
  const decision = state.pendingDecision;
  if (!decision) return state;
  const choice = decision.choices.find((item) => item.id === choiceId);
  if (!choice) return state;
  const effect = choice.effect;
  let next: GameState = {
    ...state,
    pendingDecision: null,
    cash: Math.max(
      0,
      state.cash + (effect.cash ?? 0) - (effect.fraudLosses ?? 0),
    ),
    deposits: Math.max(0, state.deposits + (effect.deposits ?? 0)),
    loans: Math.max(0, state.loans + (effect.loans ?? 0)),
    reputation: clamp(state.reputation + (effect.reputation ?? 0), 1, 100),
    satisfaction: clamp(
      state.satisfaction + (effect.satisfaction ?? 0),
      1,
      100,
    ),
    customers: Math.max(1, state.customers + (effect.customers ?? 0)),
    employees: Math.max(1, state.employees + (effect.employees ?? 0)),
    compliance: clamp(state.compliance + (effect.compliance ?? 0), 1, 100),
    cyberSecurity: clamp(
      state.cyberSecurity + (effect.cyberSecurity ?? 0),
      1,
      100,
    ),
    boardConfidence: clamp(
      state.boardConfidence + (effect.boardConfidence ?? 0),
      1,
      100,
    ),
    brandStrength: clamp(
      state.brandStrength + (effect.brandStrength ?? 0),
      1,
      100,
    ),
    fraudLosses: Math.max(0, state.fraudLosses + (effect.fraudLosses ?? 0)),
  };
  next = addEvent(
    next,
    createEvent(
      state.day,
      "neutral",
      decision.title,
      `Management chose: ${choice.label}. ${choice.description}`,
    ),
  );
  return next;
}

export function runMarketingCampaign(state: GameState): GameState {
  const cost = 180_000;
  if (state.cash < cost) return state;
  const gained = 45 + round(Math.random() * 45);
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      customers: state.customers + gained,
      reputation: clamp(state.reputation + 2.3, 1, 100),
      brandStrength: clamp(state.brandStrength + 4, 1, 100),
      satisfaction: clamp(state.satisfaction + 0.8, 1, 100),
    },
    createEvent(
      state.day,
      "positive",
      "Campaign launched",
      `${gained} customers joined after a targeted local campaign.`,
    ),
  );
}

export function hireEmployee(state: GameState): GameState {
  const cost = 95_000;
  if (state.cash < cost) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      employees: state.employees + 1,
      satisfaction: clamp(state.satisfaction + 1.4, 1, 100),
    },
    createEvent(
      state.day,
      "positive",
      "New employee hired",
      "Service capacity increased across customer operations.",
    ),
  );
}

export function openBranch(state: GameState): GameState {
  const cost = 2_400_000;
  if (state.cash < cost) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      branches: state.branches + 1,
      employees: state.employees + 4,
      customers: state.customers + 120,
      reputation: clamp(state.reputation + 2.8, 1, 100),
      brandStrength: clamp(state.brandStrength + 3, 1, 100),
    },
    createEvent(
      state.day,
      "positive",
      "New branch opened",
      "A new city district is now served by your bank.",
    ),
  );
}

export function upgradeDigitalBank(state: GameState): GameState {
  const cost = 650_000;
  if (state.cash < cost || state.digitalLevel >= 100) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      digitalLevel: clamp(state.digitalLevel + 12, 1, 100),
      satisfaction: clamp(state.satisfaction + 2, 1, 100),
      brandStrength: clamp(state.brandStrength + 3, 1, 100),
    },
    createEvent(
      state.day,
      "positive",
      "Digital platform upgraded",
      "The app and self-service experience have improved.",
    ),
  );
}

export function improveCyberSecurity(state: GameState): GameState {
  const cost = 420_000;
  if (state.cash < cost || state.cyberSecurity >= 100) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      cyberSecurity: clamp(state.cyberSecurity + 14, 1, 100),
      compliance: clamp(state.compliance + 3, 1, 100),
    },
    createEvent(
      state.day,
      "positive",
      "Cyber controls strengthened",
      "Detection, identity security and incident response were upgraded.",
    ),
  );
}

export function launchProduct(state: GameState, key: ProductKey): GameState {
  const product = PRODUCT_CATALOG[key];
  if (
    state.products.includes(key) ||
    state.cash < product.cost ||
    state.reputation < product.unlockReputation
  ) {
    return state;
  }
  return addEvent(
    {
      ...state,
      cash: state.cash - product.cost,
      products: [...state.products, key],
      reputation: clamp(state.reputation + 1.7, 1, 100),
      satisfaction: clamp(state.satisfaction + 1.1, 1, 100),
      brandStrength: clamp(state.brandStrength + 2, 1, 100),
    },
    createEvent(
      state.day,
      "positive",
      `${product.name} launched`,
      "The new product is live and customer acquisition has improved.",
    ),
  );
}

export function investInCompliance(state: GameState): GameState {
  const cost = 320_000;
  if (state.cash < cost || state.compliance >= 100) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      compliance: clamp(state.compliance + 10, 1, 100),
      riskScore: clamp(state.riskScore - 5, 1, 100),
      boardConfidence: clamp(state.boardConfidence + 2, 1, 100),
      reputation: clamp(state.reputation + 0.8, 1, 100),
    },
    createEvent(
      state.day,
      "positive",
      "Compliance programme completed",
      "Controls and regulatory readiness have improved.",
    ),
  );
}

export function buildLoanReserve(state: GameState): GameState {
  const cost = 250_000;
  if (state.cash < cost) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - cost,
      loanLossReserve: state.loanLossReserve + cost,
      boardConfidence: clamp(state.boardConfidence + 1, 1, 100),
    },
    createEvent(
      state.day,
      "positive",
      "Loan-loss reserve increased",
      "The bank is better prepared for future defaults.",
    ),
  );
}

export function raiseWholesaleFunding(state: GameState): GameState {
  const amount = 5_000_000;
  return addEvent(
    {
      ...state,
      cash: state.cash + amount,
      wholesaleFunding: state.wholesaleFunding + amount,
      wholesaleFundingRate: clamp(
        state.baseRate + 1.15 + state.riskScore / 100,
        2,
        12,
      ),
    },
    createEvent(
      state.day,
      "neutral",
      "Wholesale funding raised",
      `The bank borrowed NOK 5 million at ${clamp(state.baseRate + 1.15 + state.riskScore / 100, 2, 12).toFixed(2)}%.`,
    ),
  );
}

export function repayWholesaleFunding(state: GameState): GameState {
  const amount = Math.min(5_000_000, state.wholesaleFunding);
  if (amount <= 0 || state.cash < amount + 1_000_000) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - amount,
      wholesaleFunding: state.wholesaleFunding - amount,
    },
    createEvent(
      state.day,
      "positive",
      "Wholesale funding repaid",
      `NOK ${amount.toLocaleString("en-GB")} of market funding was repaid.`,
    ),
  );
}

export function approveLoan(
  state: GameState,
  applicationId: string,
): GameState {
  const application = state.loanApplications.find(
    (item) => item.id === applicationId,
  );
  if (!application || state.cash < application.amount) return state;
  const riskImpact =
    (application.amount / Math.max(1, state.loans)) *
    application.defaultChance *
    0.18;
  return addEvent(
    {
      ...state,
      cash: state.cash - application.amount,
      loans: state.loans + application.amount,
      customers: state.customers + 1,
      nplRatio: clamp(state.nplRatio + riskImpact, 0.5, 15),
      loanApplications: state.loanApplications.filter(
        (item) => item.id !== applicationId,
      ),
    },
    createEvent(
      state.day,
      application.riskGrade === "D" ? "warning" : "positive",
      "Large loan approved",
      `${application.customerName} received NOK ${application.amount.toLocaleString("en-GB")} at ${application.rate.toFixed(2)}%.`,
    ),
  );
}

export function rejectLoan(state: GameState, applicationId: string): GameState {
  const application = state.loanApplications.find(
    (item) => item.id === applicationId,
  );
  if (!application) return state;
  return addEvent(
    {
      ...state,
      loanApplications: state.loanApplications.filter(
        (item) => item.id !== applicationId,
      ),
    },
    createEvent(
      state.day,
      "neutral",
      "Loan application declined",
      `${application.customerName}'s application was declined by the credit committee.`,
    ),
  );
}

export function takeCourse(state: GameState): GameState {
  const cost = 30_000;
  if (state.personalCash < cost || state.educationLevel >= 4) return state;
  return addEvent(
    {
      ...state,
      personalCash: state.personalCash - cost,
      educationLevel: state.educationLevel + 1,
      skillPoints: state.skillPoints + 2,
    },
    createEvent(
      state.day,
      "positive",
      "Executive course completed",
      "You gained two skill points in banking and leadership.",
    ),
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
      boardConfidence: clamp(state.boardConfidence + 2, 1, 100),
      reputation: clamp(state.reputation + 1.2, 1, 100),
    },
    createEvent(
      state.day,
      "positive",
      "Career milestone reached",
      "Your founder profile and earning power have improved.",
    ),
  );
}

export function takeDividend(state: GameState): GameState {
  const gross = 100_000;
  if (state.cash < 1_200_000 || state.boardConfidence < 35) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash - gross,
      personalCash: state.personalCash + 65_000,
      boardConfidence: clamp(state.boardConfidence - 1, 1, 100),
      reputation: clamp(state.reputation - 0.3, 1, 100),
    },
    createEvent(
      state.day,
      "neutral",
      "Founder dividend paid",
      "A dividend was transferred to your personal finances after tax.",
    ),
  );
}

export function acquireCompetitor(
  state: GameState,
  competitorId: string,
): GameState {
  const competitor = state.competitors.find((item) => item.id === competitorId);
  if (
    !competitor ||
    state.cash < competitor.acquisitionPrice ||
    state.reputation < 68
  )
    return state;
  return addEvent(
    {
      ...state,
      cash:
        state.cash -
        competitor.acquisitionPrice +
        Math.max(0, competitor.deposits - competitor.loans) * 0.9,
      deposits: state.deposits + competitor.deposits,
      loans: state.loans + competitor.loans,
      customers: state.customers + competitor.customers,
      employees: state.employees + Math.max(5, competitor.branches * 5),
      branches: state.branches + competitor.branches,
      digitalLevel: clamp(
        Math.max(state.digitalLevel, competitor.digitalLevel * 0.82),
        1,
        100,
      ),
      reputation: clamp(state.reputation + 4, 1, 100),
      brandStrength: clamp(state.brandStrength + 5, 1, 100),
      competitors: state.competitors.filter((item) => item.id !== competitorId),
    },
    createEvent(
      state.day,
      "positive",
      `${competitor.name} acquired`,
      "Its customer portfolio, lending book, deposits and branches joined the group.",
    ),
  );
}

export function raiseEquityCapital(state: GameState): GameState {
  const amount = 5_000_000;
  if (state.boardConfidence < 25) return state;
  return addEvent(
    {
      ...state,
      cash: state.cash + amount,
      sharePrice: Math.max(3, state.sharePrice * 0.88),
      boardConfidence: clamp(state.boardConfidence - 3, 1, 100),
      reputation: clamp(state.reputation - 0.6, 1, 100),
    },
    createEvent(
      state.day,
      "neutral",
      "New equity issued",
      "Investors injected NOK 5 million. Existing shareholders were diluted by the capital raise.",
    ),
  );
}
