import { useMemo, useState } from "react";
import { approveLoanRefined, counterLoanRefined, declineLoanRefined, getCreditRecommendation, takeCollectionAction } from "../../game/engine";
import { getCreditAssessmentV89 } from "../../game/v89/gameplay";
import type { GameState } from "../../game/store";
import type { ActiveLoan, CollectionCase, LoanStatus } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

type Workspace = "relationships" | "exceptions" | "collections" | "book";
const problemStatuses = new Set<LoanStatus>(["late", "overdue", "collections", "defaulted", "watch", "delinquent"]);

export function ClientsPageV89({ game, action }: { game: GameState; action: GameAction }) {
  const [workspace, setWorkspace] = useState<Workspace>("exceptions");
  const applications = game.loanApplications.map((application) => getCreditAssessmentV89(game, application));
  const exceptions = applications.filter((item) => item.requiresCEO);
  const handled = game.managementLog.filter((item) => item.role === "CRO" && item.title.startsWith("Credit ·")).slice(0, 8);
  const problemLoans = game.activeLoans.filter((loan) => problemStatuses.has(loan.status));
  const collections = game.collectionCases.filter((item) => !item.closed);
  const outstanding = game.activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const expectedRecovery = collections.reduce((sum, item) => sum + item.expectedRecovery, 0);
  const atRiskSegments = useMemo(() => [...game.customerSegments].sort((a, b) => b.churnRisk - a.churnRisk).slice(0, 6), [game.customerSegments]);
  const cro = game.employeeRoster.find((employee) => employee.executiveRole === "CRO");

  const counts: Record<Workspace, number> = { relationships: game.customerSegments.length, exceptions: exceptions.length, collections: collections.length, book: game.activeLoans.length };

  return <>
    <section className="v89-credit-hero">
      <div><p className="eyebrow light">CUSTOMERS, CREDIT & COLLECTIONS</p><h2>Exceptions, not routine underwriting</h2><p>{cro ? `${cro.name} reviews applications automatically. Approval, counter-offer and decline decisions remain with the CRO until an exposure, risk, capital or liquidity limit is breached.` : "Appoint a CRO to remove routine credit work from the CEO."}</p></div>
      <div><Headline label="Customers" value={game.customers.toLocaleString(game.locale)} /><Headline label="Outstanding" value={money.format(outstanding)} /><Headline label="CEO exceptions" value={`${exceptions.length}`} tone={exceptions.length ? "warning" : "good"} /><Headline label="Expected recovery" value={money.format(expectedRecovery)} /></div>
    </section>

    <nav className="v89-workspace-tabs panel">{(["relationships", "exceptions", "collections", "book"] as Workspace[]).map((item) => <button key={item} className={workspace === item ? "selected" : ""} onClick={() => setWorkspace(item)}><span>{item === "relationships" ? "Relationships" : item === "exceptions" ? "Credit exceptions" : item === "collections" ? "Collections" : "Loan book"}</span><b>{counts[item]}</b></button>)}</nav>

    {workspace === "exceptions" && <section className="v89-credit-layout">
      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">CREDIT EXCEPTIONS</p><h3>{exceptions.length ? `${exceptions.length} case${exceptions.length === 1 ? "" : "s"} need CEO authority` : "CRO is handling the queue"}</h3><p>Every visible case has crossed a concrete mandate, exposure, balance-sheet or staffing limit.</p></div></div>
        {exceptions.length === 0 ? <div className="v89-compact-empty"><strong>No credit exception is waiting.</strong><span>Routine applications are approved, countered or declined by the CRO and recorded in the decision trail.</span></div> : <div className="v89-credit-exception-list">{exceptions.map((assessment) => {
          const application = assessment.application;
          const recommendation = getCreditRecommendation(game, application);
          return <article key={application.id}>
            <header><div><small>{application.segment} · grade {application.riskGrade}</small><strong>{application.customerName}</strong></div><b>{money.format(application.amount)}</b></header>
            <div className="v89-credit-reason"><strong>{assessment.reason}</strong><span>Risk {assessment.estimatedRisk.toFixed(0)} / limit {game.executiveMandates.CRO.riskLimit.toFixed(0)}</span><span>Exposure limit {money.format(assessment.exposureLimit)}</span></div>
            <div className="v89-credit-kpis"><Metric label="Expected profit" value={money.format(recommendation.expectedProfit)} /><Metric label="Default probability" value={`${application.defaultChance.toFixed(1)}%`} /><Metric label="Collateral" value={`${application.collateral}%`} /><Metric label="CRO recommendation" value={recommendation.action} /></div>
            <div className="v89-credit-actions"><button className={recommendation.action === "approve" ? "primary" : "secondary"} disabled={game.cash < application.amount} onClick={() => action((state) => approveLoanRefined(state, application.id))}>Approve as CEO</button><button className={recommendation.action === "counter" ? "primary" : "secondary"} disabled={game.cash < application.amount * .72} onClick={() => action((state) => counterLoanRefined(state, application.id))}>Counter offer</button><button className="danger-button" onClick={() => action((state) => declineLoanRefined(state, application.id))}>Decline</button></div>
          </article>;
        })}</div>}
      </article>
      <aside className="panel v89-credit-trail"><div className="panel-heading"><div><p className="eyebrow">CRO DECISION TRAIL</p><h3>Handled without CEO interruption</h3></div></div>{handled.length ? handled.map((item) => <div key={item.id}><span>CRO</span><div><strong>{item.title.replace("Credit · ", "")}</strong><small>{item.detail}</small></div>{item.amount !== undefined && <b>{money.format(item.amount)}</b>}</div>) : <div className="v89-compact-empty">No automatic credit decisions recorded yet.</div>}</aside>
    </section>}

    {workspace === "relationships" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">RELATIONSHIP WATCH</p><h3>Segments with the highest churn pressure</h3><p>CMO activity, pricing, service capacity and digital capability all affect these customers.</p></div></div><div className="v89-segment-grid">{atRiskSegments.map((segment) => <article key={segment.key}><header><strong>{segment.name}</strong><b className={segment.churnRisk > 30 ? "negative" : ""}>{segment.churnRisk.toFixed(0)}% churn</b></header><span>{segment.customers.toLocaleString(game.locale)} customers · prefers {segment.preferredChannel}</span><div><i style={{ width: `${segment.churnRisk}%` }} /></div><footer><span>Satisfaction {segment.satisfaction.toFixed(0)}</span><span>Loyalty {segment.loyalty.toFixed(0)}</span><span>Profitability {segment.profitability.toFixed(0)}</span></footer></article>)}</div></section>}

    {workspace === "collections" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">COLLECTIONS</p><h3>{collections.length} active recovery case{collections.length === 1 ? "" : "s"}</h3><p>CRO uses collections and collateral permissions automatically. Manual actions remain available for exceptions and playtest control.</p></div><span className={cro ? "status good" : "status warn"}>{cro ? `${cro.name} accountable` : "CRO vacant"}</span></div>{collections.length ? <div className="v89-collection-list">{collections.map((item) => { const loan = game.activeLoans.find((active) => active.id === item.loanId); return loan ? <CollectionRow key={item.id} item={item} loan={loan} action={action} /> : null; })}</div> : <div className="v89-compact-empty">No active collections cases.</div>}</section>}

    {workspace === "book" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">LOAN BOOK</p><h3>All active exposures</h3></div><span className={problemLoans.length ? "status warn" : "status good"}>{problemLoans.length} problem loans</span></div>{game.activeLoans.length ? <div className="v89-loan-table"><div><span>Customer</span><span>Outstanding</span><span>Rate</span><span>Risk</span><span>Past due</span><span>Status</span></div>{game.activeLoans.map((loan) => <div key={loan.id}><span><strong>{loan.customerName}</strong><small>{loan.segment}</small></span><span>{money.format(loan.outstanding)}</span><span>{loan.rate.toFixed(2)}%</span><span>{loan.riskGrade}</span><span>{loan.daysPastDue}d</span><span>{loan.status}</span></div>)}</div> : <div className="v89-compact-empty">No active loans.</div>}</section>}
  </>;
}

function Headline({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
function Metric({ label, value }: { label: string; value: string }) { return <span><small>{label}</small><strong>{value}</strong></span>; }
function CollectionRow({ item, loan, action }: { item: CollectionCase; loan: ActiveLoan; action: GameAction }) { return <article><header><div><strong>{item.customerName}</strong><small>{item.daysPastDue} days past due · {item.stage}</small></div><b>{money.format(loan.outstanding)}</b></header><div><span>Expected recovery <b>{money.format(item.expectedRecovery)}</b></span><span>Last action <b>{item.lastAction}</b></span></div><footer><button onClick={() => action((state) => takeCollectionAction(state, loan.id, "payment-plan"))}>Payment plan</button><button onClick={() => action((state) => takeCollectionAction(state, loan.id, "external-collections"))}>External collections</button><button onClick={() => action((state) => takeCollectionAction(state, loan.id, "enforce-collateral"))}>Enforce collateral</button></footer></article>; }
