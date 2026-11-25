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
  'getting-started': [
    p('M7 13 5 11c2-5 6-8 12-8 0 6-3 10-8 12zM5 11l-2 1v3l4-2m2 2-1 2h3l1-3M5 16l-2 2'),
    c(12.5, 7.5, 1.5),
  ],
  'dealer-network': [
    r(7.5, 2.5, 5, 4, 0.75),
    p('M10 6.5v3M5 12V9.5h10V12'),
    p('M2 14l1-2h4l1 2zM3 14v3.5h4V14M12 14l1-2h4l1 2zM13 14v3.5h4V14'),
  ],
  'reseller-programme': [
    p('M3 6h3l2 2 2-2h7v6h-3l-3 4H9l-3-4H3zM8 8l-1 2 2 1 2-2 3 3'),
  ],
  'all-reports': [
    p('M5 4h4l1.5 2H17v10H5zM3 13V3h5M8 9h6m-6 3h4'),
  ],
  'analytics-overview': [
    p('M3 3v14h14M5 12l3-4 3 3 5-6'), c(8, 8, 0.3), c(16, 5, 0.3),
  ],
  'custom-dashboards': [
    r(2.5, 3.5, 15, 13, 1.5), p('M2.5 7h15M9 7v9.5m0-5h8.5'),
  ],
  'platform-console': [
    r(2.5, 4, 15, 12, 1.5), p('M6 8l2 2-2 2m4 0h4'),
  ],
  'workspaces': [
    r(3, 4, 10, 9, 1.5), p('M7 16h8.5a1.5 1.5 0 0 0 1.5-1.5V8M3 7h10'),
  ],
  'feature-flags': [
    p('M5 17V3m0 1c3-2 5 2 9 0v7c-4 2-6-2-9 0'),
  ],
  'ai-providers': [
    r(5, 5, 10, 10, 1.5), p('M8 2.5V5m4-2.5V5M8 15v2.5m4-2.5v2.5M2.5 8H5m-2.5 4H5m10-4h2.5m-2.5 4h2.5M10 7.5v5m-2.5-2.5h5'),
  ],
  'payment-gateways': [
    r(2.5, 4.5, 15, 11, 1.5), p('M2.5 8h15M6 12h3m3 0h3m-1.5-1.5L15 12l-1.5 1.5'),
  ],
  'phone-numbers': [
    p('M8 3 6 17m8-14-2 14M4 7h13M3 13h13'),
  ],
  'status-page': [
    r(2.5, 3.5, 15, 13, 1.5), p('M5 10h2l1.5-3 2 6 1.5-3h3'),
  ],
  'settings-menu': [
    p('M3 5h14M3 10h14M3 15h14'), r(6, 3.5, 2.5, 3, 0.5), r(11, 8.5, 2.5, 3, 0.5), r(7, 13.5, 2.5, 3, 0.5),
  ],
  'work-orders': [
    r(3, 4, 14, 12, 1.5),
    p('M7 4V3h6v1M6.5 9l1.5 1.5 2-2M6.5 13l1.5 1.5 2-2M12 9h2m-2 4h2'),
  ],
  'chart-of-accounts': [
    p('M4 4v12m0-10h3m-3 4h3m-3 4h3M9 5h7m-7 4h5m-5 4h7m-7 3h4'),
  ],
  'journal-entries': [
    p('M3 4h4.5A2.5 2.5 0 0 1 10 6.5 2.5 2.5 0 0 1 12.5 4H17v11h-4.5A2.5 2.5 0 0 0 10 17.5 2.5 2.5 0 0 0 7.5 15H3zM10 6.5v11M5.5 8h2m-2 3h2m5-3h2m-2 3h2'),
  ],
  'financial-statements': [
    r(4, 3, 12, 14, 1.5),
    p('M7 6.5h6M7 13.5v-2m3 2v-3.5m3 3.5v-5'),
  ],
  'gst-compliance': [
    p('M10 2.5 16 5v5c0 3-2.5 5.5-6 7.5-3.5-2-6-4.5-6-7.5V5zM7 9.5l2 2 4-4'),
  ],
  'products': [
    p('M3.5 6.5 10 3l6.5 3.5v7L10 17l-6.5-3.5zM3.5 6.5 10 10l6.5-3.5M10 10v7M7 4.6l6.5 3.5'),
  ],
  'fault-codes': [
    r(2.5, 4, 15, 12, 1.5),
    p('M6 8l2 2-2 2m4 0h2m2-4v2'),
    c(14, 12, 0.2),
  ],
  'price-lists': [
    p('M3.5 5h4l3 3-3 3-4-4zM12 6h4m-4 4h4M4 14h12M4 17h9'),
    c(5.5, 6.5, 0.2),
  ],
  'catalogue': [
    r(3, 3, 5, 5),
    r(12, 3, 5, 5),
    r(3, 12, 5, 5),
    r(12, 12, 5, 5),
  ],
  'documents': [
    p('M6.5 2.5H15l2 2v10H6.5zM15 2.5v2h2M3 6v11.5h10M9 8h5m-5 3h4'),
  ],
  'field-app': [r(5, 2.5, 10, 15, 2), p('M8 9l1.5 1.5L12 8m-3 6.5h2')],
  'amc-contracts': [p('M4 3h12v14H4zM7 6h6M7 9h6m-6 4 2-2 2 2 2-1')],
  'amc-renewals': [r(3, 4, 14, 13, 1.5), p('M6 2.5v3m8-3v3M3 8h14m-4 4a3 3 0 1 0-.8 2.1M13 10v2h-2')],
  'installed-base': [r(5, 3, 10, 10, 1.5), c(10, 8, 2), p('M7 13v3m6-3v3M3 17h14')],
  'obsolescence-radar': [c(10, 10, 7), c(10, 10, 3.5), p('M10 10l5-5'), c(12.5, 12, .35)],
  'spares-due': [p('M3 5l5-2 5 2v4M3 5v7l5 2m-5-9 5 2 5-2M8 7v7'), c(13.5, 13.5, 4), p('M13.5 11.5v2l1.5 1')],
  'remote-maintenance': [r(2.5, 3, 15, 11, 1.5), p('M10 14v3m-4 0h8M5 9h2l1.5-3 2 5L12 8h3')],
  'bill-of-materials': [
    p('M6 4.5 10 2.5l4 2v4l-4 2-4-2zM6 4.5l4 2 4-2M10 6.5v4'),
    p('M10 10.5V13H5v1.5M10 13h5v1.5'),
    r(3, 14.5, 4, 3, 0.75),
    r(13, 14.5, 4, 3, 0.75),
  ],
  'oem-claims': [
    p('M4.5 3h8l3 3v11h-11zM12.5 3v3h3M7 8.5h3M7 12l2 2 4-4'),
  ],
  'whatsapp-calls': [
    p('M4.5 14.5 3 17l3.3-.8A7 7 0 1 0 4.5 14.5z'),
    p('M7 7.5c0 2.8 2.7 5.5 5.5 5.5l1-1.5-2-1-1 1A5 5 0 0 1 8.5 9l1-1-1-2z'),
  ],
  'ai-agents': [
    r(3, 6, 14, 10, 2),
    p('M10 6V3m-3 7v.5m6-.5v.5M8 13h4M3 10H1.5M17 10h1.5'),
  ],
  'ai-batches': [
    p('M3 5h5M3 10h5M3 15h5M11 9h1.5l1.5-4 2 10 1.5-5H19'),
  ],
  helpdesk: [
    p('M3.5 10a6.5 6.5 0 0 1 13 0v3a3 3 0 0 1-3 3H11'),
    r(2.5, 9.5, 3, 4.5),
    r(14.5, 9.5, 3, 4.5),
  ],
  'field-tickets': [
    p('M3 5h14v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM8 12l4-4m-4 0v4h4'),
  ],
  reorders: [
    p('M16.5 8A6.75 6.75 0 0 0 5 5.5L3 8m0-4v4h4M3.5 12A6.75 6.75 0 0 0 15 14.5l2-2.5m0 4v-4h-4'),
  ],
  collections: [
    c(12.5, 6, 3),
    p('M12.5 5v2M3 10.5v5h3l3.5 1.5H13l4-3.5a1.25 1.25 0 0 0-1.5-2L13 13H9.5m3.5 0a1.5 1.5 0 0 0-1.5-1.5H9l-3-1H3'),
  ],
  'deal-registrations': [
    r(4, 4, 12, 13, 1.5),
    r(7, 2.5, 6, 3, 0.75),
    p('M7 11l2 2 4-4'),
  ],
  'special-prices': [
    p('M3 3.5h6.5l7 7a1 1 0 0 1 0 1.4l-4.6 4.6a1 1 0 0 1-1.4 0l-7.5-7.5zM8.5 12l3.5-3.5'),
    c(6, 6.5, 0.5),
    c(8.5, 9, 0.25),
    c(12, 12, 0.25),
  ],
  stock: [
    r(7, 3, 6, 6, 0.75),
    r(3, 11, 6, 6, 0.75),
    r(11, 11, 6, 6, 0.75),
    p('M10 3v2m-4 6v2m8-2v2'),
  ],
  'delivery-challans': [
    p('M2.5 13V5h9v8m0-5h3l3 3v2h-1.5M2.5 13h2m3 0h5.5'),
    c(6, 13.5, 1.5),
    c(14.5, 13.5, 1.5),
  ],
  'sales-invoices': [
    p('M4.5 3h11v14l-2.75-1.5L10 17l-2.75-1.5L4.5 17zM7.5 7H13M7.5 10H13m-5.5 3h2m2.5 0h1'),
  ],
  retention: [
    r(4.5, 8.5, 11, 8, 1.5),
    p('M7 8.5V6a3 3 0 0 1 6 0v2.5M10 12v1.5'),
  ],
  'account-health': [
    p('M10 17 3.8 10.8a4.1 4.1 0 0 1 5.8-5.8l.4.4.4-.4a4.1 4.1 0 0 1 5.8 5.8z'),
    p('M5 10h2.5L9 7.5l2 5 1.5-2.5H15'),
  ],
  'goods-receipt': [
    p('M10 3v8m-3-3 3 3 3-3M3 11v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5M3 11h3l1.5 2h5l1.5-2h3'),
  ],
  'sales-orders': [
    p('M3 4h2l2 9h8l2-6H6'),
    c(8, 16.5, 1),
    c(14, 16.5, 1),
    p('M9 9.5l1.5 1.5 2.5-2.5'),
  ],
  forecast: [
    p('M3 3v14h14M5.5 13l3-4 3 1.5 5-5M13 5.5h3.5V9'),
  ],
  'projection-plan': [
    r(3, 4, 14, 13, 1.5),
    p('M6 2.5v3m8-3v3M3 8h14M6.5 14v-1.5m3.5 1.5v-3m3.5 3v-4'),
  ],
  projects: [
    p('M3.5 3.5v13h13'),
    r(6, 4, 7, 2.5, 0.75),
    r(9, 8.5, 7.5, 2.5, 0.75),
    r(6, 13, 5, 2.5, 0.75),
  ],
  'stock-planning': [
    r(2.5, 4, 15, 13, 1.5),
    p('M6 2.5v3M14 2.5v3M2.5 8h15'),
    p('M6 12l4-2 4 2v2l-4 2-4-2zM6 12l4 2 4-2m-4 2v2'),
  ],
  'debit-note': [
    p('M5 2.5h7l3 3v6M12 2.5v3h3M5 2.5v15h5M8 8h4M8 11h3'),
    c(14.5, 14.5, 3),
    p('M13.2 14.5h2.6'),
  ],
  home: [p('M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z')],
  inbox: [
    p('M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5V13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
    p('M3 11h3.5l1 2h5l1-2H17'),
  ],
  contacts: [c(10, 7, 2.75), p('M4.5 16.5c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5')],
  accounts: [
    r(5, 3, 10, 14, 1),
    p('M8 6.5h.5m3 0h.5M8 10h.5m3 0h.5M9 17v-3.5h2V17'),
  ],
  'customer-360': [
    c(10, 10, 7.5),
    c(10, 8, 2),
    p('M6.5 14c.4-1.5 1.8-2.5 3.5-2.5s3.1 1 3.5 2.5'),
  ],
  'vendor-360': [
    c(10, 10, 7.5),
    p('M6 8l4-2 4 2v4.5l-4 2-4-2zM6 8l4 2 4-2m-4 2v4.5'),
  ],
  campaign: [
    p('M3 8h4l6-3.5v10L7 12H3z'),
    p('M5 12l1.5 4.5H9L7.5 12M16 9.5h2M15.5 6.5l1.5-1M15.5 12.5l1.5 1'),
  ],
  template: [r(4, 3, 12, 14, 1.5), p('M7 7h6M7 10h6M7 13h3.5')],
  automation: [
    c(6, 5.5, 2),
    c(14, 10, 2),
    c(6, 14.5, 2),
    p('M8 5.5h2a2 2 0 0 1 2 2v.5M8 14.5h2a2 2 0 0 0 2-2V12'),
  ],
  flow: [r(3, 3, 6, 5, 1), r(11, 12, 6, 5, 1), p('M6 8v4.5a2 2 0 0 0 2 2h3')],
  enquiry: [
    p('M5 3.5h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-4 3v-3.3a2 2 0 0 1-1-1.7v-7a2 2 0 0 1 2-2z'),
    p('M8 7a2 2 0 1 1 3.4 1.4c-.7.6-1.4.8-1.4 1.6'),
    c(10, 12, 0.2),
  ],
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
  calendar: [r(3, 4, 14, 13, 1.5), p('M6 2.5v3m8-3v3M3 8h14')],
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
  star: [
    p('M10 3.2l2.05 4.2 4.6.65-3.33 3.25.79 4.6L10 13.73 5.89 15.9l.79-4.6L3.35 8.05l4.6-.65z'),
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
  menu: [p('M3 5.5h14M3 10h14M3 14.5h14')],
  share: [c(14.5, 5, 2), c(5.5, 10, 2), c(14.5, 15, 2), p('M7.3 9.1l5.4-3.1M7.3 10.9l5.4 3.1')],
  logout: [p('M9 3H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4'), p('M13 14l4-4-4-4'), p('M17 10H8')],
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
