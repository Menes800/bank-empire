import type {
  Competitor,
  CompetitorStrategy,
  EmployeeDepartment,
  EmployeeProfile,
  ExecutiveRole,
  HomeMarket,
  NameStyle,
} from "../types";
import { hashSeed, seededValue } from "../utils";

export { hashSeed, seededValue } from "../utils";

const localNames: Record<HomeMarket, { first: string[]; last: string[]; places: string[]; bankWords: string[] }> = {
  NO: { first: ["Ingrid", "Sofie", "Henrik", "Marius", "Nora", "Amir", "Ida", "Elias", "Mina", "Thea", "Oskar", "Lea"], last: ["Aasen", "Berg", "Dahl", "Foss", "Hauge", "Lie", "Lunde", "Moen", "Nilsen", "Solheim", "Strand", "Vik"], places: ["Fjord", "Nord", "Harbour", "Viken", "Oslo", "Aurora"], bankWords: ["Bank", "Trust", "Finans", "Sparebank", "Capital"] },
  SE: { first: ["Elsa", "Alma", "Hugo", "Viktor", "Nora", "Liam", "Freja", "Axel", "Maja", "Elias"], last: ["Andersson", "Berg", "Dahl", "Lind", "Nord", "Sjöberg", "Ek", "Holm"], places: ["Svea", "Nord", "Skärgård", "Stockholm", "Baltic"], bankWords: ["Bank", "Finans", "Kredit", "Capital"] },
  DK: { first: ["Freja", "Sofie", "Mikkel", "Emil", "Ida", "Noah", "Alma", "Lukas"], last: ["Nielsen", "Jensen", "Larsen", "Møller", "Holm", "Berg"], places: ["Øresund", "Nord", "Havn", "Copenhagen", "Jutland"], bankWords: ["Bank", "Finans", "Kredit", "Capital"] },
  FI: { first: ["Aino", "Ella", "Mikko", "Elias", "Emilia", "Leo", "Sofia", "Onni"], last: ["Korhonen", "Virtanen", "Mäkinen", "Niemi", "Laine", "Heikkinen"], places: ["Suomi", "Lake", "Nord", "Helsinki", "Aurora"], bankWords: ["Bank", "Finance", "Capital", "Pankki"] },
  DE: { first: ["Anna", "Lena", "Jonas", "Felix", "Mia", "Leon", "Sophie", "Max"], last: ["Schmidt", "Weber", "Fischer", "Wagner", "Becker", "Hoffmann"], places: ["Rhein", "Nord", "Berlin", "Hanse", "Alpen"], bankWords: ["Bank", "Finanz", "Kredit", "Kapital"] },
  GB: { first: ["Olivia", "Amelia", "Arthur", "George", "Isla", "Harry", "Maya", "Theo"], last: ["Taylor", "Smith", "Clarke", "Walker", "Bennett", "Morgan"], places: ["Crown", "Thames", "Northern", "London", "Albion"], bankWords: ["Bank", "Trust", "Capital", "Finance"] },
  US: { first: ["Emma", "Ava", "Liam", "Noah", "Mia", "Ethan", "Sofia", "Mason"], last: ["Miller", "Davis", "Wilson", "Moore", "Taylor", "Anderson"], places: ["Liberty", "Union", "Atlantic", "Summit", "Metro"], bankWords: ["Bank", "Trust", "Capital", "Financial"] },
  CH: { first: ["Lina", "Sophie", "Noah", "Luca", "Mia", "Leon", "Anna", "Elias"], last: ["Müller", "Meier", "Schmid", "Keller", "Frei", "Bühler"], places: ["Alpine", "Helvetia", "Zurich", "Summit", "Rhine"], bankWords: ["Bank", "Trust", "Capital", "Finanz"] },
  JP: { first: ["Yui", "Aoi", "Haruto", "Ren", "Hina", "Sota", "Mio", "Kaito"], last: ["Sato", "Suzuki", "Takahashi", "Tanaka", "Ito", "Watanabe"], places: ["Sakura", "Tokyo", "Hikari", "Pacific", "Fuji"], bankWords: ["Bank", "Trust", "Capital", "Finance"] },
};

const internationalFirst = ["Maya", "Noah", "Lea", "Elias", "Sara", "Oskar", "Amalie", "Theo", "Lucas", "Sofia", "Nora", "Amir", "Ida", "Victor", "Elena", "Mateo"];
const internationalLast = ["Berg", "Rahman", "Lund", "Holm", "Strand", "Chen", "Morgan", "Silva", "Khan", "Nielsen", "Rossi", "Meyer", "Taylor", "Novak"];

const roles: { role: string; department: EmployeeDepartment; executive: ExecutiveRole; baseSalary: number }[] = [
  { role: "Finance director", department: "Finance & Treasury", executive: "CFO", baseSalary: 118_000 },
  { role: "Operations director", department: "Branch Operations", executive: "COO", baseSalary: 112_000 },
  { role: "Risk director", department: "Credit & Collections", executive: "CRO", baseSalary: 121_000 },
  { role: "Growth director", department: "Customer Growth", executive: "CMO", baseSalary: 106_000 },
  { role: "Technology director", department: "Technology", executive: "CTO", baseSalary: 120_000 },
  { role: "Regional manager", department: "Branch Operations", executive: "COO", baseSalary: 86_000 },
  { role: "Credit manager", department: "Credit & Collections", executive: "CRO", baseSalary: 82_000 },
  { role: "Treasury manager", department: "Finance & Treasury", executive: "CFO", baseSalary: 88_000 },
  { role: "Marketing manager", department: "Customer Growth", executive: "CMO", baseSalary: 79_000 },
  { role: "Platform manager", department: "Technology", executive: "CTO", baseSalary: 92_000 },
];

const styles = ["Analytical", "Decisive", "Coaching", "Collaborative", "Commercial", "Cautious", "Transformational", "Hands-on"];
const strengths = ["Builds strong teams", "Excellent with numbers", "Calm in crises", "Fast execution", "Strong customer judgement", "Board credibility", "Technology depth", "Commercial instinct"];
const weaknesses = ["Can overanalyse", "Impatient with slow teams", "Avoids conflict", "Takes too much risk", "Needs strong deputies", "Can become too cautious", "Limited international experience", "Weak internal communication"];
const opinions = ["Prioritise profitable growth", "Protect trust before expansion", "Invest heavily in digital", "Keep capital buffers high", "Win locally before going national", "Build management depth early", "Use acquisitions selectively"];

function pick<T>(items: T[], seed: string | number): T {
  return items[Math.floor(seededValue(seed) * items.length) % items.length];
}

function generatedName(seed: string, market: HomeMarket, style: NameStyle): string {
  const local = localNames[market];
  const useLocal = style === "local" || (style === "mixed" && seededValue(`${seed}-style`) > .42);
  const first = useLocal ? pick(local.first, `${seed}-first`) : pick(internationalFirst, `${seed}-first-int`);
  const last = useLocal ? pick(local.last, `${seed}-last`) : pick(internationalLast, `${seed}-last-int`);
  return `${first} ${last}`;
}

export type GeneratedBankIdentity = {
  bankName: string;
  bankMark: string;
  slogan: string;
  firstBranchName: string;
  founderStory: string;
};

export function generateBankIdentity(seed: string | number, market: HomeMarket, style: NameStyle): GeneratedBankIdentity {
  const data = localNames[market];
  const place = pick(data.places, `${seed}-place`);
  const word = pick(data.bankWords, `${seed}-word`);
  const second = style === "international" ? pick(["Atlas", "Civic", "Unity", "Horizon", "Northstar"], `${seed}-second`) : place;
  const bankName = style === "international" ? `${second} ${word}` : `${place} ${word}`;
  const bankMark = bankName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const slogan = pick([
    "Built for lasting trust.",
    "Local judgement. Modern banking.",
    "Growth with discipline.",
    "Your bank for the long term.",
    "Clear decisions. Strong relationships.",
  ], `${seed}-slogan`);
  const firstBranchName = `${pick(data.places, `${seed}-branch`)} Central`;
  const founderStory = pick([
    "Founded by an operator who believed customers deserved faster decisions and clearer accountability.",
    "Started after years inside traditional banking, with a plan to combine local service and modern systems.",
    "Built from one branch, a disciplined balance sheet and a small team trusted to make real decisions.",
    "Created to prove that a bank can grow without losing service, control or its local identity.",
  ], `${seed}-story`);
  return { bankName, bankMark, slogan, firstBranchName, founderStory };
}

export function generateCandidateMarket(seed: string | number, market: HomeMarket, style: NameStyle, day: number, count = 18): EmployeeProfile[] {
  const candidates: EmployeeProfile[] = [];
  const used = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    const candidateSeed = `${seed}-${day}-${index}`;
    let name = generatedName(candidateSeed, market, style);
    if (used.has(name)) name = `${name} ${index + 1}`;
    used.add(name);
    const roleTemplate = roles[index % roles.length];
    const skill = 62 + Math.floor(seededValue(`${candidateSeed}-skill`) * 30);
    const leadership = 55 + Math.floor(seededValue(`${candidateSeed}-leadership`) * 38);
    const loyalty = 48 + Math.floor(seededValue(`${candidateSeed}-loyalty`) * 48);
    const ambition = 45 + Math.floor(seededValue(`${candidateSeed}-ambition`) * 54);
    const potential = Math.min(98, Math.max(skill, 68 + Math.floor(seededValue(`${candidateSeed}-potential`) * 30)));
    const salaryMultiplier = .88 + seededValue(`${candidateSeed}-salary`) * .42;
    const leadershipStyle = pick(styles, `${candidateSeed}-style-name`);
    const primaryStrength = pick(strengths, `${candidateSeed}-strength-1`);
    const secondStrength = pick(strengths.filter((item) => item !== primaryStrength), `${candidateSeed}-strength-2`);
    candidates.push({
      id: `generated-${hashSeed(candidateSeed).toString(36)}`,
      name,
      role: roleTemplate.role,
      executiveRole: null,
      salary: Math.round(roleTemplate.baseSalary * salaryMultiplier / 1_000) * 1_000,
      skill,
      leadership,
      loyalty,
      energy: 70 + Math.floor(seededValue(`${candidateSeed}-energy`) * 27),
      trait: `${leadershipStyle} leader`,
      assignedBranchId: null,
      department: roleTemplate.department,
      reportsTo: null,
      performance: Math.round(skill * .65 + leadership * .2 + 10),
      workload: 0,
      wellbeing: 82,
      potential,
      tenureMonths: 0,
      nationality: market,
      leadershipStyle,
      strengths: [primaryStrength, secondStrength],
      weaknesses: [pick(weaknesses, `${candidateSeed}-weakness`)],
      workHistory: [
        `${3 + Math.floor(seededValue(`${candidateSeed}-years`) * 9)} years in ${roleTemplate.department}`,
        pick(["Regional bank", "Digital challenger", "International bank", "Consulting and transformation", "Corporate finance"], `${candidateSeed}-history`),
      ],
      ceoRelationship: 50,
      boardRelationship: 45 + Math.floor(seededValue(`${candidateSeed}-board`) * 35),
      peerRelationship: 48 + Math.floor(seededValue(`${candidateSeed}-peer`) * 36),
      quitRisk: 8 + Math.floor(seededValue(`${candidateSeed}-quit`) * 42),
      ambition,
      strategyOpinion: pick(opinions, `${candidateSeed}-opinion`),
      decisionHistory: [],
      availableUntilDay: day + 60 + Math.floor(seededValue(`${candidateSeed}-available`) * 121),
    });
  }
  return candidates;
}

export function generatedCompetitors(seed: string | number, market: HomeMarket, competitors: Competitor[]): Competitor[] {
  const data = localNames[market];
  const used = new Set<string>();
  return competitors.map((competitor, index) => {
    const place = data.places[(index + Math.floor(seededValue(`${seed}-competitor-place`) * data.places.length)) % data.places.length];
    const word = data.bankWords[(index * 2 + Math.floor(seededValue(`${seed}-competitor-word`) * data.bankWords.length)) % data.bankWords.length];
    let name = `${place} ${word}`;
    if (used.has(name)) name = `${place} ${["Direct", "Commercial", "Partners", "Community"][index % 4]}`;
    if (used.has(name)) name = `${name} ${index + 1}`;
    used.add(name);
    return { ...competitor, name, homeCity: place, enteredDay: competitor.enteredDay ?? 1 };
  });
}

const entrantStrategies: CompetitorStrategy[] = ["challenger", "community", "business", "digital", "volume", "conservative", "premium"];
const entrantSpecialties: Record<CompetitorStrategy, string> = {
  challenger: "Fast product launches and aggressive growth",
  community: "Local service and relationship banking",
  business: "SME and commercial banking",
  digital: "Mobile-first everyday banking",
  volume: "Low-price, high-volume retail banking",
  conservative: "Savings and conservative mortgages",
  premium: "Private banking and wealth management",
};

export function generateCompetitorEntrant(seed: string | number, market: HomeMarket, day: number, index: number, existingNames: string[] = []): Competitor {
  const data = localNames[market];
  const entrantSeed = `${seed}-${day}-${index}-entrant`;
  const strategy = entrantStrategies[Math.floor(seededValue(`${entrantSeed}-strategy`) * entrantStrategies.length) % entrantStrategies.length];
  const place = pick(data.places, `${entrantSeed}-place`);
  const word = pick(data.bankWords, `${entrantSeed}-word`);
  const alternatives = [
    `${place} ${word}`,
    `${place} ${strategy === "business" ? "Commercial" : strategy === "community" ? "Community" : strategy === "digital" ? "Direct" : "Bank"}`,
    `${pick(["Horizon", "Civic", "Unity", "Northstar", "Pioneer"], `${entrantSeed}-brand`)} ${word}`,
  ];
  const name = alternatives.find((candidate) => !existingNames.includes(candidate)) ?? `${alternatives[2]} ${day}`;
  const customers = 1_600 + Math.round(seededValue(`${entrantSeed}-customers`) * 3_900);
  const branches = strategy === "digital" ? 0 : strategy === "community" ? 4 : strategy === "business" ? 3 : Math.floor(seededValue(`${entrantSeed}-branches`) * 4);
  const deposits = customers * (9_000 + seededValue(`${entrantSeed}-deposits`) * 13_000);
  const loans = customers * (6_000 + seededValue(`${entrantSeed}-loans`) * 10_000);
  const reputation = 52 + Math.round(seededValue(`${entrantSeed}-reputation`) * 25);
  const digitalLevel = strategy === "digital" || strategy === "challenger" ? 78 + Math.round(seededValue(`${entrantSeed}-digital`) * 18) : 42 + Math.round(seededValue(`${entrantSeed}-digital`) * 38);
  return {
    id: `entrant-${hashSeed(entrantSeed).toString(36)}`,
    name,
    strategy,
    customers,
    deposits,
    loans,
    reputation,
    marketShare: 0,
    depositRate: 2.35 + seededValue(`${entrantSeed}-deposit-rate`) * 1.1,
    loanRate: 5.65 + seededValue(`${entrantSeed}-loan-rate`) * 1.7,
    branches,
    digitalLevel,
    acquisitionPrice: Math.round((deposits * .12 + loans * .08 + customers * 1_900) / 100_000) * 100_000,
    homeCity: place,
    specialty: entrantSpecialties[strategy],
    enteredDay: day,
  };
}
