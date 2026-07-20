import { setStrategicPlan, stageProgress } from "../../game/engine";
import type { GameState } from "../../game/store";
import type { GameAction } from "../common";

const stageNames = { startup: "Local start-up", regional: "Regional bank", national: "National challenger", group: "Listed banking group", empire: "Financial empire" } as const;
const focuses = [
  { key: "balanced", name: "Balanced", description: "Steady management with small improvements to trust and board confidence.", effects: ["Low cost", "Small service gain", "Low risk"], owner: "CEO team" },
  { key: "growth", name: "Growth", description: "Spend weekly to accelerate customers and brand strength.", effects: ["Faster customers", "$32k/week", "Slightly higher risk"], owner: "CMO + COO" },
  { key: "efficiency", name: "Efficiency", description: "Convert operating improvements directly into cash and profit.", effects: ["Lower daily cost", "Better margins", "Slower expansion"], owner: "CFO + COO" },
  { key: "trust", name: "Trust", description: "Improve satisfaction, reputation and compliance every week.", effects: ["Lower churn", "Stronger controls", "Slower growth"], owner: "CRO + COO" },
  { key: "digital", name: "Digital", description: "Invest every week in technology, cyber security and digital service.", effects: ["Digital growth", "$42k/week", "Less branch pressure"], owner: "CTO" },
] as const;

export function CampaignPage({ game, action, onNavigate }: { game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const progress = stageProgress(game);
  const tutorialComplete = game.tutorialSteps.every((step) => step.completed);
  const daysRemaining = Math.max(0, game.strategyReviewDay - game.day);
  const stageMetrics = [
    { label: "Customers", current: game.customers, target: progress.target.customers, format: (value: number) => value.toLocaleString("en-GB") },
    { label: "Branches", current: game.branchOffices.length, target: progress.target.branches, format: (value: number) => `${value}` },
    { label: "Reputation", current: game.reputation, target: progress.target.reputation, format: (value: number) => value.toFixed(0) },
    { label: "Digital", current: game.digitalLevel, target: progress.target.digital, format: (value: number) => value.toFixed(0) },
  ];

  return <>
    <section className="campaign-stage-card strategy-hero">
      <div><p className="eyebrow light">CEO STRATEGY CENTRE</p><h2>{stageNames[progress.stage]}</h2><p>This page now controls a real 90-day operating plan. The selected strategy changes cash, customers, risk, technology or trust while time advances.</p></div>
      <div className="stage-progress"><strong>{progress.progress}%</strong><span>towards next stage</span><div className="stage-track"><i style={{ width: `${progress.progress}%` }} /></div></div>
    </section>

    <section className="panel stage-requirements-panel">
      <div className="panel-heading"><div><p className="eyebrow">NEXT STAGE REQUIREMENTS</p><h3>What is still missing</h3></div><span className="status good">{stageNames[progress.stage]}</span></div>
      <div className="stage-requirements-grid">{stageMetrics.map((metric) => { const ratio = Math.min(100, metric.current / Math.max(1, metric.target) * 100); const missing = Math.max(0, metric.target - metric.current); return <article key={metric.label}><div><strong>{metric.label}</strong><small>{missing <= 0 ? "Requirement met" : `${metric.format(missing)} still needed`}</small></div><b>{metric.format(metric.current)} / {metric.format(metric.target)}</b><div className="stage-track"><i style={{ width: `${ratio}%` }} /></div></article>; })}</div>
    </section>

    <section className="panel active-strategy-card">
      <div><p className="eyebrow">CURRENT 90-DAY PLAN</p><h3>{focuses.find((focus) => focus.key === game.strategicFocus)?.name}</h3><p>{focuses.find((focus) => focus.key === game.strategicFocus)?.description}</p></div>
      <div className="strategy-countdown"><strong>{daysRemaining}</strong><span>days to review</span></div>
      <div className="strategy-owner"><small>Management owner</small><strong>{focuses.find((focus) => focus.key === game.strategicFocus)?.owner}</strong></div>
    </section>

    <section className="strategy-choice-grid">
      {focuses.map((focus) => <button key={focus.key} className={game.strategicFocus === focus.key ? "strategy-choice selected" : "strategy-choice"} onClick={() => action((state) => setStrategicPlan(state, focus.key))}>
        <div><span>{focus.name.slice(0, 1)}</span><div><strong>{focus.name}</strong><small>{focus.owner}</small></div></div>
        <p>{focus.description}</p>
        <ul>{focus.effects.map((effect) => <li key={effect}>{effect}</li>)}</ul>
        <b>{game.strategicFocus === focus.key ? "Active plan" : "Approve for 90 days →"}</b>
      </button>)}
    </section>

    <section className="content-grid two-column campaign-bottom-grid">
      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">CEO DELEGATION CHECK</p><h3>Who will execute the plan?</h3></div></div>
        <div className="strategy-delegation-list">
          <DelegationRow role="CFO" name={game.employeeRoster.find((employee) => employee.executiveRole === "CFO")?.name} mandate={game.automation.treasury} page="leadership" onNavigate={onNavigate} />
          <DelegationRow role="COO" name={game.employeeRoster.find((employee) => employee.executiveRole === "COO")?.name} mandate={game.automation.operations} page="leadership" onNavigate={onNavigate} />
          <DelegationRow role="CRO" name={game.employeeRoster.find((employee) => employee.executiveRole === "CRO")?.name} mandate={game.automation.lending} page="leadership" onNavigate={onNavigate} />
          <DelegationRow role="CMO" name={game.employeeRoster.find((employee) => employee.executiveRole === "CMO")?.name} mandate={game.automation.marketing} page="leadership" onNavigate={onNavigate} />
          <DelegationRow role="CTO" name={game.employeeRoster.find((employee) => employee.executiveRole === "CTO")?.name} mandate={game.employeeRoster.some((employee) => employee.executiveRole === "CTO") ? "active" : "vacant"} page="leadership" onNavigate={onNavigate} />
        </div>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">{tutorialComplete ? "NEXT CEO MOVES" : "FOUNDER PLAYBOOK"}</p><h3>{tutorialComplete ? "Recommended actions" : "Guided objectives"}</h3></div><span className="status good">{game.tutorialSteps.filter((step) => step.completed).length}/{game.tutorialSteps.length}</span></div>
        {tutorialComplete ? <div className="ceo-action-list">
          <button onClick={() => onNavigate("network")}><span>01</span><div><strong>Review branch mandates</strong><small>Managers should own local service, deposits and capacity.</small></div><b>→</b></button>
          <button onClick={() => onNavigate("clients")}><span>02</span><div><strong>Simplify product and credit decisions</strong><small>Use a preset and review only exceptional loans.</small></div><b>→</b></button>
          <button onClick={() => onNavigate("overview")}><span>03</span><div><strong>Review cash movement</strong><small>See exactly why liquid cash increased or fell.</small></div><b>→</b></button>
        </div> : <div className="tutorial-list">{game.tutorialSteps.map((step) => <button key={step.id} className={step.completed ? "tutorial-step completed" : "tutorial-step"} onClick={() => onNavigate(step.page)}><span>{step.completed ? "✓" : "○"}</span><div><strong>{step.title}</strong><small>{step.description}</small></div><b>→</b></button>)}</div>}
      </article>
    </section>
  </>;
}

function DelegationRow({ role, name, mandate, page, onNavigate }: { role: string; name?: string; mandate: string; page: string; onNavigate: (page: string) => void }) {
  const ready = Boolean(name) && mandate !== "manual" && mandate !== "vacant";
  return <button onClick={() => onNavigate(page)}><span className={ready ? "ready" : "not-ready"}>{ready ? "✓" : "!"}</span><div><strong>{role} · {name ?? "Vacant"}</strong><small>{name ? `Mandate: ${mandate}` : "Appoint a specialist to delegate this area"}</small></div><b>→</b></button>;
}
