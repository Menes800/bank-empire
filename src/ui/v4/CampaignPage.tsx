import { setStrategicFocus, stageProgress } from "../../game/engine";
import type { GameState } from "../../game/store";
import type { GameAction } from "../common";

const stageNames = { startup: "Local start-up", regional: "Regional bank", national: "National challenger", group: "Listed banking group", empire: "Financial empire" } as const;
const focuses = [
  ["balanced", "Balanced", "Steady growth across profit, trust and resilience."],
  ["growth", "Growth", "Prioritise customers, products and geographic reach."],
  ["efficiency", "Efficiency", "Protect margins and reduce operating pressure."],
  ["trust", "Trust", "Focus on customers, reputation and regulatory quality."],
  ["digital", "Digital", "Build a technology-led bank with fewer physical limits."],
] as const;

export function CampaignPage({ game, action, onNavigate }: { game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const progress = stageProgress(game);
  return <>
    <section className="campaign-stage-card">
      <div><p className="eyebrow light">CAMPAIGN STAGE</p><h2>{stageNames[progress.stage]}</h2><p>Grow the bank through customers, branches, reputation and digital capability. New systems unlock as the institution matures.</p></div>
      <div className="stage-progress"><strong>{progress.progress}%</strong><span>towards next stage</span><div className="stage-track"><i style={{ width: `${progress.progress}%` }} /></div></div>
    </section>

    <section className="campaign-milestones">
      {(["startup", "regional", "national", "group", "empire"] as const).map((stage, index) => <article key={stage} className={stage === game.campaignStage ? "milestone current" : index < ["startup", "regional", "national", "group", "empire"].indexOf(game.campaignStage) ? "milestone completed" : "milestone"}><span>{index + 1}</span><strong>{stageNames[stage]}</strong><small>{stage === "startup" ? "First branch and licence" : stage === "regional" ? "Second market and leadership" : stage === "national" ? "Digital scale and three branches" : stage === "group" ? "Board, acquisitions and reporting" : "Dominant multi-market institution"}</small></article>)}
    </section>

    <section className="content-grid two-column">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">FOUNDER PLAYBOOK</p><h3>Guided objectives</h3></div><span className="status good">{game.tutorialSteps.filter((step) => step.completed).length}/{game.tutorialSteps.length}</span></div>
        <div className="tutorial-list">{game.tutorialSteps.map((step) => <button key={step.id} className={step.completed ? "tutorial-step completed" : "tutorial-step"} onClick={() => onNavigate(step.page)}><span>{step.completed ? "✓" : "○"}</span><div><strong>{step.title}</strong><small>{step.description}</small></div><b>→</b></button>)}</div>
      </article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">GROUP STRATEGY</p><h3>Choose the current focus</h3></div></div>
        <div className="focus-grid">{focuses.map(([key, name, description]) => <button key={key} className={game.strategicFocus === key ? "focus-card selected" : "focus-card"} onClick={() => action((state) => setStrategicFocus(state, key))}><strong>{name}</strong><small>{description}</small></button>)}</div>
      </article>
    </section>
  </>;
}
