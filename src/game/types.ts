export type BrandTheme = "forest" | "copper" | "gold";
export type Difficulty = "relaxed" | "balanced" | "hard";
export type ProductKey =
  | "everyday"
  | "savings"
  | "mortgage"
  | "sme"
  | "cards"
  | "insurance"
  | "wealth";
export type EventTone = "positive" | "warning" | "neutral";
export type LendingPolicy = "conservative" | "balanced" | "aggressive";
export type EconomicCycle = "boom" | "growth" | "stable" | "slowdown" | "recession";
export type CompetitorStrategy = "digital" | "premium" | "volume" | "conservative";
export type ObjectiveMetric =
  | "customers"
  | "profit"
  | "reputation"
  | "capitalRatio"
  | "liquidityRatio"
  | "compliance"
  | "marketShare";

export type CampaignStage = "startup" | "regional" | "national" | "group" | "empire";
export type BranchProfile = "retail" | "mortgage" | "business" | "wealth";
export type ProjectKind =
  | "branch"
  | "branch-upgrade"
  | "head-office"
  | "mobile-bank"
  | "core-banking"
  | "integration";
export type ProjectStatus = "planned" | "active" | "delayed" | "completed";
export type ExecutiveRole = "CFO" | "COO" | "CRO" | "CMO" | "CTO";
export type AutomationMode = "manual" | "conservative" | "balanced" | "growth";
export type CustomerSegmentKey =
  | "students"
  | "young"
  | "families"
  | "affluent"
  | "seniors"
  | "small-business"
  | "corporate"
  | "property";

export type GameEvent = {
  id: string;
  day: number;
  tone: EventTone;
  title: string;
  body: string;
};

export type HistoryPoint = {
  day: number;
  cash: number;
  deposits: number;
  loans: number;
  profit: number;
  customers: number;
  reputation: number;
  sharePrice: number;
};

export type Competitor = {
  id: string;
  name: string;
  strategy: CompetitorStrategy;
  customers: number;
  deposits: number;
  loans: number;
  reputation: number;
  marketShare: number;
  depositRate: number;
  loanRate: number;
  branches: number;
  digitalLevel: number;
  acquisitionPrice: number;
};

export type BoardObjective = {
  id: string;
  title: string;
  description: string;
  metric: ObjectiveMetric;
  target: number;
  deadlineDay: number;
  rewardCash: number;
  rewardReputation: number;
  completed: boolean;
  failed: boolean;
};

export type DecisionEffect = Partial<
  Pick<
    GameState,
    | "cash"
    | "deposits"
    | "loans"
    | "reputation"
    | "satisfaction"
    | "customers"
    | "employees"
    | "compliance"
    | "digitalLevel"
    | "cyberSecurity"
    | "boardConfidence"
    | "brandStrength"
    | "fraudLosses"
  >
>;

export type DecisionChoice = {
  id: string;
  label: string;
  description: string;
  effect: DecisionEffect;
};

export type DecisionEvent = {
  id: string;
  title: string;
  description: string;
  category: "customer" | "regulatory" | "technology" | "people" | "market";
  choices: DecisionChoice[];
};

export type LoanApplication = {
  id: string;
  customerName: string;
  segment: "Mortgage" | "SME" | "Commercial property";
  amount: number;
  rate: number;
  riskGrade: "A" | "B" | "C" | "D";
  defaultChance: number;
  collateral: number;
};

export type District = {
  id: string;
  name: string;
  description: string;
  population: number;
  incomeIndex: number;
  competition: number;
  digitalAffinity: number;
  retailDemand: number;
  mortgageDemand: number;
  businessDemand: number;
  wealthDemand: number;
  openingCost: number;
  monthlyRent: number;
  requiredStage: CampaignStage;
  mapX: number;
  mapY: number;
};

export type BranchOffice = {
  id: string;
  districtId: string;
  name: string;
  level: 1 | 2 | 3;
  profile: BranchProfile;
  capacity: number;
  staffSlots: number;
  monthlyRent: number;
  satisfaction: number;
  openedDay: number;
  managerId: string | null;
};

export type BankProject = {
  id: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  startDay: number;
  durationDays: number;
  remainingDays: number;
  budget: number;
  spent: number;
  risk: number;
  districtId?: string;
  branchId?: string;
  profile?: BranchProfile;
};

export type EmployeeProfile = {
  id: string;
  name: string;
  role: string;
  executiveRole: ExecutiveRole | null;
  salary: number;
  skill: number;
  leadership: number;
  loyalty: number;
  energy: number;
  trait: string;
  assignedBranchId: string | null;
};

export type AutomationPlan = {
  treasury: AutomationMode;
  lending: AutomationMode;
  marketing: AutomationMode;
  operations: AutomationMode;
};

export type CustomerSegment = {
  key: CustomerSegmentKey;
  name: string;
  customers: number;
  satisfaction: number;
  loyalty: number;
  profitability: number;
  churnRisk: number;
  preferredChannel: "branch" | "digital" | "advisor";
};

export type ProductTerms = {
  key: ProductKey;
  customerRate: number;
  monthlyFee: number;
  approvalThreshold: number;
  serviceLevel: number;
  marketingBudget: number;
};

export type ActiveLoan = {
  id: string;
  customerName: string;
  segment: string;
  principal: number;
  outstanding: number;
  rate: number;
  riskGrade: "A" | "B" | "C" | "D";
  collateral: number;
  status: "performing" | "watch" | "delinquent" | "defaulted" | "restructured";
  daysPastDue: number;
  originatedDay: number;
  nextPaymentDay: number;
};

export type BoardMember = {
  id: string;
  name: string;
  archetype: string;
  priority: "growth" | "risk" | "customers" | "profit" | "technology";
  support: number;
  influence: number;
};

export type FinancialReport = {
  id: string;
  day: number;
  year: number;
  quarter: number;
  interestIncome: number;
  feeIncome: number;
  operatingExpenses: number;
  creditLosses: number;
  netIncome: number;
  assets: number;
  liabilities: number;
  equity: number;
  operatingCashFlow: number;
  budgetVariance: number;
};

export type TutorialStep = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  page: string;
};

export type CampaignInput = {
  founderName: string;
  bankName: string;
  background: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
};

export type GameState = {
  version: 4;
  setupComplete: boolean;
  founderName: string;
  background: string;
  bankName: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
  day: number;
  week: number;
  quarter: number;
  year: number;
  cash: number;
  personalCash: number;
  deposits: number;
  loans: number;
  wholesaleFunding: number;
  wholesaleFundingRate: number;
  loanLossReserve: number;
  totalProfit: number;
  profit: number;
  revenue: number;
  expenses: number;
  creditLosses: number;
  reputation: number;
  satisfaction: number;
  brandStrength: number;
  boardConfidence: number;
  customers: number;
  customersGained: number;
  customersLost: number;
  employees: number;
  branches: number;
  digitalLevel: number;
  cyberSecurity: number;
  fraudLosses: number;
  depositRate: number;
  loanRate: number;
  lendingPolicy: LendingPolicy;
  capitalRatio: number;
  liquidityRatio: number;
  compliance: number;
  riskScore: number;
  nplRatio: number;
  bankRunRisk: number;
  capitalBreachDays: number;
  liquidityBreachDays: number;
  marketShare: number;
  sharePrice: number;
  educationLevel: number;
  careerLevel: number;
  skillPoints: number;
  products: ProductKey[];
  baseRate: number;
  inflation: number;
  unemployment: number;
  consumerConfidence: number;
  gdpGrowth: number;
  economicCycle: EconomicCycle;
  competitors: Competitor[];
  objectives: BoardObjective[];
  pendingDecision: DecisionEvent | null;
  loanApplications: LoanApplication[];
  history: HistoryPoint[];
  achievements: string[];
  events: GameEvent[];
  gameOverReason: string | null;

  campaignStage: CampaignStage;
  campaignXp: number;
  strategicFocus: "balanced" | "growth" | "efficiency" | "trust" | "digital";
  districts: District[];
  branchOffices: BranchOffice[];
  projects: BankProject[];
  employeeRoster: EmployeeProfile[];
  candidatePool: EmployeeProfile[];
  automation: AutomationPlan;
  customerSegments: CustomerSegment[];
  productTerms: Record<ProductKey, ProductTerms>;
  activeLoans: ActiveLoan[];
  boardMembers: BoardMember[];
  reports: FinancialReport[];
  tutorialSteps: TutorialStep[];
  dismissedAdvisorIds: string[];
  monthlyBudget: number;
};
