import { reputationDelta30, SERVICE_REASSIGNMENT } from "../../game/engine";
import { getReputationDrivers, reputationDirection, reputationLevelLabel, reputationNarrative } from "../../game/v810/insights";
import type { GameState } from "../../game/store";
import type { GameEvent } from "../../game/types";

function materialEvents(events: GameEvent[], currentDay: number) {
  const excluded = /credit ·|requires credit authority|handled|management report|monthly economic report|trading update/i;
  const relevant = /deposit pressure|customer|branch|campaign|brand|compliance|cyber|security|outage|fraud|licen[cs]e|capital|funding|objective|project|reputation|crisis/i;
  const groups = new Map<string, { event: GameEvent; count: number }>();
  for (const event of events.filter((item) => item.day >= currentDay - 90 && !excluded.test(item.title) && (relevant.test(`${item.title} ${item.body}`) || item.tone === "warning"))) {
    const key = event.title.toLowerCase().replace(/\d+/g, "#").trim();
    const current = groups.get(key);
    if (current) current.count += 1; else groups.set(key, { event, count: 1 });
  }
  return [...groups.values()].sort((a, b) => b.event.day - a.event.day).slice(0, 6);
}

export function ReputationPanel({ game, open, onClose }: { game: GameState; open: boolean; onClose: () => void }) {
  if (!open) return null;
  const delta = reputationDelta30(game);
  const wellbeing = game.employeeRoster.reduce((sum, employee) => sum + (employee.wellbeing ?? employee.energy), 0) / Math.max(1, game.employeeRoster.length);
  const recentHistory = game.history.filter((point) => point.day >= game.day - 120).slice(-40);
  const recentEvents = materialEvents(game.events, game.day);
  const drivers = getReputationDrivers(game).sort((a, b) => b.dailyEffect - a.dailyEffect);
  const direction = reputationDirection(game);
  const serviceDaysRemaining = game.serviceIntervention ? Math.max(0, game.serviceIntervention.endDay - game.day) : 0;
  const metrics = [
    ["Public reputation", game.reputation], ["Brand strength", game.brandStrength], ["Customer satisfaction", game.satisfaction],
    ["Board confidence", game.boardConfidence], ["Compliance", game.compliance], ["Employee wellbeing", wellbeing],
  ] as const;
  const points = recentHistory.map((point, index) => `${recentHistory.length === 1 ? 0 : index / (recentHistory.length - 1) * 100},${40 - Math.max(1, Math.min(100, point.reputation)) * .38}`).join(" ");

  return <div className="reputation-overlay-v88" role="dialog" aria-modal="true" aria-label="Reputation details">
    <section className="reputation-panel-v88 v810-reputation-panel">
      <header><div><p className="eyebrow">GROUP REPUTATION</p><h2>Why the public trusts — or distrusts — the bank</h2><p>The headline score is public reputation. The 30-day number is the realised change; the driver list shows the current pressure likely to shape the next period.</p></div><button className="icon-button" onClick={onClose} aria-label="Close reputation panel">×</button></header>
      <div className="v810-reputation-hero"><div><small>CURRENT REPUTATION</small><strong>{game.reputation.toFixed(0)}</strong><span>{reputationLevelLabel(game.reputation)}</span></div><section><b className={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)} realised in the last 30 days</b><h3>Direction: {direction}</h3><p>{reputationNarrative(game)}</p></section></div>
      {serviceDaysRemaining > 0 && <article className="v812-service-intervention"><span>ACTIVE SERVICE MEASURE</span><div><strong>Teams reassigned · {serviceDaysRemaining} days remaining</strong><p>Service capacity is doubled while new-customer growth is reduced by {(1 - SERVICE_REASSIGNMENT.customerGrowthMultiplier) * 100}%. Satisfaction is protected from the normal overload decline until day {game.serviceIntervention?.endDay}.</p></div><b>{Math.round((game.serviceIntervention!.endDay - game.serviceIntervention!.startDay - serviceDaysRemaining) / SERVICE_REASSIGNMENT.durationDays * 100)}%</b></article>}
      <div className="v810-reputation-metrics">{metrics.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value.toFixed(0)}</strong><i><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i></article>)}</div>
      <div className="v810-reputation-layout">
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">FORWARD PRESSURE</p><h3>What is pushing trust next</h3><p>Monthly pressure is an explanatory estimate, not an instant addition to the headline score.</p></div></div><div className="v810-reputation-drivers">{drivers.map((driver) => { const monthly = driver.dailyEffect * 30; return <div key={driver.key}><span className={monthly >= 0 ? "positive" : "negative"}>{monthly >= 0 ? "+" : ""}{monthly.toFixed(1)} / mo</span><section><strong>{driver.title}</strong><small>Current level {driver.level.toFixed(0)} · {driver.explanation}</small></section><b>{driver.owner}</b></div>; })}</div></article>
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">REAL TREND</p><h3>{recentHistory.length >= 3 ? `Last ${Math.min(120, game.day)} days` : "Not enough history yet"}</h3><p>The line uses saved reputation snapshots, so it shows what actually happened.</p></div></div>{recentHistory.length >= 3 ? <div className="v810-reputation-trend"><svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Reputation trend"><line x1="0" y1="20" x2="100" y2="20" /><polyline points={points} /></svg><div><small>Day {recentHistory[0].day}</small><strong>{recentHistory[recentHistory.length - 1].reputation.toFixed(0)} today</strong><small>Day {recentHistory[recentHistory.length - 1].day}</small></div></div> : <div className="v89-compact-empty"><strong>Trend begins after more simulated days</strong><span>The 30-day result above remains accurate even while the longer trend is still forming.</span></div>}</article>
      </div>
      <article className="panel v810-reputation-events"><div className="panel-heading"><div><p className="eyebrow">MATERIAL EVENTS</p><h3>Only events that can explain trust</h3><p>Routine credit decisions and repeated system reports are removed or consolidated.</p></div></div>{recentEvents.length ? recentEvents.map(({ event, count }) => <div key={event.id}><span className={event.tone}>Day {event.day}</span><section><strong>{event.title}{count > 1 ? ` · ${count} related events` : ""}</strong><p>{event.body.replace(/Consolidated from \d+ related updates\./g, "").trim()}</p></section></div>) : <div className="v89-compact-empty"><strong>No material trust event in the last 90 days</strong><span>Normal management activity is still available in Workforce and the CEO Inbox.</span></div>}</article>
      <button className="primary wide" onClick={onClose}>Close reputation review</button>
    </section>
  </div>;
}
