import { getMandateAssessmentV88 } from "../../game/engine";
import type { GameState } from "../../game/store";

type AttentionItem = { id: string; title: string; reason: string; page: string; action: string; tone: "critical" | "warning" | "normal" };

export function AttentionStrip({ game, onNavigate, compact = false }: { game: GameState; onNavigate: (page: string) => void; compact?: boolean }) {
  const items: AttentionItem[] = [];
  const ceoTasks = game.ceoInbox
    .filter((task) => task.status === "open" && getMandateAssessmentV88(game, task).requiresCEO)
    .sort((a, b) => urgencyScore(a.urgency) - urgencyScore(b.urgency));

  for (const task of ceoTasks.slice(0, 2)) {
    const assessment = getMandateAssessmentV88(game, task);
    items.push({ id: task.id, title: task.title, reason: assessment.reason, page: "inbox", action: "Review decision", tone: task.urgency === "critical" ? "critical" : "warning" });
  }

  const objective = game.objectives.find((item) => !item.completed && !item.failed);
  if (items.length < 2 && objective) items.push({ id: objective.id, title: objective.title, reason: objective.description, page: "reports", action: "View objective", tone: "normal" });

  if (items.length === 0) return null;

  if (compact) {
    const lead = items[0];
    return <section className={`attention-strip attention-strip-compact ${lead.tone}`}>
      <div><span>CEO PRIORITY</span><strong>{lead.title}</strong><small>{lead.reason}</small></div>
      <button onClick={() => onNavigate(lead.page)}>{lead.action} →</button>
      {items.length > 1 && <button className="attention-more" onClick={() => onNavigate("inbox")}>+{items.length - 1} more</button>}
    </section>;
  }

  return <section className="attention-strip panel attention-strip-v889">
    <div className="attention-strip-title"><p className="eyebrow">CEO PRIORITIES</p><strong>{items.length === 1 ? "One clear next step" : "Decisions that need you"}</strong></div>
    <div className="attention-items">{items.map((item, index) => <button key={item.id} className={item.tone} onClick={() => onNavigate(item.page)}><span>{index + 1}</span><div><strong>{item.title}</strong><small>{item.reason}</small></div><b>{item.action} →</b></button>)}</div>
  </section>;
}

function urgencyScore(urgency: "routine" | "important" | "critical") {
  return urgency === "critical" ? 0 : urgency === "important" ? 1 : 2;
}
