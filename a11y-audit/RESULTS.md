# WCAG 2.1 AA audit results

Go-live tracker item c2 (§N16): "No accessibility audit yet on the primary
workflows — inbox, campaign builder, onboarding." This is the record of
actually running one, against the real running app, not a static lint pass.

## What was run

`run.mjs` launches real Chromium (Playwright) against `ng serve`, signs in by
writing the same `ar.mock.signedIn` localStorage key `CurrentUserService`
itself reads (`useMockData: true`, flipped in `environment.development.ts`
for the run and reverted after — no backend needed), and runs `axe-core`
(via `@axe-core/playwright`) tagged `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
against five pages: `/signup`, `/login` (the two on-ramps to onboarding),
`/getting-started` (the onboarding checklist), `/inbox`, `/campaigns`.

## First run: 6 violations, all real

| Page | Violations |
|---|---|
| signup | 1 — `color-contrast` |
| login | 1 — `color-contrast` |
| getting-started | 2 — `color-contrast`, `aria-progressbar-name` |
| inbox | 1 — `color-contrast` (18 elements) |
| campaign-builder | 1 — `color-contrast` (13 elements) |

**Root cause for nearly all of it: three design tokens, not scattered
one-off mistakes.** `--ar-ink-400` (`#7B8794`, the app's workhorse "muted
text" colour, used in 58 files), `--ar-nav-dim` (`#6E7A88`, sidebar labels)
and `--ar-teal-600` (`#0F7F86`, the free-window/utility teal accent) were
each below the 4.5:1 AA minimum for normal text — 3.66:1, 3.74:1 and 4.15:1
respectively. Fixing the three tokens in `src/styles/_tokens.scss` (see that
file's own comments for the exact before/after ratios, verified with
`contrast.mjs`'s WCAG relative-luminance calculation, not eyeballed) fixed
every one of those violations across all five pages in one pass — and,
because these are shared tokens, almost certainly across the rest of the app
too, not just the three named workflows. Two isolated fixes on top: the
sidebar's active-nav-item badge (`#1B2027` on `--ar-amber-500` was 4.46:1,
just under) now uses `--ar-ink-900` instead; the onboarding checklist's
"done" steps had `opacity: 0.7` applied to the whole row, which pushed an
otherwise-compliant text colour down to ~3.0:1 — removed, since the
teal-tinted step icon and the "Done" chip already signal completion without
needing the dimming.

`aria-progressbar-name`: the onboarding checklist's `<ar-meter>` had no
`label` input bound, so its `role="progressbar"` rendered `aria-label=""`
— present but empty, which is exactly as unnamed as missing one to a screen
reader. Fixed at that call site, and while investigating found the same gap
at one more (`billing.html`'s per-metric usage meter) — both now pass a
`label`; two other `<ar-meter>` usages already did.

**A related, not-yet-visible-to-axe bug found while reading the code, fixed
anyway**: the onboarding checklist's mobile-verification step (`wizard.ts`,
the phone-number and OTP-code inputs) had no `aria-label` or `<label>` at
all — only a `placeholder`, which is not an accessible name. Axe's automated
scan of the default mock state didn't reach this step (it's conditionally
rendered), so it never showed up as a violation, but it's a real WCAG 3.3.2 /
4.1.2 gap on a real form a real person fills in. Fixed regardless of whether
the scan caught it.

## Second run: 0 violations

```
signup (/signup): 0 violation(s), 15 passed rule(s), 0 incomplete
login (/login): 0 violation(s), 13 passed rule(s), 0 incomplete
onboarding (getting-started) (/getting-started): 0 violation(s), 24 passed rule(s), 1 incomplete
inbox (/inbox): 0 violation(s), 26 passed rule(s), 0 incomplete
campaign-builder (/campaigns): 0 violation(s), 18 passed rule(s), 0 incomplete
```

One `incomplete` remains on the onboarding page — axe could not automatically
decide whether the ✓ glyph and step-number digit inside `.step__mark` need
their own contrast check. Reviewed manually: both are `aria-hidden="true"`
already (the "Done" chip and the step's own accessible name carry that
information for assistive tech), so this is correctly dismissed, not
silently ignored — see `results.json` for the raw finding if this needs
re-checking after a future change to that markup.

## What this does and does not prove — read before calling this "done"

**Proves**: the three named workflows (and their two on-ramps) have zero
automatically-detectable WCAG 2.1 A/AA violations in `axe-core`'s ruleset,
verified against the real rendered app in a real browser, not asserted.

**Does not prove full WCAG 2.1 AA conformance.** Automated tools including
axe-core are widely reported (including by axe-core's own maintainer, Deque)
to catch on the order of a third to half of WCAG success criteria — the rest
need a human: keyboard-only navigation through each flow (tab order, focus
trapping in the document picker/dialogs, visible focus indicators), a real
screen reader pass (NVDA/JAWS/VoiceOver) confirming the inbox's live message
list and the campaign builder's multi-step form are actually navigable and
announced sensibly, 400% zoom / text-reflow (WCAG 1.4.10), and the icon-only
toolbar buttons in the inbox composer (attach, suggest-replies, etc.), which
use `title` for their accessible name — technically valid per the ARIA name
computation and not flagged here, but `title` has no touch-device
affordance and inconsistent screen-reader support, so it is worth an
`aria-label` pass as a follow-up even though it is not a scored violation
today. None of that was attempted here — this is one honest layer, not the
whole audit.

## Re-running this

```bash
cd autoreach-web
# a11y-audit/run.mjs flips useMockData at the source level — do this by hand
# if re-running outside this session: set useMockData: true in
# src/environments/environment.development.ts, ng serve, then:
node a11y-audit/run.mjs
# ...revert useMockData to false afterward.
```

Requires `@axe-core/playwright` and `playwright` (added as devDependencies)
and a Chromium binary (`npx playwright install chromium` — this machine
already has one cached under `~/.cache/ms-playwright` / `%LOCALAPPDATA%\ms-playwright`).
