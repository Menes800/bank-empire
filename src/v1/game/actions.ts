import { EXPANSION_OPPORTUNITIES, formatMonthKey } from './config';
import { createExpansionBranch } from './createGame';
import { simulateNextMonth } from './simulateMonth';
import type {
  BranchMandate,
  GameState,
  InboxItem,
  LendingPolicy,
  StaffingPolicy,
} from './types';

const updateBranch = (
  state: GameState,
  branchId: string,
  updater: (branch: GameState['branches'][number]) => GameState['branches'][number],
): GameState => ({
  ...state,
  branches: state.branches.map((branch) => (branch.id === branchId ? updater(branch) : branch)),
});

export const setBankLendingPolicy = (
  state: GameState,
  lendingPolicy: LendingPolicy,
): GameState => ({ ...state, lendingPolicy });

export const setBranchMandate = (
  state: GameState,
  branchId: string,
  mandate: BranchMandate,
): GameState => updateBranch(state, branchId, (branch) => ({ ...branch, mandate }));

export const setBranchStaffingPolicy = (
  state: GameState,
  branchId: string,
  staffingPolicy: StaffingPolicy,
): GameState => updateBranch(state, branchId, (branch) => ({ ...branch, staffingPolicy }));

export const adjustBranchMarketing = (
  state: GameState,
  branchId: string,
  change: number,
): GameState => updateBranch(state, branchId, (branch) => ({
  ...branch,
  localMarketingBudget: Math.min(120_000, Math.max(0, branch.localMarketingBudget + change)),
}));

export const advanceMonths = (state: GameState, months: number): GameState => {
  let next = state;
  for (let index = 0; index < months; index += 1) next = simulateNextMonth(next);
  return next;
};

export const openExpansionBranch = (state: GameState, opportunityId: string): GameState => {
  const opportunity = EXPANSION_OPPORTUNITIES.find((entry) => entry.id === opportunityId);
  if (!opportunity || state.branches.some((branch) => branch.id === opportunity.branchId)) return state;
  if (state.cash < opportunity.openingCost) return state;

  const branch = createExpansionBranch(opportunity, state.branches.length);
  const monthKey = formatMonthKey(state.date.year, state.date.month);
  const inboxItem: InboxItem = {
    id: `opened-${opportunity.id}-${monthKey}`,
    monthKey,
    kind: 'report',
    title: `${opportunity.name} er åpnet`,
    body: 'Det lokale teamet er på plass. Filialen starter med vekstmandat og normal bemanningsfullmakt, men du kan justere rammene når som helst.',
    branchId: branch.id,
    read: false,
  };

  return {
    ...state,
    cash: state.cash - opportunity.openingCost,
    equity: state.equity - Math.round(opportunity.openingCost * 0.15),
    branches: [...state.branches, branch],
    inbox: [inboxItem, ...state.inbox].slice(0, 30),
  };
};