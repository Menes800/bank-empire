import type { GameState } from "../game/store";
import type { GameAction } from "../ui/common";
import {
  addDevCash,
  addDevCustomers,
  completeDevProjects,
  createDevFailingBranch,
  createDevOverdueLoan,
  createDevProfitableBranch,
  fillDevBranchCapacity,
  fillDevExecutives,
  toggleDevBankruptcyProtection,
  unlockDevBank,
} from "./devActions";

export function DevPanel({ game, action, onClose }: { game: GameState; action: GameAction; onClose: () => void }) {
  return <div className="dev-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="dev-panel" role="dialog" aria-modal="true" aria-label="Playtest admin panel">
      <header><div><small>PLAYTEST TOOLS</small><h2>Admin panel</h2><p>All changes mark this campaign as a DEV SAVE.</p></div><button onClick={onClose}>×</button></header>

      <section><h3>Money & progression</h3><div className="dev-button-grid"><button onClick={() => action((state) => addDevCash(state, 100_000))}>+$100k cash</button><button onClick={() => action((state) => addDevCash(state, 1_000_000))}>+$1m cash</button><button onClick={() => action((state) => addDevCash(state, 10_000_000))}>+$10m cash</button><button onClick={() => action((state) => addDevCustomers(state, 1_000))}>+1,000 customers</button><button onClick={() => action(unlockDevBank)}>Unlock all</button><button onClick={() => action(completeDevProjects)}>Complete projects</button></div></section>

      <section><h3>Management</h3><div className="dev-button-grid"><button onClick={() => action(fillDevExecutives)}>Fill executive team</button><button onClick={() => action(createDevProfitableBranch)}>Profitable branch</button><button onClick={() => action(createDevFailingBranch)}>Failing branch</button><button onClick={() => action(fillDevBranchCapacity)}>Branch at 98%</button></div></section>

      <section><h3>Credit & collections</h3><div className="dev-button-grid"><button onClick={() => action(createDevOverdueLoan)}>Create overdue loan</button></div></section>

      <section><h3>Safety</h3><label className="dev-toggle"><input type="checkbox" checked={game.bankruptcyProtection} onChange={() => action(toggleDevBankruptcyProtection)} /><span><strong>Bankruptcy protection</strong><small>Prevents game over while testing and restores a minimum buffer.</small></span></label></section>

      <footer><span className={game.devModeUsed ? "dev-save active" : "dev-save"}>{game.devModeUsed ? "DEV SAVE ACTIVE" : "No dev changes yet"}</span><button className="primary" onClick={onClose}>Close panel</button></footer>
    </aside>
  </div>;
}
