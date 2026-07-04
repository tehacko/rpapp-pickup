/**
 * Playwright helpers for pickup barcode assign E2E (BAR-PR-17).
 */
import type { Page } from '@playwright/test';

export async function gotoPickupBarcodeAssign(page: Page, tenantCode: string): Promise<void> {
  await page.goto(`/${tenantCode}/barcode-assign`);
}
