export type BankStrategy = 'balanced' | 'mortgages' | 'small-business' | 'service';
export type LendingPolicy = 'cautious' | 'balanced' | 'growth';
export type BranchMandate = 'profit' | 'balanced' | 'growth' | 'service';
export type StaffingPolicy = 'lean' | 'balanced' | 'growth';
export type BranchMarket = 'residential' | 'mixed' | 'business';
export type EmployeeRole = 'branch-manager' | 'lending-advisor' | 'customer-advisor';
export type InboxKind = 'report' | 'decision' | 'warning';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  skill: number;
  morale: number;
  monthlySalary: number;
}

export interface LoanApplication {
  id: string;
  customerName: string;
  amount: number;
  risk: number;
  waitingMonths: number;
}

export interface BranchMonthReport {
  monthKey: string;
  applicationsReceived: number;
  applicationsProcessed: number;
  loansApproved: number;
  newCustomers: number;
  revenue: number;
  expenses: number;
  profit: number;
  queueEnd: number;
  managerActions: string[];
}

export interface Branch {
  id: string;
  name: string;
  market: BranchMarket;
  mandate: BranchMandate;
  staffingPolicy: StaffingPolicy;
  reputation: number;
  customers: number;
  deposits: number;
  loanBook: number;
  rentMonthly: number;
  localMarketingBudget: number;
  employees: Employee[];
  loanQueue: LoanApplication[];
  reports: BranchMonthReport[];
}

export interface InboxItem {
  id: string;
  monthKey: string;
  kind: InboxKind;
  title: string;
  body: string;
  branchId?: string;
  read: boolean;
}

export interface GameDate {
  year: number;
  month: number;
}

export interface GameState {
  saveVersion: 1;
  gameVersion: string;
  bankName: string;
  date: GameDate;
  cash: number;
  equity: number;
  strategy: BankStrategy;
  lendingPolicy: LendingPolicy;
  branches: Branch[];
  inbox: InboxItem[];
}