import { useState } from "react";
import type { GameState } from "../../game/types";
import { TECH_CATALOG_V9, getTechnologyEffectsV9, readV9, technologyAvailabilityV9, type TechnologyTrackV9 } from "../../game/v9/model";
import { startTechnologyV9, TECHNOLOGY_TRACK_ORDER_V9 } from "../../game/v9/gameplay";
import type { GameAction } from "../common";
import { money } from "../format";

const trackCopy: Record<TechnologyTrackV9, { title: string; description: string; code: string }> = {
  core: { title: "Core systems", description: "Reliability, cloud and processing infrastructure", code: "CO" },
  digital: { title: "Digital banking", description: "Mobile, onboarding, lending and self-service", code: "DI" },
  automation: { title: "Automation & AI", description: "Document, service and decision support", code: "AI" },
  data: { title: "Data & analytics", description: "Customer, pricing and risk intelligence", code: "DA" },
  cyber: { title: "Cybersecurity", description: "Identity, monitoring and incident response", code: "CY" },
  compliance: { title: "Risk & compliance", description: "KYC, AML and regulatory reporting", code: "RC" },
  payments: { title: "Payments", description: "Cards, instant payments and merchant services", code: "PA" },
};

export function TechnologyPageV9({ game, action }: { game: GameState; action: GameAction }) {
  const [track, setTrack] = useState<TechnologyTrackV9>("core");
  const v9 = readV9(game);
  const effects = getTechnologyEffectsV9(game);
  const nodes = TECH_CATALOG_V9.filter((node) => node.track === track);
  const completedLevels = Object.values(v9.technologies).reduce((sum, progress) => sum + progress.level, 0);
  const activeProjects = game.projects.filter((project) => project.status !== "completed" && project.id.startsWith("v9-tech-"));

  return <>
    <section className="v9-command-hero technology-v9-hero">
      <div><p className="eyebrow light">TECHNOLOGY & CAPABILITY</p><h2>A real technology roadmap</h2><p>Every investment has prerequisites, delivery risk and measurable effects on cost, capacity, credit, compliance and security.</p></div>
      <div className="v9-hero-stats"><span><small>Completed levels</small><strong>{completedLevels}</strong></span><span><small>Active programmes</small><strong>{activeProjects.length}/2</strong></span><span><small>Digital capacity</small><strong>+{effects.digitalCapacity.toFixed(0)}%</strong></span><span><small>Cost reduction</small><strong>{effects.operatingCostReduction.toFixed(1)}%</strong></span></div>
    </section>

    <section className="v9-tech-impact-grid">
      <Impact label="Operating cost" value={`-${effects.operatingCostReduction.toFixed(1)}%`} />
      <Impact label="Digital capacity" value={`+${effects.digitalCapacity.toFixed(0)}%`} />
      <Impact label="Staff efficiency" value={`+${effects.staffEfficiency.toFixed(0)}%`} />
      <Impact label="Credit speed" value={`+${effects.creditSpeed.toFixed(0)}%`} />
      <Impact label="Fraud reduction" value={`-${effects.fraudReduction.toFixed(0)}%`} />
      <Impact label="Compliance" value={`+${effects.compliance.toFixed(0)}`} />
      <Impact label="Cyber strength" value={`+${effects.cyber.toFixed(0)}`} />
      <Impact label="Project speed" value={`+${effects.projectSpeed.toFixed(0)}%`} />
    </section>

    <nav className="v9-tech-track-nav panel">{TECHNOLOGY_TRACK_ORDER_V9.map((key) => <button key={key} className={track === key ? "active" : ""} onClick={() => setTrack(key)}><span>{trackCopy[key].code}</span><div><strong>{trackCopy[key].title}</strong><small>{trackCopy[key].description}</small></div><b>{TECH_CATALOG_V9.filter((node) => node.track === key).reduce((sum, node) => sum + (v9.technologies[node.id]?.level ?? 0), 0)}</b></button>)}</nav>

    <section className="panel v9-tech-tree-panel">
      <div className="panel-heading"><div><p className="eyebrow">{trackCopy[track].title.toUpperCase()}</p><h3>{trackCopy[track].description}</h3></div><span className={activeProjects.length >= 2 ? "status warn" : "status good"}>{activeProjects.length >= 2 ? "Delivery capacity full" : "Delivery capacity available"}</span></div>
      <div className="v9-tech-tree">{nodes.map((node) => {
        const availability = technologyAvailabilityV9(game, node);
        const nextLevel = Math.min(node.maxLevel, availability.progress.level + 1);
        const cost = Math.round(node.cost * (1 + (nextLevel - 1) * .42));
        const duration = Math.round(node.durationDays * (1 + (nextLevel - 1) * .18));
        const disabled = availability.maxed || availability.researching || !availability.prerequisitesMet || activeProjects.length >= 2 || game.cash < cost + 350_000;
        return <article key={node.id} className={`v9-tech-node ${availability.progress.status}`}>
          <header><span>Tier {node.tier}</span><b>Level {availability.progress.level}/{node.maxLevel}</b></header>
          <h4>{node.name}</h4><p>{node.description}</p>
          <div className="v9-tech-effects">{Object.entries(node.effects).map(([key, value]) => <span key={key}><small>{effectLabel(key)}</small><strong>+{value}{key === "compliance" || key === "cyber" ? "" : "%"}</strong></span>)}</div>
          {node.prerequisites.length > 0 && <div className="v9-tech-prerequisites"><small>REQUIRES</small>{node.prerequisites.map((required) => { const parent = TECH_CATALOG_V9.find((item) => item.id === required.id); const met = (v9.technologies[required.id]?.level ?? 0) >= required.level || v9.devTechUnlocked; return <span key={required.id} className={met ? "met" : "missing"}>{parent?.name ?? required.id} L{required.level}</span>; })}</div>}
          <footer><div><small>{availability.maxed ? "COMPLETED" : availability.researching ? "IN DELIVERY" : `NEXT: LEVEL ${nextLevel}`}</small><strong>{availability.maxed ? "Max capability" : `${money.format(cost)} · ${duration} days`}</strong></div><button className="primary small" disabled={disabled} onClick={() => action((state) => startTechnologyV9(state, node.id))}>{availability.maxed ? "Completed" : availability.researching ? "Researching" : !availability.prerequisitesMet ? "Locked" : "Start project"}</button></footer>
        </article>;
      })}</div>
    </section>

    <section className="panel v9-tech-delivery-panel">
      <div className="panel-heading"><div><p className="eyebrow">DELIVERY</p><h3>Active technology programmes</h3></div></div>
      {activeProjects.length === 0 ? <div className="empty-state"><strong>No technology programme is active.</strong><p>Select an available capability above. The CTO may run two programmes in parallel.</p></div> : <div className="v9-project-list">{activeProjects.map((project) => <article key={project.id}><div><strong>{project.name}</strong><small>{project.status} · {project.remainingDays} days remaining</small></div><progress max={project.durationDays} value={project.durationDays - project.remainingDays} /><span>{money.format(project.budget)}</span></article>)}</div>}
    </section>
  </>;
}

function effectLabel(key: string) {
  const labels: Record<string, string> = { operatingCostReduction: "Cost", digitalCapacity: "Capacity", staffEfficiency: "Staff", creditSpeed: "Credit", fraudReduction: "Fraud", compliance: "Compliance", cyber: "Cyber", projectSpeed: "Delivery", feeIncome: "Fees" };
  return labels[key] ?? key;
}
function Impact({ label, value }: { label: string; value: string }) { return <article className="v9-metric"><small>{label}</small><strong>{value}</strong></article>; }
