import { useMemo, useState } from "react";
import { applyProductPreset, approveLoanRefined, counterLoanRefined, declineLoanRefined, getCreditRecommendation, restructureLoan, updateProductTerms } from "../../game/engine";
import type { GameState, ProductKey, ProductPreset } from "../../game/store";
import type { GameAction } from "../common";
import { money } from "../format";

const productNames: Record<ProductKey, string> = {
  everyday: "Everyday account", savings: "Savings", mortgage: "Mortgage", sme: "SME banking", cards: "Credit cards", insurance: "Insurance", wealth: "Wealth management",
};
const presets: ProductPreset[] = ["competitive", "balanced", "premium", "conservative"];
const presetCopy: Record<ProductPreset, string> = {
  competitive: "Lower price and easier access. Faster growth, lower margin and more risk.",
  balanced: "Normal pricing, service and approval rules for steady performance.",
  premium: "Higher service and fees for stronger relationships and better-value customers.",
  conservative: "Stricter approvals and stronger pricing to protect capital and liquidity.",
};

export function ClientsPage({ game, action }: { game: GameState; action: GameAction }) {
  const [advanced, setAdvanced] = useState<Record<string, boolean>>({});
  const [showPortfolio, setShowPortfolio] = useState(false);
  const atRiskSegments = useMemo(() => [...game.customerSegments].sort((a, b) => b.churnRisk - a.churnRisk).slice(0, 4), [game.customerSegments]);
  const averageSatisfaction = game.customerSegments.reduce((sum, segment) => sum + segment.satisfaction, 0) / Math.max(1, game.customerSegments.length);
  const averageChurn = game.customerSegments.reduce((sum, segment) => sum + segment.churnRisk * segment.customers, 0) / Math.max(1, game.customerSegments.reduce((sum, segment) => sum + segment.customers, 0));
  const watchLoans = game.activeLoans.filter((loan) => loan.status !== "performing");
  const portfolio = showPortfolio ? game.activeLoans : watchLoans;

  return <>
    <section className="customer-command-bar">
      <div><p className="eyebrow">CUSTOMER COMMAND CENTRE</p><h2>Make the simple decision first</h2><p>Choose a product strategy, follow the credit recommendation and open advanced details only when you need them.</p></div>
      <div className="customer-command-kpis"><span><small>Customers</small><strong>{game.customers.toLocaleString("en-GB")}</strong></span><span><small>Satisfaction</small><strong>{averageSatisfaction.toFixed(0)}</strong></span><span><small>Average churn</small><strong>{averageChurn.toFixed(0)}%</strong></span><span><small>Pending credit</small><strong>{game.loanApplications.length}</strong></span></div>
    </section>

    <section className="panel segment-summary-panel">
      <div className="panel-heading"><div><p className="eyebrow">SEGMENT WATCH</p><h3>Customers most likely to leave</h3></div><span className={averageChurn > 25 ? "status warn" : "status good"}>{averageChurn > 25 ? "Needs attention" : "Stable"}</span></div>
      <div className="segment-watch-grid">{atRiskSegments.map((segment) => <article key={segment.key}><div><span>{segment.name.slice(0, 1)}</span><div><strong>{segment.name}</strong><small>{segment.customers.toLocaleString("en-GB")} customers · prefers {segment.preferredChannel}</small></div></div><b className={segment.churnRisk > 30 ? "negative" : ""}>{segment.churnRisk.toFixed(0)}% churn</b><div className="stage-track"><i style={{ width: `${segment.churnRisk}%` }} /></div><p>{segment.satisfaction < 50 ? "Service quality is the main problem." : segment.loyalty < 45 ? "Relationships are weak and price-sensitive." : "Monitor pricing and channel fit."}</p></article>)}</div>
    </section>

    <section className="panel product-lab simplified-product-lab">
      <div className="panel-heading"><div><p className="eyebrow">PRODUCT STRATEGY</p><h3>Choose a preset, then leave the details to management</h3><p>Advanced sliders are hidden by default. Presets change pricing, service and approval rules together.</p></div><span className="status good">{game.products.length} live products</span></div>
      <div className="simple-product-grid">{game.products.map((key) => { const terms = game.productTerms[key]; const isAdvanced = Boolean(advanced[key]); return <article className="simple-product-card" key={key}>
        <div className="simple-product-heading"><div><strong>{productNames[key]}</strong><small>{key === "savings" ? `${terms.customerRate.toFixed(2)}% customer rate` : key === "mortgage" || key === "sme" || key === "cards" ? `${terms.customerRate.toFixed(2)}% lending rate` : `${money.format(terms.monthlyFee)} monthly fee`}</small></div><span>Live</span></div>
        <div className="preset-grid">{presets.map((preset) => <button key={preset} title={presetCopy[preset]} onClick={() => action((state) => applyProductPreset(state, key, preset))}><strong>{preset}</strong><small>{presetCopy[preset]}</small></button>)}</div>
        <button className="advanced-toggle" onClick={() => setAdvanced((current) => ({ ...current, [key]: !current[key] }))}>{isAdvanced ? "Hide advanced settings" : "Advanced settings"} <span>{isAdvanced ? "−" : "+"}</span></button>
        {isAdvanced && <div className="advanced-terms"><Term label="Customer rate" value={`${terms.customerRate.toFixed(2)}%`}><input type="range" min="0" max={key === "cards" ? 28 : 12} step="0.05" value={terms.customerRate} onChange={(event) => action((state) => updateProductTerms(state, key, { customerRate: Number(event.target.value) }))} /></Term><Term label="Monthly fee" value={money.format(terms.monthlyFee)}><input type="range" min="0" max="1500" step="10" value={terms.monthlyFee} onChange={(event) => action((state) => updateProductTerms(state, key, { monthlyFee: Number(event.target.value) }))} /></Term><Term label="Approval threshold" value={`${terms.approvalThreshold}`}><input type="range" min="25" max="95" step="1" value={terms.approvalThreshold} onChange={(event) => action((state) => updateProductTerms(state, key, { approvalThreshold: Number(event.target.value) }))} /></Term><Term label="Service level" value={`${terms.serviceLevel}`}><input type="range" min="20" max="100" step="1" value={terms.serviceLevel} onChange={(event) => action((state) => updateProductTerms(state, key, { serviceLevel: Number(event.target.value) }))} /></Term></div>}
      </article>; })}</div>
      <div className="locked-products-line"><strong>Locked products</strong>{(Object.keys(game.productTerms) as ProductKey[]).filter((key) => !game.products.includes(key)).map((key) => <span key={key}>{productNames[key]}</span>)}</div>
    </section>

    <section className="content-grid two-column credit-book-layout simplified-credit-layout">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">CREDIT DESK</p><h3>{game.loanApplications.length} exceptional cases need a decision</h3><p>{game.employeeRoster.some((employee) => employee.executiveRole === "CRO") && game.automation.lending !== "manual" ? `Your CRO automatically handles routine cases under the ${game.automation.lending} mandate.` : "Appoint a CRO and delegate credit to remove routine cases from your desk."}</p></div></div>
        {game.loanApplications.length === 0 ? <div className="empty-state">No exceptional cases are waiting. Delegated routine lending continues in the background.</div> : <div className="credit-case-list">{game.loanApplications.map((application) => { const recommendation = getCreditRecommendation(game, application); return <div className="credit-case recommendation-case" key={application.id}>
          <div className="credit-recommendation"><span className={`recommendation-risk ${recommendation.risk.toLowerCase()}`}>{recommendation.risk}</span><div><strong>{recommendation.label}</strong><p>{recommendation.reason}</p></div></div>
          <div className="credit-case-head"><div><strong>{application.customerName}</strong><small>{application.segment} · risk grade {application.riskGrade}</small></div><b>{money.format(application.amount)}</b></div>
          <div className="decision-impact-grid"><span><small>Expected profit</small><b>{money.format(recommendation.expectedProfit)}</b></span><span><small>Immediate cash impact</small><b className="negative">{money.format(recommendation.liquidityImpact)}</b></span><span><small>Default probability</small><b>{application.defaultChance.toFixed(1)}%</b></span><span><small>Collateral</small><b>{application.collateral}%</b></span></div>
          <div className="credit-actions"><button className={recommendation.action === "approve" ? "primary small recommended" : "secondary small"} disabled={game.cash < application.amount} onClick={() => action((state) => approveLoanRefined(state, application.id))}>Approve</button><button className={recommendation.action === "counter" ? "primary small recommended" : "secondary small"} disabled={game.cash < application.amount * .72} onClick={() => action((state) => counterLoanRefined(state, application.id))}>Counter offer</button><button className={recommendation.action === "decline" ? "danger-button small recommended" : "danger-button small"} onClick={() => action((state) => declineLoanRefined(state, application.id))}>Decline</button></div>
        </div>; })}</div>}
      </article>

      <article className="panel portfolio-summary-panel"><div className="panel-heading"><div><p className="eyebrow">LOAN PORTFOLIO</p><h3>{game.activeLoans.length} tracked large relationships</h3></div><span className={watchLoans.length > 0 ? "status warn" : "status good"}>{watchLoans.length} watch cases</span></div>
        <div className="portfolio-kpis"><span><small>Outstanding</small><strong>{money.format(game.activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0))}</strong></span><span><small>Healthy</small><strong>{game.activeLoans.filter((loan) => loan.status === "performing").length}</strong></span><span><small>Watch or worse</small><strong>{watchLoans.length}</strong></span></div>
        <button className="secondary wide" onClick={() => setShowPortfolio((value) => !value)}>{showPortfolio ? "Show only problem loans" : "Open full portfolio"}</button>
        {portfolio.length === 0 ? <div className="empty-state">No problem loans require attention.</div> : <div className="loan-book compact-loan-book">{portfolio.map((loan) => <div className={`loan-row status-${loan.status}`} key={loan.id}><div><strong>{loan.customerName}</strong><small>{loan.segment} · {loan.status}</small></div><span><small>Outstanding</small><b>{money.format(loan.outstanding)}</b></span><button className="secondary small" disabled={loan.status !== "delinquent" && loan.status !== "watch"} onClick={() => action((state) => restructureLoan(state, loan.id))}>Restructure</button></div>)}</div>}
      </article>
    </section>
  </>;
}

function Term({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return <label><span>{label}<b>{value}</b></span>{children}</label>;
}
