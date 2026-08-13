import type { ShrinkageReason } from 'pi-kiosk-shared/contracts/inventory';
import {
  applyExpectedCounts,
  classifyCheckupMismatch,
  type CheckupLineFilterId,
  type CheckupMismatch,
} from './checkupBulk.js';
import type {
  CheckupConflictState,
  CheckupLineDraft,
  CheckupResumeCandidate,
} from './checkupTypes.js';

export type { CheckupLineFilterId, CheckupMismatch };

export interface CheckupLineViewModel {
  readonly lineId: string;
  readonly productId: number;
  readonly variantId: number | null;
  readonly label: string;
  readonly expectedQuantity: number;
  readonly expectedStockOnHold: number;
  readonly countedQuantity: number;
  readonly shrinkageReason: ShrinkageReason | null;
  readonly mismatch: CheckupMismatch;
  readonly needsShrinkageReason: boolean;
}

export interface CheckupSummaryBuckets {
  readonly matched: number;
  readonly short: number;
  readonly over: number;
  readonly uncounted: number;
}

export interface CheckupViewModel {
  readonly tenantCode: string;
  readonly canResupply: boolean;
  /** Hold-floor / moved override entitlement (not resupply-only). */
  readonly canOverrideHoldFloor: boolean;
  readonly isOnline: boolean;
  readonly offlineApplyBlocked: boolean;
  readonly statusMessage: string | null;
  readonly statusTone: 'neutral' | 'success' | 'danger' | 'warn';
  readonly started: boolean;
  readonly starting: boolean;
  readonly applying: boolean;
  readonly refreshing: boolean;
  readonly lineCount: number;
  readonly visibleLineCount: number;
  readonly lines: readonly CheckupLineViewModel[];
  readonly visibleLines: readonly CheckupLineViewModel[];
  readonly lineFilter: CheckupLineFilterId;
  readonly selectedLineIds: readonly string[];
  readonly selectedCount: number;
  readonly allVisibleSelected: boolean;
  readonly buckets: CheckupSummaryBuckets;
  readonly bulkBusy: boolean;
  readonly acceptRemainingEnabled: boolean;
  readonly setVisibleExpectedEnabled: boolean;
  readonly acceptSelectedEnabled: boolean;
  readonly applyEnabled: boolean;
  readonly conflict: CheckupConflictState | null;
  readonly overrideReason: string;
  readonly overrideVisible: boolean;
  readonly overrideSubmitEnabled: boolean;
  readonly resumeCandidates: readonly CheckupResumeCandidate[];
  readonly resumeChoiceVisible: boolean;
  readonly selectedResumeId: string | null;
}

export function buildCheckupViewModel(input: {
  tenantCode: string;
  canResupply: boolean;
  /** Gates override UI — requires hold_floor_override capability, not resupply alone. */
  canOverrideHoldFloor: boolean;
  isOnline: boolean;
  statusMessage: string | null;
  statusTone: CheckupViewModel['statusTone'];
  draft: {
    serverCheckupId: string | null;
    status: string;
    lines: readonly CheckupLineDraft[];
  };
  starting: boolean;
  applying: boolean;
  refreshing: boolean;
  conflict: CheckupConflictState | null;
  overrideReason: string;
  resumeCandidates: readonly CheckupResumeCandidate[];
  selectedResumeId: string | null;
  lineFilter?: CheckupLineFilterId;
  selectedLineIds?: readonly string[];
  bulkSyncing?: boolean;
}): CheckupViewModel {
  const lineFilter = input.lineFilter ?? 'all';
  const validLineIds = new Set(input.draft.lines.map((line) => line.lineId));
  const selectedLineIds = (input.selectedLineIds ?? []).filter((id) => validLineIds.has(id));
  const bulkSyncing = input.bulkSyncing ?? false;
  const selectedSet = new Set(selectedLineIds);
  const lines: CheckupLineViewModel[] = input.draft.lines.map((line) => {
    const mismatch = classifyCheckupMismatch(line);
    const counted = line.countedQuantity ?? 0;
    return {
      lineId: line.lineId,
      productId: line.productId,
      variantId: line.variantId,
      label: line.productLabel,
      expectedQuantity: line.expectedQuantity,
      expectedStockOnHold: line.expectedStockOnHold,
      countedQuantity: counted,
      shrinkageReason: line.shrinkageReason,
      mismatch,
      needsShrinkageReason: mismatch === 'short' && line.shrinkageReason === null,
    };
  });

  const buckets: CheckupSummaryBuckets = {
    matched: lines.filter((l) => l.mismatch === 'match').length,
    short: lines.filter((l) => l.mismatch === 'short').length,
    over: lines.filter((l) => l.mismatch === 'over').length,
    uncounted: lines.filter((l) => l.mismatch === 'uncounted').length,
  };

  const started =
    input.draft.serverCheckupId !== null &&
    (input.draft.status === 'IN_PROGRESS' || input.draft.lines.length > 0);

  const visibleLines =
    lineFilter === 'all' ? lines : lines.filter((line) => line.mismatch === lineFilter);
  const incompleteReasons = lines.some((l) => l.needsShrinkageReason);
  const hasUncounted = buckets.uncounted > 0;
  const bulkBusy = bulkSyncing || input.applying || input.refreshing;
  const visibleExpectedChanges = applyExpectedCounts(
    input.draft.lines,
    new Set(visibleLines.map((line) => line.lineId)),
  ).changed.length;
  const selectedExpectedChanges = applyExpectedCounts(
    input.draft.lines,
    selectedSet,
  ).changed.length;
  const allVisibleSelected =
    visibleLines.length > 0 && visibleLines.every((line) => selectedSet.has(line.lineId));
  const overrideVisible =
    input.canOverrideHoldFloor &&
    (input.conflict?.kind === 'STOCK_MOVED' || input.conflict?.kind === 'BELOW_HOLD');
  const overrideSubmitEnabled =
    overrideVisible &&
    input.isOnline &&
    input.overrideReason.trim().length > 0 &&
    !input.applying &&
    !input.refreshing &&
    !bulkSyncing;

  return {
    tenantCode: input.tenantCode,
    canResupply: input.canResupply,
    canOverrideHoldFloor: input.canOverrideHoldFloor,
    isOnline: input.isOnline,
    offlineApplyBlocked: !input.isOnline,
    statusMessage: input.statusMessage,
    statusTone: input.statusTone,
    started,
    starting: input.starting,
    applying: input.applying,
    refreshing: input.refreshing,
    lineCount: lines.length,
    visibleLineCount: visibleLines.length,
    lines,
    visibleLines,
    lineFilter,
    selectedLineIds,
    selectedCount: selectedLineIds.length,
    allVisibleSelected,
    buckets,
    bulkBusy,
    acceptRemainingEnabled: started && !bulkBusy && hasUncounted,
    setVisibleExpectedEnabled: started && !bulkBusy && visibleExpectedChanges > 0,
    acceptSelectedEnabled: started && !bulkBusy && selectedExpectedChanges > 0,
    applyEnabled:
      input.isOnline &&
      started &&
      lines.length > 0 &&
      !hasUncounted &&
      !incompleteReasons &&
      !input.applying &&
      !input.refreshing &&
      !bulkSyncing,
    conflict: input.conflict,
    overrideReason: input.overrideReason,
    overrideVisible,
    overrideSubmitEnabled,
    resumeCandidates: input.resumeCandidates,
    resumeChoiceVisible: !started && input.resumeCandidates.length > 0,
    selectedResumeId: input.selectedResumeId,
  };
}
