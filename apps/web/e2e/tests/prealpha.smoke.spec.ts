import { expect, test } from '@playwright/test';

const seedEmail = process.env.PREALPHA_SEED_EMAIL ?? 'prealpha.admin@example.com';
const seedPassword = process.env.PREALPHA_SEED_PASSWORD ?? 'prealpha-admin';

test.describe('prealpha smoke test', () => {
  test('logs in and reaches the dashboard with seeded data', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    await page.getByLabel('Email').fill(seedEmail);
    await page.getByLabel('Password').fill(seedPassword);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Modulübersicht' })).toBeVisible();

    const kundenCount = page.getByLabel('Kunden Gesamtzahl');
    const hundeCount = page.getByLabel('Hunde Gesamtzahl');
    const kurseCount = page.getByLabel('Kurse Gesamtzahl');

    await expect(kundenCount).not.toHaveText('0');
    await expect(hundeCount).not.toHaveText('0');
    await expect(kurseCount).not.toHaveText('0');

    await expect(page.getByRole('status', { name: 'Dashboard wird geladen…' })).toBeHidden({ timeout: 10_000 });
  });
});
