import { useMemo, useState } from "react";
import { delegateInboxTask, resolveInboxDecision, resolveInboxTask } from "../../game/engine";
import type { CEOInboxTask, GameState } from "../../game/types";
import { getOpenCeoDecisionsV9, readV9 } from "../../game/v9/model";
import type { GameAction } from "../common";

type InboxTab = "decisions" | "reports" | "archive";

const categoryCopy: Record<CEOInboxTask["category"], { label: string; icon: string }> = {
  network: { label: "Network", icon: "N" },
  credit: { label: "Credit & collections", icon: "C" },
  people: { label: "People", icon: "P" },
  market: { label: "Competition", icon: "M" },
  risk: { label: "Risk & treasury", icon: "R" },
  project: { label: "Projects", icon: "D" },
};

export function InboxPageV9({ game, action, onNavigate }: { game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const [tab, setTab] = useState<InboxTab>("decisions");
  const v9 = readV9(game);
  const decisions = getOpenCeoDecisionsV9(game);
  const manualQueue = game.ceoInbox.filter((task) => task.status === "open" && !decisions.some((decision) => decision.id === task.id));
  const handled = game.ceoInbox.filter((task) => task.status !== "open");
  const archive = useMemo(() => [...handled, ...v9.inboxArchive].sort((a, b) => b.createdDay - a.createdDay), [handled, v9.inboxArchive]);
  const critical = decisions.filter((task) => task.urgency === "critical").length;

  return <>
    <section className="v9-command-hero inbox-v9-hero">
      <div><p className="eyebrow light">CEO OPERATING DESK</p><h2>{decisions.length === 0 ? "Management is running the bank" : `${decisions.length} CEO decision${decisions.length === 1 ? "" : "s"} waiting`}</h2><p>Routine work is delegated to the accountable executive. Only strategic, regulatory, high-risk and budget-breaking matters interrupt you.</p></div>
      <div className="v9-hero-stats"><span><small>Needs decision</small><strong>{decisions.length}</strong></span><span><small>Critical</small><strong>{critical}</strong></span><span><small>Management reports</small><strong>{v9.managementReports.length}</strong></span><span><small>Archived</small><strong>{archive.length}</strong></span></div>
    </section>

    <nav className="v9-workspace-tabs panel" aria-label="CEO inbox sections">
      <button className={tab === "decisions" ? "active" : ""} onClick={() => setTab("decisions")}><span>Needs decision</span><b>{decisions.length}</b></button>
      <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}><span>Management reports</span><b>{v9.managementReports.length}</b></button>
      <button className={tab === "archive" ? "active" : ""} onClick={() => setTab("archive")}><span>Archive</span><b>{archive.length}</b></button>
    </nav>

    {tab === "decisions" && <section className="v9-inbox-layout">
      <article className="panel v9-decision-panel">
        <div className="panel-heading"><div><p className="eyebrow">NEEDS DECISION</p><h3>Only matters outside management mandate</h3></div><span className={critical > 0 ? "status warn" : "status good"}>{critical > 0 ? `${critical} critical` : "Controlled"}</span></div>
        {decisions.length === 0 ? <div className="empty-state"><strong>No CEO action is waiting.</strong><p>Autoplay may continue. Executives will report routine outcomes in Management reports.</p></div> : <div className="v9-task-list">{decisions.map((task) => <DecisionCard key={task.id} task={task} game={game} action={action} onNavigate={onNavigate} />)}</div>}
        {manualQueue.length > 0 && <div className="v9-manual-queue"><div className="panel-heading"><div><p className="eyebrow">MANUAL CONTROL QUEUE</p><h3>{manualQueue.length} operational matters remain because an area is set to Manual</h3></div></div>{manualQueue.map((task) => <DecisionCard key={task.id} task={task} game={game} action={action} onNavigate={onNavigate} compact />)}</div>}
      </article>
      <aside className="panel v9-mandate-panel">
        <div className="panel-heading"><div><p className="eyebrow">MANDATE MODEL</p><h3>Who owns the operating bank?</h3></div></div>
        <Mandate role="CFO" area="treasury" label="Funding, liquidity and capital" game={game} />
        <Mandate role="COO" area="operations" label="Branches, workforce and delivery" game={game} />
        <Mandate role="CRO" area="lending" label="Credit quality and collections" game={game} />
        <Mandate role="CMO" area="marketing" label="Growth and competitor response" game={game} />
        <Mandate role="CTO" area="operations" label="Technology, automation and cyber" game={game} />
        <div className="v9-rule-card"><strong>Ask major</strong><p>Management handles routine and operational exceptions. Decisions with strategic, regulatory or critical consequences remain with the CEO.</p></div>
        <div className="v9-rule-card"><strong>Automatic</strong><p>Executives may also choose a balanced response to non-critical decisions inside their mandate and budget.</p></div>
      </aside>
    </section>}

    {tab === "reports" && <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">MANAGEMENT REPORTS</p><h3>Consolidated operating trail</h3><p>Similar routine events are grouped instead of creating one CEO card per incident.</p></div></div>
      {v9.managementReports.length === 0 ? <div className="empty-state"><strong>No consolidated reports yet.</strong><p>Advance to the next management cycle or delegate current routine work.</p></div> : <div className="v9-report-grid">{v9.managementReports.map((report) => <article key={report.id}><div><span>{report.ownerRole}</span><small>Day {report.day} · {categoryCopy[report.category].label}</small></div><strong>{report.title}</strong><p>{report.summary}</p><details><summary>Show handled items</summary><ul>{report.itemTitles.map((title, index) => <li key={`${report.id}-${index}`}>{title}</li>)}</ul></details></article>)}</div>}
    </section>}

    {tab === "archive" && <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">ARCHIVE</p><h3>Delegated, resolved and automatically archived matters</h3></div><span className="status good">Auto-archive after {v9.autoArchiveDays} days</span></div>
      {archive.length === 0 ? <div className="empty-state"><strong>The archive is empty.</strong></div> : <div className="v9-archive-table"><div className="v9-table-head"><span>Status</span><span>Matter</span><span>Owner</span><span>Day</span></div>{archive.map((task) => <div key={`${task.id}-${task.createdDay}`}><span className={`inbox-status ${task.status}`}>{task.status}</span><span><strong>{task.title}</strong><small>{categoryCopy[task.category].label}</small></span><span>{task.ownerRole ?? "CEO"}</span><span>{task.createdDay}</span></div>)}</div>}
    </section>}
  </>;
}

function DecisionCard({ task, game, action, onNavigate, compact = false }: { task: CEOInboxTask; game: GameState; action: GameAction; onNavigate: (page: string) => void; compact?: boolean }) {
  const owner = task.ownerRole ? game.employeeRoster.find((employee) => employee.executiveRole === task.ownerRole) : undefined;
  const branchDelegate = task.category === "network" && game.branchOffices.some((branch) => branch.managerId && branch.managerMandate !== "manual");
  const canDelegate = Boolean(owner || branchDelegate);
  return <article className={`v9-decision-card urgency-${task.urgency} ${compact ? "compact" : ""}`}>
    <div className="v9-decision-heading"><span>{categoryCopy[task.category].icon}</span><div><small>{categoryCopy[task.category].label} · Day {task.createdDay}{task.ownerRole ? ` · ${task.ownerRole}` : ""}</small><strong>{task.title}</strong><p>{task.summary}</p></div><b>{task.urgency}</b></div>
    {task.decision ? <div className="v9-decision-options">{task.decision.choices.map((choice) => <button key={choice.id} onClick={() => action((state) => resolveInboxDecision(state, task.id, choice.id))}><strong>{choice.label}</strong><small>{choice.description}</small></button>)}</div> : <div className="v9-task-actions"><button className="secondary small" onClick={() => onNavigate(task.page)}>Open workspace</button><button className="secondary small" disabled={!canDelegate} onClick={() => action((state) => delegateInboxTask(state, task.id))}>Delegate{owner ? ` to ${owner.name}` : ""}</button><button className="text-button" onClick={() => action((state) => resolveInboxTask(state, task.id))}>Mark reviewed</button></div>}
  </article>;
}

function Mandate({ role, area, label, game }: { role: ExecutiveRoleName; area: "treasury" | "lending" | "marketing" | "operations"; label: string; game: GameState }) {
  const employee = game.employeeRoster.find((person) => person.executiveRole === role);
  const mode = game.managementControl[area];
  return <div className="v9-mandate-row"><span>{role}</span><div><strong>{employee?.name ?? "Vacant"}</strong><small>{label}</small></div><b className={employee ? mode : "vacant"}>{employee ? mode : "vacant"}</b></div>;
}

type ExecutiveRoleName = "CFO" | "COO" | "CRO" | "CMO" | "CTO";
