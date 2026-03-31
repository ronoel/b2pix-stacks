import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/B2Pix/);
});

test('hero section displays correctly', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.hero-title')).toContainText('Bitcoin');
  await expect(page.locator('.hero-subtitle')).toBeVisible();
  await expect(page.locator('.logo-image')).toBeVisible();
  await expect(page.locator('.logo-text')).toHaveText('B2Pix');
});

test('CTA buttons are visible', async ({ page }) => {
  await page.goto('/');

  const ctaSection = page.locator('.cta-section').first();
  await expect(ctaSection).toBeVisible();

  // Should show "Começar Agora" when not logged in
  const startButton = ctaSection.getByRole('button', { name: /Começar Agora/i });
  const accessButton = ctaSection.getByRole('button', { name: /Já tem carteira/i });
  const loggedInButton = ctaSection.getByRole('button', { name: /Acessar$/i });

  // At least one CTA should be visible
  const hasStartBtn = await startButton.isVisible().catch(() => false);
  const hasAccessBtn = await accessButton.isVisible().catch(() => false);
  const hasLoggedInBtn = await loggedInButton.isVisible().catch(() => false);
  expect(hasStartBtn || hasAccessBtn || hasLoggedInBtn).toBeTruthy();
});

test('trust badges are visible', async ({ page }) => {
  await page.goto('/');

  const badges = page.locator('.trust-badge-item');
  await expect(badges).toHaveCount(3);
  await expect(badges.nth(0)).toContainText('Você no controle');
  await expect(badges.nth(1)).toContainText('Integrado com PIX');
  await expect(badges.nth(2)).toContainText('Ninguém congela');
});

test('landing page sections load', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('app-use-cases')).toBeVisible();
  await expect(page.locator('app-how-it-works')).toBeVisible();
  await expect(page.locator('app-trust-section')).toBeVisible();
  await expect(page.locator('app-privacy-section')).toBeVisible();
  await expect(page.locator('app-faq-section')).toBeVisible();
});

test('bottom CTA section is visible', async ({ page }) => {
  await page.goto('/');

  const bottomCta = page.locator('.bottom-cta-section');
  await expect(bottomCta).toBeVisible();
  await expect(bottomCta.locator('.bottom-cta-title')).toHaveText('Comece a usar Bitcoin hoje');
});
