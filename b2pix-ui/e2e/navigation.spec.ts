import { test, expect } from '@playwright/test';

test.describe('Navigation (unauthenticated)', () => {
  test('protected routes redirect to landing when not logged in', async ({ page }) => {
    await page.goto('/dashboard');
    // Auth guard should redirect to landing page
    await expect(page).toHaveURL('/');
  });

  test('buy route redirects when not logged in', async ({ page }) => {
    await page.goto('/buy');
    await expect(page).toHaveURL('/');
  });

  test('sell route redirects when not logged in', async ({ page }) => {
    await page.goto('/sell');
    await expect(page).toHaveURL('/');
  });

  test('wallet route redirects when not logged in', async ({ page }) => {
    await page.goto('/wallet');
    await expect(page).toHaveURL('/');
  });

  test('unknown routes redirect to landing', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page).toHaveURL('/');
  });

  test('blocked page is accessible without auth', async ({ page }) => {
    await page.goto('/blocked');
    await expect(page).toHaveURL('/blocked');
  });
});
