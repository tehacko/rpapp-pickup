import type { ResolveResponse } from '../../types.js';

export type OrderScreenState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loadFailed' }
  | { readonly kind: 'claimConflict'; readonly claimedByDeviceLabel: string | null }
  | { readonly kind: 'ready'; readonly order: ResolveResponse };

export function resolveOrderScreenState(
  loading: boolean,
  order: ResolveResponse | null,
  claimConflict: { claimedByDeviceLabel: string | null } | null,
): OrderScreenState {
  if (claimConflict !== null) {
    return {
      kind: 'claimConflict',
      claimedByDeviceLabel: claimConflict.claimedByDeviceLabel,
    };
  }
  if (loading) {
    return { kind: 'loading' };
  }
  if (order === null) {
    return { kind: 'loadFailed' };
  }
  return { kind: 'ready', order };
}
