import type {
  BoardObjective,
  Competitor,
  GameState,
  HistoryPoint,
} from "../game/types";
import { cn, money } from "./format";

export type GameAction = (fn: (state: GameState) => GameState) => void;

export function Metric({
  label,
  value,
  change,
  tone = "default",
}: {
  label: string;
  value: string;
  change: string;
  tone?: "default" | "good" | "warn";
}) {
  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className={cn("metric-change", tone)}>{change}</div>
    </article>
  );
}

export function Progress({
  value,
  warning = false,
}: {
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="progress-track">
      <div
        className={cn("progress-fill", warning && "warning")}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Sparkline({
  points,
  accessor,
}: {
  points: HistoryPoint[];
  accessor: (point: HistoryPoint) => number;
}) {
  const values = points.slice(-45).map(accessor);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(1, max - min);
  const coordinates = values
    .map((value, index) => {
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 94 - ((value - min) / range) * 82;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line x1="0" y1="50" x2="100" y2="50" className="chart-zero" />
      <polyline points={coordinates} fill="none" className="chart-line" />
    </svg>
  );
}

export function ObjectiveCard({
  objective,
  game,
}: {
  objective: BoardObjective;
  game: GameState;
}) {
  const current = Number(game[objective.metric]);
  const progress = (current / Math.max(1, objective.target)) * 100;
  const daysLeft = Math.max(0, objective.deadlineDay - game.day);
  return (
    <article
      className={cn(
        "objective-card",
        objective.completed && "completed",
        objective.failed && "failed",
      )}
    >
      <div className="objective-topline">
        <span>
          {objective.completed
            ? "Completed"
            : objective.failed
              ? "Missed"
              : `${daysLeft} days left`}
        </span>
        <strong>{Math.min(100, Math.max(0, progress)).toFixed(0)}%</strong>
      </div>
      <h3>{objective.title}</h3>
      <p>{objective.description}</p>
      <Progress value={progress} warning={daysLeft < 15 && !objective.completed} />
      <small>
        Reward: {money.format(objective.rewardCash)} + {objective.rewardReputation} reputation
      </small>
    </article>
  );
}

export function CompetitorRow({ competitor, rank }: { competitor: Competitor; rank: number }) {
  const strategyLabel = { digital: "Digital bank", premium: "Private bank", volume: "Low-price bank", conservative: "Conservative bank", business: "Business bank", community: "Community bank", challenger: "Challenger bank" }[competitor.strategy];
  return (
    <div className="competitor-row">
      <span className="rank-number">{rank}</span>
      <div className="competitor-logo">{competitor.name.slice(0, 1)}</div>
      <div>
        <strong>{competitor.name}</strong>
        <small>{strategyLabel} · {competitor.specialty ?? `${competitor.customers.toLocaleString("en-GB")} customers`}</small>
      </div>
      <span><small>Market share</small><b>{competitor.marketShare.toFixed(2)}%</b></span>
      <span><small>Reputation</small><b>{competitor.reputation.toFixed(0)}</b></span>
    </div>
  );
}
