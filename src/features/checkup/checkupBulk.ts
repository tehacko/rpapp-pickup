import type { CheckupLineDraft } from './checkupTypes.js';

export const CHECKUP_LINE_FILTER_IDS = [
  'all',
  'uncounted',
  'short',
  'over',
  'match',
] as const;

export type CheckupLineFilterId = (typeof CHECKUP_LINE_FILTER_IDS)[number];

export type CheckupMismatch = 'match' | 'short' | 'over' | 'uncounted';

export function isCheckupLineFilterId(value: string): value is CheckupLineFilterId {
  return (CHECKUP_LINE_FILTER_IDS as readonly string[]).includes(value);
}

export function classifyCheckupMismatch(
  line: Pick<CheckupLineDraft, 'countedQuantity' | 'expectedQuantity'>,
): CheckupMismatch {
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

export function applyExpectedCounts(
  lines: readonly CheckupLineDraft[],
  lineIds: ReadonlySet<string>,
): { nextLines: CheckupLineDraft[]; changed: CheckupLineDraft[] } {
  const changed: CheckupLineDraft[] = [];
  const nextLines = lines.map((line) => {
    if (!lineIds.has(line.lineId)) {
      return line;
    }
    const next: CheckupLineDraft = {
      ...line,
      countedQuantity: line.expectedQuantity,
      shrinkageReason: null,
    };
    const unchanged =
      line.countedQuantity === next.countedQuantity &&
      line.shrinkageReason === next.shrinkageReason;
    if (unchanged) {
      return line;
    }
    changed.push(next);
    return next;
  });
  return { nextLines, changed };
}

export function uncountedLineIds(lines: readonly CheckupLineDraft[]): readonly string[] {
  return lines
    .filter((line) => line.countedQuantity === null)
    .map((line) => line.lineId);
}

export function lineIdsMatchingFilter(
  lines: readonly CheckupLineDraft[],
  filter: CheckupLineFilterId,
): readonly string[] {
  if (filter === 'all') {
    return lines.map((line) => line.lineId);
  }
  return lines
    .filter((line) => classifyCheckupMismatch(line) === filter)
    .map((line) => line.lineId);
}
