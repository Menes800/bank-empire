import { beforeEach, describe, expect, it } from "vitest";
import { acquireCompetitor, chooseDecision } from "../src/game/actions";
import { emptyGame } from "../src/game/engine";
import { advanceDaysV89, getMandateAssessmentV89, reconcileManagementV89 } from "../src/game/v89/gameplay";
import { advanceDaysV6 } from "../src/game/v6/gameplay";
import { advanceDaysV7 } from "../src/game/v7/gameplay";
import { hasCheckpoint, loadGame, restoreCheckpoint, saveGame } from "../src/game/store";
import type { GameState } from "../src/game/types";
import { addEvent, annualPayrollCost, createEvent, dailyPayrollCost, monthlyPayrollCost } from "../src/game/utils";

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
