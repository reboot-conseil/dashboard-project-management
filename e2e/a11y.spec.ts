import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Projets', path: '/projets' },
  { name: 'Activites', path: '/activites' },
  { name: 'Calendrier', path: '/calendrier' },
];

for (const { name, path } of PAGES) {
  test(`a11y: ${name} — zéro violation critical/serious`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-nextjs-scroll-focus-boundary]')
      .analyze();

    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalOrSerious.length > 0) {
      console.log(`\n[A11y] Violations sur ${name}:`);
      criticalOrSerious.forEach(v => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        v.nodes.slice(0, 2).forEach(n => console.log(`    → ${n.html.slice(0, 120)}`));
      });
    }

    expect(criticalOrSerious, `${criticalOrSerious.length} violation(s) found on ${name}`).toHaveLength(0);
  });
}

test('a11y: Projet detail — zéro violation critical/serious', async ({ page }) => {
  await page.goto('/projets');
  await page.waitForLoadState('networkidle');
  const premierLien = page.locator('a[href^="/projets/"]').first();
  if (await premierLien.count() === 0) {
    test.skip(true, 'No projects found');
    return;
  }
  const href = await premierLien.getAttribute('href');
  await page.goto(href!);
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('[data-nextjs-scroll-focus-boundary]')
    .analyze();

  const criticalOrSerious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );

  if (criticalOrSerious.length > 0) {
    console.log('\n[A11y] Violations sur Projet detail:');
    criticalOrSerious.forEach(v => {
      console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
      v.nodes.slice(0, 2).forEach(n => console.log(`    → ${n.html.slice(0, 120)}`));
    });
  }

  expect(criticalOrSerious, `${criticalOrSerious.length} violation(s) found on Projet detail`).toHaveLength(0);
});
