import { useMemo, useState } from "react";
import { assignBranchManager, setBranchFocus, setBranchMandate, startBranchProject, startBranchUpgrade, startStrategicProject } from "../../game/engine";
import type { BranchFocus, BranchMandate, BranchProfile, GameState } from "../../game/store";
import type { BankProject, BranchOffice, District } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const stageOrder = ["startup", "regional", "national", "group", "empire"];
const profiles: BranchProfile[] = ["retail", "mortgage", "business", "wealth"];
const mandates: BranchMandate[] = ["manual", "guarded", "autonomous", "growth"];
const focuses: BranchFocus[] = ["service", "deposits", "lending", "business"];
type MapMode = "potential" | "competition" | "income" | "risk" | "coverage";

const mapModes: { key: MapMode; label: string; help: string }[] = [
  { key: "potential", label: "Potential", help: "Overall opportunity from population and local demand." },
  { key: "competition", label: "Competition", help: "How hard rival banks are fighting for customers." },
  { key: "income", label: "Income", help: "Local income and premium-product potential." },
  { key: "risk", label: "Credit risk", help: "Estimated risk from income, competition and business mix." },
  { key: "coverage", label: "Your coverage", help: "How strongly your existing network serves each area." },
];

const districtShapes: Record<string, string> = {
  industrial: "M4 10 L29 7 L36 28 L27 45 L5 40 Z",
  coast: "M29 4 L64 5 L67 25 L51 34 L35 28 Z",
  university: "M66 7 L94 10 L96 38 L76 43 L65 27 Z",
  central: "M35 29 L65 26 L76 44 L67 63 L39 61 L27 45 Z",
  harbour: "M4 42 L28 46 L40 63 L34 91 L7 88 L2 66 Z",
  garden: "M40 63 L67 64 L78 88 L54 97 L34 91 Z",
  ridge: "M68 45 L96 40 L98 85 L79 89 L67 63 Z",
};

const profileCopy: Record<BranchProfile, { title: string; bestFor: string }> = {
  retail: { title: "Retail branch", bestFor: "Everyday banking and mixed households" },
  mortgage: { title: "Mortgage centre", bestFor: "Families and secured lending" },
  business: { title: "Business hub", bestFor: "SMEs and corporate deposits" },
  wealth: { title: "Private banking office", bestFor: "Affluent and wealth clients" },
};

const mandateCopy: Record<BranchMandate, string> = {
  manual: "The manager only reports. You make local decisions.",
  guarded: "Small local actions up to about $15k per month.",
  autonomous: "The manager actively improves the chosen focus for about $30k per month.",
  growth: "Aggressive local growth with about $55k monthly authority.",
};

const focusCopy: Record<BranchFocus, string> = {
  service: "Improve queues, capacity and satisfaction.",
  deposits: "Attract customers and liquid deposits.",
  lending: "Originate local loans when treasury permits.",
  business: "Build SME relationships, deposits and selective lending.",
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function districtPotential(district: District) {
  const strongestDemand = Math.max(district.retailDemand, district.mortgageDemand, district.businessDemand, district.wealthDemand);
  return clamp(Math.round(strongestDemand * 0.56 + district.population / 1_900 + district.digitalAffinity * 0.12 - district.competition * 0.18));
}
function districtRisk(district: District) { return clamp(Math.round(28 + district.competition * 0.3 + Math.max(0, 110 - district.incomeIndex) * 0.35 + district.businessDemand * 0.12)); }
function bestProfile(district: District): BranchProfile {
  const scores: Record<BranchProfile, number> = { retail: district.retailDemand, mortgage: district.mortgageDemand, business: district.businessDemand, wealth: district.wealthDemand };
  return profiles.reduce((best, item) => scores[item] > scores[best] ? item : best, "retail");
}
function scoreForMode(game: GameState, district: District, mode: MapMode) {
  const branch = game.branchOffices.find((office) => office.districtId === district.id);
  const project = game.projects.find((item) => item.districtId === district.id && item.status !== "completed");
  if (mode === "competition") return district.competition;
  if (mode === "income") return clamp(Math.round(district.incomeIndex / 1.75));
  if (mode === "risk") return districtRisk(district);
  if (mode === "coverage") return branch ? clamp(58 + branch.level * 14) : project ? 42 : 8;
  return districtPotential(district);
}
function levelForScore(score: number) { return score >= 78 ? "very-high" : score >= 60 ? "high" : score >= 40 ? "medium" : "low"; }
function projectPhase(project: BankProject) { const progress = 100 - project.remainingDays / Math.max(1, project.durationDays) * 100; return progress < 15 ? "Planning" : progress < 72 ? "Delivery" : progress < 94 ? "Testing" : "Opening"; }
function branchEconomics(game: GameState, branch: BranchOffice) {
  const district = game.districts.find((item) => item.id === branch.districtId);
  const potentialCustomers = district ? Math.round(district.population * districtPotential(district) / 100 * 0.032 * (1 - district.competition / 180)) : 0;
  const customers = Math.min(branch.capacity, Math.round(potentialCustomers + game.customers / Math.max(1, game.branchOffices.length) * 0.35));
  const revenue = customers * (720 + branch.level * 95);
  const costs = branch.monthlyRent + branch.staffSlots * 54_000;
  return { customers, revenue, costs, profit: revenue - costs, capacity: customers / Math.max(1, branch.capacity) * 100 };
}

export function NetworkPage({ game, action }: { game: GameState; action: GameAction }) {
  const [selectedDistrict, setSelectedDistrict] = useState(game.districts[0]?.id ?? "");
  const [profile, setProfile] = useState<BranchProfile>("retail");
  const [mapMode, setMapMode] = useState<MapMode>("potential");
  const [zoom, setZoom] = useState(1);

  const district = game.districts.find((item) => item.id === selectedDistrict) ?? game.districts[0];
  const branch = game.branchOffices.find((item) => item.districtId === district?.id);
  const activeProject = game.projects.find((project) => project.districtId === district?.id && project.status !== "completed");
  const activeProjects = useMemo(() => game.projects.filter((project) => project.status !== "completed"), [game.projects]);
  const recommendation = district ? bestProfile(district) : "retail";
  const potential = district ? districtPotential(district) : 0;
  const risk = district ? districtRisk(district) : 0;
  const projectedCustomers = district ? Math.round(district.population * (potential / 100) * 0.032 * (1 - district.competition / 180)) : 0;
  const projectedDeposits = projectedCustomers * (district?.incomeIndex ?? 100) * 240;
  const unlockedOpportunities = game.districts.filter((item) => stageOrder.indexOf(game.campaignStage) >= stageOrder.indexOf(item.requiredStage) && !game.branchOffices.some((office) => office.districtId === item.id) && !game.projects.some((project) => project.districtId === item.id && project.status !== "completed"));
  const bestOpportunity = [...unlockedOpportunities].sort((a, b) => districtPotential(b) - districtPotential(a))[0];
  const economics = branch ? branchEconomics(game, branch) : null;
  const manager = branch ? game.employeeRoster.find((employee) => employee.id === branch.managerId) : null;
  const eligibleManagers = game.employeeRoster.filter((employee) => !employee.executiveRole && employee.leadership >= 45);
  const scaleOffset = 50 - 50 * zoom;
  const actionMessage = branch && economics
    ? !manager ? "This branch has no accountable manager. Assign one before giving it autonomy."
      : economics.capacity > 92 ? `${branch.name} is near capacity. Delegate service improvement or start an upgrade.`
        : economics.profit < 0 ? `${branch.name} is loss-making. Focus on deposits or business before expanding the building.`
          : `${branch.name} is healthy. ${manager.name} can now run local decisions under a real mandate.`
    : activeProject ? `The branch is in ${projectPhase(activeProject).toLowerCase()}. It opens in ${activeProject.remainingDays} days.`
      : bestOpportunity?.id === district?.id ? "This is currently the best available expansion opportunity." : "Compare this area with the highlighted best opportunity before committing cash.";

  return <>
    <section className="network-recommendation-bar">
      <div><span>★</span><div><small>BEST NEXT NETWORK MOVE</small><strong>{bestOpportunity ? `Evaluate ${bestOpportunity.name}` : "Improve the existing network"}</strong><p>{bestOpportunity ? `${districtPotential(bestOpportunity)} potential · ${profileCopy[bestProfile(bestOpportunity)].title} recommended.` : "All unlocked markets are covered. Improve managers, capacity and branch economics."}</p></div></div>
      {bestOpportunity && <button className="secondary" onClick={() => setSelectedDistrict(bestOpportunity.id)}>Open recommendation →</button>}
    </section>

    {activeProjects.length > 0 && <section className="project-pulse"><div><span className="pulse-dot" /><strong>{activeProjects.length} project{activeProjects.length === 1 ? "" : "s"} in delivery</strong><small>The nearest completion is always visible while you scroll.</small></div><div className="pulse-projects">{activeProjects.slice().sort((a, b) => a.remainingDays - b.remainingDays).slice(0, 3).map((project) => <span key={project.id}><b>{project.name}</b><small>{projectPhase(project)} · {project.remainingDays} days</small></span>)}</div></section>}

    <section className="network-map-shell v6-network-shell">
      <article className="panel district-map-card refined-map-card">
        <div className="map-header-row"><div><p className="eyebrow">REGIONAL STRATEGY MAP</p><h3>Branches, rivals and the next decision</h3><p>Markers now show branch level. Locked markets explain their requirement in the inspector.</p></div><div className="map-tools"><button onClick={() => setZoom((value) => Math.max(.88, value - .08))}>−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(1.28, value + .08))}>+</button><button onClick={() => setZoom(1)}>Reset</button></div></div>
        <div className="map-mode-tabs">{mapModes.map((mode) => <button key={mode.key} className={mapMode === mode.key ? "selected" : ""} onClick={() => setMapMode(mode.key)} title={mode.help}>{mode.label}<span className="info-dot">i</span></button>)}</div>
        <div className="strategy-map-frame"><svg className="strategy-map" viewBox="0 0 100 100"><defs><pattern id="map-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" className="map-grid-line" /></pattern></defs><rect width="100" height="100" className="map-land" /><rect width="100" height="100" fill="url(#map-grid)" /><path className="map-water-svg" d="M88 -5 C75 15 91 28 83 49 C76 69 88 83 78 105 L110 105 L110 -5 Z" /><g className="map-zoom-layer" transform={`translate(${scaleOffset} ${scaleOffset}) scale(${zoom})`}><path className="map-road-svg major" d="M3 58 C22 52 42 56 58 48 C74 40 87 47 98 39" /><path className="map-road-svg" d="M17 4 C27 23 42 39 56 57 C66 70 77 82 91 96" /><path className="map-road-svg" d="M5 82 C28 70 48 74 69 61 C80 54 89 51 98 49" />{game.districts.map((item) => {
          const ownedBranch = game.branchOffices.find((office) => office.districtId === item.id);
          const building = game.projects.some((project) => project.districtId === item.id && project.status !== "completed");
          const locked = stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(item.requiredStage);
          const score = scoreForMode(game, item, mapMode);
          const selected = item.id === district?.id;
          const recommended = item.id === bestOpportunity?.id;
          return <g key={item.id} className={`map-district-group ${selected ? "selected" : ""} ${recommended ? "recommended" : ""}`}><path d={districtShapes[item.id]} className={`map-region ${levelForScore(score)} ${ownedBranch ? "owned" : ""} ${building ? "building" : ""} ${locked ? "locked" : ""}`} onClick={() => setSelectedDistrict(item.id)} /><text className="map-district-label" x={item.mapX} y={item.mapY - 4} textAnchor="middle">{item.name.replace(" District", "").replace(" Quarter", "")}</text><g className={`map-location-marker ${ownedBranch ? "owned" : building ? "building" : locked ? "locked" : "open"}`} transform={`translate(${item.mapX} ${item.mapY})`} onClick={() => setSelectedDistrict(item.id)}><circle r="4" /><text textAnchor="middle" y="1.2">{ownedBranch ? `L${ownedBranch.level}` : building ? "…" : locked ? "×" : "+"}</text></g>{recommended && <text className="map-recommended-star" x={item.mapX + 6} y={item.mapY - 7}>★</text>}{item.competition >= 55 && <g className="competitor-markers" transform={`translate(${item.mapX + 6} ${item.mapY + 3})`}><circle cx="0" cy="0" r="1.3" /><circle cx="3" cy="-2" r="1.1" /></g>}</g>;
        })}</g></svg><div className="map-legend"><span><i className="legend-low" />Low</span><span><i className="legend-medium" />Medium</span><span><i className="legend-high" />High</span><span><i className="legend-owned" />Your branch + level</span><span><i className="legend-rival" />Named rival presence</span><span>★ Best next move</span></div></div>
      </article>

      {district && <aside className="panel district-inspector v6-inspector">
        <div className="inspector-heading"><div><p className="eyebrow">SELECTED MARKET</p><h2>{district.name}</h2></div><span className={`market-score ${levelForScore(potential)}`}>{potential}<small>potential</small></span></div>
        <div className="branch-action-message"><small>WHAT MANAGEMENT RECOMMENDS</small><strong>{actionMessage}</strong></div>
        <p className="district-description">{district.description}</p>
        <div className="district-kpi-grid"><MetricHelp label="Population" value={district.population.toLocaleString("en-GB")} help="Potential households and businesses." /><MetricHelp label="Income index" value={`${district.incomeIndex}`} help="100 is average." /><MetricHelp label="Competition" value={`${district.competition}/100`} help="Higher means slower and more expensive growth." /><MetricHelp label="Credit risk" value={`${risk}/100`} help="Simplified local loss risk." /></div>
        {!branch && !activeProject && <div className="market-outlook"><span><small>Estimated first-wave customers</small><strong>≈ {projectedCustomers.toLocaleString("en-GB")}</strong></span><span><small>Deposit opportunity</small><strong>{money.format(projectedDeposits)}</strong></span></div>}
        {branch && economics ? <>
          <div className="branch-summary-v6"><div><small>YOUR LOCATION</small><h3>{branch.name} · L{branch.level}</h3><p>{branch.profile} · {economics.profit >= 0 ? "profitable" : "loss-making"}</p></div><strong className={economics.profit >= 0 ? "positive" : "negative"}>{money.format(economics.profit)}/mo</strong></div>
          <div className="branch-kpis-v6"><span><small>Revenue</small><b>{money.format(economics.revenue)}</b></span><span><small>Cost</small><b>{money.format(economics.costs)}</b></span><span><small>Capacity</small><b>{economics.capacity.toFixed(0)}%</b></span><span><small>Satisfaction</small><b>{branch.satisfaction.toFixed(0)}</b></span></div>
          <div className="branch-manager-console"><div className="section-title"><strong>Branch manager</strong><small>The manager now takes monthly local actions.</small></div><label>Manager<select value={branch.managerId ?? ""} onChange={(event) => action((state) => assignBranchManager(state, branch.id, event.target.value || null))}><option value="">No manager</option>{eligibleManagers.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · leadership {employee.leadership}</option>)}</select></label><label>Local focus<div className="branch-option-grid">{focuses.map((focus) => <button key={focus} disabled={!branch.managerId} className={(branch.localFocus ?? "service") === focus ? "selected" : ""} title={focusCopy[focus]} onClick={() => action((state) => setBranchFocus(state, branch.id, focus))}>{focus}<small>{focusCopy[focus]}</small></button>)}</div></label><label>Authority<div className="branch-option-grid mandates">{mandates.map((mandate) => <button key={mandate} disabled={!branch.managerId && mandate !== "manual"} className={(branch.managerMandate ?? "manual") === mandate ? "selected" : ""} title={mandateCopy[mandate]} onClick={() => action((state) => setBranchMandate(state, branch.id, mandate))}>{mandate}<small>{mandateCopy[mandate]}</small></button>)}</div></label></div>
          <button className="secondary wide" disabled={branch.level >= 3 || game.cash < (branch.level === 1 ? 1_150_000 : 2_100_000)} onClick={() => action((state) => startBranchUpgrade(state, branch.id))}>{branch.level >= 3 ? "Fully upgraded" : `Upgrade to level ${branch.level + 1}`}</button>
        </> : activeProject ? <div className="project-inline"><strong>{activeProject.name}</strong><p>{projectPhase(activeProject)} · {activeProject.remainingDays} days remaining</p><div className="stage-track"><i style={{ width: `${100 - activeProject.remainingDays / activeProject.durationDays * 100}%` }} /></div></div> : <><div className="recommendation-box"><span>★</span><div><small>RECOMMENDED FORMAT</small><strong>{profileCopy[recommendation].title}</strong><p>{profileCopy[recommendation].bestFor}.</p></div></div><div className="profile-tabs">{profiles.map((item) => <button key={item} className={profile === item ? "selected" : ""} onClick={() => setProfile(item)}>{item}</button>)}</div><button className="primary wide" disabled={game.cash < district.openingCost || stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(district.requiredStage)} onClick={() => action((state) => startBranchProject(state, district.id, profile))}>{stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(district.requiredStage) ? `Locked until ${district.requiredStage} stage` : `Open ${profileCopy[profile].title} · ${money.format(district.openingCost)}`}</button></>}
      </aside>}
    </section>

    <section className="panel branch-network-table-panel"><div className="panel-heading"><div><p className="eyebrow">NETWORK CONTROL</p><h3>Every branch at a glance</h3></div><span className="status good">{game.branchOffices.length} branches</span></div><div className="branch-network-table"><div className="branch-table-head"><span>Branch</span><span>Manager</span><span>Monthly result</span><span>Capacity</span><span>Mandate</span><span>Recommended action</span></div>{game.branchOffices.map((office) => { const result = branchEconomics(game, office); const officeManager = game.employeeRoster.find((employee) => employee.id === office.managerId); return <button key={office.id} onClick={() => setSelectedDistrict(office.districtId)}><span><strong>{office.name}</strong><small>L{office.level} · {office.profile}</small></span><span>{officeManager?.name ?? "Vacant"}</span><span className={result.profit >= 0 ? "positive" : "negative"}>{money.format(result.profit)}</span><span>{result.capacity.toFixed(0)}%</span><span>{office.managerMandate ?? "manual"}</span><span>{!officeManager ? "Assign manager" : result.capacity > 92 ? "Add capacity" : result.profit < 0 ? "Improve deposits" : "Healthy"}</span></button>; })}</div></section>

    <section className="content-grid two-column project-section"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">STRATEGIC PROGRAMMES</p><h3>Long-term transformation</h3></div></div><div className="strategic-project-grid"><ProjectLaunch title="Mobile bank 2.0" body="Improves digital service, brand and customer satisfaction." cost={2_600_000} days={120} disabled={game.cash < 2_600_000 || game.projects.some((project) => project.kind === "mobile-bank" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "mobile-bank"))} /><ProjectLaunch title="Core banking renewal" body="Raises cyber security, compliance and scalability." cost={5_500_000} days={210} disabled={game.cash < 5_500_000 || game.projects.some((project) => project.kind === "core-banking" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "core-banking"))} /><ProjectLaunch title="Regional head office" body="Strengthens board confidence and institutional reputation." cost={8_000_000} days={270} disabled={game.cash < 8_000_000 || game.projects.some((project) => project.kind === "head-office" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "head-office"))} /></div></article><article className="panel"><div className="panel-heading"><div><p className="eyebrow">DELIVERY PIPELINE</p><h3>{activeProjects.length} active projects</h3></div></div>{activeProjects.length === 0 ? <div className="empty-state">No active projects.</div> : <div className="project-list">{activeProjects.map((project) => <div key={project.id} className="project-row"><div><strong>{project.name}</strong><small>{projectPhase(project)} · {project.remainingDays} days remaining</small></div><span>{Math.round(100 - project.remainingDays / project.durationDays * 100)}%</span><div className="stage-track"><i style={{ width: `${100 - project.remainingDays / project.durationDays * 100}%` }} /></div></div>)}</div>}</article></section>
  </>;
}

function MetricHelp({ label, value, help }: { label: string; value: string; help: string }) { return <span title={help}><small>{label} · i</small><strong>{value}</strong></span>; }
function ProjectLaunch({ title, body, cost, days, disabled, onClick }: { title: string; body: string; cost: number; days: number; disabled: boolean; onClick: () => void }) { return <button className="project-launch" disabled={disabled} onClick={onClick}><strong>{title}</strong><small>{body}</small><span>{money.format(cost)} · {days} days</span></button>; }
