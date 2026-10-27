# Documentation coverage review

Reviewed against the working-tree UI on **27 October 2026** (edition 1.1).

| Item | Coverage |
| --- | --- |
| Application route entries | 125 of 125 |
| Distinct routed page components | 118 |
| Page procedures | 119; alternate Customer 360, editor and callback routes share their screen procedure; incoming dealer leads have a separate procedure |
| Standard dialog instances | 150 of 150; the two shared host templates use the common confirmation guide; the AI call batch “New batch” window is covered in its page procedure |
| Confirmation/question calls | 108 of 108 |
| Additional custom windows/drawers | 11 |
| Embedded operational/demo panels | 29 |
| Screenshot placeholders/register entries | 418 matching identifiers |
| Internal document links | Checked: all fragment targets exist; no duplicate explicit anchors |
| Markdown tables | Checked: consistent column counts |
| Unresolved UI expressions | Checked: no Angular interpolation or JavaScript template expression remains; `{{name}}`-style text in the voice agent sections is the product’s own variable syntax |

Edition 1.1 adds the AI voice agent features: the [AI call batches](USER_MANUAL.md#page-calls-ai-batches) page, the rewritten
[voice agent window](USER_MANUAL.md#dialog-ar-voice-agent-dialog-1) (actions during calls, knowledge, memory, after-call
analysis, test calls, publishing), the [AI conversations](USER_MANUAL.md#window-011) window, the
[Call with AI agent](USER_MANUAL.md#panel-ar-inbox-ai-call) and [test call](USER_MANUAL.md#panel-ar-voice-agent-test) panels,
and related troubleshooting and glossary entries.

The manual uses English labels from the page templates and localisation resource.
Coverage is checked against the route list, navigation/access rules, shared child
components and confirmation-service callers. `coverage.csv` records each route,
dialog, question and panel with its source and manual anchor. `screenshots.csv`
is the capture brief register.

Important review boundary: this is **source coverage**, not a new production
acceptance run. No customer data was created, no messages/calls/payments sent,
and no provider or production configuration changed for this documentation task.
External service availability and role/subscription settings remain deployment
specific. Screenshots intentionally remain placeholders requested by the user.
The AI voice agent features in edition 1.1 were verified by automated tests only,
not yet on live calls.

Primary UI sources:

- [Routes](../../src/app/app.routes.ts)
- [Navigation and access scope](../../src/app/layout/nav.model.ts)
- [Page-access guard](../../src/app/core/auth/nav-access.guard.ts)
- [Page help topics](../../src/app/core/help/help-topics.ts)
- [Confirmation/question behavior](../../src/app/core/ui/confirm.service.ts)

Before publishing screenshots, use approved sample data and redact credentials,
recovery codes, private URLs and personal/customer details. Recheck these counts
and the affected procedures whenever routes or interactive screens change.
