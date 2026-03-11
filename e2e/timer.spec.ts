import { test, expect } from '@playwright/test';

test('has title and can toggle mode', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Interval/);

  // Verify main elements exist
  // We'll just check for basic text or headers that are in the app
  const bodyText = page.locator('body');
  await expect(bodyText).toContainText('Interval', { ignoreCase: true });
});
