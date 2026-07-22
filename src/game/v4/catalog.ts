import type {
  AutomationPlan,
  BoardMember,
  BranchOffice,
  CustomerSegment,
  District,
  EmployeeProfile,
  HomeMarket,
  ProductKey,
  ProductTerms,
  TutorialStep,
} from "../types";

export const STAGE_ORDER = ["startup", "regional", "national", "group", "empire"] as const;

type MarketKind = "metro" | "suburb" | "business" | "university" | "industrial" | "wealth" | "regional" | "coastal";
type MarketNode = { id: string; kind: MarketKind; requiredStage: District["requiredStage"]; mapX: number; mapY: number; maxBranches: number };

const MARKET_NODES: MarketNode[] = [
  { id: "harbour", kind: "metro", requiredStage: "startup", mapX: 12, mapY: 18, maxBranches: 3 },
  { id: "garden", kind: "suburb", requiredStage: "startup", mapX: 26, mapY: 24, maxBranches: 2 },
  { id: "central", kind: "business", requiredStage: "regional", mapX: 42, mapY: 15, maxBranches: 3 },
  { id: "university", kind: "university", requiredStage: "regional", mapX: 58, mapY: 24, maxBranches: 2 },
  { id: "industrial", kind: "industrial", requiredStage: "regional", mapX: 74, mapY: 16, maxBranches: 2 },
  { id: "ridge", kind: "wealth", requiredStage: "national", mapX: 88, mapY: 25, maxBranches: 2 },
  { id: "coast", kind: "coastal", requiredStage: "national", mapX: 16, mapY: 44, maxBranches: 2 },
  { id: "east-hub", kind: "regional", requiredStage: "regional", mapX: 32, mapY: 48, maxBranches: 2 },
  { id: "west-hub", kind: "regional", requiredStage: "regional", mapX: 49, mapY: 42, maxBranches: 2 },
  { id: "south-hub", kind: "suburb", requiredStage: "national", mapX: 66, mapY: 50, maxBranches: 2 },
  { id: "north-hub", kind: "industrial", requiredStage: "national", mapX: 84, mapY: 44, maxBranches: 1 },
  { id: "river-city", kind: "metro", requiredStage: "national", mapX: 10, mapY: 70, maxBranches: 2 },
  { id: "lake-city", kind: "suburb", requiredStage: "national", mapX: 25, mapY: 76, maxBranches: 1 },
  { id: "capital-south", kind: "business", requiredStage: "national", mapX: 40, mapY: 68, maxBranches: 2 },
  { id: "innovation-city", kind: "university", requiredStage: "group", mapX: 56, mapY: 78, maxBranches: 2 },
  { id: "port-city", kind: "coastal", requiredStage: "group", mapX: 72, mapY: 68, maxBranches: 2 },
  { id: "energy-city", kind: "business", requiredStage: "group", mapX: 88, mapY: 76, maxBranches: 2 },
  { id: "mountain-city", kind: "wealth", requiredStage: "group", mapX: 18, mapY: 92, maxBranches: 1 },
  { id: "midlands", kind: "regional", requiredStage: "group", mapX: 34, mapY: 91, maxBranches: 1 },
  { id: "growth-belt", kind: "industrial", requiredStage: "group", mapX: 48, mapY: 90, maxBranches: 2 },
  { id: "northern-coast", kind: "coastal", requiredStage: "empire", mapX: 62, mapY: 94, maxBranches: 1 },
  { id: "technology-belt", kind: "university", requiredStage: "empire", mapX: 74, mapY: 88, maxBranches: 2 },
  { id: "international-gateway", kind: "business", requiredStage: "empire", mapX: 86, mapY: 92, maxBranches: 3 },
  { id: "remote-region", kind: "regional", requiredStage: "empire", mapX: 94, mapY: 58, maxBranches: 1 },
];

const MARKET_NAMES: Record<HomeMarket, Array<[city: string, region: string]>> = {
  NO: [["Oslo Sentrum", "Oslo"], ["Oslo Vest", "Oslo"], ["Oslo Øst", "Oslo"], ["Bærum", "Akershus"], ["Lillestrøm", "Akershus"], ["Drammen", "Buskerud"], ["Fredrikstad", "Østfold"], ["Moss", "Østfold"], ["Hamar", "Innlandet"], ["Lillehammer", "Innlandet"], ["Gjøvik", "Innlandet"], ["Tønsberg", "Vestfold"], ["Sandefjord", "Vestfold"], ["Skien", "Telemark"], ["Kristiansand", "Agder"], ["Stavanger", "Rogaland"], ["Sandnes", "Rogaland"], ["Haugesund", "Rogaland"], ["Bergen Sentrum", "Vestland"], ["Bergen Sør", "Vestland"], ["Ålesund", "Møre og Romsdal"], ["Molde", "Møre og Romsdal"], ["Trondheim", "Trøndelag"], ["Tromsø", "Nord-Norge"]],
  SE: [["Stockholm City", "Stockholm"], ["Solna", "Stockholm"], ["Södermalm", "Stockholm"], ["Uppsala", "Svealand"], ["Västerås", "Svealand"], ["Örebro", "Svealand"], ["Linköping", "Östergötland"], ["Norrköping", "Östergötland"], ["Jönköping", "Småland"], ["Växjö", "Småland"], ["Kalmar", "Småland"], ["Malmö", "Skåne"], ["Lund", "Skåne"], ["Helsingborg", "Skåne"], ["Göteborg City", "Västra Götaland"], ["Borås", "Västra Götaland"], ["Halmstad", "Halland"], ["Karlstad", "Värmland"], ["Gävle", "Gävleborg"], ["Sundsvall", "Norrland"], ["Umeå", "Norrland"], ["Luleå", "Norrland"], ["Kiruna", "Norrland"], ["Visby", "Gotland"]],
  DK: [["København City", "Hovedstaden"], ["Frederiksberg", "Hovedstaden"], ["Ørestad", "Hovedstaden"], ["Roskilde", "Sjælland"], ["Køge", "Sjælland"], ["Næstved", "Sjælland"], ["Odense", "Fyn"], ["Svendborg", "Fyn"], ["Aarhus City", "Midtjylland"], ["Silkeborg", "Midtjylland"], ["Randers", "Midtjylland"], ["Herning", "Midtjylland"], ["Vejle", "Syddanmark"], ["Kolding", "Syddanmark"], ["Esbjerg", "Syddanmark"], ["Aalborg", "Nordjylland"], ["Hjørring", "Nordjylland"], ["Horsens", "Midtjylland"], ["Fredericia", "Syddanmark"], ["Sønderborg", "Syddanmark"], ["Holstebro", "Vestjylland"], ["Skagen", "Nordjylland"], ["Billund", "Syddanmark"], ["Bornholm", "Hovedstaden"]],
  FI: [["Helsinki Centre", "Uusimaa"], ["Espoo", "Uusimaa"], ["Vantaa", "Uusimaa"], ["Porvoo", "Uusimaa"], ["Turku", "Southwest Finland"], ["Tampere", "Pirkanmaa"], ["Lahti", "Päijät-Häme"], ["Hämeenlinna", "Kanta-Häme"], ["Pori", "Satakunta"], ["Rauma", "Satakunta"], ["Vaasa", "Ostrobothnia"], ["Seinäjoki", "Ostrobothnia"], ["Jyväskylä", "Central Finland"], ["Kuopio", "North Savo"], ["Joensuu", "North Karelia"], ["Mikkeli", "South Savo"], ["Lappeenranta", "South Karelia"], ["Kotka", "Kymenlaakso"], ["Oulu", "North Ostrobothnia"], ["Kokkola", "Central Ostrobothnia"], ["Rovaniemi", "Lapland"], ["Kajaani", "Kainuu"], ["Mariehamn", "Åland"], ["Ivalo", "Lapland"]],
  DE: [["Berlin Mitte", "Berlin"], ["Berlin West", "Berlin"], ["Potsdam", "Brandenburg"], ["Hamburg", "North"], ["Bremen", "North"], ["Hannover", "Lower Saxony"], ["Düsseldorf", "Rhine-Ruhr"], ["Köln", "Rhine-Ruhr"], ["Dortmund", "Rhine-Ruhr"], ["Essen", "Rhine-Ruhr"], ["Frankfurt", "Hesse"], ["Wiesbaden", "Hesse"], ["Stuttgart", "Baden-Württemberg"], ["Mannheim", "Baden-Württemberg"], ["Karlsruhe", "Baden-Württemberg"], ["München", "Bavaria"], ["Nürnberg", "Bavaria"], ["Augsburg", "Bavaria"], ["Leipzig", "Saxony"], ["Dresden", "Saxony"], ["Erfurt", "Thuringia"], ["Freiburg", "Southwest"], ["Rostock", "Baltic"], ["Kiel", "Schleswig-Holstein"]],
  GB: [["London City", "London"], ["West London", "London"], ["East London", "London"], ["Cambridge", "East of England"], ["Oxford", "South East"], ["Reading", "South East"], ["Bristol", "South West"], ["Cardiff", "Wales"], ["Birmingham", "West Midlands"], ["Coventry", "West Midlands"], ["Nottingham", "East Midlands"], ["Leicester", "East Midlands"], ["Manchester", "North West"], ["Liverpool", "North West"], ["Leeds", "Yorkshire"], ["Sheffield", "Yorkshire"], ["Newcastle", "North East"], ["York", "Yorkshire"], ["Edinburgh", "Scotland"], ["Glasgow", "Scotland"], ["Aberdeen", "Scotland"], ["Belfast", "Northern Ireland"], ["Southampton", "South Coast"], ["Brighton", "South Coast"]],
  US: [["New York Midtown", "Northeast"], ["Brooklyn", "Northeast"], ["Boston", "Northeast"], ["Philadelphia", "Northeast"], ["Washington D.C.", "Mid-Atlantic"], ["Miami", "Southeast"], ["Atlanta", "Southeast"], ["Charlotte", "Southeast"], ["Nashville", "Southeast"], ["Chicago", "Midwest"], ["Detroit", "Midwest"], ["Minneapolis", "Midwest"], ["Dallas", "Texas"], ["Houston", "Texas"], ["Austin", "Texas"], ["Denver", "Mountain"], ["Phoenix", "Southwest"], ["Las Vegas", "Southwest"], ["Seattle", "Pacific Northwest"], ["Portland", "Pacific Northwest"], ["San Francisco", "California"], ["San Jose", "California"], ["Los Angeles", "California"], ["San Diego", "California"]],
  CH: [["Zürich Centre", "Zürich"], ["Winterthur", "Zürich"], ["Basel", "Northwest"], ["Bern", "Mittelland"], ["Biel", "Mittelland"], ["Luzern", "Central"], ["Zug", "Central"], ["St. Gallen", "East"], ["Chur", "Graubünden"], ["Lausanne", "Vaud"], ["Geneva", "Lake Geneva"], ["Montreux", "Lake Geneva"], ["Fribourg", "West"], ["Neuchâtel", "West"], ["Sion", "Valais"], ["Lugano", "Ticino"], ["Locarno", "Ticino"], ["Thun", "Bernese Oberland"], ["Interlaken", "Bernese Oberland"], ["Aarau", "Aargau"], ["Schaffhausen", "North"], ["Solothurn", "Mittelland"], ["Davos", "Graubünden"], ["St. Moritz", "Graubünden"]],
  JP: [["Tokyo Marunouchi", "Kanto"], ["Shinjuku", "Kanto"], ["Yokohama", "Kanto"], ["Chiba", "Kanto"], ["Saitama", "Kanto"], ["Nagoya", "Chubu"], ["Shizuoka", "Chubu"], ["Kanazawa", "Hokuriku"], ["Osaka", "Kansai"], ["Kyoto", "Kansai"], ["Kobe", "Kansai"], ["Nara", "Kansai"], ["Hiroshima", "Chugoku"], ["Okayama", "Chugoku"], ["Takamatsu", "Shikoku"], ["Matsuyama", "Shikoku"], ["Fukuoka", "Kyushu"], ["Kumamoto", "Kyushu"], ["Nagasaki", "Kyushu"], ["Kagoshima", "Kyushu"], ["Sendai", "Tohoku"], ["Niigata", "Chubu"], ["Sapporo", "Hokkaido"], ["Naha", "Okinawa"]],
};

const KIND_ECONOMICS: Record<MarketKind, Omit<District, "id" | "name" | "city" | "region" | "requiredStage" | "mapX" | "mapY" | "maxBranches">> = {
  metro: { description: "Dense households, services and strong everyday-banking demand.", population: 72_000, incomeIndex: 112, competition: 72, digitalAffinity: 82, retailDemand: 92, mortgageDemand: 66, businessDemand: 72, wealthDemand: 48, openingCost: 4_200_000, monthlyRent: 138_000 },
  suburb: { description: "Families, commuters and long-term mortgage relationships.", population: 44_000, incomeIndex: 108, competition: 48, digitalAffinity: 68, retailDemand: 78, mortgageDemand: 94, businessDemand: 38, wealthDemand: 42, openingCost: 2_500_000, monthlyRent: 74_000 },
  business: { description: "Corporate deposits, advisers and intense commercial competition.", population: 35_000, incomeIndex: 136, competition: 82, digitalAffinity: 80, retailDemand: 58, mortgageDemand: 48, businessDemand: 96, wealthDemand: 76, openingCost: 4_900_000, monthlyRent: 162_000 },
  university: { description: "Students, founders and young professionals with digital expectations.", population: 39_000, incomeIndex: 88, competition: 57, digitalAffinity: 95, retailDemand: 91, mortgageDemand: 32, businessDemand: 54, wealthDemand: 18, openingCost: 2_250_000, monthlyRent: 69_000 },
  industrial: { description: "SMEs, logistics and manufacturing relationships with higher credit demand.", population: 31_000, incomeIndex: 94, competition: 42, digitalAffinity: 56, retailDemand: 48, mortgageDemand: 38, businessDemand: 97, wealthDemand: 22, openingCost: 3_050_000, monthlyRent: 86_000 },
  wealth: { description: "Affluent households and strong private-banking potential.", population: 22_000, incomeIndex: 168, competition: 73, digitalAffinity: 76, retailDemand: 44, mortgageDemand: 72, businessDemand: 58, wealthDemand: 98, openingCost: 5_350_000, monthlyRent: 178_000 },
  regional: { description: "A balanced regional centre serving households and local companies.", population: 48_000, incomeIndex: 101, competition: 51, digitalAffinity: 65, retailDemand: 76, mortgageDemand: 70, businessDemand: 68, wealthDemand: 34, openingCost: 3_350_000, monthlyRent: 96_000 },
  coastal: { description: "Tourism, trade and seasonal local demand across a broad catchment.", population: 37_000, incomeIndex: 104, competition: 55, digitalAffinity: 63, retailDemand: 72, mortgageDemand: 65, businessDemand: 74, wealthDemand: 38, openingCost: 3_600_000, monthlyRent: 104_000 },
};

export function generateDistrictsForMarket(market: HomeMarket): District[] {
  return MARKET_NODES.map((node, index) => {
    const [city, region] = MARKET_NAMES[market][index];
    const base = KIND_ECONOMICS[node.kind];
    const scale = .88 + index % 5 * .055;
    return {
      ...base,
      id: node.id,
      name: city,
      city,
      region,
      description: `${city}: ${base.description}`,
      population: Math.round(base.population * scale / 1_000) * 1_000,
      incomeIndex: Math.round(base.incomeIndex * (.96 + index % 3 * .025)),
      competition: Math.min(92, Math.round(base.competition + (index % 4 - 1.5) * 3)),
      digitalAffinity: Math.min(98, Math.round(base.digitalAffinity + (index % 3 - 1) * 2)),
      openingCost: Math.round(base.openingCost * scale / 50_000) * 50_000,
      monthlyRent: Math.round(base.monthlyRent * scale / 1_000) * 1_000,
      requiredStage: node.requiredStage,
      mapX: node.mapX,
      mapY: node.mapY,
      maxBranches: node.maxBranches,
    };
  });
}

export const DISTRICTS: District[] = generateDistrictsForMarket("NO");

const employee = (id: string, name: string, role: string, skill: number, leadership: number, salary: number, trait: string): EmployeeProfile => ({
  id, name, role, executiveRole: null, salary, skill, leadership, loyalty: 70 + (skill % 17), energy: 88, trait, assignedBranchId: null,
});

export function initialEmployees(): EmployeeProfile[] {
  return [
    employee("emp-anna", "Anna Vik", "Branch manager", 68, 72, 68_000, "Reliable operator"),
    employee("emp-marius", "Marius Dahl", "Senior adviser", 66, 48, 57_000, "Strong relationships"),
    employee("emp-elin", "Elin Strand", "Credit analyst", 72, 51, 61_000, "Careful underwriter"),
    employee("emp-jonas", "Jonas Berg", "Customer adviser", 58, 42, 49_000, "Fast learner"),
  ];
}

export function initialCandidates(seed = 1): EmployeeProfile[] {
  const suffix = Math.max(1, seed);
  return [
    employee(`cand-cfo-${suffix}`, "Sofia Lund", "Finance director", 84, 79, 118_000, "Capital discipline"),
    employee(`cand-coo-${suffix}`, "Henrik Moen", "Operations director", 78, 86, 112_000, "Branch optimiser"),
    employee(`cand-cro-${suffix}`, "Nora Solheim", "Risk director", 88, 75, 121_000, "Conservative judgement"),
    employee(`cand-cmo-${suffix}`, "Amir Rahman", "Marketing director", 76, 82, 105_000, "Growth strategist"),
    employee(`cand-cto-${suffix}`, "Ida Nilsen", "Technology director", 86, 74, 116_000, "Digital transformer"),
    employee(`cand-adviser-${suffix}`, "Lucas Holm", "Wealth adviser", 73, 55, 64_000, "Premium network"),
  ];
}

export function initialSegments(): CustomerSegment[] {
  return [
    { key: "students", name: "Students", customers: 72, satisfaction: 72, loyalty: 52, profitability: 18, churnRisk: 26, preferredChannel: "digital" },
    { key: "young", name: "Young professionals", customers: 88, satisfaction: 74, loyalty: 61, profitability: 39, churnRisk: 19, preferredChannel: "digital" },
    { key: "families", name: "Families", customers: 134, satisfaction: 76, loyalty: 74, profitability: 68, churnRisk: 11, preferredChannel: "advisor" },
    { key: "affluent", name: "Affluent households", customers: 24, satisfaction: 68, loyalty: 65, profitability: 83, churnRisk: 17, preferredChannel: "advisor" },
    { key: "seniors", name: "Seniors", customers: 47, satisfaction: 79, loyalty: 82, profitability: 45, churnRisk: 8, preferredChannel: "branch" },
    { key: "small-business", name: "Small businesses", customers: 39, satisfaction: 71, loyalty: 67, profitability: 76, churnRisk: 15, preferredChannel: "advisor" },
    { key: "corporate", name: "Corporate clients", customers: 7, satisfaction: 65, loyalty: 55, profitability: 91, churnRisk: 24, preferredChannel: "advisor" },
    { key: "property", name: "Property investors", customers: 9, satisfaction: 69, loyalty: 62, profitability: 88, churnRisk: 21, preferredChannel: "advisor" },
  ];
}

const terms = (key: ProductKey, customerRate: number, monthlyFee: number, approvalThreshold: number, serviceLevel: number): ProductTerms => ({ key, customerRate, monthlyFee, approvalThreshold, serviceLevel, marketingBudget: 0 });

export function initialProductTerms(): Record<ProductKey, ProductTerms> {
  return {
    everyday: terms("everyday", 0, 39, 50, 60),
    savings: terms("savings", 2.7, 0, 45, 55),
    mortgage: terms("mortgage", 6.4, 49, 67, 72),
    sme: terms("sme", 7.2, 249, 70, 70),
    cards: terms("cards", 18.5, 59, 58, 62),
    insurance: terms("insurance", 0, 129, 55, 68),
    wealth: terms("wealth", 0, 899, 72, 88),
  };
}

export function initialBoard(): BoardMember[] {
  return [
    { id: "board-ingrid", name: "Ingrid Aasen", archetype: "Former savings-bank CEO", priority: "risk", support: 74, influence: 28 },
    { id: "board-victor", name: "Victor Berg", archetype: "Growth investor", priority: "growth", support: 61, influence: 24 },
    { id: "board-sara", name: "Sara Mahmoud", archetype: "Customer representative", priority: "customers", support: 69, influence: 18 },
    { id: "board-oyvind", name: "Øyvind Lie", archetype: "Technology founder", priority: "technology", support: 58, influence: 17 },
    { id: "board-kari", name: "Kari Foss", archetype: "Institutional owner", priority: "profit", support: 65, influence: 13 },
  ];
}

export function initialTutorial(): TutorialStep[] {
  return [
    { id: "tutorial-rates", title: "Set a competitive price", description: "Review deposit and loan pricing before advancing a full month.", completed: false, page: "banking" },
    { id: "tutorial-project", title: "Plan your first expansion", description: "Open the network map and start a branch or digital project.", completed: false, page: "network" },
    { id: "tutorial-leader", title: "Build a leadership team", description: "Hire a candidate and appoint the bank's first executive.", completed: false, page: "leadership" },
    { id: "tutorial-credit", title: "Review a real credit case", description: "Approve, counter or decline a large loan application.", completed: false, page: "clients" },
    { id: "tutorial-report", title: "Read the business", description: "Review a completed monthly financial report.", completed: false, page: "reports" },
  ];
}

export function initialV4Fields() {
  const firstBranch: BranchOffice = {
    id: "branch-harbour-1", districtId: "harbour", name: "Harbour Branch", level: 1, profile: "retail", capacity: 520, staffSlots: 7, monthlyRent: 56_000, satisfaction: 75, openedDay: 1, managerId: "emp-anna", managerMandate: "guarded", localFocus: "service", managerBudget: 25_000,
  };
  const automation: AutomationPlan = { treasury: "manual", lending: "manual", marketing: "manual", operations: "manual" };
  return {
    campaignStage: "startup" as const,
    campaignXp: 0,
    strategicFocus: "balanced" as const,
    strategyReviewDay: 91,
    districts: DISTRICTS.map((district) => ({ ...district })),
    branchOffices: [firstBranch],
    projects: [],
    employeeRoster: initialEmployees().map((person) => person.id === "emp-anna" ? { ...person, assignedBranchId: firstBranch.id } : person),
    candidatePool: initialCandidates(),
    automation,
    customerSegments: initialSegments(),
    productTerms: initialProductTerms(),
    activeLoans: [],
    boardMembers: initialBoard(),
    reports: [],
    tutorialSteps: initialTutorial(),
    dismissedAdvisorIds: [],
    monthlyBudget: 1_250_000,
    cashFlowHistory: [],
  };
}
