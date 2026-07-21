import type { GameState } from "../../game/store";

type AttentionItem = { id: string; title: string; reason: string; page: string; action: string; tone: "critical" | "warning" | "normal" };

export function AttentionStrip({ game, onNavigate, compact = false }: { game: GameState; onNavigate: (page: string) => void; compact?: boolean }) {
  const items: AttentionItem[] = [];
  const openTasks = game.ceoInbox
    .filter((task) => task.status === "open" && task.urgency !== "routine")
    .sort((a, b) => (a.urgency === "critical" ? -1 : 0) - (b.urgency === "critical" ? -1 : 0));

  for (const task of openTasks.slice(0, 2)) items.push({ id: task.id, title: task.title, reason: task.summary, page: "inbox", action: "Open CEO matter", tone: task.urgency === "critical" ? "critical" : "warning" });

  if (items.length < 3 && game.liquidityRatio < 22) items.push({ id: "liquidity", title: "Protect liquidity", reason: `Liquidity is ${game.liquidityRatio.toFixed(1)}%. Treasury needs enough cash for withdrawals, lending and delivery.`, page: "risk", action: "Open treasury", tone: game.liquidityRatio < 14 ? "critical" : "warning" });

  const vacantBranch = game.branchOffices.find((branch) => !branch.managerId);
  if (items.length < 3 && vacantBranch) items.push({ id: `manager-${vacantBranch.id}`, title: `Appoint a manager at ${vacantBranch.name}`, reason: "The branch cannot operate autonomously without one accountable local owner.", page: "network", action: "Open branches", tone: "warning" });

  const missingCOO = !game.employeeRoster.some((employee) => employee.executiveRole === "COO");
  if (items.length < 3 && missingCOO) items.push({ id: "coo", title: "Build operations leadership", reason: "A COO is required for network staffing, capacity planning and delegated branch investment.", page: "executives", action: "Open Executive Team", tone: "normal" });

  const objective = game.objectives.find((item) => !item.completed && !item.failed);
  if (items.length < 3 && objective) items.push({ id: objective.id, title: objective.title, reason: objective.description, page: "board", action: "Open Board", tone: "normal" });

  if (items.length === 0) items.push({ id: "healthy", title: "Management is operating normally", reason: "No material decision currently requires the CEO. Review strategy, ownership or the next expansion step.", page: "campaign", action: "Review strategy", tone: "normal" });

  if (compact) {
    const lead = items[0];
    return <section className={`attention-strip attention-strip-compact ${lead.tone}`}><div><span>CEO PRIORITY</span><strong>{lead.title}</strong><small>{lead.reason}</small></div><button onClick={() => onNavigate(lead.page)}>{lead.action} →</button>{items.length > 1 && <button className="attention-more" onClick={() => onNavigate("inbox")}>+{items.length - 1} more</button>}</section>;
  }

  return <section className="attention-strip panel"><div className="attention-strip-title"><p className="eyebrow">WHAT NEEDS ATTENTION</p><strong>{items.length === 1 ? "One clear next step" : "Your next decisions"}</strong></div><div className="attention-items">{items.slice(0, 3).map((item, index) => <button key={item.id} className={item.tone} onClick={() => onNavigate(item.page)}><span>{index + 1}</span><div><strong>{item.title}</strong><small>{item.reason}</small></div><b>{item.action} →</b></button>)}</div></section>;
}
