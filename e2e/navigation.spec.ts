import { test, expect } from '@playwright/test';

test.describe('Flux: Navigation', () => {
  test('dashboard charge sans erreur', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/PM Dashboard/);
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('hydration') // Next.js hydration warnings are non-critical
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('naviguer vers la liste des projets', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Click the "Projets" nav link in the sidebar
    await page.getByRole('link', { name: /^Projets$/i }).first().click();
    await expect(page).toHaveURL(/\/projets/);
  });

  test('ouvrir un projet depuis la liste', async ({ page }) => {
    await page.goto('/projets');
    await page.waitForLoadState('networkidle');
    // Find first project link
    const premierProjet = page.locator('a[href^="/projets/"]').first();
    const count = await premierProjet.count();
    if (count === 0) {
      test.skip(true, 'No projects in database');
      return;
    }
    const href = await premierProjet.getAttribute('href');
    await premierProjet.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    // The project detail page should show the Kanban board heading
    await expect(page.getByText(/Étapes du projet/i)).toBeVisible();
  });
});
