import { acquireCompetitor } from "../../game/engine";
import type { GameState } from "../../game/store";
import type { GameAction } from "../common";
import { money } from "../format";

export function HoldingsPage({ game, action }: { game: GameState; action: GameAction }) {
  const acquiredBanks = game.competitorHistory.filter((entry) => entry.reason === "acquired");
  return <>
    <section className="acquisition-grid">
      {game.competitors.map((competitor) => <article className="panel acquisition-card" key={competitor.id}>
        <p className="eyebrow">M&A OPPORTUNITY · {competitor.strategy}</p>
        <h2>{competitor.name}</h2>
        <div className="deal-stats"><span><small>Branches</small><strong>{competitor.branches}</strong></span><span><small>Customers</small><strong>{competitor.customers.toLocaleString("en-GB")}</strong></span><span><small>Deposits</small><strong>{money.format(competitor.deposits)}</strong></span></div>
        <p>{competitor.specialty ?? "Acquire the competitor and integrate its customers, deposits, loans, staff and technology."}</p>
        <button className="primary" disabled={game.cash < competitor.acquisitionPrice || game.reputation < 68} onClick={() => action((state) => acquireCompetitor(state, competitor.id))}>Acquire · {money.format(competitor.acquisitionPrice)}</button>
        {game.reputation < 68 && <small className="lock-note">Requires 68 reputation.</small>}
      </article>)}
    </section>
    <section className="panel holdings-list">
      <p className="eyebrow">GROUP STRUCTURE</p><h3>{game.bankName} Group</h3>
      <div className="holding-row"><span className="holding-logo">B</span><div><strong>Retail Banking</strong><small>{game.customers.toLocaleString("en-GB")} customers · {game.branches} branches</small></div><b>100%</b></div>
      <div className="holding-row"><span className="holding-logo">D</span><div><strong>Digital Banking</strong><small>Platform level {game.digitalLevel.toFixed(0)} · Cyber {game.cyberSecurity.toFixed(0)}</small></div><b>100%</b></div>
      {acquiredBanks.map((bank) => <div className="holding-row" key={`${bank.id}-${bank.day}`}><span className="holding-logo">A</span><div><strong>{bank.name}</strong><small>Acquired day {bank.day} · integrated into the branch network</small></div><b>Owned</b></div>)}
    </section>
  </>;
}
