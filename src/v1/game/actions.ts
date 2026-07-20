import {
  CAMPAIGN_LABELS,
  COUNTRY_DEFINITIONS,
  EXECUTIVE_DEFINITIONS,
  EXPANSION_OPPORTUNITIES,
  PRODUCT_DEFINITIONS,
  TECHNOLOGY_DEFINITIONS,
  formatMonthKey,
} from './config';
import { createExpansionBranch } from './createGame';
import { simulateNextMonth } from './simulateMonth';
import type {
  BankStrategy,
  BranchMandate,
  CampaignKind,
  CampaignScope,
  ExecutiveRole,
  GameState,
  LendingPolicy,
  ProductId,
  StaffingPolicy,
  TechnologyId,
} from './types';

const updateBranch = (
  state: GameState,
  branchId: string,
  updater: (branch: GameState['branches'][number]) => GameState['branches'][number],
): GameState => ({
  ...state,
  branches: state.branches.map((branch) => (branch.id === branchId ? updater(branch) : branch)),
});

export const setBankStrategy = (state: GameState, strategy: BankStrategy): GameState => ({ ...state, strategy });
export const setBankLendingPolicy = (state: GameState, lendingPolicy: LendingPolicy): GameState => ({ ...state, lendingPolicy });
export const setBranchMandate = (state: GameState, branchId: string, mandate: BranchMandate): GameState =>
  updateBranch(state, branchId, (branch) => ({ ...branch, mandate }));
export const setBranchStaffingPolicy = (state: GameState, branchId: string, staffingPolicy: StaffingPolicy): GameState =>
  updateBranch(state, branchId, (branch) => ({ ...branch, staffingPolicy }));
export const adjustBranchMarketing = (state: GameState, branchId: string, change: number): GameState =>
  updateBranch(state, branchId, (branch) => ({
    ...branch,
    localMarketingBudget: Math.min(500_000, Math.max(0, branch.localMarketingBudget + change)),
  }));

export const advanceMonths = (state: GameState, months: number): GameState => {
  let next = state;
  for (let index = 0; index < months; index += 1) next = simulateNextMonth(next);
  return next;
};

export const openExpansionBranch = (state: GameState, opportunityId: string): GameState => {
  const opportunity = EXPANSION_OPPORTUNITIES.find((entry) => entry.id === opportunityId);
  if (!opportunity || state.branches.some((branch) => branch.id === opportunity.branchId)) return state;
  const countryDefinition = COUNTRY_DEFINITIONS.find((country) => country.code === opportunity.country);
  const countryState = state.countries.find((country) => country.code === opportunity.country);
  if (!countryDefinition || !countryState?.unlocked) return state;
  const firstInCountry = !state.branches.some((branch) => branch.country === opportunity.country);
  const totalCost = opportunity.openingCost + (firstInCountry ? countryDefinition.entryCost : 0);
  if (state.cash < totalCost) return state;

  const monthKey = formatMonthKey(state.date.year, state.date.month);
  const branch = createExpansionBranch(opportunity, state.branches.length, monthKey);
  return {
    ...state,
    cash: state.cash - totalCost,
    equity: state.equity - Math.round(totalCost * 0.08),
    branches: [...state.branches, branch],
    countries: state.countries.map((country) =>
      country.code === opportunity.country ? { ...country, entered: true, awareness: Math.max(country.awareness, 18) } : country,
    ),
    inbox: [
      {
        id: `opened-${opportunity.id}-${monthKey}`,
        monthKey,
        kind: 'milestone',
        title: `${opportunity.name} er åpnet`,
        body: `${firstInCountry ? `Northline Bank er nå etablert i ${countryDefinition.code}. ` : ''}Det lokale teamet er på plass og driver filialen innenfor mandatet ditt.`,
        branchId: branch.id,
        read: false,
      },
      ...state.inbox,
    ].slice(0, 60),
  };
};

export const closeBranch = (state: GameState, branchId: string): GameState => {
  if (state.branches.length <= 1) return state;
  const branch = state.branches.find((item) => item.id === branchId);
  if (!branch) return state;
  const recovery = Math.round((branch.deposits * 0.002 + branch.loanBook * 0.001) / 1_000) * 1_000;
  return {
    ...state,
    cash: state.cash + recovery,
    branches: state.branches.filter((item) => item.id !== branchId),
    inbox: [
      {
        id: `closed-${branchId}-${state.date.year}-${state.date.month}`,
        monthKey: formatMonthKey(state.date.year, state.date.month),
        kind: 'warning',
        title: `${branch.name} er avviklet`,
        body: `Kundene og utlånsporteføljen er overført til resten av banken. Avviklingen frigjorde ${recovery.toLocaleString('nb-NO')} kr.`,
        read: false,
      },
      ...state.inbox,
    ],
  };
};

export const activateProduct = (state: GameState, productId: ProductId): GameState => {
  const definition = PRODUCT_DEFINITIONS.find((item) => item.id === productId);
  const item = state.products.find((product) => product.id === productId);
  if (!definition || !item || item.enabled || state.equity < definition.unlockEquity) return state;
  const launchCost = Math.max(600_000, definition.unlockEquity * 0.04);
  if (state.cash < launchCost) return state;
  return {
    ...state,
    cash: state.cash - launchCost,
    products: state.products.map((product) => product.id === productId ? { ...product, enabled: true, quality: 52 } : product),
    inbox: [
      {
        id: `product-${productId}-${state.date.year}-${state.date.month}`,
        monthKey: formatMonthKey(state.date.year, state.date.month),
        kind: 'milestone',
        title: `${definition.name} er lansert`,
        body: `Produktteamet og filialene tar over den løpende driften. Lanseringen kostet ${launchCost.toLocaleString('nb-NO')} kr.`,
        read: false,
      },
      ...state.inbox,
    ],
  };
};

export const adjustProductPricing = (
  state: GameState,
  productId: ProductId,
  field: 'price' | 'targetMargin',
  change: number,
): GameState => ({
  ...state,
  products: state.products.map((product) => product.id === productId ? {
    ...product,
    [field]: Math.round(Math.max(0.1, product[field] + change) * 100) / 100,
  } : product),
});

export const hireExecutive = (state: GameState, role: ExecutiveRole): GameState => {
  const definition = EXECUTIVE_DEFINITIONS.find((item) => item.role === role);
  const executive = state.executives.find((item) => item.role === role);
  if (!definition || !executive || executive.hired || state.cash < definition.signingCost) return state;
  return {
    ...state,
    cash: state.cash - definition.signingCost,
    executives: state.executives.map((item) => item.role === role ? { ...item, hired: true } : item),
    inbox: [
      {
        id: `executive-${role}-${state.date.year}-${state.date.month}`,
        monthKey: formatMonthKey(state.date.year, state.date.month),
        kind: 'milestone',
        title: `${definition.title} er ansatt`,
        body: `${definition.name} går inn i konsernledelsen og tar ansvar for sitt område.`,
        read: false,
      },
      ...state.inbox,
    ],
  };
};

export const upgradeTechnology = (state: GameState, technologyId: TechnologyId): GameState => {
  const definition = TECHNOLOGY_DEFINITIONS.find((item) => item.id === technologyId);
  const technology = state.technologies.find((item) => item.id === technologyId);
  if (!definition || !technology || technology.level >= technology.maxLevel) return state;
  const cost = Math.round(definition.baseCost * (1 + technology.level * 0.72));
  if (state.cash < cost) return state;
  return {
    ...state,
    cash: state.cash - cost,
    technologies: state.technologies.map((item) => item.id === technologyId ? { ...item, level: item.level + 1 } : item),
    inbox: [
      {
        id: `technology-${technologyId}-${technology.level + 1}-${state.date.year}-${state.date.month}`,
        monthKey: formatMonthKey(state.date.year, state.date.month),
        kind: 'report',
        title: `${definition.name} er oppgradert`,
        body: `Nivå ${technology.level + 1} er satt i drift. Effekten brukes automatisk i hele banken.`,
        read: false,
      },
      ...state.inbox,
    ],
  };
};

export const launchCampaign = (
  state: GameState,
  kind: CampaignKind,
  scope: CampaignScope,
  monthlyBudget: number,
  months: number,
): GameState => {
  const budget = Math.max(100_000, Math.min(5_000_000, monthlyBudget));
  const duration = Math.max(1, Math.min(12, months));
  const monthKey = formatMonthKey(state.date.year, state.date.month);
  return {
    ...state,
    campaigns: [
      ...state.campaigns,
      {
        id: `campaign-${kind}-${scope}-${Date.now()}`,
        kind,
        scope,
        monthlyBudget: budget,
        monthsRemaining: duration,
        startedMonth: monthKey,
      },
    ],
    inbox: [
      {
        id: `campaign-start-${kind}-${scope}-${monthKey}`,
        monthKey,
        kind: 'report',
        title: `${CAMPAIGN_LABELS[kind]} er startet`,
        body: `Kampanjen går i ${duration} måneder med ${budget.toLocaleString('nb-NO')} kr per måned. Markedsavdelingen følger opp resultatene.`,
        read: false,
      },
      ...state.inbox,
    ],
  };
};

export const cancelCampaign = (state: GameState, campaignId: string): GameState => ({
  ...state,
  campaigns: state.campaigns.filter((campaign) => campaign.id !== campaignId),
});

export const markInboxRead = (state: GameState, itemId: string): GameState => ({
  ...state,
  inbox: state.inbox.map((item) => item.id === itemId ? { ...item, read: true } : item),
});

export const renameBank = (state: GameState, bankName: string): GameState => ({
  ...state,
  bankName: bankName.trim().slice(0, 36) || state.bankName,
});
