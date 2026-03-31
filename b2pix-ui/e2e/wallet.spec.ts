import { test, expect } from './fixtures/auth.fixture';

test.describe('Wallet page (authenticated)', () => {
  test('loads wallet management page', async ({ authenticatedPage: page }) => {
    await page.goto('/wallet');

    await expect(page).toHaveURL('/wallet');
    await expect(page.locator('app-page-header')).toContainText('Minha Carteira');
  });

  test('displays verification status section', async ({ authenticatedPage: page }) => {
    await page.goto('/wallet');

    // Card with verification status
    const verificationCard = page.locator('.card').first();
    await expect(verificationCard).toBeVisible();
    await expect(verificationCard.locator('.card-title')).toHaveText('Verificações');
  });

  test('shows email verified status', async ({ authenticatedPage: page }) => {
    await page.goto('/wallet');

    // Mock returns email_verified: true
    await expect(page.getByText('Email verificado')).toBeVisible();
  });

  test('shows pix verified status', async ({ authenticatedPage: page }) => {
    await page.goto('/wallet');

    // Mock returns pix_verified: true → displays as 'Conta bancária verificada'
    await expect(page.getByText('Conta bancária verificada')).toBeVisible();
  });
});
