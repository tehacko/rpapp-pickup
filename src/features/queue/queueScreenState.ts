import type { QueueItem } from '../../types.js';

export type QueueScreenState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loadFailed' }
  | { readonly kind: 'ready'; readonly items: readonly QueueItem[] };

export function resolveQueueScreenState(
  loading: boolean,
  loadFailed: boolean,
  items: readonly QueueItem[],
): QueueScreenState {
  if (loading) {
    return { kind: 'loading' };
  }
  if (loadFailed) {
    return { kind: 'loadFailed' };
  }
  return { kind: 'ready', items };
}
