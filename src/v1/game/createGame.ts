import {
  COUNTRY_DEFINITIONS,
  EXECUTIVE_DEFINITIONS,
  PRODUCT_DEFINITIONS,
  TECHNOLOGY_DEFINITIONS,
  type ExpansionOpportunity,
} from './config';
import type { Branch, Employee, EmployeeRole, GameState } from './types';

const employee = (
  id: string,
  name: string,
  role: EmployeeRole,
  skill: number,
  monthlySalary: number,
): Employee => ({
  id,
  name,
  role,
  skill,
  morale: 78,
  monthlySalary,
  tenureMonths: 8,
});

const branchTeam = (branchId: string, sequence: number, market: Branch['market']): Employee[] => {
  const managerNames = ['Ingrid Solberg', 'Nora Hansen', 'Henrik Moen', 'Maya Chen', 'Lucas Bergström'];
  const advisorNames = ['Jonas Berg', 'Selma Nilsen', 'Aksel Larsen', 'Amira Khan', 'Oliver Smith'];
  const customerNames = ['Mina Dahl', 'Emma Johansen', 'Oskar Dahl', 'Sofia Jensen', 'Theo Brown'];
  const team: Employee[] = [
    employee(`${branchId}-manager`, managerNames[sequence % managerNames.length], 'branch-manager', 66 + (sequence % 9), 68_000),
    employee(`${branchId}-loan`, advisorNames[sequence % advisorNames.length], 'lending-advisor', 62 + (sequence % 8), 54_000),
    employee(`${branchId}-customer`, customerNames[sequence % customerNames.length], 'customer-advisor', 60 + (sequence % 7), 49_000),
  ];

  if (market === 'business') team.push(employee(`${branchId}-business`, `Elias ${sequence % 2 ? 'Lind' : 'Novak'}`, 'business-advisor', 64, 61_000));
  if (market === 'wealth') team.push(employee(`${branchId}-wealth`, `Freja ${sequence % 2 ? 'Andersson' : 'Tan'}`, 'wealth-advisor', 67, 66_000));
  return team;
};

const initialBranch = (): Branch => ({
  id: 'branch-bjolsen',
  name: 'Bjølsen',
  city: 'Oslo',
  country: 'NO',
  market: 'residential',
  mandate: 'balanced',
  staffingPolicy: 'balanced',
  reputation: 58,
  satisfaction: 76,
  customers: 760,
  deposits: 95_000_000,
  loanBook: 145_000_000,
  rentMonthly: 80_000,
  localMarketingBudget: 24_000,
  employees: branchTeam('branch-bjolsen', 0, 'residential'),
  loanQueue: [],
  reports: [],
  openedMonth: '2026-01',
});

export const createExpansionBranch = (
  opportunity: ExpansionOpportunity,
  sequence: number,
  openedMonth = '2026-01',
): Branch => {
  const country = COUNTRY_DEFINITIONS.find((item) => item.code === opportunity.country);
  const costFactor = country?.operatingCost ?? 1;

  return {
    id: opportunity.branchId,
    name: opportunity.name,
    city: opportunity.city,
    country: opportunity.country,
    market: opportunity.market,
    mandate: 'growth',
    staffingPolicy: 'balanced',
    reputation: opportunity.country === 'NO' ? 45 : 34,
    satisfaction: 72,
    customers: opportunity.baseCustomers,
    deposits: opportunity.baseDeposits,
    loanBook: opportunity.baseLoanBook,
    rentMonthly: Math.round((opportunity.market === 'wealth' ? 145_000 : opportunity.market === 'business' ? 118_000 : 98_000) * costFactor),
    localMarketingBudget: Math.round((opportunity.country === 'NO' ? 42_000 : 90_000) * costFactor),
    employees: branchTeam(opportunity.branchId, sequence + 1, opportunity.market),
    loanQueue: [],
    reports: [],
    openedMonth,
  };
};

export const createNewGame = (): GameState => ({
  saveVersion: 2,
  gameVersion: '1.0.0-alpha.3',
  bankName: 'Northline Bank',
  date: { year: 2026, month: 1 },
  cash: 16_000_000,
  equity: 24_000_000,
  reputation: 56,
  strategy: 'balanced',
  lendingPolicy: 'balanced',
  branches: [initialBranch()],
  products: PRODUCT_DEFINITIONS.map((product) => ({
    id: product.id,
    enabled: product.unlockEquity === 0,
    quality: product.unlockEquity === 0 ? 58 : 40,
    price: product.defaultPrice,
    targetMargin: product.defaultMargin,
    customers: product.id === 'mortgage' ? 430 : product.id === 'savings' ? 610 : product.id === 'cards' ? 680 : 0,
  })),
  executives: EXECUTIVE_DEFINITIONS.map((executive) => ({
    role: executive.role,
    name: executive.name,
    skill: executive.skill,
    monthlySalary: executive.monthlySalary,
    hired: executive.role === 'COO',
  })),
  technologies: TECHNOLOGY_DEFINITIONS.map((technology) => ({
    id: technology.id,
    level: technology.id === 'core-banking' || technology.id === 'mobile-bank' ? 1 : 0,
    maxLevel: technology.maxLevel,
  })),
  campaigns: [],
  competitors: [
    { id: 'fjord', name: 'Fjord Finans', country: 'NO', strength: 62, aggression: 55, reputation: 64 },
    { id: 'nordic', name: 'Nordic Union Bank', country: 'SE', strength: 68, aggression: 58, reputation: 70 },
    { id: 'hanse', name: 'HanseBank', country: 'DE', strength: 74, aggression: 50, reputation: 76 },
    { id: 'crown', name: 'Crown & City', country: 'GB', strength: 79, aggression: 67, reputation: 73 },
    { id: 'atlas', name: 'Atlas National', country: 'US', strength: 86, aggression: 78, reputation: 80 },
    { id: 'meridian', name: 'Meridian Asia', country: 'SG', strength: 82, aggression: 60, reputation: 84 },
  ],
  countries: COUNTRY_DEFINITIONS.map((country) => ({
    code: country.code,
    unlocked: country.code === 'NO',
    entered: country.code === 'NO',
    awareness: country.code === 'NO' ? 52 : 0,
    regulatoryStanding: country.code === 'NO' ? 78 : 50,
  })),
  objectives: [
    { id: 'profit', title: 'Stabil lokalbank', description: 'Lever positivt månedsresultat.', target: 1, progress: 0, completed: false, reward: 500_000 },
    { id: 'network', title: 'Bygg et nettverk', description: 'Driv tre lønnsomme filialer.', target: 3, progress: 0, completed: false, reward: 1_500_000 },
    { id: 'international', title: 'Nordisk gjennombrudd', description: 'Etabler banken i et nytt land.', target: 2, progress: 1, completed: false, reward: 3_000_000 },
    { id: 'scale', title: 'Regional utfordrer', description: 'Nå 10 000 kunder.', target: 10_000, progress: 760, completed: false, reward: 5_000_000 },
  ],
  inbox: [
    {
      id: 'welcome-v1-full',
      monthKey: '2026-01',
      kind: 'milestone',
      title: 'Northline Bank er klar for vekst',
      body: 'Ingrid og teamet driver Bjølsen lokalt. Du setter strategi, produktretning, ledergruppe og ekspansjonstempo. Målet er å bygge en internasjonal bank uten å ende som saksbehandler.',
      branchId: 'branch-bjolsen',
      read: false,
    },
  ],
  history: [],
});
