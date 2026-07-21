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
  branchMetricsV89,
  getBranchDiagnosisV89,
  getBranchUpgradePlanV89,
  getProgrammeAssessmentV89,
  startProgrammeV89,
} from "../../game/v89/gameplay";
import type { BranchProfile, GameState, UpgradeAuthority } from "../../game/store";
import type { BranchFocus, BranchOffice, BranchPriority, District } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

type NetworkTab = "network" | "map" | "programmes";
type BranchMode = "balanced" | "growth" | "service" | "deposits" | "lending" | "business" | "profitability";

const profiles: BranchProfile[] = ["retail", "mortgage", "business", "wealth"];
const profileNames: Record<BranchProfile, string> = {
  retail: "Retail branch",
  mortgage: "Mortgage centre",
  business: "Business hub",
  wealth: "Private banking office",
};
const districtShapes: Record<string, string> = {
  industrial: "M4 10 L29 7 L36 28 L27 45 L5 40 Z",
  coast: "M29 4 L64 5 L67 25 L51 34 L35 28 Z",
  university: "M66 7 L94 10 L96 38 L76 43 L65 27 Z",
  central: "M35 29 L65 26 L76 44 L67 63 L39 61 L27 45 Z",
  harbour: "M4 42 L28 46 L40 63 L34 91 L7 88 L2 66 Z",
  garden: "M40 63 L67 64 L78 88 L54 97 L34 91 Z",
  ridge: "M68 45 L96 40 L98 85 L79 89 L67 63 Z",
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
function branchStatus(branch: BranchOffice) {
  const metrics = branchMetricsV89(branch);
  if (!branch.managerId) return { key: "vacant", label: "Needs manager" };
  if (metrics.profit < 0) return { key: "loss", label: "Loss-making" };
  if (metrics.capacityUse > 92) return { key: "pressure", label: "Capacity pressure" };
  return { key: "healthy", label: "Healthy" };
}

export function NetworkPageV89({ game, action }: { game: GameState; action: GameAction }) {
  const [tab, setTab] = useState<NetworkTab>("network");
  const [selectedBranchId, setSelectedBranchId] = useState(game.branchOffices[0]?.id ?? "");
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
  const portfolio = useMemo(() => game.branchOffices.map((branch) => ({
    branch,
    metrics: branchMetricsV89(branch),
    status: branchStatus(branch),
    manager: game.employeeRoster.find((employee) => employee.id === branch.managerId),
  })), [game.branchOffices, game.employeeRoster]);
  const totalProfit = portfolio.reduce((sum, item) => sum + item.metrics.profit, 0);
  const totalCustomers = portfolio.reduce((sum, item) => sum + item.metrics.customers, 0);
  const totalCapacity = portfolio.reduce((sum, item) => sum + item.branch.capacity, 0);
  const attention = portfolio.filter((item) => item.status.key !== "healthy").length;
  const vacancies = portfolio.filter((item) => !item.branch.managerId).length;
  const activeProjects = game.projects.filter((project) => project.status !== "completed");
  const currentMode = selectedBranch
    ? branchModes.find((item) => item.priority === (selectedBranch.operatingPriority ?? "balanced") && item.focus === (selectedBranch.localFocus ?? "service"))?.key ?? "balanced"
    : "balanced";

  const chooseDistrict = (item: District) => {
    if (getExpansionAssessmentV88(game, item.id).status === "locked") return;
    setSelectedDistrictId(item.id);
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
      <div><p className="eyebrow light">BRANCH NETWORK</p><h2>Manage economics, capacity and accountability</h2><p>Branch managers run daily operations. The COO owns recovery plans, staffing and upgrades inside the executive mandate.</p></div>
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

    <nav className="v89-workspace-tabs panel">
      <Tab active={tab === "network"} label="Branch performance" count={game.branchOffices.length} onClick={() => setTab("network")} />
      <Tab active={tab === "map"} label="City & expansion" count={game.districts.length} onClick={() => setTab("map")} />
      <Tab active={tab === "programmes"} label="Group programmes" count={PROGRAMMES_V89.length} onClick={() => setTab("programmes")} />
    </nav>

    {tab === "network" && <section className="v89-network-workspace">
      <article className="panel v89-branch-list">
        <div className="panel-heading"><div><p className="eyebrow">BRANCHES</p><h3>Performance and capacity</h3></div></div>
        {portfolio.map(({ branch, metrics, status, manager }) => <button key={branch.id} className={selectedBranch?.id === branch.id ? "selected" : ""} onClick={() => setSelectedBranchId(branch.id)}>
          <div><strong>{branch.name}</strong><small>{profileNames[branch.profile]} · Level {branch.level}</small></div>
          <span><small>{manager?.name ?? "Manager vacant"}</small><b className={metrics.profit < 0 ? "negative" : "positive"}>{money.format(metrics.profit)}</b></span>
          <i><em style={{ width: `${Math.min(100, metrics.capacityUse)}%` }} /></i>
          <b className={`branch-status ${status.key}`}>{status.label}</b>
        </button>)}
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
          <div className="panel-heading"><div><p className="eyebrow">BRANCH UPGRADE</p><h3>Level {selectedBranch.level} → {Math.min(3, selectedBranch.level + 1)}</h3><p>Authority, economics and delivery risk are evaluated together.</p></div><span className={upgrade.canDelegate ? "status good" : "status warn"}>{upgrade.canDelegate ? "COO authorised" : "CEO authority"}</span></div>
          <div className="v89-upgrade-metrics"><Metric label="Cost" value={money.format(upgrade.cost)} /><Metric label="Capacity gain" value={`+${upgrade.capacityGain}`} /><Metric label="Revenue gain" value={money.format(upgrade.monthlyRevenueGain)} /><Metric label="Cost gain" value={money.format(upgrade.monthlyCostGain)} /><Metric label="Profit gain" value={money.format(upgrade.monthlyProfitGain)} /><Metric label="Payback" value={`${upgrade.paybackMonths.toFixed(0)} months`} /></div>
          {!upgrade.canDelegate && upgrade.reasons.length > 0 && <div className="v89-rule-reasons">{upgrade.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>}
          <button className="primary wide" disabled={!upgrade.canStart} onClick={() => action((state) => approveBranchUpgradeV89(state, selectedBranch.id, !upgrade.canDelegate))}>{upgrade.canDelegate ? `Delegate approval to ${upgrade.cooName}` : "Approve upgrade as CEO"}</button>
        </article>}
      </div>}
    </section>}

    {tab === "map" && district && districtAssessment && <section className="v89-map-layout">
      <article className="panel v89-street-map">
        <div className="panel-heading"><div><p className="eyebrow">CITY EXPANSION MAP</p><h3>Markets, streets and local demand</h3><p>The city layer gives context; the strategic layer shows ownership, projects, competition and unlock status.</p></div></div>
        <svg viewBox="0 0 100 100" role="img" aria-label="Regional street map">
          <rect width="100" height="100" className="v89-map-ground" />
          <path className="v89-water" d="M87 -5 C79 17 93 32 84 52 C77 71 88 85 80 105 H110 V-5 Z" />
          <path className="v89-park" d="M43 8 L58 8 L60 19 L47 22 Z" />
          <path className="v89-park" d="M12 68 L24 64 L29 77 L18 84 Z" />
          {[12,22,32,42,52,62,72,82].map((y) => <path key={`h-${y}`} className="v89-street minor" d={`M3 ${y} C25 ${y - 4} 54 ${y + 4} 96 ${y - 2}`} />)}
          {[14,28,44,60,76].map((x) => <path key={`v-${x}`} className="v89-street minor" d={`M${x} 3 C${x + 8} 28 ${x - 5} 68 ${x + 7} 98`} />)}
          <path className="v89-street arterial" d="M1 58 C25 50 44 59 61 48 C75 39 88 47 99 37" />
          <path className="v89-street arterial" d="M16 2 C25 24 42 40 56 59 C69 76 79 84 94 99" />
          {game.districts.map((item) => {
            const assessment = getExpansionAssessmentV88(game, item.id);
            const owned = game.branchOffices.find((branch) => branch.districtId === item.id);
            const project = game.projects.find((entry) => entry.districtId === item.id && entry.status !== "completed");
            return <g key={item.id} className={`v89-district ${selectedDistrictId === item.id ? "selected" : ""} ${assessment.status}`} onClick={() => chooseDistrict(item)}><path d={districtShapes[item.id]} /><text x={item.mapX} y={item.mapY - 7} textAnchor="middle">{item.name.replace(" District", "").replace(" Quarter", "")}</text><g transform={`translate(${item.mapX} ${item.mapY})`}><circle r="3.6" /><text textAnchor="middle" y=".8">{owned ? `L${owned.level}` : project ? `${project.remainingDays}d` : assessment.status === "locked" ? "LOCK" : potential(item)}</text></g></g>;
          })}
          {game.competitors.slice(0, 4).map((competitor, index) => <g key={competitor.id} className="v89-competitor" transform={`translate(${22 + index * 18} ${24 + (index % 2) * 38})`}><circle r="2.1" /><text x="3" y="1">{competitor.name}</text></g>)}
        </svg>
        <div className="v89-map-legend"><span><i className="owned" />Your branch</span><span><i className="available" />Available</span><span><i className="funding" />Funding constrained</span><span><i className="locked" />Stage locked</span><span><i className="competitor" />Competitor</span></div>
      </article>
      <aside className="panel v89-market-inspector">
        <div className="v89-market-status"><span className={districtAssessment.status}>{districtAssessment.status}</span><small>{district.requiredStage} stage</small></div>
        <p className="eyebrow">SELECTED MARKET</p><h2>{district.name}</h2><p>{district.description}</p>
        <div className="v89-market-metrics"><Metric label="Opportunity" value={`${potential(district)}/100`} /><Metric label="Population" value={district.population.toLocaleString(game.locale)} /><Metric label="Competition" value={`${district.competition}/100`} /><Metric label="Income index" value={`${district.incomeIndex}`} /><Metric label="Digital affinity" value={`${district.digitalAffinity}/100`} /><Metric label="Opening cost" value={money.format(district.openingCost)} /></div>
        {!game.branchOffices.some((branch) => branch.districtId === district.id) && !game.projects.some((project) => project.districtId === district.id && project.status !== "completed") && <>
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
