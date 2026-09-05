/** Template studio view models. Kept close to the API DTOs but string-enumed and
 *  flattened to the three components a person actually edits. */

export type TemplateStatus =
  | 'draft' | 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled';

export type TemplateCategory = 'marketing' | 'utility' | 'authentication';

export type TemplateQuality = 'unknown' | 'high' | 'medium' | 'low';

export type LintSeverity = 'info' | 'warning' | 'error';

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
  readonly header?: string;
  readonly body: string;
  readonly footer?: string;
}

export interface LintItem {
  readonly severity: LintSeverity;
  readonly code: string;
  readonly message: string;
}

export interface DraftTemplate {
  name: string;
  language: string;
  category: TemplateCategory;
  header: string;
  body: string;
  footer: string;
}
