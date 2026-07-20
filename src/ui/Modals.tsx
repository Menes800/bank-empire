import type { GameState } from "../game/store";

export function DecisionModal({
  game,
  onChoose,
}: {
  game: GameState;
  onChoose: (id: string) => void;
}) {
  if (!game.pendingDecision) return null;
  return (
    <div className="modal-backdrop">
      <section className="decision-modal">
        <div className="modal-kicker">
          MANAGEMENT DECISION · {game.pendingDecision.category}
        </div>
        <h2>{game.pendingDecision.title}</h2>
        <p>{game.pendingDecision.description}</p>
        <div className="decision-choices">
          {game.pendingDecision.choices.map((choice, index) => (
            <button key={choice.id} onClick={() => onChoose(choice.id)}>
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
  reason,
  onRestart,
}: {
  reason: string | null;
  onRestart: () => void;
}) {
  if (!reason) return null;
  return (
    <div className="modal-backdrop">
      <section className="decision-modal game-over-modal">
        <div className="modal-kicker">CAMPAIGN ENDED</div>
        <h2>The bank has failed.</h2>
        <p>{reason}</p>
        <button className="primary wide" onClick={onRestart}>
          Start a new campaign
        </button>
      </section>
    </div>
  );
}
