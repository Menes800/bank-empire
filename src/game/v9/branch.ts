import type { BranchOffice, GameState } from "../types";
import { getBranchOperationsV9, getTechnologyEffectsV9, readV9, writeV9, type BranchLedgerV9, type BranchRecommendationV9, type BranchSpecializationV9 } from "./model";

function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }
function round(value: number) { return Math.round(value); }

function specializationEffects(specialization: BranchSpecializationV9) {
  const base = { capacity: 0, staff: 0, deposit: 1, loan: 1, fee: 1, business: 1, wealth: 1, premises: 1, processing: 1 };
  if (specialization === "regional-hub") return { ...base, capacity: 220, staff: 2, business: 1.12, fee: 1.08, premises: 1.14 };
  if (specialization === "flagship") return { ...base, capacity: 360, staff: 3, deposit: 1.08, fee: 1.18, wealth: 1.15, premises: 1.35 };
  if (specialization === "business-centre") return { ...base, capacity: 110, staff: 1, business: 1.42, loan: 1.12, premises: 1.12 };
  if (specialization === "mortgage-centre") return { ...base, capacity: 90, loan: 1.32, fee: 1.08, premises: 1.08 };
  if (specialization === "wealth-office") return { ...base, capacity: -90, staff: 1, wealth: 1.55, fee: 1.3, premises: 1.18 };
  if (specialization === "self-service") return { ...base, capacity: 240, staff: -2, processing: .7, fee: 1.05, premises: .92 };
  if (specialization === "digital-advisory") return { ...base, capacity: 300, staff: -1, processing: .75, wealth: 1.12, business: 1.1, premises: .88 };
  if (specialization === "operations-hub") return { ...base, capacity: 180, staff: 3, processing: .58, fee: .9, premises: 1.12 };
  return base;
}

export function calculateBranchLedgerV9(state: GameState, branch: BranchOffice): BranchLedgerV9 {
  const operations = getBranchOperationsV9(state, branch.id);
  const tech = getTechnologyEffectsV9(state);
  const specialization = specializationEffects(operations.specialization);
  const manager = state.employeeRoster.find((employee) => employee.id === branch.managerId);
  const managerQuality = manager ? clamp((manager.skill * .48 + manager.leadership * .37 + manager.loyalty * .15) / 75, .7, 1.3) : .72;
  const levelMultiplier = 1 + (operations.effectiveLevel - 1) * .16;
  const customers = Math.max(0, branch.localCustomers ?? Math.min(branch.capacity, 220 + operations.effectiveLevel * 90));
  const deposits = Math.max(0, branch.localDeposits ?? customers * 12_000);
  const loans = Math.max(0, branch.localLoans ?? customers * 7_500);
  const capacity = Math.max(120, branch.capacity + specialization.capacity + tech.digitalCapacity * 8);
  const ageMonths = Math.max(0, Math.floor((state.day - branch.openedDay) / 30));
  const openingPhase = ageMonths < 6;

  const depositSpread = Math.max(.35, state.baseRate + 1.05 - state.depositRate);
  const loanSpread = Math.max(.85, state.loanRate - state.baseRate * .52);
  const depositMargin = deposits * depositSpread / 100 / 12 * specialization.deposit * managerQuality;
  const loanInterest = loans * loanSpread / 100 / 12 * specialization.loan * managerQuality;
  const feesAndServices = customers * (28 + state.products.length * 3.4) * specialization.fee * (1 + tech.feeIncome / 100);
  const businessBanking = customers * (branch.profile === "business" ? 44 : 11) * specialization.business * levelMultiplier;
  const wealthAndProducts = customers * (branch.profile === "wealth" ? 52 : 7) * specialization.wealth * levelMultiplier;
  const incomeTotal = round(depositMargin + loanInterest + feesAndServices + businessBanking + wealthAndProducts);

  const effectiveStaff = Math.max(2, branch.staffSlots + specialization.staff);
  const salaryEfficiency = clamp(1 - tech.staffEfficiency / 100, .55, 1);
  const salaries = effectiveStaff * 5_400 * salaryEfficiency + (manager ? manager.salary / 12 : 0);
  const premises = branch.monthlyRent * (1 + (operations.effectiveLevel - 1) * .09) * specialization.premises;
  const priority = branch.operatingPriority ?? "balanced";
  const localMarketing = priority === "growth" ? 28_000 : priority === "deposits" || priority === "business" ? 16_000 : priority === "profitability" ? 4_000 : 9_000;
  const processPerCustomer = Math.max(4.5, 16 - state.digitalLevel * .055 - tech.operatingCostReduction * .38);
  const technologyProcessing = customers * processPerCustomer * specialization.processing;
  const creditLosses = loans * Math.max(.00008, state.nplRatio / 100 / 12 * .24) * (1 - clamp(tech.fraudReduction / 160, 0, .25));
  const otherOperating = 9_000 + customers * 3.5 + operations.effectiveLevel * 2_600;
  const costsTotal = round(salaries + premises + localMarketing + technologyProcessing + creditLosses + otherOperating);
  const profit = round(incomeTotal - costsTotal);

  const variableCostPerCustomer = Math.max(1, processPerCustomer * specialization.processing + 3.5 + (loans / Math.max(1, customers)) * Math.max(.00008, state.nplRatio / 100 / 12 * .24));
  const incomePerCustomer = Math.max(1, incomeTotal / Math.max(1, customers));
  const contribution = Math.max(1, incomePerCustomer - variableCostPerCustomer);
  const fixedCosts = Math.max(0, costsTotal - variableCostPerCustomer * customers);
  const breakEvenCustomers = Math.ceil(fixedCosts / contribution);
  const additionalCustomersToBreakEven = Math.max(0, breakEvenCustomers - customers);
  const monthlyGap = Math.max(0, -profit);
  const breakEvenDeposits = monthlyGap === 0 ? deposits : deposits + monthlyGap * 12 / Math.max(.0035, depositSpread / 100);
  const breakEvenLoans = monthlyGap === 0 ? loans : loans + monthlyGap * 12 / Math.max(.0085, loanSpread / 100);
  const currentCapacity = customers / Math.max(1, capacity) * 100;

  const priorityGrowth = priority === "growth" ? .055 : priority === "deposits" ? .035 : priority === "business" ? .028 : priority === "profitability" ? .008 : .018;
  const openingGrowth = openingPhase ? .035 : 0;
  const managerGrowth = (managerQuality - .7) * .035;
  const monthlyGrowth = clamp(priorityGrowth + openingGrowth + managerGrowth, -.02, .11);
  const forecast30 = round(profit + Math.max(0, customers * monthlyGrowth) * contribution);
  const forecast90 = round(profit + Math.max(0, customers * ((1 + monthlyGrowth) ** 3 - 1)) * contribution);
  const forecast180 = round(profit + Math.max(0, customers * ((1 + monthlyGrowth) ** 6 - 1)) * contribution);

  const costShares = {
    salaries: salaries / Math.max(1, costsTotal),
    premises: premises / Math.max(1, costsTotal),
    credit: creditLosses / Math.max(1, costsTotal),
    processing: technologyProcessing / Math.max(1, costsTotal),
  };
  let mainProblem = "The branch is operating within a sustainable cost and customer base.";
  if (profit < 0 && additionalCustomersToBreakEven > 0) mainProblem = `Too few customers for the current cost base. ${additionalCustomersToBreakEven.toLocaleString("en-GB")} additional customers are required to break even.`;
  if (profit < 0 && costShares.salaries > .48) mainProblem = "Staffing cost is too high for current customer activity and product income.";
  if (profit < 0 && costShares.premises > .34) mainProblem = "Premises cost is structurally high relative to the branch revenue base.";
  if (profit < 0 && costShares.credit > .2) mainProblem = "Credit losses are absorbing too much of the branch's operating income.";
  if (currentCapacity > 92) mainProblem = "Customer demand is above safe capacity and service quality will deteriorate without expansion or digital relief.";

  const previousLossStreak = operations.lossStreak;
  const lossClassification: BranchLedgerV9["lossClassification"] = profit >= 0 ? "profitable" : openingPhase ? "expected-opening-loss" : previousLossStreak >= 3 ? "structural-loss" : "temporary-loss";
  const recommendations: BranchRecommendationV9[] = [];
  if (additionalCustomersToBreakEven > 0) recommendations.push({ id: "campaign", title: "Run a targeted local campaign", description: "Focus acquisition on the branch's strongest local segment and deposit need.", costNow: 35_000, expectedMonthlyEffect: round(Math.min(additionalCustomersToBreakEven, 90) * contribution * .55), capacityChange: 0, risk: "low", breakEvenMonths: 3 });
  if (costShares.salaries > .42 && effectiveStaff > 4) recommendations.push({ id: "staffing", title: "Move one role to the network pool", description: "Reduce fixed cost while the COO reallocates capacity to a busier location.", costNow: 12_000, expectedMonthlyEffect: 5_400, capacityChange: -55, risk: "medium", breakEvenMonths: 3 });
  if (priority !== "profitability" && profit < 0) recommendations.push({ id: "priority", title: "Set profitability priority", description: "Reduce local discretionary spend and protect contribution margin.", costNow: 0, expectedMonthlyEffect: round(localMarketing * .55), capacityChange: 0, risk: "low", breakEvenMonths: 0 });
  if (operations.specialization === "standard" && operations.effectiveLevel >= 3) recommendations.push({ id: "specialize", title: "Choose a specialist branch model", description: "Match products, staffing and capacity to the strongest local demand.", costNow: 180_000, expectedMonthlyEffect: round(Math.max(18_000, incomeTotal * .12)), capacityChange: 80, risk: "medium", breakEvenMonths: 10 });
  if (tech.digitalCapacity >= 8 && operations.specialization !== "self-service") recommendations.push({ id: "digitalize", title: "Convert routine service to self-service", description: "Use the bank's digital platform to increase capacity with fewer routine staff hours.", costNow: 260_000, expectedMonthlyEffect: round(salaries * .1 + technologyProcessing * .2), capacityChange: 220, risk: "medium", breakEvenMonths: 18 });
  if (currentCapacity > 88 && operations.effectiveLevel < 5) recommendations.push({ id: "upgrade", title: `Expand to Level ${operations.effectiveLevel + 1}`, description: "Add capacity and unlock a more advanced operating model.", costNow: operations.effectiveLevel === 3 ? 3_800_000 : 7_500_000, expectedMonthlyEffect: round(Math.max(35_000, incomeTotal * .18)), capacityChange: operations.effectiveLevel === 3 ? 280 : 450, risk: "medium", breakEvenMonths: operations.effectiveLevel === 3 ? 30 : 42 });
  if (lossClassification === "structural-loss") recommendations.push({ id: "downscale", title: "Downscale the operating model", description: "Reduce space and staffing while protecting the local customer book.", costNow: 140_000, expectedMonthlyEffect: round(premises * .18 + salaries * .12), capacityChange: -140, risk: "medium", breakEvenMonths: 12 });
  if (lossClassification === "structural-loss" && previousLossStreak >= 8) recommendations.push({ id: "close", title: "Prepare closure or sale", description: "Exit a structurally weak location after customer and staff migration planning.", costNow: 420_000, expectedMonthlyEffect: round(costsTotal - incomeTotal), capacityChange: -round(capacity), risk: "high", breakEvenMonths: null });

  return {
    day: state.day,
    income: { depositMargin: round(depositMargin), loanInterest: round(loanInterest), feesAndServices: round(feesAndServices), businessBanking: round(businessBanking), wealthAndProducts: round(wealthAndProducts), total: incomeTotal },
    costs: { salaries: round(salaries), premises: round(premises), localMarketing: round(localMarketing), technologyProcessing: round(technologyProcessing), creditLosses: round(creditLosses), otherOperating: round(otherOperating), total: costsTotal },
    profit,
    mainProblem,
    breakEvenCustomers,
    additionalCustomersToBreakEven,
    breakEvenDeposits: round(breakEvenDeposits),
    breakEvenLoans: round(breakEvenLoans),
    currentCapacity,
    expectedCapacity: capacity,
    forecast30,
    forecast90,
    forecast180,
    ageMonths,
    openingPhase,
    lossClassification,
    recommendations: recommendations.slice(0, 5),
  };
}

export function refreshBranchLedgersV9(state: GameState): GameState {
  const v9 = readV9(state);
  const branches = { ...v9.branches };
  for (const branch of state.branchOffices) {
    const ledger = calculateBranchLedgerV9(state, branch);
    const current = branches[branch.id] ?? getBranchOperationsV9(state, branch.id);
    branches[branch.id] = { ...current, ledger, lossStreak: ledger.profit < 0 ? current.lossStreak + 1 : 0 };
  }
  return writeV9(state, { ...v9, branches });
}
