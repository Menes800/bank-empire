import { getCashFlowSummary } from "../../game/engine";
import { getMandateAssessmentV89 } from "../../game/v89/gameplay";
import type { GameState } from "../../game/store";
import { Metric, Sparkline } from "../common";
import { cn, fullMoney, money } from "../format";

export function OverviewPageV89({ game, onOpenBoard, onOpenInbox }: { game: GameState; onOpenBoard: () => void; onOpenInbox: () => void }) {
  const bankValue = game.cash + game.loans - game.deposits - game.wholesaleFunding;
  const flow = getCashFlowSummary(game, 30);
  const netCash = flow.closingCash - flow.openingCash;
  const historyReady = game.history.length >= 3;
  const ceoMatters = game.ceoInbox.filter((task) => task.status === "open" && getMandateAssessmentV89(game, task).requiresCEO);
  const latestObjective = game.objectives.find((item) => !item.completed && !item.failed);
  const management = game.managementLog.filter((item) => item.outcome !== "escalated").slice(0, 4);
  const news = game.events.filter((event) => !/ handled$|report ·|management report/i.test(event.title)).slice(0, 4);
  const loanDepositRatio = game.loans / Math.max(1, game.deposits) * 100;

  return <>
    <section className="v89-overview-hero">
      <div className="v89-bank-value"><p className="eyebrow light">ESTIMATED BANK VALUE</p><h2>{fullMoney.format(bankValue)}</h2><p>One view of earnings, liquidity, customers and risk. Operational work stays with management; only genuine CEO exceptions appear here.</p></div>
      <div className="v89-overview-headline-grid">
        <Headline label="Liquid cash" value={money.format(game.cash)} tone={game.liquidityRatio < 15 ? "warning" : "good"} />
        <Headline label="Daily profit" value={money.format(game.profit)} tone={game.profit < 0 ? "warning" : "good"} />
        <Headline label="Customers" value={game.customers.toLocaleString(game.locale)} />
        <Headline label="Bank-run risk" value={`${game.bankRunRisk.toFixed(0)}/100`} tone={game.bankRunRisk > 35 ? "warning" : "good"} />
      </div>
    </section>

    <section className="v89-overview-metrics">
      <Metric label="Deposits" value={money.format(game.deposits)} change={`${game.customersGained} gained · ${game.customersLost} lost`} tone="good" />
      <Metric label="Loan portfolio" value={money.format(game.loans)} change={`${loanDepositRatio.toFixed(0)}% L/D · ${game.nplRatio.toFixed(2)}% NPL`} tone={game.nplRatio > 5 ? "warn" : "default"} />
      <Metric label="Reputation" value={game.reputation.toFixed(0)} change={`${game.satisfaction.toFixed(0)} satisfaction · ${game.brandStrength.toFixed(0)} brand`} tone={game.reputation < 45 ? "warn" : "good"} />
      <Metric label="Capital & liquidity" value={`${game.capitalRatio.toFixed(1)}% / ${game.liquidityRatio.toFixed(1)}%`} change="Capital / liquidity" tone={game.capitalRatio < 9 || game.liquidityRatio < 12 ? "warn" : "good"} />
    </section>

    <section className="v89-overview-grid primary-grid">
      <article className="panel v89-performance-card">
        <div className="panel-heading"><div><p className="eyebrow">OPERATING PERFORMANCE</p><h3>{historyReady ? "Daily profit trend" : "Performance starts with the next simulated day"}</h3></div><span className={cn("status", game.profit >= 0 ? "good" : "warn")}>{game.profit >= 0 ? "Profitable" : "Loss-making"}</span></div>
        {historyReady ? <div className="v89-chart"><Sparkline points={game.history.slice(-45)} accessor={(point) => point.profit} /><div><span>Lifetime profit <b>{money.format(game.totalProfit)}</b></span><span>Credit losses <b>{money.format(game.creditLosses)}</b></span></div></div> : <div className="v89-compact-empty">Advance time to create the first real performance trend.</div>}
      </article>

      <article className="panel v89-ceo-card">
        <div className="panel-heading"><div><p className="eyebrow">CEO DESK</p><h3>{ceoMatters.length ? `${ceoMatters.length} matter${ceoMatters.length === 1 ? "" : "s"} need authority` : "No decision currently needs you"}</h3></div>{ceoMatters.length > 0 && <button className="text-button" onClick={onOpenInbox}>Open inbox →</button>}</div>
        {ceoMatters.length ? ceoMatters.slice(0, 3).map((task) => { const assessment = getMandateAssessmentV89(game, task); return <button className="v89-priority-row" key={task.id} onClick={onOpenInbox}><span>{assessment.role ?? "CEO"}</span><div><strong>{task.title}</strong><small>{assessment.reason}</small></div><b>{task.urgency}</b></button>; }) : <div className="v89-compact-empty">Executives are handling routine work inside their mandates.</div>}
      </article>
    </section>

    <section className="panel v89-cash-card">
      <div className="panel-heading"><div><p className="eyebrow">LIQUID CASH</p><h3>{flow.days ? `Cash movement · last ${flow.days} days` : "Cash movement history"}</h3><p>{flow.days ? `Net change ${money.format(netCash)}. New lending, withdrawals, operations, funding and projects are separated below.` : "The first simulation step will create a cash-movement record."}</p></div>{flow.days > 0 && <strong className={netCash >= 0 ? "positive" : "negative"}>{money.format(netCash)}</strong>}</div>
      {flow.days === 0 ? <div className="v89-compact-empty">No history yet.</div> : <div className="v89-cash-lines">
        <CashItem label="Deposits in" value={flow.depositInflows} /><CashItem label="Loan repayments" value={flow.loanRepayments} /><CashItem label="Operating result" value={flow.operatingProfit} /><CashItem label="Funding change" value={flow.fundingChange} /><CashItem label="New lending" value={-flow.newLending} /><CashItem label="Withdrawals" value={-flow.customerWithdrawals} /><CashItem label="Projects & other" value={flow.otherMovements} />
      </div>}
    </section>

    <section className="v89-overview-grid lower-grid">
      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">BOARD MANDATE</p><h3>{latestObjective?.title ?? "Quarterly objectives complete"}</h3><p>{latestObjective?.description ?? "The next board cycle will create new priorities."}</p></div><button className="text-button" onClick={onOpenBoard}>Open boardroom →</button></div>
        <div className="v89-objective-list">{game.objectives.map((objective) => <div key={objective.id}><i className={cn(objective.completed && "done", objective.failed && "failed")} /><span><strong>{objective.title}</strong><small>{objective.completed ? "Completed" : objective.failed ? "Failed" : objective.description}</small></span></div>)}</div>
      </article>
      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">MANAGEMENT REPORTS</p><h3>What your executives actually did</h3></div></div>
        {management.length ? <div className="v89-feed">{management.map((item) => <div key={item.id}><span>{item.role}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div>{item.amount !== undefined && <b>{money.format(item.amount)}</b>}</div>)}</div> : <div className="v89-compact-empty">No management actions have been recorded yet.</div>}
      </article>
      <article className="panel v89-news-card">
        <div className="panel-heading"><div><p className="eyebrow">GROUP NEWS</p><h3>Material developments</h3></div></div>
        {news.length ? <div className="v89-feed">{news.map((item) => <div key={item.id}><i className={`news-dot ${item.tone}`} /><div><strong>{item.title}</strong><small>{item.body}</small></div><b>Day {item.day}</b></div>)}</div> : <div className="v89-compact-empty">No material developments.</div>}
      </article>
    </section>
  </>;
}

function Headline({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
function CashItem({ label, value }: { label: string; value: number }) { return <span><small>{label}</small><strong className={value < 0 ? "negative" : "positive"}>{value >= 0 ? "+" : "−"}{money.format(Math.abs(value)).replace("−", "")}</strong></span>; }
