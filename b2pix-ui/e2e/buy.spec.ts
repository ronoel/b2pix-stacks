import { test, expect } from './fixtures/auth.fixture';

test.describe('Buy flow (authenticated)', () => {
  test('loads buy page with amount selection', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    await expect(page).toHaveURL('/buy');
    await expect(page.locator('.section-title').first()).toContainText('Quanto você quer comprar?');
  });

  test('displays page header', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    await expect(page.locator('app-page-header')).toBeVisible();
  });

  test('shows quick amount chips', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    await expect(page.locator('app-quick-amount-chips')).toBeVisible();
  });

  test('can select quick amount R$50', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    // Click the R$50 chip
    const chip = page.getByRole('button', { name: 'R$ 50', exact: true });
    await chip.click();

    // Custom input should reflect the value
    const input = page.locator('#customAmount');
    await expect(input).toHaveValue('50');
  });

  test('shows estimate card after entering amount', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    // Enter a valid amount
    const input = page.locator('#customAmount');
    await input.fill('100');

    // Estimate card should appear
    await expect(page.locator('.estimate-card')).toBeVisible();
    await expect(page.locator('.estimate-label')).toHaveText('Você receberá');
    await expect(page.locator('.estimate-btc')).toContainText('sBTC');
  });

  test('shows error for amount below minimum', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    const input = page.locator('#customAmount');
    await input.fill('10');

    await expect(page.locator('.input-hint--error')).toContainText('R$ 50');
  });

  test('shows error for amount above maximum', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    const input = page.locator('#customAmount');
    await input.fill('2000');

    await expect(page.locator('.input-hint--error')).toContainText('R$ 1.000');
  });

  test('buy button is disabled without amount', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    const buyBtn = page.getByRole('button', { name: /Comprar sBTC/i });
    await expect(buyBtn).toBeDisabled();
  });

  test('buy button is enabled with valid amount', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    const input = page.locator('#customAmount');
    await input.fill('100');

    const buyBtn = page.getByRole('button', { name: /Comprar sBTC/i });
    await expect(buyBtn).toBeEnabled();
  });

  test('shows min/max hint text', async ({ authenticatedPage: page }) => {
    await page.goto('/buy');

    await expect(page.locator('.input-hint')).toContainText('Mín: R$ 50');
    await expect(page.locator('.input-hint')).toContainText('Máx: R$ 1.000');
  });
});
