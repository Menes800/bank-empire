import { beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { acquireCompetitor, chooseDecision, raiseWholesaleFunding, repayWholesaleFunding } from "../src/game/actions";
import { DECISIONS } from "../src/game/catalog";
import { emptyGame, getExpansionAssessmentV88, repairCampaignState } from "../src/game/engine";
import { advanceDay, normaliseMarketShares } from "../src/game/simulation";
import { executiveRoleFit, shortlistExecutiveCandidates } from "../src/game/v5/gameplay";
import { advanceDaysV6 } from "../src/game/v6/gameplay";
import { advanceDaysV7, getBranchEconomicsV7, getBranchUpgradeEconomicsV7 } from "../src/game/v7/gameplay";
import { getRiskContributions } from "../src/game/v810/insights";
import { advanceDaysV89, branchMetricsV89, getBranchDiagnosisV89, getBranchUpgradePlanV89, getCooPortfolioSummaryV89, getMandateAssessmentV89, reconcileManagementV89, runCooNetworkReviewV89 } from "../src/game/v89/gameplay";
import { hasCheckpoint, loadGame, restoreCheckpoint, saveGame } from "../src/game/store";
import type { GameState } from "../src/game/types";
import { addEvent, annualPayrollCost, calculateFundingProfile, calculateRatios, createEvent, dailyPayrollCost, monthlyPayrollCost } from "../src/game/utils";
import { MarketPage } from "../src/ui/pages/MarketPage";
import { NetworkPageV89 } from "../src/ui/v89/NetworkPage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: new MemoryStorage(),
});

function activeGame(patch: Partial<GameState> = {}): GameState {
  return {
    ...emptyGame(),
    setupComplete: true,
    founderName: "Test Founder",
    ...patch,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("acquisitions", () => {
  it("keeps every acquired branch in the active branch model after time advances", () => {
    const initial = activeGame({ cash: 100_000_000, reputation: 90 });
    const target = initial.competitors.find((competitor) => competitor.branches > 0)!;

    const acquired = acquireCompetitor(initial, target.id);

    expect(acquired.branchOffices).toHaveLength(initial.branchOffices.length + target.branches);
    expect(acquired.branches).toBe(acquired.branchOffices.length);
    for (const district of acquired.districts) {
      expect(acquired.branchOffices.filter((branch) => branch.districtId === district.id).length).toBeLessThanOrEqual(district.maxBranches);
    }

    const advanced = advanceDaysV89(acquired, 1);
    expect(advanced.branchOffices).toHaveLength(acquired.branchOffices.length);
    expect(advanced.branches).toBe(advanced.branchOffices.length);
  });
});

describe("branch authority", () => {
  it("does not let delegation override CEO-only upgrade authority", () => {
    const base = activeGame({ cash: 10_000_000 });
    const branch = {
      ...base.branchOffices[0],
      managerControl: true,
      upgradeAuthority: "manual" as const,
      localCustomers: base.branchOffices[0].capacity,
      lastMonthProfit: 100_000,
    };
    const cooId = branch.managerId!;
    const task: GameState["ceoInbox"][number] = {
      id: "upgrade-authority-test",
      createdDay: base.day,
      category: "network",
      title: `${branch.name} recommends expansion`,
      summary: "Capacity and payback support an upgrade.",
      urgency: "important",
      page: "network",
      status: "open",
      ownerRole: "COO",
      sourceId: `upgrade-${branch.id}`,
    };
    const state: GameState = {
      ...base,
      branchOffices: [branch],
      ceoInbox: [task],
      objectives: [],
      employeeRoster: base.employeeRoster.map((employee) => employee.id === cooId
        ? { ...employee, executiveRole: "COO" }
        : employee),
      executiveMandates: {
        ...base.executiveMandates,
        COO: {
          ...base.executiveMandates.COO,
          permissions: [...new Set([...base.executiveMandates.COO.permissions, "localUpgrades"])],
          spendLimit: 2_000_000,
          riskLimit: 90,
        },
      },
    };

    const assessment = getMandateAssessmentV89(state, task);
    const reconciled = reconcileManagementV89(state);

    expect(assessment.requiresCEO).toBe(true);
    expect(assessment.reason).toMatch(/CEO|approval/i);
    expect(reconciled.projects).toHaveLength(0);
    expect(reconciled.cash).toBe(state.cash);
    expect(reconciled.ceoInbox[0].status).toBe("open");
  });
});

describe("save safety", () => {
  it("creates one checkpoint when a normal 30-day advance lands on day 31", () => {
    saveGame(activeGame({ day: 31, cash: 7_500_000 }));

    expect(hasCheckpoint()).toBe(true);
    expect(restoreCheckpoint()?.day).toBe(31);

    saveGame(activeGame({ day: 32, cash: 1_000_000 }));
    expect(restoreCheckpoint()?.day).toBe(31);

    saveGame(activeGame({ day: 61, cash: 6_000_000 }));
    expect(restoreCheckpoint()?.day).toBe(61);
  });

  it("preserves the original bytes before replacing an invalid save", () => {
    const broken = "{ definitely-not-json";
    localStorage.setItem("bank-empire-save-v4", broken);

    const recovered = loadGame();
    saveGame(recovered);

    const backup = localStorage.getItem("bank-empire-corrupt-save-v4");
    expect(backup).not.toBeNull();
    expect(backup).toContain(broken);
  });

  it("repairs a legacy zero-deposit balance without changing equity", () => {
    const legacy = activeGame({
      cash: 2_000_000,
      deposits: 0,
      customers: 5_000,
      objectives: [],
      events: [],
      branchOffices: emptyGame().branchOffices.map((branch) => ({ ...branch, localDeposits: 0 })),
    });
    const equityBefore = legacy.cash + legacy.loans - legacy.deposits - legacy.wholesaleFunding;
    localStorage.setItem("bank-empire-save-v4", JSON.stringify(legacy));

    const repaired = loadGame();
    const equityAfter = repaired.cash + repaired.loans - repaired.deposits - repaired.wholesaleFunding;

    expect(repaired.deposits).toBeGreaterThan(0);
    expect(equityAfter).toBeCloseTo(equityBefore, 5);
  });

  it("refreshes stale risk and branch reporting when an older save is loaded", () => {
    const base = activeGame({ riskScore: 99 });
    const branch = { ...base.branchOffices[0], localCustomers: 233, localDeposits: 5_300_000, localLoans: 2_700_000, lastMonthRevenue: 1, lastMonthCost: 1, lastMonthProfit: 0 };
    const legacy = { ...base, branchOffices: [branch] };
    localStorage.setItem("bank-empire-save-v4", JSON.stringify(legacy));

    const loaded = loadGame();
    const expected = getBranchEconomicsV7(loaded, loaded.branchOffices[0]);

    expect(loaded.riskScore).toBeLessThan(99);
    expect(loaded.branchOffices[0].lastMonthRevenue).toBe(expected.revenue);
    expect(loaded.branchOffices[0].lastMonthCost).toBe(expected.cost);
    expect(loaded.branchOffices[0].lastMonthProfit).toBe(expected.profit);
  });
});

describe("economic integrity", () => {
  it("uses one annual salary basis for daily and monthly payroll", () => {
    const state = activeGame();

    expect(monthlyPayrollCost(state)).toBeCloseTo(annualPayrollCost(state) / 12, 10);
    expect(dailyPayrollCost(state)).toBeCloseTo(annualPayrollCost(state) / 365, 10);
    expect(annualPayrollCost(state)).toBeGreaterThan(state.employeeRoster.reduce((sum, employee) => sum + employee.salary, 0) * .9);
  });

  it("updates branch reporting without charging consolidated cash twice", () => {
    const base = activeGame({
      day: 29,
      objectives: [],
      competitors: [],
      automation: { treasury: "manual", lending: "manual", marketing: "manual", operations: "manual" },
      branchOffices: emptyGame().branchOffices.map((branch) => ({
        ...branch,
        managerMandate: "manual",
        managerControl: false,
        localCustomers: 320,
        localDeposits: 4_000_000,
        localLoans: 2_800_000,
      })),
    });

    const consolidatedOnly = advanceDaysV6(base, 1);
    const withBranchReporting = advanceDaysV7(base, 1);

    expect(withBranchReporting.day).toBe(30);
    expect(withBranchReporting.cash).toBeCloseTo(consolidatedOnly.cash, 5);
    expect(withBranchReporting.branchOffices[0].lastMonthRevenue).toBeGreaterThan(0);
    expect(withBranchReporting.events.some((event) => event.title === "Branch economics reconciled")).toBe(true);
  });

  it("keeps the final daily cash bridge balanced after all management layers", () => {
    const advanced = advanceDaysV89(activeGame({ objectives: [], competitors: [] }), 1);
    const row = advanced.cashFlowHistory.at(-1)!;
    const identity = row.openingCash
      + row.depositInflows
      - row.customerWithdrawals
      + row.loanRepayments
      - row.newLending
      + row.operatingProfit
      + row.fundingChange
      + row.otherMovements;

    expect(identity).toBeCloseTo(row.closingCash, 5);
    expect(row.closingCash).toBeCloseTo(advanced.cash, 5);
  });

  it("drops a stale cash-flow history before recording the next valid bridge", () => {
    const base = activeGame({
      objectives: [],
      competitors: [],
      cashFlowHistory: [{
        day: 1,
        openingCash: 1,
        depositInflows: 0,
        customerWithdrawals: 0,
        loanRepayments: 0,
        newLending: 0,
        operatingProfit: 0,
        fundingChange: 0,
        otherMovements: 0,
        closingCash: 1,
      }],
    });

    const advanced = advanceDaysV89(base, 1);

    expect(advanced.cashFlowHistory).toHaveLength(1);
    expect(advanced.cashFlowHistory[0].day).toBe(advanced.day);
    expect(advanced.cashFlowHistory[0].openingCash).toBeCloseTo(base.cash, 5);
  });

  it("replays the same history from the same seed and starting state", () => {
    const state = activeGame({
      worldSeed: 424_242,
      objectives: [],
      ceoInbox: [],
      managementLog: [],
    });

    const first = advanceDaysV89(structuredClone(state), 35);
    const second = advanceDaysV89(structuredClone(state), 35);

    expect(second).toEqual(first);
  });

  it.each([7, 424_242, 900_001])("keeps core state invariants through a seeded campaign (%i)", (worldSeed) => {
    let state = activeGame({ worldSeed, objectives: [] });

    for (let index = 0; index < 120 && !state.gameOverReason; index += 1) {
      if (state.pendingDecision) state = chooseDecision(state, state.pendingDecision.choices[0].id);
      state = advanceDaysV89(state, 1);

      expect(state.branches).toBe(state.branchOffices.length);
      for (const value of [state.cash, state.deposits, state.loans, state.profit, state.capitalRatio, state.liquidityRatio]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      const row = state.cashFlowHistory.at(-1);
      if (row?.day === state.day) {
        const identity = row.openingCash
          + row.depositInflows
          - row.customerWithdrawals
          + row.loanRepayments
          - row.newLending
          + row.operatingProfit
          + row.fundingChange
          + row.otherMovements;
        expect(identity).toBeCloseTo(row.closingCash, 5);
      }
    }

    expect(state.day).toBe(121);
    expect(state.gameOverReason).toBeNull();
  });

  it("keeps a full relaxed campaign year playable after the economy repair", () => {
    let state = activeGame({ worldSeed: 812_365, difficulty: "relaxed", objectives: [] });

    for (let index = 0; index < 365 && !state.gameOverReason; index += 1) {
      if (state.pendingDecision) state = chooseDecision(state, state.pendingDecision.choices[0].id);
      state = advanceDaysV89(state, 1);
      for (const value of [state.cash, state.deposits, state.loans, state.riskScore, state.satisfaction]) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }

    expect(state.day).toBe(366);
    expect(state.gameOverReason).toBeNull();
  });
});

describe("event integrity", () => {
  it("preserves the configured currency text and gives repeated events stable unique ids", () => {
    const base = activeGame({ events: [] });
    const first = createEvent(base.day, "neutral", "Treasury update", "Liquidity increased by NOK 100,000.");
    const withFirst = addEvent(base, first);
    const withSecond = addEvent(withFirst, createEvent(base.day, "neutral", "Treasury update", "Liquidity increased by NOK 100,000."));

    expect(withSecond.events[0].body).toContain("NOK 100,000");
    expect(withSecond.events[0].id).not.toBe(withSecond.events[1].id);
    expect(withSecond.events[1].id).toBe(first.id);
  });

  it("uses the campaign currency for legacy dollar and NOK amounts", () => {
    const state = activeGame({ currency: "SEK", events: [] });
    const next = addEvent(state, createEvent(state.day, "neutral", "Funding", "Raised $6m after a NOK 100,000 review."));

    expect(next.events[0].body).toBe("Raised SEK 6m after a SEK 100,000 review.");
  });
});

describe("v0.8.12 funding repair", () => {
  it("keeps zero-deposit funding risk finite and recognises positive equity", () => {
    const state = activeGame({ cash: 205_000_000, loans: 191_000_000, deposits: 0, wholesaleFunding: 0, compliance: 80, nplRatio: 1.9 });
    const profile = calculateFundingProfile(state.cash, state.loans, state.deposits, state.wholesaleFunding);
    const ratios = calculateRatios(state.cash, state.loans, state.deposits, state.wholesaleFunding, state.compliance, state.nplRatio, state.reputation, state.satisfaction);
    const contributions = getRiskContributions({ ...state, ...ratios });

    expect(profile.equity).toBeGreaterThan(state.loans);
    expect(profile.fundingGap).toBe(0);
    expect(profile.riskPoints).toBeLessThanOrEqual(70);
    expect(Number.isFinite(ratios.riskScore)).toBe(true);
    expect(ratios.riskScore).toBeLessThan(70);
    expect(contributions.find((item) => item.key === "funding")?.points).toBe(profile.riskPoints);
  });

  it("borrows and repays selectable wholesale amounts in one action", () => {
    const state = activeGame({ cash: 20_000_000, wholesaleFunding: 0 });
    const borrowed = raiseWholesaleFunding(state, 50_000_000);
    const repaid = repayWholesaleFunding(borrowed, 25_000_000);

    expect(borrowed.cash - state.cash).toBe(50_000_000);
    expect(borrowed.wholesaleFunding).toBe(50_000_000);
    expect(repaid.cash).toBe(borrowed.cash - 25_000_000);
    expect(repaid.wholesaleFunding).toBe(25_000_000);
    expect(Number.isFinite(repaid.riskScore)).toBe(true);
  });
});

describe("v0.8.12 branch economics", () => {
  it("shows a reachable break-even path for an underused first branch", () => {
    const base = activeGame({ cash: 20_000_000 });
    const branch = { ...base.branchOffices[0], localCustomers: 233, localDeposits: 5_300_000, localLoans: 2_700_000 };
    const state = { ...base, branchOffices: [branch] };
    const diagnosis = getBranchDiagnosisV89(state, branch);
    const metrics = branchMetricsV89(state, branch);

    expect(diagnosis.breakEvenCustomers).toBeGreaterThan(metrics.customers);
    expect(diagnosis.breakEvenCustomers).toBeLessThanOrEqual(branch.capacity);
    expect(diagnosis.customersToBreakEven).toBe(diagnosis.breakEvenCustomers - metrics.customers);
    expect(metrics.cost).toBe(metrics.staffing + metrics.rent + metrics.localActivity);
  });

  it("rejects low-demand upgrades and gives a finite profitable plan near capacity", () => {
    const base = activeGame({ cash: 20_000_000 });
    const lowDemand = { ...base.branchOffices[0], localCustomers: 145, localDeposits: 3_000_000, localLoans: 1_800_000 };
    const lowState = { ...base, branchOffices: [lowDemand] };
    const lowPlan = getBranchUpgradeEconomicsV7(lowState, lowDemand);
    const lowAssessment = getBranchUpgradePlanV89(lowState, lowDemand.id)!;

    expect(lowPlan.viable).toBe(false);
    expect(lowPlan.paybackMonths).toBeNull();
    expect(lowAssessment.canStart).toBe(false);

    const nearCapacity = { ...lowDemand, localCustomers: 505, localDeposits: 12_000_000, localLoans: 8_000_000 };
    const strongState = { ...base, branchOffices: [nearCapacity] };
    const strongPlan = getBranchUpgradeEconomicsV7(strongState, nearCapacity);

    expect(strongPlan.viable).toBe(true);
    expect(strongPlan.monthlyProfitGain).toBeGreaterThan(0);
    expect(strongPlan.paybackMonths).not.toBeNull();
    expect(strongPlan.paybackMonths!).toBeGreaterThan(0);
    expect(strongPlan.paybackMonths!).toBeLessThan(120);
  });
});

describe("v0.8.12 service recovery", () => {
  it("runs team reassignment for 30 days and improves overloaded service", () => {
    const complaint = DECISIONS.find((decision) => decision.id === "complaint-wave")!;
    const initial = activeGame({ satisfaction: 29, customers: 5_000, employees: 25, digitalLevel: 28, pendingDecision: complaint, objectives: [], competitors: [] });
    const chosen = chooseDecision(initial, "reassign-teams");
    let treated = chosen;
    let untreated = { ...initial, pendingDecision: null };

    expect(chosen.serviceIntervention?.endDay).toBe(chosen.day + 30);
    for (let day = 0; day < 30; day += 1) {
      treated = advanceDay({ ...treated, pendingDecision: null, gameOverReason: null });
      untreated = advanceDay({ ...untreated, pendingDecision: null, gameOverReason: null });
    }

    expect(treated.serviceIntervention).toBeNull();
    expect(treated.satisfaction).toBeGreaterThan(chosen.satisfaction);
    expect(treated.satisfaction).toBeGreaterThan(untreated.satisfaction + 5);
    expect(treated.events.some((event) => event.title === "Service team reassignment completed")).toBe(true);
  });
});

describe("v0.8.12 executive recruitment", () => {
  it("returns only the three strongest candidates for the selected role", () => {
    const state = activeGame();
    const shortlist = shortlistExecutiveCandidates(state.candidatePool, "CFO", 3);
    const fits = shortlist.map((candidate) => executiveRoleFit(candidate, "CFO"));

    expect(shortlist).toHaveLength(3);
    expect(new Set(shortlist.map((candidate) => candidate.id)).size).toBe(3);
    expect(fits).toEqual([...fits].sort((a, b) => b - a));
    const allRanked = shortlistExecutiveCandidates(state.candidatePool, "CFO", state.candidatePool.length);
    expect(shortlist.map((candidate) => candidate.id)).toEqual(allRanked.slice(0, 3).map((candidate) => candidate.id));
  });
});

describe("v0.8.13 living competition", () => {
  it("keeps seven active rivals and makes displayed market share total 100%", () => {
    const initial = normaliseMarketShares(activeGame({ cash: 200_000_000, reputation: 90 }));
    const target = initial.competitors[0];
    const acquired = acquireCompetitor(initial, target.id);
    const replenished = repairCampaignState(acquired);
    const totalShare = replenished.marketShare + replenished.competitors.reduce((sum, competitor) => sum + competitor.marketShare, 0);

    expect(replenished.competitors).toHaveLength(7);
    expect(new Set(replenished.competitors.map((competitor) => competitor.name)).size).toBe(7);
    expect(replenished.competitors.some((competitor) => competitor.id === target.id)).toBe(false);
    expect(replenished.competitorHistory[0]).toMatchObject({ id: target.id, reason: "acquired" });
    expect(replenished.competitorMoves.some((move) => move.type === "entry")).toBe(true);
    expect(totalShare).toBeCloseTo(100, 8);

    const secondTarget = replenished.competitors.find((competitor) => competitor.id !== target.id)!;
    const replenishedAgain = repairCampaignState(acquireCompetitor(replenished, secondTarget.id));
    expect(new Set(replenishedAgain.competitors.map((competitor) => competitor.id)).size).toBe(7);
    expect(new Set(replenishedAgain.competitors.map((competitor) => competitor.name)).size).toBe(7);
  });

  it("keeps competitor intelligence and exit history bounded", () => {
    const state = repairCampaignState(activeGame({
      competitorMoves: Array.from({ length: 60 }, (_, index) => ({ id: `move-${index}`, day: index, competitorId: "old", competitorName: "Old Bank", type: "pricing" as const, title: "Old move", description: "Old history", impact: 1 })),
      competitorHistory: Array.from({ length: 40 }, (_, index) => ({ id: `exit-${index}`, name: `Old Bank ${index}`, day: index, reason: "withdrawn" as const })),
    }));

    expect(state.competitorMoves.length).toBeLessThanOrEqual(18);
    expect(state.competitorHistory.length).toBeLessThanOrEqual(24);
  });
});

describe("v0.8.13 national branch network", () => {
  it("migrates a seven-market save to 24 city markets without losing its branch", () => {
    const legacy = activeGame();
    const branchIds = legacy.branchOffices.map((branch) => branch.id);
    const repaired = repairCampaignState({ ...legacy, districts: legacy.districts.slice(0, 7) });

    expect(repaired.districts).toHaveLength(24);
    expect(repaired.districts.every((district) => Boolean(district.city && district.region && district.maxBranches))).toBe(true);
    expect(repaired.branchOffices.map((branch) => branch.id)).toEqual(branchIds);
  });

  it("allows several branches in large cities until the market slot limit is reached", () => {
    const base = activeGame({ cash: 100_000_000, boardConfidence: 90, liquidityRatio: 60 });
    const district = base.districts.find((item) => item.maxBranches >= 3)!;
    const first = { ...base.branchOffices[0], districtId: district.id };
    const second = { ...first, id: "second-city-branch", name: `${district.city} Branch 2` };
    const open = getExpansionAssessmentV88({ ...base, branchOffices: [first] }, district.id);
    const full = getExpansionAssessmentV88({ ...base, branchOffices: [first, second, { ...second, id: "third-city-branch" }] }, district.id);

    expect(open.allowed).toBe(true);
    expect(open.existingBranches).toBe(1);
    expect(full.allowed).toBe(false);
    expect(full.reasons.join(" ")).toMatch(/limit/i);
  });
});

describe("v0.8.13 COO portfolio management", () => {
  function cooScenario() {
    const base = repairCampaignState(activeGame({ cash: 30_000_000, day: 30, objectives: [] }));
    const cooCandidate = base.candidatePool[0];
    const coo = { ...cooCandidate, id: "coo-network-test", executiveRole: "COO" as const, role: "Chief operating officer", assignedBranchId: null };
    const lossBranch = { ...base.branchOffices[0], managerControl: true, lastMonthRevenue: 90_000, lastMonthCost: 210_000, lastMonthProfit: -120_000, recoveryPlan: null, portfolioStatus: "review" as const };
    const vacantBranch = { ...lossBranch, id: "branch-vacant-test", districtId: base.districts[1].id, name: `${base.districts[1].city} Branch`, managerId: null, lastMonthRevenue: 125_000, lastMonthCost: 105_000, lastMonthProfit: 20_000 };
    return {
      ...base,
      branchOffices: [lossBranch, vacantBranch],
      branches: 2,
      employeeRoster: [...base.employeeRoster, coo],
      candidatePool: base.candidatePool.filter((candidate) => candidate.id !== cooCandidate.id),
      managementControl: { ...base.managementControl, operations: "major" as const },
      executiveMandates: { ...base.executiveMandates, COO: { ...base.executiveMandates.COO, permissions: [...new Set([...base.executiveMandates.COO.permissions, "hiring" as const, "branchManagers" as const, "transfers" as const])], spendLimit: 1_500_000 } },
    };
  }

  it("starts a recovery plan and recruits a vacant manager inside the COO mandate", () => {
    const state = cooScenario();
    const reviewed = runCooNetworkReviewV89(state);
    const lossBranch = reviewed.branchOffices.find((branch) => branch.id === state.branchOffices[0].id)!;
    const filledBranch = reviewed.branchOffices.find((branch) => branch.id === "branch-vacant-test")!;
    const summary = getCooPortfolioSummaryV89(reviewed);

    expect(lossBranch.recoveryPlan).toMatchObject({ status: "active", reviewDay: state.day + 90, deadlineDay: state.day + 180 });
    expect(lossBranch.portfolioStatus).toBe("turnaround");
    expect(filledBranch.managerId).not.toBeNull();
    expect(reviewed.cash).toBeLessThan(state.cash);
    expect(summary.counts.turnaround).toBeGreaterThanOrEqual(1);
    expect(reviewed.managementLog[0].title).toBe("Monthly branch portfolio review");
  });

  it("escalates only a missed break-even deadline as a CEO portfolio decision", () => {
    const started = runCooNetworkReviewV89(cooScenario());
    const plan = started.branchOffices[0].recoveryPlan!;
    const due = {
      ...started,
      day: plan.deadlineDay,
      branchOffices: started.branchOffices.map((branch, index) => index === 0 ? { ...branch, lastMonthProfit: -75_000 } : branch),
    };
    const escalated = runCooNetworkReviewV89(due);
    const task = escalated.ceoInbox.find((item) => item.sourceId === "coo-portfolio-exceptions");

    expect(escalated.branchOffices[0].portfolioStatus).toBe("review");
    expect(escalated.branchOffices[0].recoveryPlan?.status).toBe("escalated");
    expect(task?.status).toBe("open");
    expect(task?.title).toMatch(/CEO portfolio decision/);
    expect(getMandateAssessmentV89(escalated, task!).requiresCEO).toBe(true);

    const reviewedAgain = runCooNetworkReviewV89({ ...escalated, day: escalated.day + 30 });
    expect(reviewedAgain.branchOffices[0].portfolioStatus).toBe("review");
    expect(reviewedAgain.branchOffices[0].recoveryPlan?.status).toBe("escalated");
    expect(reviewedAgain.ceoInbox.filter((item) => item.sourceId === "coo-portfolio-exceptions" && item.status === "open")).toHaveLength(1);
  });
});

describe("v0.8.13 long-network optimisation", () => {
  it("keeps a 32-branch campaign responsive and history bounded for a full year", () => {
    const base = repairCampaignState(activeGame({ cash: 500_000_000, deposits: 800_000_000, loans: 520_000_000, customers: 55_000, employees: 220, difficulty: "relaxed", objectives: [], bankruptcyProtection: true }));
    const cooCandidate = base.candidatePool[0];
    const coo = { ...cooCandidate, id: "coo-load-test", executiveRole: "COO" as const, role: "Chief operating officer", assignedBranchId: null };
    const branches = Array.from({ length: 32 }, (_, index) => {
      const district = base.districts[index % base.districts.length];
      return { ...base.branchOffices[0], id: `load-branch-${index}`, districtId: district.id, name: `${district.city} ${index + 1}`, managerId: base.branchOffices[0].managerId, localCustomers: 420 + index % 180, localDeposits: 12_000_000, localLoans: 9_000_000, lastMonthRevenue: 180_000, lastMonthCost: 155_000, lastMonthProfit: 25_000 };
    });
    let state = repairCampaignState({ ...base, branchOffices: branches, branches: branches.length, employeeRoster: [...base.employeeRoster, coo], candidatePool: base.candidatePool.slice(1) });
    const started = Date.now();

    for (let index = 0; index < 365; index += 1) {
      if (state.pendingDecision) state = chooseDecision(state, state.pendingDecision.choices[0].id);
      state = advanceDaysV89(state, 1);
    }

    expect(Date.now() - started).toBeLessThan(5_000);
    expect(state.day).toBe(366);
    expect(state.branchOffices).toHaveLength(32);
    expect(state.history.length).toBeLessThanOrEqual(120);
    expect(state.cashFlowHistory.length).toBeLessThanOrEqual(120);
    expect(state.competitorMoves.length).toBeLessThanOrEqual(18);
    expect(state.managementLog.length).toBeLessThanOrEqual(120);
    expect([state.cash, state.marketShare, ...state.competitors.map((competitor) => competitor.marketShare)].every(Number.isFinite)).toBe(true);
  });
});

describe("v0.8.13 interface integrity", () => {
  it("renders the COO portfolio controls and compact branch tools", () => {
    const state = repairCampaignState(activeGame());
    const markup = renderToStaticMarkup(createElement(NetworkPageV89, { game: state, action: () => undefined }));

    expect(markup).toContain("COO NETWORK MANDATE");
    expect(markup).toContain("Search branch or manager");
    expect(markup).toContain("Attention first");
  });

  it("renders a complete competitor ranking without infinite pricing values", () => {
    const state = repairCampaignState(activeGame());
    const markup = renderToStaticMarkup(createElement(MarketPage, { game: state }));

    expect(markup).toContain("7 active rivals");
    expect(markup).toContain("100.0% represented");
    expect(markup).not.toMatch(/-?Infinity/);
  });
});
