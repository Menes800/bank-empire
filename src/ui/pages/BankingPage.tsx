import { PRODUCT_CATALOG, launchProduct, setLendingPolicy, setRates } from "../../game/engine";
import type { GameState, LendingPolicy, ProductKey } from "../../game/store";
import type { GameAction } from "../common";
import { cn, money } from "../format";

export function BankingPage({ game, action }: { game: GameState; action: GameAction }) {
  return <>
    <section className="content-grid two-column">
      <article className="panel rate-panel"><p className="eyebrow">DEPOSIT PRICING</p><h3>{game.depositRate.toFixed(2)}%</h3><input type="range" min="0.25" max="8" step="0.05" value={game.depositRate} onChange={(event: { target: { value: string } }) => action((state) => setRates(state, Number(event.target.value), state.loanRate))} /><div className="range-labels"><span>Cheaper funding</span><span>Faster growth</span></div><small>Policy rate: {game.baseRate.toFixed(2)}%</small></article>
      <article className="panel rate-panel"><p className="eyebrow">LOAN PRICING</p><h3>{game.loanRate.toFixed(2)}%</h3><input type="range" min="2.5" max="16" step="0.05" value={game.loanRate} onChange={(event: { target: { value: string } }) => action((state) => setRates(state, state.depositRate, Number(event.target.value)))} /><div className="range-labels"><span>Higher demand</span><span>Higher margin</span></div><small>Suggested spread: {(game.baseRate + 2.5).toFixed(2)}%</small></article>
    </section>
    <section className="panel policy-panel"><div><p className="eyebrow">CREDIT STRATEGY</p><h3>Lending policy</h3></div><div className="policy-switch">{(["conservative", "balanced", "aggressive"] as LendingPolicy[]).map((policy) => <button key={policy} className={cn(game.lendingPolicy === policy && "active")} onClick={() => action((state) => setLendingPolicy(state, policy))}>{policy}</button>)}</div></section>
    <section className="product-grid expanded">{(Object.keys(PRODUCT_CATALOG) as ProductKey[]).map((key) => { const product = PRODUCT_CATALOG[key]; const active = game.products.includes(key); const locked = game.reputation < product.unlockReputation; return <article className={cn("panel product-card", active && "active-product")} key={key}><span className="product-icon">{product.name.slice(0, 1)}</span><h3>{product.name}</h3><p>{product.description}</p><small className="product-requirement">{locked ? `Requires ${product.unlockReputation} reputation` : `Launch cost ${money.format(product.cost)}`}</small><button className={active ? "secondary wide" : "primary wide"} disabled={active || locked || game.cash < product.cost} onClick={() => action((state) => launchProduct(state, key))}>{active ? "Active" : locked ? "Locked" : `Launch · ${money.format(product.cost)}`}</button></article>; })}</section>
  </>;
}
