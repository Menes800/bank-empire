import { useMemo, useState } from "react";
import {
  applyProductPreset,
  approveLoanRefined,
  counterLoanRefined,
  declineLoanRefined,
  getCreditRecommendation,
  takeCollectionAction,
  updateProductTerms,
} from "../../game/engine";
import type { GameState, ProductKey, ProductPreset } from "../../game/store";
import type { ActiveLoan, CollectionCase, LoanStatus } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const productNames: Record<ProductKey, string> = {
  everyday: "Everyday account", savings: "Savings", mortgage: "Mortgage", sme: "SME banking", cards: "Credit cards", insurance: "Insurance", wealth: "Wealth management",
};
const presets: ProductPreset[] = ["competitive", "balanced", "premium", "conservative"];
const presetCopy: Record<ProductPreset, { summary: string; growth: string; margin: string; risk: string }> = {
  competitive: { summary: "Lower price and easier access", growth: "High", margin: "Lower", risk: "Higher" },
  balanced: { summary: "Steady pricing and service", growth: "Medium", margin: "Medium", risk: "Controlled" },
  premium: { summary: "Higher service and relationship value", growth: "Selective", margin: "Higher", risk: "Lower churn" },
  conservative: { summary: "Strict approval and capital protection", growth: "Low", margin: "Protected", risk: "Lowest" },
};
const problemStatuses = new Set<LoanStatus>(["late", "overdue", "collections", "defaulted", "watch", "delinquent"]);
type ClientWorkspace = "relationships" | "credit" | "collections" | "book";

function statusLabel(status: LoanStatus) {
  if (status === "written-off") return "Written off";
  if (status === "restructured") return "Payment plan";
  if (status === "collections") return "In collections";
  if (status === "defaulted") return "Defaulted";
  if (status === "overdue" || status === "delinquent") return "31–90 days overdue";
  if (status === "late" || status === "watch") return "1–30 days late";
  return "Performing";
}

function productEconomics(game: GameState, key: ProductKey) {
  const terms = game.productTerms[key];
  const share = Math.max(1, game.products.length);
  const customers = Math.max(1, Math.round(game.customers / share * (key === "everyday" ? 1 : .42)));
  const balance = key === "savings" ? game.deposits * .48 : key === "mortgage" ? game.loans * .58 : key === "sme" ? game.loans * .24 : 0;
  const monthlyIncome = key === "savings" ? balance * Math.max(.2, game.baseRate - terms.customerRate) / 100 / 12 : key === "mortgage" || key === "sme" || key === "cards" ? balance * terms.customerRate / 100 / 12 : customers * terms.monthlyFee;
  const monthlyCost = customers * (terms.serviceLevel / 100 * 7 + 2.5) + terms.marketingBudget;
  return { customers, balance, monthlyIncome, monthlyCost, contribution: monthlyIncome - monthlyCost };
}

export function ClientsPage({ game, action }: { game: GameState; action: GameAction }) {
  const [advanced, setAdvanced] = useState<Record<string, boolean>>({});
  const [workspace, setWorkspace] = useState<ClientWorkspace>("relationships");
  const [portfolioFilter, setPortfolioFilter] = useState<"problems" | "all">("problems");
  const atRiskSegments = useMemo(() => [...game.customerSegments].sort((a, b) => b.churnRisk - a.churnRisk).slice(0, 4), [game.customerSegments]);
  const averageChurn = game.customerSegments.reduce((sum, segment) => sum + segment.churnRisk * segment.customers, 0) / Math.max(1, game.customerSegments.reduce((sum, segment) => sum + segment.customers, 0));
  const problemLoans = game.activeLoans.filter((loan) => problemStatuses.has(loan.status));
  const visibleLoans = portfolioFilter === "all" ? game.activeLoans : problemLoans;
  const openCollections = game.collectionCases.filter((item) => !item.closed);
  const outstanding = game.activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const expectedRecovery = openCollections.reduce((sum, item) => sum + item.expectedRecovery, 0);
  const expectedLoss = openCollections.reduce((sum, item) => {
    const loan = game.activeLoans.find((active) => active.id === item.loanId);
    return sum + Math.max(0, (loan?.outstanding ?? 0) - item.expectedRecovery);
  }, 0);
  const cro = game.employeeRoster.find((employee) => employee.executiveRole === "CRO");

  const workspaceCounts: Record<ClientWorkspace, number> = {
    relationships: game.customerSegments.length,
    credit: game.loanApplications.length,
    collections: openCollections.length,
    book: game.activeLoans.length,
  };

  return <>
    <section className="credit-command-centre credit-command-centre-v82">
      <div><p className="eyebrow light">CUSTOMERS, CREDIT & COLLECTIONS</p><h2>Customer and credit control</h2><p>Use one workspace at a time. Routine work stays delegated; only material exceptions need your decision.</p></div>
      <div className="credit-command-kpis"><span><small>Customers</small><strong>{game.customers.toLocaleString("en-GB")}</strong></span><span><small>Outstanding</small><strong>{money.format(outstanding)}</strong></span><span><small>Past due</small><strong>{problemLoans.length}</strong></span><span><small>Expected loss</small><strong>{money.format(expectedLoss)}</strong></span></div>
    </section>

    <nav className="client-workspace-tabs panel" aria-label="Customers and credit workspace">
      {(["relationships", "credit", "collections", "book"] as ClientWorkspace[]).map((item) => <button key={item} className={workspace === item ? "selected" : ""} onClick={() => setWorkspace(item)}>
        <span>{item === "relationships" ? "Relationships" : item === "credit" ? "Credit decisions" : item === "collections" ? "Collections" : "Loan book"}</span>
        <b>{workspaceCounts[item]}</b>
      </button>)}
    </nav>

    {workspace === "relationships" && <div className="client-workspace client-workspace-relationships">
      <section className="panel segment-summary-panel compact-segment-watch">
        <div className="panel-heading"><div><p className="eyebrow">RELATIONSHIP WATCH</p><h3>Customers most likely to leave</h3></div><span className={averageChurn > 25 ? "status warn" : "status good"}>{averageChurn > 25 ? "Needs action" : "Stable"}</span></div>
        <div className="segment-watch-grid">{atRiskSegments.map((segment) => <article key={segment.key}><div><span>{segment.name.slice(0, 1)}</span><div><strong>{segment.name}</strong><small>{segment.customers.toLocaleString("en-GB")} customers · {segment.preferredChannel}</small></div></div><b className={segment.churnRisk > 30 ? "negative" : ""}>{segment.churnRisk.toFixed(0)}% churn</b><div className="stage-track"><i style={{ width: `${segment.churnRisk}%` }} /></div><p>{segment.satisfaction < 50 ? "Service quality is the main problem." : segment.loyalty < 45 ? "Relationships are weak and price-sensitive." : "Monitor pricing and channel fit."}</p></article>)}</div>
      </section>

      <section className="panel product-strategy-v7">
        <div className="panel-heading"><div><p className="eyebrow">PRODUCT PORTFOLIO</p><h3>Economics first, detailed terms second</h3><p>Review contribution, then select a commercial preset. Detailed sliders stay hidden until needed.</p></div><span className="status good">{game.products.length} live</span></div>
        <div className="product-economics-grid">{game.products.map((key) => { const terms = game.productTerms[key]; const economics = productEconomics(game, key); const isAdvanced = Boolean(advanced[key]); return <article className="product-economics-card" key={key}>
          <div className="product-economics-head"><div><strong>{productNames[key]}</strong><small>{key === "savings" ? `${terms.customerRate.toFixed(2)}% customer rate` : key === "mortgage" || key === "sme" || key === "cards" ? `${terms.customerRate.toFixed(2)}% lending rate` : `${money.format(terms.monthlyFee)} monthly fee`}</small></div><span>LIVE</span></div>
          <div className="product-mini-pl"><Metric label="Customers" value={economics.customers.toLocaleString("en-GB")} /><Metric label="Balance" value={economics.balance > 0 ? money.format(economics.balance) : "Fee product"} /><Metric label="Income" value={money.format(economics.monthlyIncome)} /><Metric label="Contribution" value={money.format(economics.contribution)} tone={economics.contribution >= 0 ? "positive" : "negative"} /></div>
          <div className="preset-strategy-grid">{presets.map((preset) => <button key={preset} onClick={() => action((state) => applyProductPreset(state, key, preset))}><strong>{preset}</strong><small>{presetCopy[preset].summary}</small><span>Growth {presetCopy[preset].growth} · Margin {presetCopy[preset].margin} · Risk {presetCopy[preset].risk}</span></button>)}</div>
          <button className="advanced-toggle" onClick={() => setAdvanced((current) => ({ ...current, [key]: !current[key] }))}>{isAdvanced ? "Hide detailed terms" : "Open detailed terms"}<span>{isAdvanced ? "−" : "+"}</span></button>
          {isAdvanced && <div className="advanced-terms"><Term label="Customer rate" value={`${terms.customerRate.toFixed(2)}%`}><input type="range" min="0" max={key === "cards" ? 28 : 12} step="0.05" value={terms.customerRate} onChange={(event) => action((state) => updateProductTerms(state, key, { customerRate: Number(event.target.value) }))} /></Term><Term label="Monthly fee" value={money.format(terms.monthlyFee)}><input type="range" min="0" max="1500" step="10" value={terms.monthlyFee} onChange={(event) => action((state) => updateProductTerms(state, key, { monthlyFee: Number(event.target.value) }))} /></Term><Term label="Approval threshold" value={`${terms.approvalThreshold}`}><input type="range" min="25" max="95" step="1" value={terms.approvalThreshold} onChange={(event) => action((state) => updateProductTerms(state, key, { approvalThreshold: Number(event.target.value) }))} /></Term><Term label="Service level" value={`${terms.serviceLevel}`}><input type="range" min="20" max="100" step="1" value={terms.serviceLevel} onChange={(event) => action((state) => updateProductTerms(state, key, { serviceLevel: Number(event.target.value) }))} /></Term></div>}
        </article>; })}</div>
        <div className="locked-products-line"><strong>Future products</strong>{(Object.keys(game.productTerms) as ProductKey[]).filter((key) => !game.products.includes(key)).map((key) => <span key={key}>{productNames[key]}</span>)}</div>
      </section>
    </div>}

    {workspace === "credit" && <div className="client-workspace credit-operations-layout credit-operations-layout-v82">
      <article className="panel exceptional-credit-panel"><div className="panel-heading"><div><p className="eyebrow">EXCEPTIONAL CREDIT</p><h3>{game.loanApplications.length} cases outside delegated rules</h3><p>{cro && game.automation.lending !== "manual" ? `${cro.name} handles routine lending under the ${game.automation.lending} mandate.` : "Appoint a CRO and delegate routine lending to keep only material exceptions here."}</p></div></div>
        {game.loanApplications.length === 0 ? <div className="empty-state">No exceptional applications are waiting.</div> : <div className="credit-case-list">{game.loanApplications.map((application) => { const recommendation = getCreditRecommendation(game, application); return <div className="credit-case recommendation-case" key={application.id}>
          <div className="credit-recommendation"><span className={`recommendation-risk ${recommendation.risk.toLowerCase()}`}>{recommendation.risk}</span><div><strong>{recommendation.label}</strong><p>{recommendation.reason}</p></div></div>
          <div className="credit-case-head"><div><strong>{application.customerName}</strong><small>{application.segment} · risk grade {application.riskGrade}</small></div><b>{money.format(application.amount)}</b></div>
          <div className="decision-impact-grid"><Metric label="Expected profit" value={money.format(recommendation.expectedProfit)} /><Metric label="Cash required" value={money.format(Math.abs(recommendation.liquidityImpact))} tone="negative" /><Metric label="Default probability" value={`${application.defaultChance.toFixed(1)}%`} /><Metric label="Collateral" value={`${application.collateral}%`} /></div>
          <div className="credit-actions"><button className={recommendation.action === "approve" ? "primary small recommended" : "secondary small"} disabled={game.cash < application.amount} onClick={() => action((state) => approveLoanRefined(state, application.id))}>Approve</button><button className={recommendation.action === "counter" ? "primary small recommended" : "secondary small"} disabled={game.cash < application.amount * .72} onClick={() => action((state) => counterLoanRefined(state, application.id))}>Counter offer</button><button className={recommendation.action === "decline" ? "danger-button small recommended" : "danger-button small"} onClick={() => action((state) => declineLoanRefined(state, application.id))}>Decline</button></div>
        </div>; })}</div>}
      </article>
      <PortfolioControl game={game} problemLoans={problemLoans} expectedRecovery={expectedRecovery} portfolioFilter={portfolioFilter} setPortfolioFilter={setPortfolioFilter} />
    </div>}

    {workspace === "collections" && <div className="client-workspace collections-workspace-v82">
      <PortfolioControl game={game} problemLoans={problemLoans} expectedRecovery={expectedRecovery} portfolioFilter={portfolioFilter} setPortfolioFilter={setPortfolioFilter} />
      <section className="panel collections-workbench">
        <div className="panel-heading"><div><p className="eyebrow">ARREARS & COLLECTIONS</p><h3>{openCollections.length} active recovery cases</h3><p>Missed payments move from early arrears to workout, external collections and collateral enforcement.</p></div><span className={openCollections.length > 0 ? "status warn" : "status good"}>{cro ? `${cro.name} · CRO` : "CRO vacant"}</span></div>
        {openCollections.length === 0 ? <div className="empty-state collections-empty"><strong>No active collections cases.</strong><p>Newly approved loans are evaluated at every monthly close.</p></div> : <div className="collections-case-list">{openCollections.map((collectionCase) => { const loan = game.activeLoans.find((item) => item.id === collectionCase.loanId); return loan ? <CollectionRow key={collectionCase.id} collectionCase={collectionCase} loan={loan} action={action} /> : null; })}</div>}
      </section>
    </div>}

    {workspace === "book" && <div className="client-workspace loan-book-workspace-v82">
      <PortfolioControl game={game} problemLoans={problemLoans} expectedRecovery={expectedRecovery} portfolioFilter={portfolioFilter} setPortfolioFilter={setPortfolioFilter} />
      <section className="panel full-loan-book-panel"><div className="panel-heading"><div><p className="eyebrow">LARGE RELATIONSHIPS</p><h3>{visibleLoans.length} shown · {game.activeLoans.length} total</h3></div></div>{visibleLoans.length === 0 ? <div className="empty-state">No relationships match this view.</div> : <div className="full-loan-table"><div className="full-loan-head"><span>Customer</span><span>Status</span><span>Outstanding</span><span>Rate</span><span>Past due</span><span>Collateral</span><span>Recovery</span></div>{visibleLoans.map((loan) => <div className={`full-loan-row loan-${loan.status}`} key={loan.id}><span><strong>{loan.customerName}</strong><small>{loan.segment} · Grade {loan.riskGrade}</small></span><span>{statusLabel(loan.status)}</span><span>{money.format(loan.outstanding)}</span><span>{loan.rate.toFixed(2)}%</span><span>{loan.daysPastDue} days</span><span>{loan.collateral}%</span><span>{money.format(loan.recoveryEstimate ?? loan.outstanding * loan.collateral / 100)}</span></div>)}</div>}</section>
    </div>}
  </>;
}

function PortfolioControl({ game, problemLoans, expectedRecovery, portfolioFilter, setPortfolioFilter }: { game: GameState; problemLoans: ActiveLoan[]; expectedRecovery: number; portfolioFilter: "problems" | "all"; setPortfolioFilter: (value: "problems" | "all") => void }) {
  return <aside className="panel portfolio-control-panel"><div className="panel-heading"><div><p className="eyebrow">PORTFOLIO CONTROL</p><h3>Payment performance</h3></div><span className={problemLoans.length > 0 ? "status warn" : "status good"}>{problemLoans.length} problem loans</span></div>
    <div className="portfolio-control-kpis"><Metric label="Performing" value={`${game.activeLoans.filter((loan) => loan.status === "performing").length}`} /><Metric label="1–30 days late" value={`${game.activeLoans.filter((loan) => loan.status === "late" || loan.status === "watch").length}`} /><Metric label="31–90 days" value={`${game.activeLoans.filter((loan) => loan.status === "overdue" || loan.status === "delinquent").length}`} /><Metric label="Collections/default" value={`${game.activeLoans.filter((loan) => loan.status === "collections" || loan.status === "defaulted").length}`} /><Metric label="NPL ratio" value={`${game.nplRatio.toFixed(2)}%`} /><Metric label="Expected recovery" value={money.format(expectedRecovery)} /></div>
    <div className="portfolio-filter"><button className={portfolioFilter === "problems" ? "selected" : ""} onClick={() => setPortfolioFilter("problems")}>Problem loans</button><button className={portfolioFilter === "all" ? "selected" : ""} onClick={() => setPortfolioFilter("all")}>All relationships</button></div>
  </aside>;
}

function CollectionRow({ collectionCase, loan, action }: { collectionCase: CollectionCase; loan: ActiveLoan; action: GameAction }) {
  return <article className={`collection-case stage-${collectionCase.stage}`}>
    <div className="collection-case-main"><span className="collection-days"><b>{collectionCase.daysPastDue}</b><small>days past due</small></span><div><strong>{loan.customerName}</strong><small>{loan.segment} · {statusLabel(loan.status)} · Grade {loan.riskGrade}</small><p>{collectionCase.lastAction} · Assigned to {collectionCase.assignedTo}</p></div><b>{money.format(loan.outstanding)}</b></div>
    <div className="collection-case-kpis"><Metric label="Missed amount" value={money.format(collectionCase.missedAmount)} /><Metric label="Expected recovery" value={money.format(collectionCase.expectedRecovery)} /><Metric label="Collateral coverage" value={`${loan.collateral}%`} /><Metric label="Recovery cost" value={money.format(collectionCase.agencyCost)} /></div>
    <div className="collection-actions"><button className="secondary small" onClick={() => action((state) => takeCollectionAction(state, loan.id, "reminder"))}>Send reminder</button><button className="secondary small" onClick={() => action((state) => takeCollectionAction(state, loan.id, "payment-plan"))}>Offer payment plan</button><button className="secondary small" onClick={() => action((state) => takeCollectionAction(state, loan.id, "external-collections"))}>Send to collections</button><button className="danger-button small" disabled={loan.collateral < 25} onClick={() => action((state) => takeCollectionAction(state, loan.id, "enforce-collateral"))}>Enforce collateral</button><button className="text-button" onClick={() => action((state) => takeCollectionAction(state, loan.id, "write-off"))}>Write off</button></div>
  </article>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) { return <span><small>{label}</small><strong className={tone}>{value}</strong></span>; }
function Term({ label, value, children }: { label: string; value: string; children: React.ReactNode }) { return <label><span>{label}<b>{value}</b></span>{children}</label>; }