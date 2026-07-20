import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
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
type InspectorTab = "decision" | "branch" | "manager";

const mapModes: { key: MapMode; label: string; help: string }[] = [
  { key: "potential", label: "Opportunity", help: "Overall opportunity from population and local demand." },
  { key: "competition", label: "Rivals", help: "How hard rival banks are fighting for customers." },
  { key: "income", label: "Income", help: "Local income and premium-product potential." },
  { key: "risk", label: "Risk", help: "Estimated local credit and operating risk." },
  { key: "coverage", label: "Coverage", help: "How strongly your network currently serves each area." },
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
  manual: "Reports only. You make every local decision.",
  guarded: "Small local actions with about $15k monthly authority.",
  autonomous: "Actively improves the chosen focus with about $30k monthly authority.",
  growth: "Aggressive local growth with about $55k monthly authority.",
};
const mandateSpend: Record<BranchMandate, number> = { manual: 0, guarded: 15_000, autonomous: 30_000, growth: 55_000 };

const focusCopy: Record<BranchFocus, string> = {
  service: "Reduce queues and improve capacity and satisfaction.",
  deposits: "Attract customers and liquid deposits.",
  lending: "Originate controlled local lending when treasury permits.",
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
function rivalsForDistrict(game: GameState, district: District) {
  if (district.competition < 34 || game.competitors.length === 0) return [];
  const count = district.competition >= 68 ? 2 : 1;
  const seed = [...district.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, index) => game.competitors[(seed + index) % game.competitors.length]);
}
function stageLabel(stage: string) { return stage === "startup" ? "Local start-up" : stage === "regional" ? "Regional bank" : stage === "national" ? "National challenger" : stage === "group" ? "Listed group" : "Financial empire"; }
function branchStatus(economics: ReturnType<typeof branchEconomics>, manager: unknown) {
  if (!manager || economics.profit < 0) return "attention";
  if (economics.capacity > 92) return "pressure";
  return "healthy";
}

export function NetworkPage({ game, action }: { game: GameState; action: GameAction }) {
  const [selectedDistrict, setSelectedDistrict] = useState(game.districts[0]?.id ?? "");
  const [profile, setProfile] = useState<BranchProfile>("retail");
  const [mapMode, setMapMode] = useState<MapMode>("potential");
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [showRivals, setShowRivals] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("decision");
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ clientX: number; clientY: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

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
  const selectedRivals = district ? rivalsForDistrict(game, district) : [];
  const latestManagerReport = branch ? game.events.find((event) => event.title === "Branch management report" && event.body.includes(branch.name)) : undefined;

  useEffect(() => {
    if (district) setProfile(bestProfile(district));
  }, [district?.id]);

  const actionMessage = branch && economics
    ? !manager ? "Appoint a branch manager before delegating local work."
      : economics.capacity > 92 ? `${branch.name} is close to full capacity. Prioritise service or upgrade the location.`
        : economics.profit < 0 ? `${branch.name} is losing money. Give the manager a deposits or business mandate before expanding.`
          : `${branch.name} is healthy. Keep the manager accountable and let the branch run locally.`
    : activeProject ? `${activeProject.name} is in ${projectPhase(activeProject).toLowerCase()} and opens in ${activeProject.remainingDays} days.`
      : bestOpportunity?.id === district?.id ? "This is the strongest unlocked market for your next expansion." : "Compare this market with the highlighted best opportunity before committing cash.";

  const selectDistrict = (id: string) => {
    if (suppressClickRef.current) return;
    setSelectedDistrict(id);
    setInspectorTab("decision");
  };
  const zoomBy = (delta: number) => setView((current) => ({ ...current, zoom: clamp(current.zoom + delta, .88, 1.58) }));
  const resetMap = () => setView({ zoom: 1, x: 0, y: 0 });
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { clientX: event.clientX, clientY: event.clientY, x: view.x, y: view.y, moved: false };
    setDragging(true);
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dxPixels = event.clientX - drag.clientX;
    const dyPixels = event.clientY - drag.clientY;
    if (Math.abs(dxPixels) + Math.abs(dyPixels) > 4) {
      drag.moved = true;
      suppressClickRef.current = true;
    }
    setView((current) => ({ ...current, x: clamp(drag.x + dxPixels / Math.max(1, rect.width) * 100, -28, 28), y: clamp(drag.y + dyPixels / Math.max(1, rect.height) * 100, -24, 24) }));
  };
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
    window.setTimeout(() => { suppressClickRef.current = false; }, 40);
  };
  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? .1 : -.1);
  };

  const transformX = 50 - 50 * view.zoom + view.x;
  const transformY = 50 - 50 * view.zoom + view.y;

  return <>
    <section className="network-command-strip">
      <div><span>★</span><div><small>NEXT NETWORK DECISION</small><strong>{bestOpportunity ? `${bestOpportunity.name} is the best unlocked expansion` : "Your unlocked markets are covered"}</strong><p>{bestOpportunity ? `${districtPotential(bestOpportunity)} opportunity · ${profileCopy[bestProfile(bestOpportunity)].title} recommended.` : "Improve manager autonomy, branch economics and capacity before the next campaign stage."}</p></div></div>
      {bestOpportunity && <button className="primary small" onClick={() => selectDistrict(bestOpportunity.id)}>Show on map</button>}
    </section>

    <section className="reference-map-layout">
      <article className="panel reference-map-card">
        <div className="reference-map-heading"><div><p className="eyebrow">REGIONAL NETWORK</p><h3>Build the bank from the map</h3><p>Drag to move, scroll to zoom and select a district. Branch buildings, named rivals and unlock requirements are visible directly on the map.</p></div><div className="map-summary-chips"><span><b>{game.branchOffices.length}</b> branches</span><span><b>{activeProjects.length}</b> projects</span><span><b>{game.competitors.length}</b> rivals</span></div></div>

        <div className="reference-map-toolbar">
          <div className="map-mode-tabs compact">{mapModes.map((mode) => <button key={mode.key} className={mapMode === mode.key ? "selected" : ""} onClick={() => setMapMode(mode.key)} title={mode.help}>{mode.label}</button>)}</div>
          <div className="map-layer-buttons"><button className={showLabels ? "selected" : ""} onClick={() => setShowLabels((value) => !value)}>Names</button><button className={showRivals ? "selected" : ""} onClick={() => setShowRivals((value) => !value)}>Rivals</button></div>
        </div>

        <div className={`interactive-strategy-map ${dragging ? "dragging" : ""}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={handleWheel}>
          <svg className="strategy-map reference-strategy-map" viewBox="0 0 100 100">
            <defs><pattern id="reference-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" className="map-grid-line" /></pattern></defs>
            <rect width="100" height="100" className="map-land" /><rect width="100" height="100" fill="url(#reference-grid)" /><path className="map-water-svg" d="M88 -5 C75 15 91 28 83 49 C76 69 88 83 78 105 L110 105 L110 -5 Z" />
            <g transform={`translate(${transformX} ${transformY}) scale(${view.zoom})`}>
              <path className="map-road-svg major" d="M3 58 C22 52 42 56 58 48 C74 40 87 47 98 39" /><path className="map-road-svg" d="M17 4 C27 23 42 39 56 57 C66 70 77 82 91 96" /><path className="map-road-svg" d="M5 82 C28 70 48 74 69 61 C80 54 89 51 98 49" />
              {game.districts.map((item) => {
                const ownedBranch = game.branchOffices.find((office) => office.districtId === item.id);
                const buildingProject = game.projects.find((project) => project.districtId === item.id && project.status !== "completed");
                const locked = stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(item.requiredStage);
                const score = scoreForMode(game, item, mapMode);
                const selected = item.id === district?.id;
                const recommended = item.id === bestOpportunity?.id;
                const itemRivals = rivalsForDistrict(game, item);
                const itemEconomics = ownedBranch ? branchEconomics(game, ownedBranch) : null;
                const itemManager = ownedBranch ? game.employeeRoster.find((employee) => employee.id === ownedBranch.managerId) : null;
                const status = itemEconomics ? branchStatus(itemEconomics, itemManager) : "healthy";
                return <g key={item.id} className={`map-district-group ${selected ? "selected" : ""} ${recommended ? "recommended" : ""}`}>
                  <title>{item.name} · Opportunity {districtPotential(item)} · Competition {item.competition}</title>
                  <path d={districtShapes[item.id]} className={`map-region ${levelForScore(score)} ${ownedBranch ? "owned" : ""} ${buildingProject ? "building" : ""} ${locked ? "locked" : ""}`} onClick={() => selectDistrict(item.id)} />
                  {showLabels && <text className="map-district-label reference-label" x={item.mapX} y={item.mapY - 7} textAnchor="middle">{item.name.replace(" District", "").replace(" Quarter", "")}</text>}
                  {ownedBranch ? <g className={`map-bank-building level-${ownedBranch.level} status-${status}`} transform={`translate(${item.mapX} ${item.mapY}) scale(${.78 + ownedBranch.level * .09})`} onClick={() => selectDistrict(item.id)}>
                    <ellipse className="bank-building-shadow" cx="0" cy="4.7" rx="5.5" ry="2" />
                    <polygon className="bank-building-side" points="3,-4.5 5,-3.2 5,3.4 3,4.2" />
                    <rect className="bank-building-front" x="-4.2" y="-5" width="7.5" height="9" rx=".45" />
                    <rect className="bank-building-roof" x="-5" y="-6.2" width="9.2" height="1.7" rx=".3" />
                    <rect className="bank-building-window" x="-2.9" y="-3.4" width="1.7" height="1.6" /><rect className="bank-building-window" x=".1" y="-3.4" width="1.7" height="1.6" />
                    {ownedBranch.level >= 2 && <><rect className="bank-building-window" x="-2.9" y="-.8" width="1.7" height="1.6" /><rect className="bank-building-window" x=".1" y="-.8" width="1.7" height="1.6" /></>}
                    <text className="bank-building-level" textAnchor="middle" y="7.8">L{ownedBranch.level}</text>
                  </g> : buildingProject ? <g className="map-project-site" transform={`translate(${item.mapX} ${item.mapY})`} onClick={() => selectDistrict(item.id)}><circle r="4.4" /><path d="M-2 2 L2 -2 M-2 -2 L2 2" /><text textAnchor="middle" y="7.5">{buildingProject.remainingDays}d</text></g> : locked ? <g className="map-locked-site" transform={`translate(${item.mapX} ${item.mapY})`} onClick={() => selectDistrict(item.id)}><rect x="-3.4" y="-1.6" width="6.8" height="5" rx="1" /><path d="M-2 -1.5 C-2 -5 2 -5 2 -1.5" /><text textAnchor="middle" y="7.7">{stageLabel(item.requiredStage)}</text></g> : <g className={`map-open-site ${recommended ? "recommended" : ""}`} transform={`translate(${item.mapX} ${item.mapY})`} onClick={() => selectDistrict(item.id)}><circle r="4.2" /><text textAnchor="middle" y="1.35">+</text>{recommended && <text className="open-site-star" x="5" y="-4">★</text>}</g>}
                  {showRivals && itemRivals.map((rival, index) => <g key={rival.id} className="named-rival-marker" transform={`translate(${item.mapX + 6 + index * 3.6} ${item.mapY + 2 - index * 3})`} onClick={() => selectDistrict(item.id)}><title>{rival.name} · {rival.strategy} strategy</title><circle r="1.8" /><text textAnchor="middle" y=".7">{rival.name.slice(0, 1)}</text></g>)}
                </g>;
              })}
            </g>
          </svg>
          <div className="map-floating-tools"><button onClick={() => zoomBy(-.1)}>−</button><span>{Math.round(view.zoom * 100)}%</span><button onClick={() => zoomBy(.1)}>+</button><button onClick={resetMap}>⌖</button></div>
          <div className="map-reference-hint">Drag to pan · Scroll to zoom · Click an area to manage it</div>
          <div className="map-reference-legend"><span><i className="legend-owned" />Your bank</span><span><i className="legend-rival" />Named rival</span><span><i className="legend-project" />Project</span><span>★ Best move</span></div>
        </div>
      </article>

      {district && <aside className="panel reference-inspector">
        <div className="reference-inspector-head"><div><p className="eyebrow">SELECTED MARKET</p><h2>{district.name}</h2><p>{district.description}</p></div><span className="potential-orb"><b>{potential}</b><small>opportunity</small></span></div>
        <div className="inspector-tabs"><button className={inspectorTab === "decision" ? "selected" : ""} onClick={() => setInspectorTab("decision")}>Decision</button>{branch && <button className={inspectorTab === "branch" ? "selected" : ""} onClick={() => setInspectorTab("branch")}>Branch</button>}{branch && <button className={inspectorTab === "manager" ? "selected" : ""} onClick={() => setInspectorTab("manager")}>Manager</button>}</div>

        {inspectorTab === "decision" && <div className="inspector-tab-content">
          <div className="management-recommendation"><small>MANAGEMENT RECOMMENDS</small><strong>{actionMessage}</strong></div>
          <div className="decision-market-kpis"><MetricHelp label="Population" value={district.population.toLocaleString("en-GB")} help="Potential households and businesses." /><MetricHelp label="Income" value={`${district.incomeIndex}`} help="100 is average." /><MetricHelp label="Competition" value={`${district.competition}/100`} help="Higher means slower and more expensive growth." /><MetricHelp label="Risk" value={`${risk}/100`} help="Simplified local credit and operating risk." /></div>
          {selectedRivals.length > 0 && <div className="rival-pressure-card"><small>RIVAL PRESSURE</small><div>{selectedRivals.map((rival) => <span key={rival.id}><b>{rival.name}</b><em>{rival.strategy}</em></span>)}</div></div>}
          {branch && economics ? <>
            <div className={`branch-decision-card status-${branchStatus(economics, manager)}`}><div><small>{branch.name} · L{branch.level}</small><strong>{money.format(economics.profit)}/month</strong><p>{economics.capacity.toFixed(0)}% capacity · {manager?.name ?? "No manager"}</p></div><button onClick={() => setInspectorTab("branch")}>Open branch →</button></div>
            <div className="quick-focus-grid">{focuses.map((focus) => <button key={focus} disabled={!manager} className={(branch.localFocus ?? "service") === focus ? "selected" : ""} onClick={() => action((state) => setBranchFocus(state, branch.id, focus))}><strong>{focus}</strong><small>{focusCopy[focus]}</small></button>)}</div>
            <div className="decision-actions-row"><button className="secondary" onClick={() => setInspectorTab("manager")}>{manager ? "Manage delegation" : "Appoint manager"}</button><button className="primary" disabled={branch.level >= 3 || game.cash < (branch.level === 1 ? 1_150_000 : 2_100_000)} onClick={() => action((state) => startBranchUpgrade(state, branch.id))}>{branch.level >= 3 ? "Fully upgraded" : `Upgrade to L${branch.level + 1}`}</button></div>
          </> : activeProject ? <div className="project-decision-card"><small>{projectPhase(activeProject)}</small><strong>{activeProject.name}</strong><p>{activeProject.remainingDays} days remaining</p><div className="stage-track"><i style={{ width: `${100 - activeProject.remainingDays / activeProject.durationDays * 100}%` }} /></div></div> : <>
            <div className="new-market-summary"><span><small>Expected first wave</small><strong>≈ {projectedCustomers.toLocaleString("en-GB")} customers</strong></span><span><small>Deposit opportunity</small><strong>{money.format(projectedDeposits)}</strong></span></div>
            <div className="recommendation-box compact"><span>★</span><div><small>RECOMMENDED FORMAT</small><strong>{profileCopy[recommendation].title}</strong><p>{profileCopy[recommendation].bestFor}.</p></div></div>
            <div className="profile-choice-grid">{profiles.map((item) => <button key={item} className={profile === item ? "selected" : ""} onClick={() => setProfile(item)}><strong>{profileCopy[item].title}</strong><small>{profileCopy[item].bestFor}</small></button>)}</div>
            <button className="primary wide" disabled={game.cash < district.openingCost || stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(district.requiredStage)} onClick={() => action((state) => startBranchProject(state, district.id, profile))}>{stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(district.requiredStage) ? `Requires ${stageLabel(district.requiredStage)}` : `Open branch · ${money.format(district.openingCost)}`}</button>
          </>}
        </div>}

        {branch && economics && inspectorTab === "branch" && <div className="inspector-tab-content">
          <div className="branch-title-card"><div><small>{branch.profile.toUpperCase()} · LEVEL {branch.level}</small><h3>{branch.name}</h3></div><strong className={economics.profit >= 0 ? "positive" : "negative"}>{money.format(economics.profit)}/mo</strong></div>
          <div className="branch-detail-grid"><MetricHelp label="Revenue" value={money.format(economics.revenue)} help="Estimated monthly income from this branch." /><MetricHelp label="Cost" value={money.format(economics.costs)} help="Rent and staffing cost." /><MetricHelp label="Customers" value={economics.customers.toLocaleString("en-GB")} help="Customers currently served by the location." /><MetricHelp label="Capacity" value={`${economics.capacity.toFixed(0)}%`} help="Above 90% creates service pressure." /><MetricHelp label="Satisfaction" value={`${branch.satisfaction.toFixed(0)}`} help="Local customer satisfaction." /><MetricHelp label="Manager" value={manager?.name ?? "Vacant"} help="The person accountable for local performance." /></div>
          <div className="branch-health-explanation"><strong>{economics.profit < 0 ? "Why this branch needs attention" : economics.capacity > 92 ? "Why capacity is under pressure" : "Why this branch is healthy"}</strong><p>{economics.profit < 0 ? "Current customer revenue does not cover rent and staffing. A deposits or business focus can improve economics before another building upgrade." : economics.capacity > 92 ? "Demand is close to the current service limit. A service mandate or an upgrade will protect customer satisfaction." : "Revenue covers operating cost and capacity remains manageable. The manager can run local activity without frequent CEO intervention."}</p></div>
          {latestManagerReport ? <div className="latest-branch-report"><small>LATEST MANAGER REPORT · DAY {latestManagerReport.day}</small><p>{latestManagerReport.body}</p></div> : <div className="empty-state">No manager action has been completed for this branch yet. Choose a non-manual mandate and advance to the next monthly review.</div>}
          <div className="decision-actions-row"><button className="secondary" onClick={() => setInspectorTab("manager")}>Manager controls</button><button className="primary" disabled={branch.level >= 3 || game.cash < (branch.level === 1 ? 1_150_000 : 2_100_000)} onClick={() => action((state) => startBranchUpgrade(state, branch.id))}>{branch.level >= 3 ? "Fully upgraded" : `Upgrade to L${branch.level + 1}`}</button></div>
        </div>}

        {branch && inspectorTab === "manager" && <div className="inspector-tab-content manager-inspector-content">
          <div className="manager-accountability"><small>LOCAL ACCOUNTABILITY</small><strong>{manager?.name ?? "Vacant branch manager"}</strong><p>{manager ? `${manager.role} · leadership ${manager.leadership} · skill ${manager.skill}` : "Choose an eligible employee before granting local authority."}</p></div>
          <label className="reference-select-label">Branch manager<select value={branch.managerId ?? ""} onChange={(event) => action((state) => assignBranchManager(state, branch.id, event.target.value || null))}><option value="">No manager</option>{eligibleManagers.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · leadership {employee.leadership}</option>)}</select></label>
          <div className="manager-control-section"><div><strong>Local priority</strong><small>What the manager should improve each month.</small></div><div className="reference-option-grid">{focuses.map((focus) => <button key={focus} disabled={!branch.managerId} className={(branch.localFocus ?? "service") === focus ? "selected" : ""} onClick={() => action((state) => setBranchFocus(state, branch.id, focus))}><strong>{focus}</strong><small>{focusCopy[focus]}</small></button>)}</div></div>
          <div className="manager-control-section"><div><strong>Authority</strong><small>How much freedom and monthly budget the manager receives.</small></div><div className="reference-option-grid mandate-grid">{mandates.map((mandate) => <button key={mandate} disabled={!branch.managerId && mandate !== "manual"} className={(branch.managerMandate ?? "manual") === mandate ? "selected" : ""} onClick={() => action((state) => setBranchMandate(state, branch.id, mandate))}><strong>{mandate}</strong><small>{mandateCopy[mandate]}</small><b>{mandateSpend[mandate] === 0 ? "No budget" : `${money.format(mandateSpend[mandate])}/mo`}</b></button>)}</div></div>
          <div className="delegation-preview"><small>EXPECTED MONTHLY BEHAVIOUR</small><strong>{branch.managerMandate === "manual" || !branch.managerId ? "The branch reports only and waits for you." : `${manager?.name ?? "The manager"} will use the ${(branch.localFocus ?? "service")} mandate automatically at the monthly review.`}</strong></div>
        </div>}
      </aside>}
    </section>

    <section className="panel network-card-strip-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR NETWORK</p><h3>Every branch at a glance</h3></div><span className="status good">{game.branchOffices.length} locations</span></div><div className="network-card-strip">{game.branchOffices.map((office) => { const result = branchEconomics(game, office); const officeManager = game.employeeRoster.find((employee) => employee.id === office.managerId); const status = branchStatus(result, officeManager); return <button key={office.id} className={`network-branch-card status-${status} ${office.districtId === district?.id ? "selected" : ""}`} onClick={() => selectDistrict(office.districtId)}><div><span className="mini-bank-icon">L{office.level}</span><div><strong>{office.name}</strong><small>{office.profile} · {officeManager?.name ?? "Manager vacant"}</small></div></div><b className={result.profit >= 0 ? "positive" : "negative"}>{money.format(result.profit)}/mo</b><div className="network-card-stats"><span>{result.capacity.toFixed(0)}% capacity</span><span>{office.managerMandate ?? "manual"}</span></div><em>{!officeManager ? "Appoint manager" : result.capacity > 92 ? "Capacity pressure" : result.profit < 0 ? "Improve economics" : "Healthy"}</em></button>; })}</div></section>

    <section className="content-grid two-column project-section"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">STRATEGIC PROGRAMMES</p><h3>Long-term transformation</h3></div></div><div className="strategic-project-grid"><ProjectLaunch title="Mobile bank 2.0" body="Improves digital service, brand and customer satisfaction." cost={2_600_000} days={120} disabled={game.cash < 2_600_000 || game.projects.some((project) => project.kind === "mobile-bank" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "mobile-bank"))} /><ProjectLaunch title="Core banking renewal" body="Raises cyber security, compliance and scalability." cost={5_500_000} days={210} disabled={game.cash < 5_500_000 || game.projects.some((project) => project.kind === "core-banking" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "core-banking"))} /><ProjectLaunch title="Regional head office" body="Strengthens board confidence and institutional reputation." cost={8_000_000} days={270} disabled={game.cash < 8_000_000 || game.projects.some((project) => project.kind === "head-office" && project.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "head-office"))} /></div></article><article className="panel"><div className="panel-heading"><div><p className="eyebrow">DELIVERY PIPELINE</p><h3>{activeProjects.length} active projects</h3></div></div>{activeProjects.length === 0 ? <div className="empty-state">No active projects.</div> : <div className="project-list">{activeProjects.map((project) => <div key={project.id} className="project-row"><div><strong>{project.name}</strong><small>{projectPhase(project)} · {project.remainingDays} days remaining</small></div><span>{Math.round(100 - project.remainingDays / project.durationDays * 100)}%</span><div className="stage-track"><i style={{ width: `${100 - project.remainingDays / project.durationDays * 100}%` }} /></div></div>)}</div>}</article></section>
  </>;
}

function MetricHelp({ label, value, help }: { label: string; value: string; help: string }) { return <span title={help}><small>{label}<i>i</i></small><strong>{value}</strong></span>; }
function ProjectLaunch({ title, body, cost, days, disabled, onClick }: { title: string; body: string; cost: number; days: number; disabled: boolean; onClick: () => void }) { return <button className="project-launch" disabled={disabled} onClick={onClick}><strong>{title}</strong><small>{body}</small><span>{money.format(cost)} · {days} days</span></button>; }
