import { useEffect, useMemo, useState } from "react";
import { advanceDaysV8, chooseDecisionV5, createCampaign } from "./game/engine";
import { clearGame, hasCheckpoint, loadGame, restoreCheckpoint, saveGame, type GameState } from "./game/store";
import { DevPanel } from "./dev/DevPanel";
import { DecisionModal, GameOverModal } from "./ui/Modals";
import { SetupScreen, type SetupDraft } from "./ui/SetupScreen";
import { money } from "./ui/format";
import { BankingPage } from "./ui/pages/BankingPage";
import { CareerPage } from "./ui/pages/CareerPage";
import { HoldingsPage } from "./ui/pages/HoldingsPage";
import { MarketPage } from "./ui/pages/MarketPage";
import { OverviewPage } from "./ui/pages/OverviewPage";
import { RiskPage } from "./ui/pages/RiskPage";
import { CampaignPage } from "./ui/v4/CampaignPage";
import { ClientsPage } from "./ui/v4/ClientsPage";
import { LeadershipPage } from "./ui/v4/LeadershipPage";
import { NetworkPage } from "./ui/v4/NetworkPage";
import { ReportsPage } from "./ui/v4/ReportsPage";
import { HelpDrawer } from "./ui/v41/HelpDrawer";
import { RiskForecastBar } from "./ui/v5/RiskForecastBar";
import { InboxPage } from "./ui/v7/InboxPage";
import { AttentionStrip } from "./ui/v8/AttentionStrip";
import { APP_RELEASE_NAME, APP_VERSION } from "./version";

const pageDefinitions = {
  overview: { label: "Overview", icon: "OV" },
  inbox: { label: "CEO Inbox", icon: "IN" },
  campaign: { label: "Strategy", icon: "ST" },
  network: { label: "Branches", icon: "BR" },
  banking: { label: "Products", icon: "PR" },
  clients: { label: "Customers & Credit", icon: "CR" },
  leadership: { label: "Workforce", icon: "WF" },
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
  const [devOpen, setDevOpen] = useState(false);
  const [versionClicks, setVersionClicks] = useState(0);

  useEffect(() => saveGame(game), [game]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("bank-empire-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDevOpen((open) => !open);
      }
      if (event.key === "Escape") setDevOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const availablePages = useMemo(() => new Set<PageKey>(Object.keys(pageDefinitions).filter((key) => key !== "holdings" || stageRank[game.campaignStage] >= stageRank.regional) as PageKey[]), [game.campaignStage]);

  if (!game.setupComplete) return <SetupScreen onStart={(draft: SetupDraft) => {
    localStorage.setItem("bank-empire-bank-mark", JSON.stringify({ bankName: draft.bankName, mark: draft.bankLogo }));
    setGame(createCampaign(draft));
  }} />;

  const action = (fn: (state: GameState) => GameState) => setGame((current) => fn(current));
  const advance = (days: number) => action((state) => advanceDaysV8(state, days));
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
  const openDevFromVersion = () => setVersionClicks((count) => { const next = count + 1; if (next >= 5) { setDevOpen(true); return 0; } return next; });
  const compactAttention = page !== "overview" && page !== "inbox";

  return <div className="app app-v8 app-v82 app-v83" data-brand={game.brandTheme} data-page={page}>
    <aside className="sidebar sidebar-v8 sidebar-v82 sidebar-v83">
      <div className="logo logo-v7"><span>{bankMark}</span><div><strong>{game.bankName}</strong><small>{game.campaignStage} banking group</small></div></div>
      {game.devModeUsed && <div className="sidebar-dev-save">DEV SAVE</div>}
      <nav className="grouped-navigation">{navigation.map((group) => {
        const groupPages = group.pages.filter((key) => availablePages.has(key));
        if (groupPages.length === 0) return null;
        return <section className="nav-group" key={group.label}><p>{group.label}</p>{groupPages.map((key) => {
          const definition = pageDefinitions[key];
          const badge = key === "inbox" ? openInbox.length : key === "clients" ? creditBadge : 0;
          return <button key={key} className={page === key ? "nav-item active" : "nav-item"} onClick={() => setPage(key)} title={definition.label}><span className="nav-code">{definition.icon}</span><strong>{definition.label}</strong>{badge > 0 && <b className={`nav-badge ${key === "inbox" && criticalInbox > 0 ? "critical" : ""}`}>{badge}</b>}{key === "network" && game.projects.some((project) => project.status === "delayed") && <b className="nav-alert">!</b>}</button>;
        })}</section>;
      })}</nav>
      <button className="sidebar-release" onClick={openDevFromVersion} title="Playtest tools: Ctrl + Shift + D"><span>v{APP_VERSION}</span><small>{APP_RELEASE_NAME}</small></button>
      <div className="sidebar-footer"><div className="avatar">{game.founderName.slice(0, 1).toUpperCase()}</div><div><strong>{game.founderName}</strong><small>{careerTitles[game.careerLevel]}</small></div></div>
    </aside>

    <main className={`main-content main-content-v8 main-content-v82 main-content-v83 page-${page}`}>
      <div className="sticky-command-header sticky-command-header-v82 sticky-command-header-v83">
        <div className="economy-ticker"><span className={`cycle-chip ${game.economicCycle}`}>{game.economicCycle}</span><span>Policy <b>{game.baseRate.toFixed(2)}%</b></span><span>Inflation <b>{game.inflation.toFixed(1)}%</b></span><span>GDP <b>{game.gdpGrowth.toFixed(1)}%</b></span><span>Confidence <b>{game.consumerConfidence.toFixed(0)}</b></span><span className={game.bankRunRisk > 35 ? "ticker-warning" : ""}>Run risk <b>{game.bankRunRisk.toFixed(0)}</b></span></div>
        <header className="main-header main-header-v8 main-header-v82 main-header-v83">
          <div className="page-heading-v82"><p className="eyebrow">{game.campaignStage.toUpperCase()} · Y{game.year} Q{game.quarter} · WEEK {game.week} · DAY {game.day}</p><h1>{pageTitle}</h1></div>
          <div className="header-actions"><button className="icon-button help-trigger" onClick={() => setHelpOpen(true)} title="Help">?</button><button className="icon-button" onClick={() => setDark((value) => !value)} title="Theme">{dark ? "☀" : "◐"}</button>{openInbox.length > 0 && <button className={`inbox-header-chip ${criticalInbox > 0 ? "critical" : ""}`} onClick={() => setPage("inbox")}><small>INBOX</small><strong>{openInbox.length}</strong><span>{criticalInbox > 0 ? `${criticalInbox} critical` : "open"}</span></button>}{nearestProject && <button className="nearest-project-chip" onClick={() => setPage("network")}><small>PROJECT</small><strong>{nearestProject.remainingDays} days</strong><span>{nearestProject.name}</span></button>}<button className="cash-pill" onClick={() => setPage("overview")}><small>LIQUID CASH</small><strong>{money.format(game.cash)}</strong></button><div className="speed-controls"><button disabled={Boolean(game.pendingDecision || game.gameOverReason)} onClick={() => advance(1)}>+1 day</button><button disabled={Boolean(game.pendingDecision || game.gameOverReason || crisisOpen)} onClick={() => advance(7)}>+1 week</button><button className="primary" disabled={Boolean(game.pendingDecision || game.gameOverReason || crisisOpen)} onClick={() => advance(30)}>+30 days →</button></div></div>
        </header>
      </div>

      <RiskForecastBar game={game} onOpenRisk={() => setPage("risk")} />
      <AttentionStrip game={game} onNavigate={navigate} compact={compactAttention} />

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

      <footer className="game-footer"><span>{game.devModeUsed ? "DEV SAVE · " : ""}Autosaved locally · Bank Empire v{APP_VERSION}</span><button onClick={() => { if (window.confirm("Start a new campaign? Your current save will be removed.")) restart(); }}>New campaign</button></footer>
    </main>

    <HelpDrawer open={helpOpen} game={game} onClose={() => setHelpOpen(false)} />
    <DecisionModal game={game} onChoose={(id) => action((state) => chooseDecisionV5(state, id))} />
    <GameOverModal game={game} onRestart={restart} onRetry={retry} canRetry={hasCheckpoint()} />
    {devOpen && <DevPanel game={game} action={action} onClose={() => setDevOpen(false)} />}
  </div>;
}
