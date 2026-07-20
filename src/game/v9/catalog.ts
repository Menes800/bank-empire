export type TechnologyTrackV9 = "core" | "digital" | "automation" | "data" | "cyber" | "compliance" | "payments";
export type TechnologyEffectsV9 = {
  operatingCostReduction: number; digitalCapacity: number; staffEfficiency: number; creditSpeed: number; fraudReduction: number; compliance: number; cyber: number; projectSpeed: number; feeIncome: number;
};
export type TechnologyNodeV9 = {
  id: string; name: string; track: TechnologyTrackV9; tier: 1 | 2 | 3 | 4; maxLevel: 1 | 2 | 3; cost: number; durationDays: number; description: string; prerequisites: Array<{ id: string; level: number }>; effects: Partial<TechnologyEffectsV9>;
};

export const TECH_CATALOG_V9: TechnologyNodeV9[] = [
  { id: "core-ledger", name: "Core ledger modernisation", track: "core", tier: 1, maxLevel: 3, cost: 1_600_000, durationDays: 90, description: "Stabilises processing and reduces unit cost across the bank.", prerequisites: [], effects: { operatingCostReduction: 2.5, projectSpeed: 2, cyber: 1 } },
  { id: "cloud-platform", name: "Cloud operating platform", track: "core", tier: 2, maxLevel: 3, cost: 3_200_000, durationDays: 140, description: "Moves scalable workloads to a resilient shared platform.", prerequisites: [{ id: "core-ledger", level: 1 }], effects: { operatingCostReduction: 3, digitalCapacity: 6, projectSpeed: 5 } },
  { id: "processing-automation", name: "Straight-through processing", track: "core", tier: 3, maxLevel: 3, cost: 4_800_000, durationDays: 180, description: "Automates settlement, reconciliation and routine operations.", prerequisites: [{ id: "cloud-platform", level: 1 }], effects: { operatingCostReduction: 4, staffEfficiency: 5, projectSpeed: 3 } },

  { id: "mobile-banking", name: "Mobile banking platform", track: "digital", tier: 1, maxLevel: 3, cost: 1_200_000, durationDays: 75, description: "Expands digital service capacity and customer satisfaction.", prerequisites: [], effects: { digitalCapacity: 8, feeIncome: 1 } },
  { id: "online-onboarding", name: "Digital onboarding", track: "digital", tier: 2, maxLevel: 3, cost: 2_100_000, durationDays: 105, description: "Reduces onboarding time and branch workload.", prerequisites: [{ id: "mobile-banking", level: 1 }], effects: { digitalCapacity: 7, staffEfficiency: 2, compliance: 1 } },
  { id: "digital-lending", name: "Digital lending journeys", track: "digital", tier: 3, maxLevel: 3, cost: 3_600_000, durationDays: 145, description: "Speeds up lending without removing risk controls.", prerequisites: [{ id: "online-onboarding", level: 1 }], effects: { creditSpeed: 8, digitalCapacity: 5, feeIncome: 1.5 } },
  { id: "self-service", name: "Branch self-service", track: "digital", tier: 3, maxLevel: 2, cost: 2_900_000, durationDays: 120, description: "Moves routine branch traffic to assisted self-service.", prerequisites: [{ id: "mobile-banking", level: 2 }], effects: { staffEfficiency: 5, operatingCostReduction: 2, digitalCapacity: 4 } },

  { id: "document-ai", name: "Document processing AI", track: "automation", tier: 1, maxLevel: 3, cost: 1_500_000, durationDays: 85, description: "Automates document intake, classification and quality checks.", prerequisites: [], effects: { staffEfficiency: 4, creditSpeed: 3, operatingCostReduction: 1.5 } },
  { id: "service-automation", name: "Automated customer service", track: "automation", tier: 2, maxLevel: 3, cost: 2_400_000, durationDays: 110, description: "Resolves routine customer requests without manual handling.", prerequisites: [{ id: "document-ai", level: 1 }], effects: { staffEfficiency: 4, digitalCapacity: 5, operatingCostReduction: 2 } },
  { id: "credit-support", name: "Credit decision support", track: "automation", tier: 3, maxLevel: 3, cost: 4_100_000, durationDays: 160, description: "Improves credit consistency and processing speed.", prerequisites: [{ id: "document-ai", level: 2 }], effects: { creditSpeed: 8, fraudReduction: 2, compliance: 2 } },

  { id: "customer-data", name: "Customer data platform", track: "data", tier: 1, maxLevel: 3, cost: 1_800_000, durationDays: 90, description: "Creates a trusted customer and product data layer.", prerequisites: [], effects: { feeIncome: 1.5, projectSpeed: 1 } },
  { id: "pricing-analytics", name: "Pricing analytics", track: "data", tier: 2, maxLevel: 3, cost: 2_700_000, durationDays: 120, description: "Improves pricing, margin and customer targeting.", prerequisites: [{ id: "customer-data", level: 1 }], effects: { feeIncome: 2.5, operatingCostReduction: 1 } },
  { id: "risk-forecasting", name: "Risk forecasting", track: "data", tier: 3, maxLevel: 3, cost: 3_900_000, durationDays: 150, description: "Improves credit and liquidity forecasts.", prerequisites: [{ id: "customer-data", level: 2 }], effects: { fraudReduction: 2, compliance: 2, creditSpeed: 2 } },

  { id: "identity-security", name: "Identity security", track: "cyber", tier: 1, maxLevel: 3, cost: 1_300_000, durationDays: 80, description: "Protects staff and customers from account compromise.", prerequisites: [], effects: { cyber: 5, fraudReduction: 2 } },
  { id: "transaction-monitoring", name: "Real-time transaction monitoring", track: "cyber", tier: 2, maxLevel: 3, cost: 2_800_000, durationDays: 125, description: "Detects suspicious activity and fraud earlier.", prerequisites: [{ id: "identity-security", level: 1 }], effects: { cyber: 5, fraudReduction: 5, compliance: 1 } },
  { id: "incident-response", name: "Automated incident response", track: "cyber", tier: 3, maxLevel: 3, cost: 3_500_000, durationDays: 140, description: "Contains and recovers from security incidents faster.", prerequisites: [{ id: "transaction-monitoring", level: 1 }], effects: { cyber: 7, fraudReduction: 3, projectSpeed: 1 } },

  { id: "kyc-automation", name: "KYC automation", track: "compliance", tier: 1, maxLevel: 3, cost: 1_400_000, durationDays: 85, description: "Automates customer due diligence and evidence collection.", prerequisites: [], effects: { compliance: 4, staffEfficiency: 2 } },
  { id: "aml-monitoring", name: "AML monitoring", track: "compliance", tier: 2, maxLevel: 3, cost: 2_900_000, durationDays: 130, description: "Improves detection, triage and case documentation.", prerequisites: [{ id: "kyc-automation", level: 1 }], effects: { compliance: 5, fraudReduction: 3 } },
  { id: "regulatory-reporting", name: "Regulatory reporting hub", track: "compliance", tier: 3, maxLevel: 3, cost: 3_300_000, durationDays: 145, description: "Reduces reporting effort and regulatory error risk.", prerequisites: [{ id: "aml-monitoring", level: 1 }], effects: { compliance: 6, staffEfficiency: 2, operatingCostReduction: 1 } },

  { id: "cards-platform", name: "Modern cards platform", track: "payments", tier: 1, maxLevel: 3, cost: 1_700_000, durationDays: 95, description: "Expands cards capability and transaction fee income.", prerequisites: [], effects: { feeIncome: 3, digitalCapacity: 2 } },
  { id: "instant-payments", name: "Instant payments", track: "payments", tier: 2, maxLevel: 3, cost: 2_600_000, durationDays: 115, description: "Improves payment speed and service competitiveness.", prerequisites: [{ id: "cards-platform", level: 1 }], effects: { feeIncome: 2, digitalCapacity: 3, projectSpeed: 1 } },
  { id: "merchant-services", name: "Merchant services", track: "payments", tier: 3, maxLevel: 3, cost: 4_200_000, durationDays: 155, description: "Builds a scalable SME payments revenue stream.", prerequisites: [{ id: "instant-payments", level: 1 }], effects: { feeIncome: 5, digitalCapacity: 2 } },
];
