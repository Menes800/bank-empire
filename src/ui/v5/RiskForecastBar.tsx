import { getLiquidityForecast } from "../../game/engine";
import type { GameState } from "../../game/store";
import { money } from "../format";

export function RiskForecastBar({ game, onOpenRisk }: { game: GameState; onOpenRisk: () => void }) {
  const forecast = getLiquidityForecast(game);
  if (forecast.level === "stable") return null;
  const runway = forecast.runwayDays >= 999 ? "Stable" : `${forecast.runwayDays} days`;
  return <section className={`risk-forecast-bar ${forecast.level}`}>
    <div className="risk-forecast-icon">!</div>
    <div className="risk-forecast-copy">
      <small>{forecast.level === "critical" ? "CRITICAL LIQUIDITY WARNING" : forecast.level === "warning" ? "EARLY LIQUIDITY WARNING" : "TREASURY WATCH"}</small>
      <strong>{forecast.level === "critical" ? "The bank is approaching a recovery crisis" : "Cash reserves are moving toward an unsafe level"}</strong>
      <p>{forecast.cause}</p>
    </div>
    <div className="risk-forecast-metrics"><span><small>Estimated runway</small><b>{runway}</b></span><span><small>Liquid cash</small><b>{money.format(game.cash)}</b></span><span><small>Liquidity</small><b>{game.liquidityRatio.toFixed(1)}%</b></span></div>
    <button onClick={onOpenRisk}>Review rescue options</button>
  </section>;
}
