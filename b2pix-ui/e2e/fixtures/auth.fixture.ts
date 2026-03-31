import { test as base, Page } from '@playwright/test';

const TEST_STX_ADDRESS = 'SP1FANG01H463YS2YS82QKAEPWBQ809AHGA5KVBNB';

// Hex-encoded JSON payload for @stacks/connect localStorage
// Decoded: {"addresses":{"stx":[{"address":"SP1FANG01H463YS2YS82QKAEPWBQ809AHGA5KVBNB"}],"btc":[]}}
const STACKS_CONNECT_HEX =
  '7b22616464726573736573223a7b22737478223a5b7b2261646472657373223a2253503146414e4730314834363359533259533832514b41455057425138303941484741354b56424e42227d5d2c22627463223a5b5d7d7d';

/**
 * Mock API responses for a fully validated account.
 */
async function mockAccountValidated(page: Page) {
  await page.route('**/api/v1/account/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        address: TEST_STX_ADDRESS,
        email_verified: true,
        pix_verified: true,
        is_lp: false,
        invoice_enabled: false,
        active_invoice_count: 0,
      }),
    });
  });
}

/**
 * Mock the BTC price quote endpoint.
 */
async function mockBtcQuote(page: Page) {
  await page.route('**/api/v1/quote**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ price: '50000000' }), // R$500.000,00 per BTC in cents
    });
  });
}

/**
 * Mock buy orders list (empty).
 */
async function mockBuyOrders(page: Page) {
  await page.route('**/api/v1/buy-order**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ buy_orders: [], total: 0 }),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock sell orders list (empty).
 */
async function mockSellOrders(page: Page) {
  await page.route('**/api/v1/sell-order**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sell_orders: [], total: 0 }),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock sBTC balance endpoint.
 */
async function mockSbtcBalance(page: Page) {
  await page.route('**/v2/contracts/call-read/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        okay: true,
        result: '0x0100000000000000000000000000002710', // 10000 sats
      }),
    });
  });
}

/**
 * Mock payout request endpoints.
 */
async function mockPayoutRequests(page: Page) {
  await page.route('**/api/v1/pix-payout-request**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ payout_requests: [], total: 0 }),
    });
  });
}

/**
 * Test fixture that simulates a logged-in user with a validated account.
 * Sets up @stacks/connect localStorage and mocks essential API calls.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Set @stacks/connect localStorage before navigating
    await page.addInitScript((hex) => {
      localStorage.setItem('@stacks/connect', hex);
    }, STACKS_CONNECT_HEX);

    // Set up all API mocks
    await mockAccountValidated(page);
    await mockBtcQuote(page);
    await mockBuyOrders(page);
    await mockSellOrders(page);
    await mockSbtcBalance(page);
    await mockPayoutRequests(page);

    await use(page);
  },
});

export { TEST_STX_ADDRESS };
export { expect } from '@playwright/test';
