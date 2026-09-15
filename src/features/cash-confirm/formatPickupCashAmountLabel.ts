import { isCurrencyCode, type CurrencyCode } from 'pi-kiosk-shared';

/**
 * Format minor units for staff one-tap cash confirm labels (Stage 2 §7).
 * Displays the API/session currency — never force CZK when another code is provided.
 */
export function formatPickupCashAmountLabel(
  amountMinor: number | null | undefined,
  currency: string | null | undefined,
  fallbackLabel: string,
): string {
  if (amountMinor == null || amountMinor <= 0) {
    return fallbackLabel;
  }
  const major = Math.round(amountMinor / 100);
  const trimmed = currency?.trim() ?? '';
  const code: CurrencyCode | string = isCurrencyCode(trimmed) ? trimmed : trimmed || 'CZK';
  if (code === 'CZK') {
    return `${major} Kč`;
  }
  return `${(amountMinor / 100).toFixed(2)} ${code}`;
}
