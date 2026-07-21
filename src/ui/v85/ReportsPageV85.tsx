import { useState } from "react";
import { setMonthlyBudget } from "../../game/engine";
import type { GameState } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

export function ReportsPageV85({ game, action }: { game: GameState; action: GameAction }) {
  const [showAll, setShowAll] = useState(false);
  const latest = game.reports[0];
  const payroll = game.employeeRoster.reduce((sum, employee) => sum + employee.salary, 0) / 12;
  const rent = game.branchOffices.reduce((sum, branch) => sum + branch.monthlyRent, 0);
  const localMarketing = game.branchOffices.reduce((sum, branch) => sum + (branch.managerBudget ?? 0), 0);
  const technology = Math.round(game.digitalLevel * 24 * 30);
  const compliance = Math.round((480 + Math.max(0, 90 - game.compliance) * 18) * 30);
  const funding = Math.round(game.wholesaleFunding * game.wholesaleFundingRate / 100 / 12);
  const routineTotal = payroll + rent + localMarketing + technology + compliance + funding;
  const visibleReports = showAll ? game.reports : game.reports.slice(0, 12);

  return <>
    <section className="reports-command-hero panel"><div><p className="eyebrow">REPORTS</p><h2>One financial record for every period</h2><p>Reports show history and variance. Board expectations live on the Board page, while new decisions live in the CEO Inbox.</p></div><div><small>Latest closed period</small><strong>{latest ? `Day ${latest.day}` : "Not closed"}</strong></div></section>
    <section className="routine-cost-banner"><div><span>↻</span><div><strong>Estimated monthly operating base</strong><p>Named payroll, rent, local marketing, technology, compliance and funding are shown once here.</p></div></div><b>{money.format(routineTotal)}<small>estimated monthly total</small></b></section>
    <section className="routine-cost-grid"><CostCard label="Payroll" value={payroll} /><CostCard label="Branch rent" value={rent} /><CostCard label="Local marketing" value={localMarketing} /><CostCard label="Technology" value={technology} /><CostCard label="Compliance" value={compliance} /><CostCard label="Funding interest" value={funding} /></section>
    <section className="content-grid reports-top-grid">
      <article className="panel report-hero"><div className="panel-heading"><div><p className="eyebrow">LATEST MANAGEMENT REPORT</p><h3>{latest ? `Year ${latest.year} · Quarter ${latest.quarter} · Day ${latest.day}` : "First month not completed"}</h3></div>{latest && <span className={latest.netIncome >= 0 ? "status good" : "status warn"}>{latest.netIncome >= 0 ? "Profitable" : "Loss-making"}</span>}</div>{latest ? <><div className="report-kpi-grid"><ReportKpi label="Interest income" value={latest.interestIncome} /><ReportKpi label="Fee income" value={latest.feeIncome} /><ReportKpi label="Operating expenses" value={latest.operatingExpenses} /><ReportKpi label="Credit losses" value={latest.creditLosses} /><ReportKpi label="Net income" value={latest.netIncome} strong /><ReportKpi label="Budget variance" value={latest.budgetVariance} strong /></div><div className="financial-equation"><span><small>Assets</small><b>{money.format(latest.assets)}</b></span><em>−</em><span><small>Liabilities</small><b>{money.format(latest.liabilities)}</b></span><em>=</em><span><small>Equity</small><b>{money.format(latest.equity)}</b></span></div></> : <div className="empty-state"><strong>No monthly report yet</strong><span>Advance to day 30 to close the first reporting period.</span></div>}</article>
      <article className="panel budget-card"><p className="eyebrow">MONTHLY OPERATING BUDGET</p><h3>{money.format(game.monthlyBudget)}</h3><p>This is a target, not a second payment. A positive variance means operating expenses finished below budget.</p><input type="range" min="250000" max="12000000" step="50000" value={game.monthlyBudget} onChange={(event) => action((state) => setMonthlyBudget(state, Number(event.target.value)))} /><div className="budget-range"><span>NOK 250k</span><span>NOK 12m</span></div>{latest && <div className={latest.budgetVariance >= 0 ? "budget-result positive" : "budget-result negative"}><small>Latest variance</small><strong>{money.format(latest.budgetVariance)}</strong></div>}</article>
    </section>
    <section className="panel report-history report-history-v87"><div className="panel-heading"><div><p className="eyebrow">REPORT ARCHIVE</p><h3>{showAll ? `${game.reports.length} monthly periods` : `Latest ${Math.min(12, game.reports.length)} months`}</h3><p>The latest 12 periods are shown by default so the archive stays readable.</p></div>{game.reports.length > 12 && <button className="secondary" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show latest 12" : `Show all ${game.reports.length}`}</button>}</div>{game.reports.length === 0 ? <div className="empty-state">Completed reporting periods will be stored here.</div> : <div className="report-table report-table-v87"><div className="report-table-head"><span>Period</span><span>Revenue</span><span>Expenses</span><span>Credit losses</span><span>Net income</span><span>Equity</span></div>{visibleReports.map((report, index) => <div className="report-table-row" key={report.id}><span><strong>Month {game.reports.length - index}</strong><small>Y{report.year} Q{report.quarter} · Day {report.day}</small></span><span>{money.format(report.interestIncome + report.feeIncome)}</span><span>{money.format(report.operatingExpenses)}</span><span>{money.format(report.creditLosses)}</span><strong className={report.netIncome < 0 ? "negative" : "positive"}>{money.format(report.netIncome)}</strong><span>{money.format(report.equity)}</span></div>)}</div>}</section>
  </>;
}

function CostCard({ label, value }: { label: string; value: number }) { return <article className="routine-cost-card"><small>{label}</small><strong>{money.format(value)}</strong><span>per month</span></article>; }
function ReportKpi({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) { return <span className={strong ? "report-kpi strong" : "report-kpi"}><small>{label}</small><b>{money.format(value)}</b></span>; }
