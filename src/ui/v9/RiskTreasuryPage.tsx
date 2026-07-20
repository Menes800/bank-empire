import type { GameState } from "../../game/types";
import { getBankHealthV9 } from "../../game/v9/health";
import { runCfoStabilizationV9 } from "../../game/v9/gameplay";
import type { GameAction } from "../common";
import { money } from "../format";

export function RiskTreasuryPageV9({ game, action }: { game: GameState; action: GameAction }) {
  const health = getBankHealthV9(game);
  const cfo = game.employeeRoster.find((employee) => employee.executiveRole === "CFO");
  const highDrivers = health.runRiskDrivers.filter((driver) => driver.severity === "high").length;

  return <>
    <section className="v9-command-hero risk-v9-hero">
      <div><p className="eyebrow light">RISK, TREASURY & VALUE</p><h2>One ratio no longer hides the balance sheet</h2><p>Liquidity, funding, deposit stability, credit loss and valuation are calculated separately so the bank can look strong in one area and fragile in another.</p></div>
      <div className="v9-hero-actions"><span><small>Risk-adjusted bank value</small><strong>{money.format(health.bankValue)}</strong></span><button className="primary" disabled={!cfo || game.managementControl.treasury === "manual"} onClick={() => action(runCfoStabilizationV9)}>Let CFO stabilise liquidity</button></div>
    </section>

    <section className="v9-kpi-grid risk-kpis">
      <Metric label="Liquid asset ratio" value={`${health.liquidAssetRatio.toFixed(1)}%`} tone={health.liquidAssetRatio < 8 ? "negative" : health.liquidAssetRatio < 16 ? "warning" : "positive"} />
      <Metric label="Loan-to-deposit" value={`${health.loanToDepositRatio.toFixed(0)}%`} tone={health.loanToDepositRatio > 170 ? "negative" : health.loanToDepositRatio > 120 ? "warning" : "positive"} />
      <Metric label="Funding concentration" value={`${health.fundingConcentration.toFixed(1)}%`} tone={health.fundingConcentration > 35 ? "negative" : health.fundingConcentration > 18 ? "warning" : "positive"} />
      <Metric label="Deposit stability" value={`${health.depositStability.toFixed(0)}/100`} tone={health.depositStability < 45 ? "negative" : health.depositStability < 65 ? "warning" : "positive"} />
      <Metric label="30-day forecast" value={money.format(health.liquidityForecast30)} tone={health.liquidityForecast30 < 0 ? "negative" : "positive"} />
      <Metric label="90-day forecast" value={money.format(health.liquidityForecast90)} tone={health.liquidityForecast90 < 0 ? "negative" : "positive"} />
    </section>

    <section className="v9-risk-layout">
      <article className="panel v9-valuation-panel">
        <div className="panel-heading"><div><p className="eyebrow">BANK VALUE</p><h3>Risk-adjusted valuation bridge</h3><p>Value includes credit quality, earnings, franchise, technology and branches instead of treating every loan as cash-equivalent.</p></div></div>
        <div className="v9-valuation-bridge"><ValueRow label="Accounting equity" value={health.equity} /><ValueRow label="Earnings value" value={health.earningsValue} /><ValueRow label="Customer franchise" value={health.franchiseValue} /><ValueRow label="Technology capability" value={health.technologyValue} /><ValueRow label="Branch network" value={health.branchValue} /><ValueRow label="Expected credit loss" value={-health.expectedCreditLoss} negative /><ValueRow label="Risk discount" value={-health.riskDiscount} negative /><div className="total"><span>Risk-adjusted bank value</span><strong>{money.format(health.bankValue)}</strong></div></div>
      </article>

      <article className="panel v9-run-risk-panel">
        <div className="panel-heading"><div><p className="eyebrow">BANK-RUN RISK</p><h3>{highDrivers > 0 ? `${highDrivers} structural warning${highDrivers === 1 ? "" : "s"}` : "No critical driver"}</h3><p>The score now explains the causes instead of displaying an unexplained warning.</p></div><span className={highDrivers > 0 ? "status warn" : "status good"}>Run risk {game.bankRunRisk.toFixed(0)}</span></div>
        <div className="v9-risk-driver-list">{health.runRiskDrivers.map((driver) => <article key={driver.label} className={driver.severity}><span></span><div><strong>{driver.label}</strong><small>{driver.value}</small></div><b>{driver.severity}</b></article>)}</div>
        <div className="v9-recommended-action"><small>RECOMMENDED NEXT ACTION</small><strong>{health.recommendedAction}</strong><p>{cfo ? `${cfo.name} can execute a stabilisation package when treasury control is Ask major or Automatic.` : "Appoint a CFO before delegating treasury stabilisation."}</p></div>
      </article>
    </section>

    <section className="panel v9-balance-sheet-panel">
      <div className="panel-heading"><div><p className="eyebrow">FUNDING STRUCTURE</p><h3>What the bank is actually funded by</h3></div></div>
      <div className="v9-balance-grid"><Metric label="Liquid cash" value={money.format(game.cash)} /><Metric label="Customer deposits" value={money.format(game.deposits)} /><Metric label="Gross loans" value={money.format(game.loans)} /><Metric label="Wholesale funding" value={money.format(game.wholesaleFunding)} /><Metric label="Loan-loss reserve" value={money.format(game.loanLossReserve)} /><Metric label="NPL ratio" value={`${game.nplRatio.toFixed(2)}%`} tone={game.nplRatio > 6 ? "negative" : game.nplRatio > 3 ? "warning" : "positive"} /></div>
    </section>
  </>;
}

function ValueRow({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) { return <div><span>{label}</span><strong className={negative ? "negative" : value >= 0 ? "positive" : "negative"}>{value >= 0 ? "+" : "-"}{money.format(Math.abs(value))}</strong></div>; }
function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) { return <article className={`v9-metric ${tone ?? ""}`}><small>{label}</small><strong>{value}</strong></article>; }
