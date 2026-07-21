import { getCashFlowSummary } from "../../game/engine";
import { riskNarrative } from "../../game/v810/insights";
import { getCreditAssessmentV89, getMandateAssessmentV89 } from "../../game/v89/gameplay";
import type { GameState } from "../../game/store";
import { Metric, Sparkline } from "../common";
import { cn, fullMoney, money } from "../format";

const executiveRoles = ["CFO", "COO", "CRO", "CMO", "CTO"] as const;

export function OverviewPageV89({ game, onOpenBoard, onOpenInbox, onNavigate }: { game: GameState; onOpenBoard: () => void; onOpenInbox: () => void; onNavigate: (page: string) => void }) {
  const bankValue = game.cash + game.loans - game.deposits - game.wholesaleFunding;
  const flow = getCashFlowSummary(game, 30);
  const netCash = flow.closingCash - flow.openingCash;
  const historyReady = game.history.length >= 3;
  const ceoMatters = game.ceoInbox.filter((task) => task.status === "open" && getMandateAssessmentV89(game, task).requiresCEO);
  const latestObjective = game.objectives.find((item) => !item.completed && !item.failed);
  const management = game.managementLog.filter((item) => item.outcome !== "escalated").slice(0, 5);
  const news = game.events.filter((event) => !/ handled$|report ·|management report|credit ·/i.test(event.title)).slice(0, 3);
  const loanDepositRatio = game.loans / Math.max(1, game.deposits) * 100;
  const branchAttention = game.branchOffices.filter((branch) => !branch.managerId || (branch.lastMonthProfit ?? 0) < 0 || (branch.localCustomers ?? 0) / Math.max(1, branch.capacity) > .92).length;
  const creditExceptions = game.loanApplications.filter((application) => getCreditAssessmentV89(game, application).requiresCEO).length;
  const collections = game.collectionCases.filter((item) => !item.closed).length;
  const executiveVacancies = executiveRoles.filter((role) => !game.employeeRoster.some((employee) => employee.executiveRole === role)).length;
  const overloadedPeople = game.employeeRoster.filter((employee) => (employee.workload ?? 0) > 100).length;
  const activeProjects = game.projects.filter((project) => project.status !== "completed").length;
  const balanceSheetPressure = game.riskScore > 60 || game.deposits < game.loans * .5;
  const operatingPressure = branchAttention + creditExceptions + collections;

  return <>
    <section className="v89-overview-hero">
      <div className="v89-bank-value"><p className="eyebrow light">ESTIMATED BANK VALUE</p><h2>{fullMoney.format(bankValue)}</h2><p>One view of earnings, liquidity, customers and risk. Management handles routine work; you step in only when authority or strategy is required.</p></div>
      <div className="v89-overview-headline-grid"><Headline label="Liquid cash" value={money.format(game.cash)} tone={game.liquidityRatio < 15 ? "warning" : "good"} /><Headline label="Daily profit" value={money.format(game.profit)} tone={game.profit < 0 ? "warning" : "good"} /><Headline label="Customers" value={game.customers.toLocaleString(game.locale)} /><Headline label="Bank-run risk" value={`${game.bankRunRisk.toFixed(0)}/100`} tone={game.bankRunRisk > 35 ? "warning" : "good"} /></div>
    </section>

    <section className="v89-overview-metrics"><Metric label="Deposits" value={money.format(game.deposits)} change={`${game.customersGained} gained · ${game.customersLost} lost`} tone={game.deposits < game.loans * .5 ? "warn" : "good"} /><Metric label="Loan portfolio" value={money.format(game.loans)} change={game.deposits > 0 ? `${loanDepositRatio.toFixed(0)}% L/D · ${game.nplRatio.toFixed(2)}% NPL` : `No deposit funding · ${game.nplRatio.toFixed(2)}% NPL`} tone={game.nplRatio > 5 || game.deposits < game.loans * .5 ? "warn" : "default"} /><Metric label="Reputation" value={game.reputation.toFixed(0)} change={`${game.satisfaction.toFixed(0)} satisfaction · ${game.brandStrength.toFixed(0)} brand`} tone={game.reputation < 45 ? "warn" : "good"} /><Metric label="Capital & liquidity" value={`${game.capitalRatio.toFixed(1)}% / ${game.deposits >= 100_000 ? `${game.liquidityRatio.toFixed(1)}%` : "N/A"}`} change="Capital / liquidity" tone={game.capitalRatio < 9 || game.liquidityRatio < 12 || game.deposits < 100_000 ? "warn" : "good"} /></section>

    <section className="v891-command-grid">
      <button className={ceoMatters.length ? "needs-action" : "healthy"} onClick={onOpenInbox}><span>CEO</span><div><small>AUTHORITY</small><strong>{ceoMatters.length ? `${ceoMatters.length} decision${ceoMatters.length === 1 ? "" : "s"} waiting` : "No CEO decision waiting"}</strong><p>{ceoMatters.length ? "Open the exact escalation and blocking reason." : "Executives are operating inside their mandates."}</p></div><b>Open →</b></button>
      <button className={balanceSheetPressure ? "needs-action" : operatingPressure ? "watch" : "healthy"} onClick={() => onNavigate(balanceSheetPressure ? "risk" : "network")}><span>{balanceSheetPressure ? "RISK" : "OPS"}</span><div><small>{balanceSheetPressure ? "BALANCE SHEET" : "OPERATIONS"}</small><strong>{balanceSheetPressure ? `${game.riskScore.toFixed(0)}/100 group risk` : `${operatingPressure} operating item${operatingPressure === 1 ? "" : "s"}`}</strong><p>{balanceSheetPressure ? riskNarrative(game) : `${branchAttention} branch · ${creditExceptions} credit exception · ${collections} collection`}</p></div><b>Review →</b></button>
      <button className={executiveVacancies || overloadedPeople ? "watch" : "healthy"} onClick={() => onNavigate("leadership")}><span>MGMT</span><div><small>MANAGEMENT COVERAGE</small><strong>{executiveVacancies ? `${executiveVacancies} executive role${executiveVacancies === 1 ? "" : "s"} vacant` : "Executive team appointed"}</strong><p>{overloadedPeople} overloaded employee{overloadedPeople === 1 ? "" : "s"} · {activeProjects} active project{activeProjects === 1 ? "" : "s"}</p></div><b>Review →</b></button>
    </section>

    <section className="v89-overview-grid primary-grid v891-primary-grid">
      <article className="panel v89-performance-card"><div className="panel-heading"><div><p className="eyebrow">OPERATING PERFORMANCE</p><h3>{historyReady ? "Daily profit trend" : "Performance starts with the next simulated day"}</h3></div><span className={cn("status", game.profit >= 0 ? "good" : "warn")}>{game.profit >= 0 ? "Profitable" : "Loss-making"}</span></div>{historyReady ? <div className="v89-chart"><Sparkline points={game.history.slice(-45)} accessor={(point) => point.profit} /><div><span>Lifetime profit <b>{money.format(game.totalProfit)}</b></span><span>Credit losses <b>{money.format(game.creditLosses)}</b></span></div></div> : <div className="v891-onboarding"><strong>Run the bank forward to create a real trend.</strong><span>The first day creates cash movement. Thirty days triggers the first management review, branch accounting and executive actions.</span></div>}</article>
      <article className="panel v891-board-card"><div className="panel-heading"><div><p className="eyebrow">BOARD MANDATE</p><h3>{latestObjective?.title ?? "Quarterly objectives complete"}</h3><p>{latestObjective?.description ?? "The next board cycle will create new priorities."}</p></div><button className="text-button" onClick={onOpenBoard}>Boardroom →</button></div><div className="v89-objective-list">{game.objectives.slice(0, 3).map((objective) => <div key={objective.id}><i className={cn(objective.completed && "done", objective.failed && "failed")} /><span><strong>{objective.title}</strong><small>{objective.completed ? "Completed" : objective.failed ? "Failed" : objective.description}</small></span></div>)}</div></article>
    </section>

    {flow.days > 0 && <section className="panel v89-cash-card v891-cash-card"><div className="panel-heading"><div><p className="eyebrow">LIQUID CASH</p><h3>Cash movement · last {flow.days} days</h3><p>New lending, withdrawals, operations, funding and projects are separated below.</p></div><strong className={netCash >= 0 ? "positive" : "negative"}>{money.format(netCash)}</strong></div><div className="v89-cash-lines"><CashItem label="Deposits in" value={flow.depositInflows} /><CashItem label="Loan repayments" value={flow.loanRepayments} /><CashItem label="Operating result" value={flow.operatingProfit} /><CashItem label="Funding change" value={flow.fundingChange} /><CashItem label="New lending" value={-flow.newLending} /><CashItem label="Withdrawals" value={-flow.customerWithdrawals} /><CashItem label="Projects & other" value={flow.otherMovements} /></div></section>}

    <section className="panel v891-activity-panel"><div className="panel-heading"><div><p className="eyebrow">BANK ACTIVITY</p><h3>Management actions and material developments</h3><p>One chronological surface instead of separate report and news boxes.</p></div></div>{management.length || news.length ? <div className="v891-activity-grid"><div><small>MANAGEMENT</small>{management.length ? <div className="v89-feed">{management.map((item) => <div key={item.id}><span>{item.role}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div>{item.amount !== undefined && <b>{money.format(item.amount)}</b>}</div>)}</div> : <p>No executive action recorded yet.</p>}</div><div><small>GROUP NEWS</small>{news.length ? <div className="v89-feed">{news.map((item) => <div key={item.id}><i className={`news-dot ${item.tone}`} /><div><strong>{item.title}</strong><small>{item.body}</small></div><b>Day {item.day}</b></div>)}</div> : <p>No material development yet.</p>}</div></div> : <div className="v891-onboarding"><strong>Your first operating cycle is ready.</strong><span>Advance time, review executive mandates and set branch priorities. This activity surface will then show what changed, who acted and what it cost.</span></div>}</section>
  </>;
}

function Headline({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
function CashItem({ label, value }: { label: string; value: number }) { return <span><small>{label}</small><strong className={value < 0 ? "negative" : "positive"}>{value >= 0 ? "+" : "−"}{money.format(Math.abs(value)).replace("−", "")}</strong></span>; }
