import { test, expect } from '@playwright/test';

test.describe('Activités — flux création', () => {
  test('saisie rapide crée une activité et la liste se met à jour', async ({ page }) => {
    await page.goto('/activites');

    // Wait for the page to fully load (API calls for consultants + projets)
    await page.waitForLoadState('networkidle');

    // The saisie-rapide form must be visible
    const form = page.getByTestId('saisie-rapide');
    await expect(form).toBeVisible();

    // Check if consultants and projets are loaded (non-empty options exist)
    const consultantSelect = page.locator('#saisie-consultant');
    const projetSelect = page.locator('#saisie-projet');

    await expect(consultantSelect).toBeVisible();
    await expect(projetSelect).toBeVisible();

    // Count non-placeholder options for consultant
    const consultantOptions = await consultantSelect.locator('option:not([value=""])').count();
    if (consultantOptions === 0) {
      test.skip(true, 'Aucun consultant dans la base — seed manquant');
      return;
    }

    // Count non-placeholder options for projet
    const projetOptions = await projetSelect.locator('option:not([value=""])').count();
    if (projetOptions === 0) {
      test.skip(true, 'Aucun projet dans la base — seed manquant');
      return;
    }

    // Select the first non-empty consultant option
    const firstConsultantValue = await consultantSelect
      .locator('option:not([value=""])')
      .first()
      .getAttribute('value');
    await consultantSelect.selectOption(firstConsultantValue!);

    // Select the first non-empty projet option
    const firstProjetValue = await projetSelect
      .locator('option:not([value=""])')
      .first()
      .getAttribute('value');
    await projetSelect.selectOption(firstProjetValue!);

    // Wait for etapes to load (the select transitions from disabled to enabled)
    const etapeSelect = page.locator('#saisie-etape');
    await expect(etapeSelect).toBeEnabled({ timeout: 5000 });

    // Fill in hours
    const heuresInput = page.locator('#saisie-heures');
    await heuresInput.fill('8');

    // Record existing row count before saving
    const activitesList = page.getByTestId('activites-list');
    await expect(activitesList).toBeVisible();

    // Count rows currently present (may be 0 if list shows "empty" state)
    const rowsBefore = await page.locator('[data-testid^="row-"]').count();

    // Click the submit button
    const btnEnregistrer = page.getByTestId('btn-enregistrer');
    await expect(btnEnregistrer).toBeVisible();
    await expect(btnEnregistrer).toBeEnabled();
    await btnEnregistrer.click();

    // Wait for the success toast or for the list to refresh
    // The page calls fetchActivites() after a successful POST
    await page.waitForLoadState('networkidle');

    // The activites table should now have at least one row (either new or existing)
    // We verify the new row appeared: row count increased OR the table is now visible
    // (it was possibly showing the "empty" state before)
    const activitesTable = page.getByTestId('activites-table');
    await expect(activitesTable).toBeVisible({ timeout: 10000 });

    const rowsAfter = await page.locator('[data-testid^="row-"]').count();
    expect(rowsAfter).toBeGreaterThan(rowsBefore);

    // Also verify the totaux section is visible (confirms data loaded)
    await expect(page.getByTestId('totaux')).toBeVisible();
    await expect(page.getByTestId('total-heures')).toBeVisible();
  });

  test('page activites se charge avec le formulaire saisie-rapide', async ({ page }) => {
    await page.goto('/activites');
    await page.waitForLoadState('networkidle');

    // Basic structural checks
    await expect(page.getByTestId('saisie-rapide')).toBeVisible();
    await expect(page.getByTestId('activites-list')).toBeVisible();
    await expect(page.getByTestId('btn-enregistrer')).toBeVisible();

    // The submit button should be visible (though possibly disabled if form incomplete)
    const btn = page.getByTestId('btn-enregistrer');
    await expect(btn).toBeVisible();
  });
});
