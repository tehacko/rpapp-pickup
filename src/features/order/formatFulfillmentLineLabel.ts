/**
 * G17 — human-readable fulfillment line label for staff A11 / line panels.
 */
import type { FulfillmentLine } from '../../types.js';

export function formatFulfillmentLineLabel(
  line: Pick<FulfillmentLine, 'lineId' | 'productName' | 'variantName'>,
  fallbackPrefix = 'Line'
): string {
  const product = line.productName?.trim() ?? '';
  const variant = line.variantName?.trim() ?? '';
  if (product.length > 0 && variant.length > 0) {
    return `${product} — ${variant}`;
  }
  if (product.length > 0) {
    return product;
  }
  if (variant.length > 0) {
    return variant;
  }
  return `${fallbackPrefix} #${line.lineId}`;
}
