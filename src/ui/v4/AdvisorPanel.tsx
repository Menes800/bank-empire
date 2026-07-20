import { dismissAdvisor, getAdvisorInsights } from "../../game/engine";
import type { GameState } from "../../game/store";
import type { GameAction } from "../common";

export function AdvisorPanel({ game, action, onNavigate }: { game: GameState; action: GameAction; onNavigate: (page: string) => void }) {
  const insights = getAdvisorInsights(game);
  if (insights.length === 0) return null;
  const lead = insights[0];
  return <aside className={`advisor-panel ${lead.severity}`}>
    <div className="advisor-avatar">A</div>
    <div className="advisor-copy"><small>STRATEGIC ADVISOR</small><strong>{lead.title}</strong><p>{lead.message}</p></div>
    <div className="advisor-actions"><button className="advisor-open" onClick={() => onNavigate(lead.page)}>Open</button><button aria-label="Dismiss" className="advisor-dismiss" onClick={() => action((state) => dismissAdvisor(state, lead.id))}>×</button></div>
  </aside>;
}
