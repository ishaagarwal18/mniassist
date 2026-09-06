/** Template studio view models. Kept close to the API DTOs but string-enumed and
 *  flattened to the components a person actually edits. */

export type TemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled';

export type TemplateCategory = 'marketing' | 'utility' | 'authentication';

export type TemplateQuality = 'unknown' | 'high' | 'medium' | 'low';

export type LintSeverity = 'info' | 'warning' | 'error';

/** The header formats Meta accepts. `none` means the template has no header. */
export type TemplateHeaderKind = 'none' | 'text' | 'image' | 'video' | 'document';

export type TemplateButtonKind = 'quick_reply' | 'url' | 'phone';

export interface TemplateButtonView {
  readonly kind: TemplateButtonKind;
  readonly text: string;
  readonly url?: string;
  readonly phone?: string;
}

/** Editable button — the composer mutates these in place. */
export interface DraftButton {
  kind: TemplateButtonKind;
  text: string;
  url: string;
  phone: string;
}

export interface Template {
  readonly id: string;
  readonly name: string;
  readonly language: string;
  readonly category: TemplateCategory;
  readonly effectiveCategory: TemplateCategory;
  /** Set when Meta re-categorised the template. Billing follows this, not `category`. */
  readonly metaAssignedCategory?: TemplateCategory;
  readonly status: TemplateStatus;
  readonly quality: TemplateQuality;
  readonly rejectionReason?: string;
  readonly submittedAt?: string;
  readonly approvedAt?: string;
  readonly variableCount: number;
  readonly headerKind: TemplateHeaderKind;
  readonly header?: string;
  readonly body: string;
  readonly footer?: string;
  readonly buttons: readonly TemplateButtonView[];
}

export interface LintItem {
  readonly severity: LintSeverity;
  readonly code: string;
  readonly message: string;
}

export interface DraftTemplate {
  /** Set when editing an existing draft; absent when composing a new one. */
  id?: string;
  name: string;
  language: string;
  category: TemplateCategory;
  headerKind: TemplateHeaderKind;
  header: string;
  body: string;
  footer: string;
  buttons: DraftButton[];
  /** Preview-only sample values, keyed by variable number ("1", "2", …). Never sent —
   *  Meta synthesises its own examples at submission. */
  samples: Record<string, string>;
}
