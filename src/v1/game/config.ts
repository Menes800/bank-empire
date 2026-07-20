import type { BankStrategy, EmployeeRole } from './types';

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

export const FIRST_NAMES = [
  'Nora', 'Aksel', 'Mina', 'Henrik', 'Selma', 'Jonas', 'Emma', 'Oskar',
  'Leah', 'Sander', 'Thea', 'Noah', 'Ingrid', 'Marius', 'Ida', 'Elias',
];

export const LAST_NAMES = [
  'Hansen', 'Nilsen', 'Berg', 'Larsen', 'Solberg', 'Dahl', 'Johansen', 'Moen',
];

export const formatMonthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}`;
