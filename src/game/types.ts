export type BrandTheme = 'forest' | 'copper' | 'gold';
export type Difficulty = 'relaxed' | 'balanced' | 'hard';
export type ProductKey = 'everyday' | 'savings' | 'mortgage' | 'sme';
export type EventTone = 'positive' | 'warning' | 'neutral';

export type GameEvent = {
  id: string;
  day: number;
  tone: EventTone;
  title: string;
  body: string;
};

export type CampaignInput = {
  founderName: string;
  bankName: string;
  background: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
};

export type GameState = {
  version: 2;
  setupComplete: boolean;
  founderName: string;
  background: string;
  bankName: string;
  brandTheme: BrandTheme;
  difficulty: Difficulty;
  day: number;
  year: number;
  cash: number;
  personalCash: number;
  deposits: number;
  loans: number;
  profit: number;
  revenue: number;
  expenses: number;
  reputation: number;
  satisfaction: number;
  customers: number;
  employees: number;
  branches: number;
  depositRate: number;
  loanRate: number;
  capitalRatio: number;
  liquidityRatio: number;
  compliance: number;
  riskScore: number;
  marketShare: number;
  sharePrice: number;
  educationLevel: number;
  careerLevel: number;
  skillPoints: number;
  products: ProductKey[];
  events: GameEvent[];
};
