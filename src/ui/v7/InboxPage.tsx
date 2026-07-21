import { getMandateAssessmentV88, resolveInboxDecision, resolveInboxTask } from "../../game/engine";
import type { CEOInboxTask, GameState } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const categoryCopy: Record<CEOInboxTask["category"], { label: string; icon: string }> = {
  network: { label: "Network", icon: "N" },
  credit: { label: "Credit & collections", icon: "C" },
  people: { label: "People", icon: "P" },
  market: { label: "Competition", icon: "M" },
  risk: { label: "Risk & treasury", icon: "R" },
  project: { label: "Projects", icon: "D" },
};

export function InboxPage({ game, action, onNavigate }: { game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const allOpen = game.ceoInbox.filter((task) => task.status === "open");
  const open = allOpen.filter((task) => getMandateAssessmentV88(game, task).requiresCEO);
  const handledByManagement = allOpen.length - open.length;
  const completed = game.ceoInbox.filter((task) => task.status !== "open").slice(0, 8);
  const critical = open.filter((task) => task.urgency === "critical").length;

  return <>
    <section className="inbox-command-card inbox-command-card-v889">
      <div><p className="eyebrow light">CEO OPERATING DESK</p><h2>{open.length === 0 ? "No decision is waiting for the CEO" : `${open.length} decision${open.length === 1 ? "" : "s"} need your authority`}</h2><p>Executives execute routine work inside their mandates. Only strategic, critical, over-budget or over-risk matters reach this desk.</p></div>
      <div className="inbox-command-stats"><span><small>CEO matters</small><strong>{open.length}</strong></span><span><small>Critical</small><strong>{critical}</strong></span><span><small>Handled by mandates</small><strong>{handledByManagement}</strong></span></div>
    </section>

    <section className="inbox-layout inbox-layout-v889">
      <article className="panel inbox-main-panel inbox-main-panel-v889">
        <div className="panel-heading"><div><p className="eyebrow">CEO DECISIONS</p><h3>Escalations and strategic choices</h3><p>Every item below includes the exact reason management could not execute it automatically.</p></div></div>
        {open.length === 0 ? <div className="inbox-clear-v889"><strong>Your delegation model is working.</strong><p>There is nothing here to approve. Continue the simulation or adjust mandates in Workforce.</p><button className="secondary small" onClick={() => onNavigate("leadership")}>Review executive mandates</button></div> : <div className="ceo-task-list">{open.map((task) => <TaskCard key={task.id} task={task} game={game} action={action} onNavigate={onNavigate} />)}</div>}
      </article>
    </section>

    {completed.length > 0 && <section className="panel inbox-history-panel"><div className="panel-heading"><div><p className="eyebrow">RECENTLY HANDLED</p><h3>Management trail</h3></div></div><div className="handled-task-grid">{completed.map((task) => <article key={task.id}><span className={`inbox-status ${task.status}`}>{task.status}</span><strong>{task.title}</strong><small>Day {task.createdDay} · {categoryCopy[task.category].label}</small></article>)}</div></section>}
  </>;
}

function TaskCard({ task, game, action, onNavigate }: { key?: string; task: CEOInboxTask; game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const assessment = getMandateAssessmentV88(game, task);
  return <article className={`ceo-task-card urgency-${task.urgency}`}>
    <div className="ceo-task-heading"><span>{categoryCopy[task.category].icon}</span><div><small>{categoryCopy[task.category].label} · Day {task.createdDay}</small><strong>{task.title}</strong><p>{task.summary}</p></div><b>{task.urgency}</b></div>
    <div className="mandate-block-reason-v889"><div><small>WHY IT REACHED THE CEO</small><strong>{assessment.reason}</strong></div><span>{assessment.role ?? "CEO"} · {assessment.permission}</span>{assessment.estimatedCost > 0 && <span>{money.format(assessment.estimatedCost)}</span>}<span>Risk {assessment.estimatedRisk.toFixed(0)}</span></div>
    {task.decision ? <div className="inbox-decision-options">{task.decision.choices.map((choice) => <button key={choice.id} onClick={() => action((state) => resolveInboxDecision(state, task.id, choice.id))}><strong>{choice.label}</strong><small>{choice.description}</small></button>)}</div> : <div className="ceo-task-actions"><button className="secondary small" onClick={() => onNavigate(task.page)}>Open workspace</button><button className="text-button" onClick={() => action((state) => resolveInboxTask(state, task.id))}>Mark reviewed</button></div>}
  </article>;
}
