import { setMonthlyBudget } from "../../game/engine";
import type { GameState } from "../../game/store";
import { ObjectiveCard, type GameAction } from "../common";
import { money } from "../format";

export function ReportsPage({ game, action }: { game: GameState; action: GameAction }) {
  const latest = game.reports[0];
  const support = game.boardMembers.reduce((sum, member) => sum + member.support * member.influence, 0) / Math.max(1, game.boardMembers.reduce((sum, member) => sum + member.influence, 0));
  return <>
    <section className="board-summary-card">
      <div><p className="eyebrow light">BOARD CONFIDENCE</p><h2>{support.toFixed(0)} / 100</h2><p>The board reacts to growth, risk, customers, technology and profit according to each member's priorities.</p></div>
      <div className="board-vote-meter"><i style={{ width: `${support}%` }} /><span>{support >= 67 ? "Strong mandate" : support >= 45 ? "Fragile mandate" : "CEO under pressure"}</span></div>
    </section>

    <section className="board-member-grid">{game.boardMembers.map((member) => <article className="panel board-member-card" key={member.id}><div className="board-person"><span>{member.name.split(" ").map((part) => part[0]).join("")}</span><div><strong>{member.name}</strong><small>{member.archetype}</small></div></div><div className="board-member-bottom"><span>Priority: <b>{member.priority}</b></span><strong className={member.support < 45 ? "negative" : ""}>{member.support.toFixed(0)} support</strong></div><div className="stage-track"><i style={{ width: `${member.support}%` }} /></div></article>)}</section>

    <section className="content-grid reports-top-grid">
      <article className="panel report-hero"><div className="panel-heading"><div><p className="eyebrow">LATEST MANAGEMENT REPORT</p><h3>{latest ? `Year ${latest.year} · Quarter ${latest.quarter} · Day ${latest.day}` : "First month not completed"}</h3></div>{latest && <span className={latest.netIncome >= 0 ? "status good" : "status warn"}>{latest.netIncome >= 0 ? "Profitable" : "Loss-making"}</span>}</div>{latest ? <><div className="report-kpi-grid"><ReportKpi label="Interest income" value={money.format(latest.interestIncome)} /><ReportKpi label="Fee income" value={money.format(latest.feeIncome)} /><ReportKpi label="Operating expenses" value={money.format(latest.operatingExpenses)} /><ReportKpi label="Credit losses" value={money.format(latest.creditLosses)} /><ReportKpi label="Net income" value={money.format(latest.netIncome)} strong /><ReportKpi label="Budget variance" value={money.format(latest.budgetVariance)} strong /></div><div className="financial-equation"><span><small>Assets</small><b>{money.format(latest.assets)}</b></span><em>−</em><span><small>Liabilities</small><b>{money.format(latest.liabilities)}</b></span><em>=</em><span><small>Equity</small><b>{money.format(latest.equity)}</b></span></div></> : <div className="empty-state">Advance to day 30 to generate the first monthly report.</div>}</article>
      <article className="panel budget-card"><p className="eyebrow">MONTHLY BUDGET</p><h3>{money.format(game.monthlyBudget)}</h3><p>Set the operating-cost target used by management reporting. A positive variance means the bank operated below budget.</p><input type="range" min="250000" max="12000000" step="50000" value={game.monthlyBudget} onChange={(event) => action((state) => setMonthlyBudget(state, Number(event.target.value)))} /><div className="budget-range"><span>NOK 250k</span><span>NOK 12m</span></div>{latest && <div className={latest.budgetVariance >= 0 ? "budget-result positive" : "budget-result negative"}><small>Latest variance</small><strong>{money.format(latest.budgetVariance)}</strong></div>}</article>
    </section>

    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">BOARD MANDATE</p><h3>Quarterly objectives</h3></div></div><div className="objectives-grid">{game.objectives.map((objective) => <ObjectiveCard key={objective.id} objective={objective} game={game} />)}</div></section>

    <section className="panel report-history"><div className="panel-heading"><div><p className="eyebrow">REPORT ARCHIVE</p><h3>{game.reports.length} monthly periods</h3></div></div>{game.reports.length === 0 ? <div className="empty-state">Completed reporting periods will be stored here.</div> : <div className="report-table"><div className="report-table-head"><span>Period</span><span>Revenue</span><span>Expenses</span><span>Credit losses</span><span>Net income</span><span>Equity</span></div>{game.reports.map((report) => <div className="report-table-row" key={report.id}><span>Y{report.year} Q{report.quarter} · D{report.day}</span><span>{money.format(report.interestIncome + report.feeIncome)}</span><span>{money.format(report.operatingExpenses)}</span><span>{money.format(report.creditLosses)}</span><strong className={report.netIncome < 0 ? "negative" : ""}>{money.format(report.netIncome)}</strong><span>{money.format(report.equity)}</span></div>)}</div>}</section>
  </>;
}

function ReportKpi({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <span className={strong ? "report-kpi strong" : "report-kpi"}><small>{label}</small><b>{value}</b></span>; }
