import { advanceFounderCareer, getFounderBonuses, takeFounderCourse, takeFounderDividend } from "../../game/engine";
import type { GameState } from "../../game/store";
import type { GameAction } from "../common";
import { money } from "../format";

const careerTitles = ["Local Founder", "Banking Executive", "Regional Director", "Group CEO", "Industry Leader"];
const educationTitles = ["Self-taught", "Banking Certificate", "Finance Diploma", "Executive Banking Programme", "Advanced Leadership"];

export function CareerPage({ game, action }: { game: GameState; action: GameAction }) {
  const bonuses = getFounderBonuses(game);
  const nextCourseCost = 30_000;
  return <>
    <section className="founder-hero-grid">
      <article className="panel profile-card founder-profile-card">
        <div className="large-avatar">{game.founderName.slice(0, 1).toUpperCase()}</div>
        <p className="eyebrow">FOUNDER PROFILE</p>
        <h2>{game.founderName}</h2>
        <p>{careerTitles[game.careerLevel]} · {game.background} background</p>
        <div className="profile-stats">
          <span><small>Personal cash</small><strong>{money.format(game.personalCash)}</strong></span>
          <span><small>Skill points</small><strong>{game.skillPoints}</strong></span>
          <span><small>Education</small><strong>{game.educationLevel}/4</strong></span>
          <span><small>Board confidence</small><strong>{game.boardConfidence.toFixed(0)}</strong></span>
        </div>
        <button className="secondary wide" disabled={game.cash < 1_200_000 || game.boardConfidence < 35} onClick={() => action(takeFounderDividend)}>Take founder dividend · {money.format(100_000)}</button>
      </article>

      <article className="panel founder-impact-card">
        <div className="panel-heading"><div><p className="eyebrow">ACTIVE BANK EFFECTS</p><h3>Your founder now matters</h3></div><span className="status good">Always active</span></div>
        <p className="founder-impact-intro">Education and career status create permanent benefits every day. These are applied directly to operating costs, risk, the board and project delivery.</p>
        <div className="founder-benefit-grid">
          <Benefit label="Operating efficiency" value={`+${bonuses.operatingEfficiency.toFixed(1)}%`} body="A share of daily operating expenses is recovered as better management efficiency." />
          <Benefit label="Risk control" value={`+${bonuses.riskControl.toFixed(1)}`} body="Education gradually reduces the bank's risk score and strengthens control quality." />
          <Benefit label="Board influence" value={`+${bonuses.boardInfluence.toFixed(1)}`} body="Career status improves the founder's authority with directors and investors." />
          <Benefit label="Project leadership" value={`${bonuses.projectLeadership} days/mo`} body="Senior founders remove extra delivery days from active projects each month." />
        </div>
        <div className="founder-explanation"><strong>What changes next?</strong><p>The next education level adds another 0.8% operating-efficiency benefit and stronger risk control. The next career level adds board influence, reputation and project leadership.</p></div>
      </article>
    </section>

    <section className="content-grid two-column founder-lower-grid">
      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">CAREER & EDUCATION</p><h3>{educationTitles[Math.min(game.educationLevel, educationTitles.length - 1)]}</h3></div></div>
        <div className="career-step"><span>01</span><div><strong>Executive banking course</strong><p>Costs {money.format(nextCourseCost)} personally. Grants two skill points, permanent efficiency and better risk control.</p></div><button className="primary small" disabled={game.personalCash < nextCourseCost || game.educationLevel >= 4} onClick={() => action(takeFounderCourse)}>{game.educationLevel >= 4 ? "Completed" : "Enrol"}</button></div>
        <div className="career-step"><span>02</span><div><strong>Founder career milestone</strong><p>Spend two skill points to increase personal earnings, board influence, reputation and project leadership.</p></div><button className="primary small" disabled={game.skillPoints < 2 || game.careerLevel >= 4} onClick={() => action(advanceFounderCareer)}>{game.careerLevel >= 4 ? "Maximum level" : "Advance"}</button></div>
      </article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">FOUNDER LEGACY</p><h3>{game.achievements.length} achievements</h3></div></div><div className="achievement-list">{game.achievements.length === 0 ? <div className="empty-state">Build the bank, survive crises and reach campaign milestones to create a founder legacy.</div> : game.achievements.map((item) => <span key={item}>◆ {item.replaceAll("-", " ")}</span>)}</div></article>
    </section>
  </>;
}

function Benefit({ label, value, body }: { label: string; value: string; body: string }) {
  return <div className="founder-benefit"><small>{label}</small><strong>{value}</strong><p>{body}</p></div>;
}
