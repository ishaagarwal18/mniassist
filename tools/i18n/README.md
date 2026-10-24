# ABP localization

All existing UI translations live in the backend `AutoReach` ABP resource:
`autoreach-api/src/AutoReach.Domain.Shared/Localization/AutoReach/{en,hi,mr,gu}.json`.
The API must be released with the web app for this migration. No database migration is required.

Add a `Ui:` key in all four files. The key contains the English source text;
escape `%` as `%25` and `:` as `%3A` in the source portion, in that order.
For example, `Ui:Contacts` and `Ui:Status%3A {0}`.
Keep `{0}`, `{1}`, etc. unchanged in each translation.

New Angular templates should import `LocalizationPipe` from `@abp/ng.core` and use:

```html
{{ 'AutoReach::Ui:Contacts' | abpLocalization }}
{{ 'AutoReach::Ui:Showing {0} of {1}' | abpLocalization:shown:total }}
```

TypeScript can use ABP `LocalizationService.instant()` or `.get()` with the same key.
Existing `LanguageService.t()` calls delegate to that service. Existing screens that
render English literals use `ScreenTranslator` as a rendering adapter fed by ABP's
loaded resource; it no longer owns or loads separate translation dictionaries.
Use `translate="no"` on customer content, messages, identifiers and native language names.

ABP loads culture resources through `/api/abp/application-localization`. Language selection
uses `SessionStateService`; the existing user preference endpoint saves
`Abp.Localization.DefaultLanguage`. Angular locale data is registered for all four cultures.
Mock mode without an API has no translated resources and falls back to English.

Run the Angular `i18n/*.spec.ts` tests and backend `LocalizationResourceTests` after changes.
The backend tests check all languages for identical keys, nonempty UI strings and
placeholder parity. `tools/i18n/extract.py --missing` reports candidate UI strings
missing from the English ABP resource; review its heuristic results before adding keys.

The migration preserves the existing translations. Native-speaker review is still
recommended, particularly for Gujarati.
