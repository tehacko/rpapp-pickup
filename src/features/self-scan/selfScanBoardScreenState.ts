import type { SelfScanLiveBasketSummary } from './selfScanTypes.js';

export type SelfScanBoardScreenState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loadFailed' }
  | { readonly kind: 'ready'; readonly items: readonly SelfScanLiveBasketSummary[] };

export function resolveSelfScanBoardScreenState(
  loading: boolean,
  loadFailed: boolean,
  items: readonly SelfScanLiveBasketSummary[],
): SelfScanBoardScreenState {
  if (loading) {
    return { kind: 'loading' };
  }
  if (loadFailed) {
    return { kind: 'loadFailed' };
  }
  return { kind: 'ready', items };
}
