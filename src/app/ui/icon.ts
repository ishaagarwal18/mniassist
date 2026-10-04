import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Shape =
  | { readonly t: 'path'; readonly d: string }
  | { readonly t: 'circle'; readonly cx: number; readonly cy: number; readonly r: number }
  | {
      readonly t: 'rect';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly rx: number;
    };

const p = (d: string): Shape => ({ t: 'path', d });
const c = (cx: number, cy: number, r: number): Shape => ({ t: 'circle', cx, cy, r });
const r = (x: number, y: number, w: number, h: number, rx = 1): Shape => ({
  t: 'rect',
  x,
  y,
  w,
  h,
  rx,
});

/** Icons are drawn on a 20px grid with a 1.5px stroke and round caps.
 *  Modelled as typed primitives rather than raw SVG strings so nothing has to
 *  pass through DomSanitizer to render. */
const ICONS = {
  home: [p('M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z')],
  inbox: [
    p('M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5V13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
    p('M3 11h3.5l1 2h5l1-2H17'),
  ],
  contacts: [c(10, 7, 2.75), p('M4.5 16.5c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5')],
  campaign: [p('M4 8v4h2.5l6 3.5v-11L6.5 8z'), p('M15 8.5c.8.6.8 2.4 0 3')],
  template: [r(4, 3, 12, 14, 1.5), p('M7 7h6M7 10h6M7 13h3.5')],
  automation: [
    c(6, 5.5, 2),
    c(14, 10, 2),
    c(6, 14.5, 2),
    p('M8 5.5h2a2 2 0 0 1 2 2v.5M8 14.5h2a2 2 0 0 0 2-2V12'),
  ],
  flow: [r(3, 3, 6, 5, 1), r(11, 12, 6, 5, 1), p('M6 8v4.5a2 2 0 0 0 2 2h3')],
  enquiry: [r(4.5, 4, 11, 13, 1.5), p('M7.5 4V2.8h5V4M7.5 9h5M7.5 12.5h3')],
  quotation: [p('M5 3h10v14l-2.5-1.5L10 17l-2.5-1.5L5 17z'), p('M8 7.5h4M8 11h4')],
  machine: [
    r(5, 5, 10, 10, 1.5),
    r(8, 8, 4, 4, 0.5),
    p('M8 2.5v2.5M12 2.5v2.5M8 15v2.5M12 15v2.5M2.5 8H5M2.5 12H5M15 8h2.5M15 12h2.5'),
  ],
  document: [p('M5 3h6l4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z'), p('M11 3v4h4')],
  analytics: [p('M3.5 16.5h13'), p('M6 14V9M10 14V4.5M14 14v-6.5')],
  channel: [r(6, 2.5, 8, 15, 2), p('M8.75 15h2.5')],
  billing: [r(3, 5, 14, 10, 1.5), p('M3 8.5h14M6 12h3')],
  shield: [
    p('M10 2.8 16 5v5c0 3.4-2.4 6.2-6 7.2-3.6-1-6-3.8-6-7.2V5z'),
    p('M7.6 9.9 9.4 11.7l3.2-3.4'),
  ],
  settings: [
    c(10, 10, 2.5),
    p(
      'M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9',
    ),
  ],
  plus: [p('M10 4.5v11M4.5 10h11')],
  search: [c(8.75, 8.75, 5), p('M12.5 12.5 16.5 16.5')],
  filter: [p('M3.5 5h13l-5 5.5v5l-3-1.5v-3.5z')],
  chevron: [p('M7.5 4.5 13 10l-5.5 5.5')],
  chevdown: [p('M5 8l5 5 5-5')],
  check: [p('M4.5 10.5l3.5 3.5 7.5-8')],
  alert: [p('M10 3.2 18 16.8H2z'), p('M10 8v3.5M10 14.2v.1')],
  clock: [c(10, 10, 7), p('M10 5.8V10l2.8 1.8')],
  attach: [
    p(
      'M14.5 9 9.7 13.8a3 3 0 0 1-4.3-4.3l5.5-5.5a2 2 0 0 1 2.9 2.9l-5.4 5.4a1 1 0 0 1-1.4-1.4l4.9-4.9',
    ),
  ],
  send: [p('M3.5 10 16.5 4l-4 12.5-3-5.5z')],
  bolt: [p('M11 2.5 4.5 11h4l-.5 6.5L15 9h-4z')],

  // Theme switch: the sun means "switch to light", the moon "switch to dark".
  sun: [
    c(10, 10, 3.2),
    p(
      'M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3',
    ),
  ],
  moon: [p('M15.5 12.2A6.2 6.2 0 0 1 7.8 4.5 6.2 6.2 0 1 0 15.5 12.2z')],

  // AI. A four-point spark with a smaller one beside it: the one glyph that
  // marks something as machine-generated or machine-suggested. Use it nowhere else.
  sparkle: [
    p('M8.5 3l1.5 4.2 4.2 1.5-4.2 1.5-1.5 4.2L7 10.2 2.8 8.7 7 7.2z'),
    p('M15 12.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z'),
  ],
  dots: [c(4.5, 10, 1.2), c(10, 10, 1.2), c(15.5, 10, 1.2)],
  user: [c(10, 7, 2.5), p('M5 16c0-2.5 2.2-4 5-4s5 1.5 5 4')],
  refresh: [p('M16 10a6 6 0 1 1-1.8-4.3'), p('M16.5 3v3.5H13')],
  download: [p('M10 3.5v9M6 9l4 4 4-4M4 16.5h12')],
  link: [
    p('M8.5 11.5a3 3 0 0 0 4.3 0l2.4-2.4a3 3 0 0 0-4.3-4.3l-1 1'),
    p('M11.5 8.5a3 3 0 0 0-4.3 0l-2.4 2.4a3 3 0 0 0 4.3 4.3l1-1'),
  ],

  // A funnel narrowed by two conditions: the audience builder's whole idea in
  // 20 pixels. Distinct from `filter`, which is a single-stage strainer.
  segment: [p('M2.5 4.5h15l-5.8 6.4v5.1l-3.4-1.9v-3.2z'), p('M13.5 13.5h4M15.5 11.5v4')],
  globe: [
    c(10, 10, 7),
    p('M3 10h14M10 3c1.9 2 2.9 4.4 2.9 7s-1 5-2.9 7c-1.9-2-2.9-4.4-2.9-7s1-5 2.9-7'),
  ],
  tower: [
    p('M10 9.5v8'),
    c(10, 7, 1.6),
    p(
      'M6.6 3.6a5.5 5.5 0 0 0 0 6.8M13.4 3.6a5.5 5.5 0 0 1 0 6.8M4.3 1.6a8.5 8.5 0 0 0 0 10.8M15.7 1.6a8.5 8.5 0 0 1 0 10.8',
    ),
    p('M7 17.5h6'),
  ],
  phone: [
    p(
      'M5.3 3.2h2.6l1 3.4-1.7 1.4a9.5 9.5 0 0 0 4.8 4.8l1.4-1.7 3.4 1v2.6c0 1-0.9 1.8-1.9 1.6A13.5 13.5 0 0 1 3.7 5.1c-.2-1 .6-1.9 1.6-1.9z',
    ),
  ],

  // The one glyph that's a badge rather than a pictogram — a circle housing a
  // question mark reads as "help" faster than any pictogram would.
  help: [
    c(10, 10, 7.2),
    p('M7.7 7.9c.15-1.6 1.7-2.4 3.1-2.1 1.2.2 2 1.2 1.8 2.3-.2 1-1.1 1.5-1.9 2-.6.4-1 .8-1 1.6'),
    c(9.7, 14.3, 0.15),
  ],
  bell: [p('M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.8H4z'), p('M8.3 16.6a1.8 1.8 0 0 0 3.4 0')],
  trash: [
    p('M4 5.5h12M8 5.5V4h4v1.5'),
    p('M5.5 5.5l.8 10.5h7.4l.8-10.5'),
    p('M8.5 8.5v5M11.5 8.5v5'),
  ],
  edit: [p('M12.8 4.2l3 3L7.5 15.5 4 16l.5-3.5z'), p('M11 6l3 3')],
  mail: [r(3, 5, 14, 10, 1.5), p('M3.5 5.8 10 11l6.5-5.2')],
  copy: [r(7, 7, 9, 9, 1.5), p('M13 4.5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.5')],
  video: [r(3, 6, 10, 8, 1.5), p('M13 9.2l4-2.2v6l-4-2.2')],
  upload: [p('M10 13V4M6 8l4-4 4 4M4 16.5h12')],
  camera: [
    p(
      'M3 7.5A1.5 1.5 0 0 1 4.5 6h2l1.2-2h4.6l1.2 2h2A1.5 1.5 0 0 1 17 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z',
    ),
    c(10, 11, 2.8),
  ],
  card: [
    r(3, 5, 14, 10, 1.5),
    c(7.5, 9.5, 1.6),
    p('M5 13c.6-1.2 1.5-1.7 2.5-1.7s1.9.5 2.5 1.7M12 8.5h3M12 11h3'),
  ],
  panel: [r(3, 4, 14, 12, 1.5), p('M8 4v12')],
  close: [p('M5 5l10 10M15 5 5 15')],
  share: [c(14.5, 5, 2), c(5.5, 10, 2), c(14.5, 15, 2), p('M7.3 9.1l5.4-3.1M7.3 10.9l5.4 3.1')],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as readonly IconName[];

@Component({
  selector: 'ar-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:inline-flex;flex:none' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 20 20"
      fill="none"
      [attr.stroke]="'currentColor'"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @for (s of shapes(); track $index) {
        @switch (s.t) {
          @case ('path') {
            <svg:path [attr.d]="s.d" />
          }
          @case ('circle') {
            <svg:circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r" />
          }
          @case ('rect') {
            <svg:rect
              [attr.x]="s.x"
              [attr.y]="s.y"
              [attr.width]="s.w"
              [attr.height]="s.h"
              [attr.rx]="s.rx"
            />
          }
        }
      }
    </svg>
  `,
})
export class ArIcon {
  readonly name = input.required<IconName>();
  readonly size = input(16);
  readonly strokeWidth = input(1.5);
  protected readonly shapes = computed<readonly Shape[]>(() => ICONS[this.name()]);
}
