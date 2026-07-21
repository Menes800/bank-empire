import { useState } from "react";
import { approveLoanRefined, counterLoanRefined, declineLoanRefined, setLendingPolicy } from "../../game/engine";
import { branchForApplication } from "../../game/v84/gameplay";
import { croApprovalLimit, requiresCEOApproval } from "../../game/v86/gameplay";
import type { GameState, LendingPolicy } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

type Workspace = "portfolio" | "policy" | "exceptions";
const policies: LendingPolicy[] = ["conservative", "balanced", "aggressive"];

const policyCopy: Record<LendingPolicy, { title: string; body: string; branch: string }> = {
  conservative: { title: "Capital protection", body: "Stronger borrowers, security and liquidity come first.", branch: "Local teams decline more marginal applications." },
  balanced: { title: "Controlled growth", body: "Balance customer growth, margin and expected loss.", branch: "Normal A and B cases stay inside branch mandates." },
  aggressive: { title: "Growth lending", body: "Accept more measured risk to grow the loan book.", branch: "More C-grade cases may receive revised terms." },
};

export function CreditControlPageV86({ game, action }: { game: GameState; action: GameAction }) {
  const [workspace, setWorkspace] = useState<Workspace>("portfolio");
  const outstanding = game.activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const pastDue = game.activeLoans.filter((loan) => !["performing", "restructured", "written-off"].includes(loan.status));
  const expectedLoss = game.collectionCases.filter((item) => !item.closed).reduce((sum, item) => {
    const loan = game.activeLoans.find((entry) => entry.id === item.loanId);
    return sum + Math.max(0, (loan?.outstanding ?? 0) - item.expectedRecovery);
  }, 0);
  const cro = game.employeeRoster.find((employee) => employee.executiveRole === "CRO");
  const ceoExceptions = game.loanApplications.filter((application) => requiresCEOApproval(game, application));
  const croQueue = game.loanApplications.filter((application) => !requiresCEOApproval(game, application));

  return <>
    <section className="credit-command-v85 credit-command-v86 panel"><div><p className="eyebrow">CREDIT CONTROL</p><h2>Policy and portfolio — not a manual loan desk</h2><p>Branch advisers process ordinary applications. The CRO decides central cases within authority. You only see concentration, authority and genuine policy exceptions.</p></div><div className="credit-command-stats-v85"><Metric label="Loan book" value={money.format(outstanding)} /><Metric label="Past due" value={`${pastDue.length}`} /><Metric label="Expected loss" value={money.format(expectedLoss)} /><Metric label="CEO exceptions" value={`${ceoExceptions.length}`} /></div></section>

    <nav className="credit-tabs-v85 panel">{(["portfolio", "policy", "exceptions"] as Workspace[]).map((item) => <button key={item} className={workspace === item ? "selected" : ""} onClick={() => setWorkspace(item)}><span>{item === "portfolio" ? "Portfolio" : item === "policy" ? "Credit policy" : "True exceptions"}</span>{item === "exceptions" && <b>{ceoExceptions.length}</b>}</button>)}</nav>

    {workspace === "portfolio" && <Portfolio game={game} outstanding={outstanding} pastDue={pastDue.length} expectedLoss={expectedLoss} />}
    {workspace === "policy" && <section className="panel credit-policy-v85"><div className="panel-heading"><div><p className="eyebrow">BANK-WIDE CREDIT POLICY</p><h3>One policy, two operating mandates</h3><p>{cro ? `${cro.name} owns central credit execution up to ${money.format(croApprovalLimit(game))}.` : "The CRO role is vacant, so central credit authority cannot operate automatically."}</p></div></div><div className="credit-policy-grid-v85">{policies.map((policy) => <button key={policy} className={game.lendingPolicy === policy ? "selected" : ""} onClick={() => action((state) => setLendingPolicy(state, policy))}><strong>{policyCopy[policy].title}</strong><span>{policy}</span><p>{policyCopy[policy].body}</p><small>{policyCopy[policy].branch}</small></button>)}</div><div className="credit-authority-grid-v86"><article><small>BRANCH AUTHORITY</small><strong>Based on each local manager mandate</strong><p>Ordinary local loans are handled by advisers and the branch manager.</p></article><article><small>CRO AUTHORITY</small><strong>{croApprovalLimit(game) > 0 ? `Up to ${money.format(croApprovalLimit(game))}` : "No active authority"}</strong><p>{game.managementControl.lending === "automatic" ? "CRO handles normal central exceptions automatically." : game.managementControl.lending === "major" ? "CRO acts normally and escalates material cases." : "Credit waits for CEO instructions until the mandate changes."}</p></article><article><small>CEO / BOARD</small><strong>Concentration and authority exceptions</strong><p>Only cases above the CRO limit or with material concentration remain for you.</p></article></div></section>}
    {workspace === "exceptions" && <Exceptions game={game} action={action} ceoExceptions={ceoExceptions} croQueue={croQueue.length} croName={cro?.name} />}
  </>;
}

function Portfolio({ game, outstanding, pastDue, expectedLoss }: { game: GameState; outstanding: number; pastDue: number; expectedLoss: number }) {
  const performing = game.activeLoans.filter((loan) => loan.status === "performing" || loan.status === "restructured");
  const bySegment = new Map<string, number>();
  game.activeLoans.forEach((loan) => bySegment.set(loan.segment, (bySegment.get(loan.segment) ?? 0) + loan.outstanding));
  return <div className="credit-portfolio-v85"><section className="portfolio-health-grid-v85"><article className="panel"><small>PERFORMING</small><strong>{performing.length}</strong><p>{game.activeLoans.length === 0 ? "The active loan book is still empty." : `${Math.round(performing.length / Math.max(1, game.activeLoans.length) * 100)}% of relationships are performing.`}</p></article><article className="panel"><small>NPL RATIO</small><strong>{game.nplRatio.toFixed(2)}%</strong><p>Non-performing balance compared with the total bank loan book.</p></article><article className="panel"><small>PAST DUE</small><strong>{pastDue}</strong><p>Credit operations and the CRO own normal recovery work.</p></article><article className="panel"><small>EXPECTED LOSS</small><strong>{money.format(expectedLoss)}</strong><p>Estimated loss after current expected recoveries.</p></article></section><section className="panel exposure-panel-v85"><div className="panel-heading"><div><p className="eyebrow">EXPOSURE</p><h3>Where the loan book sits</h3></div><span className="status good">{money.format(outstanding)}</span></div>{bySegment.size === 0 ? <div className="empty-state">No active exposure has been originated yet.</div> : <div className="exposure-list-v85">{[...bySegment.entries()].sort((a, b) => b[1] - a[1]).map(([segment, value]) => <article key={segment}><div><strong>{segment}</strong><small>{(value / Math.max(1, outstanding) * 100).toFixed(0)}% of outstanding</small></div><b>{money.format(value)}</b><div className="stage-track"><i style={{ width: `${value / Math.max(1, outstanding) * 100}%` }} /></div></article>)}</div>}</section></div>;
}

function Exceptions({ game, action, ceoExceptions, croQueue, croName }: { game: GameState; action: GameAction; ceoExceptions: GameState["loanApplications"]; croQueue: number; croName?: string }) {
  if (ceoExceptions.length === 0) return <section className="panel material-exceptions-v86"><div className="empty-state"><strong>No true CEO credit exceptions are waiting.</strong><p>{croQueue > 0 ? `${croName ?? "The CRO"} currently owns ${croQueue} central case${croQueue === 1 ? "" : "s"}. Advance time for the management outcome.` : "Branch advisers and the CRO have processed all normal applications inside their mandates."}</p></div></section>;
  return <section className="panel material-exceptions-v85"><div className="panel-heading"><div><p className="eyebrow">TRUE CREDIT EXCEPTIONS</p><h3>{ceoExceptions.length} case{ceoExceptions.length === 1 ? "" : "s"} exceed CRO authority</h3><p>These remain because of size or concentrated exposure — not because the CRO needs help with normal underwriting.</p></div></div><div className="exception-list-v85">{ceoExceptions.map((application) => {
    const branch = branchForApplication(game, application);
    return <article key={application.id}><div className="exception-head-v85"><div><span className="recommendation-risk high">CEO</span><section><strong>{application.customerName}</strong><small>{application.segment} · originating branch: {branch?.name ?? "Central relationship"}</small></section></div><b>{money.format(application.amount)}</b></div><p className="exception-reason-v85"><strong>Reason for escalation:</strong> The requested exposure exceeds the active CRO authority or concentration limit.</p><div className="exception-metrics-v85"><Metric label="Cash required" value={money.format(application.amount)} /><Metric label="Risk grade" value={application.riskGrade} /><Metric label="Default probability" value={`${application.defaultChance.toFixed(1)}%`} /><Metric label="Collateral" value={`${application.collateral}%`} /></div><div className="credit-actions"><button className="primary small" disabled={game.cash < application.amount} onClick={() => action((state) => approveLoanRefined(state, application.id))}>Approve strategic exception</button><button className="secondary small" onClick={() => action((state) => counterLoanRefined(state, application.id))}>Return to CRO with limits</button><button className="danger-button small" onClick={() => action((state) => declineLoanRefined(state, application.id))}>Decline exception</button></div></article>;
  })}</div></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <span><small>{label}</small><strong>{value}</strong></span>; }
