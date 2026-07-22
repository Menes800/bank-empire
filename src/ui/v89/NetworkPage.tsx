import { useMemo, useState } from "react";
import {
  assignBranchManager,
  getExpansionAssessmentV88,
  setBranchManagerControl,
  setBranchUpgradeAuthority,
  startBranchProjectV88,
} from "../../game/engine";
import {
  PROGRAMMES_V89,
  approveBranchUpgradeV89,
  getCooPortfolioSummaryV89,
  getBranchDiagnosisV89,
  getBranchUpgradePlanV89,
  getProgrammeAssessmentV89,
  setCooNetworkPolicyV89,
  startProgrammeV89,
} from "../../game/v89/gameplay";
import type { BranchProfile, GameState, UpgradeAuthority } from "../../game/store";
import type { BranchFocus, BranchPortfolioStatus, BranchPriority, District } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

type NetworkTab = "network" | "map" | "programmes";
type BranchMode = "balanced" | "growth" | "service" | "deposits" | "lending" | "business" | "profitability";
type BranchFilter = "all" | BranchPortfolioStatus | "vacant";
type BranchSort = "attention" | "loss" | "capacity" | "customers" | "name";

const profiles: BranchProfile[] = ["retail", "mortgage", "business", "wealth"];
const profileNames: Record<BranchProfile, string> = {
  retail: "Retail branch",
  mortgage: "Mortgage centre",
  business: "Business hub",
  wealth: "Private banking office",
};
const branchModes: { key: BranchMode; label: string; detail: string; priority: BranchPriority; focus: BranchFocus }[] = [
  { key: "balanced", label: "Balanced", detail: "Protect service and steady results", priority: "balanced", focus: "service" },
  { key: "growth", label: "Growth", detail: "Acquire customers faster", priority: "growth", focus: "deposits" },
  { key: "service", label: "Service", detail: "Reduce queues and improve satisfaction", priority: "balanced", focus: "service" },
  { key: "deposits", label: "Deposits", detail: "Build local liquidity", priority: "deposits", focus: "deposits" },
  { key: "lending", label: "Lending", detail: "Grow controlled local lending", priority: "growth", focus: "lending" },
  { key: "business", label: "Business", detail: "Develop SME relationships", priority: "business", focus: "business" },
  { key: "profitability", label: "Profitability", detail: "Reduce cost and prioritise margin", priority: "profitability", focus: "business" },
];
const upgradeOptions: { key: UpgradeAuthority; label: string }[] = [
  { key: "manual", label: "CEO approval only" },
  { key: "small", label: "COO may approve small upgrades" },
  { key: "profitable", label: "COO may approve payback under 24 months" },
];

function potential(district: District) {
  return Math.max(1, Math.min(100, Math.round(
    Math.max(district.retailDemand, district.mortgageDemand, district.businessDemand, district.wealthDemand) * .58
    + district.population / 2_200 + district.digitalAffinity * .1 - district.competition * .16,
  )));
}
function bestProfile(district: District): BranchProfile {
  const scores: Record<BranchProfile, number> = { retail: district.retailDemand, mortgage: district.mortgageDemand, business: district.businessDemand, wealth: district.wealthDemand };
  return profiles.reduce((best, item) => scores[item] > scores[best] ? item : best, "retail");
}
const portfolioLabels: Record<BranchPortfolioStatus, string> = { growth: "Growth", stable: "Stable", turnaround: "Turnaround", review: "CEO review" };

export function NetworkPageV89({ game, action }: { game: GameState; action: GameAction }) {
  const [tab, setTab] = useState<NetworkTab>("network");
  const [selectedBranchId, setSelectedBranchId] = useState(game.branchOffices[0]?.id ?? "");
  const [branchSearch, setBranchSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<BranchFilter>("all");
  const [branchSort, setBranchSort] = useState<BranchSort>("attention");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedDistrictId, setSelectedDistrictId] = useState(
    game.districts.find((item) => getExpansionAssessmentV88(game, item.id).status === "available")?.id ?? game.districts[0]?.id ?? "",
  );
  const [profile, setProfile] = useState<BranchProfile>("retail");
  const selectedBranch = game.branchOffices.find((branch) => branch.id === selectedBranchId) ?? game.branchOffices[0];
  const diagnosis = selectedBranch ? getBranchDiagnosisV89(game, selectedBranch) : null;
  const upgrade = selectedBranch ? getBranchUpgradePlanV89(game, selectedBranch.id) : null;
  const district = game.districts.find((item) => item.id === selectedDistrictId) ?? game.districts[0];
  const districtAssessment = district ? getExpansionAssessmentV88(game, district.id) : null;
  const managers = game.employeeRoster.filter((employee) => !employee.executiveRole && employee.leadership >= 45);
  const summary = useMemo(() => getCooPortfolioSummaryV89(game), [game]);
  const portfolio = useMemo(() => summary.branches.map((item) => ({
    ...item,
    manager: game.employeeRoster.find((employee) => employee.id === item.branch.managerId),
  })), [summary, game.employeeRoster]);
  const visiblePortfolio = useMemo(() => {
    const query = branchSearch.trim().toLowerCase();
    const filtered = portfolio.filter(({ branch, status, manager }) => {
      const matchesSearch = !query || `${branch.name} ${manager?.name ?? ""} ${branch.profile}`.toLowerCase().includes(query);
      const matchesFilter = branchFilter === "all" || branchFilter === "vacant" ? branchFilter === "all" || !branch.managerId : status === branchFilter;
      return matchesSearch && matchesFilter;
    });
    const attentionRank: Record<BranchPortfolioStatus, number> = { review: 0, turnaround: 1, growth: 2, stable: 3 };
    return [...filtered].sort((a, b) => branchSort === "loss" ? a.metrics.profit - b.metrics.profit
      : branchSort === "capacity" ? b.metrics.capacityUse - a.metrics.capacityUse
        : branchSort === "customers" ? b.metrics.customers - a.metrics.customers
          : branchSort === "name" ? a.branch.name.localeCompare(b.branch.name)
            : attentionRank[a.status] - attentionRank[b.status] || a.metrics.profit - b.metrics.profit);
  }, [portfolio, branchSearch, branchFilter, branchSort]);
  const totalProfit = summary.totalProfit;
  const totalCustomers = portfolio.reduce((sum, item) => sum + item.metrics.customers, 0);
  const totalCapacity = portfolio.reduce((sum, item) => sum + item.branch.capacity, 0);
  const attention = summary.counts.turnaround + summary.counts.review;
  const vacancies = summary.vacancies;
  const activeProjects = game.projects.filter((project) => project.status !== "completed");
  const coo = game.employeeRoster.find((employee) => employee.executiveRole === "COO");
  const latestCooReview = game.managementLog.find((entry) => entry.role === "COO" && entry.title === "Monthly branch portfolio review");
  const regions = useMemo(() => [...new Set(game.districts.map((item) => item.region))], [game.districts]);
  const visibleDistricts = selectedRegion === "all" ? game.districts : game.districts.filter((item) => item.region === selectedRegion);
  const currentMode = selectedBranch
    ? branchModes.find((item) => item.priority === (selectedBranch.operatingPriority ?? "balanced") && item.focus === (selectedBranch.localFocus ?? "service"))?.key ?? "balanced"
    : "balanced";

  const chooseDistrict = (item: District) => {
    setSelectedDistrictId(item.id);
    setSelectedRegion(item.region);
    setProfile(bestProfile(item));
  };
  const setMode = (branchId: string, key: BranchMode) => {
    const mode = branchModes.find((item) => item.key === key)!;
    action((state) => ({
      ...state,
      branchOffices: state.branchOffices.map((branch) => branch.id === branchId
        ? { ...branch, operatingPriority: mode.priority, localFocus: mode.focus }
        : branch),
    }));
  };

  return <>
    <section className="v89-network-hero">
      <div><p className="eyebrow light">BRANCH NETWORK</p><h2>Run the network through your COO</h2><p>Managers own daily operations. The COO handles staffing, resource moves and recovery plans; the CEO decides openings, closures and investments above mandate.</p></div>
      <button className="primary" onClick={() => setTab("map")}>Open city map</button>
    </section>

    <section className="v89-network-kpis">
      <Headline label="Monthly result" value={money.format(totalProfit)} tone={totalProfit < 0 ? "warning" : "good"} />
      <Headline label="Branch customers" value={totalCustomers.toLocaleString(game.locale)} />
      <Headline label="Capacity used" value={`${(totalCustomers / Math.max(1, totalCapacity) * 100).toFixed(0)}%`} />
      <Headline label="Need attention" value={`${attention}`} tone={attention ? "warning" : "good"} />
      <Headline label="Manager vacancies" value={`${vacancies}`} tone={vacancies ? "warning" : "good"} />
      <Headline label="Active delivery" value={`${activeProjects.length}`} />
    </section>

    <article className="panel v813-coo-command">
      <header>
        <div><p className="eyebrow">COO NETWORK MANDATE</p><h3>{coo ? `${coo.name} · portfolio owner` : "COO position vacant"}</h3><p>{latestCooReview?.detail ?? "The first consolidated portfolio report is produced at the next monthly close."}</p></div>
        <label className="v89-delegated-toggle"><input type="checkbox" checked={game.cooNetworkPolicy.enabled} disabled={!coo} onChange={(event) => action((state) => setCooNetworkPolicyV89(state, { enabled: event.target.checked }))} /><span><strong>{game.cooNetworkPolicy.enabled ? "COO control active" : "CEO manual control"}</strong><small>Routine branch actions stay inside the approved mandate.</small></span></label>
      </header>
      <div className="v813-coo-policy-grid">
        <label><span><strong>Network priority</strong><small>Guides staffing and recovery choices.</small></span><select value={game.cooNetworkPolicy.priority} onChange={(event) => action((state) => setCooNetworkPolicyV89(state, { priority: event.target.value as GameState["cooNetworkPolicy"]["priority"] }))}><option value="profitability">Profitability first</option><option value="balanced">Balanced network</option><option value="growth">Controlled growth</option></select></label>
        <label><span><strong>Investment ceiling</strong><small>COO cannot approve more per branch.</small></span><input type="number" min="0" step="100000" value={game.cooNetworkPolicy.investmentLimit} onChange={(event) => action((state) => setCooNetworkPolicyV89(state, { investmentLimit: Number(event.target.value) }))} /></label>
        <label><span><strong>Recovery review</strong><small>First formal checkpoint.</small></span><select value={game.cooNetworkPolicy.reviewDays} onChange={(event) => action((state) => setCooNetworkPolicyV89(state, { reviewDays: Number(event.target.value) }))}><option value="60">60 days</option><option value="90">90 days</option><option value="120">120 days</option></select></label>
        <label><span><strong>Break-even deadline</strong><small>Then closure or relocation reaches CEO.</small></span><select value={game.cooNetworkPolicy.breakEvenDays} onChange={(event) => action((state) => setCooNetworkPolicyV89(state, { breakEvenDays: Number(event.target.value) }))}><option value="120">4 months</option><option value="180">6 months</option><option value="270">9 months</option></select></label>
        <label className="v813-auto-hire"><input type="checkbox" checked={game.cooNetworkPolicy.autoHireManagers} onChange={(event) => action((state) => setCooNetworkPolicyV89(state, { autoHireManagers: event.target.checked }))} /><span><strong>Recruit branch managers</strong><small>Maximum two external appointments per monthly review, inside salary authority.</small></span></label>
      </div>
      <div className="v813-portfolio-buckets"><span className="growth"><small>Growth</small><strong>{summary.counts.growth}</strong></span><span className="stable"><small>Stable</small><strong>{summary.counts.stable}</strong></span><span className="turnaround"><small>Turnaround</small><strong>{summary.counts.turnaround}</strong></span><span className="review"><small>CEO review</small><strong>{summary.counts.review}</strong></span><span><small>Next recovery review</small><strong>{summary.nextReviewDay ? `Day ${summary.nextReviewDay}` : "None active"}</strong></span></div>
    </article>

    <nav className="v89-workspace-tabs panel">
      <Tab active={tab === "network"} label="Branch performance" count={game.branchOffices.length} onClick={() => setTab("network")} />
      <Tab active={tab === "map"} label="City & expansion" count={game.districts.length} onClick={() => setTab("map")} />
      <Tab active={tab === "programmes"} label="Group programmes" count={PROGRAMMES_V89.length} onClick={() => setTab("programmes")} />
    </nav>

    {tab === "network" && <section className="v89-network-workspace">
      <article className="panel v89-branch-list">
        <div className="panel-heading"><div><p className="eyebrow">BRANCHES</p><h3>{visiblePortfolio.length} of {portfolio.length} locations</h3></div></div>
        <div className="v813-branch-tools"><input type="search" value={branchSearch} onChange={(event) => setBranchSearch(event.target.value)} placeholder="Search branch or manager" /><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value as BranchFilter)}><option value="all">All statuses</option><option value="growth">Growth</option><option value="stable">Stable</option><option value="turnaround">Turnaround</option><option value="review">CEO review</option><option value="vacant">Manager vacant</option></select><select value={branchSort} onChange={(event) => setBranchSort(event.target.value as BranchSort)}><option value="attention">Attention first</option><option value="loss">Largest loss</option><option value="capacity">Capacity use</option><option value="customers">Customers</option><option value="name">Name</option></select></div>
        {visiblePortfolio.map(({ branch, metrics, status, manager }) => <button key={branch.id} className={selectedBranch?.id === branch.id ? "selected" : ""} onClick={() => setSelectedBranchId(branch.id)}>
          <div><strong>{branch.name}</strong><small>{profileNames[branch.profile]} · Level {branch.level}</small></div>
          <span><small>{manager?.name ?? "Manager vacant"}</small><b className={metrics.profit < 0 ? "negative" : "positive"}>{money.format(metrics.profit)}</b></span>
          <i><em style={{ width: `${Math.min(100, metrics.capacityUse)}%` }} /></i>
          <b className={`branch-status ${!branch.managerId ? "vacant" : status}`}>{!branch.managerId ? "Needs manager" : portfolioLabels[status]}</b>
        </button>)}
        {visiblePortfolio.length === 0 && <div className="v89-compact-empty"><strong>No branches match these filters</strong><span>Clear the search or choose another portfolio status.</span></div>}
      </article>

      {selectedBranch && diagnosis && <div className="v89-branch-detail">
        <article className="panel v89-branch-economics">
          <div className="panel-heading"><div><p className="eyebrow">SELECTED BRANCH</p><h3>{selectedBranch.name}</h3><p>{profileNames[selectedBranch.profile]} · Level {selectedBranch.level}</p></div><strong className={diagnosis.metrics.profit < 0 ? "negative" : "positive"}>{money.format(diagnosis.metrics.profit)}/mo</strong></div>
          <div className="v89-branch-metrics">
            <Metric label="Revenue" value={money.format(diagnosis.metrics.revenue)} />
            <Metric label="Operating cost" value={money.format(diagnosis.metrics.cost)} />
            <Metric label="Customers" value={diagnosis.metrics.customers.toLocaleString(game.locale)} />
            <Metric label="Capacity" value={`${diagnosis.metrics.capacityUse.toFixed(0)}%`} />
            <Metric label="Deposits" value={money.format(diagnosis.metrics.deposits)} />
            <Metric label="Loans" value={money.format(diagnosis.metrics.loans)} />
          </div>
          <div className={`v812-break-even ${diagnosis.metrics.profit < 0 ? "warning" : "good"}`}><span><small>BREAK-EVEN</small><strong>{diagnosis.breakEvenCustomers.toLocaleString(game.locale)} customers</strong></span><p>{diagnosis.customersToBreakEven > 0 ? `${diagnosis.customersToBreakEven.toLocaleString(game.locale)} more customers are needed at the current revenue and cost mix.` : "This branch is operating above break-even."}</p></div>
          {selectedBranch.recoveryPlan && <div className={`v813-recovery-strip ${selectedBranch.recoveryPlan.status}`}><span><small>COO RECOVERY PLAN</small><strong>{selectedBranch.recoveryPlan.status === "recovered" ? "Recovered" : selectedBranch.recoveryPlan.status === "escalated" ? "CEO decision required" : `Review day ${selectedBranch.recoveryPlan.reviewDay}`}</strong></span><p>{selectedBranch.recoveryPlan.status === "active" ? `Break-even deadline: day ${selectedBranch.recoveryPlan.deadlineDay}. Baseline ${money.format(selectedBranch.recoveryPlan.baselineProfit)}/mo.` : selectedBranch.lastManagerAction}</p></div>}
          <div className="v89-cost-breakdown">
            <div><small>MONTHLY COST DRIVERS</small><span>Staffing <b>{money.format(diagnosis.metrics.staffing)}</b></span><span>Rent <b>{money.format(diagnosis.metrics.rent)}</b></span><span>Local activity <b>{money.format(diagnosis.metrics.localActivity)}</b></span></div>
            <div><small>WHY THIS RESULT</small>{diagnosis.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>
            <div><small>COO RECOMMENDATION</small><strong>{diagnosis.recommendation}</strong><span>{selectedBranch.lastManagerAction ?? "Waiting for the next monthly management review."}</span></div>
          </div>
        </article>

        <article className="panel v89-branch-controls">
          <div className="panel-heading"><div><p className="eyebrow">BRANCH MANAGEMENT</p><h3>Manager, priority and authority</h3></div></div>
          <label><span><strong>Accountable manager</strong><small>Skill, leadership and workload affect local execution.</small></span><select value={selectedBranch.managerId ?? ""} onChange={(event) => action((state) => assignBranchManager(state, selectedBranch.id, event.target.value || null))}><option value="">No manager</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} · leadership {manager.leadership}</option>)}</select></label>
          <label className="v89-delegated-toggle"><input type="checkbox" checked={selectedBranch.managerControl ?? false} onChange={(event) => action((state) => setBranchManagerControl(state, selectedBranch.id, event.target.checked))} /><span><strong>{selectedBranch.managerControl ? "Delegated local operations" : "CEO-controlled local operations"}</strong><small>Daily service, local activity and routine staffing pressure are handled automatically while enabled.</small></span></label>
          <div className="v89-branch-mode-grid">{branchModes.map((mode) => <button key={mode.key} className={currentMode === mode.key ? "selected" : ""} onClick={() => setMode(selectedBranch.id, mode.key)}><strong>{mode.label}</strong><small>{mode.detail}</small></button>)}</div>
          <label><span><strong>Local monthly budget</strong><small>Branch spending remains visible and bounded by group cash.</small></span><input type="number" min="0" step="5000" value={selectedBranch.managerBudget ?? 0} onChange={(event) => action((state) => ({ ...state, branchOffices: state.branchOffices.map((branch) => branch.id === selectedBranch.id ? { ...branch, managerBudget: Math.max(0, Number(event.target.value)) } : branch) }))} /></label>
          <label><span><strong>Upgrade authority</strong><small>Choose when the COO may approve without returning to the CEO.</small></span><select value={selectedBranch.upgradeAuthority ?? "profitable"} onChange={(event) => action((state) => setBranchUpgradeAuthority(state, selectedBranch.id, event.target.value as UpgradeAuthority))}>{upgradeOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
        </article>

        {upgrade && <article className="panel v89-upgrade-card">
          <div className="panel-heading"><div><p className="eyebrow">BRANCH UPGRADE</p><h3>Level {selectedBranch.level} → {Math.min(3, selectedBranch.level + 1)}</h3><p>Authority, economics and delivery risk are evaluated together.</p></div><span className={upgrade.canDelegate ? "status good" : "status warn"}>{!upgrade.canStart ? "Not viable" : upgrade.canDelegate ? "COO authorised" : "CEO authority"}</span></div>
          <div className="v89-upgrade-metrics"><Metric label="Cost" value={money.format(upgrade.cost)} /><Metric label="Capacity gain" value={`+${upgrade.capacityGain}`} /><Metric label="Revenue gain" value={money.format(upgrade.monthlyRevenueGain)} /><Metric label="Cost gain" value={money.format(upgrade.monthlyCostGain)} /><Metric label="Profit gain" value={money.format(upgrade.monthlyProfitGain)} /><Metric label="Payback" value={upgrade.paybackMonths === null ? "Not viable" : `${upgrade.paybackMonths.toFixed(0)} months`} /></div>
          {!upgrade.canDelegate && upgrade.reasons.length > 0 && <div className="v89-rule-reasons">{upgrade.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>}
          <button className="primary wide" disabled={!upgrade.canStart} onClick={() => action((state) => approveBranchUpgradeV89(state, selectedBranch.id, !upgrade.canDelegate))}>{!upgrade.canStart ? "Build demand before upgrading" : upgrade.canDelegate ? `Delegate approval to ${upgrade.cooName}` : "Approve upgrade as CEO"}</button>
        </article>}
      </div>}
    </section>}

    {tab === "map" && district && districtAssessment && <section className="v89-map-layout">
      <article className="panel v89-street-map">
        <div className="panel-heading v813-map-heading"><div><p className="eyebrow">NATIONAL EXPANSION MAP</p><h3>24 city markets across {regions.length} regions</h3><p>Large cities support several locations. Smaller markets saturate after one branch.</p></div><select value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}><option value="all">All regions</option>{regions.map((region) => <option key={region} value={region}>{region}</option>)}</select></div>
        <svg viewBox="0 0 100 100" role="img" aria-label="Regional street map">
          <rect width="100" height="100" className="v89-map-ground" />
          {[12,22,32,42,52,62,72,82].map((y) => <path key={`h-${y}`} className="v89-street minor" d={`M3 ${y} C25 ${y - 4} 54 ${y + 4} 96 ${y - 2}`} />)}
          {[14,28,44,60,76].map((x) => <path key={`v-${x}`} className="v89-street minor" d={`M${x} 3 C${x + 8} 28 ${x - 5} 68 ${x + 7} 98`} />)}
          <path className="v89-street arterial" d="M1 58 C25 50 44 59 61 48 C75 39 88 47 99 37" />
          <path className="v89-street arterial" d="M16 2 C25 24 42 40 56 59 C69 76 79 84 94 99" />
          {visibleDistricts.map((item) => {
            const assessment = getExpansionAssessmentV88(game, item.id);
            const owned = game.branchOffices.filter((branch) => branch.districtId === item.id);
            const project = game.projects.find((entry) => entry.districtId === item.id && entry.status !== "completed");
            return <g key={item.id} transform={`translate(${item.mapX} ${item.mapY})`} className={`v89-district v813-market-pin ${selectedDistrictId === item.id ? "selected" : ""} ${assessment.status}`} onClick={() => chooseDistrict(item)}><circle r={selectedDistrictId === item.id ? 4.8 : 3.7} /><text className="v813-pin-label" textAnchor="middle" y="-6">{selectedRegion !== "all" || selectedDistrictId === item.id ? item.city : ""}</text><text className="v813-pin-value" textAnchor="middle" y=".9">{project ? `${project.remainingDays}d` : assessment.status === "locked" ? "L" : owned.length ? `${owned.length}/${item.maxBranches}` : potential(item)}</text></g>;
          })}
        </svg>
        <div className="v89-map-legend"><span><i className="owned" />At branch limit</span><span><i className="available" />Space available</span><span><i className="funding" />Funding constrained</span><span><i className="locked" />Stage locked</span></div>
        <div className="v813-city-grid">{visibleDistricts.map((item) => { const assessment = getExpansionAssessmentV88(game, item.id); const locations = game.branchOffices.filter((branch) => branch.districtId === item.id).length; return <button key={item.id} className={`${selectedDistrictId === item.id ? "selected" : ""} ${assessment.status}`} onClick={() => chooseDistrict(item)}><span><strong>{item.city}</strong><small>{item.region}</small></span><span><b>{locations}/{item.maxBranches}</b><small>{potential(item)} opportunity</small></span></button>; })}</div>
      </article>
      <aside className="panel v89-market-inspector">
        <div className="v89-market-status"><span className={districtAssessment.status}>{districtAssessment.status}</span><small>{district.region} · {district.requiredStage} stage</small></div>
        <p className="eyebrow">SELECTED MARKET</p><h2>{district.name}</h2><p>{district.description}</p>
        <div className="v89-market-metrics"><Metric label="Opportunity" value={`${potential(district)}/100`} /><Metric label="Population" value={district.population.toLocaleString(game.locale)} /><Metric label="Competition" value={`${district.competition}/100`} /><Metric label="Branch slots" value={`${game.branchOffices.filter((branch) => branch.districtId === district.id).length}/${district.maxBranches}`} /><Metric label="Digital affinity" value={`${district.digitalAffinity}/100`} /><Metric label="Opening cost" value={money.format(district.openingCost)} /></div>
        {game.branchOffices.filter((branch) => branch.districtId === district.id).length < district.maxBranches && !game.projects.some((project) => project.districtId === district.id && project.status !== "completed") && <>
          <div className="v89-profile-grid">{profiles.map((item) => <button key={item} className={profile === item ? "selected" : ""} onClick={() => setProfile(item)}><strong>{profileNames[item]}</strong></button>)}</div>
          {districtAssessment.reasons.length > 0 && <div className="v89-rule-reasons">{districtAssessment.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>}
          <div className="v89-funding-grid"><button className="secondary" disabled={!districtAssessment.cashAllowed} onClick={() => action((state) => startBranchProjectV88(state, district.id, profile, "cash"))}><strong>Pay in cash</strong><small>{money.format(district.openingCost)}</small></button><button className="primary" disabled={!districtAssessment.financeAllowed} onClick={() => action((state) => startBranchProjectV88(state, district.id, profile, "financed"))}><strong>Finance expansion</strong><small>{money.format(districtAssessment.upfront)} upfront</small></button></div>
        </>}
      </aside>
    </section>}

    {tab === "programmes" && <section className="v89-programme-grid">{PROGRAMMES_V89.map((config) => {
      const assessment = getProgrammeAssessmentV89(game, config.kind);
      const progress = assessment.project ? (1 - assessment.project.remainingDays / Math.max(1, assessment.project.durationDays)) * 100 : assessment.completed ? 100 : 0;
      return <article className="panel" key={config.kind}>
        <header><div><p className="eyebrow">{config.ownerRole} PROGRAMME</p><h3>{config.title}</h3><p>{config.summary}</p></div><span className={assessment.completed ? "status good" : assessment.project ? "status warn" : "status"}>{assessment.completed ? "Completed" : assessment.project ? assessment.project.status : "Available"}</span></header>
        <div className="v89-programme-meta"><Metric label="Budget" value={money.format(config.budget)} /><Metric label="Duration" value={`${config.duration} days`} /><Metric label="Risk" value={`${config.risk}/100`} /><Metric label="Owner" value={assessment.executiveName ?? `${config.ownerRole} vacant`} /></div>
        <div className="v89-programme-benefits">{config.benefits.map((benefit) => <span key={benefit}>{benefit}</span>)}</div>
        {assessment.project && <div className="v89-programme-progress"><div><i style={{ width: `${progress}%` }} /></div><span>{progress.toFixed(0)}% · {assessment.project.remainingDays} days remaining · {money.format(assessment.project.spent)} used</span></div>}
        {!assessment.project && !assessment.completed && <>{[...assessment.reasons, ...assessment.mandateReasons].length > 0 && <div className="v89-rule-reasons">{[...assessment.reasons, ...assessment.mandateReasons].map((reason) => <span key={reason}>{reason}</span>)}</div>}<button className="primary wide" disabled={!assessment.canStart} onClick={() => action((state) => startProgrammeV89(state, config.kind, !assessment.canDelegate))}>{assessment.canDelegate ? `Delegate launch to ${assessment.executiveName}` : "Approve programme as CEO"}</button></>}
      </article>;
    })}</section>}
  </>;
}

function Tab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) { return <button className={active ? "selected" : ""} onClick={onClick}><span>{label}</span><b>{count}</b></button>; }
function Headline({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
function Metric({ label, value }: { label: string; value: string }) { return <span><small>{label}</small><strong>{value}</strong></span>; }
