import { test, expect } from './fixtures/auth.fixture';

test.describe('PIX Value Input — ATM-style (via Chave PIX flow)', () => {
  const TEST_EMAIL = 'teste@email.com';

  /**
   * Navigate to the PIX key input view and enter a valid key
   * so the value input section appears.
   */
  async function goToPixValueInput(page: import('@playwright/test').Page) {
    await page.route('**/api/v1/pix-payment**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ orders: [], total: 0 }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.setItem('p2p_warning_accepted', 'true');
    });

    await page.goto('/pix-payment');
    await expect(page).toHaveURL('/pix-payment');

    const pixKeyBtn = page.getByText('Chave PIX').first();
    await expect(pixKeyBtn).toBeVisible();
    await pixKeyBtn.click();

    const keyInput = page.locator('app-pix-key-input .form-input').first();
    await expect(keyInput).toBeVisible();
    await keyInput.fill(TEST_EMAIL);
    await keyInput.blur();

    await expect(page.getByText('e-mail detectado')).toBeVisible();
    await expect(page.locator('app-pix-key-input .value-section')).toBeVisible();
  }

  function getValueInput(page: import('@playwright/test').Page) {
    return page.locator('app-pix-key-input .value-section .form-input');
  }

  test('value input renders with placeholder', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const input = getValueInput(page);
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', '0,00');
  });

  test('typing "2" shows "0,02" (ATM-style shift)', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const input = getValueInput(page);
    await input.click();
    await input.pressSequentially('2', { delay: 50 });
    await expect(input).toHaveValue('0,02');
  });

  test('typing "25" shows "0,25"', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const input = getValueInput(page);
    await input.click();
    await input.pressSequentially('25', { delay: 50 });
    await expect(input).toHaveValue('0,25');
  });

  test('typing "259" shows "2,59"', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const input = getValueInput(page);
    await input.click();
    await input.pressSequentially('259', { delay: 50 });
    await expect(input).toHaveValue('2,59');
  });

  test('typing "4917" shows "49,17" (R$49,17)', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const input = getValueInput(page);
    await input.click();
    await input.pressSequentially('4917', { delay: 50 });
    await expect(input).toHaveValue('49,17');
  });

  test('typing "10000" shows "100,00" and enables submit', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const input = getValueInput(page);
    await input.click();
    await input.pressSequentially('10000', { delay: 50 });
    await expect(input).toHaveValue('100,00');

    const submitBtn = page.locator('app-pix-key-input button.btn-primary');
    await expect(submitBtn).toBeEnabled();
  });

  test('typing "150000" shows error (above R$1.000 limit)', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const input = getValueInput(page);
    await input.click();
    await input.pressSequentially('150000', { delay: 50 });

    await expect(page.locator('app-pix-key-input .alert-error')).toBeVisible();
    const submitBtn = page.locator('app-pix-key-input button.btn-primary');
    await expect(submitBtn).toBeDisabled();
  });

  test('quick amount chip R$50 sets value correctly', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const chip = page.locator('app-pix-key-input app-quick-amount-chips')
      .getByRole('button', { name: 'R$ 50' });
    await chip.click();

    const input = getValueInput(page);
    await expect(input).toHaveValue('50,00');
  });

  test('backspace removes last digit', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const input = getValueInput(page);
    await input.click();
    await input.pressSequentially('4917', { delay: 50 });
    await expect(input).toHaveValue('49,17');

    await input.press('Backspace');
    await expect(input).toHaveValue('4,91');

    await input.press('Backspace');
    await expect(input).toHaveValue('0,49');

    await input.press('Backspace');
    await expect(input).toHaveValue('0,04');

    await input.press('Backspace');
    // Back to empty (0 cents → empty string)
    await expect(input).toHaveValue('');
  });

  test('typing after quick amount chip appends digits', async ({ authenticatedPage: page }) => {
    await goToPixValueInput(page);
    const chip = page.locator('app-pix-key-input app-quick-amount-chips')
      .getByRole('button', { name: 'R$ 50' });
    await chip.click();
    await expect(getValueInput(page)).toHaveValue('50,00');

    // Type "5" after chip → 5000 * 10 + 5 = 50005 cents = "500,05"
    const input = getValueInput(page);
    await input.click();
    await input.pressSequentially('5', { delay: 50 });
    await expect(input).toHaveValue('500,05');
  });
});
