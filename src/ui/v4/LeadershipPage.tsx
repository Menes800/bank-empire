import { useMemo, useState } from "react";
import {
  appointExecutiveV5,
  bestExecutiveRole,
  employeeDepartment,
  executiveRoleFit,
  getWorkforceDepartments,
  hireCandidateToRole,
  setManagementControl,
} from "../../game/engine";
import type { ExecutiveRole, GameState, ManagementArea, ManagementControlMode } from "../../game/store";
import type { EmployeeDepartment, EmployeeProfile } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

const executiveRoles: ExecutiveRole[] = ["CFO", "COO", "CRO", "CMO", "CTO"];
const modes: ManagementControlMode[] = ["automatic", "major", "manual"];
const managementAreas: { area: ManagementArea; title: string; role: ExecutiveRole; detail: string }[] = [
  { area: "operations", title: "Branches & workforce", role: "COO", detail: "Branch managers, staffing, service capacity and operating projects." },
  { area: "lending", title: "Credit & collections", role: "CRO", detail: "Routine lending, arrears, payment plans and collections." },
  { area: "treasury", title: "Finance & treasury", role: "CFO", detail: "Liquidity, capital buffers, funding and normal balance-sheet actions." },
  { area: "marketing", title: "Customers & competition", role: "CMO", detail: "Campaigns, segment pressure and routine competitor responses." },
];

const roleTitles: Record<ExecutiveRole, string> = {
  CFO: "Finance & Treasury",
  COO: "Operations & Branches",
  CRO: "Risk & Credit",
  CMO: "Customers & Growth",
  CTO: "Technology & Cyber",
};

const modeCopy: Record<ManagementControlMode, string> = {
  automatic: "Management handles routine work and normal capacity decisions within budget.",
  major: "Management acts normally but asks before material investments, hires or risk decisions.",
  manual: "The area waits for CEO instructions and creates more inbox work.",
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
  const selected = game.employeeRoster.find((employee) => employee.id === selectedId) ?? game.employeeRoster[0];
  const totalPayroll = game.employeeRoster.reduce((sum, employee) => sum + employee.salary, 0);
  const averagePerformance = game.employeeRoster.reduce((sum, employee) => sum + (employee.performance ?? employee.skill), 0) / Math.max(1, game.employeeRoster.length);
  const averageWellbeing = game.employeeRoster.reduce((sum, employee) => sum + (employee.wellbeing ?? employee.energy), 0) / Math.max(1, game.employeeRoster.length);
  const overloaded = departments.filter((department) => department.status === "overloaded").length;
  const retentionRisk = game.employeeRoster.filter((employee) => employee.loyalty < 50 || (employee.wellbeing ?? employee.energy) < 45).length;
  const executives = executiveRoles.map((role) => ({ role, employee: game.employeeRoster.find((item) => item.executiveRole === role) }));
  const topCandidates = useMemo(() => [...game.candidatePool].sort((a, b) => bestExecutiveRole(b).fit - bestExecutiveRole(a).fit).slice(0, 4), [game.candidatePool]);

  return <>
    <section className="workforce-hero panel">
      <div><p className="eyebrow">WORKFORCE</p><h2>Build the leadership team. Let management run the bank.</h2><p>Workload and performance are calculated from the actual bank. Executives handle normal staffing, branch operations and specialist work according to your control settings.</p></div>
      <div className="workforce-health"><strong>{Math.round(averageWellbeing)}</strong><span>workforce wellbeing</span></div>
    </section>

    <section className="workforce-kpi-row">
      <Metric label="Employees" value={`${game.employeeRoster.length}`} />
      <Metric label="Monthly payroll" value={money.format(totalPayroll)} />
      <Metric label="Average performance" value={`${averagePerformance.toFixed(0)}`} tone={averagePerformance >= 72 ? "positive" : "warning"} />
      <Metric label="Overloaded teams" value={`${overloaded}`} tone={overloaded > 0 ? "warning" : "positive"} />
      <Metric label="Retention risk" value={`${retentionRisk}`} tone={retentionRisk > 0 ? "warning" : "positive"} />
    </section>

    <section className="panel department-overview-panel">
      <div className="panel-heading"><div><p className="eyebrow">DEPARTMENT OVERVIEW</p><h3>Capacity before individual profiles</h3></div><span className="status good">Monthly review</span></div>
      <div className="department-table">
        <div className="department-table-head"><span>Department</span><span>Leader</span><span>Headcount</span><span>Workload</span><span>Performance</span><span>Wellbeing</span><span>Status</span></div>
        {departments.map((department) => <div key={department.department}>
          <span><strong>{department.department}</strong><small>{department.leaderRole ? `${department.leaderRole} accountable` : "Executive team"}</small></span>
          <span>{department.leader?.name ?? (department.leaderRole ? "Vacant" : game.founderName)}</span>
          <span>{department.headcount}</span>
          <span>{department.workload.toFixed(0)}%</span>
          <span>{department.performance.toFixed(0)}</span>
          <span>{department.wellbeing.toFixed(0)}</span>
          <span><b className={`department-status ${department.status}`}>{department.status}</b></span>
        </div>)}
      </div>
    </section>

    <section className="management-control-section panel">
      <div className="panel-heading"><div><p className="eyebrow">CONTROL LEVEL</p><h3>One rule per management area</h3><p>Default is “Ask for major decisions”: normal work continues, while material choices still reach you.</p></div></div>
      <div className="management-control-grid">{managementAreas.map(({ area, title, role, detail }) => {
        const executive = game.employeeRoster.find((employee) => employee.executiveRole === role);
        const current = game.managementControl[area];
        return <article key={area}>
          <div><span>{role}</span><section><strong>{title}</strong><small>{executive ? `Managed by ${executive.name}` : `Requires ${role}`}</small></section></div>
          <p>{detail}</p>
          <div className="three-mode-control">{modes.map((mode) => <button key={mode} disabled={!executive && mode !== "manual"} className={current === mode ? "selected" : ""} title={modeCopy[mode]} onClick={() => action((state) => setManagementControl(state, area, mode))}>{mode === "major" ? "Ask major" : mode}</button>)}</div>
          <small className="mode-explanation">{modeCopy[current]}</small>
        </article>;
      })}</div>
    </section>

    <section className="executive-team-panel panel">
      <div className="panel-heading"><div><p className="eyebrow">EXECUTIVE TEAM</p><h3>Clear ownership across the bank</h3></div><span className="status good">{executives.filter((item) => item.employee).length}/5 filled</span></div>
      <div className="compact-executive-grid">{executives.map(({ role, employee }) => <article key={role} className={employee ? "filled" : "vacant"}>
        <span>{role}</span><div><strong>{roleTitles[role]}</strong><small>{employee?.name ?? "Vacant mandate"}</small></div>{employee && <b>{executiveRoleFit(employee, role)}% fit</b>}
      </article>)}</div>
    </section>

    <section className="workforce-detail-layout">
      <article className="panel employee-roster-panel">
        <div className="panel-heading"><div><p className="eyebrow">EMPLOYEE ROSTER</p><h3>Roles, workload and performance</h3></div></div>
        <div className="employee-roster-table">
          <div className="employee-roster-head"><span>Employee</span><span>Department</span><span>Performance</span><span>Workload</span><span>Wellbeing</span><span>Status</span></div>
          {game.employeeRoster.map((employee) => { const status = employeeStatus(employee); return <button key={employee.id} className={selected?.id === employee.id ? "selected" : ""} onClick={() => setSelectedId(employee.id)}>
            <span><strong>{employee.name}</strong><small>{employee.executiveRole ? `${employee.executiveRole} · ` : ""}{employee.role}</small></span>
            <span>{employeeDepartment(employee)}</span>
            <span>{(employee.performance ?? employee.skill).toFixed(0)}</span>
            <span>{(employee.workload ?? 75).toFixed(0)}%</span>
            <span>{(employee.wellbeing ?? employee.energy).toFixed(0)}</span>
            <span><b className={`employee-status ${status.key}`}>{status.label}</b></span>
          </button>; })}
        </div>
      </article>

      {selected && <aside className="panel employee-detail-panel">
        <div className="employee-detail-head"><span>{selected.name.split(" ").map((part) => part[0]).join("")}</span><div><p className="eyebrow">EMPLOYEE PROFILE</p><h3>{selected.name}</h3><small>{selected.role} · {employeeDepartment(selected)}</small></div></div>
        <div className="employee-detail-grid"><Metric label="Performance" value={`${(selected.performance ?? selected.skill).toFixed(0)}`} /><Metric label="Workload" value={`${(selected.workload ?? 75).toFixed(0)}%`} /><Metric label="Wellbeing" value={`${(selected.wellbeing ?? selected.energy).toFixed(0)}`} /><Metric label="Loyalty" value={`${selected.loyalty.toFixed(0)}`} /><Metric label="Potential" value={`${(selected.potential ?? selected.skill).toFixed(0)}`} /><Metric label="Salary" value={`${money.format(selected.salary)}/mo`} /></div>
        <div className="employee-accountability"><small>ACCOUNTABILITY</small><strong>{selected.executiveRole ? `${selected.executiveRole} owns ${roleTitles[selected.executiveRole]}.` : selected.assignedBranchId ? `Assigned to ${game.branchOffices.find((branch) => branch.id === selected.assignedBranchId)?.name ?? "a branch"}.` : `Works in ${employeeDepartment(selected)}.`}</strong><p>{selected.trait}</p></div>
        {!selected.executiveRole && selected.leadership >= 55 && <div className="employee-promotion-grid">{executiveRoles.map((role) => <button key={role} disabled={executiveRoleFit(selected, role) < 58} onClick={() => action((state) => appointExecutiveV5(state, selected.id, role))}><strong>Appoint {role}</strong><small>{executiveRoleFit(selected, role)}% fit</small></button>)}</div>}
      </aside>}
    </section>

    <section className="panel talent-recommendations-panel">
      <div className="panel-heading"><div><p className="eyebrow">TALENT RECOMMENDATIONS</p><h3>Hire only when the organisation needs it</h3></div><span className="status">{game.candidatePool.length} available</span></div>
      <div className="talent-recommendation-grid">{topCandidates.map((candidate) => { const best = bestExecutiveRole(candidate); return <article key={candidate.id}>
        <div><span>{candidate.name.split(" ").map((part) => part[0]).join("")}</span><section><strong>{candidate.name}</strong><small>{candidate.role} · {candidate.trait}</small></section></div>
        <p>Best current fit: <b>{best.role} {best.fit}%</b></p>
        <button className="primary small" disabled={game.cash < candidate.salary * 2 || best.fit < 58} onClick={() => action((state) => hireCandidateToRole(state, candidate.id, best.role))}>Hire as {best.role}</button>
      </article>; })}</div>
    </section>

    <section className="panel organisation-chart-panel">
      <div className="panel-heading"><div><p className="eyebrow">ORGANISATION</p><h3>Who owns what</h3></div></div>
      <div className="organisation-chart"><div className="org-ceo"><strong>{game.founderName}</strong><small>CEO</small></div><div className="org-line" /><div className="org-executives">{executives.map(({ role, employee }) => <div key={role}><strong>{role}</strong><span>{employee?.name ?? "Vacant"}</span><small>{roleTitles[role]}</small></div>)}</div></div>
    </section>
  </>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
