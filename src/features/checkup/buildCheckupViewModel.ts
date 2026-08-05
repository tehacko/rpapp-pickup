import type { ShrinkageReason } from 'pi-kiosk-shared/contracts/inventory';
import type {
  CheckupConflictState,
  CheckupLineDraft,
  CheckupResumeCandidate,
} from './checkupTypes.js';

export interface CheckupLineViewModel {
  readonly lineId: string;
  readonly productId: number;
  readonly variantId: number | null;
  readonly label: string;
  readonly expectedQuantity: number;
  readonly expectedStockOnHold: number;
  readonly countedQuantity: number;
  readonly shrinkageReason: ShrinkageReason | null;
  readonly mismatch: 'match' | 'short' | 'over' | 'uncounted';
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
  readonly lines: readonly CheckupLineViewModel[];
  readonly buckets: CheckupSummaryBuckets;
  readonly applyEnabled: boolean;
  readonly conflict: CheckupConflictState | null;
  readonly overrideReason: string;
  readonly overrideVisible: boolean;
  readonly overrideSubmitEnabled: boolean;
  readonly resumeCandidates: readonly CheckupResumeCandidate[];
  readonly resumeChoiceVisible: boolean;
  readonly selectedResumeId: string | null;
}

function classifyLine(line: CheckupLineDraft): CheckupLineViewModel['mismatch'] {
  if (line.countedQuantity === null) {
    return 'uncounted';
  }
  if (line.countedQuantity === line.expectedQuantity) {
    return 'match';
  }
  if (line.countedQuantity < line.expectedQuantity) {
    return 'short';
  }
  return 'over';
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
}): CheckupViewModel {
  const lines: CheckupLineViewModel[] = input.draft.lines.map((line) => {
    const mismatch = classifyLine(line);
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

  const incompleteReasons = lines.some((l) => l.needsShrinkageReason);
  const hasUncounted = buckets.uncounted > 0;
  const overrideVisible =
    input.canOverrideHoldFloor &&
    (input.conflict?.kind === 'STOCK_MOVED' || input.conflict?.kind === 'BELOW_HOLD');
  const overrideSubmitEnabled =
    overrideVisible &&
    input.isOnline &&
    input.overrideReason.trim().length > 0 &&
    !input.applying &&
    !input.refreshing;

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
    lines,
    buckets,
    applyEnabled:
      input.isOnline &&
      started &&
      lines.length > 0 &&
      !hasUncounted &&
      !incompleteReasons &&
      !input.applying &&
      !input.refreshing,
    conflict: input.conflict,
    overrideReason: input.overrideReason,
    overrideVisible,
    overrideSubmitEnabled,
    resumeCandidates: input.resumeCandidates,
    resumeChoiceVisible: !started && input.resumeCandidates.length > 0,
    selectedResumeId: input.selectedResumeId,
  };
}
