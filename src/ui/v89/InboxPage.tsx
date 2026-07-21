import { resolveInboxDecision, resolveInboxTask } from "../../game/engine";
import { getMandateAssessmentV89 } from "../../game/v89/gameplay";
import type { GameState } from "../../game/store";
import type { GameAction } from "../common";
import { money } from "../format";

export function InboxPageV89({ game, action, onNavigate }: { game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const open = game.ceoInbox.filter((task) => task.status === "open" && getMandateAssessmentV89(game, task).requiresCEO);
  const critical = open.filter((task) => task.urgency === "critical").length;
  const handled = game.managementLog.filter((item) => item.outcome !== "escalated").slice(0, 10);
  const escalated = game.managementLog.filter((item) => item.outcome === "escalated").slice(0, 8);

  return <>
    <section className="v89-inbox-hero">
      <div><p className="eyebrow light">CEO OPERATING DESK</p><h2>{open.length ? `${open.length} decision${open.length === 1 ? "" : "s"} need your authority` : "Management is operating inside mandate"}</h2><p>Severity describes how serious a matter is. It reaches you only when it is strategic, over budget, over risk, missing permission or missing an accountable executive.</p></div>
      <div><Headline label="CEO matters" value={`${open.length}`} /><Headline label="Critical" value={`${critical}`} tone={critical ? "warning" : "good"} /><Headline label="Handled in 30d" value={`${game.managementLog.filter((item) => item.day >= game.day - 30 && item.outcome !== "escalated").length}`} /></div>
    </section>

    <section className="panel v89-inbox-panel">
      <div className="panel-heading"><div><p className="eyebrow">CEO DECISIONS</p><h3>Escalations and strategic choices</h3><p>Every case states exactly why management could not execute it.</p></div></div>
      {open.length === 0 ? <div className="v89-compact-empty"><strong>No CEO decision is waiting.</strong><span>Advance time or review strategy while executives continue routine work.</span></div> : <div className="v89-ceo-matter-list">{open.map((task) => {
        const assessment = getMandateAssessmentV89(game, task);
        return <article key={task.id} className={`v89-ceo-matter ${task.urgency}`}>
          <header><span>{assessment.role ?? "CEO"}</span><div><small>{task.category} · day {task.createdDay}</small><strong>{task.title}</strong><p>{task.summary}</p></div><b>{task.urgency}</b></header>
          <div className="v89-escalation-reason"><div><small>WHY IT REACHED THE CEO</small><strong>{assessment.reason}</strong></div><span>{assessment.role ?? "Unowned"} · {assessment.permission}</span><span>{money.format(assessment.estimatedCost)}</span><span>Risk {assessment.estimatedRisk.toFixed(0)}</span></div>
          {task.decision ? <div className="v89-decision-options">{task.decision.choices.map((choice) => <button key={choice.id} onClick={() => action((state) => resolveInboxDecision(state, task.id, choice.id))}><strong>{choice.label}</strong><small>{choice.description}</small></button>)}</div> : <div className="v89-matter-actions"><button className="primary" onClick={() => onNavigate(task.page)}>Open {task.page === "clients" ? "credit workspace" : task.page === "network" ? "branches" : task.page}</button><button className="secondary" onClick={() => action((state) => resolveInboxTask(state, task.id))}>Mark reviewed</button></div>}
        </article>;
      })}</div>}
    </section>

    <section className="v89-inbox-history-grid">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">RECENTLY HANDLED</p><h3>Management trail</h3></div></div>{handled.length ? <History entries={handled} /> : <div className="v89-compact-empty">No delegated actions yet.</div>}</article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">AUTHORITY PRESSURE</p><h3>Why matters were escalated</h3></div></div>{escalated.length ? <History entries={escalated} /> : <div className="v89-compact-empty">No recent authority breaches.</div>}</article>
    </section>
  </>;
}

function Headline({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
function History({ entries }: { entries: GameState["managementLog"] }) { return <div className="v89-history-list">{entries.map((entry) => <div key={entry.id}><span>{entry.role}</span><div><strong>{entry.title}</strong><small>{entry.detail}</small></div>{entry.amount !== undefined && <b>{money.format(entry.amount)}</b>}</div>)}</div>; }
