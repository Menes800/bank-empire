import { useEffect, useMemo, useState } from "react";
import {
  assignBranchManager,
  getBranchOpeningAssessment,
  setBranchFocus,
  setBranchMandate,
  startBranchProjectV7,
  startBranchUpgrade,
  startStrategicProject,
} from "../../game/engine";
import type { BranchFocus, BranchMandate, BranchProfile, GameState } from "../../game/store";
import type { BankProject, BranchOffice, District } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const stageOrder = ["startup", "regional", "national", "group", "empire"];
const profiles: BranchProfile[] = ["retail", "mortgage", "business", "wealth"];
const focuses: BranchFocus[] = ["service", "deposits", "lending", "business"];
const mandates: BranchMandate[] = ["manual", "guarded", "autonomous", "growth"];
type MapMode = "opportunity" | "competition" | "income" | "risk" | "coverage";
type InspectorTab = "market" | "branch" | "delegation";

const districtShapes: Record<string, string> = {
  industrial: "M4 10 L29 7 L36 28 L27 45 L5 40 Z",
  coast: "M29 4 L64 5 L67 25 L51 34 L35 28 Z",
  university: "M66 7 L94 10 L96 38 L76 43 L65 27 Z",
  central: "M35 29 L65 26 L76 44 L67 63 L39 61 L27 45 Z",
  harbour: "M4 42 L28 46 L40 63 L34 91 L7 88 L2 66 Z",
  garden: "M40 63 L67 64 L78 88 L54 97 L34 91 Z",
  ridge: "M68 45 L96 40 L98 85 L79 89 L67 63 Z",
};

const profileCopy: Record<BranchProfile, { title: string; detail: string }> = {
  retail: { title: "Retail branch", detail: "Households, payments and deposits" },
  mortgage: { title: "Mortgage centre", detail: "Families and secured lending" },
  business: { title: "Business hub", detail: "SMEs, deposits and advisory" },
  wealth: { title: "Private banking", detail: "Affluent and wealth relationships" },
};

const focusCopy: Record<BranchFocus, string> = {
  service: "Capacity, queue time and satisfaction",
  deposits: "Liquid deposits and customer acquisition",
  lending: "Controlled local loan origination",
  business: "SME relationships and fee income",
};

const mandateCopy: Record<BranchMandate, string> = {
  manual: "Reports only",
  guarded: "Small actions · $15k/month",
  autonomous: "Runs local plan · $30k/month",
  growth: "Aggressive growth · $55k/month",
};

function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }
function stageLabel(stage: string) { return stage === "startup" ? "Local" : stage === "regional" ? "Regional" : stage === "national" ? "National" : stage === "group" ? "Group" : "Empire"; }
function districtPotential(district: District) {
  const demand = Math.max(district.retailDemand, district.mortgageDemand, district.businessDemand, district.wealthDemand);
  return clamp(Math.round(demand * .58 + district.population / 2_200 + district.digitalAffinity * .1 - district.competition * .16));
}
function districtRisk(district: District) { return clamp(Math.round(22 + district.competition * .32 + Math.max(0, 108 - district.incomeIndex) * .3 + district.businessDemand * .12)); }
function bestProfile(district: District): BranchProfile {
  const values: Record<BranchProfile, number> = { retail: district.retailDemand, mortgage: district.mortgageDemand, business: district.businessDemand, wealth: district.wealthDemand };
  return profiles.reduce((best, item) => values[item] > values[best] ? item : best, "retail");
}
function mapScore(game: GameState, district: District, mode: MapMode) {
  const branch = game.branchOffices.find((item) => item.districtId === district.id);
  if (mode === "competition") return district.competition;
  if (mode === "income") return clamp(district.incomeIndex / 1.7);
  if (mode === "risk") return districtRisk(district);
  if (mode === "coverage") return branch ? 55 + branch.level * 15 : 8;
  return districtPotential(district);
}
function scoreClass(score: number) { return score >= 72 ? "score-high" : score >= 48 ? "score-medium" : "score-low"; }
function projectPhase(project: BankProject) { const progress = 100 - project.remainingDays / Math.max(1, project.durationDays) * 100; return progress < 20 ? "Planning" : progress < 80 ? "Delivery" : "Opening preparation"; }
function branchMetrics(branch: BranchOffice) {
  const customers = branch.localCustomers ?? Math.min(branch.capacity, 260 + branch.level * 100);
  const revenue = branch.lastMonthRevenue ?? customers * 70;
  const cost = branch.lastMonthCost ?? branch.monthlyRent + branch.staffSlots * 5_400;
  const profit = branch.lastMonthProfit ?? revenue - cost;
  const capacity = customers / Math.max(1, branch.capacity) * 100;
  return { customers, revenue, cost, profit, capacity, deposits: branch.localDeposits ?? 0, loans: branch.localLoans ?? 0 };
}
function statusForBranch(branch: BranchOffice) {
  const metrics = branchMetrics(branch);
  if (!branch.managerId || metrics.profit < 0) return "attention";
  if (metrics.capacity > 92) return "pressure";
  return "healthy";
}
function rivalsForDistrict(game: GameState, district: District) {
  if (district.competition < 32) return [];
  const seed = [...district.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return Array.from({ length: district.competition > 68 ? 2 : 1 }, (_, index) => game.competitors[(seed + index) % Math.max(1, game.competitors.length)]).filter(Boolean);
}

export function NetworkPage({ game, action }: { game: GameState; action: GameAction }) {
  const [selectedId, setSelectedId] = useState(game.districts[0]?.id ?? "");
  const [tab, setTab] = useState<InspectorTab>("market");
  const [mode, setMode] = useState<MapMode>("opportunity");
  const [profile, setProfile] = useState<BranchProfile>("retail");
  const [zoom, setZoom] = useState(1);

  const district = game.districts.find((item) => item.id === selectedId) ?? game.districts[0];
  const branch = game.branchOffices.find((item) => item.districtId === district?.id);
  const project = game.projects.find((item) => item.districtId === district?.id && item.status !== "completed");
  const activeProjects = game.projects.filter((item) => item.status !== "completed");
  const assessment = district ? getBranchOpeningAssessment(game, district.id) : null;
  const eligibleManagers = game.employeeRoster.filter((employee) => !employee.executiveRole && employee.leadership >= 45);
  const manager = branch ? game.employeeRoster.find((employee) => employee.id === branch.managerId) : undefined;
  const metrics = branch ? branchMetrics(branch) : null;
  const rivals = district ? rivalsForDistrict(game, district) : [];

  const availableMarkets = useMemo(() => game.districts.filter((item) => {
    const stageUnlocked = stageOrder.indexOf(game.campaignStage) >= stageOrder.indexOf(item.requiredStage);
    return stageUnlocked && !game.branchOffices.some((branchOffice) => branchOffice.districtId === item.id) && !game.projects.some((active) => active.districtId === item.id && active.status !== "completed");
  }).sort((a, b) => districtPotential(b) - districtPotential(a)), [game.campaignStage, game.branchOffices, game.projects, game.districts]);
  const bestMarket = availableMarkets[0];

  useEffect(() => {
    if (district) setProfile(bestProfile(district));
  }, [district?.id]);

  const select = (id: string) => { setSelectedId(id); setTab("market"); };

  return <>
    <section className="network-executive-strip">
      <div><p className="eyebrow">NETWORK PLAN</p><strong>{bestMarket ? `${bestMarket.name} is the strongest available market` : "No immediately available market"}</strong><span>{bestMarket ? `${districtPotential(bestMarket)} opportunity · ${profileCopy[bestProfile(bestMarket)].title}` : "Improve cash, stage requirements or current locations before expanding."}</span></div>
      {bestMarket && <button className="primary small" onClick={() => select(bestMarket.id)}>Review market</button>}
    </section>

    <section className="adult-network-layout">
      <article className="panel adult-map-panel">
        <div className="adult-map-heading"><div><p className="eyebrow">REGIONAL FOOTPRINT</p><h3>Branch network and competitive coverage</h3><p>District shading reflects the selected analytical layer. Select a market to review economics, constraints and capital options.</p></div><div className="network-summary"><span><b>{game.branchOffices.length}</b> locations</span><span><b>{activeProjects.length}</b> projects</span><span><b>{game.competitors.length}</b> competitors</span></div></div>
        <div className="adult-map-toolbar"><div>{(["opportunity", "competition", "income", "risk", "coverage"] as MapMode[]).map((item) => <button key={item} className={mode === item ? "selected" : ""} onClick={() => setMode(item)}>{item}</button>)}</div><div><button onClick={() => setZoom((value) => clamp(value - .1, .9, 1.35))}>−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => clamp(value + .1, .9, 1.35))}>+</button></div></div>

        <div className="adult-map-stage">
          <svg viewBox="0 0 100 100" className="adult-strategy-map">
            <defs><pattern id="fine-grid" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M4 0H0V4" className="adult-map-grid" /></pattern></defs>
            <rect width="100" height="100" className="adult-map-ground" /><rect width="100" height="100" fill="url(#fine-grid)" /><path className="adult-water" d="M88 -5 C76 18 92 31 84 51 C77 70 88 84 79 105 H110 V-5 Z" />
            <g transform={`translate(${50 - 50 * zoom} ${50 - 50 * zoom}) scale(${zoom})`}>
              <path className="adult-road primary-road" d="M2 59 C23 51 43 57 59 48 C73 40 88 47 99 38" /><path className="adult-road" d="M16 3 C26 24 42 39 56 58 C69 75 79 84 93 98" /><path className="adult-road" d="M3 82 C29 71 48 74 70 61 C82 53 91 51 99 48" />
              {game.districts.map((item) => {
                const owned = game.branchOffices.find((office) => office.districtId === item.id);
                const active = game.projects.find((bankProject) => bankProject.districtId === item.id && bankProject.status !== "completed");
                const locked = stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(item.requiredStage);
                const selected = item.id === district.id;
                const localRivals = rivalsForDistrict(game, item);
                return <g key={item.id} className={`adult-district ${selected ? "selected" : ""}`}>
                  <path d={districtShapes[item.id]} className={`${scoreClass(mapScore(game, item, mode))} ${owned ? "owned" : ""} ${locked ? "locked" : ""}`} onClick={() => select(item.id)} />
                  <text className="adult-district-name" x={item.mapX} y={item.mapY - 7} textAnchor="middle">{item.name.replace(" District", "").replace(" Quarter", "")}</text>
                  {owned ? <g className={`adult-branch-marker status-${statusForBranch(owned)}`} transform={`translate(${item.mapX} ${item.mapY})`} onClick={() => select(item.id)}><circle r="4.1" /><text textAnchor="middle" y=".9">L{owned.level}</text><rect x="-5.8" y="5.2" width="11.6" height="3.1" rx="1.1" /><text className="adult-marker-caption" textAnchor="middle" y="7.5">BRANCH</text></g>
                    : active ? <g className="adult-project-marker" transform={`translate(${item.mapX} ${item.mapY})`} onClick={() => select(item.id)}><rect x="-5.7" y="-2.4" width="11.4" height="4.8" rx="1" /><text textAnchor="middle" y=".8">{active.remainingDays} DAYS</text></g>
                      : locked ? <g className="adult-access-label" transform={`translate(${item.mapX} ${item.mapY})`} onClick={() => select(item.id)}><text textAnchor="middle">{stageLabel(item.requiredStage).toUpperCase()} ACCESS</text></g>
                        : <g className="adult-available-marker" transform={`translate(${item.mapX} ${item.mapY})`} onClick={() => select(item.id)}><rect x="-5.5" y="-2.3" width="11" height="4.6" rx="1" /><text textAnchor="middle" y=".8">AVAILABLE</text></g>}
                  {localRivals.map((rival, index) => <g key={rival.id} className="adult-rival-marker" transform={`translate(${item.mapX + 6 + index * 3.7} ${item.mapY + 2 - index * 3})`}><title>{rival.name} · {rival.strategy}</title><circle r="1.65" /><text textAnchor="middle" y=".55">{rival.name.slice(0, 1)}</text></g>)}
                </g>;
              })}
            </g>
          </svg>
          <div className="adult-map-legend"><span><i className="legend-bank" />Your network</span><span><i className="legend-competitor" />Competitor</span><span><i className="legend-available" />Available market</span><span><i className="legend-restricted" />Stage restricted</span></div>
        </div>
      </article>

      <aside className="panel adult-market-inspector">
        <div className="adult-inspector-head"><div><p className="eyebrow">SELECTED MARKET</p><h2>{district.name}</h2><p>{district.description}</p></div><span><b>{districtPotential(district)}</b><small>opportunity</small></span></div>
        <div className="adult-inspector-tabs"><button className={tab === "market" ? "selected" : ""} onClick={() => setTab("market")}>Market</button>{branch && <button className={tab === "branch" ? "selected" : ""} onClick={() => setTab("branch")}>Branch P&amp;L</button>}{branch && <button className={tab === "delegation" ? "selected" : ""} onClick={() => setTab("delegation")}>Delegation</button>}</div>

        {tab === "market" && <div className="adult-inspector-content">
          <div className="adult-recommendation"><small>MANAGEMENT VIEW</small><strong>{branch && metrics ? metrics.profit < 0 ? "The branch needs an economics plan before further capital is committed." : metrics.capacity > 92 ? "Service capacity is tight. Upgrade or delegate a service mandate." : "The location is operating within its current mandate." : project ? `${project.name} is in ${projectPhase(project).toLowerCase()} with ${project.remainingDays} days remaining.` : assessment?.allowed ? `${profileCopy[bestProfile(district)].title} is the recommended entry format.` : "The market is strategically relevant, but current constraints prevent approval."}</strong></div>
          <div className="adult-market-kpis"><Metric label="Population" value={district.population.toLocaleString("en-GB")} /><Metric label="Income index" value={`${district.incomeIndex}`} /><Metric label="Competition" value={`${district.competition}/100`} /><Metric label="Credit risk" value={`${districtRisk(district)}/100`} /></div>
          {rivals.length > 0 && <div className="adult-rival-list"><small>COMPETITIVE PRESENCE</small>{rivals.map((rival) => <div key={rival.id}><strong>{rival.name}</strong><span>{rival.strategy} · {rival.branches} branches · {rival.depositRate.toFixed(2)}% deposits</span></div>)}</div>}

          {branch && metrics ? <div className="adult-existing-branch"><div><small>{branch.name} · LEVEL {branch.level}</small><strong className={metrics.profit >= 0 ? "positive" : "negative"}>{money.format(metrics.profit)}/month</strong><p>{metrics.capacity.toFixed(0)}% capacity · {manager?.name ?? "manager vacant"}</p></div><button onClick={() => setTab("branch")}>Review P&amp;L →</button></div>
            : project ? <div className="adult-project-summary"><strong>{project.name}</strong><span>{projectPhase(project)} · {project.remainingDays} days remaining</span><div className="stage-track"><i style={{ width: `${100 - project.remainingDays / project.durationDays * 100}%` }} /></div></div>
              : <>
                <div className="adult-profile-grid">{profiles.map((item) => <button key={item} className={profile === item ? "selected" : ""} onClick={() => setProfile(item)}><strong>{profileCopy[item].title}</strong><small>{profileCopy[item].detail}</small></button>)}</div>
                <div className="funding-readiness"><div><small>FULL CASH COST</small><strong>{money.format(district.openingCost)}</strong></div><div><small>FINANCED UPFRONT</small><strong>{money.format(assessment?.upfront ?? 0)}</strong></div></div>
                {!assessment?.allowed && <div className="constraint-list"><strong>Approval constraints</strong>{assessment?.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>}
                <div className="branch-funding-actions"><button className="secondary" disabled={!assessment?.cashAllowed} onClick={() => action((state) => startBranchProjectV7(state, district.id, profile, "cash"))}>Pay in cash</button><button className="primary" disabled={!assessment?.financeAllowed} onClick={() => action((state) => startBranchProjectV7(state, district.id, profile, "financed"))}>Finance expansion</button></div>
              </>}
        </div>}

        {branch && metrics && tab === "branch" && <div className="adult-inspector-content">
          <div className="branch-pl-heading"><div><small>{branch.profile.toUpperCase()} · LEVEL {branch.level}</small><h3>{branch.name}</h3></div><strong className={metrics.profit >= 0 ? "positive" : "negative"}>{money.format(metrics.profit)}</strong></div>
          <div className="branch-pl-grid"><Metric label="Monthly revenue" value={money.format(metrics.revenue)} /><Metric label="Monthly cost" value={money.format(metrics.cost)} /><Metric label="Local customers" value={metrics.customers.toLocaleString("en-GB")} /><Metric label="Capacity used" value={`${metrics.capacity.toFixed(0)}%`} /><Metric label="Local deposits" value={money.format(metrics.deposits)} /><Metric label="Local loans" value={money.format(metrics.loans)} /></div>
          <div className="branch-performance-note"><strong>{metrics.profit >= 0 ? "Positive local contribution" : "Negative local contribution"}</strong><p>{metrics.profit >= 0 ? "The location contributes after rent, local activity and service delivery. Continue monitoring capacity and competitor pressure." : "Current local revenue does not cover the location's operating burden. Change focus, manager authority or footprint before adding more capital."}</p></div>
          <div className="manager-last-action"><small>LATEST MANAGER ACCOUNTABILITY</small><strong>{branch.lastManagerAction ?? "No v0.7 monthly action has been completed yet."}</strong></div>
          <div className="branch-primary-actions"><button className="secondary" onClick={() => setTab("delegation")}>Manager controls</button><button className="primary" disabled={branch.level >= 3 || game.cash < (branch.level === 1 ? 1_150_000 : 2_100_000)} onClick={() => action((state) => startBranchUpgrade(state, branch.id))}>{branch.level >= 3 ? "Fully upgraded" : `Upgrade to level ${branch.level + 1}`}</button></div>
        </div>}

        {branch && tab === "delegation" && <div className="adult-inspector-content">
          <label className="adult-select-label">Accountable branch manager<select value={branch.managerId ?? ""} onChange={(event) => action((state) => assignBranchManager(state, branch.id, event.target.value || null))}><option value="">No manager</option>{eligibleManagers.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · leadership {employee.leadership}</option>)}</select></label>
          <div className="delegation-section"><div><strong>Local priority</strong><small>The operating result the manager should improve.</small></div><div className="adult-option-grid">{focuses.map((item) => <button key={item} disabled={!branch.managerId} className={(branch.localFocus ?? "service") === item ? "selected" : ""} onClick={() => action((state) => setBranchFocus(state, branch.id, item))}><strong>{item}</strong><small>{focusCopy[item]}</small></button>)}</div></div>
          <div className="delegation-section"><div><strong>Authority</strong><small>The freedom and monthly budget granted locally.</small></div><div className="adult-option-grid">{mandates.map((item) => <button key={item} disabled={!branch.managerId && item !== "manual"} className={(branch.managerMandate ?? "manual") === item ? "selected" : ""} onClick={() => action((state) => setBranchMandate(state, branch.id, item))}><strong>{item}</strong><small>{mandateCopy[item]}</small></button>)}</div></div>
          <div className="delegation-accountability"><small>NEXT MONTHLY CLOSE</small><strong>{branch.managerId && branch.managerMandate !== "manual" ? `${manager?.name ?? "The manager"} will execute the ${branch.localFocus ?? "service"} plan and report revenue, cost, customers and local balance-sheet growth.` : "The branch will report but wait for CEO approval before taking local action."}</strong></div>
        </div>}
      </aside>
    </section>

    <section className="panel branch-portfolio-panel"><div className="panel-heading"><div><p className="eyebrow">BRANCH PORTFOLIO</p><h3>Local performance and accountability</h3></div><span className="status good">{game.branchOffices.length} locations</span></div><div className="adult-branch-table"><div className="adult-branch-table-head"><span>Location</span><span>Manager</span><span>Customers</span><span>Deposits</span><span>Monthly result</span><span>Capacity</span><span>Status</span></div>{game.branchOffices.map((office) => { const local = branchMetrics(office); const officeManager = game.employeeRoster.find((employee) => employee.id === office.managerId); const status = statusForBranch(office); return <button key={office.id} onClick={() => select(office.districtId)}><span><strong>{office.name}</strong><small>{office.profile} · Level {office.level}</small></span><span>{officeManager?.name ?? "Vacant"}</span><span>{local.customers.toLocaleString("en-GB")}</span><span>{money.format(local.deposits)}</span><span className={local.profit >= 0 ? "positive" : "negative"}>{money.format(local.profit)}</span><span>{local.capacity.toFixed(0)}%</span><span className={`branch-status-label ${status}`}>{status}</span></button>; })}</div></section>

    <section className="content-grid two-column project-section"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">STRATEGIC PROGRAMMES</p><h3>Long-term capability</h3></div></div><div className="strategic-project-grid"><ProjectLaunch title="Mobile bank 2.0" body="Improves digital service, brand and customer satisfaction." cost={2_600_000} days={120} disabled={game.cash < 2_600_000 || game.projects.some((item) => item.kind === "mobile-bank" && item.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "mobile-bank"))} /><ProjectLaunch title="Core banking renewal" body="Raises cyber security, compliance and scalability." cost={5_500_000} days={210} disabled={game.cash < 5_500_000 || game.projects.some((item) => item.kind === "core-banking" && item.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "core-banking"))} /><ProjectLaunch title="Regional head office" body="Strengthens board confidence and institutional reputation." cost={8_000_000} days={270} disabled={game.cash < 8_000_000 || game.projects.some((item) => item.kind === "head-office" && item.status !== "completed")} onClick={() => action((state) => startStrategicProject(state, "head-office"))} /></div></article><article className="panel"><div className="panel-heading"><div><p className="eyebrow">DELIVERY PIPELINE</p><h3>{activeProjects.length} active projects</h3></div></div>{activeProjects.length === 0 ? <div className="empty-state">No active projects.</div> : <div className="project-list">{activeProjects.map((item) => <div key={item.id} className="project-row"><div><strong>{item.name}</strong><small>{projectPhase(item)} · {item.remainingDays} days remaining</small></div><span>{Math.round(100 - item.remainingDays / item.durationDays * 100)}%</span><div className="stage-track"><i style={{ width: `${100 - item.remainingDays / item.durationDays * 100}%` }} /></div></div>)}</div>}</article></section>
  </>;
}

function Metric({ label, value }: { label: string; value: string }) { return <span><small>{label}</small><strong>{value}</strong></span>; }
function ProjectLaunch({ title, body, cost, days, disabled, onClick }: { title: string; body: string; cost: number; days: number; disabled: boolean; onClick: () => void }) { return <button className="project-launch" disabled={disabled} onClick={onClick}><strong>{title}</strong><small>{body}</small><span>{money.format(cost)} · {days} days</span></button>; }
