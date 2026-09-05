# AutoReach — Angular front end

Angular 21 implementation of the AutoReach design system and the first four
screens, built from the UI mockups
(`https://claude.ai/code/artifact/20aab613-f1d7-47cb-8cd0-f72f32b6d4a7`).

```bash
npm install
npm start          # http://localhost:4200
npm run build
```

## What is here

| Path | Contents |
|---|---|
| `src/styles/_tokens.scss` | Every design token as a CSS custom property. Change a value here and it changes everywhere — no component hard-codes a colour. |
| `src/styles.scss` | Reset, font loading, the `.ar-table` chrome, a couple of utility classes. |
| `src/app/ui/` | The shared component library. Presentational, no injected services except where noted. |
| `src/app/layout/` | App shell, sidebar, top bar, the nav model. |
| `src/app/core/models/` | Domain types — channel, messaging, contact, conversation. |
| `src/app/core/services/` | Signal-backed stores standing in for the API. |
| `src/app/core/util/` | INR formatting, Indian digit grouping, the ticking clock signal. |
| `src/app/features/` | Dashboard, inbox, campaign builder, contacts — each lazily routed. |

## Component library

| Selector | Notes |
|---|---|
| `<ar-icon [name] [size]>` | 32 icons on a 20px grid. Modelled as typed primitives, so nothing passes through `DomSanitizer`. |
| `<button ar-button [variant] [icon]>` | Attribute selector on a real `<button>` — keyboard and form semantics come free. |
| `<ar-chip [tone] [dot] [mono]>` | Status tones are reserved and never reused as a data-series colour. |
| `<ar-card [heading]>` | Projects `[card-actions]` into the header. |
| `<ar-stat-tile [label] [value] [note] [tone]>` | A hero number reads faster than a one-value chart. |
| `<ar-banner [tone] [hazard]>` | The diagonal hazard bar is reserved for Meta enforcement — a paused template, a quality downgrade, a restriction. |
| `<ar-field [label] [value] [hint]>` | Read-optimised form row; project `[field-affix]` for a trailing chip. |
| `<ar-search-box [(query)]>` | Two-way bindable via `model()`. |
| `<ar-tabs [tabs] [(active)]>` | `role="tablist"` with `aria-selected`. |
| `<ar-meter [value] [max] [tone]>` | `role="progressbar"` — the number is never carried by fill width alone. |
| `<ar-avatar [name] [size] [tone]>` | Initials derived from the name. |
| `<ar-channel-health-strip [channel]>` | The signature component. Quality, tier and rolling 24-hour consumption, pinned to every top bar. |

## Conventions

- **Standalone components, no NgModules.** `input()` / `model()` signal APIs,
  `inject()` over constructor injection.
- **`ChangeDetectionStrategy.OnPush` everywhere.** Every component is either
  signal-driven or purely input-driven, so this is safe throughout.
- **Built-in control flow** (`@if`, `@for` with `track`, `@switch`, `@empty`).
- **Derived state is `computed()`, never hand-maintained.** The campaign
  builder's pre-flight checks read the channel's real headroom, so a check
  cannot claim to pass while the value it guards says otherwise.
- **Host-class styles are written as `:host(.modifier)`.** A bare `.ar-btn {}`
  compiles to `.ar-btn[_ngcontent-x]` and never matches the host element,
  which carries `_nghost-x` instead. This is the single easiest way to write a
  component library that silently does not style itself.
- **Every feature route is `loadComponent`.** The initial bundle is the shell
  and the design system only — about 73 kB transferred.

## Two things worth knowing

**Fonts are not inlined at build time.** `angular.json` sets
`optimization.fonts.inline: false` and `index.html` links Google Fonts
directly. Inlining requires network access during the build, which makes CI
builds fail in an air-gapped runner. If your build environment can reach
`fonts.googleapis.com` and you would rather self-host, drop the `<link>`, add
the woff2 files under `public/fonts/` and declare `@font-face` in
`styles.scss`.

**The services are seeded with sample data.** Names, part numbers, quotation
references and figures are illustrative. Replace the `signal([...])` seeds with
`httpResource()` or a `resource()` and the computed views above keep working
unchanged — that is why the derived values live in `computed()` rather than in
the templates.

## Not yet built

The mockups cover 26 screens. This project implements four. The remaining
features — template studio, campaign report, pipeline, quotations, installed
base, documents, automations, flows, analytics, billing, compliance, settings,
integrations, channel onboarding and health, and the platform back office —
compose from the same library and follow the same feature layout.

---

## Server binding (ABP)

The app talks to the AutoReach ABP API through generated-shape service proxies.

### Switching between seeded data and the live API

`src/environments/environment.development.ts` starts with `useMockData: true`, so
`ng serve` runs the whole UI against the seeded signal stores — the design is
reviewable without a database. Set it to `false` (it is already `false` in
`environment.ts` for production) once the API is running on
`https://localhost:44320`, and the same screens bind to real data.

Three services read that flag: `ChannelService`, `ContactService` and
`InboxService` in `src/app/core/services`. Their public signals are identical in
both modes, so no component knows or cares which one is active.

The one behavioural difference worth knowing: with the API live,
`ChannelService.marketingHeadroom` comes from the server's `ChannelHealthDto`
rather than being computed in the browser. It has to — the messaging tier limit is
scoped to the whole business portfolio, and this browser cannot see what the
tenant's other numbers have already consumed today.

### The proxy layer

`src/app/proxy` holds hand-authored proxies written to the exact conventions
`abp generate-proxy -t ng` emits, so regenerating overwrites them cleanly. See
`src/app/proxy/README.md` for the regeneration command and which modules are
covered so far (channels, contacts, messaging, campaigns, analytics, billing —
the generator will add the rest on its first real run).

`src/app/core/api/mapping.ts` is the single place server DTOs become view models.
DTOs are generated and will change; view models are hand-shaped for the screens.
Keeping the translation in one file means a change on either side surfaces as one
type error rather than a scatter of them.

### Packages added for the binding

- `@abp/ng.core` — `RestService`, config state, `PagedResultDto`/`ListResultDto`,
  permission directives.
- `@abp/ng.oauth` — authorization-code flow with PKCE against
  `environment.oAuthConfig.issuer`.
- `@ngx-validate/core` — required by `@abp/ng.core`.

Initial bundle went from 73 kB to 354 kB raw (95 kB transferred) as a result.
That is the cost of the idiomatic ABP client; a hand-rolled `HttpClient` wrapper
would be smaller but would not give you the config state, permission directives,
or proxy regeneration.
