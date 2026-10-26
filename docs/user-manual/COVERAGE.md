# Documentation coverage review

Reviewed against the working-tree UI on **26 October 2026**.

| Item | Coverage |
| --- | --- |
| Application route entries | 124 of 124 |
| Distinct routed page components | 117 |
| Page procedures | 118; alternate Customer 360, editor and callback routes share their screen procedure; incoming dealer leads have a separate procedure |
| Standard dialog instances | 149 of 149; the two shared host templates use the common confirmation guide |
| Confirmation/question calls | 108 of 108 |
| Additional custom windows/drawers | 10 |
| Embedded operational/demo panels | 27 |
| Screenshot placeholders/register entries | 414 matching identifiers |
| Internal document links | Checked: all fragment targets exist; no duplicate explicit anchors |
| Markdown tables | Checked: consistent column counts |
| Unresolved UI expressions | Checked: no Angular interpolation or JavaScript template expression remains |

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

Primary UI sources:

- [Routes](../../src/app/app.routes.ts)
- [Navigation and access scope](../../src/app/layout/nav.model.ts)
- [Page-access guard](../../src/app/core/auth/nav-access.guard.ts)
- [Page help topics](../../src/app/core/help/help-topics.ts)
- [Confirmation/question behavior](../../src/app/core/ui/confirm.service.ts)

Before publishing screenshots, use approved sample data and redact credentials,
recovery codes, private URLs and personal/customer details. Recheck these counts
and the affected procedures whenever routes or interactive screens change.
