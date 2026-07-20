import type {
  BankStrategy,
  BranchMandate,
  BranchMarket,
  CampaignKind,
  CountryCode,
  EmployeeRole,
  ExecutiveRole,
  LendingPolicy,
  ProductId,
  StaffingPolicy,
  TechnologyId,
} from './types';

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  'branch-manager': 'Filialleder',
  'lending-advisor': 'Lånerådgiver',
  'customer-advisor': 'Kunderådgiver',
  'business-advisor': 'Bedriftsrådgiver',
  'wealth-advisor': 'Formuesrådgiver',
  'operations-specialist': 'Driftsspesialist',
};

export const STRATEGY_LABELS: Record<BankStrategy, string> = {
  balanced: 'Balansert universalbank',
  mortgages: 'Boliglån og familier',
  'small-business': 'Små og mellomstore bedrifter',
  service: 'Personlig rådgivning',
  digital: 'Digital lavkostbank',
  wealth: 'Formue og premiumkunder',
};

export const STRATEGY_DESCRIPTIONS: Record<BankStrategy, string> = {
  balanced: 'Jevn vekst på tvers av privatkunder, bedrifter og innskudd.',
  mortgages: 'Flere boliglån og familiekunder, men større press på lånerådgiverne.',
  'small-business': 'Færre, større saker med høyere margin og mer risikoarbeid.',
  service: 'Sterkere lojalitet og omdømme gjennom høy lokal kapasitet.',
  digital: 'Lavere kostnader og raskere behandling, men svakere lokal relasjon.',
  wealth: 'Høyere inntekt per kunde og større krav til dyktige rådgivere.',
};

export const LENDING_POLICY_LABELS: Record<LendingPolicy, string> = {
  cautious: 'Forsiktig',
  balanced: 'Balansert',
  growth: 'Vekstorientert',
};

export const LENDING_POLICY_DESCRIPTIONS: Record<LendingPolicy, string> = {
  cautious: 'Lavere tap og færre godkjente lån. Passer når kapitalen er presset.',
  balanced: 'Normal balanse mellom vekst, margin og kredittrisiko.',
  growth: 'Flere lån og raskere vekst, men høyere tapskostnader.',
};

export const BRANCH_MANDATE_LABELS: Record<BranchMandate, string> = {
  profit: 'Lønnsomhet først',
  balanced: 'Balansert drift',
  growth: 'Lokal vekst',
  service: 'Beste kundeopplevelse',
};

export const BRANCH_MANDATE_DESCRIPTIONS: Record<BranchMandate, string> = {
  profit: 'Lederen prioriterer kostnadskontroll og stabilt overskudd.',
  balanced: 'Lederen balanserer vekst, service og resultat.',
  growth: 'Lederen bygger kundebase og tåler høyere kostnader en periode.',
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

export const COUNTRY_LABELS: Record<CountryCode, string> = {
  NO: 'Norge',
  SE: 'Sverige',
  DK: 'Danmark',
  DE: 'Tyskland',
  GB: 'Storbritannia',
  US: 'USA',
  SG: 'Singapore',
};

export interface CountryDefinition {
  code: CountryCode;
  currency: string;
  entryCost: number;
  requiredEquity: number;
  requiredReputation: number;
  demand: number;
  operatingCost: number;
  regulation: number;
  description: string;
}

export const COUNTRY_DEFINITIONS: CountryDefinition[] = [
  { code: 'NO', currency: 'NOK', entryCost: 0, requiredEquity: 0, requiredReputation: 0, demand: 1, operatingCost: 1, regulation: 1, description: 'Hjemmemarkedet. Stabilt, digitalt og konkurranseutsatt.' },
  { code: 'SE', currency: 'SEK', entryCost: 8_000_000, requiredEquity: 18_000_000, requiredReputation: 54, demand: 1.06, operatingCost: 0.96, regulation: 1.02, description: 'Liknende marked med sterk digital bruk og høy konkurranse.' },
  { code: 'DK', currency: 'DKK', entryCost: 10_000_000, requiredEquity: 25_000_000, requiredReputation: 57, demand: 1.02, operatingCost: 1.04, regulation: 1.04, description: 'Velstående kunder, sterke boliglånsmiljøer og høye servicekrav.' },
  { code: 'DE', currency: 'EUR', entryCost: 22_000_000, requiredEquity: 55_000_000, requiredReputation: 62, demand: 1.18, operatingCost: 1.08, regulation: 1.14, description: 'Stort marked med konservative kunder og tung regulering.' },
  { code: 'GB', currency: 'GBP', entryCost: 28_000_000, requiredEquity: 80_000_000, requiredReputation: 66, demand: 1.25, operatingCost: 1.22, regulation: 1.12, description: 'Høye marginer, rask konkurranse og krevende storbykunder.' },
  { code: 'US', currency: 'USD', entryCost: 70_000_000, requiredEquity: 180_000_000, requiredReputation: 72, demand: 1.52, operatingCost: 1.38, regulation: 1.24, description: 'Enormt potensial, aggressiv konkurranse og store kapitalkrav.' },
  { code: 'SG', currency: 'SGD', entryCost: 55_000_000, requiredEquity: 140_000_000, requiredReputation: 70, demand: 1.34, operatingCost: 1.28, regulation: 1.2, description: 'Internasjonal finanshub med premium- og bedriftskunder.' },
];

export interface ExpansionOpportunity {
  id: string;
  branchId: string;
  name: string;
  city: string;
  country: CountryCode;
  market: BranchMarket;
  openingCost: number;
  description: string;
  strength: string;
  baseCustomers: number;
  baseLoanBook: number;
  baseDeposits: number;
}

export const EXPANSION_OPPORTUNITIES: ExpansionOpportunity[] = [
  { id: 'nydalen', branchId: 'branch-nydalen', name: 'Nydalen', city: 'Oslo', country: 'NO', market: 'business', openingCost: 2_200_000, description: 'Næringsområde med mange vekstbedrifter og høy konkurranse.', strength: 'Lokale bedrifter', baseCustomers: 380, baseLoanBook: 78_000_000, baseDeposits: 44_000_000 },
  { id: 'lillestrom', branchId: 'branch-lillestrom', name: 'Lillestrøm', city: 'Lillestrøm', country: 'NO', market: 'mixed', openingCost: 1_800_000, description: 'Pendlere, familier og mindre bedrifter i rask vekst.', strength: 'Bred kundemiks', baseCustomers: 420, baseLoanBook: 70_000_000, baseDeposits: 48_000_000 },
  { id: 'majorstuen', branchId: 'branch-majorstuen', name: 'Majorstuen', city: 'Oslo', country: 'NO', market: 'wealth', openingCost: 2_600_000, description: 'Kjøpesterke privatkunder og høye boligverdier.', strength: 'Premium og bolig', baseCustomers: 360, baseLoanBook: 92_000_000, baseDeposits: 66_000_000 },
  { id: 'stockholm', branchId: 'branch-stockholm', name: 'Stockholm City', city: 'Stockholm', country: 'SE', market: 'mixed', openingCost: 7_500_000, description: 'Digitalt modent storbymarked med sterke konkurrenter.', strength: 'Digital vekst', baseCustomers: 520, baseLoanBook: 130_000_000, baseDeposits: 88_000_000 },
  { id: 'gothenburg', branchId: 'branch-gothenburg', name: 'Göteborg', city: 'Göteborg', country: 'SE', market: 'business', openingCost: 6_200_000, description: 'Industri, logistikk og familieeide bedrifter.', strength: 'Bedriftsbank', baseCustomers: 450, baseLoanBook: 118_000_000, baseDeposits: 74_000_000 },
  { id: 'copenhagen', branchId: 'branch-copenhagen', name: 'København', city: 'København', country: 'DK', market: 'wealth', openingCost: 9_500_000, description: 'Velstående kunder og høy betalingsvilje for god rådgivning.', strength: 'Formue', baseCustomers: 460, baseLoanBook: 145_000_000, baseDeposits: 116_000_000 },
  { id: 'hamburg', branchId: 'branch-hamburg', name: 'Hamburg', city: 'Hamburg', country: 'DE', market: 'business', openingCost: 17_000_000, description: 'Handel, logistikk og mellomstore selskaper.', strength: 'SMB og handel', baseCustomers: 690, baseLoanBook: 220_000_000, baseDeposits: 150_000_000 },
  { id: 'berlin', branchId: 'branch-berlin', name: 'Berlin', city: 'Berlin', country: 'DE', market: 'mixed', openingCost: 18_500_000, description: 'Ung befolkning, oppstartsbedrifter og prisfølsomme kunder.', strength: 'Vekstmarked', baseCustomers: 760, baseLoanBook: 205_000_000, baseDeposits: 138_000_000 },
  { id: 'london', branchId: 'branch-london', name: 'London', city: 'London', country: 'GB', market: 'wealth', openingCost: 29_000_000, description: 'Global finansby med ekstrem konkurranse og store kundeverdier.', strength: 'Premium og internasjonalt', baseCustomers: 850, baseLoanBook: 390_000_000, baseDeposits: 330_000_000 },
  { id: 'manchester', branchId: 'branch-manchester', name: 'Manchester', city: 'Manchester', country: 'GB', market: 'mixed', openingCost: 21_000_000, description: 'Sterkt regionalt marked med familier og bedrifter.', strength: 'Regional universalbank', baseCustomers: 900, baseLoanBook: 310_000_000, baseDeposits: 210_000_000 },
  { id: 'new-york', branchId: 'branch-new-york', name: 'New York', city: 'New York', country: 'US', market: 'wealth', openingCost: 75_000_000, description: 'Verdens største finansmarked med brutal konkurranse.', strength: 'Formue og bedrift', baseCustomers: 1_350, baseLoanBook: 820_000_000, baseDeposits: 720_000_000 },
  { id: 'austin', branchId: 'branch-austin', name: 'Austin', city: 'Austin', country: 'US', market: 'business', openingCost: 48_000_000, description: 'Teknologi, gründere og rask befolkningsvekst.', strength: 'Teknologi og SMB', baseCustomers: 1_100, baseLoanBook: 560_000_000, baseDeposits: 360_000_000 },
  { id: 'singapore', branchId: 'branch-singapore', name: 'Singapore', city: 'Singapore', country: 'SG', market: 'wealth', openingCost: 58_000_000, description: 'Asiatisk finanshub for formue og internasjonale selskaper.', strength: 'Internasjonal formue', baseCustomers: 980, baseLoanBook: 610_000_000, baseDeposits: 760_000_000 },
];

export interface ProductDefinition {
  id: ProductId;
  name: string;
  description: string;
  unlockEquity: number;
  defaultPrice: number;
  defaultMargin: number;
}

export const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { id: 'mortgage', name: 'Boliglån', description: 'Kjernen i privatmarkedet. Stabil inntekt over lang tid.', unlockEquity: 0, defaultPrice: 4.9, defaultMargin: 1.85 },
  { id: 'savings', name: 'Sparing og innskudd', description: 'Bygger stabil finansiering og kundelojalitet.', unlockEquity: 0, defaultPrice: 3.2, defaultMargin: 0.7 },
  { id: 'cards', name: 'Kort og dagligbank', description: 'Lave beløp per kunde, men viktig for hovedbankrelasjonen.', unlockEquity: 0, defaultPrice: 39, defaultMargin: 0.6 },
  { id: 'personal-loan', name: 'Forbrukslån', description: 'Høy margin og høyere risiko. Krever god kredittmotor.', unlockEquity: 20_000_000, defaultPrice: 11.5, defaultMargin: 5.2 },
  { id: 'sme-loan', name: 'Bedriftslån', description: 'Større saker og gode marginer, men mer rådgivning.', unlockEquity: 14_000_000, defaultPrice: 6.8, defaultMargin: 2.7 },
  { id: 'wealth', name: 'Formuesforvaltning', description: 'Premiumtjenester med høy inntekt per kunde.', unlockEquity: 45_000_000, defaultPrice: 0.9, defaultMargin: 0.9 },
];

export const PRODUCT_LABELS = Object.fromEntries(PRODUCT_DEFINITIONS.map((item) => [item.id, item.name])) as Record<ProductId, string>;

export interface ExecutiveDefinition {
  role: ExecutiveRole;
  title: string;
  name: string;
  skill: number;
  monthlySalary: number;
  signingCost: number;
  description: string;
}

export const EXECUTIVE_DEFINITIONS: ExecutiveDefinition[] = [
  { role: 'COO', title: 'Driftsdirektør', name: 'Sofie Lind', skill: 74, monthlySalary: 155_000, signingCost: 620_000, description: 'Bedre filialdrift, kapasitet og lokale ansettelser.' },
  { role: 'CFO', title: 'Finansdirektør', name: 'Martin Aas', skill: 77, monthlySalary: 170_000, signingCost: 680_000, description: 'Bedre kapitalstyring og lavere finansieringskostnad.' },
  { role: 'CRO', title: 'Risikodirektør', name: 'Amira Khan', skill: 79, monthlySalary: 175_000, signingCost: 700_000, description: 'Lavere kredittap og sterkere regulatorisk kontroll.' },
  { role: 'CMO', title: 'Markedsdirektør', name: 'Lucas Bergström', skill: 72, monthlySalary: 145_000, signingCost: 580_000, description: 'Mer effektive kampanjer og sterkere merkevare.' },
  { role: 'CTO', title: 'Teknologidirektør', name: 'Maya Chen', skill: 82, monthlySalary: 185_000, signingCost: 740_000, description: 'Raskere teknologiutvikling og lavere driftskostnad.' },
  { role: 'CHRO', title: 'HR-direktør', name: 'Emil Novak', skill: 73, monthlySalary: 148_000, signingCost: 590_000, description: 'Bedre trivsel, rekruttering og kompetanseutvikling.' },
];

export interface TechnologyDefinition {
  id: TechnologyId;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
}

export const TECHNOLOGY_DEFINITIONS: TechnologyDefinition[] = [
  { id: 'core-banking', name: 'Kjernebank', description: 'Reduserer driftskostnader og gjør internasjonal skalering tryggere.', baseCost: 1_800_000, maxLevel: 5 },
  { id: 'credit-engine', name: 'Kredittmotor', description: 'Øker behandlingskapasitet og reduserer feil i utlån.', baseCost: 1_500_000, maxLevel: 5 },
  { id: 'crm', name: 'Kunderelasjonssystem', description: 'Bedre konvertering, service og kryssalg.', baseCost: 1_200_000, maxLevel: 5 },
  { id: 'mobile-bank', name: 'Mobilbank', description: 'Øker digital vekst og reduserer press på filialene.', baseCost: 1_600_000, maxLevel: 5 },
  { id: 'fraud', name: 'Svindelvern', description: 'Reduserer operasjonelle tap og styrker tillit.', baseCost: 1_400_000, maxLevel: 5 },
  { id: 'analytics', name: 'Analyseplattform', description: 'Bedre prising, markedsføring og ledelsesrapportering.', baseCost: 1_700_000, maxLevel: 5 },
];

export const CAMPAIGN_LABELS: Record<CampaignKind, string> = {
  brand: 'Merkevarekampanje',
  mortgage: 'Boliglånskampanje',
  business: 'Bedriftskampanje',
  savings: 'Innskuddskampanje',
  wealth: 'Premiumkampanje',
};

export const CAMPAIGN_DESCRIPTIONS: Record<CampaignKind, string> = {
  brand: 'Bygger kjennskap og omdømme på tvers av produkter.',
  mortgage: 'Skaper flere boliglånshenvendelser.',
  business: 'Trekker inn lokale bedrifter og større lånesaker.',
  savings: 'Øker innskudd og stabil finansiering.',
  wealth: 'Tiltrekker formuende kunder med høy verdi.',
};

export const FIRST_NAMES = [
  'Nora', 'Aksel', 'Mina', 'Henrik', 'Selma', 'Jonas', 'Emma', 'Oskar', 'Leah', 'Sander',
  'Thea', 'Noah', 'Ingrid', 'Marius', 'Ida', 'Elias', 'Freja', 'William', 'Maya', 'Lucas',
  'Amira', 'Oliver', 'Sofia', 'Liam', 'Ava', 'Mateo', 'Hana', 'Kai', 'Elena', 'Theo',
];

export const LAST_NAMES = [
  'Hansen', 'Nilsen', 'Berg', 'Larsen', 'Solberg', 'Dahl', 'Johansen', 'Moen', 'Lind', 'Khan',
  'Chen', 'Novak', 'Smith', 'Müller', 'Andersson', 'Jensen', 'Brown', 'Wilson', 'Tan', 'Lee',
];

export const formatMonthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
