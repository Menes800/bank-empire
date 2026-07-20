import type { GameState } from "../game/store";
import { money } from "./format";

export function DecisionModal({
  game,
  onChoose,
}: {
  game: GameState;
  onChoose: (id: string) => void;
}) {
  if (!game.pendingDecision) return null;
  const crisis = game.pendingDecision.id.startsWith("v5-");
  return (
    <div className="modal-backdrop">
      <section className={crisis ? "decision-modal crisis-decision-modal" : "decision-modal"}>
        <div className="modal-kicker">
          {crisis ? "REGULATORY RECOVERY WINDOW" : `MANAGEMENT DECISION · ${game.pendingDecision.category}`}
        </div>
        <h2>{game.pendingDecision.title}</h2>
        <p>{game.pendingDecision.description}</p>
        {crisis && <div className="crisis-status-strip"><span><small>Liquid cash</small><b>{money.format(game.cash)}</b></span><span><small>Liquidity ratio</small><b>{game.liquidityRatio.toFixed(1)}%</b></span><span><small>Critical days</small><b>{Math.max(game.liquidityBreachDays, game.capitalBreachDays)}</b></span></div>}
        <div className="decision-choices">
          {game.pendingDecision.choices.map((choice, index) => (
            <button key={choice.id} onClick={() => onChoose(choice.id)} className={choice.id === "v5-accept-resolution" ? "danger-choice" : ""}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{choice.label}</strong>
                <small>{choice.description}</small>
              </div>
              <b>→</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function GameOverModal({
  game,
  onRestart,
  onRetry,
  canRetry,
}: {
  game: GameState;
  onRestart: () => void;
  onRetry: () => void;
  canRetry: boolean;
}) {
  if (!game.gameOverReason) return null;
  const activeProjectCost = game.projects.filter((project) => project.status !== "completed").reduce((sum, project) => sum + project.budget, 0);
  const causes = [
    game.liquidityRatio < 10 ? `Liquidity fell to ${game.liquidityRatio.toFixed(1)}%, below a safe operating buffer.` : null,
    game.cash < 500_000 ? `Only ${money.format(game.cash)} of liquid cash remained.` : null,
    game.profit < 0 ? `Daily operations were losing approximately ${money.format(Math.abs(game.profit))} per day.` : null,
    game.loans > game.deposits ? "The loan book became larger than the deposit base, increasing funding pressure." : null,
    activeProjectCost > 0 ? `${money.format(activeProjectCost)} was committed to active projects.` : null,
  ].filter(Boolean) as string[];
  return (
    <div className="modal-backdrop">
      <section className="decision-modal game-over-modal game-over-v5">
        <div className="modal-kicker">CAMPAIGN ENDED · FAILURE REVIEW</div>
        <h2>The bank has failed.</h2>
        <p>{game.gameOverReason}</p>
        <div className="failure-summary-grid"><span><small>Final cash</small><b>{money.format(game.cash)}</b></span><span><small>Liquidity</small><b>{game.liquidityRatio.toFixed(1)}%</b></span><span><small>Capital</small><b>{game.capitalRatio.toFixed(1)}%</b></span><span><small>Bank value</small><b>{money.format(game.cash + game.loans - game.deposits - game.wholesaleFunding)}</b></span></div>
        <div className="failure-causes"><strong>What caused the failure</strong>{causes.length === 0 ? <p>The bank could not maintain its regulatory operating requirements.</p> : <ul>{causes.map((cause) => <li key={cause}>{cause}</li>)}</ul>}</div>
        <div className="failure-actions">{canRetry && <button className="secondary wide" onClick={onRetry}>Retry from the last monthly checkpoint</button>}<button className="primary wide" onClick={onRestart}>Start a new campaign</button></div>
      </section>
    </div>
  );
}
