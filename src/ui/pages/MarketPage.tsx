import type { GameState } from "../../game/store";
import type { Competitor } from "../../game/types";
import { CompetitorRow, Progress } from "../common";
import { cn } from "../format";

export function MarketPage({ game }: { game: GameState }) {
  const player = { id: "player", name: game.bankName, strategy: "player" as const, customers: game.customers, deposits: game.deposits, loans: game.loans, reputation: game.reputation, marketShare: game.marketShare, depositRate: game.depositRate, loanRate: game.loanRate, branches: game.branches, digitalLevel: game.digitalLevel, acquisitionPrice: 0 };
  const ranked = [player, ...game.competitors].sort((a, b) => b.marketShare - a.marketShare);
  const recentMoves = game.competitorMoves.slice(0, 8);
  return <>
    <section className={cn("economy-hero", `cycle-${game.economicCycle}`)}><div><p className="eyebrow light">MACRO ECONOMY</p><h2>{game.economicCycle[0].toUpperCase() + game.economicCycle.slice(1)}</h2><p>Economic conditions change every month and affect demand, credit losses and customer confidence.</p></div><div className="economy-stats"><span><small>Policy rate</small><strong>{game.baseRate.toFixed(2)}%</strong></span><span><small>Inflation</small><strong>{game.inflation.toFixed(1)}%</strong></span><span><small>GDP growth</small><strong>{game.gdpGrowth.toFixed(1)}%</strong></span><span><small>Unemployment</small><strong>{game.unemployment.toFixed(1)}%</strong></span><span><small>Confidence</small><strong>{game.consumerConfidence.toFixed(0)}</strong></span></div></section>

    <section className="market-operations-layout">
      <article className="panel market-table"><div className="panel-heading"><div><p className="eyebrow">COMPETITIVE LANDSCAPE</p><h3>Market ranking</h3></div></div>{ranked.map((item, index) => item.id === "player" ? <div className="competitor-row player-row" key={item.id}><span className="rank-number">{index + 1}</span><div className="competitor-logo">{game.bankName.slice(0, 1)}</div><div><strong>{game.bankName}</strong><small>Your bank · {game.customers.toLocaleString("en-GB")} customers</small></div><span><small>Market share</small><b>{game.marketShare.toFixed(2)}%</b></span><span><small>Reputation</small><b>{game.reputation.toFixed(0)}</b></span></div> : <CompetitorRow key={item.id} competitor={item as Competitor} rank={index + 1} />)}</article>

      <aside className="panel competitor-move-panel"><div className="panel-heading"><div><p className="eyebrow">COMPETITOR INTELLIGENCE</p><h3>Recent market moves</h3></div><span className="status good">Monthly cycle</span></div>{recentMoves.length === 0 ? <div className="empty-state"><strong>No competitor move has completed yet.</strong><p>Advance to the next monthly close. Rivals will change pricing, open branches, launch digital improvements and compete for talent.</p></div> : <div className="competitor-move-list">{recentMoves.map((move) => <article key={move.id}><span>{move.type.slice(0, 2).toUpperCase()}</span><div><small>DAY {move.day} · {move.competitorName}</small><strong>{move.title}</strong><p>{move.description}</p></div><b>Impact {move.impact}</b></article>)}</div>}</aside>
    </section>

    <section className="content-grid two-column"><article className="panel"><p className="eyebrow">CUSTOMER CONFIDENCE</p><h3>{game.consumerConfidence.toFixed(0)}/100</h3><Progress value={game.consumerConfidence} warning={game.consumerConfidence < 45} /><p className="muted">Higher confidence supports borrowing and lower default rates.</p></article><article className="panel"><p className="eyebrow">PRICING POSITION</p><div className="score-list"><span><small>Your savings rate</small><strong>{game.depositRate.toFixed(2)}%</strong></span><span><small>Best competitor</small><strong>{Math.max(...game.competitors.map((item) => item.depositRate)).toFixed(2)}%</strong></span><span><small>Your loan rate</small><strong>{game.loanRate.toFixed(2)}%</strong></span><span><small>Lowest competitor</small><strong>{Math.min(...game.competitors.map((item) => item.loanRate)).toFixed(2)}%</strong></span></div></article></section>
  </>;
}
