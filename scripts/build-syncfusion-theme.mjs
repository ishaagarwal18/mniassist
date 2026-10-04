// Builds public/vendor/syncfusion/syncfusion.css: Syncfusion's Tailwind 3 theme,
// recoloured to the MNI Assist palette, for only the components the app uses.
//
//   node scripts/build-syncfusion-theme.mjs
//
// Re-run after upgrading @syncfusion/* or when a screen starts using a new
// Syncfusion component (add it to BUNDLES below). The output is committed:
// deployments run `ng build` directly and never this script.
//
// What it does, and why:
// - Syncfusion's base stylesheet embeds its icon font as a 450 kB data URI. That
//   is extracted to e-icons.ttf next to the CSS, so browsers download it only when
//   an icon is actually drawn, and cache it.
// - Syncfusion colours everything through --color-sf-* variables, one block for
//   light and one for dark. Their roles (which colour is text, fill, border) are
//   kept; only the hues are swapped, shade for shade: indigo -> MNI cobalt blue,
//   orange -> amber (attention), cyan -> sky (information), grey -> our neutrals.
//   The dark block is re-keyed to :root[data-theme='dark'], so the app's own
//   light/dark switch drives Syncfusion too.
// - The file is loaded on demand (see core/ui/syncfusion-theme.ts), never on the
//   public pages, so it does not count towards the initial bundle.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const theme = join(root, 'node_modules/@syncfusion/ej2-tailwind3-theme/styles');
const outDir = join(root, 'public/vendor/syncfusion');

/**
 * Component stylesheets, in bundles ("lite" = no touch-size variants). The core
 * bundle carries the theme's variables and is loaded on every app page; the
 * others are large and load only on screens that use them
 * (see core/ui/syncfusion-theme.ts).
 */
const BUNDLES = {
  syncfusion: [
    'button/button-lite.css',
    'check-box/check-box-lite.css',
    'radio-button/radio-button-lite.css',
    'switch/switch-lite.css',
    'chips/chips-lite.css',
    'input/input-lite.css',
    'textbox/textbox-lite.css',
    'popup/popup.css',
    'spinner/spinner.css',
    'dialog/dialog-lite.css',
    'tooltip/tooltip-lite.css',
    'toolbar/toolbar-lite.css',
    'tab/tab-lite.css',
    'message/message-lite.css',
    'toast/toast-lite.css',
    'card/card-lite.css',
    'avatar/avatar.css',
    'badge/badge-lite.css',
    'list-view/list-view-lite.css',
    'drop-down-base/drop-down-base-lite.css',
    'drop-down-list/drop-down-list-lite.css',
    'calendar/calendar-lite.css',
    'datepicker/datepicker-lite.css',
    'timepicker/timepicker-lite.css',
    'datetimepicker/datetimepicker-lite.css',
  ],
  'syncfusion-grid': [
    'grid/grid-lite.css',
    'pager/pager-lite.css',
    'excel-filter/excel-filter-lite.css',
    'context-menu/context-menu-lite.css',
    'menu/menu-lite.css',
    'drop-down-button/drop-down-button-lite.css',
    'split-button/split-button-lite.css',
  ],
  'syncfusion-schedule': [
    'schedule/schedule-lite.css',
    'recurrence-editor/recurrence-editor-lite.css',
  ],
  'syncfusion-kanban': ['kanban/kanban-lite.css'],
};

// ---- Palette swap -------------------------------------------------------------

const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const tw = {
  indigo: [
    '#eef2ff',
    '#e0e7ff',
    '#c7d2fe',
    '#a5b4fc',
    '#818cf8',
    '#6366f1',
    '#4f46e5',
    '#4338ca',
    '#3730a3',
    '#312e81',
    '#1e1b4b',
  ],
  blue: [
    '#eff6ff',
    '#dbeafe',
    '#bfdbfe',
    '#93c5fd',
    '#60a5fa',
    '#3b82f6',
    '#2563eb',
    '#1d4ed8',
    '#1e40af',
    '#1e3a8a',
    '#172554',
  ],
  orange: [
    '#fff7ed',
    '#ffedd5',
    '#fed7aa',
    '#fdba74',
    '#fb923c',
    '#f97316',
    '#ea580c',
    '#c2410c',
    '#9a3412',
    '#7c2d12',
    '#431407',
  ],
  amber: [
    '#fffbeb',
    '#fef3c7',
    '#fde68a',
    '#fcd34d',
    '#fbbf24',
    '#f59e0b',
    '#d97706',
    '#b45309',
    '#92400e',
    '#78350f',
    '#451a03',
  ],
  cyan: [
    '#ecfeff',
    '#cffafe',
    '#a5f3fc',
    '#67e8f9',
    '#22d3ee',
    '#06b6d4',
    '#0891b2',
    '#0e7490',
    '#155e75',
    '#164e63',
    '#083344',
  ],
  sky: [
    '#f0f9ff',
    '#e0f2fe',
    '#bae6fd',
    '#7dd3fc',
    '#38bdf8',
    '#0ea5e9',
    '#0284c7',
    '#0369a1',
    '#075985',
    '#0c4a6e',
    '#082f49',
  ],
  gray: [
    '#f9fafb',
    '#f3f4f6',
    '#e5e7eb',
    '#d1d5db',
    '#9ca3af',
    '#6b7280',
    '#4b5563',
    '#374151',
    '#1f2937',
    '#111827',
    '#030712',
  ],
};
/** Our neutrals, by Tailwind grey shade. Light: _tokens.scss light values. */
const neutralsLight = [
  '#f9fafb',
  '#f5f7fa',
  '#eaecf0',
  '#d9e1ea',
  '#98a2b3',
  '#5f6b7c',
  '#475467',
  '#344054',
  '#1d2939',
  '#17202a',
  '#0b1220',
];
/** Dark: the layered surfaces and text of the dark theme in _tokens.scss. */
const neutralsDark = [
  '#f1f5f9',
  '#e2e8f0',
  '#dbe3ee',
  '#cbd5e1',
  '#b4c0d1',
  '#8f9db3',
  '#4b5b73',
  '#2a3a55',
  '#16233a',
  '#111b2e',
  '#0a111e',
];

function paletteMap(neutrals) {
  const map = new Map();
  shades.forEach((_, i) => {
    map.set(tw.indigo[i], tw.blue[i]);
    map.set(tw.orange[i], tw.amber[i]);
    map.set(tw.cyan[i], tw.sky[i]);
    map.set(tw.gray[i], neutrals[i]);
  });
  return map;
}

const hex = (r, g, b) =>
  '#' + [r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Swap every colour in a declaration body that the palette knows. */
function recolour(body, map) {
  const unmapped = new Set();
  const out = body
    .replace(
      /#[0-9a-fA-F]{6}\b/g,
      (m) => map.get(m.toLowerCase()) ?? (unmapped.add(m.toLowerCase()), m),
    )
    .replace(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g, (m, r, g, b, a) => {
      const to = map.get(hex(r, g, b));
      if (!to) return m;
      const [nr, ng, nb] = rgb(to);
      return a === undefined ? `rgba(${nr}, ${ng}, ${nb})` : `rgba(${nr}, ${ng}, ${nb}, ${a})`;
    });
  return { out, unmapped };
}

/** The `{ ... }` body of the first rule whose selector is exactly `selector`. */
function takeBlock(css, selector) {
  let from = 0;
  for (;;) {
    const open = css.indexOf('{', from);
    if (open < 0) throw new Error(`rule ${selector} not found`);
    const sel = css.slice(css.lastIndexOf('}', open) + 1, open).trim();
    const close = css.indexOf('}', open);
    if (sel === selector) {
      return {
        body: css.slice(open + 1, close),
        start: css.lastIndexOf('}', open) + 1,
        end: close + 1,
      };
    }
    from = close + 1;
  }
}

// ---- Build ----------------------------------------------------------------------

let base = readFileSync(join(theme, 'base/base.css'), 'utf8');

// 1. The icon font, out of the stylesheet.
const font = base.match(
  /url\(data:application\/x-font-ttf;charset=utf-8;base64,([A-Za-z0-9+/=]+)\)/,
);
if (!font) throw new Error('embedded icon font not found in base.css');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'e-icons.ttf'), Buffer.from(font[1], 'base64'));
base = base.replace(font[0], "url('e-icons.ttf')");

// 2. Recolour the light and dark variable blocks.
const light = takeBlock(base, ':root');
const lightOut = recolour(light.body, paletteMap(neutralsLight));
base = base.slice(0, light.start) + `\n:root {${lightOut.out}}` + base.slice(light.end);

const dark = takeBlock(base, '.e-dark-mode');
const darkOut = recolour(dark.body, paletteMap(neutralsDark));
base =
  base.slice(0, dark.start) + `\n:root[data-theme='dark'] {${darkOut.out}}` + base.slice(dark.end);

// 3. Brand overrides, after both palettes: primary actions use the app's own
//    primary fill with white text in both themes (Syncfusion's dark theme puts
//    black text on a light blue), and type and corner radius follow the tokens.
const brand = `
:root, :root[data-theme='dark'] {
  --color-sf-primary-bg-color: var(--ar-primary);
  --color-sf-primary-border-color: var(--ar-primary);
  --color-sf-primary-bg-color-hover: var(--ar-primary-hover);
  --color-sf-primary-border-color-hover: var(--ar-primary-hover);
  --color-sf-primary-bg-color-focus: var(--ar-primary-hover);
  --color-sf-primary-border-color-focus: var(--ar-primary-hover);
  --color-sf-primary-bg-color-pressed: var(--ar-primary-hover);
  --color-sf-primary-border-color-pressed: var(--ar-primary-hover);
  --color-sf-primary-text-color: #fff;
  --e-font-name: var(--ar-font-sans);
  --e-radius: 1.6rem;
}`;

// 4. Bundles, minified. Only the core bundle carries the base (variables, icon font).
const banner =
  '/* Syncfusion Tailwind 3 theme, recoloured for MNI Assist. Generated by scripts/build-syncfusion-theme.mjs — do not edit. */' +
  String.fromCharCode(10);
const kb = (n) => (n / 1024).toFixed(0) + ' kB';
for (const [name, files] of Object.entries(BUNDLES)) {
  const head = name === 'syncfusion' ? [base, brand] : [];
  const parts = [...head, ...files.map((c) => readFileSync(join(theme, c), 'utf8'))];
  const { code } = await esbuild.transform(parts.join(String.fromCharCode(10)), {
    loader: 'css',
    minify: true,
  });
  writeFileSync(join(outDir, `${name}.css`), banner + code);
  console.log(`${name}.css ${kb(code.length)} (${files.length} components)`);
}
console.log(`e-icons.ttf ${kb(Buffer.from(font[1], 'base64').length)}`);
const left = [...new Set([...lightOut.unmapped, ...darkOut.unmapped])];
console.log(`colours left as Syncfusion's (minor variants): ${left.length}`);
