import { test, expect } from './fixtures/auth.fixture';

test.describe('Dashboard (authenticated)', () => {
  test('loads dashboard with balance card', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.balance-card')).toBeVisible();
    await expect(page.locator('.balance-card__label')).toHaveText('Saldo disponível');
  });

  test('displays wallet address in header', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    const addressBtn = page.locator('.dash-header__address');
    await expect(addressBtn).toBeVisible();
    // Address should be truncated but contain part of the test address
    await expect(addressBtn).toContainText('SP1F');
  });

  test('shows balance in sats', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Wait for balance to load (mock returns 10000 sats)
    await expect(page.locator('.balance-card__sats')).toBeVisible();
    await expect(page.locator('.balance-card__sats')).toContainText('sats');
  });

  test('has exit button', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    const exitBtn = page.locator('.dash-header__exit');
    await expect(exitBtn).toBeVisible();
    await expect(exitBtn).toContainText('Sair');
  });

  test('has receive and send action buttons', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('button', { name: /Receber/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Enviar/i })).toBeVisible();
  });
});
