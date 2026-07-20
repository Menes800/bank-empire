import { useMemo, useState } from "react";
import { startBranchProject, startBranchUpgrade, startStrategicProject } from "../../game/engine";
import type { BranchProfile, GameState } from "../../game/store";
import type { BankProject, District } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const stageOrder = ["startup", "regional", "national", "group", "empire"];
const profiles: BranchProfile[] = ["retail", "mortgage", "business", "wealth"];
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

const profileCopy: Record<BranchProfile, { title: string; body: string; bestFor: string }> = {
  retail: { title: "Retail branch", body: "Broad service, everyday banking and local visibility.", bestFor: "High retail demand and mixed households" },
  mortgage: { title: "Mortgage centre", body: "Advisers focus on families, housing and secured lending.", bestFor: "Strong mortgage demand and stable incomes" },
  business: { title: "Business hub", body: "More credit and relationship capacity for local companies.", bestFor: "SMEs, logistics and corporate deposits" },
  wealth: { title: "Private banking office", body: "Premium advice with lower volume and higher value per client.", bestFor: "Affluent areas with strong wealth demand" },
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function districtPotential(district: District) {
  const strongestDemand = Math.max(district.retailDemand, district.mortgageDemand, district.businessDemand, district.wealthDemand);
  return clamp(Math.round(strongestDemand * 0.56 + district.population / 1_900 + district.digitalAffinity * 0.12 - district.competition * 0.18));
}

function districtRisk(district: District) {
  return clamp(Math.round(28 + district.competition * 0.3 + Math.max(0, 110 - district.incomeIndex) * 0.35 + district.businessDemand * 0.12));
}

function bestProfile(district: District): BranchProfile {
  const scores: Record<BranchProfile, number> = {
    retail: district.retailDemand,
    mortgage: district.mortgageDemand,
    business: district.businessDemand,
    wealth: district.wealthDemand,
  };
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

function levelForScore(score: number) {
  return score >= 78 ? "very-high" : score >= 60 ? "high" : score >= 40 ? "medium" : "low";
}

function projectPhase(project: BankProject) {
  const progress = 100 - project.remainingDays / Math.max(1, project.durationDays) * 100;
  if (progress < 15) return "Planning";
  if (progress < 72) return "Delivery";
  if (progress < 94) return "Testing";
  return "Opening";
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
  const projectedBranchCustomers = branch ? Math.min(branch.capacity, Math.round(projectedCustomers + game.customers / Math.max(1, game.branchOffices.length) * 0.35)) : 0;
  const branchRevenue = branch ? projectedBranchCustomers * (720 + branch.level * 95) : 0;
  const branchCosts = branch ? branch.monthlyRent + branch.staffSlots * 54_000 : 0;
  const branchProfit = branchRevenue - branchCosts;
  const manager = branch ? game.employeeRoster.find((employee) => employee.id === branch.managerId) : null;

  const scaleOffset = 50 - 50 * zoom;

  return <>
    {activeProjects.length > 0 && <section className="project-pulse">
      <div><span className="pulse-dot" /><strong>{activeProjects.length} project{activeProjects.length === 1 ? "" : "s"} in delivery</strong><small>Time advances automatically. The game only stops for major decisions or critical risks.</small></div>
      <div className="pulse-projects">{activeProjects.slice(0, 3).map((project) => <span key={project.id}><b>{project.name}</b><small>{projectPhase(project)} · {project.remainingDays} days</small></span>)}</div>
    </section>}

    <section className="network-map-shell">
      <article className="panel district-map-card refined-map-card">
        <div className="map-header-row">
          <div><p className="eyebrow">REGIONAL STRATEGY MAP</p><h3>Choose where the bank should grow</h3><p>Change map mode to understand what each area is good for. Darker areas have a higher score in the selected mode.</p></div>
          <div className="map-tools">
            <button title="Zoom out" onClick={() => setZoom((value) => Math.max(.88, value - .08))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button title="Zoom in" onClick={() => setZoom((value) => Math.min(1.28, value + .08))}>+</button>
            <button title="Reset zoom" onClick={() => setZoom(1)}>Reset</button>
          </div>
        </div>

        <div className="map-mode-tabs" role="tablist">{mapModes.map((mode) => <button key={mode.key} className={mapMode === mode.key ? "selected" : ""} onClick={() => setMapMode(mode.key)} title={mode.help}>{mode.label}<span className="info-dot">i</span></button>)}</div>

        <div className="strategy-map-frame">
          <svg className="strategy-map" viewBox="0 0 100 100" aria-label="Regional banking map">
            <defs>
              <pattern id="map-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" className="map-grid-line" /></pattern>
            </defs>
            <rect width="100" height="100" className="map-land" />
            <rect width="100" height="100" fill="url(#map-grid)" />
            <path className="map-water-svg" d="M88 -5 C75 15 91 28 83 49 C76 69 88 83 78 105 L110 105 L110 -5 Z" />
            <g className="map-zoom-layer" transform={`translate(${scaleOffset} ${scaleOffset}) scale(${zoom})`}>
              <path className="map-road-svg major" d="M3 58 C22 52 42 56 58 48 C74 40 87 47 98 39" />
              <path className="map-road-svg" d="M17 4 C27 23 42 39 56 57 C66 70 77 82 91 96" />
              <path className="map-road-svg" d="M5 82 C28 70 48 74 69 61 C80 54 89 51 98 49" />
              {game.districts.map((item) => {
                const owned = game.branchOffices.some((office) => office.districtId === item.id);
                const building = game.projects.some((project) => project.districtId === item.id && project.status !== "completed");
                const locked = stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(item.requiredStage);
                const score = scoreForMode(game, item, mapMode);
                const selected = item.id === district?.id;
                return <g key={item.id} className={`map-district-group ${selected ? "selected" : ""}`}>
                  <path
                    d={districtShapes[item.id]}
                    className={`map-region ${levelForScore(score)} ${owned ? "owned" : ""} ${building ? "building" : ""} ${locked ? "locked" : ""}`}
                    onClick={() => setSelectedDistrict(item.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.name}, ${mapMode} score ${score}`}
                    onKeyDown={(event) => { if (event.key === "Enter") setSelectedDistrict(item.id); }}
                  />
                  <text className="map-district-label" x={item.mapX} y={item.mapY - 4} textAnchor="middle">{item.name.replace(" District", "").replace(" Quarter", "")}</text>
                  <g className={`map-location-marker ${owned ? "owned" : building ? "building" : locked ? "locked" : "open"}`} transform={`translate(${item.mapX} ${item.mapY})`} onClick={() => setSelectedDistrict(item.id)}>
                    <circle r="3.5" /><text textAnchor="middle" y="1.2">{owned ? "B" : building ? "…" : locked ? "×" : "+"}</text>
                  </g>
                  {item.competition >= 55 && <g className="competitor-markers" transform={`translate(${item.mapX + 5} ${item.mapY + 3})`}><circle cx="0" cy="0" r="1.3" /><circle cx="3" cy="-2" r="1.1" /></g>}
                </g>;
              })}
            </g>
          </svg>
          <div className="map-legend"><span><i className="legend-low" />Low</span><span><i className="legend-medium" />Medium</span><span><i className="legend-high" />High</span><span><i className="legend-owned" />Your branch</span><span><i className="legend-rival" />Rivals</span></div>
        </div>
      </article>

      {district && <aside className="panel district-inspector">
        <div className="inspector-heading"><div><p className="eyebrow">SELECTED MARKET</p><h2>{district.name}</h2></div><span className={`market-score ${levelForScore(potential)}`}>{potential}<small>potential</small></span></div>
        <p className="district-description">{district.description}</p>

        <div className="recommendation-box"><span>★</span><div><small>RECOMMENDED FORMAT</small><strong>{profileCopy[recommendation].title}</strong><p>{profileCopy[recommendation].bestFor}.</p></div></div>

        <div className="district-kpi-grid">
          <MetricHelp label="Population" value={district.population.toLocaleString("en-GB")} help="The number of potential households and businesses in the area." />
          <MetricHelp label="Income index" value={`${district.incomeIndex}`} help="100 is average. Higher income supports mortgages, savings and wealth products." />
          <MetricHelp label="Competition" value={`${district.competition}/100`} help="Higher competition makes customer growth slower and marketing more expensive." />
          <MetricHelp label="Credit risk" value={`${risk}/100`} help="A simplified estimate of likely credit losses in this local market." />
        </div>

        <div className="market-outlook"><span><small>Estimated first-wave customers</small><strong>≈ {projectedCustomers.toLocaleString("en-GB")}</strong></span><span><small>Deposit opportunity</small><strong>{money.format(projectedDeposits)}</strong></span></div>

        <div className="demand-section"><div className="section-title"><strong>Local demand</strong><small>Higher bars mean a stronger product fit.</small></div><div className="demand-bars"><Demand label="Everyday banking" value={district.retailDemand} /><Demand label="Mortgages" value={district.mortgageDemand} /><Demand label="Business banking" value={district.businessDemand} /><Demand label="Wealth advice" value={district.wealthDemand} /></div></div>

        {branch ? <BranchInspector game={game} branch={branch} managerName={manager?.name ?? "No manager assigned"} revenue={branchRevenue} costs={branchCosts} profit={branchProfit} customers={projectedBranchCustomers} action={action} /> : activeProject ? <ProjectTimeline project={activeProject} /> : <>
          <div className="section-title"><strong>Choose branch profile</strong><small>The profile changes which local demand the branch converts best.</small></div>
          <div className="profile-selector">{profiles.map((item) => <button key={item} className={profile === item ? "selected" : ""} onClick={() => setProfile(item)}><strong>{profileCopy[item].title}</strong><small>{profileCopy[item].body}</small>{recommendation === item && <b>Recommended</b>}</button>)}</div>
          <div className="decision-preview"><span><small>Opening investment</small><strong>{money.format(district.openingCost)}</strong></span><span><small>Monthly rent</small><strong>{money.format(district.monthlyRent)}</strong></span><span><small>Estimated build time</small><strong>{75 + Math.round(district.competition * .35)} days</strong></span></div>
          <button className="primary wide" disabled={game.cash < district.openingCost || stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(district.requiredStage)} onClick={() => action((state) => startBranchProject(state, district.id, profile))}>{stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(district.requiredStage) ? `Unlocks at ${district.requiredStage} stage` : `Approve ${profile} branch`}</button>
          <p className="button-explainer">The investment is paid once. Rent and ordinary operating costs are handled automatically and shown in the monthly report.</p>
        </>}
      </aside>}
    </section>

    <section className="project-workspace">
      <article className="panel strategic-programmes"><div className="panel-heading"><div><p className="eyebrow">STRATEGIC PROGRAMMES</p><h3>Long-term transformation</h3><p>These projects change several systems at once. They do not generate repeated approval requests while in delivery.</p></div></div><div className="strategic-project-grid refined-project-grid"><ProjectLaunch title="Mobile bank 2.0" body="Improves digital service, brand strength and customer satisfaction." impact="+18 digital · +3 satisfaction · +5 brand" cost={2_600_000} days={120} disabled={game.cash < 2_600_000 || game.projects.some((project) => project.kind === "mobile-bank" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "mobile-bank"))} /><ProjectLaunch title="Core banking renewal" body="Improves security, compliance and long-term scalability." impact="+10 digital · +15 cyber · +5 compliance" cost={5_500_000} days={210} disabled={game.cash < 5_500_000 || game.projects.some((project) => project.kind === "core-banking" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "core-banking"))} /><ProjectLaunch title="Regional head office" body="Builds institutional credibility and stronger group governance." impact="+5 reputation · +7 board confidence" cost={8_000_000} days={270} disabled={game.cash < 8_000_000 || game.projects.some((project) => project.kind === "head-office" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "head-office"))} /></div></article>
      <article className="panel delivery-pipeline"><div className="panel-heading"><div><p className="eyebrow">DELIVERY PIPELINE</p><h3>{activeProjects.length} active projects</h3></div></div>{activeProjects.length === 0 ? <div className="empty-state"><strong>No active projects</strong><span>Select a district or strategic programme. Once approved, normal delivery runs automatically.</span></div> : <div className="project-list refined-project-list">{activeProjects.map((project) => <ProjectTimeline key={project.id} project={project} compact />)}</div>}</article>
    </section>
  </>;
}

function MetricHelp({ label, value, help }: { label: string; value: string; help: string }) { return <span title={help}><small>{label}<i className="info-dot">i</i></small><strong>{value}</strong></span>; }
function Demand({ label, value }: { label: string; value: number }) { return <div><span>{label}<b>{value}</b></span><div className="stage-track"><i style={{ width: `${value}%` }} /></div></div>; }

function ProjectTimeline({ project, compact = false }: { project: BankProject; compact?: boolean }) {
  const progress = Math.round(100 - project.remainingDays / Math.max(1, project.durationDays) * 100);
  const phase = projectPhase(project);
  const phases = ["Planning", "Delivery", "Testing", "Opening"];
  const activeIndex = phases.indexOf(phase);
  return <div className={compact ? "project-timeline compact" : "project-timeline"}>
    <div className="project-title-line"><div><strong>{project.name}</strong><small>{project.status === "delayed" ? "Delayed today · normal delivery will resume automatically" : `${phase} · ${project.remainingDays} days remaining`}</small></div><b>{progress}%</b></div>
    <div className="project-phases">{phases.map((item, index) => <span key={item} className={index < activeIndex ? "done" : index === activeIndex ? "active" : ""}><i />{item}</span>)}</div>
    <div className="stage-track"><i style={{ width: `${progress}%` }} /></div>
    {!compact && <div className="project-budget"><span><small>Approved budget</small><b>{money.format(project.budget)}</b></span><span><small>Delivery risk</small><b>{project.risk.toFixed(0)}/100</b></span><span><small>Paid at approval</small><b>Yes</b></span></div>}
  </div>;
}

function BranchInspector({ game, branch, managerName, revenue, costs, profit, customers, action }: { game: GameState; branch: GameState["branchOffices"][number]; managerName: string; revenue: number; costs: number; profit: number; customers: number; action: GameAction }) {
  const utilization = Math.min(100, customers / Math.max(1, branch.capacity) * 100);
  return <div className="branch-inspector">
    <div className="branch-title"><div><small>YOUR LOCATION</small><h3>{branch.name}</h3><p>Level {branch.level} · {profileCopy[branch.profile].title}</p></div><span>L{branch.level}</span></div>
    <div className="branch-health-grid"><MetricHelp label="Estimated monthly revenue" value={money.format(revenue)} help="Estimated from local customer volume, branch profile and level." /><MetricHelp label="Monthly operating cost" value={money.format(costs)} help="Rent and normal staffing costs. This is paid automatically through daily operations." /><MetricHelp label="Estimated branch result" value={money.format(profit)} help="Revenue minus ordinary branch operating costs." /><MetricHelp label="Capacity used" value={`${utilization.toFixed(0)}%`} help="High utilisation can create queues and lower satisfaction." /></div>
    <div className="branch-capacity"><div><span>Service capacity</span><b>{customers} / {branch.capacity}</b></div><div className="stage-track"><i className={utilization > 92 ? "warning" : ""} style={{ width: `${utilization}%` }} /></div></div>
    <div className="branch-manager"><span>{managerName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><small>BRANCH MANAGER</small><strong>{managerName}</strong></div></div>
    <button className="secondary wide" disabled={branch.level >= 3 || game.cash < (branch.level === 1 ? 1_150_000 : 2_100_000)} onClick={() => action((state) => startBranchUpgrade(state, branch.id))}>{branch.level >= 3 ? "Branch fully upgraded" : `Upgrade to level ${branch.level + 1}`}</button>
    <p className="button-explainer">An upgrade increases capacity, staff space and satisfaction after the project is completed.</p>
  </div>;
}

function ProjectLaunch({ title, body, impact, cost, days, disabled, onClick }: { title: string; body: string; impact: string; cost: number; days: number; disabled: boolean; onClick: () => void }) { return <button className="project-launch refined" disabled={disabled} onClick={onClick}><span className="project-symbol">◆</span><div><strong>{title}</strong><small>{body}</small><em>{impact}</em></div><b>{money.format(cost)}<small>{days} days</small></b></button>; }
