/**
 * Queue SLA aging from promisedPickupAt (no backend change).
 * Thresholds (overdue = now - promised ≥ 0):
 * - 0 < delta ≤ 5m → neutral + ago
 * - >5m and ≤15m → warn + overdue
 * - >15m → danger + urgency high + overdue
 * Future (delta < 0) → neutral + in
 */

export type QueueAgeTone = 'neutral' | 'warn' | 'danger';

export interface QueueAgeInfo {
  readonly tone: QueueAgeTone;
  readonly urgency?: 'high';
  /** i18n-ready relative label key params */
  readonly overdueMinutes: number | null;
  readonly minutesUntil: number | null;
  readonly labelKind: 'hidden' | 'in' | 'ago' | 'overdue';
}

const WARN_MS = 5 * 60_000;
const DANGER_MS = 15 * 60_000;

export function computeQueueAge(
  promisedPickupAt: string | null,
  nowMs: number = Date.now(),
): QueueAgeInfo {
  if (promisedPickupAt === null || promisedPickupAt.trim().length === 0) {
    return {
      tone: 'neutral',
      overdueMinutes: null,
      minutesUntil: null,
      labelKind: 'hidden',
    };
  }
  const promisedMs = Date.parse(promisedPickupAt);
  if (!Number.isFinite(promisedMs)) {
    return {
      tone: 'neutral',
      overdueMinutes: null,
      minutesUntil: null,
      labelKind: 'hidden',
    };
  }
  const delta = nowMs - promisedMs;
  if (delta < 0) {
    const minutesUntil = Math.max(1, Math.ceil(-delta / 60_000));
    return {
      tone: 'neutral',
      overdueMinutes: null,
      minutesUntil,
      labelKind: 'in',
    };
  }
  const overdueMinutes = Math.max(1, Math.floor(delta / 60_000));
  if (delta > DANGER_MS) {
    return {
      tone: 'danger',
      urgency: 'high',
      overdueMinutes,
      minutesUntil: null,
      labelKind: 'overdue',
    };
  }
  if (delta > WARN_MS) {
    return {
      tone: 'warn',
      overdueMinutes,
      minutesUntil: null,
      labelKind: 'overdue',
    };
  }
  return {
    tone: 'neutral',
    overdueMinutes,
    minutesUntil: null,
    labelKind: 'ago',
  };
}

/** Relative age string for list rows (null when age slot should hide). */
export function formatQueueAgeLabel(info: QueueAgeInfo): string | null {
  if (info.labelKind === 'hidden') {
    return null;
  }
  if (info.labelKind === 'in' && info.minutesUntil !== null) {
    return `in ${String(info.minutesUntil)}m`;
  }
  if (info.labelKind === 'ago' && info.overdueMinutes !== null) {
    return `${String(info.overdueMinutes)}m ago`;
  }
  if (info.labelKind === 'overdue' && info.overdueMinutes !== null) {
    return `${String(info.overdueMinutes)}m overdue`;
  }
  return null;
}
