import type { GameState } from "../types";
import { stageProgress } from "./gameplay";

export type AdvisorInsight = {
  id: string;
  severity: "critical" | "warning" | "opportunity" | "info";
  title: string;
  message: string;
  page: string;
};

export function getAdvisorInsights(state: GameState): AdvisorInsight[] {
  const insights: AdvisorInsight[] = [];
  const add = (insight: AdvisorInsight) => {
    if (!state.dismissedAdvisorIds.includes(insight.id)) insights.push(insight);
  };

  if (state.liquidityRatio < 18) add({ id: "low-liquidity", severity: "critical", title: "Liquidity needs immediate action", message: `Liquidity is ${state.liquidityRatio.toFixed(1)}%. Slow lending, raise funding or improve deposit pricing before the run-risk accelerates.`, page: "risk" });
  else if (state.liquidityRatio < 25) add({ id: "tight-liquidity", severity: "warning", title: "Growth is consuming liquidity", message: `At the current balance-sheet mix, the bank is approaching its internal liquidity buffer. Review Treasury before approving several large loans.`, page: "risk" });

  if (state.capitalRatio < 12.5) add({ id: "capital-breach", severity: "critical", title: "Capital ratio below target", message: `The capital ratio is ${state.capitalRatio.toFixed(1)}%. Reduce risk-weighted lending or raise new equity.`, page: "risk" });
  if (state.customers > state.branchOffices.reduce((sum, branch) => sum + branch.capacity, 0) + state.digitalLevel * 20) add({ id: "capacity", severity: "warning", title: "Customer capacity is stretched", message: "Service demand now exceeds branch and digital capacity. Start an expansion project or improve the mobile bank.", page: "network" });
  if (!state.employeeRoster.some((employee) => employee.executiveRole)) add({ id: "leadership-gap", severity: "opportunity", title: "The founder is carrying every mandate", message: "Hire a senior candidate and appoint the first executive. Executives unlock automation and improve project delivery.", page: "leadership" });
  if (state.loanApplications.length >= 3) add({ id: "credit-queue", severity: "warning", title: "Credit decisions are waiting", message: `${state.loanApplications.length} large applications are awaiting a decision. Delays reduce relationship quality and can cost business.`, page: "clients" });
  if (state.projects.length === 0 && state.cash > 2_000_000) add({ id: "idle-capital", severity: "opportunity", title: "Capital is available for a project", message: "The bank has no active strategic projects. Consider a branch, mobile-bank upgrade or core-system programme.", page: "network" });
  if (state.digitalLevel < 45 && state.customerSegments.find((segment) => segment.key === "students")?.churnRisk && state.customerSegments.find((segment) => segment.key === "students")!.churnRisk > 22) add({ id: "digital-churn", severity: "warning", title: "Young customers expect a better app", message: "Students and young professionals show elevated churn risk. A mobile-bank project would improve channel fit.", page: "network" });
  if (state.reports.length === 0 && state.day > 30) add({ id: "first-report", severity: "info", title: "Your first management report is ready soon", message: "Open Board & Reports after month-end to understand earnings, balance-sheet growth and budget variance.", page: "reports" });
  if (state.nplRatio > 4) add({ id: "npl-rise", severity: "warning", title: "Problem loans are rising", message: `The NPL ratio has reached ${state.nplRatio.toFixed(2)}%. Tighten policy, build reserves and review delinquent cases.`, page: "clients" });

  const progress = stageProgress(state);
  if (progress.progress >= 78 && progress.stage !== "empire") add({ id: `stage-${progress.stage}`, severity: "opportunity", title: "The next campaign stage is close", message: `You are ${progress.progress}% through the ${progress.stage} stage. Focus on customers, branches, reputation and digital capability to unlock the next tier.`, page: "campaign" });

  return insights.sort((a, b) => {
    const order = { critical: 0, warning: 1, opportunity: 2, info: 3 };
    return order[a.severity] - order[b.severity];
  }).slice(0, 5);
}

export function nextBestAction(state: GameState): AdvisorInsight {
  return getAdvisorInsights(state)[0] ?? {
    id: "steady-course",
    severity: "info",
    title: "The bank is on a stable course",
    message: "Advance one week, monitor competitors and prepare the next growth investment.",
    page: "overview",
  };
}
