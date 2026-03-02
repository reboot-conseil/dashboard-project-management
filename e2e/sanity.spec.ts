import { test, expect } from '@playwright/test';

test('page dashboard se charge', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PM Dashboard/);
});
