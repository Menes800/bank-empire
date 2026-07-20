export type BankStrategy = 'balanced' | 'mortgages' | 'small-business' | 'service';
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
  market: 'residential' | 'mixed' | 'business';
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
  gameVersion: '1.0.0-alpha.1';
  bankName: string;
  date: GameDate;
  cash: number;
  equity: number;
  strategy: BankStrategy;
  branches: Branch[];
  inbox: InboxItem[];
}
