import { advanceFounderCareer, getFounderBonuses, takeFounderCourse, takeFounderDividend } from "../../game/engine";
import { investFounderCapitalV810 } from "../../game/v810/actions";
import type { GameState } from "../../game/store";
import type { GameAction } from "../common";
import { money } from "../format";

const careerTitles = ["Local Founder", "Banking Executive", "Regional Director", "Group CEO", "Industry Leader"];
const educationTitles = ["Self-taught", "Banking Certificate", "Finance Diploma", "Executive Banking Programme", "Advanced Leadership"];

export function CareerPage({ game, action }: { game: GameState; action: GameAction }) {
  const bonuses = getFounderBonuses(game);
  const nextCourseCost = 30_000;
  const careerTitle = careerTitles[Math.min(game.careerLevel, careerTitles.length - 1)];
  const educationTitle = educationTitles[Math.min(game.educationLevel, educationTitles.length - 1)];
  const authority = Math.round((game.boardConfidence + game.reputation + game.careerLevel * 12) / 3);
  const dividendAvailable = game.cash >= 1_200_000 && game.boardConfidence >= 35;
  const capitalAvailable = game.personalCash >= 50_000;

  return <>
    <section className="v810-founder-hero">
      <article className="panel v810-founder-identity">
        <div className="v810-founder-avatar">{game.founderName.slice(0, 1).toUpperCase()}</div>
        <div><p className="eyebrow">FOUNDER & CEO</p><h2>{game.founderName}</h2><p>{careerTitle} · {game.background} background</p><div className="v810-founder-tags"><span>{educationTitle}</span><span>Career level {game.careerLevel + 1}/5</span><span>Education {game.educationLevel}/4</span></div></div>
      </article>
      <article className="panel v810-founder-authority"><div className="panel-heading"><div><p className="eyebrow">CEO AUTHORITY</p><h3>Your standing with the bank</h3><p>Authority is a practical summary of board confidence, public trust and career status.</p></div><strong className="v810-authority-score">{authority}</strong></div><div className="v810-founder-metrics"><Metric label="Board confidence" value={game.boardConfidence.toFixed(0)} /><Metric label="Reputation" value={game.reputation.toFixed(0)} /><Metric label="Personal cash" value={money.format(game.personalCash)} /><Metric label="Bank cash" value={money.format(game.cash)} /></div><div className="v810-founder-note"><strong>{authority >= 75 ? "Strong mandate" : authority >= 50 ? "Workable mandate" : "Fragile mandate"}</strong><span>{authority >= 75 ? "The board is likely to support major strategic moves." : authority >= 50 ? "You can lead normally, but weak results will reduce room to manoeuvre." : "Low trust and board support make personal withdrawals and major decisions harder."}</span></div></article>
    </section>

    <section className="v810-founder-workspace">
      <article className="panel v810-founder-effects"><div className="panel-heading"><div><p className="eyebrow">ACTIVE BANK EFFECTS</p><h3>What your progression changes</h3><p>These effects are applied by the existing founder progression system.</p></div><span className="status good">Always active</span></div><div className="v810-founder-effect-grid"><Benefit label="Operating efficiency" value={`+${bonuses.operatingEfficiency.toFixed(1)}%`} body="Reduces the effective burden of daily operating costs." /><Benefit label="Risk control" value={`+${bonuses.riskControl.toFixed(1)}`} body="Education improves control quality and lowers risk pressure." /><Benefit label="Board influence" value={`+${bonuses.boardInfluence.toFixed(1)}`} body="Career progression strengthens authority with directors." /><Benefit label="Project leadership" value={`${bonuses.projectLeadership} days/mo`} body="Senior founders reduce delivery time on active projects." /></div><div className="v810-next-step"><strong>Next progression effect</strong><span>{game.educationLevel < 4 ? "The next course adds two skill points, operating efficiency and risk control." : game.careerLevel < 4 ? "Spend two skill points to gain board influence, reputation and project leadership." : "Maximum founder progression reached."}</span></div></article>

      <article className="panel v810-founder-actions"><div className="panel-heading"><div><p className="eyebrow">FOUNDER DECISIONS</p><h3>Move money between you and the bank</h3><p>Personal and bank finances are separate. Each action shows the real trade-off.</p></div></div><div className="v810-founder-action-list"><article><div><strong>Invest personal capital</strong><p>Move {money.format(50_000)} from personal cash into the bank. Improves board confidence slightly.</p></div><button className="primary" disabled={!capitalAvailable} onClick={() => action(investFounderCapitalV810)}>Invest {money.format(50_000)}</button></article><article><div><strong>Take founder dividend</strong><p>The bank pays {money.format(100_000)}. You receive {money.format(65_000)} after tax; board confidence and reputation fall slightly.</p></div><button className="secondary" disabled={!dividendAvailable} onClick={() => action(takeFounderDividend)}>Take dividend</button></article></div><div className="v810-founder-guardrail"><strong>Dividend requirements</strong><span>{dividendAvailable ? "Available now." : `${game.cash < 1_200_000 ? `Bank cash must reach ${money.format(1_200_000)}. ` : ""}${game.boardConfidence < 35 ? "Board confidence must reach 35." : ""}`}</span></div></article>
    </section>

    <section className="v810-founder-lower">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">CAREER & EDUCATION</p><h3>{educationTitle}</h3><p>Progression uses personal cash and skill points, not bank cash.</p></div></div><div className="v810-career-path"><article className={game.educationLevel >= 4 ? "complete" : "active"}><span>01</span><div><strong>Executive banking course</strong><p>Costs {money.format(nextCourseCost)} personally and grants two skill points plus permanent efficiency and risk-control benefits.</p><small>{game.educationLevel}/4 education levels completed</small></div><button className="primary" disabled={game.personalCash < nextCourseCost || game.educationLevel >= 4} onClick={() => action(takeFounderCourse)}>{game.educationLevel >= 4 ? "Completed" : "Enrol"}</button></article><article className={game.careerLevel >= 4 ? "complete" : "active"}><span>02</span><div><strong>Founder career milestone</strong><p>Spend two skill points to improve personal earning power, board influence, reputation and project leadership.</p><small>{game.skillPoints} skill points available · {game.careerLevel}/4 career advances completed</small></div><button className="primary" disabled={game.skillPoints < 2 || game.careerLevel >= 4} onClick={() => action(advanceFounderCareer)}>{game.careerLevel >= 4 ? "Maximum level" : "Advance"}</button></article></div></article>

      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">FOUNDER LEGACY</p><h3>{game.achievements.length} achievements</h3><p>Campaign milestones that describe what this founder has actually built.</p></div></div><div className="v810-achievement-list">{game.achievements.length === 0 ? <div className="v89-compact-empty"><strong>No legacy milestones yet</strong><span>Build the bank, survive crises and reach campaign targets.</span></div> : game.achievements.map((item) => <span key={item}>◆ {item.replaceAll("-", " ")}</span>)}</div></article>
    </section>
  </>;
}

function Metric({ label, value }: { label: string; value: string }) { return <span><small>{label}</small><strong>{value}</strong></span>; }
function Benefit({ label, value, body }: { label: string; value: string; body: string }) { return <div><small>{label}</small><strong>{value}</strong><p>{body}</p></div>; }
