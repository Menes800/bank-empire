import { useMemo, useState } from "react";
import { appointExecutiveV5, executiveRoleFit, hireCandidateToRole, setManagementControl } from "../../game/engine";
import { developExecutive } from "../../game/v85/gameplay";
import type { ExecutiveRole, GameState, ManagementArea, ManagementControlMode } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const roles: ExecutiveRole[] = ["CFO", "COO", "CRO", "CMO", "CTO"];
const modes: ManagementControlMode[] = ["automatic", "major", "manual"];

const roleInfo: Record<ExecutiveRole, { title: string; area?: ManagementArea; scope: string; short: string }> = {
  CFO: { title: "Chief Financial Officer", area: "treasury", short: "Finance & Treasury", scope: "Liquidity, capital buffers, funding and financial control." },
  COO: { title: "Chief Operating Officer", area: "operations", short: "Branches & Operations", scope: "Branch managers, staffing, service capacity and delivery." },
  CRO: { title: "Chief Risk Officer", area: "lending", short: "Risk, Credit & Compliance", scope: "Credit policy, central authority, arrears, compliance and control remediation." },
  CMO: { title: "Chief Marketing Officer", area: "marketing", short: "Customers & Growth", scope: "Customer strategy, local campaigns, pricing response and competition." },
  CTO: { title: "Chief Technology Officer", short: "Technology & Cyber", scope: "Digital delivery, cyber security, core systems and technology incidents." },
};

const modeText: Record<ManagementControlMode, string> = {
  automatic: "Handles routine work and normal decisions within budget.",
  major: "Runs the area, but escalates material investments and exceptions.",
  manual: "Waits for CEO instructions. This creates more inbox work.",
};

function executiveStatus(workload: number, wellbeing: number, performance: number) {
  if (wellbeing < 48 || workload > 108) return { label: "Needs support", tone: "warn" };
  if (performance >= 84) return { label: "Strong", tone: "good" };
  return { label: "Stable", tone: "neutral" };
}

export function ExecutiveTeamPage({ game, action }: { game: GameState; action: GameAction }) {
  const [selectedRole, setSelectedRole] = useState<ExecutiveRole | null>(null);
  const selected = selectedRole ? game.employeeRoster.find((employee) => employee.executiveRole === selectedRole) : undefined;
  const filled = roles.filter((role) => game.employeeRoster.some((employee) => employee.executiveRole === role)).length;
  const openExecutiveMatters = game.ceoInbox.filter((task) => task.status === "open" && task.ownerRole).length;

  const candidates = useMemo(() => selectedRole
    ? [...game.candidatePool]
      .map((candidate) => ({ candidate, fit: executiveRoleFit(candidate, selectedRole) }))
      .sort((a, b) => b.fit - a.fit)
      .slice(0, 3)
    : [], [game.candidatePool, selectedRole]);

  return <>
    <section className="executive-hero panel"><div><p className="eyebrow">EXECUTIVE TEAM</p><h2>Give every major area a clear owner</h2><p>Executives operate the bank inside the mandate you set. Open a leader to review performance, decisions and development.</p></div><div className="executive-hero-stats"><span><small>Roles filled</small><strong>{filled}/5</strong></span><span><small>Executive matters</small><strong>{openExecutiveMatters}</strong></span><span><small>Board confidence</small><strong>{game.boardConfidence.toFixed(0)}</strong></span></div></section>

    <section className="executive-card-grid">{roles.map((role) => {
      const employee = game.employeeRoster.find((item) => item.executiveRole === role);
      const info = roleInfo[role];
      const performance = employee?.performance ?? employee?.skill ?? 0;
      const workload = employee?.workload ?? 0;
      const wellbeing = employee?.wellbeing ?? employee?.energy ?? 0;
      const status = employee ? executiveStatus(workload, wellbeing, performance) : null;
      const mode: ManagementControlMode = info.area ? game.managementControl[info.area] : "automatic";
      return <button key={role} className={`executive-card ${employee ? "filled" : "vacant"}`} onClick={() => setSelectedRole(role)}><div className="executive-card-head"><span>{role}</span><div><strong>{info.short}</strong><small>{employee?.name ?? "Vacant mandate"}</small></div><b className={status?.tone ?? "vacant"}>{status?.label ?? "Open role"}</b></div><p>{info.scope}</p>{employee ? <div className="executive-card-metrics"><span><small>Fit</small><strong>{executiveRoleFit(employee, role)}%</strong></span><span><small>Performance</small><strong>{performance.toFixed(0)}</strong></span><span><small>Mandate</small><strong>{mode === "major" ? "Ask major" : mode}</strong></span></div> : <div className="executive-vacancy-copy">Open the role to review internal and external candidates.</div>}</button>;
    })}</section>

    <section className="panel delegation-map-panel"><div className="panel-heading"><div><p className="eyebrow">DELEGATION MAP</p><h3>What reaches the CEO?</h3><p>Routine execution stays with management. Only material capital, strategy, reputation and ownership decisions should reach you.</p></div></div><div className="delegation-map-grid">{roles.map((role) => { const employee = game.employeeRoster.find((item) => item.executiveRole === role); const info = roleInfo[role]; const mode: ManagementControlMode = info.area ? game.managementControl[info.area] : "automatic"; return <article key={role}><span>{role}</span><div><strong>{employee?.name ?? "No owner appointed"}</strong><small>{employee ? `${mode === "major" ? "Ask major" : mode} mandate` : "Work escalates until the role is filled"}</small></div></article>; })}</div></section>

    {selectedRole && <div className="executive-drawer-backdrop" role="dialog" aria-modal="true" onMouseDown={() => setSelectedRole(null)}><aside className="executive-drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">{selectedRole} PROFILE</p><h2>{selected?.name ?? roleInfo[selectedRole].title}</h2><p>{roleInfo[selectedRole].scope}</p></div><button className="icon-button" onClick={() => setSelectedRole(null)}>×</button></header>{selected ? <ExecutiveProfile role={selectedRole} game={game} action={action} /> : <div className="executive-vacancy-panel"><div className="empty-state"><strong>{selectedRole} is vacant</strong><p>Without an accountable leader, routine work in this area is more likely to reach the CEO.</p></div><div className="executive-candidate-list">{candidates.map(({ candidate, fit }) => <article key={candidate.id}><div><strong>{candidate.name}</strong><small>{candidate.role} · {candidate.trait}</small></div><b>{fit}% fit</b><button className="primary small" disabled={fit < 58 || game.cash < candidate.salary * 2} onClick={() => action((state) => hireCandidateToRole(state, candidate.id, selectedRole))}>Hire as {selectedRole}</button></article>)}</div><div className="internal-successor-list"><strong>Internal successors</strong>{game.employeeRoster.filter((employee) => !employee.executiveRole && employee.leadership >= 55).map((employee) => <button key={employee.id} disabled={executiveRoleFit(employee, selectedRole) < 58} onClick={() => action((state) => appointExecutiveV5(state, employee.id, selectedRole))}><span>{employee.name}</span><b>{executiveRoleFit(employee, selectedRole)}% fit</b></button>)}</div></div>}</aside></div>}
  </>;
}

function ExecutiveProfile({ role, game, action }: { role: ExecutiveRole; game: GameState; action: GameAction }) {
  const employee = game.employeeRoster.find((item) => item.executiveRole === role)!;
  const info = roleInfo[role];
  const area = info.area;
  const performance = employee.performance ?? employee.skill;
  const workload = employee.workload ?? 75;
  const wellbeing = employee.wellbeing ?? employee.energy;
  const recent = game.events.filter((event) => event.title.includes(role) || event.body.includes(employee.name)).slice(0, 4);

  return <><div className="executive-profile-kpis"><Metric label="Role fit" value={`${executiveRoleFit(employee, role)}%`} /><Metric label="Performance" value={performance.toFixed(0)} /><Metric label="Workload" value={`${workload.toFixed(0)}%`} /><Metric label="Wellbeing" value={wellbeing.toFixed(0)} /><Metric label="CEO trust" value={employee.loyalty.toFixed(0)} /><Metric label="Annual salary" value={money.format(employee.salary)} /></div>{area ? <section className="executive-mandate-editor"><div><p className="eyebrow">MANDATE</p><h3>{info.short}</h3><p>{modeText[game.managementControl[area]]}</p></div><div className="three-mode-control">{modes.map((mode) => <button key={mode} className={game.managementControl[area] === mode ? "selected" : ""} onClick={() => action((state) => setManagementControl(state, area, mode))}>{mode === "major" ? "Ask major" : mode}</button>)}</div></section> : <section className="executive-mandate-editor"><div><p className="eyebrow">CYBER MANDATE</p><h3>Routine response is automatic</h3><p>The CTO isolates systems, investigates alerts and deploys controlled patches. Confirmed customer loss, major data exposure and extraordinary investment still escalate to the CEO.</p></div><span className="status good">Automatic</span></section>}<section className="executive-development"><p className="eyebrow">DEVELOPMENT</p><h3>Build the leader over time</h3><div><button disabled={game.cash < 55_000} onClick={() => action((state) => developExecutive(state, employee.id, "leadership"))}><strong>Executive coaching</strong><small>Leadership and performance · {money.format(55_000)}</small></button><button disabled={game.cash < 48_000} onClick={() => action((state) => developExecutive(state, employee.id, "specialist"))}><strong>Specialist development</strong><small>Technical skill and potential · {money.format(48_000)}</small></button><button disabled={game.cash < 24_000} onClick={() => action((state) => developExecutive(state, employee.id, "recovery"))}><strong>Recovery programme</strong><small>Lower workload and restore wellbeing · {money.format(24_000)}</small></button></div></section><section className="executive-decision-log"><p className="eyebrow">RECENT MANAGEMENT</p><h3>What this leader has done</h3>{recent.length === 0 ? <div className="empty-state">No named management actions have been recorded yet.</div> : recent.map((event) => <article key={event.id}><span>Day {event.day}</span><strong>{event.title}</strong><p>{event.body}</p></article>)}</section></>;
}

function Metric({ label, value }: { label: string; value: string }) { return <span><small>{label}</small><strong>{value}</strong></span>; }
