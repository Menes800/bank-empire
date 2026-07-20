import { useEffect, useMemo, useState } from "react";
import { advanceDaysV6, chooseDecisionV5, createCampaign } from "./game/engine";
import { clearGame, hasCheckpoint, loadGame, restoreCheckpoint, saveGame, type GameState } from "./game/store";
import { DecisionModal, GameOverModal } from "./ui/Modals";
import { SetupScreen, type SetupDraft } from "./ui/SetupScreen";
import { money } from "./ui/format";
import { BankingPage } from "./ui/pages/BankingPage";
import { CareerPage } from "./ui/pages/CareerPage";
import { HoldingsPage } from "./ui/pages/HoldingsPage";
import { MarketPage } from "./ui/pages/MarketPage";
import { OverviewPage } from "./ui/pages/OverviewPage";
import { RiskPage } from "./ui/pages/RiskPage";
import { AdvisorPanel } from "./ui/v4/AdvisorPanel";
import { CampaignPage } from "./ui/v4/CampaignPage";
import { ClientsPage } from "./ui/v4/ClientsPage";
import { LeadershipPage } from "./ui/v4/LeadershipPage";
import { NetworkPage } from "./ui/v4/NetworkPage";
import { ReportsPage } from "./ui/v4/ReportsPage";
import { HelpDrawer } from "./ui/v41/HelpDrawer";
import { RiskForecastBar } from "./ui/v5/RiskForecastBar";

const pages = [
  ["overview", "Overview", "◈"],
  ["campaign", "Campaign", "◎"],
  ["network", "Network & Projects", "⌂"],
  ["leadership", "Leadership", "♙"],
  ["banking", "Products & Pricing", "▤"],
  ["clients", "Customers & Credit", "✓"],
  ["reports", "Board & Reports", "▦"],
  ["risk", "Risk & Treasury", "◇"],
  ["market", "Market", "↗"],
  ["career", "Founder", "♜"],
  ["holdings", "Holdings", "◆"],
] as const;

type PageKey = (typeof pages)[number][0];
const careerTitles = ["Local Founder", "Banking Executive", "Regional Director", "Group CEO", "Industry Leader"];
const stageRank = { startup: 0, regional: 1, national: 2, group: 3, empire: 4 } as const;

export default function App() {
  const [game, setGame] = useState<GameState>(() => loadGame());
  const [page, setPage] = useState<PageKey>("overview");
  const [dark, setDark] = useState(() => localStorage.getItem("bank-empire-theme") === "dark");
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => saveGame(game), [game]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("bank-empire-theme", dark ? "dark" : "light");
  }, [dark]);

  const availablePages = useMemo(() => pages.filter(([key]) => key !== "holdings" || stageRank[game.campaignStage] >= stageRank.regional), [game.campaignStage]);

  if (!game.setupComplete) return <SetupScreen onStart={(draft: SetupDraft) => setGame(createCampaign(draft))} />;

  const action = (fn: (state: GameState) => GameState) => setGame((current) => fn(current));
  const advance = (days: number) => action((state) => advanceDaysV6(state, days));
  const pageTitle = pages.find(([key]) => key === page)?.[1] ?? "Overview";
  const restart = () => { setGame(clearGame()); setPage("overview"); };
  const retry = () => { const checkpoint = restoreCheckpoint(); if (checkpoint) { setGame(checkpoint); setPage("risk"); } };
  const navigate = (target: string) => { if (pages.some(([key]) => key === target)) setPage(target as PageKey); };
  const crisisOpen = Boolean(game.pendingDecision?.id.startsWith("v5-"));
  const nearestProject = game.projects.filter((project) => project.status !== "completed").sort((a, b) => a.remainingDays - b.remainingDays)[0];

  return <div className="app" data-brand={game.brandTheme}>
    <aside className="sidebar">
      <div className="logo"><span>{game.bankName.slice(0, 1)}</span><div><strong>{game.bankName}</strong><small>{game.campaignStage} banking group</small></div></div>
      <nav><p>MANAGEMENT</p>{availablePages.map(([key, label, icon]) => <button key={key} className={page === key ? "nav-item active" : "nav-item"} onClick={() => setPage(key)}><span>{icon}</span>{label}{key === "clients" && game.loanApplications.length > 0 ? <b className="nav-badge">{game.loanApplications.length}</b> : null}{key === "network" && game.projects.some((project) => project.status === "delayed") ? <b className="nav-alert">!</b> : null}</button>)}</nav>
      <div className="sidebar-footer"><div className="avatar">{game.founderName.slice(0, 1).toUpperCase()}</div><div><strong>{game.founderName}</strong><small>{careerTitles[game.careerLevel]}</small></div></div>
    </aside>

    <main className="main-content">
      <div className="sticky-command-header">
        <div className="economy-ticker"><span className={`cycle-chip ${game.economicCycle}`}>{game.economicCycle}</span><span title="Central-bank policy rate">Policy rate <b>{game.baseRate.toFixed(2)}%</b></span><span title="Annual inflation in the simulated economy">Inflation <b>{game.inflation.toFixed(1)}%</b></span><span title="Current economic growth">GDP <b>{game.gdpGrowth.toFixed(1)}%</b></span><span title="Higher confidence usually supports demand">Confidence <b>{game.consumerConfidence.toFixed(0)}</b></span><span title="Risk of unusually large customer withdrawals" className={game.bankRunRisk > 35 ? "ticker-warning" : ""}>Run risk <b>{game.bankRunRisk.toFixed(0)}</b></span></div>
        <header className="main-header">
          <div><p className="eyebrow">{game.campaignStage.toUpperCase()} · YEAR {game.year} · Q{game.quarter} · WEEK {game.week} · DAY {game.day}</p><h1>{pageTitle}</h1></div>
          <div className="header-actions"><button className="icon-button help-trigger" title="Explain the game and banking terms" onClick={() => setHelpOpen(true)}>?</button><button className="icon-button" title="Switch light or dark theme" onClick={() => setDark((value) => !value)}>{dark ? "☀" : "◐"}</button>{nearestProject && <button className="nearest-project-chip" onClick={() => setPage("network")}><small>NEXT PROJECT</small><strong>{nearestProject.remainingDays} days</strong><span>{nearestProject.name}</span></button>}<button className="cash-pill" title="Open the full cash movement explanation" onClick={() => setPage("overview")}><small>LIQUID CASH</small><strong>{money.format(game.cash)}</strong><span>See movement →</span></button><div className="speed-controls"><button disabled={Boolean(game.pendingDecision || game.gameOverReason)} onClick={() => advance(1)}>+1 day</button><button disabled={Boolean(game.pendingDecision || game.gameOverReason || crisisOpen)} onClick={() => advance(7)}>+1 week</button><button className="primary" disabled={Boolean(game.pendingDecision || game.gameOverReason || crisisOpen)} onClick={() => advance(30)}>+30 days →</button></div></div>
        </header>
      </div>

      <RiskForecastBar game={game} onOpenRisk={() => setPage("risk")} />
      <AdvisorPanel game={game} action={action} onNavigate={navigate} />

      {page === "overview" && <OverviewPage game={game} onOpenBoard={() => setPage("reports")} />}
      {page === "campaign" && <CampaignPage game={game} action={action} onNavigate={navigate} />}
      {page === "network" && <NetworkPage game={game} action={action} />}
      {page === "leadership" && <LeadershipPage game={game} action={action} />}
      {page === "banking" && <BankingPage game={game} action={action} />}
      {page === "clients" && <ClientsPage game={game} action={action} />}
      {page === "reports" && <ReportsPage game={game} action={action} />}
      {page === "risk" && <RiskPage game={game} action={action} />}
      {page === "market" && <MarketPage game={game} />}
      {page === "career" && <CareerPage game={game} action={action} />}
      {page === "holdings" && <HoldingsPage game={game} action={action} />}

      <footer className="game-footer"><span>Autosaved locally · Bank Empire v0.6.1</span><button onClick={() => { if (window.confirm("Start a new campaign? Your current save will be removed.")) restart(); }}>New campaign</button></footer>
    </main>

    <HelpDrawer open={helpOpen} game={game} onClose={() => setHelpOpen(false)} />
    <DecisionModal game={game} onChoose={(id) => action((state) => chooseDecisionV5(state, id))} />
    <GameOverModal game={game} onRestart={restart} onRetry={retry} canRetry={hasCheckpoint()} />
  </div>;
}
