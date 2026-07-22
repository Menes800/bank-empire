export type BrandTheme = "forest" | "copper" | "gold";
export type Difficulty = "relaxed" | "balanced" | "hard";
export type CurrencyCode = "NOK" | "SEK" | "DKK" | "EUR" | "GBP" | "USD" | "CHF" | "JPY";
export type HomeMarket = "NO" | "SE" | "DK" | "FI" | "DE" | "GB" | "US" | "CH" | "JP";
export type NameStyle = "local" | "international" | "mixed";
export type ProductKey = "everyday" | "savings" | "mortgage" | "sme" | "cards" | "insurance" | "wealth";
export type EventTone = "positive" | "warning" | "neutral";
export type LendingPolicy = "conservative" | "balanced" | "aggressive";
export type EconomicCycle = "boom" | "growth" | "stable" | "slowdown" | "recession";
export type CompetitorStrategy = "digital" | "premium" | "volume" | "conservative";
export type ObjectiveMetric = "customers" | "profit" | "reputation" | "capitalRatio" | "liquidityRatio" | "compliance" | "marketShare";
export type CampaignStage = "startup" | "regional" | "national" | "group" | "empire";
export type BranchProfile = "retail" | "mortgage" | "business" | "wealth";
export type BranchMandate = "manual" | "guarded" | "autonomous" | "growth";
export type BranchFocus = "service" | "deposits" | "lending" | "business";
export type BranchPriority = "balanced" | "growth" | "deposits" | "business" | "profitability";
export type UpgradeAuthority = "manual" | "small" | "profitable";
export type ProjectKind = "branch" | "branch-upgrade" | "head-office" | "mobile-bank" | "core-banking" | "integration";
export type ProjectStatus = "planned" | "active" | "delayed" | "completed";
export type ExecutiveRole = "CFO" | "COO" | "CRO" | "CMO" | "CTO";
export type AutomationMode = "manual" | "conservative" | "balanced" | "growth";
export type ManagementControlMode = "automatic" | "major" | "manual";
export type ManagementArea = "treasury" | "lending" | "marketing" | "operations";
export type EmployeeDepartment = "Executive" | "Branch Operations" | "Credit & Collections" | "Finance & Treasury" | "Customer Growth" | "Technology";
export type CustomerSegmentKey = "students" | "young" | "families" | "affluent" | "seniors" | "small-business" | "corporate" | "property";
export type ProductPreset = "competitive" | "balanced" | "premium" | "conservative";
export type LoanStatus = "performing" | "watch" | "delinquent" | "late" | "overdue" | "collections" | "defaulted" | "restructured" | "written-off";
export type CollectionStage = "early-arrears" | "workout" | "external-collections" | "enforcement" | "closed";
export type InboxUrgency = "routine" | "important" | "critical";
export type InboxStatus = "open" | "delegated" | "resolved";
export type MandatePreset = "cautious" | "balanced" | "autonomous" | "custom";

export type ExecutivePermission =
  | "hiring" | "transfers" | "retention" | "training" | "branchManagers" | "layoffs" | "localUpgrades"
  | "liquidity" | "funding" | "rates" | "capitalBuffer" | "investments"
  | "lending" | "creditTerms" | "collections" | "collateral" | "compliance" | "riskLimits"
  | "campaigns" | "marketingBudget" | "competitorResponse" | "customerSegments" | "localGrowth"
  | "cyberIncidents" | "patching" | "vendors" | "itPurchases" | "technicalDebt" | "techProjects";

export type ExecutiveMandate = {
  role: ExecutiveRole;
  preset: MandatePreset;
  permissions: ExecutivePermission[];
  spendLimit: number;
  riskLimit: number;
  alwaysEscalate: string[];
};

export type ManagementLogEntry = {
  id: string;
  day: number;
  role: ExecutiveRole;
  title: string;
  detail: string;
  amount?: number;
  outcome: "completed" | "reported" | "escalated";
};

export type GameEvent = { id: string; day: number; tone: EventTone; title: string; body: string };
export type HistoryPoint = { day: number; cash: number; deposits: number; loans: number; profit: number; customers: number; reputation: number; sharePrice: number };
export type Competitor = { id: string; name: string; strategy: CompetitorStrategy; customers: number; deposits: number; loans: number; reputation: number; marketShare: number; depositRate: number; loanRate: number; branches: number; digitalLevel: number; acquisitionPrice: number };
export type BoardObjective = { id: string; title: string; description: string; metric: ObjectiveMetric; target: number; deadlineDay: number; rewardCash: number; rewardReputation: number; completed: boolean; failed: boolean };

export type DecisionEffect = Partial<Pick<GameState, "cash" | "deposits" | "loans" | "reputation" | "satisfaction" | "customers" | "employees" | "compliance" | "digitalLevel" | "cyberSecurity" | "boardConfidence" | "brandStrength" | "fraudLosses">>;
export type DecisionChoice = { id: string; label: string; description: string; effect: DecisionEffect };
export type DecisionEvent = { id: string; title: string; description: string; category: "customer" | "regulatory" | "technology" | "people" | "market"; choices: DecisionChoice[] };
export type ServiceIntervention = { kind: "team-reassignment"; startDay: number; endDay: number };

export type LoanApplication = { id: string; customerName: string; segment: "Mortgage" | "SME" | "Commercial property"; amount: number; rate: number; riskGrade: "A" | "B" | "C" | "D"; defaultChance: number; collateral: number };

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
  managerMandate?: BranchMandate;
  localFocus?: BranchFocus;
  managerBudget?: number;
  managerControl?: boolean;
  operatingPriority?: BranchPriority;
  upgradeAuthority?: UpgradeAuthority;
  pendingUpgradeRecommendation?: boolean;
  localCustomers?: number;
  localDeposits?: number;
  localLoans?: number;
  lastMonthRevenue?: number;
  lastMonthCost?: number;
  lastMonthProfit?: number;
  lifetimeProfit?: number;
  lastManagerAction?: string;
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

export type EmployeeDecisionRecord = {
  day: number;
  title: string;
  outcome: string;
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
  department?: EmployeeDepartment;
  reportsTo?: string | null;
  performance?: number;
  workload?: number;
  wellbeing?: number;
  potential?: number;
  tenureMonths?: number;
  nationality?: string;
  leadershipStyle?: string;
  strengths?: string[];
  weaknesses?: string[];
  workHistory?: string[];
  ceoRelationship?: number;
  boardRelationship?: number;
  peerRelationship?: number;
  quitRisk?: number;
  ambition?: number;
  strategyOpinion?: string;
  decisionHistory?: EmployeeDecisionRecord[];
  availableUntilDay?: number;
};

export type AutomationPlan = { treasury: AutomationMode; lending: AutomationMode; marketing: AutomationMode; operations: AutomationMode };
export type ManagementControlPlan = Record<ManagementArea, ManagementControlMode>;
export type CustomerSegment = { key: CustomerSegmentKey; name: string; customers: number; satisfaction: number; loyalty: number; profitability: number; churnRisk: number; preferredChannel: "branch" | "digital" | "advisor" };
export type ProductTerms = { key: ProductKey; customerRate: number; monthlyFee: number; approvalThreshold: number; serviceLevel: number; marketingBudget: number };

export type ActiveLoan = {
  id: string;
  customerName: string;
  segment: string;
  principal: number;
  outstanding: number;
  rate: number;
  riskGrade: "A" | "B" | "C" | "D";
  collateral: number;
  status: LoanStatus;
  daysPastDue: number;
  originatedDay: number;
  nextPaymentDay: number;
  missedPayments?: number;
  lastPaymentDay?: number;
  recoveryEstimate?: number;
};

export type CollectionCase = {
  id: string;
  loanId: string;
  customerName: string;
  openedDay: number;
  stage: CollectionStage;
  daysPastDue: number;
  missedAmount: number;
  expectedRecovery: number;
  agencyCost: number;
  assignedTo: string;
  lastAction: string;
  closed: boolean;
};

export type CEOInboxTask = {
  id: string;
  createdDay: number;
  category: "network" | "credit" | "people" | "market" | "risk" | "project";
  title: string;
  summary: string;
  urgency: InboxUrgency;
  page: string;
  status: InboxStatus;
  ownerRole?: ExecutiveRole;
  sourceId?: string;
  decision?: DecisionEvent;
};

export type CompetitorMove = {
  id: string;
  day: number;
  competitorId: string;
  competitorName: string;
  type: "pricing" | "branch" | "digital" | "talent";
  title: string;
  description: string;
  impact: number;
};

export type BoardMember = { id: string; name: string; archetype: string; priority: "growth" | "risk" | "customers" | "profit" | "technology"; support: number; influence: number };
export type FinancialReport = { id: string; day: number; year: number; quarter: number; interestIncome: number; feeIncome: number; operatingExpenses: number; creditLosses: number; netIncome: number; assets: number; liabilities: number; equity: number; operatingCashFlow: number; budgetVariance: number };
export type TutorialStep = { id: string; title: string; description: string; completed: boolean; page: string };

export type CashFlowSnapshot = {
  day: number;
  openingCash: number;
  depositInflows: number;
  customerWithdrawals: number;
  loanRepayments: number;
  newLending: number;
  operatingProfit: number;
  fundingChange: number;
  otherMovements: number;
  closingCash: number;
};

export type CampaignInput = {
  founderName: string;
  bankName: string;
  bankLogo?: string;
  background: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
  currency: CurrencyCode;
  homeMarket: HomeMarket;
  locale: string;
  nameStyle: NameStyle;
  slogan: string;
  firstBranchName: string;
  founderStory: string;
  worldSeed: number;
};

export type GameState = {
  version: 88;
  setupComplete: boolean;
  founderName: string;
  background: string;
  bankName: string;
  bankMark: string;
  slogan: string;
  firstBranchName: string;
  founderStory: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
  currency: CurrencyCode;
  homeMarket: HomeMarket;
  locale: string;
  nameStyle: NameStyle;
  worldSeed: number;
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
  serviceIntervention: ServiceIntervention | null;
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
  strategyReviewDay: number;
  districts: District[];
  branchOffices: BranchOffice[];
  projects: BankProject[];
  employeeRoster: EmployeeProfile[];
  candidatePool: EmployeeProfile[];
  automation: AutomationPlan;
  managementControl: ManagementControlPlan;
  executiveMandates: Record<ExecutiveRole, ExecutiveMandate>;
  managementLog: ManagementLogEntry[];
  customerSegments: CustomerSegment[];
  productTerms: Record<ProductKey, ProductTerms>;
  activeLoans: ActiveLoan[];
  collectionCases: CollectionCase[];
  ceoInbox: CEOInboxTask[];
  competitorMoves: CompetitorMove[];
  boardMembers: BoardMember[];
  reports: FinancialReport[];
  tutorialSteps: TutorialStep[];
  dismissedAdvisorIds: string[];
  monthlyBudget: number;
  cashFlowHistory: CashFlowSnapshot[];
  devModeUsed: boolean;
  bankruptcyProtection: boolean;
};
