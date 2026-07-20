import { getCashFlowSummary } from "../../game/engine";
import type { GameState } from "../../game/store";
import { Metric, Progress, Sparkline } from "../common";
import { cn, fullMoney, money } from "../format";

export function OverviewPage({ game, onOpenBoard }: { game: GameState; onOpenBoard: () => void }) {
  const bankValue = game.cash + game.loans - game.deposits - game.wholesaleFunding;
  const loanDepositRatio = (game.loans / Math.max(1, game.deposits)) * 100;
  const capacity = game.employees * 72;
  const serviceLoad = (game.customers / Math.max(1, capacity)) * 100;
  const completed = game.objectives.filter((item) => item.completed).length;
  const active = game.objectives.filter((item) => !item.completed && !item.failed).length;
  const flow = getCashFlowSummary(game, 30);
  const netCashChange = flow.closingCash - flow.openingCash;
  const outflows = [
    ["New loans issued", flow.newLending],
    ["Customer withdrawals", flow.customerWithdrawals],
    ["Projects and other movements", Math.max(0, -flow.otherMovements)],
    ["Operating loss", Math.max(0, -flow.operatingProfit)],
    ["Funding repayment", Math.max(0, -flow.fundingChange)],
  ] as const;
  const mainOutflow = [...outflows].sort((a, b) => b[1] - a[1])[0];
  const cashExplanation = flow.days === 0
    ? "Advance time to build a cash-movement history. The game will then show exactly why liquid cash changes."
    : netCashChange < 0
      ? `${mainOutflow[0]} was the largest drain during the last ${flow.days} days.`
      : `Cash increased by ${money.format(netCashChange)} during the last ${flow.days} days.`;

  return <>
    <section className="hero-dashboard">
      <div>
        <p className="eyebrow light">ESTIMATED BANK VALUE</p>
        <h2>{fullMoney.format(bankValue)}</h2>
        <p>Balance growth, customer trust, capital and liquidity. Fast expansion can create profits, but it can also destroy the bank.</p>
        <div className="hero-stats">
          <span><small>Market share</small><strong>{game.marketShare.toFixed(2)}%</strong></span>
          <span><small>Share price</small><strong>{money.format(game.sharePrice)}</strong></span>
          <span><small>Board confidence</small><strong>{game.boardConfidence.toFixed(0)}/100</strong></span>
          <span><small>Achievements</small><strong>{game.achievements.length}</strong></span>
        </div>
      </div>
      <div className="mini-city"><div className="mini-building"><b>{game.bankName.slice(0, 1)}</b><i /><i /><i /></div><div className="mini-tree left" /><div className="mini-tree right" /><div className="mini-road" /></div>
    </section>

    <section className="metrics-grid">
      <Metric label="Deposits" value={money.format(game.deposits)} change={`${game.customersGained} gained · ${game.customersLost} lost today`} tone="good" />
      <Metric label="Loan portfolio" value={money.format(game.loans)} change={`${loanDepositRatio.toFixed(0)}% L/D · ${game.nplRatio.toFixed(2)}% NPL`} tone={game.nplRatio > 5 ? "warn" : "default"} />
      <Metric label="Daily profit" value={money.format(game.profit)} change={`${money.format(game.revenue)} revenue · ${money.format(game.expenses)} cost`} tone={game.profit >= 0 ? "good" : "warn"} />
      <Metric label="Customers" value={game.customers.toLocaleString("en-GB")} change={`${game.satisfaction.toFixed(0)} satisfaction · ${game.reputation.toFixed(0)} reputation`} tone="good" />
    </section>

    <section className="panel cash-movement-panel" id="cash-movement">
      <div className="panel-heading">
        <div><p className="eyebrow">LIQUID CASH EXPLAINED</p><h3>Where the cash went</h3><p>{cashExplanation}</p></div>
        <div className={netCashChange >= 0 ? "cash-net positive" : "cash-net negative"}><small>Net cash change</small><strong>{flow.days ? money.format(netCashChange) : "No history"}</strong></div>
      </div>
      {flow.days === 0 ? <div className="empty-state">Cash movements will appear after the next simulated day.</div> : <div className="cash-flow-grid">
        <div className="cash-flow-column inflow"><h4>Cash coming in</h4><CashLine label="New deposits" value={flow.depositInflows} /><CashLine label="Loan repayments" value={flow.loanRepayments} /><CashLine label="Operating profit" value={Math.max(0, flow.operatingProfit)} /><CashLine label="New funding" value={Math.max(0, flow.fundingChange)} /></div>
        <div className="cash-flow-equation"><span><small>Opening cash</small><b>{money.format(flow.openingCash)}</b></span><strong>→</strong><span><small>Closing cash</small><b>{money.format(flow.closingCash)}</b></span></div>
        <div className="cash-flow-column outflow"><h4>Cash going out</h4><CashLine label="New loans issued" value={flow.newLending} negative /><CashLine label="Customer withdrawals" value={flow.customerWithdrawals} negative /><CashLine label="Projects and other" value={Math.max(0, -flow.otherMovements)} negative /><CashLine label="Operating loss" value={Math.max(0, -flow.operatingProfit)} negative /></div>
      </div>}
    </section>

    <section className="content-grid overview-grid">
      <article className="panel performance-panel">
        <div className="panel-heading"><div><p className="eyebrow">45-DAY PERFORMANCE</p><h3>Daily operating profit</h3></div><span className={cn("status", game.profit >= 0 ? "good" : "warn")}>{game.profit >= 0 ? "Profitable" : "Loss-making"}</span></div>
        <div className="chart-wrap"><Sparkline points={game.history} accessor={(point) => point.profit} /><div className="chart-caption"><span>Lifetime profit: {money.format(game.totalProfit)}</span><span>Credit losses: {money.format(game.creditLosses)}</span></div></div>
      </article>
      <article className="panel priorities">
        <div className="panel-heading"><div><p className="eyebrow">CEO PRIORITIES</p><h3>What needs attention</h3></div></div>
        <div className="priority-row"><span className="priority-icon">L</span><div><strong>Liquidity buffer</strong><small>{game.liquidityRatio.toFixed(1)}% available</small><Progress value={game.liquidityRatio * 1.8} warning={game.liquidityRatio < 18} /></div></div>
        <div className="priority-row"><span className="priority-icon">S</span><div><strong>Service capacity</strong><small>{game.customers} customers / {capacity} capacity</small><Progress value={serviceLoad} warning={serviceLoad > 95} /></div></div>
        <div className="priority-row"><span className="priority-icon">R</span><div><strong>Bank-run risk</strong><small>{game.bankRunRisk.toFixed(0)} of 100</small><Progress value={game.bankRunRisk} warning={game.bankRunRisk > 35} /></div></div>
        <div className="priority-row"><span className="priority-icon">B</span><div><strong>Board mandate</strong><small>{completed} completed · {active} active</small><Progress value={(completed / Math.max(1, game.objectives.length)) * 100} /></div></div>
      </article>
    </section>

    <section className="content-grid overview-lower-grid">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">QUARTERLY MANDATE</p><h3>Board objectives</h3></div><button className="text-button" onClick={onOpenBoard}>Open boardroom →</button></div><div className="compact-objectives">{game.objectives.map((objective) => <div key={objective.id}><span className={cn("objective-state-dot", objective.completed && "done", objective.failed && "failed")} /><div><strong>{objective.title}</strong><small>{objective.description}</small></div></div>)}</div></article>
      <article className="panel news-panel"><div className="panel-heading"><div><p className="eyebrow">GROUP NEWS</p><h3>Latest developments</h3></div></div><div className="news-list single">{game.events.slice(0, 5).map((item) => <div className="news-item" key={item.id}><span className={cn("news-dot", item.tone)} /><div><strong>{item.title}</strong><p>{item.body}</p></div><small>Day {item.day}</small></div>)}</div></article>
    </section>
  </>;
}

function CashLine({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) {
  return <div><span>{label}</span><strong className={negative ? "negative" : "positive"}>{negative ? "−" : "+"}{money.format(Math.abs(value)).replace("−", "")}</strong></div>;
}
