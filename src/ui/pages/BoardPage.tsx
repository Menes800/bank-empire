import { raiseEquityCapital } from "../../game/engine";
import type { GameState } from "../../game/store";
import { ObjectiveCard, Progress, type GameAction } from "../common";
import { money } from "../format";

export function BoardPage({ game, action }: { game: GameState; action: GameAction }) {
  const daysLeft = Math.max(0, Math.min(...game.objectives.filter((item) => !item.completed && !item.failed).map((item) => item.deadlineDay - game.day), 90));
  return <>
    <section className="board-hero">
      <div><p className="eyebrow light">BOARD OF DIRECTORS</p><h2>{game.boardConfidence.toFixed(0)}/100 confidence</h2><p>The board expects growth, profitability and disciplined risk management. Missed mandates reduce your freedom to act.</p><Progress value={game.boardConfidence} warning={game.boardConfidence < 45} /></div>
      <div className="board-summary"><span><small>Current quarter</small><strong>Q{game.quarter} · Year {game.year}</strong></span><span><small>Next review</small><strong>{daysLeft} days</strong></span><span><small>Share price</small><strong>{money.format(game.sharePrice)}</strong></span></div>
    </section>
    <section className="objective-grid">{game.objectives.map((objective) => <ObjectiveCard key={objective.id} objective={objective} game={game} />)}</section>
    <section className="content-grid two-column">
      <article className="panel"><p className="eyebrow">CAPITAL PLAN</p><h3>Issue new equity</h3><p className="muted">Raise NOK 5 million to strengthen liquidity and regulatory capital. The issue dilutes shareholders and pressures the share price.</p><button className="primary" disabled={game.boardConfidence < 25} onClick={() => action(raiseEquityCapital)}>Raise NOK 5m equity</button></article>
      <article className="panel"><p className="eyebrow">BOARD SCORECARD</p><div className="score-list"><span><small>Capital ratio</small><strong>{game.capitalRatio.toFixed(1)}%</strong></span><span><small>Daily profit</small><strong>{money.format(game.profit)}</strong></span><span><small>Compliance</small><strong>{game.compliance.toFixed(0)}/100</strong></span><span><small>Reputation</small><strong>{game.reputation.toFixed(0)}/100</strong></span></div></article>
    </section>
  </>;
}
