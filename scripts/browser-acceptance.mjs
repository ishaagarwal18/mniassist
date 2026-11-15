import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4200';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
  throw new Error('This acceptance check requires a local test application.');
}
const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;
if (!username || !password)
  throw new Error('Set E2E_USERNAME and E2E_PASSWORD privately before running.');
const output = path.resolve(process.env.E2E_RESULTS_DIR || 'playwright-results');
await mkdir(output, { recursive: true });
const report = { checks: [], serverErrors: [] };
const browser = await chromium.launch({
  channel: process.env.E2E_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
  headless: true,
});
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1600, height: 1000 },
  locale: 'en-US',
});
await context.route(/\/(?:api\/|connect\/|\.well-known\/)/, async (route) => {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(route.request().url()).hostname)) {
    report.unexpectedApiOrigin = new URL(route.request().url()).origin;
    return route.abort('blockedbyclient');
  }
  return route.continue();
});
const page = await context.newPage();
page.setDefaultTimeout(45000);
page.on('response', (response) => {
  const url = new URL(response.url());
  if (['localhost', '127.0.0.1'].includes(url.hostname) && response.status() >= 500) {
    report.serverErrors.push({ path: url.pathname, status: response.status() });
  }
});
async function check(name, action) {
  const started = Date.now();
  await action();
  report.checks.push({ name, passed: true, milliseconds: Date.now() - started });
  console.log(`PASS: ${name}`);
}
async function login() {
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  if (process.env.E2E_WORKSPACE)
    await page.locator('input[name="tenant"]').fill(process.env.E2E_WORKSPACE);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 });
  await page.locator('ar-topbar').waitFor();
  assert.equal(await page.getByText('Not allowed', { exact: true }).count(), 0);
}
async function fitsViewport(locator) {
  const box = await locator.boundingBox();
  assert.ok(
    box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1601 && box.y + box.height <= 1001,
    'Preferences must remain inside the viewport',
  );
}
try {
  await check('Protected routes redirect signed-out visitors to login', async () => {
    await page.goto(`${baseURL}/home`);
    await page.waitForURL((url) => url.pathname === '/login');
    await page.locator('input[name="username"]').waitFor();
  });
  await check('Host sign-in reaches the application without a role-denied page', login);
  await check(
    'Sidebar profile menu has a combined working Language and Theme dropdown',
    async () => {
      // The header no longer carries these: Language, Theme and Sign out live in the sidebar profile menu.
      await page.locator('ar-sidebar .sb__user').click();
      const preferences = page.locator('ar-sidebar ar-appearance-settings');
      const summary = 'ar-sidebar ar-appearance-settings summary';
      await preferences.locator('summary').click();
      const groups = preferences.locator('.preferences__group');
      assert.equal(await groups.count(), 2, 'Language and Theme groups');
      const languages = groups.nth(0).locator('[role="menuitemradio"]');
      const themes = groups.nth(1).locator('[role="menuitemradio"]');
      assert.ok((await languages.count()) >= 2, 'Several languages offered');
      assert.ok((await themes.count()) >= 2, 'Several themes offered');
      const startLanguage = groups.nth(0).locator('[aria-checked="true"]');
      const languageCode = await startLanguage.getAttribute('lang');
      const startTheme = await groups.nth(1).locator('[aria-checked="true"]').innerText();
      const englishLabel = await preferences.locator('summary').innerText();
      await groups.nth(0).locator('[lang="hi"]').click();
      await page.waitForFunction(
        ([sel, label]) =>
          document.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() !==
          label.replace(/\s+/g, ' ').trim(),
        [summary, englishLabel],
      );
      if (!(await preferences.locator('.preferences__panel').isVisible()))
        await preferences.locator('summary').click();
      await groups.nth(0).locator(`[lang="${languageCode}"]`).click();
      await page.waitForFunction(
        ([sel, label]) =>
          document.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() ===
          label.replace(/\s+/g, ' ').trim(),
        [summary, englishLabel],
      );
      if (!(await preferences.locator('.preferences__panel').isVisible()))
        await preferences.locator('summary').click();
      await themes.filter({ hasText: /Dark theme/ }).click();
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      if (!(await preferences.locator('.preferences__panel').isVisible()))
        await preferences.locator('summary').click();
      await themes
        .filter({ hasText: startTheme.replace('✓', '').trim() })
        .first()
        .click();
      if (!(await preferences.locator('.preferences__panel').isVisible()))
        await preferences.locator('summary').click();
      await fitsViewport(preferences.locator('.preferences__panel'));
      await page.screenshot({
        path: path.join(output, 'sidebar-preferences.png'),
        clip: { x: 0, y: 500, width: 400, height: 500 },
        mask: [page.locator('.sb__user-name')],
      });
      await page.locator('ar-sidebar .sb__user').click();
    },
  );
  await check('Profile-menu sign-out redirects to login', async () => {
    await page.locator('ar-sidebar .sb__user').click();
    await page.locator('ar-sidebar .sb__menu-item', { hasText: /Sign out|साइन आउट/ }).click();
    await page.waitForURL((url) => url.pathname === '/login');
    await page.locator('input[name="username"]').waitFor();
  });
  await check('An expired API session redirects to login', async () => {
    report.phase = 'Sign in again after explicit sign-out';
    await login();
    report.phase = 'Reject a real application GET request';
    let injected = false;
    await page.route(/\/api\/auto-reach\/contact(?:\?|$)/, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      injected = true;
      report.rejectedRequest = new URL(route.request().url()).pathname;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: '{"error":{"message":"Acceptance-test session expired"}}',
      });
    });
    // Contacts may sit inside a folded sidebar group; either route makes a real Angular GET.
    const contactsLink = page.locator('ar-sidebar a[href="/contacts"]');
    if (await contactsLink.isVisible()) await contactsLink.click();
    else await page.goto(`${baseURL}/contacts`);
    report.phase = 'Wait for expired-session redirect';
    await page.waitForURL((url) => url.pathname === '/login', { timeout: 60000 });
    assert.ok(injected, 'A real Angular API request must encounter the simulated expiry');
  });
  assert.deepEqual(report.serverErrors, [], 'Covered browser flows must not receive server errors');
  assert.equal(
    report.unexpectedApiOrigin,
    undefined,
    'Acceptance must never authenticate against a remote API',
  );
  report.status = 'passed';
  report.phase = 'Complete';
  console.log(`Browser acceptance passed: ${report.checks.length} checks.`);
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.message).replaceAll(password, '[redacted]');
  report.lastPath = new URL(page.url()).pathname;
  report.loginErrors = await page.locator('.lg__error').allTextContents();
  console.error(`Browser acceptance failed: ${report.failure}`);
  process.exitCode = 1;
} finally {
  await writeFile(path.join(output, 'browser-summary.json'), JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}
