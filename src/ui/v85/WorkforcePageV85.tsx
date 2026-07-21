import { useMemo, useState } from "react";
import { employeeDepartment, getWorkforceDepartments } from "../../game/engine";
import { assignEmployeeToBranch, trainEmployee } from "../../game/v84/gameplay";
import type { EmployeeProfile, GameState } from "../../game/types";
import type { GameAction } from "../common";
import { money } from "../format";

function employeeStatus(employee: EmployeeProfile) {
  const workload = employee.workload ?? 75;
  const wellbeing = employee.wellbeing ?? employee.energy;
  if (workload > 110 || wellbeing < 45) return { key: "risk", label: "At risk", reason: "Unsustainable workload or low wellbeing" };
  if (workload > 92 || wellbeing < 62) return { key: "pressure", label: "Under pressure", reason: "Workload is above the healthy range" };
  if ((employee.performance ?? employee.skill) > 82) return { key: "strong", label: "High performer", reason: "Strong performance across the current role" };
  return { key: "steady", label: "Stable", reason: "Performance and wellbeing are within normal range" };
}

export function WorkforcePageV85({ game, action }: { game: GameState; action: GameAction }) {
  const workforce = game.employeeRoster.filter((employee) => !employee.executiveRole);
  const [selectedId, setSelectedId] = useState(workforce[0]?.id ?? "");
  const [filter, setFilter] = useState("all");
  const selected = workforce.find((employee) => employee.id === selectedId) ?? workforce[0];
  const visible = workforce.filter((employee) => filter === "all" ? true : filter === "central" ? !employee.assignedBranchId : employee.assignedBranchId === filter);
  const departments = getWorkforceDepartments({ ...game, employeeRoster: workforce });
  const annualPayroll = workforce.reduce((sum, employee) => sum + employee.salary, 0);
  const monthlyPayroll = annualPayroll / 12;
  const averagePerformance = workforce.reduce((sum, employee) => sum + (employee.performance ?? employee.skill), 0) / Math.max(1, workforce.length);
  const averageWellbeing = workforce.reduce((sum, employee) => sum + (employee.wellbeing ?? employee.energy), 0) / Math.max(1, workforce.length);
  const retentionRisk = workforce.filter((employee) => employee.loyalty < 50 || (employee.wellbeing ?? employee.energy) < 45).length;
  const selectedBranch = selected?.assignedBranchId ? game.branchOffices.find((branch) => branch.id === selected.assignedBranchId) : undefined;
  const selectedStatus = selected ? employeeStatus(selected) : undefined;

  const branchSummary = useMemo(() => game.branchOffices.map((branch) => {
    const employees = workforce.filter((employee) => employee.assignedBranchId === branch.id || employee.id === branch.managerId);
    return { branch, employees, workload: employees.reduce((sum, employee) => sum + (employee.workload ?? 75), 0) / Math.max(1, employees.length) };
  }), [game.branchOffices, workforce]);

  return <>
    <section className="workforce-hero panel"><div><p className="eyebrow">WORKFORCE</p><h2>Develop the people who operate branches and central teams</h2><p>Executives now live on their own page. This workspace is for advisers, analysts, specialists and branch managers.</p></div><div className="workforce-health"><strong>{Math.round(averageWellbeing)}</strong><span>workforce wellbeing</span></div></section>

    <section className="workforce-kpi-row"><Metric label="Employees" value={`${workforce.length}`} /><Metric label="Monthly payroll" value={money.format(monthlyPayroll)} /><Metric label="Average performance" value={averagePerformance.toFixed(0)} /><Metric label="Retention risk" value={`${retentionRisk}`} tone={retentionRisk > 0 ? "warning" : "positive"} /><Metric label="Branches staffed" value={`${branchSummary.filter((item) => item.employees.length > 0).length}/${game.branchOffices.length}`} /></section>

    <section className="panel branch-workforce-summary"><div className="panel-heading"><div><p className="eyebrow">LOCAL TEAMS</p><h3>Who works where</h3><p>Each branch should have enough advisers and operational support to serve its customers and process routine lending.</p></div></div><div className="branch-workforce-grid">{branchSummary.map(({ branch, employees, workload }) => <button key={branch.id} onClick={() => setFilter(branch.id)}><div><strong>{branch.name}</strong><small>{employees.length} assigned · {workload.toFixed(0)}% average workload</small></div><span className={employees.length === 0 ? "negative" : workload > 95 ? "warning" : "positive"}>{employees.length === 0 ? "Unstaffed" : workload > 95 ? "Pressure" : "Staffed"}</span></button>)}</div></section>

    <section className="workforce-detail-layout">
      <article className="panel employee-roster-panel"><div className="panel-heading"><div><p className="eyebrow">EMPLOYEE ROSTER</p><h3>Role, workplace, capacity and development</h3></div></div><div className="workforce-filter-row"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All employees</button><button className={filter === "central" ? "selected" : ""} onClick={() => setFilter("central")}>Central teams</button>{game.branchOffices.map((branch) => <button key={branch.id} className={filter === branch.id ? "selected" : ""} onClick={() => setFilter(branch.id)}>{branch.name}</button>)}</div><div className="employee-roster-table employee-roster-v84"><div className="employee-roster-head"><span>Employee</span><span>Workplace</span><span>Performance</span><span>Workload</span><span>Wellbeing</span><span>Status</span></div>{visible.map((employee) => { const status = employeeStatus(employee); const branch = employee.assignedBranchId ? game.branchOffices.find((item) => item.id === employee.assignedBranchId) : undefined; return <button key={employee.id} className={selected?.id === employee.id ? "selected" : ""} onClick={() => setSelectedId(employee.id)}><span><strong>{employee.name}</strong><small>{employee.role}</small></span><span><strong>{branch?.name ?? "Central team"}</strong><small>{employeeDepartment(employee)}</small></span><span>{(employee.performance ?? employee.skill).toFixed(0)}</span><span>{(employee.workload ?? 75).toFixed(0)}%</span><span>{(employee.wellbeing ?? employee.energy).toFixed(0)}</span><span><b className={`employee-status ${status.key}`} title={status.reason}>{status.label}</b></span></button>; })}</div></article>

      {selected && selectedStatus && <aside className="panel employee-detail-panel"><div className="employee-detail-head"><span>{selected.name.split(" ").map((part) => part[0]).join("")}</span><div><p className="eyebrow">EMPLOYEE PROFILE</p><h3>{selected.name}</h3><small>{selected.role} · {selectedBranch?.name ?? employeeDepartment(selected)}</small></div></div><div className="employee-detail-grid"><Metric label="Performance" value={(selected.performance ?? selected.skill).toFixed(0)} /><Metric label="Workload" value={`${(selected.workload ?? 75).toFixed(0)}%`} /><Metric label="Wellbeing" value={(selected.wellbeing ?? selected.energy).toFixed(0)} /><Metric label="Loyalty" value={selected.loyalty.toFixed(0)} /><Metric label="Potential" value={(selected.potential ?? selected.skill).toFixed(0)} /><Metric label="Annual salary" value={money.format(selected.salary)} /></div><div className="employee-accountability"><small>ACCOUNTABILITY</small><strong>{selectedBranch ? `Assigned to ${selectedBranch.name}.` : `Works in the central ${employeeDepartment(selected)} team.`}</strong><p>{selectedStatus.reason}. {selected.trait}.</p></div><div className="employee-real-actions"><label><span><strong>Workplace</strong><small>Move the employee between branches or the central pool.</small></span><select value={selected.assignedBranchId ?? ""} onChange={(event) => action((state) => assignEmployeeToBranch(state, selected.id, event.target.value || null))}><option value="">Central pool</option>{game.branchOffices.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><button className="secondary" disabled={game.cash < 18_000} onClick={() => action((state) => trainEmployee(state, selected.id))}>Development training · {money.format(18_000)}</button></div></aside>}
    </section>

    <section className="panel department-overview-panel"><div className="panel-heading"><div><p className="eyebrow">CENTRAL CAPACITY</p><h3>Specialist teams outside the executive group</h3></div></div><div className="department-table"><div className="department-table-head"><span>Department</span><span>Leader</span><span>Headcount</span><span>Workload</span><span>Performance</span><span>Wellbeing</span><span>Status</span></div>{departments.filter((department) => department.department !== "Executive").map((department) => <div key={department.department}><span><strong>{department.department}</strong><small>Specialist capacity</small></span><span>{department.leader?.name ?? "No named lead"}</span><span>{department.headcount}</span><span>{department.workload.toFixed(0)}%</span><span>{department.performance.toFixed(0)}</span><span>{department.wellbeing.toFixed(0)}</span><span><b className={`department-status ${department.status}`}>{department.status}</b></span></div>)}</div></section>
  </>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) { return <span className={tone}><small>{label}</small><strong>{value}</strong></span>; }
