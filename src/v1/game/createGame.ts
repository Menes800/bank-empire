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
  reputation: 56,
  customers: 410,
  deposits: 27_500_000,
  loanBook: 48_000_000,
  rentMonthly: 92_000,
  localMarketingBudget: 28_000,
  employees: [
    employee('emp-manager-1', 'Ingrid Solberg', 'branch-manager', 72, 68_000),
    employee('emp-loan-1', 'Jonas Berg', 'lending-advisor', 66, 54_000),
    employee('emp-customer-1', 'Mina Dahl', 'customer-advisor', 63, 49_000),
  ],
  loanQueue: [],
  reports: [],
});

export const createNewGame = (): GameState => ({
  saveVersion: 1,
  gameVersion: '1.0.0-alpha.1',
  bankName: 'Northline Bank',
  date: { year: 2026, month: 1 },
  cash: 7_500_000,
  equity: 12_500_000,
  strategy: 'balanced',
  branches: [initialBranch()],
  inbox: [
    {
      id: 'welcome-v1',
      monthKey: '2026-01',
      kind: 'report',
      title: 'Din første filial er klar',
      body: 'Ingrid og teamet håndterer den daglige driften. Du setter retning og følger opp når noe faktisk trenger deg.',
      branchId: 'branch-bjolsen',
      read: false,
    },
  ],
});
