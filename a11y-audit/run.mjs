// Real WCAG 2.1 AA audit — go-live tracker item c2 (§N16). Runs axe-core
// against the actual rendered app in a real Chromium instance (Playwright),
// not a static lint pass, against the three named workflows: sign-up/login
// (the entry to onboarding), the onboarding checklist, the team inbox, and
// the campaign builder. `useMockData: true` (flipped in
// environment.development.ts for this run, reverted after) lets the
// authenticated routes render with no backend at all — auth itself is
// satisfied by writing the mock "signed in" flag straight into localStorage,
// the same key CurrentUserService itself reads.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';

const BASE = 'http://localhost:4200';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const pages = [
  { name: 'signup', path: '/signup', auth: false },
  { name: 'login', path: '/login', auth: false },
  { name: 'onboarding (getting-started)', path: '/getting-started', auth: true },
  { name: 'inbox', path: '/inbox', auth: true },
  { name: 'campaign-builder', path: '/campaigns', auth: true },
];

async function signIn(page) {
  // Mirrors CurrentUserService's own mock sign-in exactly (MOCK_SIGNED_IN_KEY)
  // rather than driving the real login form, since the form itself posts to
  // a backend that mock mode has no equivalent for.
  await page.goto(BASE + '/login');
  await page.evaluate(() => localStorage.setItem('ar.mock.signedIn', 'a11y-audit'));
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];
  let signedIn = false;

  for (const target of pages) {
    if (target.auth && !signedIn) {
      await signIn(page);
      signedIn = true;
    }

    await page.goto(BASE + target.path, { waitUntil: 'networkidle' });
    // Let signal-store-driven mock data and any deferred rendering settle —
    // axe scanning mid-render undercounts real violations.
    await page.waitForTimeout(800);

    const axe = new AxeBuilder({ page }).withTags(WCAG_TAGS);
    const result = await axe.analyze();

    results.push({
      name: target.name,
      path: target.path,
      url: page.url(),
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags.filter((t) => WCAG_TAGS.includes(t)),
        nodes: v.nodes.map((n) => ({
          target: n.target,
          html: n.html,
          failureSummary: n.failureSummary,
        })),
      })),
      passes: result.passes.length,
      incomplete: result.incomplete.map((i) => ({ id: i.id, description: i.description })),
    });

    console.log(
      `${target.name} (${target.path}): ${result.violations.length} violation(s), ${result.passes.length} passed rule(s), ${result.incomplete.length} incomplete`,
    );
  }

  await browser.close();

  writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(results, null, 2));

  const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);
  console.log(`\nTotal violations across ${pages.length} pages: ${totalViolations}`);
  console.log('Full detail: a11y-audit/results.json');

  process.exit(totalViolations > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(2);
});
