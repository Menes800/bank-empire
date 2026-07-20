import { useState } from "react";
import { appointExecutive, hireCandidateRefined, setAutomationMode } from "../../game/engine";
import type { AutomationMode, ExecutiveRole, GameState } from "../../game/store";
import type { GameAction } from "../common";
import { money } from "../format";

const executiveRoles: ExecutiveRole[] = ["CFO", "COO", "CRO", "CMO", "CTO"];
const roleLabels: Record<ExecutiveRole, string> = {
  CFO: "Finance & Treasury",
  COO: "Operations & Branches",
  CRO: "Risk & Credit",
  CMO: "Brand & Growth",
  CTO: "Technology & Cyber",
};
const automationAreas = [
  ["treasury", "Treasury", "CFO"],
  ["lending", "Credit policy", "CRO"],
  ["marketing", "Marketing", "CMO"],
  ["operations", "Operations", "COO"],
] as const;
const modes: AutomationMode[] = ["manual", "conservative", "balanced", "growth"];

export function LeadershipPage({ game, action }: { game: GameState; action: GameAction }) {
  const [selectedRole, setSelectedRole] = useState<Record<string, ExecutiveRole>>({});
  const executives = executiveRoles.map((role) => ({ role, employee: game.employeeRoster.find((item) => item.executiveRole === role) }));
  return <>
    <section className="leadership-hero">
      <div><p className="eyebrow light">LEADERSHIP CAPACITY</p><h2>{executives.filter((item) => item.employee).length} / 5 executive mandates filled</h2><p>Strong executives improve automation, project delivery, control quality and growth. The founder can still override every decision.</p></div>
      <div className="leadership-score"><strong>{Math.round(game.employeeRoster.reduce((sum, employee) => sum + employee.leadership, 0) / Math.max(1, game.employeeRoster.length))}</strong><span>average leadership</span></div>
    </section>

    <section className="executive-grid">
      {executives.map(({ role, employee }) => <article className={employee ? "panel executive-card filled" : "panel executive-card"} key={role}><div className="executive-role"><span>{role}</span><div><strong>{roleLabels[role]}</strong><small>{employee ? employee.name : "Vacant mandate"}</small></div></div>{employee ? <><div className="executive-metrics"><span><small>Skill</small><b>{employee.skill}</b></span><span><small>Leadership</small><b>{employee.leadership}</b></span><span><small>Loyalty</small><b>{employee.loyalty}</b></span></div><p>{employee.trait}</p></> : <p>Appoint a senior employee with at least 60 leadership.</p>}</article>)}
    </section>

    <section className="content-grid two-column">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">TALENT MARKET</p><h3>Available candidates</h3></div><span className="status good">{game.candidatePool.length} profiles</span></div>
        <div className="candidate-list">{game.candidatePool.map((candidate) => <div className="candidate-row" key={candidate.id}><div className="candidate-avatar">{candidate.name.split(" ").map((part) => part[0]).join("")}</div><div className="candidate-copy"><strong>{candidate.name}</strong><small>{candidate.role} · {candidate.trait}</small><div className="candidate-stats"><span>Skill {candidate.skill}</span><span>Leadership {candidate.leadership}</span><span>{money.format(candidate.salary)}/mo</span></div></div><button className="primary small" disabled={game.cash < candidate.salary * 2} onClick={() => action((state) => hireCandidateRefined(state, candidate.id))}>Hire</button></div>)}</div>
      </article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">INTERNAL SUCCESSION</p><h3>Appoint executives</h3></div></div>
        <div className="appointment-list">{game.employeeRoster.filter((employee) => employee.leadership >= 60).map((employee) => <div className="appointment-row" key={employee.id}><div><strong>{employee.name}</strong><small>{employee.role} · leadership {employee.leadership}</small></div><select value={selectedRole[employee.id] ?? employee.executiveRole ?? "CFO"} onChange={(event) => setSelectedRole((current) => ({ ...current, [employee.id]: event.target.value as ExecutiveRole }))}>{executiveRoles.map((role) => <option key={role} value={role}>{role}</option>)}</select><button className="secondary small" onClick={() => action((state) => appointExecutive(state, employee.id, selectedRole[employee.id] ?? employee.executiveRole ?? "CFO"))}>Appoint</button></div>)}</div>
      </article>
    </section>

    <section className="panel automation-panel"><div className="panel-heading"><div><p className="eyebrow">MANAGEMENT DELEGATION</p><h3>Automation mandates</h3></div><span className="status">Founder override enabled</span></div>
      <div className="automation-grid">{automationAreas.map(([area, label, requiredRole]) => { const activeExecutive = game.employeeRoster.find((employee) => employee.executiveRole === requiredRole); return <div className="automation-card" key={area}><div><strong>{label}</strong><small>{activeExecutive ? `Managed by ${activeExecutive.name}` : `Requires ${requiredRole}`}</small></div><div className="automation-modes">{modes.map((mode) => <button key={mode} disabled={!activeExecutive && mode !== "manual"} className={game.automation[area] === mode ? "selected" : ""} onClick={() => action((state) => setAutomationMode(state, area, mode))}>{mode}</button>)}</div></div>; })}</div>
    </section>
  </>;
}
