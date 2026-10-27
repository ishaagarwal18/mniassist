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
if (!username || !password) throw new Error('Set E2E_USERNAME and E2E_PASSWORD privately before running.');
const output = path.resolve(process.env.E2E_RESULTS_DIR || 'playwright-results');
await mkdir(output, { recursive: true });
const report = { checks: [], serverErrors: [] };
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 }, locale: 'en-US' });
await context.route(/\/(?:api\/|connect\/|\.well-known\/)/, async route => {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(route.request().url()).hostname)) {
    report.unexpectedApiOrigin = new URL(route.request().url()).origin;
    return route.abort('blockedbyclient');
  }
  return route.continue();
});
const page = await context.newPage();
page.setDefaultTimeout(45000);
page.on('response', response => {
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
  if (process.env.E2E_WORKSPACE) await page.locator('input[name="tenant"]').fill(process.env.E2E_WORKSPACE);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 60000 });
  await page.locator('ar-topbar').waitFor();
  assert.equal(await page.getByText('Not allowed', { exact: true }).count(), 0);
}
async function fitsViewport(locator) {
  const box = await locator.boundingBox();
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1601 && box.y + box.height <= 1001,
    'Preferences must remain inside the viewport');
}
try {
  await check('Protected routes redirect signed-out visitors to login', async () => {
    await page.goto(`${baseURL}/home`);
    await page.waitForURL(url => url.pathname === '/login');
    await page.locator('input[name="username"]').waitFor();
  });
  await check('Host sign-in reaches the application without a role-denied page', login);
  await check('Header has a combined working Language and Theme dropdown', async () => {
    const preferences = page.locator('ar-topbar ar-appearance-settings');
    await preferences.locator('summary').click();
    const selects = preferences.locator('select');
    assert.equal(await selects.count(), 2);
    const language = await selects.nth(0).inputValue();
    const theme = await selects.nth(1).inputValue();
    const englishLabel = await preferences.locator('summary').innerText();
    await selects.nth(0).selectOption('hi');
    await page.waitForFunction(label => document.querySelector('ar-topbar ar-appearance-settings summary')?.textContent?.replace(/\s+/g, ' ').trim() !== label.replace(/\s+/g, ' ').trim(), englishLabel);
    await selects.nth(0).selectOption(language);
    await page.waitForFunction(label => document.querySelector('ar-topbar ar-appearance-settings summary')?.textContent?.replace(/\s+/g, ' ').trim() === label.replace(/\s+/g, ' ').trim(), englishLabel);
    await selects.nth(1).selectOption('dark');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await selects.nth(1).selectOption(theme);
    await fitsViewport(preferences.locator('.preferences__panel'));
    await page.screenshot({ path: path.join(output, 'header-preferences.png'), clip: { x: 1000, y: 0, width: 600, height: 350 } });
    await preferences.locator('summary').click();
  });
  await check('Left profile menu includes combined Language and Theme preferences', async () => {
    await page.locator('ar-sidebar .sb__user').click();
    const preferences = page.locator('ar-sidebar ar-appearance-settings');
    await preferences.locator('summary').click();
    assert.equal(await preferences.locator('select').count(), 2);
    await fitsViewport(preferences.locator('.preferences__panel'));
    await page.screenshot({ path: path.join(output, 'sidebar-preferences.png'), clip: { x: 0, y: 500, width: 400, height: 500 }, mask: [page.locator('.sb__user-name')] });
    await page.locator('ar-sidebar .sb__user').click();
  });
  await check('Top-bar sign-out redirects to login', async () => {
    await page.locator('ar-topbar .tb__signout').click();
    await page.waitForURL(url => url.pathname === '/login');
    await page.locator('input[name="username"]').waitFor();
  });
  await check('An expired API session redirects to login', async () => {
    report.phase = 'Sign in again after explicit sign-out';
    await login();
    report.phase = 'Reject a real application GET request';
    let injected = false;
    await page.route(/\/api\/auto-reach\/contact(?:\?|$)/, async route => {
      if (route.request().method() !== 'GET') return route.continue();
      injected = true;
      report.rejectedRequest = new URL(route.request().url()).pathname;
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":{"message":"Acceptance-test session expired"}}' });
    });
    await page.locator('ar-sidebar a[href="/contacts"]').click();
    report.phase = 'Wait for expired-session redirect';
    await page.waitForURL(url => url.pathname === '/login', { timeout: 60000 });
    assert.ok(injected, 'A real Angular API request must encounter the simulated expiry');
  });
  assert.deepEqual(report.serverErrors, [], 'Covered browser flows must not receive server errors');
  assert.equal(report.unexpectedApiOrigin, undefined, 'Acceptance must never authenticate against a remote API');
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
