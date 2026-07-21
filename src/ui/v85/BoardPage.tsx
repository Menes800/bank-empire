import type { GameState } from "../../game/types";
import { ObjectiveCard, type GameAction } from "../common";

function boardSupport(game: GameState) {
  const influence = game.boardMembers.reduce((sum, member) => sum + member.influence, 0);
  return game.boardMembers.reduce((sum, member) => sum + member.support * member.influence, 0) / Math.max(1, influence);
}

export function BoardPage({ game, action: _action }: { game: GameState; action: GameAction }) {
  const support = boardSupport(game);
  const nextMeetingDay = Math.ceil(game.day / 90) * 90;
  const openObjectives = game.objectives.filter((objective) => !objective.completed && !objective.failed);
  const strongest = [...game.boardMembers].sort((a, b) => b.support - a.support)[0];
  const weakest = [...game.boardMembers].sort((a, b) => a.support - b.support)[0];

  return <>
    <section className="board-command-hero panel">
      <div><p className="eyebrow">BOARD</p><h2>The board sets expectations. Management runs the bank.</h2><p>Track trust, objectives and the issues likely to shape the next board meeting. Daily operations do not belong here.</p></div>
      <div className="board-command-stats"><span><small>Weighted support</small><strong>{support.toFixed(0)}</strong></span><span><small>Next meeting</small><strong>Day {nextMeetingDay}</strong></span><span><small>Open objectives</small><strong>{openObjectives.length}</strong></span></div>
    </section>

    <section className="board-pulse-grid">
      <article className="panel"><small>STRONGEST SUPPORT</small><strong>{strongest?.name ?? "—"}</strong><p>{strongest ? `${strongest.support.toFixed(0)} support · prioritises ${strongest.priority}` : "No board member data"}</p></article>
      <article className="panel"><small>MOST SCEPTICAL</small><strong>{weakest?.name ?? "—"}</strong><p>{weakest ? `${weakest.support.toFixed(0)} support · prioritises ${weakest.priority}` : "No board member data"}</p></article>
      <article className="panel"><small>CEO POSITION</small><strong>{support >= 67 ? "Strong mandate" : support >= 45 ? "Fragile mandate" : "Under pressure"}</strong><p>{support >= 67 ? "The board broadly supports the current direction." : support >= 45 ? "Results and risk control will decide the next meeting." : "A recovery plan is needed before confidence falls further."}</p></article>
    </section>

    <section className="panel board-member-panel-v85">
      <div className="panel-heading"><div><p className="eyebrow">BOARD MEMBERS</p><h3>Different priorities, different pressure</h3></div></div>
      <div className="board-member-grid-v85">{game.boardMembers.map((member) => <article key={member.id}>
        <div className="board-member-head-v85"><span>{member.name.split(" ").map((part) => part[0]).join("")}</span><div><strong>{member.name}</strong><small>{member.archetype}</small></div><b>{member.influence} influence</b></div>
        <div className="board-member-support"><span>Support</span><strong className={member.support < 45 ? "negative" : ""}>{member.support.toFixed(0)}</strong></div>
        <div className="stage-track"><i style={{ width: `${member.support}%` }} /></div>
        <p>Primary concern: <b>{member.priority}</b>. This member will judge the bank mainly on that outcome.</p>
      </article>)}</div>
    </section>

    <section className="panel board-objectives-v85">
      <div className="panel-heading"><div><p className="eyebrow">BOARD MANDATE</p><h3>Quarterly objectives</h3><p>These are the outcomes the board expects. They are not extra inbox cards.</p></div></div>
      <div className="objectives-grid">{game.objectives.map((objective) => <ObjectiveCard key={objective.id} objective={objective} game={game} />)}</div>
    </section>
  </>;
}
