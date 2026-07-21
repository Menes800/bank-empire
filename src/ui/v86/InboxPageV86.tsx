import { resolveInboxDecision } from "../../game/engine";
import { delegateInboxTaskV86, getDelegationTargetV86 } from "../../game/v86/gameplay";
import type { CEOInboxTask, GameState } from "../../game/types";
import type { GameAction } from "../common";

const categoryCopy: Record<CEOInboxTask["category"], { label: string; icon: string }> = {
  network: { label: "Branches & operations", icon: "N" },
  credit: { label: "Credit & recovery", icon: "C" },
  people: { label: "Leadership", icon: "P" },
  market: { label: "Competition", icon: "M" },
  risk: { label: "Risk & treasury", icon: "R" },
  project: { label: "Technology & delivery", icon: "D" },
};

export function InboxPageV86({ game, action, onNavigate }: { game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const open = game.ceoInbox.filter((task) => task.status === "open" && task.urgency !== "routine");
  const critical = open.filter((task) => task.urgency === "critical").length;
  const handled = game.ceoInbox.filter((task) => task.status !== "open" || task.urgency === "routine");
  const grouped = groupHistory(handled).slice(0, 8);

  return <>
    <section className="inbox-command-card inbox-command-v86">
      <div><p className="eyebrow light">CEO OPERATING DESK</p><h2>{open.length === 0 ? "Management is operating the bank" : `${open.length} true CEO matter${open.length === 1 ? "" : "s"} remain`}</h2><p>Routine lending, staffing, cyber response, compliance and collections stay with accountable leaders. This page only holds decisions that exceed their authority.</p></div>
      <div className="inbox-command-stats"><span><small>Critical</small><strong>{critical}</strong></span><span><small>Awaiting CEO</small><strong>{open.length}</strong></span><span><small>Handled by management</small><strong>{handled.length}</strong></span></div>
    </section>

    <section className="panel inbox-main-panel inbox-main-v86">
      <div className="panel-heading"><div><p className="eyebrow">CEO MATTERS</p><h3>Material decisions and true exceptions</h3></div><span className={critical > 0 ? "status warn" : "status good"}>{open.length === 0 ? "No action" : `${open.length} awaiting action`}</span></div>
      {open.length === 0 ? <div className="empty-state inbox-empty"><strong>No CEO action is waiting.</strong><p>Your branch managers and executives are handling normal operations. Advance time or work on strategy, ownership and expansion.</p></div> : <div className="ceo-task-list">{open.map((task) => <TaskCard key={task.id} task={task} game={game} action={action} onNavigate={onNavigate} />)}</div>}
    </section>

    {grouped.length > 0 && <section className="panel inbox-history-panel inbox-history-v86"><div className="panel-heading"><div><p className="eyebrow">MANAGEMENT TRAIL</p><h3>One timeline per matter</h3><p>Repeated updates are grouped instead of appearing as separate duplicate cards.</p></div></div><div className="handled-task-grid handled-task-grid-v86">{grouped.map((group) => <article key={group.key}><span className={`inbox-status ${group.latest.status}`}>{group.latest.status}</span><strong>{group.latest.title}</strong><small>{categoryCopy[group.latest.category].label} · latest day {group.latest.createdDay}</small>{group.entries.length > 1 && <p>{group.entries.length} recorded steps · days {group.entries.map((item) => item.createdDay).sort((a, b) => a - b).join(", ")}</p>}</article>)}</div></section>}
  </>;
}

function TaskCard({ task, game, action, onNavigate }: { task: CEOInboxTask; game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const target = getDelegationTargetV86(game, task);
  return <article className={`ceo-task-card urgency-${task.urgency}`}>
    <div className="ceo-task-heading"><span>{categoryCopy[task.category].icon}</span><div><small>{categoryCopy[task.category].label} · Day {task.createdDay}</small><strong>{task.title}</strong><p>{task.summary}</p></div><b>{task.urgency}</b></div>
    {target && <div className="accountable-owner-v86"><strong>Accountable owner</strong><span>{target.name} · {target.title}</span></div>}
    {task.decision ? <div className="inbox-decision-options">{task.decision.choices.map((choice) => <button key={choice.id} onClick={() => action((state) => resolveInboxDecision(state, task.id, choice.id))}><strong>{choice.label}</strong><small>{choice.description}</small></button>)}</div> : <div className="ceo-task-actions"><button className="secondary small" onClick={() => onNavigate(task.page)}>Open workspace</button><button className="secondary small" disabled={!target} title={target ? `Delegate to ${target.name}` : "No responsible manager is available"} onClick={() => action((state) => delegateInboxTaskV86(state, task.id))}>{target ? `Delegate to ${target.name}` : "No manager available"}</button></div>}
  </article>;
}

function groupHistory(tasks: CEOInboxTask[]) {
  const groups = new Map<string, CEOInboxTask[]>();
  for (const task of tasks) {
    const key = task.sourceId ?? task.title.replace(/\b\d+\b/g, "#").toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return [...groups.entries()].map(([key, entries]) => ({
    key,
    entries,
    latest: [...entries].sort((a, b) => b.createdDay - a.createdDay)[0],
  })).sort((a, b) => b.latest.createdDay - a.latest.createdDay);
}
