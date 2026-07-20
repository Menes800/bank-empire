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
export type EconomicCycle =
  "boom" | "growth" | "stable" | "slowdown" | "recession";
export type CompetitorStrategy =
  "digital" | "premium" | "volume" | "conservative";
export type ObjectiveMetric =
  | "customers"
  | "profit"
  | "reputation"
  | "capitalRatio"
  | "liquidityRatio"
  | "compliance"
  | "marketShare";

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

export type CampaignInput = {
  founderName: string;
  bankName: string;
  background: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
};

export type GameState = {
  version: 3;
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
};
