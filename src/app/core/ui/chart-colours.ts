import { DOCUMENT } from '@angular/common';
import { Signal, effect, inject, signal } from '@angular/core';
import { ChartTheme } from '@syncfusion/ej2-charts';

import { ThemeService } from '../services/theme.service';
import { registerSyncfusionLicense } from './syncfusion-license';

// Syncfusion checks the licence in each component's constructor, before any
// wrapper code of ours runs, so the key goes in as soon as a chart screen loads.
registerSyncfusionLicense();

export type ChartColours<K extends string> = Record<K, string> & { theme: ChartTheme };

/**
 * Colours for a Syncfusion chart, read from the design tokens. Charts draw SVG
 * and take colours as fixed values, not CSS variables, so this reads each
 * `--ar-*` token's current value and reads them again when the user switches
 * between light and dark. `theme` is the matching Syncfusion chart theme (axis
 * labels, gridlines, tooltips).
 *
 *   protected readonly colours = chartColours({ expected: '--ar-teal-500' });
 *   <e-series [fill]="colours().expected" />
 *   <ejs-chart [theme]="colours().theme" />
 */
export function chartColours<K extends string>(tokens: Record<K, string>): Signal<ChartColours<K>> {
  const doc = inject(DOCUMENT);
  const theme = inject(ThemeService).theme;

  const read = (): ChartColours<K> => {
    const root = doc.documentElement;
    const css = getComputedStyle(root);
    const out = {} as Record<K, string>;
    for (const key of Object.keys(tokens) as K[]) {
      out[key] = css.getPropertyValue(tokens[key]).trim() || '#888';
    }
    const dark = root.getAttribute('data-theme') === 'dark';
    return { ...out, theme: dark ? 'Tailwind3Dark' : 'Tailwind3' };
  };

  const colours = signal(read());
  // ThemeService applies data-theme in a root effect, which runs before this
  // component-level effect, so the tokens read here are already the new ones.
  effect(() => {
    theme();
    colours.set(read());
  });
  return colours.asReadonly();
}
