import { buildLoanReserve, investInCompliance, raiseEquityCapital, raiseWholesaleFunding, repayWholesaleFunding } from "../../game/engine";
import { getRiskContributions, riskLevelLabel, riskNarrative } from "../../game/v810/insights";
import type { GameState } from "../../game/store";
import { Progress, type GameAction } from "../common";
import { money } from "../format";

export function RiskPage({ game, action }: { game: GameState; action: GameAction }) {
  const contributions = getRiskContributions(game).sort((a, b) => b.points - a.points);
  const liquidityMeaningful = game.deposits >= 100_000;
  const fundingGap = Math.max(0, game.loans - game.deposits - game.wholesaleFunding);
  const reserveCoverage = game.creditLosses > 0 ? game.loanLossReserve / Math.max(1, game.creditLosses) : 0;
  const riskTone = game.riskScore > 80 ? "critical" : game.riskScore > 60 ? "warning" : game.riskScore > 40 ? "watch" : "good";

  return <>
    <section className="v810-risk-hero">
      <article className={`v810-risk-score ${riskTone}`}><p className="eyebrow light">GROUP RISK SCORE</p><strong>{game.riskScore.toFixed(0)}</strong><span>{riskLevelLabel(game.riskScore)} · lower is better</span><p>{riskNarrative(game)}</p></article>
      <article className="panel v810-risk-breakdown"><div className="panel-heading"><div><p className="eyebrow">WHY THIS SCORE</p><h3>Risk is the sum of visible balance-sheet pressures</h3><p>The score is capped at 99. Contributions below show which factor is pushing it upward.</p></div></div><div>{contributions.map((item) => <section key={item.key}><span><strong>{item.title}</strong><small>{item.explanation}</small></span><b>+{item.points.toFixed(1)}</b></section>)}</div></article>
    </section>

    <section className="v810-risk-metrics">
      <article className="panel"><div className="v810-risk-heading"><span><small>CAPITAL RATIO</small><strong>{game.capitalRatio.toFixed(1)}%</strong></span><b className={game.capitalRatio >= 12.5 ? "positive" : "negative"}>{game.capitalRatio >= 12.5 ? "Above target" : "Below target"}</b></div><Progress value={Math.min(100, game.capitalRatio / 12.5 * 100)} warning={game.capitalRatio < 12.5} /><p>Capital absorbs losses. Internal target: 12.5%. Regulatory failure occurs only after a prolonged severe breach.</p></article>
      <article className="panel"><div className="v810-risk-heading"><span><small>LIQUIDITY</small><strong>{liquidityMeaningful ? `${game.liquidityRatio.toFixed(1)}%` : "N/A"}</strong></span><b className={game.bankRunRisk < 35 ? "positive" : "negative"}>Run risk {game.bankRunRisk.toFixed(0)}/100</b></div><Progress value={liquidityMeaningful ? Math.min(100, game.liquidityRatio / 18 * 100) : 0} warning={!liquidityMeaningful || game.liquidityRatio < 18} /><p>{liquidityMeaningful ? "Liquid cash divided by customer deposits. Operating floor: 18%." : "The ratio is not meaningful because the bank has almost no customer deposits."}</p></article>
      <article className="panel"><div className="v810-risk-heading"><span><small>COMPLIANCE</small><strong>{game.compliance.toFixed(0)}/100</strong></span><b className={game.compliance >= 75 ? "positive" : "negative"}>{game.compliance >= 75 ? "Controls stable" : "Control weakness"}</b></div><Progress value={game.compliance} warning={game.compliance < 65} /><p>Compliance affects regulatory risk, reputation and the chance of losing the banking licence.</p><button className="secondary wide" disabled={game.cash < 320_000 || game.compliance >= 100} onClick={() => action(investInCompliance)}>{game.compliance >= 100 ? "Controls already at maximum" : `Improve controls · ${money.format(320_000)}`}</button></article>
    </section>

    <section className="panel v810-balance-sheet"><div className="panel-heading"><div><p className="eyebrow">BALANCE-SHEET DIAGNOSIS</p><h3>{fundingGap > 0 ? `Funding gap: ${money.format(fundingGap)}` : "Assets are covered by deposits and wholesale funding"}</h3><p>Loans need stable funding. Customer deposits are usually cheaper; wholesale funding is faster but increases interest expense.</p></div></div><div className="v810-balance-flow"><span><small>Loan book</small><strong>{money.format(game.loans)}</strong></span><i>−</i><span><small>Customer deposits</small><strong>{money.format(game.deposits)}</strong></span><i>−</i><span><small>Wholesale funding</small><strong>{money.format(game.wholesaleFunding)}</strong></span><i>=</i><span className={fundingGap > 0 ? "warning" : "good"}><small>Unfunded gap</small><strong>{money.format(fundingGap)}</strong></span></div></section>

    <section className="v810-treasury-grid">
      <article className="panel"><div><p className="eyebrow">WHOLESALE FUNDING</p><h3>{money.format(game.wholesaleFunding)}</h3><p>Current rate {game.wholesaleFundingRate.toFixed(2)}%. Borrowing raises cash immediately but adds daily interest expense and does not create customer deposits.</p></div><div className="v810-action-impact"><span><strong>Borrow {money.format(5_000_000)}</strong><small>Cash +5m · wholesale debt +5m · funding cost rises</small></span><button className="primary" onClick={() => action(raiseWholesaleFunding)}>Borrow</button></div><div className="v810-action-impact"><span><strong>Repay up to {money.format(5_000_000)}</strong><small>Cash falls · wholesale debt and future interest expense fall</small></span><button className="secondary" disabled={game.wholesaleFunding <= 0 || game.cash < 6_000_000} onClick={() => action(repayWholesaleFunding)}>Repay</button></div></article>

      <article className="panel"><div><p className="eyebrow">LOSS ABSORBENCY</p><h3>{money.format(game.loanLossReserve)}</h3><p>NPL ratio {game.nplRatio.toFixed(2)}%. The reserve is ring-fenced capacity for expected credit losses; it does not reduce the current risk score directly.</p></div><div className="v810-treasury-facts"><span><small>Recent credit losses</small><strong>{money.format(game.creditLosses)}</strong></span><span><small>Reserve / loss coverage</small><strong>{reserveCoverage > 0 ? `${reserveCoverage.toFixed(1)}×` : "No recent loss"}</strong></span></div><button className="secondary" disabled={game.cash < 250_000} onClick={() => action(buildLoanReserve)}>Add {money.format(250_000)} reserve</button></article>

      <article className="panel"><div><p className="eyebrow">EQUITY CAPITAL</p><h3>{game.boardConfidence.toFixed(0)} board confidence</h3><p>Issue new shares to inject {money.format(5_000_000)}. Cash and capital improve, but the share price and board confidence fall because existing owners are diluted.</p></div><div className="v810-treasury-facts"><span><small>Capital ratio now</small><strong>{game.capitalRatio.toFixed(1)}%</strong></span><span><small>Minimum board support</small><strong>25</strong></span></div><button className="secondary" disabled={game.boardConfidence < 25} onClick={() => action(raiseEquityCapital)}>Raise equity</button></article>
    </section>
  </>;
}
