import { useMemo, useState } from "react";
import { appointExecutiveV5, bestExecutiveRole, executiveRoleFit, hireCandidateToRole, setAutomationModeV5 } from "../../game/engine";
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
const rolePurpose: Record<ExecutiveRole, string> = {
  CFO: "Protects liquidity, capital and funding costs.",
  COO: "Improves branches, service capacity and project delivery.",
  CRO: "Handles credit cases within the risk mandate.",
  CMO: "Runs campaigns and grows customers and brand strength.",
  CTO: "Improves digital capability and cyber security.",
};
const automationAreas = [
  ["treasury", "Treasury", "CFO"],
  ["lending", "Credit policy", "CRO"],
  ["marketing", "Marketing", "CMO"],
  ["operations", "Operations", "COO"],
] as const;
const modes: AutomationMode[] = ["manual", "conservative", "balanced", "growth"];
const modeCopy: Record<AutomationMode, string> = {
  manual: "You make every decision. The executive only provides passive expertise.",
  conservative: "Prioritises safety, small budgets and stronger buffers.",
  balanced: "Acts monthly with moderate budgets and controlled growth.",
  growth: "Uses more cash and accepts more risk to accelerate results.",
};

export function LeadershipPage({ game, action }: { game: GameState; action: GameAction }) {
  const [selectedRole, setSelectedRole] = useState<Record<string, ExecutiveRole>>({});
  const executives = executiveRoles.map((role) => ({ role, employee: game.employeeRoster.find((item) => item.executiveRole === role) }));
  const managementReports = useMemo(() => game.events.filter((event) => executiveRoles.some((role) => event.title.startsWith(`${role} report`))).slice(0, 12), [game.events]);

  return <>
    <section className="leadership-hero">
      <div><p className="eyebrow light">LEADERSHIP CAPACITY</p><h2>{executives.filter((item) => item.employee).length} / 5 executive mandates filled</h2><p>Executives now take visible monthly actions. Their role fit, mandate and ability determine what they do and how well it works.</p></div>
      <div className="leadership-score"><strong>{Math.round(executives.reduce((sum, item) => sum + (item.employee ? executiveRoleFit(item.employee, item.role) : 0), 0) / Math.max(1, executives.filter((item) => item.employee).length))}</strong><span>average role fit</span></div>
    </section>

    <section className="executive-grid">
      {executives.map(({ role, employee }) => <article className={employee ? "panel executive-card filled" : "panel executive-card"} key={role}>
        <div className="executive-role"><span>{role}</span><div><strong>{roleLabels[role]}</strong><small>{employee ? employee.name : "Vacant mandate"}</small></div></div>
        {employee ? <><div className="role-fit-row"><b>{executiveRoleFit(employee, role)}% fit</b><span>{money.format(employee.salary)}/mo</span></div><div className="executive-metrics"><span><small>Skill</small><b>{employee.skill}</b></span><span><small>Leadership</small><b>{employee.leadership}</b></span><span><small>Loyalty</small><b>{employee.loyalty}</b></span></div><p>{rolePurpose[role]}</p></> : <><p>{rolePurpose[role]}</p><small className="vacancy-note">Hire a specialist or appoint an internal employee with at least 58% role fit.</small></>}
      </article>)}
    </section>

    <section className="content-grid leadership-market-grid">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">TALENT MARKET</p><h3>Hire directly into a mandate</h3></div><span className="status good">{game.candidatePool.length} profiles</span></div>
        <div className="candidate-list">{game.candidatePool.map((candidate) => { const best = bestExecutiveRole(candidate); return <div className="candidate-row candidate-row-v5" key={candidate.id}><div className="candidate-avatar">{candidate.name.split(" ").map((part) => part[0]).join("")}</div><div className="candidate-copy"><strong>{candidate.name}</strong><small>{candidate.role} · {candidate.trait}</small><div className="candidate-stats"><span>Skill {candidate.skill}</span><span>Leadership {candidate.leadership}</span><span>{money.format(candidate.salary)}/mo</span></div><div className="candidate-fit"><b>Best match: {best.role}</b><span>{best.fit}% role fit</span></div></div><button className="primary small" disabled={game.cash < candidate.salary * 2 || best.fit < 58} onClick={() => action((state) => hireCandidateToRole(state, candidate.id, best.role))}>Hire as {best.role}</button></div>; })}</div>
      </article>

      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">INTERNAL SUCCESSION</p><h3>Promote the right specialist</h3></div></div>
        <div className="appointment-list">{game.employeeRoster.filter((employee) => employee.leadership >= 55).map((employee) => { const role = selectedRole[employee.id] ?? employee.executiveRole ?? bestExecutiveRole(employee).role; const fit = executiveRoleFit(employee, role); return <div className="appointment-row appointment-row-v5" key={employee.id}><div><strong>{employee.name}</strong><small>{employee.role} · leadership {employee.leadership}</small><span className={fit >= 70 ? "fit-good" : fit >= 58 ? "fit-ok" : "fit-poor"}>{role} fit {fit}%</span></div><select value={role} onChange={(event) => setSelectedRole((current) => ({ ...current, [employee.id]: event.target.value as ExecutiveRole }))}>{executiveRoles.map((option) => <option key={option} value={option}>{option} · {executiveRoleFit(employee, option)}%</option>)}</select><button className="secondary small" disabled={fit < 58} onClick={() => action((state) => appointExecutiveV5(state, employee.id, role))}>Appoint</button></div>; })}</div>
      </article>
    </section>

    <section className="panel automation-panel"><div className="panel-heading"><div><p className="eyebrow">MANAGEMENT DELEGATION</p><h3>Give executives a real operating mandate</h3></div><span className="status">Actions run monthly</span></div>
      <div className="automation-grid">{automationAreas.map(([area, label, requiredRole]) => { const activeExecutive = game.employeeRoster.find((employee) => employee.executiveRole === requiredRole); const selectedMode = game.automation[area]; return <div className="automation-card automation-card-v5" key={area}><div className="automation-heading"><div><strong>{label}</strong><small>{activeExecutive ? `Managed by ${activeExecutive.name}` : `Requires ${requiredRole}`}</small></div><b>{selectedMode}</b></div><p>{modeCopy[selectedMode]}</p><div className="automation-modes">{modes.map((mode) => <button key={mode} title={modeCopy[mode]} disabled={!activeExecutive && mode !== "manual"} className={selectedMode === mode ? "selected" : ""} onClick={() => action((state) => setAutomationModeV5(state, area, mode))}>{mode}</button>)}</div></div>; })}</div>
    </section>

    <section className="panel management-report-panel"><div className="panel-heading"><div><p className="eyebrow">EXECUTIVE ACTION LOG</p><h3>What management actually did</h3></div><span className="status good">{managementReports.length} reports</span></div>{managementReports.length === 0 ? <div className="empty-state">No delegated action has been completed yet. Appoint an executive, select a mandate and advance to the next monthly review.</div> : <div className="management-report-list">{managementReports.map((event) => <article key={event.id}><span>{event.title.split(" report")[0]}</span><div><strong>{event.title.split("· ")[1] ?? event.title}</strong><p>{event.body}</p></div><small>Day {event.day}</small></article>)}</div>}</section>
  </>;
}
