/** Format minor units as whole Kč for staff one-tap cash confirm labels (Stage 2 §7). */
export function formatPickupCashAmountLabel(
  amountMinor: number | null | undefined,
  currency: string | null | undefined,
  fallbackLabel: string,
): string {
  if (amountMinor == null || amountMinor <= 0) {
    return fallbackLabel;
  }
  const major = Math.round(amountMinor / 100);
  const code = currency?.trim() || 'CZK';
  if (code === 'CZK') {
    return `${major} Kč`;
  }
  return `${(amountMinor / 100).toFixed(2)} ${code}`;
}
