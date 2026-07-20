import { useEffect, useState } from "react";
import { advanceDays, chooseDecision, createCampaign } from "./game/engine";
import { clearGame, loadGame, saveGame, type GameState } from "./game/store";
import { DecisionModal, GameOverModal } from "./ui/Modals";
import { SetupScreen, type SetupDraft } from "./ui/SetupScreen";
import { money } from "./ui/format";
import { BankingPage } from "./ui/pages/BankingPage";
import { BoardPage } from "./ui/pages/BoardPage";
import { CareerPage } from "./ui/pages/CareerPage";
import { CreditPage } from "./ui/pages/CreditPage";
import { CustomersPage } from "./ui/pages/CustomersPage";
import { HoldingsPage } from "./ui/pages/HoldingsPage";
import { MarketPage } from "./ui/pages/MarketPage";
import { OperationsPage } from "./ui/pages/OperationsPage";
import { OverviewPage } from "./ui/pages/OverviewPage";
import { RiskPage } from "./ui/pages/RiskPage";

const pages = [
  ["overview", "Overview", "◈"],
  ["board", "Boardroom", "▦"],
  ["banking", "Products & Pricing", "▤"],
  ["credit", "Credit Desk", "✓"],
  ["customers", "Customers", "◎"],
  ["operations", "People & Branches", "⌂"],
  ["risk", "Risk & Treasury", "◇"],
  ["market", "Market", "↗"],
  ["career", "Founder & Career", "♙"],
  ["holdings", "Holdings", "◆"],
] as const;

type PageKey = (typeof pages)[number][0];
const careerTitles = ["Local Founder", "Banking Executive", "Regional Director", "Group CEO", "Industry Leader"];

export default function App() {
  const [game, setGame] = useState<GameState>(() => loadGame());
  const [page, setPage] = useState<PageKey>("overview");
  const [dark, setDark] = useState(() => localStorage.getItem("bank-empire-theme") === "dark");

  useEffect(() => saveGame(game), [game]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("bank-empire-theme", dark ? "dark" : "light");
  }, [dark]);

  if (!game.setupComplete) {
    return <SetupScreen onStart={(draft: SetupDraft) => setGame(createCampaign(draft))} />;
  }

  const action = (fn: (state: GameState) => GameState) => setGame((current) => fn(current));
  const advance = (days: number) => action((state) => advanceDays(state, days));
  const pageTitle = pages.find(([key]) => key === page)?.[1] ?? "Overview";
  const restart = () => { setGame(clearGame()); setPage("overview"); };

  return <div className="app" data-brand={game.brandTheme}>
    <aside className="sidebar">
      <div className="logo"><span>{game.bankName.slice(0, 1)}</span><div><strong>{game.bankName}</strong><small>Banking Group</small></div></div>
      <nav><p>MANAGEMENT</p>{pages.map(([key, label, icon]) => <button key={key} className={page === key ? "nav-item active" : "nav-item"} onClick={() => setPage(key)}><span>{icon}</span>{label}{key === "credit" && game.loanApplications.length > 0 ? <b className="nav-badge">{game.loanApplications.length}</b> : null}</button>)}</nav>
      <div className="sidebar-footer"><div className="avatar">{game.founderName.slice(0, 1).toUpperCase()}</div><div><strong>{game.founderName}</strong><small>{careerTitles[game.careerLevel]}</small></div></div>
    </aside>

    <main className="main-content">
      <div className="economy-ticker"><span className={`cycle-chip ${game.economicCycle}`}>{game.economicCycle}</span><span>Policy rate <b>{game.baseRate.toFixed(2)}%</b></span><span>Inflation <b>{game.inflation.toFixed(1)}%</b></span><span>GDP <b>{game.gdpGrowth.toFixed(1)}%</b></span><span>Confidence <b>{game.consumerConfidence.toFixed(0)}</b></span><span className={game.bankRunRisk > 35 ? "ticker-warning" : ""}>Run risk <b>{game.bankRunRisk.toFixed(0)}</b></span></div>
      <header className="main-header">
        <div><p className="eyebrow">YEAR {game.year} · Q{game.quarter} · WEEK {game.week} · DAY {game.day}</p><h1>{pageTitle}</h1></div>
        <div className="header-actions"><button className="icon-button" onClick={() => setDark((value) => !value)}>{dark ? "☀" : "◐"}</button><div className="cash-pill"><small>LIQUID CASH</small><strong>{money.format(game.cash)}</strong></div><div className="speed-controls"><button disabled={Boolean(game.pendingDecision || game.gameOverReason)} onClick={() => advance(1)}>+1 day</button><button disabled={Boolean(game.pendingDecision || game.gameOverReason)} onClick={() => advance(7)}>+1 week</button><button className="primary" disabled={Boolean(game.pendingDecision || game.gameOverReason)} onClick={() => advance(30)}>+30 days →</button></div></div>
      </header>

      {page === "overview" && <OverviewPage game={game} onOpenBoard={() => setPage("board")} />}
      {page === "board" && <BoardPage game={game} action={action} />}
      {page === "banking" && <BankingPage game={game} action={action} />}
      {page === "credit" && <CreditPage game={game} action={action} />}
      {page === "customers" && <CustomersPage game={game} action={action} />}
      {page === "operations" && <OperationsPage game={game} action={action} />}
      {page === "risk" && <RiskPage game={game} action={action} />}
      {page === "market" && <MarketPage game={game} />}
      {page === "career" && <CareerPage game={game} action={action} />}
      {page === "holdings" && <HoldingsPage game={game} action={action} />}

      <footer className="game-footer"><span>Autosaved locally · Bank Empire v0.3</span><button onClick={() => { if (window.confirm("Start a new campaign? Your current save will be removed.")) restart(); }}>New campaign</button></footer>
    </main>

    <DecisionModal game={game} onChoose={(id) => action((state) => chooseDecision(state, id))} />
    <GameOverModal reason={game.gameOverReason} onRestart={restart} />
  </div>;
}
