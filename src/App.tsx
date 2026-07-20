import { useEffect, useState } from 'react';
import { advanceDay, loadGame, saveGame, type GameState } from './game/store';

const money = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  maximumFractionDigits: 0,
});

export default function App() {
  const [game, setGame] = useState<GameState>(() => loadGame());

  useEffect(() => {
    saveGame(game);
  }, [game]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BANK EMPIRE</p>
          <h1>{game.bankName}</h1>
        </div>
        <div className="day">Dag {game.day}</div>
      </header>

      <section className="grid">
        <article className="card hero">
          <span>Likviditet</span>
          <strong>{money.format(game.cash)}</strong>
          <small>Tilgjengelige midler</small>
        </article>
        <article className="card">
          <span>Innskudd</span>
          <strong>{money.format(game.deposits)}</strong>
        </article>
        <article className="card">
          <span>Utlån</span>
          <strong>{money.format(game.loans)}</strong>
        </article>
        <article className="card">
          <span>Omdømme</span>
          <strong>{game.reputation}/100</strong>
        </article>
      </section>

      <section className="panel">
        <div>
          <h2>Konsernledelse</h2>
          <p>Bygg banken steg for steg. Spilltilstanden lagres automatisk lokalt.</p>
        </div>
        <button onClick={() => setGame(current => advanceDay(current))}>Neste dag</button>
      </section>
    </main>
  );
}
