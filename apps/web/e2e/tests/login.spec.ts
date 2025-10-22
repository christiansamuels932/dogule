import { expect, test } from '@playwright/test';

import { MOCK_USER, VALID_CREDENTIALS, handlers } from '../msw/handlers';
import { installMockRoutes } from '../msw/mockService';

test.beforeEach(async ({ page }) => {
  await installMockRoutes(page, handlers);
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test('allows a user to log in and view the dashboard summary', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

  await page.getByLabel('Email').fill(VALID_CREDENTIALS.email);
  await page.getByLabel('Password').fill(VALID_CREDENTIALS.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText(`Welcome back, ${MOCK_USER.name}!`)).toBeVisible();
  await expect(page.getByLabel('Kunden Gesamtzahl')).toHaveText('1.234');
  await expect(page.getByLabel('Hunde Gesamtzahl')).toHaveText('58');
  await expect(page.getByLabel('Kurse Gesamtzahl')).toHaveText('12');
  await expect(page.getByLabel('Finanzen Gesamtzahl')).toHaveText('4');
  await expect(page.getByLabel('Kalender Gesamtzahl')).toHaveText('9');
  await expect(page.getByLabel('Kommunikation Gesamtzahl')).toHaveText('27');
});

test('shows an error when login credentials are invalid', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Email').fill('invalid@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});
