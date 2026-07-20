import type { GameState } from "../game/store";
import type { GameAction } from "../ui/common";
import {
  addDevCash,
  addDevCustomers,
  clearDevRoutineInbox,
  completeDevProjects,
  completeDevTechnology,
  createDevFailingBranch,
  createDevLiquidityCrisis,
  createDevOpeningBranch,
  createDevOverdueLoan,
  createDevProfitableBranch,
  createDevStrategicDecision,
  fillDevBranchCapacity,
  fillDevExecutives,
  generateDevCooRecommendation,
  normalizeDevBalanceSheet,
  resetDevSystem,
  setDevBranchLevel,
  simulateDevTwelveMonths,
  toggleDevBankruptcyProtection,
  unlockDevBank,
  unlockDevTechnologyTree,
} from "./devActions";

export function DevPanel({ game, action, onClose }: { game: GameState; action: GameAction; onClose: () => void }) {
  return <div className="dev-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="dev-panel dev-panel-v9" role="dialog" aria-modal="true" aria-label="Playtest admin panel">
      <header><div><small>PLAYTEST TOOLS · v0.9</small><h2>Admin & scenario panel</h2><p>All changes mark this campaign as a DEV SAVE. Resets affect only the selected system.</p></div><button onClick={onClose}>×</button></header>

      <div className="dev-panel-scroll">
        <section><h3>Money & progression</h3><div className="dev-button-grid"><button onClick={() => action((state) => addDevCash(state, 100_000))}>+$100k cash</button><button onClick={() => action((state) => addDevCash(state, 1_000_000))}>+$1m cash</button><button onClick={() => action((state) => addDevCash(state, 10_000_000))}>+$10m cash</button><button onClick={() => action((state) => addDevCustomers(state, 1_000))}>+1,000 customers</button><button onClick={() => action(unlockDevBank)}>Unlock bank progression</button><button onClick={() => action(completeDevProjects)}>Complete all projects</button></div></section>

        <section><h3>Branch scenarios</h3><div className="dev-button-grid"><button onClick={() => action(fillDevExecutives)}>Fill executive team</button><button onClick={() => action(createDevProfitableBranch)}>Add profitable branch</button><button onClick={() => action(createDevFailingBranch)}>Add structural loss branch</button><button onClick={() => action(createDevOpeningBranch)}>Add opening-phase branch</button><button onClick={() => action(fillDevBranchCapacity)}>First branch at 98%</button><button onClick={() => action(generateDevCooRecommendation)}>Run COO recommendation</button><button onClick={() => action((state) => setDevBranchLevel(state, 3))}>Set first branch L3</button><button onClick={() => action((state) => setDevBranchLevel(state, 4))}>Set first branch L4</button><button onClick={() => action((state) => setDevBranchLevel(state, 5))}>Set first branch L5</button></div></section>

        <section><h3>Technology</h3><div className="dev-button-grid"><button onClick={() => action(unlockDevTechnologyTree)}>Unlock full tech tree</button><button onClick={() => action(completeDevTechnology)}>Complete next technology</button><button onClick={() => action((state) => resetDevSystem(state, "technology"))}>Reset technology only</button></div></section>

        <section><h3>Risk, credit & inbox</h3><div className="dev-button-grid"><button onClick={() => action(createDevOverdueLoan)}>Create overdue loan</button><button onClick={() => action(createDevLiquidityCrisis)}>Create liquidity crisis</button><button onClick={() => action(normalizeDevBalanceSheet)}>Normalise balance sheet</button><button onClick={() => action(clearDevRoutineInbox)}>Clear routine CEO Inbox</button><button onClick={() => action(createDevStrategicDecision)}>Generate strategic decision</button><button onClick={() => action((state) => resetDevSystem(state, "risk"))}>Reset risk only</button><button onClick={() => action((state) => resetDevSystem(state, "inbox"))}>Reset inbox only</button></div></section>

        <section><h3>Simulation & focused reset</h3><div className="dev-button-grid"><button onClick={() => action(simulateDevTwelveMonths)}>Simulate 12 months</button><button onClick={() => action((state) => resetDevSystem(state, "branches"))}>Reset v0.9 branch data</button></div></section>

        <section><h3>Safety</h3><label className="dev-toggle"><input type="checkbox" checked={game.bankruptcyProtection} onChange={() => action(toggleDevBankruptcyProtection)} /><span><strong>Bankruptcy protection</strong><small>Prevents game over while testing and restores a minimum buffer.</small></span></label></section>
      </div>

      <footer><span className={game.devModeUsed ? "dev-save active" : "dev-save"}>{game.devModeUsed ? "DEV SAVE ACTIVE" : "No dev changes yet"}</span><button className="primary" onClick={onClose}>Close panel</button></footer>
    </aside>
  </div>;
}
