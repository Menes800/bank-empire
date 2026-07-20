export type BankStrategy = 'balanced' | 'mortgages' | 'small-business' | 'service' | 'digital' | 'wealth';
export type LendingPolicy = 'cautious' | 'balanced' | 'growth';
export type BranchMandate = 'profit' | 'balanced' | 'growth' | 'service';
export type StaffingPolicy = 'lean' | 'balanced' | 'growth';
export type BranchMarket = 'residential' | 'mixed' | 'business' | 'wealth';
export type CountryCode = 'NO' | 'SE' | 'DK' | 'DE' | 'GB' | 'US' | 'SG';
export type EmployeeRole =
  | 'branch-manager'
  | 'lending-advisor'
  | 'customer-advisor'
  | 'business-advisor'
  | 'wealth-advisor'
  | 'operations-specialist';
export type ExecutiveRole = 'COO' | 'CFO' | 'CRO' | 'CMO' | 'CTO' | 'CHRO';
export type ProductId = 'mortgage' | 'savings' | 'cards' | 'personal-loan' | 'sme-loan' | 'wealth';
export type TechnologyId = 'core-banking' | 'credit-engine' | 'crm' | 'mobile-bank' | 'fraud' | 'analytics';
export type CampaignKind = 'brand' | 'mortgage' | 'business' | 'savings' | 'wealth';
export type CampaignScope = 'global' | CountryCode;
export type InboxKind = 'report' | 'decision' | 'warning' | 'milestone';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  skill: number;
  morale: number;
  monthlySalary: number;
  tenureMonths: number;
}

export interface LoanApplication {
  id: string;
  customerName: string;
  amount: number;
  risk: number;
  waitingMonths: number;
  segment: 'mortgage' | 'personal' | 'business';
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
  satisfaction: number;
  managerActions: string[];
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  country: CountryCode;
  market: BranchMarket;
  mandate: BranchMandate;
  staffingPolicy: StaffingPolicy;
  reputation: number;
  satisfaction: number;
  customers: number;
  deposits: number;
  loanBook: number;
  rentMonthly: number;
  localMarketingBudget: number;
  employees: Employee[];
  loanQueue: LoanApplication[];
  reports: BranchMonthReport[];
  openedMonth: string;
}

export interface ProductState {
  id: ProductId;
  enabled: boolean;
  quality: number;
  price: number;
  targetMargin: number;
  customers: number;
}

export interface Executive {
  role: ExecutiveRole;
  name: string;
  skill: number;
  monthlySalary: number;
  hired: boolean;
}

export interface TechnologyState {
  id: TechnologyId;
  level: number;
  maxLevel: number;
}

export interface MarketingCampaign {
  id: string;
  kind: CampaignKind;
  scope: CampaignScope;
  monthlyBudget: number;
  monthsRemaining: number;
  startedMonth: string;
}

export interface Competitor {
  id: string;
  name: string;
  country: CountryCode;
  strength: number;
  aggression: number;
  reputation: number;
}

export interface CountryState {
  code: CountryCode;
  unlocked: boolean;
  entered: boolean;
  awareness: number;
  regulatoryStanding: number;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
}

export interface BankMonthReport {
  monthKey: string;
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
  branches: number;
  countries: number;
  loanBook: number;
  deposits: number;
  capitalRatio: number;
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
  saveVersion: 2;
  gameVersion: string;
  bankName: string;
  date: GameDate;
  cash: number;
  equity: number;
  reputation: number;
  strategy: BankStrategy;
  lendingPolicy: LendingPolicy;
  branches: Branch[];
  products: ProductState[];
  executives: Executive[];
  technologies: TechnologyState[];
  campaigns: MarketingCampaign[];
  competitors: Competitor[];
  countries: CountryState[];
  objectives: Objective[];
  inbox: InboxItem[];
  history: BankMonthReport[];
}