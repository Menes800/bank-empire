import type {
  BankStrategy,
  BranchMandate,
  BranchMarket,
  EmployeeRole,
  LendingPolicy,
  StaffingPolicy,
} from './types';

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  'branch-manager': 'Filialleder',
  'lending-advisor': 'Lånerådgiver',
  'customer-advisor': 'Kunderådgiver',
};

export const STRATEGY_LABELS: Record<BankStrategy, string> = {
  balanced: 'Balansert lokalbank',
  mortgages: 'Boliglån og førstegangskjøpere',
  'small-business': 'Lokale bedrifter',
  service: 'Personlig rådgivning',
};

export const STRATEGY_DESCRIPTIONS: Record<BankStrategy, string> = {
  balanced: 'Rolig vekst med jevn fordeling mellom lån, innskudd og service.',
  mortgages: 'Flere boliglånshenvendelser, men større press på lånerådgiverne.',
  'small-business': 'Færre, større saker med høyere inntekt og mer risikoarbeid.',
  service: 'Bedre omdømme og kundelojalitet, men høyere bemanningsbehov.',
};

export const LENDING_POLICY_LABELS: Record<LendingPolicy, string> = {
  cautious: 'Forsiktig',
  balanced: 'Balansert',
  growth: 'Vekstorientert',
};

export const LENDING_POLICY_DESCRIPTIONS: Record<LendingPolicy, string> = {
  cautious: 'Lavere tap og færre godkjente lån. Passer når kapitalen er presset.',
  balanced: 'Normale fullmakter og en jevn balanse mellom vekst og risiko.',
  growth: 'Flere lån godkjennes, men kredittrisiko og tapskostnader øker.',
};

export const BRANCH_MANDATE_LABELS: Record<BranchMandate, string> = {
  profit: 'Lønnsomhet først',
  balanced: 'Balansert drift',
  growth: 'Lokal vekst',
  service: 'Beste kundeopplevelse',
};

export const BRANCH_MANDATE_DESCRIPTIONS: Record<BranchMandate, string> = {
  profit: 'Lederen prioriterer kostnadskontroll og roligere vekst.',
  balanced: 'Lederen balanserer vekst, service og månedlig resultat.',
  growth: 'Lederen bygger kundebase og tåler høyere kostnader i en periode.',
  service: 'Lederen prioriterer kapasitet, omdømme og personlig oppfølging.',
};

export const STAFFING_POLICY_LABELS: Record<StaffingPolicy, string> = {
  lean: 'Stram ramme',
  balanced: 'Normal fullmakt',
  growth: 'Bygg kapasitet',
};

export const STAFFING_POLICY_DESCRIPTIONS: Record<StaffingPolicy, string> = {
  lean: 'Filialleder ansetter bare når presset er tydelig og langvarig.',
  balanced: 'Lederen kan ansette når kø eller kundemengde forsvarer det.',
  growth: 'Lederen bygger kapasitet tidlig for å støtte vekst og markedsføring.',
};

export interface ExpansionOpportunity {
  id: string;
  branchId: string;
  name: string;
  market: BranchMarket;
  openingCost: number;
  description: string;
  strength: string;
}

export const EXPANSION_OPPORTUNITIES: ExpansionOpportunity[] = [
  {
    id: 'nydalen',
    branchId: 'branch-nydalen',
    name: 'Nydalen filial',
    market: 'business',
    openingCost: 2_200_000,
    description: 'Et voksende næringsområde med større bedriftslån og hard konkurranse.',
    strength: 'Lokale bedrifter',
  },
  {
    id: 'lillestrom',
    branchId: 'branch-lillestrom',
    name: 'Lillestrøm filial',
    market: 'mixed',
    openingCost: 1_800_000,
    description: 'Et blandet marked med pendlere, familier og mange mindre bedrifter.',
    strength: 'Bred kundemiks',
  },
  {
    id: 'majorstuen',
    branchId: 'branch-majorstuen',
    name: 'Majorstuen filial',
    market: 'residential',
    openingCost: 2_050_000,
    description: 'Sterkt boligmarked med høye lånebeløp og kravstore kunder.',
    strength: 'Boliglån',
  },
];

export const FIRST_NAMES = [
  'Nora', 'Aksel', 'Mina', 'Henrik', 'Selma', 'Jonas', 'Emma', 'Oskar',
  'Leah', 'Sander', 'Thea', 'Noah', 'Ingrid', 'Marius', 'Ida', 'Elias',
];

export const LAST_NAMES = [
  'Hansen', 'Nilsen', 'Berg', 'Larsen', 'Solberg', 'Dahl', 'Johansen', 'Moen',
];

export const formatMonthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}`;