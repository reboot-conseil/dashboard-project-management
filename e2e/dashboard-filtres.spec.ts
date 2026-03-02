import { test, expect } from '@playwright/test';

test.describe('Flux: Filtres Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('le dashboard se charge avec les onglets et les filtres de période visibles', async ({ page }) => {
    // TabsTrigger renders a plain <button> (no role="tab" in the custom Tabs implementation)
    await expect(page.getByRole('button', { name: /Opérationnel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Consultants/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Stratégique/i })).toBeVisible();

    // Period filter buttons rendered by DashboardFilters
    await expect(page.getByRole('button', { name: 'Cette semaine' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ce mois' })).toBeVisible();

    // No crash — still on home URL
    await expect(page).toHaveURL('/');
  });

  test('changer la période via les boutons de filtre ne provoque pas de crash', async ({ page }) => {
    // "Cette semaine" is the default — click "Ce mois" to change period
    const ceMoisBtn = page.getByRole('button', { name: 'Ce mois' });
    await expect(ceMoisBtn).toBeVisible();
    await ceMoisBtn.click();

    // Page must stay stable after filter change
    await expect(page).toHaveURL('/');
    await expect(page).not.toHaveURL(/error/);

    // Click "Ce trimestre" as well
    const ceTrimestreBtn = page.getByRole('button', { name: 'Ce trimestre' });
    await expect(ceTrimestreBtn).toBeVisible();
    await ceTrimestreBtn.click();

    await expect(page).toHaveURL('/');
  });

  test('localStorage dashboard-operationnel-filters est valide JSON après interaction', async ({ page }) => {
    // Click a period button to trigger saveFilters()
    await page.getByRole('button', { name: 'Ce mois' }).click();

    // Wait briefly for the save to propagate
    await page.waitForTimeout(200);

    const filtersValue = await page.evaluate(() => {
      return localStorage.getItem('dashboard-operationnel-filters');
    });

    // After clicking a period, the key should be set
    expect(filtersValue).not.toBeNull();

    // Must be valid JSON
    expect(() => JSON.parse(filtersValue!)).not.toThrow();

    const parsed = JSON.parse(filtersValue!);

    // Must have the expected shape from DashboardFiltersValue
    expect(parsed).toHaveProperty('periode');
    expect(parsed).toHaveProperty('dateDebut');
    expect(parsed).toHaveProperty('dateFin');
    expect(parsed.periode).toBe('month');
  });
});
