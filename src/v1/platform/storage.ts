import { createNewGame } from '../game/createGame';
import type { Branch, Employee, GameState } from '../game/types';

const SAVE_KEY = 'bank-empire-v1-alpha';

const migrateEmployee = (employee: Partial<Employee>, index: number): Employee => ({
  id: employee.id ?? `migrated-employee-${index}`,
  name: employee.name ?? 'Ny medarbeider',
  role: employee.role ?? 'customer-advisor',
  skill: employee.skill ?? 60,
  morale: employee.morale ?? 75,
  monthlySalary: employee.monthlySalary ?? 50_000,
  tenureMonths: employee.tenureMonths ?? 6,
});

const migrateBranch = (branch: Partial<Branch>, index: number): Branch => ({
  id: branch.id ?? `migrated-branch-${index}`,
  name: branch.name?.replace(' filial', '') ?? `Filial ${index + 1}`,
  city: branch.city ?? (index === 0 ? 'Oslo' : branch.name?.replace(' filial', '') ?? 'Oslo'),
  country: branch.country ?? 'NO',
  market: branch.market ?? 'mixed',
  mandate: branch.mandate ?? 'balanced',
  staffingPolicy: branch.staffingPolicy ?? 'balanced',
  reputation: branch.reputation ?? 50,
  satisfaction: branch.satisfaction ?? 74,
  customers: branch.customers ?? 300,
  deposits: branch.deposits ?? 45_000_000,
  loanBook: branch.loanBook ?? 70_000_000,
  rentMonthly: branch.rentMonthly ?? 90_000,
  localMarketingBudget: branch.localMarketingBudget ?? 30_000,
  employees: (branch.employees ?? []).map(migrateEmployee),
  loanQueue: (branch.loanQueue ?? []).map((loan) => ({ ...loan, segment: loan.segment ?? 'mortgage' })),
  reports: (branch.reports ?? []).map((report) => ({ ...report, satisfaction: report.satisfaction ?? 74 })),
  openedMonth: branch.openedMonth ?? '2026-01',
});

const migrateSave = (raw: unknown): GameState => {
  const fresh = createNewGame();
  if (!raw || typeof raw !== 'object') return fresh;
  const parsed = raw as Partial<GameState> & { saveVersion?: number };
  if (parsed.saveVersion === 2) return { ...fresh, ...parsed, gameVersion: fresh.gameVersion } as GameState;

  const legacyBranches = Array.isArray(parsed.branches) && parsed.branches.length
    ? parsed.branches.map((branch, index) => migrateBranch(branch, index))
    : fresh.branches;
  return {
    ...fresh,
    bankName: parsed.bankName ?? fresh.bankName,
    date: parsed.date ?? fresh.date,
    cash: parsed.cash ?? fresh.cash,
    equity: parsed.equity ?? fresh.equity,
    strategy: parsed.strategy ?? fresh.strategy,
    lendingPolicy: parsed.lendingPolicy ?? fresh.lendingPolicy,
    branches: legacyBranches,
    inbox: Array.isArray(parsed.inbox) ? [...fresh.inbox, ...parsed.inbox].slice(0, 60) : fresh.inbox,
  };
};

export const loadV1Save = (): GameState | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const saveV1Game = (state: GameState) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // A blocked browser save should never stop the simulation itself.
  }
};

export const clearV1Save = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage failures and keep the game usable.
  }
};
