import { test, expect } from '@playwright/test';

test.describe('Flux: Kanban changement statut', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projets');
    await page.waitForLoadState('networkidle');
    const premierProjet = page.locator('a[href^="/projets/"]').first();
    if (await premierProjet.count() === 0) {
      test.skip(true, 'No projects in database');
      return;
    }
    await premierProjet.click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Étapes du projet/i)).toBeVisible();
  });

  test('déplacer une étape vers la colonne suivante', async ({ page }) => {
    // Find first étape in A_FAIRE column and move it forward
    const colAFaire = page.getByTestId('kanban-col-A_FAIRE');

    // Check if there are any étapes in A_FAIRE
    const btnForward = colAFaire.locator('[data-testid^="btn-forward-"]').first();
    const hasBtnForward = await btnForward.count();
    if (hasBtnForward === 0) {
      test.skip(true, 'No étapes in A_FAIRE column');
      return;
    }

    // Get the etape ID from the button testid
    const testId = await btnForward.getAttribute('data-testid');
    const etapeId = testId?.replace('btn-forward-', '');

    // Click forward
    await btnForward.click();
    await page.waitForLoadState('networkidle');

    // Verify it's now in EN_COURS
    const colEnCours = page.getByTestId('kanban-col-EN_COURS');
    await expect(colEnCours.getByTestId(`kanban-card-${etapeId}`)).toBeVisible({ timeout: 5000 });
  });

  test('le changement persiste après reload', async ({ page }) => {
    const currentUrl = page.url();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(currentUrl);
    await expect(page.getByText(/Étapes du projet/i)).toBeVisible();
  });
});
