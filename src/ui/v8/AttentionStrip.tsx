import type { GameState } from "../../game/store";

export function AttentionStrip({ game, onNavigate }: { game: GameState; onNavigate: (page: string) => void }) {
  const items: { id: string; title: string; reason: string; page: string; action: string; tone: "critical" | "warning" | "normal" }[] = [];
  const openTasks = game.ceoInbox.filter((task) => task.status === "open").sort((a, b) => (a.urgency === "critical" ? -1 : a.urgency === "important" ? 0 : 1) - (b.urgency === "critical" ? -1 : b.urgency === "important" ? 0 : 1));

  for (const task of openTasks.slice(0, 2)) items.push({ id: task.id, title: task.title, reason: task.summary, page: task.page, action: "Review", tone: task.urgency === "critical" ? "critical" : "warning" });

  if (items.length < 3 && game.liquidityRatio < 22) items.push({ id: "liquidity", title: "Protect liquidity", reason: `Liquidity is ${game.liquidityRatio.toFixed(1)}%. New lending and expansion can use cash faster than deposits arrive.`, page: "risk", action: "Open treasury", tone: game.liquidityRatio < 14 ? "critical" : "warning" });

  const vacantBranch = game.branchOffices.find((branch) => !branch.managerId);
  if (items.length < 3 && vacantBranch) items.push({ id: `manager-${vacantBranch.id}`, title: `Appoint a manager at ${vacantBranch.name}`, reason: "The branch cannot run automatically or improve performance without an accountable manager.", page: "network", action: "Open network", tone: "warning" });

  const missingCOO = !game.employeeRoster.some((employee) => employee.executiveRole === "COO");
  if (items.length < 3 && missingCOO) items.push({ id: "coo", title: "Build operations leadership", reason: "A COO is required for automatic branch staffing, capacity planning and profitable upgrades.", page: "leadership", action: "Open workforce", tone: "normal" });

  const objective = game.objectives.find((item) => !item.completed && !item.failed);
  if (items.length < 3 && objective) items.push({ id: objective.id, title: objective.title, reason: objective.description, page: "overview", action: "View objective", tone: "normal" });

  if (items.length === 0) items.push({ id: "healthy", title: "Management is operating normally", reason: "No material decision currently requires the CEO. Advance time or review the next strategic objective.", page: "campaign", action: "Review strategy", tone: "normal" });

  return <section className="attention-strip panel">
    <div className="attention-strip-title"><p className="eyebrow">WHAT NEEDS ATTENTION</p><strong>{items.length === 1 ? "One clear next step" : "Your next decisions"}</strong></div>
    <div className="attention-items">{items.slice(0, 3).map((item, index) => <button key={item.id} className={item.tone} onClick={() => onNavigate(item.page)}><span>{index + 1}</span><div><strong>{item.title}</strong><small>{item.reason}</small></div><b>{item.action} →</b></button>)}</div>
  </section>;
}
