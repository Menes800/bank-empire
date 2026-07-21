import { setStrategicPlan, takeDividend } from "../../game/engine";
import type { GameState } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const priorities: { key: GameState["strategicFocus"]; title: string; detail: string }[] = [
  { key: "balanced", title: "Build the leadership system", detail: "Keep growth, service, risk and execution in balance while managers take ownership." },
  { key: "efficiency", title: "Restore profitability", detail: "Push cost discipline and make weak branches prove their operating model." },
  { key: "growth", title: "Prepare expansion", detail: "Build customers, deposits and organisational capacity for the next market." },
  { key: "trust", title: "Strengthen confidence", detail: "Prioritise customer trust, compliance and reputation with the board." },
  { key: "digital", title: "Modernise the bank", detail: "Focus the executive team on technology, cyber resilience and scalable delivery." },
];

export function CEOOwnershipPage({ game, action }: { game: GameState; action: GameAction }) {
  const assets = game.cash + game.loans + game.loanLossReserve;
  const liabilities = game.deposits + game.wholesaleFunding;
  const equity = assets - liabilities;
  const estimatedValue = Math.max(0, equity + game.reputation * 25_000 + Math.max(0, game.totalProfit) * 2.5);
  const dividendEvents = game.events.filter((event) => event.title === "Founder dividend paid");
  const dividendsPaid = dividendEvents.length * 65_000;
  const executives = game.employeeRoster.filter((employee) => employee.executiveRole).length;
  const currentPriority = priorities.find((item) => item.key === game.strategicFocus) ?? priorities[0];
  const daysRemaining = Math.max(0, game.strategyReviewDay - game.day);
  const milestones = buildMilestones(game);

  return <>
    <section className="ceo-ownership-hero panel">
      <div className="ceo-identity-v86"><span>{game.founderName.slice(0, 1).toUpperCase()}</span><div><p className="eyebrow">FOUNDER & CEO</p><h2>{game.founderName}</h2><p>{game.campaignStage} banking group · {game.background} background</p></div></div>
      <div className="ceo-ownership-kpis"><Metric label="Founder ownership" value="100%" /><Metric label="Estimated bank value" value={money.format(estimatedValue)} /><Metric label="Board confidence" value={game.boardConfidence.toFixed(0)} /><Metric label="Personal cash" value={money.format(game.personalCash)} /></div>
    </section>

    <section className="ceo-priority-v86 panel">
      <div className="panel-heading"><div><p className="eyebrow">90-DAY CEO PRIORITY</p><h3>{currentPriority.title}</h3><p>{currentPriority.detail}</p></div><span className="status good">{daysRemaining} days remaining</span></div>
      <div className="ceo-priority-grid-v86">{priorities.map((priority) => <button key={priority.key} className={game.strategicFocus === priority.key ? "selected" : ""} onClick={() => action((state) => setStrategicPlan(state, priority.key))}><strong>{priority.title}</strong><small>{priority.detail}</small></button>)}</div>
    </section>

    <section className="ceo-ownership-layout-v86">
      <article className="panel ownership-card-v86"><div className="panel-heading"><div><p className="eyebrow">OWNERSHIP & PERSONAL ECONOMY</p><h3>Control has a cost</h3><p>The bank is still privately controlled by you. Dividends move cash out of the bank and can weaken board confidence.</p></div></div><div className="ownership-metrics-v86"><Metric label="Founder stake" value="100%" /><Metric label="Bank equity" value={money.format(equity)} /><Metric label="Dividends received" value={money.format(dividendsPaid)} /><Metric label="External equity" value="None" /></div><button className="secondary wide" disabled={game.cash < 1_200_000 || game.boardConfidence < 35} onClick={() => action((state) => takeDividend(state))}>Take NOK 100k founder dividend <small>Net personal payment NOK 65k · lower bank cash and board confidence</small></button><div className="future-ownership-v86"><span><strong>Investor round</strong><small>Available when the bank needs outside equity.</small></span><span><strong>Share buyback</strong><small>Available after external investors enter.</small></span><span><strong>Public listing</strong><small>Planned for a mature national or international group.</small></span></div></article>

      <article className="panel ceo-development-v86"><div className="panel-heading"><div><p className="eyebrow">CEO DEVELOPMENT</p><h3>Capability earned through the bank you build</h3><p>Progress comes from decisions, leaders, profitable branches and expansion — not a short skill-point ladder.</p></div></div><div className="development-track-list-v86"><Track title="Strategic leadership" progress={Math.min(100, game.careerLevel * 20 + game.objectives.filter((item) => item.completed).length * 12)} detail="Board objectives, strategy cycles and major decisions." /><Track title="Finance & capital" progress={Math.min(100, game.educationLevel * 14 + game.capitalRatio * 2)} detail="Capital discipline, funding and profitable growth." /><Track title="Risk & regulation" progress={Math.min(100, game.compliance)} detail="Compliance quality, credit outcomes and crises avoided." /><Track title="People & organisation" progress={Math.min(100, executives * 16 + game.branchOffices.filter((branch) => branch.managerId).length * 5)} detail="A complete executive team and accountable branch leadership." /><Track title="International business" progress={game.campaignStage === "empire" ? 100 : game.campaignStage === "group" ? 65 : game.campaignStage === "national" ? 35 : 10} detail="Unlocks through national scale, acquisitions and future foreign markets." /></div></article>
    </section>

    <section className="panel founder-timeline-v86"><div className="panel-heading"><div><p className="eyebrow">FOUNDER LEGACY</p><h3>The story of the bank</h3><p>Milestones are shown once as a timeline instead of oversized bonus cards.</p></div></div><div className="milestone-timeline-v86">{milestones.map((milestone) => <article key={milestone.title} className={milestone.done ? "done" : "locked"}><span>{milestone.done ? "✓" : "○"}</span><div><strong>{milestone.title}</strong><small>{milestone.detail}</small></div></article>)}</div></section>
  </>;
}

function buildMilestones(game: GameState) {
  return [
    { title: "Bank opened", detail: "The first licence, team and local branch.", done: game.setupComplete },
    { title: "1,000 customers", detail: "A real customer franchise begins to form.", done: game.customers >= 1_000 },
    { title: "First profitable branch", detail: "At least one local bank closes a profitable month.", done: game.branchOffices.some((branch) => (branch.lastMonthProfit ?? 0) > 0) },
    { title: "Regional network", detail: "Operate at least three accountable branches.", done: game.branchOffices.length >= 3 },
    { title: "National banking group", detail: "Reach the national campaign stage.", done: ["national", "group", "empire"].includes(game.campaignStage) },
    { title: "First acquisition", detail: "Integrate another bank into the group.", done: game.achievements.some((item) => /acqui/i.test(item)) },
    { title: "International market", detail: "A future milestone after the domestic organisation is ready.", done: game.campaignStage === "empire" },
  ];
}

function Metric({ label, value }: { label: string; value: string }) { return <span><small>{label}</small><strong>{value}</strong></span>; }
function Track({ title, progress, detail }: { title: string; progress: number; detail: string }) { return <article><div><strong>{title}</strong><b>{Math.round(progress)}%</b></div><p>{detail}</p><div className="stage-track"><i style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div></article>; }
