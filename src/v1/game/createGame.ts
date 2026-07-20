import type { ExpansionOpportunity } from './config';
import type { Branch, Employee, GameState } from './types';

const employee = (
  id: string,
  name: string,
  role: Employee['role'],
  skill: number,
  monthlySalary: number,
): Employee => ({
  id,
  name,
  role,
  skill,
  morale: 78,
  monthlySalary,
});

const initialBranch = (): Branch => ({
  id: 'branch-bjolsen',
  name: 'Bjølsen filial',
  market: 'residential',
  mandate: 'balanced',
  staffingPolicy: 'balanced',
  reputation: 56,
  customers: 410,
  deposits: 38_000_000,
  loanBook: 62_000_000,
  rentMonthly: 74_000,
  localMarketingBudget: 28_000,
  employees: [
    employee('emp-manager-1', 'Ingrid Solberg', 'branch-manager', 72, 68_000),
    employee('emp-loan-1', 'Jonas Berg', 'lending-advisor', 66, 54_000),
    employee('emp-customer-1', 'Mina Dahl', 'customer-advisor', 63, 49_000),
  ],
  loanQueue: [],
  reports: [],
});

export const createExpansionBranch = (
  opportunity: ExpansionOpportunity,
  sequence: number,
): Branch => {
  const marketLoanBook =
    opportunity.market === 'business' ? 34_000_000 : opportunity.market === 'mixed' ? 30_000_000 : 36_000_000;
  const marketDeposits =
    opportunity.market === 'business' ? 22_000_000 : opportunity.market === 'mixed' ? 24_000_000 : 26_000_000;

  return {
    id: opportunity.branchId,
    name: opportunity.name,
    market: opportunity.market,
    mandate: 'growth',
    staffingPolicy: 'balanced',
    reputation: 42,
    customers: 190,
    deposits: marketDeposits,
    loanBook: marketLoanBook,
    rentMonthly: opportunity.market === 'business' ? 96_000 : 84_000,
    localMarketingBudget: 42_000,
    employees: [
      employee(`${opportunity.branchId}-manager`, sequence % 2 === 0 ? 'Henrik Moen' : 'Nora Hansen', 'branch-manager', 65, 66_000),
      employee(`${opportunity.branchId}-loan`, sequence % 2 === 0 ? 'Selma Nilsen' : 'Aksel Larsen', 'lending-advisor', 61, 53_000),
      employee(`${opportunity.branchId}-customer`, sequence % 2 === 0 ? 'Oskar Dahl' : 'Emma Johansen', 'customer-advisor', 59, 48_000),
    ],
    loanQueue: [],
    reports: [],
  };
};

export const createNewGame = (): GameState => ({
  saveVersion: 1,
  gameVersion: '1.0.0-alpha.2',
  bankName: 'Northline Bank',
  date: { year: 2026, month: 1 },
  cash: 7_500_000,
  equity: 12_500_000,
  strategy: 'balanced',
  lendingPolicy: 'balanced',
  branches: [initialBranch()],
  inbox: [
    {
      id: 'welcome-v1',
      monthKey: '2026-01',
      kind: 'report',
      title: 'Din første filial er klar',
      body: 'Ingrid og teamet håndterer den daglige driften. Du setter retning, rammer og tempo — lederne utfører arbeidet lokalt.',
      branchId: 'branch-bjolsen',
      read: false,
    },
  ],
});