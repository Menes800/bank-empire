import { useMemo, useState } from "react";
import {
  MANDATE_PERMISSION_LABELS,
  appointExecutiveV5,
  bestExecutiveRole,
  employeeDepartment,
  executiveRoleFit,
  getWorkforceDepartments,
  hireCandidateToRole,
  setExecutiveMandatePreset,
  toggleExecutivePermission,
  updateExecutiveMandateLimits,
} from "../../game/engine";
import type { ExecutiveRole, GameState, MandatePreset } from "../../game/store";
import type { EmployeeProfile } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const executiveRoles: ExecutiveRole[] = ["CFO", "COO", "CRO", "CMO", "CTO"];
const roleTitles: Record<ExecutiveRole, string> = {
  CFO: "Finance & Treasury", COO: "Operations & Branches", CRO: "Risk & Credit", CMO: "Customers & Growth", CTO: "Technology & Cyber",
};

function employeeStatus(employee: EmployeeProfile) {
  const workload = employee.workload ?? 75;
  const wellbeing = employee.wellbeing ?? employee.energy;
  if (workload > 110 || wellbeing < 45) return { key: "risk", label: "At risk" };
  if (workload > 92 || wellbeing < 62) return { key: "pressure", label: "Under pressure" };
  if ((employee.performance ?? employee.skill) > 82) return { key: "strong", label: "High performer" };
  return { key: "steady", label: "Stable" };
}

export function LeadershipPage({ game, action }: { game: GameState; action: GameAction }) {
  const departments = getWorkforceDepartments(game);
  const [selectedId, setSelectedId] = useState(game.employeeRoster[0]?.id ?? "");
  const [candidateId, setCandidateId] = useState(game.candidatePool[0]?.id ?? "");
  const selected = game.employeeRoster.find((employee) => employee.id === selectedId) ?? game.employeeRoster[0];
  const selectedCandidate = game.candidatePool.find((employee) => employee.id === candidateId) ?? game.candidatePool[0];
  const totalPayroll = game.employeeRoster.reduce((sum, employee) => sum + employee.salary, 0);
  const averagePerformance = game.employeeRoster.reduce((sum, employee) => sum + (employee.performance ?? employee.skill), 0) / Math.max(1, game.employeeRoster.length);
  const averageWellbeing = game.employeeRoster.reduce((sum, employee) => sum + (employee.wellbeing ?? employee.energy), 0) / Math.max(1, game.employeeRoster.length);
  const overloaded = departments.filter((department) => department.status === "overloaded").length;
  const retentionRisk = game.employeeRoster.filter((employee) => employee.loyalty < 50 || (employee.wellbeing ?? employee.energy) < 45 || (employee.quitRisk ?? 0) > 55).length;
  const executives = executiveRoles.map((role) => ({ role, employee: game.employeeRoster.find((item) => item.executiveRole === role) }));
  const candidates = useMemo(() => [...game.candidatePool].sort((a, b) => bestExecutiveRole(b).fit - bestExecutiveRole(a).fit), [game.candidatePool]);

  return <>
    <section className="workforce-hero panel">
      <div><p className="eyebrow">WORKFORCE</p><h2>Give leaders real authority, then hold them accountable.</h2><p>Permissions, spending limits and risk limits now control what executives can actually do in the simulation. Actions above the mandate are escalated to the CEO.</p></div>
      <div className="workforce-health"><strong>{Math.round(averageWellbeing)}</strong><span>workforce wellbeing</span></div>
    </section>

    <section className="workforce-kpi-row">
      <Metric label="Employees" value={`${game.employeeRoster.length}`} /><Metric label="Monthly payroll" value={money.format(totalPayroll)} />
      <Metric label="Average performance" value={`${averagePerformance.toFixed(0)}`} tone={averagePerformance >= 72 ? "positive" : "warning"} />
      <Metric label="Overloaded teams" value={`${overloaded}`} tone={overloaded > 0 ? "warning" : "positive"} /><Metric label="Retention risk" value={`${retentionRisk}`} tone={retentionRisk > 0 ? "warning" : "positive"} />
    </section>

    <section className="panel executive-mandate-section-v88">
      <div className="panel-heading"><div><p className="eyebrow">EXECUTIVE MANDATES</p><h3>One operating window for every executive</h3><p>Every permission below is connected to gameplay. Actual spending, risk and outcomes are recorded here; critical strategic matters still stay with the CEO.</p></div><span className="status good">{executives.filter((item) => item.employee).length}/5 appointed</span></div>
      <div className="executive-mandate-grid-v88">{executives.map(({ role, employee }) => {
        const mandate = game.executiveMandates[role];
        const recent = game.managementLog.filter((entry) => entry.role === role && entry.day >= game.day - 30);
        const logs = recent.slice(0, 2);
        const completed = recent.filter((entry) => entry.outcome !== "escalated").length;
        const escalated = recent.filter((entry) => entry.outcome === "escalated").length;
        return <article key={role} className={employee ? "mandate-card-v88 filled" : "mandate-card-v88 vacant"}>
          <header><span>{role}</span><div><strong>{roleTitles[role]}</strong><small>{employee ? employee.name : `Appoint a ${role} to activate`}</small></div>{employee && <b>{executiveRoleFit(employee, role)}% fit</b>}</header>
          <div className={`mandate-power-v889 ${employee ? "active" : "inactive"}`}><div><strong>{employee ? completed > 0 ? `${completed} actions in 30 days` : "Authority ready" : "No executive appointed"}</strong><small>{employee ? "Triggered only by real operational needs" : "This mandate cannot execute"}</small></div>{employee && <b className={escalated > 0 ? "warning" : "good"}>{escalated > 0 ? `${escalated} escalated` : "Within control"}</b>}</div>
          <label className="mandate-preset-v88"><span>Preset</span><select disabled={!employee} value={mandate.preset} onChange={(event) => { const value = event.target.value as MandatePreset; if (value !== "custom") action((state) => setExecutiveMandatePreset(state, role, value)); }}><option value="cautious">Cautious</option><option value="balanced">Balanced</option><option value="autonomous">Autonomous</option><option value="custom" disabled>Custom</option></select></label>
          <div className="mandate-permissions-v88">{MANDATE_PERMISSION_LABELS[role].map((permission) => <label key={permission.key}><input disabled={!employee} type="checkbox" checked={mandate.permissions.includes(permission.key)} onChange={() => action((state) => toggleExecutivePermission(state, role, permission.key))} /><span>{permission.label}</span></label>)}</div>
          <div className="mandate-limits-v88">
            <label><span>Spending limit</span><input disabled={!employee} type="number" step={25_000} min={0} value={mandate.spendLimit} onChange={(event) => action((state) => updateExecutiveMandateLimits(state, role, { spendLimit: Number(event.target.value) }))} /><small>{money.format(mandate.spendLimit)}</small></label>
            <label><span>Risk limit</span><input disabled={!employee} type="range" min={0} max={100} value={mandate.riskLimit} onChange={(event) => action((state) => updateExecutiveMandateLimits(state, role, { riskLimit: Number(event.target.value) }))} /><small>{mandate.riskLimit.toFixed(0)}/100</small></label>
          </div>
          <details className="mandate-escalation-v88"><summary>Always to CEO · {mandate.alwaysEscalate.length}</summary>{mandate.alwaysEscalate.map((item) => <span key={item}>{item}</span>)}</details>
          <div className="mandate-log-v88"><small>RECENT ACTIONS</small>{logs.length ? logs.map((log) => <div key={log.id}><strong>{log.title}</strong><span>{log.detail}</span><footer><em className={`mandate-outcome-v889 ${log.outcome}`}>{log.outcome}</em>{log.amount !== undefined && <b>{money.format(log.amount)}</b>}</footer></div>) : <p>No automatic actions reported yet.</p>}</div>
        </article>;
      })}</div>
    </section>

    <section className="panel department-overview-panel">
      <div className="panel-heading"><div><p className="eyebrow">DEPARTMENT OVERVIEW</p><h3>Capacity before individual profiles</h3></div><span className="status good">Monthly review</span></div>
      <div className="department-table"><div className="department-table-head"><span>Department</span><span>Leader</span><span>Headcount</span><span>Workload</span><span>Performance</span><span>Wellbeing</span><span>Status</span></div>
        {departments.map((department) => <div key={department.department}><span><strong>{department.department}</strong><small>{department.leaderRole ? `${department.leaderRole} accountable` : "Executive team"}</small></span><span>{department.leader?.name ?? (department.leaderRole ? "Vacant" : game.founderName)}</span><span>{department.headcount}</span><span>{department.workload.toFixed(0)}%</span><span>{department.performance.toFixed(0)}</span><span>{department.wellbeing.toFixed(0)}</span><span><b className={`department-status ${department.status}`}>{department.status}</b></span></div>)}
      </div>
    </section>

    <section className="workforce-detail-layout">
      <article className="panel employee-roster-panel">
        <div className="panel-heading"><div><p className="eyebrow">EMPLOYEE ROSTER</p><h3>Internal development and retention</h3></div></div>
        <div className="employee-roster-table"><div className="employee-roster-head"><span>Employee</span><span>Department</span><span>Performance</span><span>Workload</span><span>Wellbeing</span><span>Status</span></div>
          {game.employeeRoster.map((employee) => { const status = employeeStatus(employee); return <button key={employee.id} className={selected?.id === employee.id ? "selected" : ""} onClick={() => setSelectedId(employee.id)}><span><strong>{employee.name}</strong><small>{employee.executiveRole ? `${employee.executiveRole} · ` : ""}{employee.role}</small></span><span>{employeeDepartment(employee)}</span><span>{(employee.performance ?? employee.skill).toFixed(0)}</span><span>{(employee.workload ?? 75).toFixed(0)}%</span><span>{(employee.wellbeing ?? employee.energy).toFixed(0)}</span><span><b className={`employee-status ${status.key}`}>{status.label}</b></span></button>; })}
        </div>
      </article>
      {selected && <aside className="panel employee-detail-panel"><ProfileHeader employee={selected} label="EMPLOYEE PROFILE" /><div className="employee-detail-grid"><Metric label="Performance" value={`${(selected.performance ?? selected.skill).toFixed(0)}`} /><Metric label="Workload" value={`${(selected.workload ?? 75).toFixed(0)}%`} /><Metric label="Wellbeing" value={`${(selected.wellbeing ?? selected.energy).toFixed(0)}`} /><Metric label="Loyalty" value={`${selected.loyalty.toFixed(0)}`} /><Metric label="Potential" value={`${(selected.potential ?? selected.skill).toFixed(0)}`} /><Metric label="Quit risk" value={`${(selected.quitRisk ?? 0).toFixed(0)}%`} /></div><PersonStory employee={selected} />{!selected.executiveRole && selected.leadership >= 55 && <div className="employee-promotion-grid">{executiveRoles.map((role) => <button key={role} disabled={executiveRoleFit(selected, role) < 58} onClick={() => action((state) => appointExecutiveV5(state, selected.id, role))}><strong>Appoint {role}</strong><small>{executiveRoleFit(selected, role)}% fit</small></button>)}</div>}</aside>}
    </section>

    <section className="panel candidate-market-v88">
      <div className="panel-heading"><div><p className="eyebrow">LIVE TALENT MARKET</p><h3>Seeded candidates who come and go</h3><p>The same save produces the same people and histories. Availability, salary, loyalty, ambition and opinions differ.</p></div><span className="status">{game.candidatePool.length} available</span></div>
      <div className="candidate-market-layout-v88"><div className="candidate-list-v88">{candidates.map((candidate) => { const best = bestExecutiveRole(candidate); return <button key={candidate.id} className={selectedCandidate?.id === candidate.id ? "selected" : ""} onClick={() => setCandidateId(candidate.id)}><span>{candidate.name.split(" ").map((part) => part[0]).join("")}</span><div><strong>{candidate.name}</strong><small>{candidate.role} · {candidate.nationality}</small><em>{candidate.leadershipStyle} · {best.role} {best.fit}%</em></div><b>{money.format(candidate.salary)}/mo</b></button>; })}</div>
        {selectedCandidate && <aside className="candidate-detail-v88"><ProfileHeader employee={selectedCandidate} label="CANDIDATE DOSSIER" /><div className="employee-detail-grid"><Metric label="Skill" value={`${selectedCandidate.skill}`} /><Metric label="Leadership" value={`${selectedCandidate.leadership}`} /><Metric label="Loyalty" value={`${selectedCandidate.loyalty}`} /><Metric label="Ambition" value={`${selectedCandidate.ambition ?? 50}`} /><Metric label="Board relation" value={`${selectedCandidate.boardRelationship ?? 50}`} /><Metric label="Available until" value={`Day ${selectedCandidate.availableUntilDay ?? "—"}`} /></div><PersonStory employee={selectedCandidate} /><div className="candidate-actions-v88">{executiveRoles.map((role) => <button key={role} className={bestExecutiveRole(selectedCandidate).role === role ? "primary" : "secondary"} disabled={game.cash < selectedCandidate.salary * 2 || executiveRoleFit(selectedCandidate, role) < 58} onClick={() => action((state) => hireCandidateToRole(state, selectedCandidate.id, role))}>Hire as {role} · {executiveRoleFit(selectedCandidate, role)}%</button>)}</div></aside>}
      </div>
    </section>

    <section className="panel organisation-chart-panel"><div className="panel-heading"><div><p className="eyebrow">ORGANISATION</p><h3>Who owns what</h3></div></div><div className="organisation-chart"><div className="org-ceo"><strong>{game.founderName}</strong><small>CEO</small></div><div className="org-line" /><div className="org-executives">{executives.map(({ role, employee }) => <div key={role}><strong>{role}</strong><span>{employee?.name ?? "Vacant"}</span><small>{roleTitles[role]}</small></div>)}</div></div></section>
  </>;
}

function ProfileHeader({ employee, label }: { employee: EmployeeProfile; label: string }) { return <div className="employee-detail-head"><span>{employee.name.split(" ").map((part) => part[0]).join("")}</span><div><p className="eyebrow">{label}</p><h3>{employee.name}</h3><small>{employee.role} · {employee.leadershipStyle ?? employee.trait}</small></div></div>; }
function PersonStory({ employee }: { employee: EmployeeProfile }) { return <div className="person-story-v88"><div><small>STRENGTHS</small>{(employee.strengths ?? [employee.trait]).map((item) => <span key={item}>+ {item}</span>)}</div><div><small>WEAKNESSES</small>{(employee.weaknesses ?? []).map((item) => <span key={item}>− {item}</span>)}</div><div className="wide"><small>WORK HISTORY</small>{(employee.workHistory ?? [employee.role]).map((item) => <span key={item}>{item}</span>)}</div><div className="wide"><small>STRATEGIC VIEW</small><strong>{employee.strategyOpinion ?? "No stated position."}</strong></div></div>; }
function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
