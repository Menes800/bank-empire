import { delegateInboxTask, resolveInboxDecision, resolveInboxTask } from "../../game/engine";
import type { CEOInboxTask, GameState } from "../../game/types";
import type { GameAction } from "../common";

const categoryCopy: Record<CEOInboxTask["category"], { label: string; icon: string }> = {
  network: { label: "Network", icon: "N" },
  credit: { label: "Credit & collections", icon: "C" },
  people: { label: "People", icon: "P" },
  market: { label: "Competition", icon: "M" },
  risk: { label: "Risk & treasury", icon: "R" },
  project: { label: "Projects", icon: "D" },
};

export function InboxPage({ game, action, onNavigate }: { game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const open = game.ceoInbox.filter((task) => task.status === "open");
  const completed = game.ceoInbox.filter((task) => task.status !== "open").slice(0, 8);
  const critical = open.filter((task) => task.urgency === "critical").length;
  const important = open.filter((task) => task.urgency === "important").length;

  return <>
    <section className="inbox-command-card">
      <div><p className="eyebrow light">CEO OPERATING DESK</p><h2>{open.length === 0 ? "The organisation is under control" : `${open.length} matters need ownership`}</h2><p>Routine work belongs with managers. Strategic, high-value and high-risk matters stay visible here until they are resolved or delegated.</p></div>
      <div className="inbox-command-stats"><span><small>Critical</small><strong>{critical}</strong></span><span><small>Important</small><strong>{important}</strong></span><span><small>Delegated or closed</small><strong>{game.ceoInbox.filter((task) => task.status !== "open").length}</strong></span></div>
    </section>

    <section className="inbox-layout">
      <article className="panel inbox-main-panel">
        <div className="panel-heading"><div><p className="eyebrow">OPEN MATTERS</p><h3>Decisions and management follow-up</h3></div><span className={critical > 0 ? "status warn" : "status good"}>{critical > 0 ? `${critical} critical` : "Controlled"}</span></div>
        {open.length === 0 ? <div className="empty-state inbox-empty"><strong>No CEO action is waiting.</strong><p>Advance time or continue building the bank. Managers and executives will report material exceptions here.</p></div> : <div className="ceo-task-list">{open.map((task) => <TaskCard key={task.id} task={task} game={game} action={action} onNavigate={onNavigate} />)}</div>}
      </article>

      <aside className="panel inbox-side-panel">
        <div className="panel-heading"><div><p className="eyebrow">OPERATING MODEL</p><h3>Who should own what?</h3></div></div>
        <div className="ownership-list">
          <Owner role="CFO" text="Liquidity, funding and capital actions" game={game} />
          <Owner role="COO" text="Branches, service, people and delivery" game={game} />
          <Owner role="CRO" text="Credit exceptions, arrears and collections" game={game} />
          <Owner role="CMO" text="Competitors, pricing response and customer defence" game={game} />
          <Owner role="CTO" text="Digital delivery, cyber and core systems" game={game} />
        </div>
        <div className="inbox-rule-card"><strong>CEO rule</strong><p>Delegate routine execution. Keep decisions that can materially change capital, reputation, strategy or ownership.</p></div>
      </aside>
    </section>

    {completed.length > 0 && <section className="panel inbox-history-panel"><div className="panel-heading"><div><p className="eyebrow">RECENTLY HANDLED</p><h3>Management trail</h3></div></div><div className="handled-task-grid">{completed.map((task) => <article key={task.id}><span className={`inbox-status ${task.status}`}>{task.status}</span><strong>{task.title}</strong><small>Day {task.createdDay} · {categoryCopy[task.category].label}</small></article>)}</div></section>}
  </>;
}

function TaskCard({ task, game, action, onNavigate }: { task: CEOInboxTask; game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const owner = task.ownerRole ? game.employeeRoster.find((employee) => employee.executiveRole === task.ownerRole) : undefined;
  const branchDelegate = task.category === "network" && game.branchOffices.some((branch) => branch.managerId && branch.managerMandate !== "manual");
  const canDelegate = Boolean(owner || branchDelegate);
  return <article className={`ceo-task-card urgency-${task.urgency}`}>
    <div className="ceo-task-heading"><span>{categoryCopy[task.category].icon}</span><div><small>{categoryCopy[task.category].label} · Day {task.createdDay}</small><strong>{task.title}</strong><p>{task.summary}</p></div><b>{task.urgency}</b></div>
    {task.decision ? <div className="inbox-decision-options">{task.decision.choices.map((choice) => <button key={choice.id} onClick={() => action((state) => resolveInboxDecision(state, task.id, choice.id))}><strong>{choice.label}</strong><small>{choice.description}</small></button>)}</div> : <div className="ceo-task-actions"><button className="secondary small" onClick={() => onNavigate(task.page)}>Open workspace</button><button className="secondary small" disabled={!canDelegate} title={canDelegate ? `Delegate to ${owner?.name ?? "branch management"}` : `Appoint ${task.ownerRole ?? "a responsible manager"} first`} onClick={() => action((state) => delegateInboxTask(state, task.id))}>Delegate{owner ? ` to ${owner.name}` : ""}</button><button className="text-button" onClick={() => action((state) => resolveInboxTask(state, task.id))}>Mark reviewed</button></div>}
  </article>;
}

function Owner({ role, text, game }: { role: "CFO" | "COO" | "CRO" | "CMO" | "CTO"; text: string; game: GameState }) {
  const employee = game.employeeRoster.find((person) => person.executiveRole === role);
  return <div className="ownership-row"><span>{role}</span><div><strong>{employee?.name ?? "Vacant mandate"}</strong><small>{text}</small></div><b className={employee ? "ready" : "vacant"}>{employee ? "Ready" : "Vacant"}</b></div>;
}
