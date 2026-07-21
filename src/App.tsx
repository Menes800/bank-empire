import { useEffect, useMemo, useState } from "react";
import { chooseDecisionV5, createCampaign, reputationDelta30 } from "./game/engine";
import { advanceDaysV89, getCreditAssessmentV89, getMandateAssessmentV89, reconcileManagementV89 } from "./game/v89/gameplay";
import { clearGame, hasCheckpoint, loadGame, restoreCheckpoint, saveGame, type GameState } from "./game/store";
import { DevPanel } from "./dev/DevPanel";
import { DecisionModal, GameOverModal } from "./ui/Modals";
import { SetupScreen, type SetupDraft } from "./ui/SetupScreen";
import { money, setMoneyContext } from "./ui/format";
import { BankingPage } from "./ui/pages/BankingPage";
import { CareerPage } from "./ui/pages/CareerPage";
import { HoldingsPage } from "./ui/pages/HoldingsPage";
import { MarketPage } from "./ui/pages/MarketPage";
import { RiskPage } from "./ui/pages/RiskPage";
import { CampaignPage } from "./ui/v4/CampaignPage";
import { ReportsPage } from "./ui/v4/ReportsPage";
import { HelpDrawer } from "./ui/v41/HelpDrawer";
import { RiskForecastBar } from "./ui/v5/RiskForecastBar";
import { AttentionStrip } from "./ui/v8/AttentionStrip";
import { ReputationPanel } from "./ui/v88/ReputationPanel";
import { ClientsPageV89 } from "./ui/v89/ClientsPage";
import { InboxPageV89 } from "./ui/v89/InboxPage";
import { LeadershipPageV89 } from "./ui/v89/LeadershipPage";
import { NetworkPageV89 } from "./ui/v89/NetworkPage";
import { OverviewPageV89 } from "./ui/v89/OverviewPage";
import { APP_RELEASE_NAME, APP_VERSION } from "./version";

const pageDefinitions = {
  overview: { label: "Overview" }, inbox: { label: "CEO Inbox" }, campaign: { label: "Strategy" }, network: { label: "Branches" }, banking: { label: "Products" }, clients: { label: "Customers & Credit" }, leadership: { label: "Workforce" }, risk: { label: "Risk & Treasury" }, reports: { label: "Reports" }, market: { label: "Competition" }, holdings: { label: "Holdings" }, career: { label: "Founder" },
} as const;

type PageKey = keyof typeof pageDefinitions;
type LayoutMode = "wide" | "desktop" | "split" | "narrow";
type NavGroup = { key: "bank" | "management" | "group"; label: string; pages: PageKey[] };
const navigation: NavGroup[] = [
  { key: "bank", label: "BANK", pages: ["overview", "inbox", "campaign", "network", "banking", "clients"] },
  { key: "management", label: "MANAGEMENT", pages: ["leadership", "risk", "reports"] },
  { key: "group", label: "GROUP", pages: ["market", "holdings", "career"] },
];
const careerTitles = ["Local Founder", "Banking Executive", "Regional Director", "Group CEO", "Industry Leader"];
const stageRank = { startup: 0, regional: 1, national: 2, group: 3, empire: 4 } as const;

function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "BE";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => reconcileManagementV89(loadGame()));
  const [page, setPage] = useState<PageKey>("overview");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("desktop");
  const [dark, setDark] = useState(() => localStorage.getItem("bank-empire-theme") === "dark");
  const [helpOpen, setHelpOpen] = useState(false);
  const [reputationOpen, setReputationOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [versionClicks, setVersionClicks] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<NavGroup["key"], boolean>>({ bank: false, management: false, group: false });

  setMoneyContext(game.currency, game.locale);
  useEffect(() => saveGame(game), [game]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("bank-empire-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") { event.preventDefault(); setDevOpen((open) => !open); }
      if (event.key === "Escape") { setDevOpen(false); setHelpOpen(false); setReputationOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const updateLayout = () => {
      const width = Math.round(viewport?.width ?? window.innerWidth);
      const next: LayoutMode = width < 720 ? "narrow" : width < 1180 ? "split" : width < 1700 ? "desktop" : "wide";
      setLayoutMode((current) => current === next ? current : next);
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    viewport?.addEventListener("resize", updateLayout);
    return () => {
      window.removeEventListener("resize", updateLayout);
      viewport?.removeEventListener("resize", updateLayout);
    };
  }, []);

  const availablePages = useMemo(() => new Set<PageKey>(Object.keys(pageDefinitions).filter((key) => key !== "holdings" || stageRank[game.campaignStage] >= stageRank.regional) as PageKey[]), [game.campaignStage]);

  if (!game.setupComplete) return <SetupScreen onStart={(draft: SetupDraft) => {
    localStorage.setItem("bank-empire-bank-mark", JSON.stringify({ bankName: draft.bankName, mark: draft.bankLogo }));
    setGame(reconcileManagementV89(createCampaign(draft)));
  }} />;

  const action = (fn: (state: GameState) => GameState) => setGame((current) => reconcileManagementV89(fn(current)));
  const advance = (days: number) => setGame((current) => advanceDaysV89(current, days));
  const pageTitle = pageDefinitions[page].label;
  const restart = () => { localStorage.removeItem("bank-empire-bank-mark"); setGame(clearGame()); setPage("overview"); };
  const retry = () => { const checkpoint = restoreCheckpoint(); if (checkpoint) { setGame(reconcileManagementV89(checkpoint)); setPage("risk"); } };
  const navigate = (target: string) => { if (target in pageDefinitions && availablePages.has(target as PageKey)) setPage(target as PageKey); };
  const crisisOpen = Boolean(game.pendingDecision?.id.startsWith("v5-"));
  const nearestProject = game.projects.filter((project) => project.status !== "completed").sort((a, b) => a.remainingDays - b.remainingDays)[0];
  const bankMark = game.bankMark || initials(game.bankName);
  const openInbox = game.ceoInbox.filter((task) => task.status === "open" && getMandateAssessmentV89(game, task).requiresCEO);
  const criticalInbox = openInbox.filter((task) => task.urgency === "critical").length;
  const creditBadge = game.loanApplications.filter((application) => getCreditAssessmentV89(game, application).requiresCEO).length + game.collectionCases.filter((item) => !item.closed).length;
  const reputationChange = reputationDelta30(game);
  const openDevFromVersion = () => setVersionClicks((count) => { const next = count + 1; if (next >= 5) { setDevOpen(true); return 0; } return next; });

  return <div className="app app-v8 app-v82 app-v88 app-v89" data-brand={game.brandTheme} data-page={page} data-layout={layoutMode}>
    <aside className="sidebar sidebar-v8 sidebar-v82 sidebar-v88 sidebar-v89">
      <div className="logo logo-v7"><span>{bankMark}</span><div><strong>{game.bankName}</strong><small>{game.slogan || `${game.campaignStage} banking group`}</small></div></div>
      <nav className="grouped-navigation">{navigation.map((group) => {
        const groupPages = group.pages.filter((key) => availablePages.has(key));
        if (groupPages.length === 0) return null;
        return <section className={`nav-group ${collapsed[group.key] ? "collapsed" : ""}`} key={group.key}>
          <button className="nav-group-toggle-v88" onClick={() => setCollapsed((current) => ({ ...current, [group.key]: !current[group.key] }))}><span>{group.label}</span><b>{collapsed[group.key] ? "+" : "−"}</b></button>
          {!collapsed[group.key] && groupPages.map((key) => { const definition = pageDefinitions[key]; const badge = key === "inbox" ? openInbox.length : key === "clients" ? creditBadge : 0; return <button key={key} className={page === key ? "nav-item active" : "nav-item"} onClick={() => setPage(key)} title={definition.label}><strong>{definition.label}</strong>{badge > 0 && <b className={`nav-badge ${key === "inbox" && criticalInbox > 0 ? "critical" : ""}`}>{badge}</b>}{key === "network" && game.projects.some((project) => project.status === "delayed") && <b className="nav-alert">!</b>}</button>; })}
        </section>;
      })}</nav>
      <div className="sidebar-release-stack-v88">{game.devModeUsed && <span className="sidebar-dev-save">DEV SAVE</span>}<button className="sidebar-release" onClick={openDevFromVersion} title="Playtest tools: Ctrl + Shift + D"><span>v{APP_VERSION}</span><small>{APP_RELEASE_NAME}</small></button></div>
      <button className="sidebar-footer ceo-card-v88" onClick={() => setPage("career")}><div className="avatar">{game.founderName.slice(0, 1).toUpperCase()}</div><div><strong>{game.founderName}</strong><small>{careerTitles[game.careerLevel]}</small></div><b>CEO →</b></button>
    </aside>

    <main className={`main-content main-content-v8 main-content-v82 main-content-v88 main-content-v89 page-${page}`}>
      <div className="sticky-command-header sticky-command-header-v82 sticky-command-header-v89">
        <div className="economy-ticker"><span className={`cycle-chip ${game.economicCycle}`}>{game.economicCycle}</span><span>Policy <b>{game.baseRate.toFixed(2)}%</b></span><span>Inflation <b>{game.inflation.toFixed(1)}%</b></span><span>GDP <b>{game.gdpGrowth.toFixed(1)}%</b></span><span>Confidence <b>{game.consumerConfidence.toFixed(0)}</b></span><span className={game.bankRunRisk > 35 ? "ticker-warning" : ""}>Run risk <b>{game.bankRunRisk.toFixed(0)}</b></span></div>
        <header className="main-header main-header-v8 main-header-v82 main-header-v89">
          <div className="page-heading-v82"><p className="eyebrow">{game.campaignStage.toUpperCase()} · Y{game.year} Q{game.quarter} · WEEK {game.week} · DAY {game.day}</p><h1>{pageTitle}</h1></div>
          <div className="header-actions"><button className="icon-button help-trigger" onClick={() => setHelpOpen(true)} title="Help">?</button><button className="icon-button" onClick={() => setDark((value) => !value)} title="Theme">{dark ? "☀" : "◐"}</button><button className="reputation-chip-v88" onClick={() => setReputationOpen(true)}><small>REPUTATION</small><strong>{game.reputation.toFixed(0)}</strong><span className={reputationChange >= 0 ? "positive" : "negative"}>{reputationChange >= 0 ? "+" : ""}{reputationChange.toFixed(1)} · 30d</span></button>{openInbox.length > 0 && <button className={`inbox-header-chip ${criticalInbox > 0 ? "critical" : ""}`} onClick={() => setPage("inbox")}><small>CEO INBOX</small><strong>{openInbox.length}</strong><span>{criticalInbox > 0 ? `${criticalInbox} critical` : "authority needed"}</span></button>}{nearestProject && <button className="nearest-project-chip" onClick={() => setPage("network")}><small>PROJECT</small><strong>{nearestProject.remainingDays}d</strong><span>{nearestProject.name}</span></button>}<button className="cash-pill" onClick={() => setPage("overview")}><small>LIQUID CASH</small><strong>{money.format(game.cash)}</strong></button><div className="speed-controls"><button disabled={Boolean(game.pendingDecision || game.gameOverReason)} onClick={() => advance(1)}>+1 day</button><button disabled={Boolean(game.pendingDecision || game.gameOverReason || crisisOpen)} onClick={() => advance(7)}>+1 week</button><button className="primary" disabled={Boolean(game.pendingDecision || game.gameOverReason || crisisOpen)} onClick={() => advance(30)}>+30 days →</button></div></div>
        </header>
      </div>

      {page === "risk" && <RiskForecastBar game={game} onOpenRisk={() => setPage("risk")} />}
      {page === "overview" && <AttentionStrip game={game} onNavigate={navigate} compact />}
      {page === "overview" && <OverviewPageV89 game={game} onOpenBoard={() => setPage("reports")} onOpenInbox={() => setPage("inbox")} />}
      {page === "inbox" && <InboxPageV89 game={game} action={action} onNavigate={navigate} />}
      {page === "campaign" && <CampaignPage game={game} action={action} onNavigate={navigate} />}
      {page === "network" && <NetworkPageV89 game={game} action={action} />}
      {page === "leadership" && <LeadershipPageV89 game={game} action={action} />}
      {page === "banking" && <BankingPage game={game} action={action} />}
      {page === "clients" && <ClientsPageV89 game={game} action={action} />}
      {page === "reports" && <ReportsPage game={game} action={action} />}
      {page === "risk" && <RiskPage game={game} action={action} />}
      {page === "market" && <MarketPage game={game} />}
      {page === "career" && <CareerPage game={game} action={action} />}
      {page === "holdings" && <HoldingsPage game={game} action={action} />}
      <footer className="game-footer"><span>Autosaved locally · {game.currency} · Bank Empire v{APP_VERSION}</span><button onClick={() => { if (window.confirm("Start a new campaign? Your current save will be removed.")) restart(); }}>New campaign</button></footer>
    </main>

    <HelpDrawer open={helpOpen} game={game} onClose={() => setHelpOpen(false)} />
    <ReputationPanel game={game} open={reputationOpen} onClose={() => setReputationOpen(false)} />
    <DecisionModal game={game} onChoose={(id) => action((state) => chooseDecisionV5(state, id))} />
    <GameOverModal game={game} onRestart={restart} onRetry={retry} canRetry={hasCheckpoint()} />
    {devOpen && <DevPanel game={game} action={action} onClose={() => setDevOpen(false)} />}
  </div>;
}
