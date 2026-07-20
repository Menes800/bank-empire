import {
  assignBranchManager,
  setBranchManagerControl,
  setBranchPriority,
  startBranchUpgrade,
} from "../../game/engine";
import type { BranchPriority, GameState } from "../../game/store";
import type { BranchOffice, EmployeeProfile } from "../../game/types";
import { getBranchOperationsV9, type BranchSpecializationV9, type UpgradeAuthorityV9 } from "../../game/v9/model";
import { calculateBranchLedgerV9 } from "../../game/v9/branch";
import {
  letManagementFixBranchV9,
  setBranchSpecializationV9,
  setUpgradeAuthorityV9,
  startAdvancedBranchUpgradeV9,
} from "../../game/v9/gameplay";
import type { GameAction } from "../common";
import { money } from "../format";
import { ForecastV9, LedgerColumnV9, MetricV9 } from "./NetworkPartsV9";

const priorities: BranchPriority[] = ["balanced", "growth", "deposits", "business", "profitability"];
const specializations: Array<{ key: BranchSpecializationV9; label: string }> = [
  { key: "standard", label: "Standard branch" },
  { key: "regional-hub", label: "Regional hub" },
  { key: "flagship", label: "Flagship branch" },
  { key: "business-centre", label: "Business centre" },
  { key: "mortgage-centre", label: "Mortgage centre" },
  { key: "wealth-office", label: "Wealth management office" },
  { key: "self-service", label: "Automated self-service" },
  { key: "digital-advisory", label: "Digital advisory centre" },
  { key: "operations-hub", label: "Operations and processing hub" },
];
const authorities: Array<{ key: UpgradeAuthorityV9; label: string; description: string }> = [
  { key: "manual", label: "Manual approval", description: "Every investment returns to the CEO." },
  { key: "small", label: "COO may approve small", description: "Normal Level 1 expansion may be approved." },
  { key: "profitable", label: "COO may approve profitable", description: "Projects with a strong payback may be approved." },
  { key: "full", label: "Full automatic within budget", description: "The COO may approve any recommended upgrade while cash buffers remain safe." },
];

type PortfolioItem = {
  branch: BranchOffice;
  operations: ReturnType<typeof getBranchOperationsV9>;
  ledger: ReturnType<typeof calculateBranchLedgerV9>;
  manager?: EmployeeProfile;
  status: { key: string; label: string };
};

export function BranchDetailV9({ selected, game, action, eligibleManagers }: { selected: PortfolioItem; game: GameState; action: GameAction; eligibleManagers: EmployeeProfile[] }) {
  return <>
      <section className="v9-branch-detail-grid">
        <article className="panel v9-ledger-panel">
          <div className="panel-heading"><div><p className="eyebrow">MONTHLY ECONOMICS</p><h3>{selected.branch.name}</h3><p>Level {selected.operations.effectiveLevel} · {selected.operations.specialization.replaceAll("-", " ")} · {selected.ledger.ageMonths} months old</p></div><div className={`v9-result-badge ${selected.ledger.profit >= 0 ? "positive" : "negative"}`}><small>NET RESULT</small><strong>{money.format(selected.ledger.profit)}</strong></div></div>
          <div className="v9-ledger-columns"><LedgerColumnV9 title="Income" total={selected.ledger.income.total} rows={[["Deposit margin", selected.ledger.income.depositMargin], ["Loan interest", selected.ledger.income.loanInterest], ["Fees and services", selected.ledger.income.feesAndServices], ["Business banking", selected.ledger.income.businessBanking], ["Wealth/products", selected.ledger.income.wealthAndProducts]]} /><LedgerColumnV9 title="Costs" total={selected.ledger.costs.total} rows={[["Salaries", selected.ledger.costs.salaries], ["Premises", selected.ledger.costs.premises], ["Local marketing", selected.ledger.costs.localMarketing], ["Technology/processing", selected.ledger.costs.technologyProcessing], ["Credit losses", selected.ledger.costs.creditLosses], ["Other operating", selected.ledger.costs.otherOperating]]} /></div>
          <div className={`v9-problem-card ${selected.ledger.lossClassification}`}><small>MAIN EXPLANATION</small><strong>{selected.ledger.mainProblem}</strong><span>{selected.ledger.openingPhase ? "Opening-phase losses are expected, but the trajectory still needs monitoring." : selected.ledger.lossClassification === "structural-loss" ? "The current model requires structural action, not another month of waiting." : "Management should track this against the next 90-day forecast."}</span></div>
        </article>

        <article className="panel v9-break-even-panel">
          <div className="panel-heading"><div><p className="eyebrow">BREAK-EVEN & FORECAST</p><h3>What must change?</h3></div></div>
          <div className="v9-break-even-grid"><MetricV9 label="Break-even customers" value={selected.ledger.breakEvenCustomers.toLocaleString("en-GB")} detail={`${selected.ledger.additionalCustomersToBreakEven.toLocaleString("en-GB")} additional`} tone={selected.ledger.additionalCustomersToBreakEven > 0 ? "warning" : "positive"} /><MetricV9 label="Break-even deposits" value={money.format(selected.ledger.breakEvenDeposits)} /><MetricV9 label="Break-even loans" value={money.format(selected.ledger.breakEvenLoans)} /><MetricV9 label="Expected capacity" value={selected.ledger.expectedCapacity.toLocaleString("en-GB")} detail={`${selected.ledger.currentCapacity.toFixed(0)}% currently used`} /></div>
          <div className="v9-forecast-row"><ForecastV9 days="30" value={selected.ledger.forecast30} /><ForecastV9 days="90" value={selected.ledger.forecast90} /><ForecastV9 days="180" value={selected.ledger.forecast180} /></div>
          <div className="manager-accountability"><small>LATEST COO / MANAGER ACTION</small><strong>{selected.operations.lastCooAction ?? selected.branch.lastManagerAction ?? "Waiting for the next management review."}</strong></div>
        </article>
      </section>

      <section className="v9-branch-management-grid">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">MANAGEMENT RULES</p><h3>Set the mandate once</h3></div></div>
          <label className="v9-setting-row"><span><strong>Accountable manager</strong><small>The COO may fill vacancies when management control is enabled.</small></span><select value={selected.branch.managerId ?? ""} onChange={(event) => action((state) => assignBranchManager(state, selected.branch.id, event.target.value || null))}><option value="">No manager</option>{eligibleManagers.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · leadership {employee.leadership}</option>)}</select></label>
          <label className="v9-setting-row checkbox"><span><strong>Manager runs this branch</strong><small>Daily service, routine staffing and local execution are delegated.</small></span><input type="checkbox" checked={selected.branch.managerControl ?? false} onChange={(event) => action((state) => setBranchManagerControl(state, selected.branch.id, event.target.checked))} /></label>
          <label className="v9-setting-row"><span><strong>Operating priority</strong><small>Defines the result management optimises locally.</small></span><select value={selected.branch.operatingPriority ?? "balanced"} onChange={(event) => action((state) => setBranchPriority(state, selected.branch.id, event.target.value as BranchPriority))}>{priorities.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
          <label className="v9-setting-row"><span><strong>Upgrade authority</strong><small>{authorities.find((item) => item.key === selected.operations.upgradeAuthority)?.description}</small></span><select value={selected.operations.upgradeAuthority} onChange={(event) => action((state) => setUpgradeAuthorityV9(state, selected.branch.id, event.target.value as UpgradeAuthorityV9))}>{authorities.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label className="v9-setting-row"><span><strong>Branch model</strong><small>Specialisation changes products, staffing, unit costs and capacity.</small></span><select value={selected.operations.specialization} disabled={selected.operations.effectiveLevel < 3} onChange={(event) => action((state) => setBranchSpecializationV9(state, selected.branch.id, event.target.value as BranchSpecializationV9))}>{specializations.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <button className="primary wide" disabled={!selected.branch.managerId || game.managementControl.operations === "manual" || selected.ledger.recommendations.length === 0} onClick={() => action((state) => letManagementFixBranchV9(state, selected.branch.id))}>Let manager and COO fix this</button>
          <button className="secondary wide" disabled={Boolean(selected.operations.pendingProjectId) || selected.operations.effectiveLevel >= 5} onClick={() => action((state) => selected.operations.effectiveLevel < 3 ? startBranchUpgrade(state, selected.branch.id) : startAdvancedBranchUpgradeV9(state, selected.branch.id, selected.operations.specialization))}>{selected.operations.pendingProjectId ? "Transformation in progress" : selected.operations.effectiveLevel >= 5 ? "Flagship capability reached" : `Request Level ${selected.operations.effectiveLevel + 1} upgrade`}</button>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">RECOMMENDED ACTIONS</p><h3>Cost, effect and risk before approval</h3></div></div>
          {selected.ledger.recommendations.length === 0 ? <div className="empty-state"><strong>No corrective action is required.</strong><p>The branch is operating within its current mandate and capacity.</p></div> : <div className="v9-recommendation-list">{selected.ledger.recommendations.map((recommendation) => <article key={recommendation.id}><div><strong>{recommendation.title}</strong><p>{recommendation.description}</p></div><dl><div><dt>Cost now</dt><dd>{money.format(recommendation.costNow)}</dd></div><div><dt>Monthly effect</dt><dd className="positive">+{money.format(recommendation.expectedMonthlyEffect)}</dd></div><div><dt>Capacity</dt><dd>{recommendation.capacityChange >= 0 ? "+" : ""}{recommendation.capacityChange}</dd></div><div><dt>Risk</dt><dd>{recommendation.risk}</dd></div><div><dt>Break-even</dt><dd>{recommendation.breakEvenMonths === null ? "Exit case" : `${recommendation.breakEvenMonths} mo`}</dd></div></dl></article>)}</div>}
        </article>
      </section>
  </>;
}
