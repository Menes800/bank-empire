import { useState } from "react";
import { approveLoanRefined, counterLoanRefined, declineLoanRefined, getCreditRecommendation, setLendingPolicy } from "../../game/engine";
import { branchForApplication } from "../../game/v84/gameplay";
import type { GameState, LendingPolicy } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

type Workspace = "portfolio" | "policy" | "exceptions";
const policies: LendingPolicy[] = ["conservative", "balanced", "aggressive"];

const policyCopy: Record<LendingPolicy, { title: string; body: string; branch: string }> = {
  conservative: { title: "Capital protection", body: "Prioritise stronger borrowers, security and liquidity.", branch: "Local teams decline more marginal applications." },
  balanced: { title: "Controlled growth", body: "Balance customer growth, margin and expected loss.", branch: "Normal A and B cases stay inside branch mandates." },
  aggressive: { title: "Growth lending", body: "Accept more risk to build the loan book faster.", branch: "More C-grade cases may be considered locally." },
};

export function CreditControlPage({ game, action }: { game: GameState; action: GameAction }) {
  const [workspace, setWorkspace] = useState<Workspace>("portfolio");
  const outstanding = game.activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const pastDue = game.activeLoans.filter((loan) => loan.status !== "performing" && loan.status !== "restructured" && loan.status !== "written-off");
  const expectedLoss = game.collectionCases.filter((item) => !item.closed).reduce((sum, item) => {
    const loan = game.activeLoans.find((entry) => entry.id === item.loanId);
    return sum + Math.max(0, (loan?.outstanding ?? 0) - item.expectedRecovery);
  }, 0);
  const cro = game.employeeRoster.find((employee) => employee.executiveRole === "CRO");

  return <>
    <section className="credit-command-v85 panel"><div><p className="eyebrow">CREDIT CONTROL</p><h2>Set policy. Review the portfolio. Decide true exceptions.</h2><p>Ordinary applications are processed by advisers and branch managers. This workspace is for central risk oversight.</p></div><div className="credit-command-stats-v85"><Metric label="Loan book" value={money.format(outstanding)} /><Metric label="Past due" value={`${pastDue.length}`} /><Metric label="Expected loss" value={money.format(expectedLoss)} /><Metric label="Exceptions" value={`${game.loanApplications.length}`} /></div></section>

    <nav className="credit-tabs-v85 panel">{(["portfolio", "policy", "exceptions"] as Workspace[]).map((item) => <button key={item} className={workspace === item ? "selected" : ""} onClick={() => setWorkspace(item)}><span>{item === "portfolio" ? "Portfolio" : item === "policy" ? "Credit policy" : "Material exceptions"}</span>{item === "exceptions" && <b>{game.loanApplications.length}</b>}</button>)}</nav>

    {workspace === "portfolio" && <Portfolio game={game} outstanding={outstanding} pastDue={pastDue.length} expectedLoss={expectedLoss} />}
    {workspace === "policy" && <section className="panel credit-policy-v85"><div className="panel-heading"><div><p className="eyebrow">BANK-WIDE CREDIT POLICY</p><h3>One policy guides every branch mandate</h3><p>{cro ? `${cro.name} translates this policy into normal branch rules and central exception limits.` : "Appoint a CRO to own policy execution and routine credit oversight."}</p></div></div><div className="credit-policy-grid-v85">{policies.map((policy) => <button key={policy} className={game.lendingPolicy === policy ? "selected" : ""} onClick={() => action((state) => setLendingPolicy(state, policy))}><strong>{policyCopy[policy].title}</strong><span>{policy}</span><p>{policyCopy[policy].body}</p><small>{policyCopy[policy].branch}</small></button>)}</div><div className="credit-policy-rule-v85"><strong>Escalation rule</strong><p>Branches keep ordinary applications inside their mandate. Large amounts, weak security, policy exceptions and concentrated exposure remain here.</p></div></section>}
    {workspace === "exceptions" && <Exceptions game={game} action={action} />}
  </>;
}

function Portfolio({ game, outstanding, pastDue, expectedLoss }: { game: GameState; outstanding: number; pastDue: number; expectedLoss: number }) {
  const performing = game.activeLoans.filter((loan) => loan.status === "performing" || loan.status === "restructured");
  const bySegment = new Map<string, number>();
  game.activeLoans.forEach((loan) => bySegment.set(loan.segment, (bySegment.get(loan.segment) ?? 0) + loan.outstanding));
  return <div className="credit-portfolio-v85">
    <section className="portfolio-health-grid-v85"><article className="panel"><small>PERFORMING</small><strong>{performing.length}</strong><p>{game.activeLoans.length === 0 ? "The active loan book is still empty." : `${Math.round(performing.length / Math.max(1, game.activeLoans.length) * 100)}% of relationships are performing.`}</p></article><article className="panel"><small>NPL RATIO</small><strong>{game.nplRatio.toFixed(2)}%</strong><p>Non-performing balance compared with the total bank loan book.</p></article><article className="panel"><small>PAST DUE</small><strong>{pastDue}</strong><p>Handled by credit operations and the CRO mandate.</p></article><article className="panel"><small>EXPECTED LOSS</small><strong>{money.format(expectedLoss)}</strong><p>Current estimated loss after expected recoveries.</p></article></section>
    <section className="panel exposure-panel-v85"><div className="panel-heading"><div><p className="eyebrow">EXPOSURE</p><h3>Where the loan book sits</h3></div><span className="status good">{money.format(outstanding)}</span></div>{bySegment.size === 0 ? <div className="empty-state">No active exposure has been originated yet.</div> : <div className="exposure-list-v85">{[...bySegment.entries()].sort((a, b) => b[1] - a[1]).map(([segment, value]) => <article key={segment}><div><strong>{segment}</strong><small>{(value / Math.max(1, outstanding) * 100).toFixed(0)}% of outstanding</small></div><b>{money.format(value)}</b><div className="stage-track"><i style={{ width: `${value / Math.max(1, outstanding) * 100}%` }} /></div></article>)}</div>}</section>
  </div>;
}

function Exceptions({ game, action }: { game: GameState; action: GameAction }) {
  if (game.loanApplications.length === 0) return <section className="panel"><div className="empty-state"><strong>No material exceptions are waiting.</strong><p>Branch advisers and managers are processing normal applications inside their mandates.</p></div></section>;
  return <section className="panel material-exceptions-v85"><div className="panel-heading"><div><p className="eyebrow">MATERIAL EXCEPTIONS</p><h3>{game.loanApplications.length} cases outside local mandates</h3><p>These remain because of size, risk, collateral or policy limits.</p></div></div><div className="exception-list-v85">{game.loanApplications.map((application) => {
    const recommendation = getCreditRecommendation(game, application);
    const branch = branchForApplication(game, application);
    return <article key={application.id}><div className="exception-head-v85"><div><span className={`recommendation-risk ${recommendation.risk.toLowerCase()}`}>{recommendation.risk}</span><section><strong>{application.customerName}</strong><small>{application.segment} · originating branch: {branch?.name ?? "Central relationship"}</small></section></div><b>{money.format(application.amount)}</b></div><p className="exception-reason-v85"><strong>{recommendation.label}:</strong> {recommendation.reason}</p><div className="exception-metrics-v85"><Metric label="Expected profit" value={money.format(recommendation.expectedProfit)} /><Metric label="Cash required" value={money.format(Math.abs(recommendation.liquidityImpact))} /><Metric label="Default probability" value={`${application.defaultChance.toFixed(1)}%`} /><Metric label="Collateral" value={`${application.collateral}%`} /></div><div className="credit-actions"><button className={recommendation.action === "approve" ? "primary small recommended" : "secondary small"} disabled={game.cash < application.amount} onClick={() => action((state) => approveLoanRefined(state, application.id))}>Approve exception</button><button className={recommendation.action === "counter" ? "primary small recommended" : "secondary small"} onClick={() => action((state) => counterLoanRefined(state, application.id))}>Return with counter-offer</button><button className="danger-button small" onClick={() => action((state) => declineLoanRefined(state, application.id))}>Decline exception</button></div></article>;
  })}</div></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <span><small>{label}</small><strong>{value}</strong></span>; }
