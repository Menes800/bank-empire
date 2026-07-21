import { reputationDelta30 } from "../../game/engine";
import type { ExecutiveRole, GameState } from "../../game/store";

const ownerByMetric: Record<string, ExecutiveRole> = {
  service: "COO", compliance: "CRO", technology: "CTO", marketing: "CMO", funding: "CFO",
};

export function ReputationPanel({ game, open, onClose }: { game: GameState; open: boolean; onClose: () => void }) {
  if (!open) return null;
  const delta = reputationDelta30(game);
  const wellbeing = game.employeeRoster.reduce((sum, employee) => sum + (employee.wellbeing ?? employee.energy), 0) / Math.max(1, game.employeeRoster.length);
  const recentHistory = game.history.filter((point) => point.day >= game.day - 180).slice(-18);
  const recentEvents = game.events.filter((event) => event.day >= game.day - 60).slice(0, 8);
  const factors = [
    { key: "service", title: "Customer service", value: game.satisfaction, effect: (game.satisfaction - 70) * .08, owner: ownerByMetric.service },
    { key: "compliance", title: "Compliance", value: game.compliance, effect: (game.compliance - 72) * .07, owner: ownerByMetric.compliance },
    { key: "technology", title: "Technology reliability", value: (game.digitalLevel + game.cyberSecurity) / 2, effect: ((game.digitalLevel + game.cyberSecurity) / 2 - 58) * .045, owner: ownerByMetric.technology },
    { key: "marketing", title: "Brand and market presence", value: game.brandStrength, effect: (game.brandStrength - 50) * .055, owner: ownerByMetric.marketing },
    { key: "funding", title: "Financial resilience", value: (game.capitalRatio * 3 + game.liquidityRatio) / 2, effect: game.capitalRatio >= 12 && game.liquidityRatio >= 18 ? 1.2 : -2.4, owner: ownerByMetric.funding },
  ].sort((a, b) => b.effect - a.effect);

  const metrics = [
    ["Reputation", game.reputation], ["Brand strength", game.brandStrength], ["Customer satisfaction", game.satisfaction],
    ["Board confidence", game.boardConfidence], ["Compliance", game.compliance], ["Employee wellbeing", wellbeing],
  ] as const;

  return <div className="reputation-overlay-v88" role="dialog" aria-modal="true" aria-label="Reputation details">
    <section className="reputation-panel-v88">
      <header><div><p className="eyebrow">GROUP REPUTATION</p><h2>Trust is one outcome, not six duplicate scores.</h2><p>Reputation remains the public headline. Brand, satisfaction, board confidence, compliance and wellbeing are separate drivers.</p></div><button className="icon-button" onClick={onClose} aria-label="Close reputation panel">×</button></header>
      <div className="reputation-hero-v88"><span><small>CURRENT LEVEL</small><strong>{game.reputation.toFixed(0)}</strong></span><div><b className={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)} last 30 days</b><p>{game.reputation >= 75 ? "Strong institutional trust" : game.reputation >= 55 ? "Credible, but still building national trust" : "Trust remains fragile and reacts quickly to failures"}</p></div></div>

      <div className="reputation-metric-grid-v88">{metrics.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value.toFixed(0)}</strong><i><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i></article>)}</div>

      <div className="reputation-layout-v88">
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">DRIVERS</p><h3>What moves the score</h3></div></div><div className="reputation-factors-v88">{factors.map((factor) => <div key={factor.key}><span className={factor.effect >= 0 ? "positive" : "negative"}>{factor.effect >= 0 ? "+" : ""}{factor.effect.toFixed(1)}</span><section><strong>{factor.title}</strong><small>Current level {factor.value.toFixed(0)}</small></section><b>{factor.owner}</b></div>)}</div></article>
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">TREND</p><h3>Last 180 days</h3></div></div><div className="reputation-trend-v88">{recentHistory.length ? recentHistory.map((point) => <span key={point.day} title={`Day ${point.day}: ${point.reputation.toFixed(1)}`} style={{ height: `${Math.max(8, point.reputation)}%` }} />) : <p>No trend history yet.</p>}</div><div className="trend-labels-v88"><small>Older</small><small>Today</small></div></article>
      </div>

      <article className="panel reputation-events-v88"><div className="panel-heading"><div><p className="eyebrow">RECENT EVENTS</p><h3>One timeline, no duplicated system noise</h3></div></div>{recentEvents.length ? recentEvents.map((event) => <div key={event.id}><span className={event.tone}>Day {event.day}</span><section><strong>{event.title}</strong><p>{event.body}</p></section></div>) : <p>No material reputation events in the last 60 days.</p>}</article>
      <button className="primary wide" onClick={onClose}>Close reputation review</button>
    </section>
  </div>;
}
