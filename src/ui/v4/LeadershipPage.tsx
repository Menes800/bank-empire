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
import { assignEmployeeToBranch, trainEmployee } from "../../game/v84/gameplay";
import type { ExecutiveRole, GameState, ManagementArea, ManagementControlMode } from "../../game/store";
import type { EmployeeProfile } from "../../game/types";
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
  if (workload > 110 || wellbeing < 45) return { key: "risk", label: "At risk", reason: "Unsustainable workload or low wellbeing" };
  if (workload > 92 || wellbeing < 62) return { key: "pressure", label: "Under pressure", reason: "Workload is above the healthy range" };
  if ((employee.performance ?? employee.skill) > 82) return { key: "strong", label: "High performer", reason: "Strong performance across the current role" };
  return { key: "steady", label: "Stable", reason: "Performance and wellbeing are within normal range" };
}

export function LeadershipPage({ game, action }: { game: GameState; action: GameAction }) {
  const departments = getWorkforceDepartments(game);
  const [selectedId, setSelectedId] = useState(game.employeeRoster[0]?.id ?? "");
  const [filter, setFilter] = useState("all");
  const selected = game.employeeRoster.find((employee) => employee.id === selectedId) ?? game.employeeRoster[0];
  const totalAnnualPayroll = game.employeeRoster.reduce((sum, employee) => sum + employee.salary, 0);
  const monthlyPayroll = totalAnnualPayroll / 12;
  const averagePerformance = game.employeeRoster.reduce((sum, employee) => sum + (employee.performance ?? employee.skill), 0) / Math.max(1, game.employeeRoster.length);
  const averageWellbeing = game.employeeRoster.reduce((sum, employee) => sum + (employee.wellbeing ?? employee.energy), 0) / Math.max(1, game.employeeRoster.length);
  const overloaded = departments.filter((department) => department.status === "overloaded").length;
  const retentionRisk = game.employeeRoster.filter((employee) => employee.loyalty < 50 || (employee.wellbeing ?? employee.energy) < 45).length;
  const executives = executiveRoles.map((role) => ({ role, employee: game.employeeRoster.find((item) => item.executiveRole === role) }));
  const vacantExecutiveRoles = executives.filter((item) => !item.employee).map((item) => item.role);
  const topCandidates = useMemo(() => [...game.candidatePool].sort((a, b) => bestExecutiveRole(b).fit - bestExecutiveRole(a).fit).slice(0, 4), [game.candidatePool]);

  const visibleEmployees = game.employeeRoster.filter((employee) => {
    if (filter === "all") return true;
    if (filter === "central") return !employee.assignedBranchId;
    return employee.assignedBranchId === filter;
  });

  const selectedBranch = selected?.assignedBranchId ? game.branchOffices.find((branch) => branch.id === selected.assignedBranchId) : undefined;
  const selectedStatus = selected ? employeeStatus(selected) : undefined;

  return <>
    <section className="workforce-hero panel">
      <div><p className="eyebrow">WORKFORCE</p><h2>People belong to real branches and teams</h2><p>Executives own specialist areas. Branch managers own local advisers, service capacity and ordinary customer work.</p></div>
      <div className="workforce-health"><strong>{Math.round(averageWellbeing)}</strong><span>workforce wellbeing</span></div>
    </section>

    <section className="workforce-kpi-row">
      <Metric label="Employees" value={`${game.employeeRoster.length}`} />
      <Metric label="Monthly payroll" value={money.format(monthlyPayroll)} />
      <Metric label="Annual payroll" value={money.format(totalAnnualPayroll)} />
      <Metric label="Average performance" value={`${averagePerformance.toFixed(0)}`} tone={averagePerformance >= 72 ? "positive" : "warning"} />
      <Metric label="Retention risk" value={`${retentionRisk}`} tone={retentionRisk > 0 ? "warning" : "positive"} />
    </section>

    <section className="executive-team-panel panel">
      <div className="panel-heading"><div><p className="eyebrow">EXECUTIVE TEAM</p><h3>Clear ownership across the bank</h3></div><span className="status good">{executives.filter((item) => item.employee).length}/5 filled</span></div>
      <div className="compact-executive-grid">{executives.map(({ role, employee }) => <article key={role} className={employee ? "filled" : "vacant"}>
        <span>{role}</span><div><strong>{roleTitles[role]}</strong><small>{employee?.name ?? "Vacant mandate"}</small></div>{employee && <b>{executiveRoleFit(employee, role)}% fit</b>}
      </article>)}</div>
    </section>

    <section className="management-control-section panel">
      <div className="panel-heading"><div><p className="eyebrow">CONTROL LEVEL</p><h3>One rule per management area</h3><p>Normal work should continue without filling the CEO inbox.</p></div></div>
      <div className="management-control-grid">{managementAreas.map(({ area, title, role, detail }) => {
        const executive = game.employeeRoster.find((employee) => employee.executiveRole === role);
        const current = game.managementControl[area];
        return <article key={area}><div><span>{role}</span><section><strong>{title}</strong><small>{executive ? `Managed by ${executive.name}` : `Requires ${role}`}</small></section></div><p>{detail}</p><div className="three-mode-control">{modes.map((mode) => <button key={mode} disabled={!executive && mode !== "manual"} className={current === mode ? "selected" : ""} title={modeCopy[mode]} onClick={() => action((state) => setManagementControl(state, area, mode))}>{mode === "major" ? "Ask major" : mode}</button>)}</div><small className="mode-explanation">{modeCopy[current]}</small></article>;
      })}</div>
    </section>

    <section className="workforce-detail-layout">
      <article className="panel employee-roster-panel">
        <div className="panel-heading"><div><p className="eyebrow">EMPLOYEE ROSTER</p><h3>Roles, branch, workload and performance</h3></div><span className={overloaded > 0 ? "status warn" : "status good"}>{overloaded > 0 ? `${overloaded} overloaded` : "Controlled"}</span></div>
        <div className="workforce-filter-row"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All employees</button><button className={filter === "central" ? "selected" : ""} onClick={() => setFilter("central")}>Central teams</button>{game.branchOffices.map((branch) => <button key={branch.id} className={filter === branch.id ? "selected" : ""} onClick={() => setFilter(branch.id)}>{branch.name}</button>)}</div>
        <div className="employee-roster-table employee-roster-v84">
          <div className="employee-roster-head"><span>Employee</span><span>Workplace</span><span>Performance</span><span>Workload</span><span>Wellbeing</span><span>Status</span></div>
          {visibleEmployees.map((employee) => { const status = employeeStatus(employee); const branch = employee.assignedBranchId ? game.branchOffices.find((item) => item.id === employee.assignedBranchId) : undefined; return <button key={employee.id} className={selected?.id === employee.id ? "selected" : ""} onClick={() => setSelectedId(employee.id)}>
            <span><strong>{employee.name}</strong><small>{employee.executiveRole ? `${employee.executiveRole} · ` : ""}{employee.role}</small></span>
            <span><strong>{branch?.name ?? "Central team"}</strong><small>{employeeDepartment(employee)}</small></span>
            <span>{(employee.performance ?? employee.skill).toFixed(0)}</span>
            <span>{(employee.workload ?? 75).toFixed(0)}%</span>
            <span>{(employee.wellbeing ?? employee.energy).toFixed(0)}</span>
            <span><b className={`employee-status ${status.key}`} title={status.reason}>{status.label}</b></span>
          </button>; })}
        </div>
      </article>

      {selected && selectedStatus && <aside className="panel employee-detail-panel">
        <div className="employee-detail-head"><span>{selected.name.split(" ").map((part) => part[0]).join("")}</span><div><p className="eyebrow">EMPLOYEE PROFILE</p><h3>{selected.name}</h3><small>{selected.role} · {selectedBranch?.name ?? employeeDepartment(selected)}</small></div></div>
        <div className="employee-detail-grid"><Metric label="Performance" value={`${(selected.performance ?? selected.skill).toFixed(0)}`} /><Metric label="Workload" value={`${(selected.workload ?? 75).toFixed(0)}%`} /><Metric label="Wellbeing" value={`${(selected.wellbeing ?? selected.energy).toFixed(0)}`} /><Metric label="Loyalty" value={`${selected.loyalty.toFixed(0)}`} /><Metric label="Potential" value={`${(selected.potential ?? selected.skill).toFixed(0)}`} /><Metric label="Annual salary" value={money.format(selected.salary)} /></div>
        <div className="employee-accountability"><small>ACCOUNTABILITY</small><strong>{selected.executiveRole ? `${selected.executiveRole} owns ${roleTitles[selected.executiveRole]}.` : selectedBranch ? `Assigned to ${selectedBranch.name}.` : `Works in the central ${employeeDepartment(selected)} team.`}</strong><p>{selectedStatus.reason}. {selected.trait}.</p></div>
        {!selected.executiveRole && <div className="employee-real-actions"><label><span><strong>Workplace</strong><small>Move the employee between local branches or the central pool.</small></span><select value={selected.assignedBranchId ?? ""} onChange={(event) => action((state) => assignEmployeeToBranch(state, selected.id, event.target.value || null))}><option value="">Central pool</option>{game.branchOffices.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><button className="secondary" disabled={game.cash < 18_000} onClick={() => action((state) => trainEmployee(state, selected.id))}>Development training · {money.format(18_000)}</button></div>}
        {!selected.executiveRole && selected.leadership >= 55 && vacantExecutiveRoles.length > 0 && <div className="employee-promotion-grid">{vacantExecutiveRoles.map((role) => <button key={role} disabled={executiveRoleFit(selected, role) < 58} onClick={() => action((state) => appointExecutiveV5(state, selected.id, role))}><strong>Appoint {role}</strong><small>{executiveRoleFit(selected, role)}% fit</small></button>)}</div>}
        {!selected.executiveRole && vacantExecutiveRoles.length === 0 && <div className="all-roles-filled"><strong>Executive team is complete</strong><p>Develop this employee as a successor or move them to the branch where their skills are most useful.</p></div>}
      </aside>}
    </section>

    {game.candidatePool.length > 0 && <section className="panel talent-recommendations-panel">
      <div className="panel-heading"><div><p className="eyebrow">TALENT RECOMMENDATIONS</p><h3>Hire only when the organisation needs it</h3></div><span className="status">{game.candidatePool.length} available</span></div>
      <div className="talent-recommendation-grid">{topCandidates.map((candidate) => { const best = bestExecutiveRole(candidate); return <article key={candidate.id}><div><span>{candidate.name.split(" ").map((part) => part[0]).join("")}</span><section><strong>{candidate.name}</strong><small>{candidate.role} · {candidate.trait}</small></section></div><p>Best current fit: <b>{best.role} {best.fit}%</b></p><button className="primary small" disabled={game.cash < candidate.salary * 2 || best.fit < 58 || !vacantExecutiveRoles.includes(best.role)} onClick={() => action((state) => hireCandidateToRole(state, candidate.id, best.role))}>Hire as {best.role}</button></article>; })}</div>
    </section>}

    <section className="panel organisation-chart-panel organisation-chart-v84">
      <div className="panel-heading"><div><p className="eyebrow">ORGANISATION</p><h3>Who owns what</h3></div></div>
      <div className="organisation-chart"><div className="org-ceo"><strong>{game.founderName}</strong><small>CEO</small></div><div className="org-line" /><div className="org-executives">{executives.map(({ role, employee }) => <div key={role}><strong>{role}</strong><span>{employee?.name ?? "Vacant"}</span><small>{roleTitles[role]}</small></div>)}</div></div>
    </section>
  </>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
