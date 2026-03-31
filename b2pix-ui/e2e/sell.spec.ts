import { test, expect } from './fixtures/auth.fixture';

test.describe('Sell flow (authenticated)', () => {
  test('loads sell page', async ({ authenticatedPage: page }) => {
    await page.goto('/sell');

    await expect(page).toHaveURL('/sell');
    await expect(page.locator('app-page-header')).toBeVisible();
  });

  test('displays page header with correct title', async ({ authenticatedPage: page }) => {
    await page.goto('/sell');

    await expect(page.locator('app-page-header')).toContainText('Vender sBTC');
  });

  test('shows amount section with title', async ({ authenticatedPage: page }) => {
    await page.goto('/sell');

    await expect(page.locator('.section-title')).toContainText('Quanto quer vender?');
  });

  test('shows BRL/Sats toggle', async ({ authenticatedPage: page }) => {
    await page.goto('/sell');

    const segControl = page.locator('.seg-control');
    await expect(segControl).toBeVisible();
    await expect(segControl.getByText('R$ BRL')).toBeVisible();
    await expect(segControl.getByText('Sats')).toBeVisible();
  });

  test('BRL mode is selected by default', async ({ authenticatedPage: page }) => {
    await page.goto('/sell');

    const brlBtn = page.locator('.seg-btn.active');
    await expect(brlBtn).toHaveText('R$ BRL');
  });

  test('has BRL and Sats toggle buttons', async ({ authenticatedPage: page }) => {
    await page.goto('/sell');

    const segControl = page.locator('.seg-control');
    await expect(segControl).toBeVisible();

    // Both toggle options should be present
    await expect(page.locator('.seg-btn').first()).toHaveText('R$ BRL');
    await expect(page.locator('.seg-btn').nth(1)).toContainText('Sats');

    // BRL should be active by default
    await expect(page.locator('.seg-btn').first()).toHaveClass(/active/);
  });

  test('shows quick amount chips', async ({ authenticatedPage: page }) => {
    await page.goto('/sell');

    await expect(page.locator('app-quick-amount-chips')).toBeVisible();
  });
});
