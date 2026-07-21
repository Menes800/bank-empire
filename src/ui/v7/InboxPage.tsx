import { resolveInboxDecision, resolveInboxTask } from "../../game/engine";
import { delegateInboxTaskV85, getDelegationTarget } from "../../game/v85/gameplay";
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
  const open = game.ceoInbox.filter((task) => task.status === "open" && task.urgency !== "routine");
  const completed = game.ceoInbox.filter((task) => task.status !== "open" && task.urgency !== "routine").slice(0, 6);
  const critical = open.filter((task) => task.urgency === "critical").length;
  const important = open.filter((task) => task.urgency === "important").length;
  const handled = game.ceoInbox.filter((task) => task.status !== "open").length;

  return <>
    <section className="inbox-command-card">
      <div><p className="eyebrow light">CEO OPERATING DESK</p><h2>{open.length === 0 ? "Management is handling the bank" : `${open.length} material ${open.length === 1 ? "matter needs" : "matters need"} ownership`}</h2><p>Every card names the responsible person. Routine work disappears after management handles it; only real exceptions remain here.</p></div>
      <div className="inbox-command-stats"><span><small>Critical</small><strong>{critical}</strong></span><span><small>Important</small><strong>{important}</strong></span><span><small>Handled by management</small><strong>{handled}</strong></span></div>
    </section>

    <section className="panel inbox-main-panel inbox-main-v85">
      <div className="panel-heading"><div><p className="eyebrow">CEO MATTERS</p><h3>Material decisions and true exceptions</h3></div><span className={open.length === 0 ? "status good" : critical > 0 ? "status warn" : "status"}>{open.length === 0 ? "Controlled" : critical > 0 ? `${critical} critical` : `${open.length} awaiting action`}</span></div>
      {open.length === 0 ? <div className="empty-state inbox-empty"><strong>No CEO action is waiting.</strong><p>Advance time or continue building the bank. Executives and branch managers will report completed work through the event log.</p></div> : <div className="ceo-task-list">{open.map((task) => <TaskCard key={task.id} task={task} game={game} action={action} onNavigate={onNavigate} />)}</div>}
    </section>

    {completed.length > 0 && <section className="panel inbox-history-panel"><div className="panel-heading"><div><p className="eyebrow">RECENTLY HANDLED</p><h3>Management trail</h3><p>Historical outcomes live here and do not also appear as open decisions.</p></div></div><div className="handled-task-grid">{completed.map((task) => <article key={task.id}><span className={`inbox-status ${task.status}`}>{task.status}</span><strong>{task.title}</strong><small>Day {task.createdDay} · {categoryCopy[task.category].label}</small></article>)}</div></section>}
  </>;
}

function TaskCard({ task, game, action, onNavigate }: { task: CEOInboxTask; game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const target = getDelegationTarget(game, task);
  return <article className={`ceo-task-card urgency-${task.urgency}`}>
    <div className="ceo-task-heading"><span>{categoryCopy[task.category].icon}</span><div><small>{categoryCopy[task.category].label} · Day {task.createdDay}</small><strong>{task.title}</strong><p>{task.summary}</p>{target && <div className="task-owner-v85"><b>Accountable owner</b><span>{target.name} · {target.title}</span></div>}</div><b>{task.urgency}</b></div>
    {task.decision ? <div className="inbox-decision-options">{task.decision.choices.map((choice) => <button key={choice.id} onClick={() => action((state) => resolveInboxDecision(state, task.id, choice.id))}><strong>{choice.label}</strong><small>{choice.description}</small></button>)}</div> : <div className="ceo-task-actions"><button className="secondary small" onClick={() => onNavigate(task.page)}>Open workspace</button><button className="secondary small" disabled={!target} title={target ? `Delegate to ${target.name}` : `No accountable manager is available`} onClick={() => action((state) => delegateInboxTaskV85(state, task.id))}>{target ? `Delegate to ${target.name}` : "No manager available"}</button><button className="text-button" onClick={() => action((state) => resolveInboxTask(state, task.id))}>Mark reviewed</button></div>}
  </article>;
}
