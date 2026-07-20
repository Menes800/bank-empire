import { useMemo, useState } from "react";
import type { BranchProfile, GameState } from "../../game/store";
import type { BranchOffice } from "../../game/types";
import { getBranchOperationsV9 } from "../../game/v9/model";
import { calculateBranchLedgerV9 } from "../../game/v9/branch";
import type { GameAction } from "../common";
import { money } from "../format";
import { BranchDetailV9 } from "./BranchDetailV9";
import { ExpansionModalV9, MetricV9 } from "./NetworkPartsV9";

function statusFor(branch: BranchOffice, profit: number, capacity: number, lossStreak: number) {
  if (!branch.managerId) return { key: "vacant", label: "Needs manager" };
  if (lossStreak >= 3) return { key: "loss", label: "Persistent loss" };
  if (profit < 0) return { key: "loss", label: "Loss-making" };
  if (capacity > 92) return { key: "pressure", label: "Capacity pressure" };
  return { key: "healthy", label: "Healthy" };
}

export function NetworkPageV9({ game, action }: { game: GameState; action: GameAction }) {
  const [selectedBranchId, setSelectedBranchId] = useState(game.branchOffices[0]?.id ?? "");
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedDistrictId, setSelectedDistrictId] = useState(game.districts[0]?.id ?? "");
  const [profile, setProfile] = useState<BranchProfile>("retail");
  const selectedBranch = game.branchOffices.find((branch) => branch.id === selectedBranchId) ?? game.branchOffices[0];
  const eligibleManagers = game.employeeRoster.filter((employee) => !employee.executiveRole && employee.leadership >= 45);

  const portfolio = useMemo(() => game.branchOffices.map((branch) => {
    const operations = getBranchOperationsV9(game, branch.id);
    const ledger = operations.ledger ?? calculateBranchLedgerV9(game, branch);
    const manager = game.employeeRoster.find((employee) => employee.id === branch.managerId);
    return { branch, operations, ledger, manager, status: statusFor(branch, ledger.profit, ledger.currentCapacity, operations.lossStreak) };
  }), [game]);

  const selected = portfolio.find((item) => item.branch.id === selectedBranch?.id) ?? portfolio[0];
  const totalProfit = portfolio.reduce((sum, item) => sum + item.ledger.profit, 0);
  const totalCustomers = portfolio.reduce((sum, item) => sum + (item.branch.localCustomers ?? 0), 0);
  const attention = portfolio.filter((item) => item.status.key !== "healthy").length;
  const strongest = [...portfolio].sort((a, b) => b.ledger.profit - a.ledger.profit)[0];
  const weakest = [...portfolio].sort((a, b) => a.ledger.profit - b.ledger.profit)[0];
  const activeProjects = game.projects.filter((project) => project.status !== "completed");

  return <>
    <section className="v9-command-hero branch-v9-hero">
      <div><p className="eyebrow light">BRANCH OPERATIONS</p><h2>Manage outcomes, not daily tasks</h2><p>Managers run each branch. The COO compares performance, moves capacity and acts inside the mandate you set.</p></div>
      <div className="v9-hero-actions"><button className="primary" onClick={() => setMapOpen(true)}>Open expansion map</button><span><small>Network result</small><strong className={totalProfit >= 0 ? "positive" : "negative"}>{money.format(totalProfit)}/mo</strong></span></div>
    </section>

    <section className="v9-kpi-grid">
      <MetricV9 label="Branch customers" value={totalCustomers.toLocaleString("en-GB")} />
      <MetricV9 label="Locations" value={`${portfolio.length}`} />
      <MetricV9 label="Need attention" value={`${attention}`} tone={attention > 0 ? "warning" : "positive"} />
      <MetricV9 label="Active programmes" value={`${activeProjects.length}`} />
      <MetricV9 label="Best branch" value={strongest?.branch.name ?? "—"} detail={strongest ? money.format(strongest.ledger.profit) : undefined} />
      <MetricV9 label="Weakest branch" value={weakest?.branch.name ?? "—"} detail={weakest ? money.format(weakest.ledger.profit) : undefined} tone={weakest && weakest.ledger.profit < 0 ? "negative" : undefined} />
    </section>

    <section className="panel v9-branch-table-panel">
      <div className="panel-heading"><div><p className="eyebrow">NETWORK VIEW</p><h3>Performance, capacity and accountability</h3></div><span className="status good">Manager-led</span></div>
      <div className="v9-scroll-table"><div className="v9-branch-table-head"><span>Location</span><span>Model</span><span>Manager</span><span>Result</span><span>Customers</span><span>Capacity</span><span>Status</span></div>{portfolio.map(({ branch, operations, ledger, manager, status }) => <button key={branch.id} className={selected?.branch.id === branch.id ? "selected" : ""} onClick={() => setSelectedBranchId(branch.id)}><span><strong>{branch.name}</strong><small>{branch.profile}</small></span><span><strong>Level {operations.effectiveLevel}</strong><small>{operations.specialization.replaceAll("-", " ")}</small></span><span>{manager?.name ?? "Vacant"}</span><span className={ledger.profit >= 0 ? "positive" : "negative"}>{money.format(ledger.profit)}</span><span>{(branch.localCustomers ?? 0).toLocaleString("en-GB")}</span><span>{ledger.currentCapacity.toFixed(0)}%</span><span><b className={`branch-status ${status.key}`}>{status.label}</b></span></button>)}</div>
    </section>


    {selected && <BranchDetailV9 selected={selected} game={game} action={action} eligibleManagers={eligibleManagers} />}

    <section className="panel v9-project-panel"><div className="panel-heading"><div><p className="eyebrow">DELIVERY PORTFOLIO</p><h3>Active branch and technology programmes</h3></div></div>{activeProjects.length === 0 ? <div className="empty-state"><strong>No active programmes.</strong></div> : <div className="v9-project-list">{activeProjects.map((project) => <article key={project.id}><div><strong>{project.name}</strong><small>{project.status} · {project.remainingDays} days remaining</small></div><progress max={project.durationDays} value={project.durationDays - project.remainingDays} /><span>{money.format(project.budget)}</span></article>)}</div>}</section>

    {mapOpen && <ExpansionModalV9 game={game} selectedDistrictId={selectedDistrictId} setSelectedDistrictId={setSelectedDistrictId} profile={profile} setProfile={setProfile} action={action} onClose={() => setMapOpen(false)} />}
  </>;
}

