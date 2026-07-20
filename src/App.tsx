import { useEffect, useMemo, useState } from "react";
import { advanceDaysV7, chooseDecisionV5, createCampaign } from "./game/engine";
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
import { InboxPage } from "./ui/v7/InboxPage";
import { APP_RELEASE_NAME, APP_VERSION } from "./version";

const pageDefinitions = {
  overview: { label: "Overview", icon: "OV" },
  inbox: { label: "CEO Inbox", icon: "IN" },
  campaign: { label: "Strategy", icon: "ST" },
  network: { label: "Network", icon: "NW" },
  banking: { label: "Products", icon: "PR" },
  clients: { label: "Customers & Credit", icon: "CR" },
  leadership: { label: "Leadership", icon: "LD" },
  risk: { label: "Risk & Treasury", icon: "RT" },
  reports: { label: "Reports", icon: "RP" },
  market: { label: "Competition", icon: "MK" },
  holdings: { label: "Holdings", icon: "HD" },
  career: { label: "Founder", icon: "FD" },
} as const;

type PageKey = keyof typeof pageDefinitions;
type NavGroup = { label: string; pages: PageKey[] };
const navigation: NavGroup[] = [
  { label: "BANK", pages: ["overview", "inbox", "campaign", "network", "banking", "clients"] },
  { label: "MANAGEMENT", pages: ["leadership", "risk", "reports"] },
  { label: "GROUP", pages: ["market", "holdings", "career"] },
];
const careerTitles = ["Local Founder", "Banking Executive", "Regional Director", "Group CEO", "Industry Leader"];
const stageRank = { startup: 0, regional: 1, national: 2, group: 3, empire: 4 } as const;

function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "BE";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function storedBankMark(bankName: string) {
  try {
    const saved = JSON.parse(localStorage.getItem("bank-empire-bank-mark") ?? "null") as { bankName?: string; mark?: string } | null;
    if (saved?.bankName === bankName && saved.mark) return saved.mark.slice(0, 2).toUpperCase();
  } catch {
    // Legacy saves use generated initials.
  }
  return initials(bankName);
}

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

  const availablePages = useMemo(() => new Set<PageKey>(Object.keys(pageDefinitions).filter((key) => key !== "holdings" || stageRank[game.campaignStage] >= stageRank.regional) as PageKey[]), [game.campaignStage]);

  if (!game.setupComplete) return <SetupScreen onStart={(draft: SetupDraft) => {
    localStorage.setItem("bank-empire-bank-mark", JSON.stringify({ bankName: draft.bankName, mark: draft.bankLogo }));
    setGame(createCampaign(draft));
  }} />;

  const action = (fn: (state: GameState) => GameState) => setGame((current) => fn(current));
  const advance = (days: number) => action((state) => advanceDaysV7(state, days));
  const pageTitle = pageDefinitions[page].label;
  const restart = () => { localStorage.removeItem("bank-empire-bank-mark"); setGame(clearGame()); setPage("overview"); };
  const retry = () => { const checkpoint = restoreCheckpoint(); if (checkpoint) { setGame(checkpoint); setPage("risk"); } };
  const navigate = (target: string) => { if (target in pageDefinitions && availablePages.has(target as PageKey)) setPage(target as PageKey); };
  const crisisOpen = Boolean(game.pendingDecision?.id.startsWith("v5-"));
  const nearestProject = game.projects.filter((project) => project.status !== "completed").sort((a, b) => a.remainingDays - b.remainingDays)[0];
  const bankMark = storedBankMark(game.bankName);
  const openInbox = game.ceoInbox.filter((task) => task.status === "open");
  const criticalInbox = openInbox.filter((task) => task.urgency === "critical").length;
  const creditBadge = game.loanApplications.length + game.collectionCases.filter((item) => !item.closed).length;

  return <div className="app app-v7" data-brand={game.brandTheme}>
    <aside className="sidebar sidebar-v7">
      <div className="logo logo-v7"><span>{bankMark}</span><div><strong>{game.bankName}</strong><small>{game.campaignStage} banking group</small></div></div>
      <nav className="grouped-navigation">{navigation.map((group) => {
        const groupPages = group.pages.filter((key) => availablePages.has(key));
        if (groupPages.length === 0) return null;
        return <section className="nav-group" key={group.label}><p>{group.label}</p>{groupPages.map((key) => {
          const definition = pageDefinitions[key];
          const badge = key === "inbox" ? openInbox.length : key === "clients" ? creditBadge : 0;
          return <button key={key} className={page === key ? "nav-item active" : "nav-item"} onClick={() => setPage(key)}><span className="nav-code">{definition.icon}</span><strong>{definition.label}</strong>{badge > 0 && <b className={`nav-badge ${key === "inbox" && criticalInbox > 0 ? "critical" : ""}`}>{badge}</b>}{key === "network" && game.projects.some((project) => project.status === "delayed") && <b className="nav-alert">!</b>}</button>;
        })}</section>;
      })}</nav>
      <div className="sidebar-release"><span>v{APP_VERSION}</span><small>{APP_RELEASE_NAME}</small></div>
      <div className="sidebar-footer"><div className="avatar">{game.founderName.slice(0, 1).toUpperCase()}</div><div><strong>{game.founderName}</strong><small>{careerTitles[game.careerLevel]}</small></div></div>
    </aside>

    <main className="main-content">
      <div className="sticky-command-header">
        <div className="economy-ticker"><span className={`cycle-chip ${game.economicCycle}`}>{game.economicCycle}</span><span title="Central-bank policy rate">Policy rate <b>{game.baseRate.toFixed(2)}%</b></span><span title="Annual inflation in the simulated economy">Inflation <b>{game.inflation.toFixed(1)}%</b></span><span title="Current economic growth">GDP <b>{game.gdpGrowth.toFixed(1)}%</b></span><span title="Higher confidence usually supports demand">Confidence <b>{game.consumerConfidence.toFixed(0)}</b></span><span title="Risk of unusually large customer withdrawals" className={game.bankRunRisk > 35 ? "ticker-warning" : ""}>Run risk <b>{game.bankRunRisk.toFixed(0)}</b></span></div>
        <header className="main-header">
          <div><p className="eyebrow">{game.campaignStage.toUpperCase()} · YEAR {game.year} · Q{game.quarter} · WEEK {game.week} · DAY {game.day}</p><h1>{pageTitle}</h1></div>
          <div className="header-actions"><button className="icon-button help-trigger" title="Explain the game and banking terms" onClick={() => setHelpOpen(true)}>?</button><button className="icon-button" title="Switch light or dark theme" onClick={() => setDark((value) => !value)}>{dark ? "☀" : "◐"}</button>{openInbox.length > 0 && <button className={`inbox-header-chip ${criticalInbox > 0 ? "critical" : ""}`} onClick={() => setPage("inbox")}><small>CEO INBOX</small><strong>{openInbox.length} open</strong><span>{criticalInbox > 0 ? `${criticalInbox} critical` : "Review work →"}</span></button>}{nearestProject && <button className="nearest-project-chip" onClick={() => setPage("network")}><small>NEXT PROJECT</small><strong>{nearestProject.remainingDays} days</strong><span>{nearestProject.name}</span></button>}<button className="cash-pill" title="Open the full cash movement explanation" onClick={() => setPage("overview")}><small>LIQUID CASH</small><strong>{money.format(game.cash)}</strong><span>See movement →</span></button><div className="speed-controls"><button disabled={Boolean(game.pendingDecision || game.gameOverReason)} onClick={() => advance(1)}>+1 day</button><button disabled={Boolean(game.pendingDecision || game.gameOverReason || crisisOpen)} onClick={() => advance(7)}>+1 week</button><button className="primary" disabled={Boolean(game.pendingDecision || game.gameOverReason || crisisOpen)} onClick={() => advance(30)}>+30 days →</button></div></div>
        </header>
      </div>

      <RiskForecastBar game={game} onOpenRisk={() => setPage("risk")} />
      <AdvisorPanel game={game} action={action} onNavigate={navigate} />

      {page === "overview" && <OverviewPage game={game} onOpenBoard={() => setPage("reports")} />}
      {page === "inbox" && <InboxPage game={game} action={action} onNavigate={navigate} />}
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

      <footer className="game-footer"><span>Autosaved locally · Bank Empire v{APP_VERSION} · {APP_RELEASE_NAME}</span><button onClick={() => { if (window.confirm("Start a new campaign? Your current save will be removed.")) restart(); }}>New campaign</button></footer>
    </main>

    <HelpDrawer open={helpOpen} game={game} onClose={() => setHelpOpen(false)} />
    <DecisionModal game={game} onChoose={(id) => action((state) => chooseDecisionV5(state, id))} />
    <GameOverModal game={game} onRestart={restart} onRetry={retry} canRetry={hasCheckpoint()} />
  </div>;
}
