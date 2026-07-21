import { useEffect, useMemo, useState } from "react";
import {
  approveBranchUpgradeRecommendation,
  assignBranchManager,
  getBranchOpeningAssessment,
  setBranchManagerControl,
  setBranchMarketingBudget,
  setBranchPriority,
  setBranchUpgradeAuthority,
  startBranchProjectV7,
  startBranchUpgrade,
  startStrategicProject,
} from "../../game/engine";
import { assignEmployeeToBranch, branchForApplication, getBranchEconomics } from "../../game/v84/gameplay";
import type { BranchPriority, BranchProfile, GameState, UpgradeAuthority } from "../../game/store";
import type { BranchOffice, District } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const stageOrder = ["startup", "regional", "national", "group", "empire"];
const priorities: BranchPriority[] = ["balanced", "growth", "deposits", "business", "profitability"];
const profiles: BranchProfile[] = ["retail", "mortgage", "business", "wealth"];
type BranchTab = "overview" | "employees" | "loans" | "marketing" | "economy";

const branchTabs: { key: BranchTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "employees", label: "Employees" },
  { key: "loans", label: "Loans & customers" },
  { key: "marketing", label: "Marketing" },
  { key: "economy", label: "Economy" },
];

const upgradeOptions: { key: UpgradeAuthority; label: string; detail: string }[] = [
  { key: "manual", label: "Ask every time", detail: "All upgrades require CEO approval." },
  { key: "small", label: "COO may approve small", detail: "Level 1 expansions may be approved automatically." },
  { key: "profitable", label: "COO may approve profitable", detail: "Management may approve investments with a payback below 24 months." },
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

const priorityCopy: Record<BranchPriority, string> = {
  balanced: "Protect service and steady local results",
  growth: "Acquire customers faster",
  deposits: "Build liquid deposits",
  business: "Develop SME relationships",
  profitability: "Prioritise margin and cost control",
};

const profileNames: Record<BranchProfile, string> = {
  retail: "Retail branch",
  mortgage: "Mortgage centre",
  business: "Business hub",
  wealth: "Private banking office",
};

function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }
function districtPotential(district: District) {
  const demand = Math.max(district.retailDemand, district.mortgageDemand, district.businessDemand, district.wealthDemand);
  return clamp(Math.round(demand * .58 + district.population / 2_200 + district.digitalAffinity * .1 - district.competition * .16));
}
function bestProfile(district: District): BranchProfile {
  const scores: Record<BranchProfile, number> = { retail: district.retailDemand, mortgage: district.mortgageDemand, business: district.businessDemand, wealth: district.wealthDemand };
  return profiles.reduce((best, item) => scores[item] > scores[best] ? item : best, "retail");
}
function branchMetrics(branch: BranchOffice) {
  const customers = branch.localCustomers ?? Math.min(branch.capacity, 260 + branch.level * 100);
  const revenue = branch.lastMonthRevenue ?? customers * 125;
  const cost = branch.lastMonthCost ?? branch.monthlyRent + (branch.managerBudget ?? 0);
  const profit = branch.lastMonthProfit ?? revenue - cost;
  const capacity = customers / Math.max(1, branch.capacity) * 100;
  return { customers, revenue, cost, profit, capacity, deposits: branch.localDeposits ?? 0, loans: branch.localLoans ?? 0 };
}
function branchStatus(branch: BranchOffice) {
  const metrics = branchMetrics(branch);
  if (!branch.managerId) return { key: "vacant", label: "Needs manager" };
  if (metrics.profit < -50_000) return { key: "loss", label: "Loss-making" };
  if (metrics.profit < 0) return { key: "building", label: "Near break-even" };
  if (metrics.capacity > 92) return { key: "pressure", label: "Capacity pressure" };
  if (branch.pendingUpgradeRecommendation) return { key: "review", label: "Upgrade review" };
  return { key: "healthy", label: "Healthy" };
}
function marketingDescription(budget: number) {
  if (budget === 0) return "No paid local activity. Growth relies on reputation and walk-ins.";
  if (budget < 20_000) return "Light local presence with controlled cost.";
  if (budget < 45_000) return "Active local acquisition with a balanced cost level.";
  return "Strong growth push. Useful only when the branch has spare service capacity.";
}

export function NetworkPage({ game, action }: { game: GameState; action: GameAction }) {
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(game.branchOffices[0]?.id ?? "");
  const [selectedDistrictId, setSelectedDistrictId] = useState(game.districts[0]?.id ?? "");
  const [profile, setProfile] = useState<BranchProfile>("retail");
  const [tab, setTab] = useState<BranchTab>("overview");

  useEffect(() => {
    const listener = (event: Event) => {
      const value = (event as CustomEvent<string>).detail as BranchTab;
      if (branchTabs.some((item) => item.key === value)) setTab(value);
    };
    window.addEventListener("bank-empire-branch-tab", listener);
    return () => window.removeEventListener("bank-empire-branch-tab", listener);
  }, []);

  const selectedBranch = game.branchOffices.find((branch) => branch.id === selectedBranchId) ?? game.branchOffices[0];
  const selectedMetrics = selectedBranch ? branchMetrics(selectedBranch) : null;
  const selectedManager = selectedBranch ? game.employeeRoster.find((employee) => employee.id === selectedBranch.managerId) : undefined;
  const eligibleManagers = game.employeeRoster.filter((employee) => !employee.executiveRole && employee.leadership >= 45);
  const district = game.districts.find((item) => item.id === selectedDistrictId) ?? game.districts[0];
  const districtBranch = game.branchOffices.find((branch) => branch.districtId === district?.id);
  const districtProject = game.projects.find((project) => project.districtId === district?.id && project.status !== "completed");
  const assessment = district ? getBranchOpeningAssessment(game, district.id) : null;
  const activeProjects = game.projects.filter((project) => project.status !== "completed");

  const portfolio = useMemo(() => game.branchOffices.map((branch) => ({ branch, metrics: branchMetrics(branch), status: branchStatus(branch), manager: game.employeeRoster.find((employee) => employee.id === branch.managerId) })), [game.branchOffices, game.employeeRoster]);
  const totalProfit = portfolio.reduce((sum, item) => sum + item.metrics.profit, 0);
  const totalCustomers = portfolio.reduce((sum, item) => sum + item.metrics.customers, 0);
  const totalMarketing = portfolio.reduce((sum, item) => sum + (item.branch.managerBudget ?? 0), 0);
  const vacant = portfolio.filter((item) => !item.branch.managerId).length;
  const attention = portfolio.filter((item) => item.status.key !== "healthy" && item.status.key !== "building").length;
  const strongest = [...portfolio].sort((a, b) => b.metrics.profit - a.metrics.profit)[0];
  const weakest = [...portfolio].sort((a, b) => a.metrics.profit - b.metrics.profit)[0];

  const branchEmployees = selectedBranch ? game.employeeRoster.filter((employee) => employee.assignedBranchId === selectedBranch.id || employee.id === selectedBranch.managerId) : [];
  const unassignedBranchStaff = game.employeeRoster.filter((employee) => !employee.executiveRole && !employee.assignedBranchId && (employee.department === "Branch Operations" || employee.department === "Credit & Collections"));
  const branchApplications = selectedBranch ? game.loanApplications.filter((application) => branchForApplication(game, application)?.id === selectedBranch.id) : [];
  const branchLoans = selectedBranch ? game.activeLoans.filter((loan) => {
    const seed = game.branchOffices.length > 0 ? Math.abs([...loan.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % game.branchOffices.length : 0;
    return game.branchOffices[seed]?.id === selectedBranch.id;
  }) : [];
  const economics = selectedBranch ? getBranchEconomics(game, selectedBranch) : null;

  const chooseDistrict = (item: District) => {
    setSelectedDistrictId(item.id);
    setProfile(bestProfile(item));
  };

  return <>
    <section className="network-overview-hero panel">
      <div><p className="eyebrow">BRANCH NETWORK</p><h2>Each branch is a working local bank</h2><p>Managers own local staff, customer service, marketing and routine lending. You set mandates, priorities and major investments.</p></div>
      <button className="primary" onClick={() => setMapOpen(true)}>Open market map</button>
    </section>

    <section className="network-kpi-row">
      <Metric label="Monthly network result" value={money.format(totalProfit)} tone={totalProfit >= 0 ? "positive" : "negative"} />
      <Metric label="Branch customers" value={totalCustomers.toLocaleString("en-GB")} />
      <Metric label="Local marketing" value={`${money.format(totalMarketing)}/mo`} />
      <Metric label="Need attention" value={`${attention}`} tone={attention > 0 ? "warning" : "positive"} />
      <Metric label="Manager vacancies" value={`${vacant}`} tone={vacant > 0 ? "warning" : "positive"} />
    </section>

    <section className="content-grid network-summary-grid">
      <article className="panel compact-network-card"><small>BEST LOCATION</small><strong>{strongest?.branch.name ?? "—"}</strong><span className="positive">{strongest ? money.format(strongest.metrics.profit) : "—"}/month</span></article>
      <article className="panel compact-network-card"><small>WEAKEST LOCATION</small><strong>{weakest?.branch.name ?? "—"}</strong><span className={weakest && weakest.metrics.profit < 0 ? "negative" : ""}>{weakest ? money.format(weakest.metrics.profit) : "—"}/month</span></article>
      <article className="panel compact-network-card"><small>ACTIVE DELIVERY</small><strong>{activeProjects.length} project{activeProjects.length === 1 ? "" : "s"}</strong><span>{activeProjects[0] ? `${activeProjects[0].remainingDays} days to next completion` : "No active delivery"}</span></article>
    </section>

    <section className="panel branch-overview-panel">
      <div className="panel-heading"><div><p className="eyebrow">BRANCH OVERVIEW</p><h3>Choose a location to manage</h3></div><span className="status good">Manager-led</span></div>
      <div className="branch-overview-table">
        <div className="branch-overview-head"><span>Location</span><span>Manager</span><span>Result</span><span>Customers</span><span>Capacity</span><span>Status</span></div>
        {portfolio.map(({ branch, metrics, status, manager }) => <button key={branch.id} className={selectedBranch?.id === branch.id ? "selected" : ""} onClick={() => setSelectedBranchId(branch.id)}>
          <span><strong>{branch.name}</strong><small>{branch.profile} · Level {branch.level}</small></span>
          <span>{manager?.name ?? "Vacant"}</span>
          <span className={metrics.profit >= 0 ? "positive" : "negative"}>{money.format(metrics.profit)}</span>
          <span>{metrics.customers.toLocaleString("en-GB")}</span>
          <span>{metrics.capacity.toFixed(0)}%</span>
          <span><b className={`branch-status ${status.key}`}>{status.label}</b></span>
        </button>)}
      </div>
    </section>

    {selectedBranch && selectedMetrics && economics && <>
      <nav className="branch-workspace-tabs panel">{branchTabs.map((item) => <button key={item.key} className={tab === item.key ? "selected" : ""} onClick={() => setTab(item.key)}>{item.label}</button>)}</nav>

      {tab === "overview" && <section className="branch-management-layout">
        <article className="panel branch-result-panel">
          <div className="panel-heading"><div><p className="eyebrow">SELECTED BRANCH</p><h3>{selectedBranch.name}</h3></div><strong className={selectedMetrics.profit >= 0 ? "positive" : "negative"}>{money.format(selectedMetrics.profit)}/mo</strong></div>
          <div className="branch-result-grid"><Metric label="Revenue" value={money.format(selectedMetrics.revenue)} /><Metric label="Operating cost" value={money.format(selectedMetrics.cost)} /><Metric label="Assigned staff" value={`${branchEmployees.length}`} /><Metric label="Deposits" value={money.format(selectedMetrics.deposits)} /><Metric label="Loans" value={money.format(selectedMetrics.loans)} /><Metric label="Satisfaction" value={`${selectedBranch.satisfaction.toFixed(0)}`} /><Metric label="Lifetime result" value={money.format(selectedBranch.lifetimeProfit ?? 0)} /></div>
          <div className="manager-accountability"><small>LATEST MANAGEMENT ACTION</small><strong>{selectedBranch.lastManagerAction ?? "Waiting for the next monthly management review."}</strong></div>
        </article>

        <article className="panel simplified-branch-controls">
          <div className="panel-heading"><div><p className="eyebrow">MANAGEMENT RULES</p><h3>CEO guardrails</h3></div></div>
          <label className="manager-select-row"><span><strong>Accountable manager</strong><small>COO can fill this automatically when manager control is enabled.</small></span><select value={selectedBranch.managerId ?? ""} onChange={(event) => action((state) => assignBranchManager(state, selectedBranch.id, event.target.value || null))}><option value="">No manager</option>{eligibleManagers.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · leadership {employee.leadership}</option>)}</select></label>
          <label className="management-checkbox"><input type="checkbox" checked={selectedBranch.managerControl ?? false} onChange={(event) => action((state) => setBranchManagerControl(state, selectedBranch.id, event.target.checked))} /><span><strong>Manager runs this branch</strong><small>Daily service, local campaigns, staffing pressure and routine loans are handled automatically.</small></span></label>
          <label className="compact-control"><span><strong>Operating priority</strong><small>{priorityCopy[selectedBranch.operatingPriority ?? "balanced"]}</small></span><select value={selectedBranch.operatingPriority ?? "balanced"} onChange={(event) => action((state) => setBranchPriority(state, selectedBranch.id, event.target.value as BranchPriority))}>{priorities.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
          <label className="compact-control"><span><strong>Upgrade authority</strong><small>{upgradeOptions.find((item) => item.key === (selectedBranch.upgradeAuthority ?? "profitable"))?.detail}</small></span><select value={selectedBranch.upgradeAuthority ?? "profitable"} onChange={(event) => action((state) => setBranchUpgradeAuthority(state, selectedBranch.id, event.target.value as UpgradeAuthority))}>{upgradeOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          {selectedBranch.pendingUpgradeRecommendation && <div className="upgrade-recommendation"><div><small>COO RECOMMENDATION</small><strong>Expand this branch</strong><p>Capacity and local economics support a larger location.</p></div><button className="primary small" onClick={() => action((state) => approveBranchUpgradeRecommendation(state, selectedBranch.id))}>Approve upgrade</button></div>}
          {!selectedBranch.pendingUpgradeRecommendation && <button className="secondary wide" disabled={selectedBranch.level >= 3} onClick={() => action((state) => startBranchUpgrade(state, selectedBranch.id))}>{selectedBranch.level >= 3 ? "Fully upgraded" : "Request manual upgrade"}</button>}
        </article>
      </section>}

      {tab === "employees" && <section className="panel branch-staff-workspace">
        <div className="panel-heading"><div><p className="eyebrow">LOCAL TEAM</p><h3>{branchEmployees.length} employees assigned to {selectedBranch.name}</h3><p>These people carry the branch workload and process ordinary customer and lending work.</p></div></div>
        <div className="branch-staff-grid">{branchEmployees.map((employee) => <article key={employee.id}><div><span>{employee.name.split(" ").map((part) => part[0]).join("")}</span><section><strong>{employee.name}</strong><small>{employee.role}</small></section></div><b>{(employee.workload ?? 75).toFixed(0)}% workload</b><small>Skill {employee.skill} · Wellbeing {(employee.wellbeing ?? employee.energy).toFixed(0)}</small>{employee.id !== selectedBranch.managerId && <button className="text-button" onClick={() => action((state) => assignEmployeeToBranch(state, employee.id, null))}>Move to central pool</button>}</article>)}</div>
        {unassignedBranchStaff.length > 0 && <div className="branch-unassigned-pool"><strong>Available branch staff</strong>{unassignedBranchStaff.map((employee) => <button key={employee.id} onClick={() => action((state) => assignEmployeeToBranch(state, employee.id, selectedBranch.id))}>Assign {employee.name}</button>)}</div>}
      </section>}

      {tab === "loans" && <section className="branch-loan-layout">
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">LOCAL LOAN DESK</p><h3>{branchApplications.length} applications in the branch queue</h3><p>Advisers handle ordinary cases every week. Only amounts or risks outside the manager mandate remain for central review.</p></div></div>{branchApplications.length === 0 ? <div className="empty-state"><strong>No local applications waiting.</strong><p>The branch team has processed its routine queue.</p></div> : <div className="branch-application-list">{branchApplications.map((application) => <article key={application.id}><div><strong>{application.customerName}</strong><small>{application.segment} · grade {application.riskGrade}</small></div><b>{money.format(application.amount)}</b><span>{application.amount > 800_000 || application.riskGrade === "D" ? "Likely central exception" : "Branch review"}</span></article>)}</div>}</article>
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">LOCAL LOAN BOOK</p><h3>{branchLoans.length} active relationships</h3></div></div><div className="branch-loan-summary"><Metric label="Local loans" value={money.format(selectedBranch.localLoans ?? 0)} /><Metric label="Local customers" value={`${selectedBranch.localCustomers ?? 0}`} /><Metric label="Assigned advisers" value={`${branchEmployees.filter((employee) => !employee.executiveRole).length}`} /></div><p className="branch-loan-note">The CRO sets policy. The branch manager and advisers make ordinary decisions inside the mandate.</p></article>
      </section>}

      {tab === "marketing" && <section className="panel branch-marketing-workspace">
        <div className="panel-heading"><div><p className="eyebrow">LOCAL MARKETING</p><h3>Set the ceiling, not every advert</h3><p>{marketingDescription(selectedBranch.managerBudget ?? 0)}</p></div><strong>{money.format(selectedBranch.managerBudget ?? 0)}/mo</strong></div>
        <input aria-label="Local marketing budget" type="range" min="0" max="120000" step="5000" value={selectedBranch.managerBudget ?? 0} onChange={(event) => action((state) => setBranchMarketingBudget(state, selectedBranch.id, Number(event.target.value)))} />
        <div className="branch-marketing-presets"><button onClick={() => action((state) => setBranchMarketingBudget(state, selectedBranch.id, 0))}>Off</button><button onClick={() => action((state) => setBranchMarketingBudget(state, selectedBranch.id, 10_000))}>Lean</button><button onClick={() => action((state) => setBranchMarketingBudget(state, selectedBranch.id, 25_000))}>Steady</button><button onClick={() => action((state) => setBranchMarketingBudget(state, selectedBranch.id, 60_000))}>Growth</button></div>
        <div className="marketing-capacity-note"><strong>{selectedMetrics.capacity.toFixed(0)}% capacity used</strong><p>{selectedMetrics.capacity > 90 ? "The branch is too busy for a major campaign. Extra demand may reduce service quality." : "The branch has room to convert more local demand."}</p></div>
      </section>}

      {tab === "economy" && <section className="branch-economy-layout">
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">MONTHLY INCOME</p><h3>Where the branch earns money</h3></div><strong>{money.format(economics.revenue)}</strong></div><div className="branch-cost-lines"><span><small>Customer and fee income</small><strong>{money.format(Math.max(0, economics.revenue - (economics.deposits + economics.loans) * .001))}</strong></span><span><small>Deposit and lending margin</small><strong>{money.format(Math.min(economics.revenue, (economics.deposits + economics.loans) * .001))}</strong></span></div></article>
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">MONTHLY COSTS</p><h3>Exactly where the money goes</h3></div><strong>{money.format(economics.cost)}</strong></div><div className="branch-cost-lines"><span><small>Rent</small><strong>{money.format(economics.rent)}</strong></span><span><small>Actual employee payroll</small><strong>{money.format(economics.payroll)}</strong></span><span><small>Local marketing</small><strong>{money.format(economics.marketing)}</strong></span><span><small>Systems and branch operations</small><strong>{money.format(economics.operations)}</strong></span><span className="total"><small>Monthly result</small><strong className={economics.profit >= 0 ? "positive" : "negative"}>{money.format(economics.profit)}</strong></span></div><p className="branch-economy-note">Payroll uses assigned employees and annual salary divided by 12. Empty staff slots are not charged.</p></article>
      </section>}
    </>}

    <section className="panel compact-project-programmes">
      <div className="panel-heading"><div><p className="eyebrow">GROUP PROGRAMMES</p><h3>Long-term capability</h3></div></div>
      <div className="compact-project-grid"><Project title="Mobile bank 2.0" cost={2_600_000} days={120} disabled={game.cash < 2_600_000} onClick={() => action((state) => startStrategicProject(state, "mobile-bank"))} /><Project title="Core banking renewal" cost={5_500_000} days={210} disabled={game.cash < 5_500_000} onClick={() => action((state) => startStrategicProject(state, "core-banking"))} /><Project title="Regional head office" cost={8_000_000} days={270} disabled={game.cash < 8_000_000} onClick={() => action((state) => startStrategicProject(state, "head-office"))} /></div>
    </section>

    {mapOpen && <div className="market-map-overlay" role="dialog" aria-modal="true">
      <div className="market-map-shell">
        <header><div><p className="eyebrow">MARKET EXPANSION</p><h2>Regional opportunity map</h2><p>Compare markets and open a new local bank.</p></div><button className="icon-button" onClick={() => setMapOpen(false)}>×</button></header>
        <div className="market-map-layout">
          <article className="market-map-canvas">
            <svg viewBox="0 0 100 100"><rect width="100" height="100" className="v8-map-ground" /><path className="v8-map-water" d="M88 -5 C76 18 92 31 84 51 C77 70 88 84 79 105 H110 V-5 Z" /><path className="v8-map-road" d="M2 59 C23 51 43 57 59 48 C73 40 88 47 99 38" /><path className="v8-map-road" d="M16 3 C26 24 42 39 56 58 C69 75 79 84 93 98" />{game.districts.map((item) => { const owned = game.branchOffices.find((branch) => branch.districtId === item.id); const active = game.projects.find((project) => project.districtId === item.id && project.status !== "completed"); const locked = stageOrder.indexOf(game.campaignStage) < stageOrder.indexOf(item.requiredStage); return <g key={item.id} className={`v8-map-district ${selectedDistrictId === item.id ? "selected" : ""}`} onClick={() => chooseDistrict(item)}><path d={districtShapes[item.id]} className={owned ? "owned" : locked ? "locked" : "available"} /><text x={item.mapX} y={item.mapY - 7} textAnchor="middle">{item.name.replace(" District", "").replace(" Quarter", "")}</text><g transform={`translate(${item.mapX} ${item.mapY})`}><circle r="3.8" className={owned ? "owned" : active ? "project" : locked ? "locked" : "available"} /><text textAnchor="middle" y=".8">{owned ? `L${owned.level}` : active ? `${active.remainingDays}d` : locked ? "—" : `${districtPotential(item)}`}</text></g></g>; })}</svg>
            <div className="v8-map-legend"><span><i className="owned" />Your branch</span><span><i className="available" />Available market</span><span><i className="locked" />Stage restricted</span></div>
          </article>
          <aside className="panel market-expansion-inspector"><div><p className="eyebrow">SELECTED MARKET</p><h3>{district.name}</h3><p>{district.description}</p></div><div className="market-score-row"><Metric label="Opportunity" value={`${districtPotential(district)}/100`} /><Metric label="Population" value={district.population.toLocaleString("en-GB")} /><Metric label="Competition" value={`${district.competition}/100`} /><Metric label="Opening cost" value={money.format(district.openingCost)} /></div>{districtBranch ? <div className="map-existing-branch"><strong>{districtBranch.name}</strong><span>This market is already covered by your network.</span><button className="secondary wide" onClick={() => { setSelectedBranchId(districtBranch.id); setMapOpen(false); }}>Open branch overview</button></div> : districtProject ? <div className="map-existing-branch"><strong>{districtProject.name}</strong><span>{districtProject.remainingDays} days remaining.</span></div> : <><div className="map-profile-grid">{profiles.map((item) => <button key={item} className={profile === item ? "selected" : ""} onClick={() => setProfile(item)}><strong>{profileNames[item]}</strong></button>)}</div>{!assessment?.allowed && <div className="constraint-list"><strong>Cannot open yet</strong>{assessment?.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>}<div className="map-funding-grid"><button className="secondary" disabled={!assessment?.cashAllowed} onClick={() => action((state) => startBranchProjectV7(state, district.id, profile, "cash"))}><strong>Pay in cash</strong><small>{money.format(district.openingCost)}</small></button><button className="primary" disabled={!assessment?.financeAllowed} onClick={() => action((state) => startBranchProjectV7(state, district.id, profile, "financed"))}><strong>Finance expansion</strong><small>{money.format(assessment?.upfront ?? 0)} upfront</small></button></div></>}</aside>
        </div>
      </div>
    </div>}
  </>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
function Project({ title, cost, days, disabled, onClick }: { title: string; cost: number; days: number; disabled: boolean; onClick: () => void }) { return <button disabled={disabled} onClick={onClick}><strong>{title}</strong><span>{money.format(cost)} · {days} days</span></button>; }
