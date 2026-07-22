import type { BoardObjective, GameState, ObjectiveMetric } from "./types";
import { addEvent, clamp, createEvent, seededValue } from "./utils";

function objectiveValue(state: GameState, metric: ObjectiveMetric): number {
  return state[metric];
}

export function createObjectives(
  state: GameState,
  startDay: number,
): BoardObjective[] {
  const deadlineDay = startDay + 89;
  const pool: BoardObjective[] = [
    {
      id: `customers-${startDay}`,
      title: "Grow the customer base",
      description: `Reach ${Math.ceil((state.customers * 1.28) / 50) * 50} active customers.`,
      metric: "customers",
      target: Math.ceil((state.customers * 1.28) / 50) * 50,
      deadlineDay,
      rewardCash: 350_000,
      rewardReputation: 2,
      completed: false,
      failed: false,
    },
    {
      id: `profit-${startDay}`,
      title: "Deliver sustainable earnings",
      description: "Reach a daily profit of NOK 10,000.",
      metric: "profit",
      target: Math.max(10_000, state.profit * 1.4),
      deadlineDay,
      rewardCash: 500_000,
      rewardReputation: 2,
      completed: false,
      failed: false,
    },
    {
      id: `reputation-${startDay}`,
      title: "Build a trusted brand",
      description: `Raise reputation to ${Math.min(90, Math.ceil(state.reputation + 8))}.`,
      metric: "reputation",
      target: Math.min(90, Math.ceil(state.reputation + 8)),
      deadlineDay,
      rewardCash: 250_000,
      rewardReputation: 3,
      completed: false,
      failed: false,
    },
    {
      id: `capital-${startDay}`,
      title: "Protect the capital base",
      description: "Maintain a capital ratio of at least 13.5%.",
      metric: "capitalRatio",
      target: 13.5,
      deadlineDay,
      rewardCash: 280_000,
      rewardReputation: 1,
      completed: false,
      failed: false,
    },
    {
      id: `compliance-${startDay}`,
      title: "Strengthen compliance",
      description: "Reach a compliance score of 86.",
      metric: "compliance",
      target: 86,
      deadlineDay,
      rewardCash: 220_000,
      rewardReputation: 2,
      completed: false,
      failed: false,
    },
  ];

  const offset = Math.floor(seededValue(`${state.worldSeed}-${startDay}-objectives`) * pool.length);
  return [
    pool[offset],
    pool[(offset + 2) % pool.length],
    pool[(offset + 4) % pool.length],
  ];
}

export function evaluateObjectives(state: GameState): GameState {
  let cashReward = 0;
  let reputationReward = 0;
  let confidenceChange = 0;
  const completedTitles: string[] = [];
  const failedTitles: string[] = [];

  const objectives = state.objectives.map((objective) => {
    if (objective.completed || objective.failed) return objective;
    if (objectiveValue(state, objective.metric) >= objective.target) {
      cashReward += objective.rewardCash;
      reputationReward += objective.rewardReputation;
      confidenceChange += 4;
      completedTitles.push(objective.title);
      return { ...objective, completed: true };
    }
    if (state.day > objective.deadlineDay) {
      confidenceChange -= 7;
      failedTitles.push(objective.title);
      return { ...objective, failed: true };
    }
    return objective;
  });

  let next = {
    ...state,
    objectives,
    cash: state.cash + cashReward,
    reputation: clamp(state.reputation + reputationReward, 1, 100),
    boardConfidence: clamp(state.boardConfidence + confidenceChange, 1, 100),
  };

  completedTitles.forEach((title) => {
    next = addEvent(
      next,
      createEvent(
        state.day,
        "positive",
        "Board objective completed",
        `${title} was completed and the board released a performance reward.`,
      ),
    );
  });
  failedTitles.forEach((title) => {
    next = addEvent(
      next,
      createEvent(
        state.day,
        "warning",
        "Board objective missed",
        `${title} was not completed before the deadline.`,
      ),
    );
  });

  if (
    state.day % 90 === 1 &&
    objectives.every((objective) => objective.completed || objective.failed)
  ) {
    next = {
      ...next,
      objectives: createObjectives(next, state.day),
    };
    next = addEvent(
      next,
      createEvent(
        state.day,
        "neutral",
        "New quarterly mandate",
        "The board has approved three new priorities for the coming quarter.",
      ),
    );
  }
  return next;
}

export function unlockAchievements(state: GameState): GameState {
  const candidates: [string, boolean, string][] = [
    ["thousand-customers", state.customers >= 1_000, "1,000 customers"],
    [
      "million-profit",
      state.totalProfit >= 1_000_000,
      "NOK 1 million lifetime profit",
    ],
    ["trusted-bank", state.reputation >= 80, "Trusted bank"],
    ["national-network", state.branches >= 5, "Regional branch network"],
    ["digital-leader", state.digitalLevel >= 80, "Digital leader"],
    [
      "market-leader",
      state.competitors.length > 0 &&
        state.marketShare >
          Math.max(...state.competitors.map((item) => item.marketShare)),
      "Market leader",
    ],
  ];
  let next = state;
  candidates.forEach(([id, unlocked, title]) => {
    if (unlocked && !next.achievements.includes(id)) {
      next = {
        ...next,
        achievements: [...next.achievements, id],
        personalCash: next.personalCash + 25_000,
      };
      next = addEvent(
        next,
        createEvent(
          next.day,
          "positive",
          `Achievement: ${title}`,
          "The founder received a NOK 25,000 milestone bonus.",
        ),
      );
    }
  });
  return next;
}
