import type { QueueItem } from '../../types.js';
import {
  computeQueueAge,
  formatQueueAgeLabel,
  type QueueAgeTone,
} from './queueAging.js';

export type PickupPointTabId = number | 'none';
export type ActivePickupPointFilter = 'all' | PickupPointTabId;

export interface QueuePickupPointTab {
  readonly id: PickupPointTabId;
  readonly label: string;
  readonly count?: number;
}

export interface QueueItemClaimBadge {
  readonly deviceLabel: string;
  readonly isClaimedByCurrentDevice: boolean;
  readonly expiresSoon: boolean;
}

export interface QueueItemAgeView {
  readonly tone: QueueAgeTone;
  readonly urgency?: 'high';
  readonly labelKind: 'hidden' | 'in' | 'ago' | 'overdue';
  readonly minutes: number | null;
}

export interface QueueListItemViewModel {
  readonly fulfillmentId: number;
  readonly status: string;
  readonly pickupPointName: string | null;
  readonly claimBadge: QueueItemClaimBadge | null;
  /** Nested age details (labelKind / minutes) for i18n remapping. */
  readonly age: QueueItemAgeView | null;
  /** Flat aging tone for StatusBadge / row urgency (`null` = hide age slot). */
  readonly ageTone: QueueAgeTone | null;
  /** Relative age string (`null` when promisedPickupAt missing/invalid). */
  readonly ageLabel: string | null;
}

export interface QueuePageUiState {
  readonly activePickupPointId: ActivePickupPointFilter;
  readonly errorMessage: string | null;
  readonly showOfflineRetryBanner: boolean;
  readonly showPickupPointTabs: boolean;
  readonly lastUpdatedAt: number | null;
}

export interface QueuePageViewModel {
  readonly tabs: readonly QueuePickupPointTab[];
  readonly activePickupPointId: ActivePickupPointFilter;
  readonly items: readonly QueueListItemViewModel[];
  readonly isEmpty: boolean;
  readonly errorMessage: string | null;
  readonly showOfflineRetryBanner: boolean;
  readonly showPickupPointTabs: boolean;
  readonly lastUpdatedAt: number | null;
}

export function isQueueClaimActive(
  claimExpiresAt: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (claimExpiresAt === null) {
    return false;
  }
  const expires = Date.parse(claimExpiresAt);
  return Number.isFinite(expires) && expires > nowMs;
}

export function buildQueueItemClaimBadge(
  item: QueueItem,
  currentDeviceLabel: string | null,
  expiresSoonWindowMs: number = 60_000,
  nowMs: number = Date.now(),
): QueueItemClaimBadge | null {
  const deviceLabel = item.claimedByDeviceLabel?.trim() ?? '';
  if (
    deviceLabel.length > 0 &&
    isQueueClaimActive(item.claimExpiresAt, nowMs)
  ) {
    const expiresAtMs = Date.parse(item.claimExpiresAt ?? '');
    const normalizedCurrentDeviceLabel = currentDeviceLabel?.trim() ?? '';
    const isClaimedByCurrentDevice =
      normalizedCurrentDeviceLabel.length > 0 && normalizedCurrentDeviceLabel === deviceLabel;
    const expiresSoon =
      Number.isFinite(expiresAtMs) && expiresAtMs - nowMs <= Math.max(expiresSoonWindowMs, 0);
    return { deviceLabel, isClaimedByCurrentDevice, expiresSoon };
  }
  return null;
}

export function buildPickupPointTabs(
  items: readonly QueueItem[],
  unassignedLabel: string,
): QueuePickupPointTab[] {
  const tabs = new Map<PickupPointTabId, { label: string; count: number }>();
  for (const item of items) {
    if (item.pickupPointId === null) {
      const existing = tabs.get('none');
      tabs.set('none', {
        label: unassignedLabel,
        count: (existing?.count ?? 0) + 1,
      });
    } else {
      const existing = tabs.get(item.pickupPointId);
      tabs.set(item.pickupPointId, {
        label: item.pickupPointName ?? String(item.pickupPointId),
        count: (existing?.count ?? 0) + 1,
      });
    }
  }
  return Array.from(tabs.entries()).map(([id, value]) => ({
    id,
    label: value.label,
    count: value.count,
  }));
}

export function filterQueueItems(
  items: readonly QueueItem[],
  activePickupPointId: ActivePickupPointFilter,
): QueueItem[] {
  if (activePickupPointId === 'all') {
    return [...items];
  }
  if (activePickupPointId === 'none') {
    return items.filter((item) => item.pickupPointId === null);
  }
  return items.filter((item) => item.pickupPointId === activePickupPointId);
}

export function buildQueueListItemViewModels(
  items: readonly QueueItem[],
  currentDeviceLabel: string | null,
  nowMs: number = Date.now(),
): QueueListItemViewModel[] {
  return items.map((item) => {
    const ageInfo = computeQueueAge(item.promisedPickupAt, nowMs);
    const ageLabel = formatQueueAgeLabel(ageInfo);
    let age: QueueItemAgeView | null = null;
    let ageTone: QueueAgeTone | null = null;
    if (ageInfo.labelKind !== 'hidden' && ageLabel !== null) {
      const minutes =
        ageInfo.overdueMinutes !== null ? ageInfo.overdueMinutes : ageInfo.minutesUntil;
      age = {
        tone: ageInfo.tone,
        urgency: ageInfo.urgency,
        labelKind: ageInfo.labelKind,
        minutes,
      };
      ageTone = ageInfo.tone;
    }
    return {
      fulfillmentId: item.fulfillmentId,
      status: item.status,
      pickupPointName: item.pickupPointName,
      claimBadge: buildQueueItemClaimBadge(item, currentDeviceLabel, undefined, nowMs),
      age,
      ageTone,
      ageLabel,
    };
  });
}

export function buildQueuePageViewModel(
  items: readonly QueueItem[],
  ui: QueuePageUiState,
  labels: { unassignedPickupPoint: string },
  currentDeviceLabel: string | null,
  nowMs: number = Date.now(),
): QueuePageViewModel {
  const tabs = buildPickupPointTabs(items, labels.unassignedPickupPoint);
  const filtered = filterQueueItems(items, ui.activePickupPointId);
  const listItems = buildQueueListItemViewModels(filtered, currentDeviceLabel, nowMs);
  return {
    tabs,
    activePickupPointId: ui.activePickupPointId,
    items: listItems,
    isEmpty: listItems.length === 0,
    errorMessage: ui.errorMessage,
    showOfflineRetryBanner: ui.showOfflineRetryBanner,
    showPickupPointTabs: ui.showPickupPointTabs,
    lastUpdatedAt: ui.lastUpdatedAt,
  };
}
