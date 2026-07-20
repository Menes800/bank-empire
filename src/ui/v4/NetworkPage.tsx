import { useMemo, useState } from "react";
import { startBranchProject, startBranchUpgrade, startStrategicProject } from "../../game/engine";
import type { BranchProfile, GameState } from "../../game/store";
import type { GameAction } from "../common";
import { money } from "../format";

const stageOrder = ["startup", "regional", "national", "group", "empire"];
const profiles: BranchProfile[] = ["retail", "mortgage", "business", "wealth"];

export function NetworkPage({ game, action }: { game: GameState; action: GameAction }) {
  const [selectedDistrict, setSelectedDistrict] = useState(game.districts[0]?.id ?? "");
  const [profile, setProfile] = useState<BranchProfile>("retail");
  const district = game.districts.find((item) => item.id === selectedDistrict) ?? game.districts[0];
  const branch = game.branchOffices.find((item) => item.districtId === district?.id);
  const activeProject = game.projects.find((project) => project.districtId === district?.id && project.status !== "completed");
  const activeProjects = useMemo(() => game.projects.filter((project) => project.status !== "completed"), [game.projects]);

  return <>
    <section className="network-layout">
      <article className="panel district-map-card">
        <div className="panel-heading"><div><p className="eyebrow">REGIONAL NETWORK</p><h3>Choose where to grow</h3></div><span className="status good">{game.branchOffices.length} locations</span></div>
        <div className="district-map">
          <div className="map-water" />
          <div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" />
          {game.districts.map((item) => {
            const owned = game.branchOffices.some((office) => office.districtId === item.id);
            const building = game.projects.some((project) => project.districtId === item.id && project.status !== "completed");
            const locked = stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(item.requiredStage);
            return <button key={item.id} className={`district-node ${owned ? "owned" : ""} ${building ? "building" : ""} ${locked ? "locked" : ""} ${selectedDistrict === item.id ? "selected" : ""}`} style={{ left: `${item.mapX}%`, top: `${item.mapY}%` }} onClick={() => setSelectedDistrict(item.id)}><span>{owned ? "B" : building ? "…" : locked ? "×" : "+"}</span><small>{item.name}</small></button>;
          })}
        </div>
      </article>

      {district && <article className="panel district-detail">
        <p className="eyebrow">SELECTED MARKET</p><h2>{district.name}</h2><p>{district.description}</p>
        <div className="district-stats"><span><small>Population</small><strong>{district.population.toLocaleString("en-GB")}</strong></span><span><small>Income index</small><strong>{district.incomeIndex}</strong></span><span><small>Competition</small><strong>{district.competition}/100</strong></span><span><small>Digital affinity</small><strong>{district.digitalAffinity}/100</strong></span></div>
        <div className="demand-bars"><Demand label="Retail" value={district.retailDemand} /><Demand label="Mortgage" value={district.mortgageDemand} /><Demand label="Business" value={district.businessDemand} /><Demand label="Wealth" value={district.wealthDemand} /></div>
        {branch ? <div className="branch-detail-box"><div><strong>{branch.name}</strong><small>Level {branch.level} · {branch.profile} · capacity {branch.capacity}</small></div><button className="secondary" disabled={branch.level >= 3 || game.cash < (branch.level === 1 ? 1_150_000 : 2_100_000)} onClick={() => action((state) => startBranchUpgrade(state, branch.id))}>{branch.level >= 3 ? "Fully upgraded" : "Upgrade branch"}</button></div> : activeProject ? <div className="project-inline"><strong>Opening in {activeProject.remainingDays} days</strong><div className="stage-track"><i style={{ width: `${100 - activeProject.remainingDays / activeProject.durationDays * 100}%` }} /></div></div> : <><label className="field-label">Branch profile</label><div className="profile-tabs">{profiles.map((item) => <button key={item} className={profile === item ? "selected" : ""} onClick={() => setProfile(item)}>{item}</button>)}</div><button className="primary wide" disabled={game.cash < district.openingCost || stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(district.requiredStage)} onClick={() => action((state) => startBranchProject(state, district.id, profile))}>{stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(district.requiredStage) ? `Requires ${district.requiredStage} stage` : `Open branch · ${money.format(district.openingCost)}`}</button></>}
      </article>}
    </section>

    <section className="content-grid two-column project-section">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">STRATEGIC PROJECTS</p><h3>Transformation portfolio</h3></div></div><div className="strategic-project-grid"><ProjectLaunch title="Mobile bank 2.0" body="Improves digital service, brand and customer satisfaction." cost={2_600_000} days={120} disabled={game.cash < 2_600_000 || game.projects.some((project) => project.kind === "mobile-bank" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "mobile-bank"))} /><ProjectLaunch title="Core banking renewal" body="Raises cyber security, compliance and long-term scalability." cost={5_500_000} days={210} disabled={game.cash < 5_500_000 || game.projects.some((project) => project.kind === "core-banking" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "core-banking"))} /><ProjectLaunch title="Regional head office" body="Strengthens board confidence and institutional reputation." cost={8_000_000} days={270} disabled={game.cash < 8_000_000 || game.projects.some((project) => project.kind === "head-office" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "head-office"))} /></div></article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">DELIVERY PIPELINE</p><h3>{activeProjects.length} active projects</h3></div></div>{activeProjects.length === 0 ? <div className="empty-state">No active projects. Select a district or strategic programme to begin.</div> : <div className="project-list">{activeProjects.map((project) => <div key={project.id} className="project-row"><div><strong>{project.name}</strong><small>{project.status} · {project.remainingDays} days remaining</small></div><span>{Math.round(100 - project.remainingDays / project.durationDays * 100)}%</span><div className="stage-track"><i style={{ width: `${100 - project.remainingDays / project.durationDays * 100}%` }} /></div></div>)}</div>}</article>
    </section>
  </>;
}

function Demand({ label, value }: { label: string; value: number }) { return <div><span>{label}<b>{value}</b></span><div className="stage-track"><i style={{ width: `${value}%` }} /></div></div>; }
function ProjectLaunch({ title, body, cost, days, disabled, onClick }: { title: string; body: string; cost: number; days: number; disabled: boolean; onClick: () => void }) { return <button className="project-launch" disabled={disabled} onClick={onClick}><strong>{title}</strong><small>{body}</small><span>{money.format(cost)} · {days} days</span></button>; }
