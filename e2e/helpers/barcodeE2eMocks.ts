import type { Page } from '@playwright/test';

export async function mockTurnstileDisabled(page: Page): Promise<void> {
  await page.route((url) => url.href.includes('turnstile-config'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { enabled: false } }),
    });
  });
}
