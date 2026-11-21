/**
 * What to tell the user about an API call: "Contact created", "Enquiry moved",
 * or what went wrong. Pure functions, so the rules are unit-tested apart from
 * the interceptor that applies them (api-feedback.interceptor.ts).
 */
import { HttpErrorResponse } from '@angular/common/http';
import { isStackLike, plainServerMessage, statusExplanation } from './plain-errors';

/** API calls that change nothing, or that a screen already reports in its own way. */
const QUIET_ACTIONS = new Set([
  // two-step sign-in and devices: the screens say exactly what happened, in their own words.
  // An "entity/action" pair quiets one endpoint where the action name alone is shared.
  'start-authenticator-setup',
  'enable-authenticator',
  'regenerate-recovery-codes',
  'reset-for-user',
  'two-factor/disable',
  'text-template/restore-default',
  'send-email-confirmation',
  'send-my-email-confirmation',
  'confirm-email',
  'user-security-admin/lock',
  'user-security-admin/unlock',
  'user-security-admin/set-password',
  'end-current',
  // reads, previews and calculations sent as POST
  'dry-run',
  'inspect',
  'preview',
  'preview-merge',
  'read',
  'read-erp-stock',
  'read-card',
  'search',
  'search-by-part-number',
  'search-catalogue',
  'suggest',
  'suggest-replies',
  'suggest-slots',
  'lint',
  'lookup-statuses',
  'count',
  'evaluate',
  'check-conflicts',
  'check-import',
  'simulate',
  'simulate-ivr',
  'render',
  'resolve',
  'resolve-for-contact',
  'resolve-for-locale',
  'resolve-price',
  'poll',
  'preflight',
  'normalise',
  'summarise',
  'draft',
  'prompt',
  'recompute',
  'recompute-score',
  'scan',
  'test',
  'test-razorpay',
  'test-pay-u',
  // downloads
  'download',
  'download-pdf',
  'download-response',
  'export',
  'generate-pdf',
  'ics',
  // background and housekeeping
  'mark-read',
  'report-softphone-event',
  'report-softphone-inbound',
  'refresh',
  // calls and sessions, which have their own live UI
  'join',
  'leave',
  'hang-up',
  'answer',
  'place-call',
  'start-session',
  'end-session',
  // the contact import screen shows the queued import's progress itself
  'start-import',
  'start-softphone-call',
  'enter-client',
  'leave-client',
  'end-acting-session',
  'checkout',
  // public and sign-in flows, which have their own pages
  'register',
  'forgot-password',
  'forgot-workspace',
  'reset-password',
  'request-code',
  'verify',
  'sign',
  'public',
  'code',
]);

/** Path segments that only say which API this is. */
const API_PREFIXES = new Set(['api', 'auto-reach', 'identity', 'multi-tenancy', 'account', 'app']);

const PAST: Record<string, string> = {
  move: 'Moved',
  'move-to-pipeline': 'Moved',
  send: 'Sent',
  'send-now': 'Sent',
  'send-link': 'Link sent',
  'send-media': 'Sent',
  'send-location': 'Sent',
  'send-interactive': 'Sent',
  'send-test': 'Test sent',
  'send-test-email': 'Test email sent',
  cancel: 'Cancelled',
  complete: 'Completed',
  close: 'Closed',
  reopen: 'Reopened',
  assign: 'Assigned',
  'auto-assign': 'Assigned',
  publish: 'Published',
  pause: 'Paused',
  resume: 'Resumed',
  halt: 'Stopped',
  approve: 'Approved',
  reject: 'Rejected',
  revoke: 'Revoked',
  invite: 'Invitation sent',
  'resend-invitation': 'Invitation resent',
  activate: 'Activated',
  deactivate: 'Deactivated',
  reactivate: 'Reactivated',
  merge: 'Merged',
  import: 'Imported',
  'apply-import': 'Imported',
  'import-amc': 'Imported',
  'mark-won': 'Marked as won',
  'mark-lost': 'Marked as lost',
  'mark-paid': 'Marked as paid',
  'mark-sent': 'Marked as sent',
  'mark-no-show': 'Marked as no-show',
  'mark-all-read': 'All marked as read',
  schedule: 'Scheduled',
  reschedule: 'Rescheduled',
  respond: 'Answer saved',
  snooze: 'Snoozed',
  dismiss: 'Dismissed',
  'dismiss-duplicate': 'Dismissed',
  acknowledge: 'Acknowledged',
  retry: 'Retried',
  'retry-delivery': 'Retried',
  'sync-now': 'Sync started',
  'sync-from-meta': 'Sync started',
  'sync-channel': 'Sync started',
  resync: 'Sync started',
  run: 'Started',
  'run-now': 'Started',
  'rotate-key': 'Key rotated',
  'rotate-secret': 'Secret rotated',
  regenerate: 'Regenerated',
  grant: 'Granted',
  'grant-consent': 'Consent recorded',
  link: 'Linked',
  'link-existing': 'Linked',
  accept: 'Accepted',
  decline: 'Declined',
  void: 'Voided',
  issue: 'Issued',
  dispatch: 'Dispatched',
  receive: 'Received',
  fulfil: 'Fulfilled',
  'fulfil-request': 'Fulfilled',
  adjust: 'Adjusted',
  transfer: 'Transferred',
  suspend: 'Suspended',
  'withdraw-marketing-consent': 'Consent withdrawn',
  'top-up': 'Topped up',
  'change-plan': 'Plan changed',
  'change-password': 'Password changed',
  note: 'Note added',
  comment: 'Comment added',
  'conversation-note': 'Note added',
  upload: 'Uploaded',
  'upload-logo': 'Logo uploaded',
  'upload-photo': 'Photo uploaded',
  'upload-recording': 'Recording uploaded',
  'upload-announcement': 'Announcement uploaded',
  'take-snapshot': 'Snapshot saved',
  reorder: 'Order saved',
  'reorder-stages': 'Order saved',
  deprecate: 'Deprecated',
  retire: 'Retired',
  recall: 'Recalled',
  withdraw: 'Withdrawn',
  'set-default': 'Made default',
  'clear-password': 'Password cleared',
  reset: 'Reset to defaults',
};

const isId = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || /^\d+$/.test(s);

const humanise = (s: string) => {
  const t = s.replace(/[-_]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** The success toast for a finished call, or null when this call should pass quietly. */
export function successFor(method: string, url: string): { title: string; content: string } | null {
  const m = method.toUpperCase();
  if (m !== 'POST' && m !== 'PUT' && m !== 'DELETE' && m !== 'PATCH') return null;
  let path: string;
  try {
    path = new URL(url, 'http://x').pathname;
  } catch {
    return null;
  }
  if (!path.startsWith('/api/') || path.startsWith('/api/abp/')) return null;
  const parts = path
    .split('/')
    .filter((p) => p && !API_PREFIXES.has(p) && !isId(p))
    .map((p) => decodeURIComponent(p));
  if (parts.length === 0) return null;
  const entity = parts[0];
  const action = parts.length > 1 ? parts[parts.length - 1] : null;
  if (action && (QUIET_ACTIONS.has(action) || QUIET_ACTIONS.has(`${entity}/${action}`))) {
    return null;
  }
  if (!action && QUIET_ACTIONS.has(entity)) return null;

  const title = humanise(entity);
  if (m === 'DELETE') return { title, content: `${title} deleted.` };
  if (!action) return { title, content: m === 'POST' ? `${title} created.` : `${title} updated.` };
  if (PAST[action]) return { title, content: `${PAST[action]}.` };
  if (action.startsWith('set-') || action.startsWith('save') || m === 'PUT') {
    return { title, content: 'Changes saved.' };
  }
  if (action.startsWith('revoke')) return { title, content: 'Revoked.' };
  if (action.startsWith('mark-')) return { title, content: 'Updated.' };
  return { title, content: 'Saved.' };
}

/**
 * Server answers that only say a feature is not available here (not in the plan,
 * or a workspace-only setting asked for by a host user). The app checks for these
 * in the background (the softphone, the branding), so on a read they would toast
 * on every page; on an action the person took they are still shown.
 */
const QUIET_READ_CODES = new Set([
  'AutoReach:PlanFeatureNotIncluded',
  'AutoReach:BrandingRequiresTenant',
]);

/** A refusal because the workspace's plan does not include the feature. */
export function isPlanRefusal(err: unknown): boolean {
  const body = (err as { error?: { error?: { code?: string } } } | null)?.error;
  return body?.error?.code === 'AutoReach:PlanFeatureNotIncluded';
}

/**
 * Endpoints whose failures the screen shows in place, so a toast would say it twice — the
 * email template preview re-renders as someone types, and a half-typed tag is not news.
 */
const QUIET_FAILURE_PATHS = ['/text-template/'];
const QUIET_FAILURE_ACTIONS = new Set(['preview']);

export function isQuietFailure(method: string, err: HttpErrorResponse, url = ''): boolean {
  const code = ((err.error ?? {}) as { error?: { code?: string } }).error?.code;
  if (method.toUpperCase() === 'GET' && !!code && QUIET_READ_CODES.has(code)) return true;
  let path = '';
  try {
    path = new URL(url, 'http://x').pathname;
  } catch {
    return false;
  }
  const action = path.split('/').filter(Boolean).pop() ?? '';
  return QUIET_FAILURE_ACTIONS.has(action) && QUIET_FAILURE_PATHS.some((p) => path.includes(p));
}

/** The error toast for a failed call: what the server said, in the user's words where it gave them. */
export function errorFor(err: HttpErrorResponse): { title: string; content: string } {
  if (err.status === 0) return statusExplanation(0);
  const body = (err.error ?? {}) as Record<string, unknown>;
  const e = (body['error'] ?? {}) as {
    code?: string;
    message?: string;
    details?: string;
    validationErrors?: { message?: string; members?: string[] }[];
  };
  const fallback = statusExplanation(err.status);
  const lines: string[] = [];
  // With field-by-field messages, ABP's "Your request is not valid!" headline adds nothing.
  const fieldMessages = (e.validationErrors ?? []).filter((v) => v.message);
  if (e.message && !(fieldMessages.length && /^Your request is not valid/i.test(e.message))) {
    lines.push(plainServerMessage(e.message));
  }
  if (e.details && e.details !== e.message && !isStackLike(e.details)) lines.push(e.details);
  for (const v of fieldMessages) lines.push(`• ${v.message}`);
  if (lines.length === 0 && typeof body['error_description'] === 'string') {
    lines.push(plainServerMessage(body['error_description'] as string));
  }

  if (e.code === 'AutoReach:PlanFeatureNotIncluded') {
    lines.push('Open Billing to compare plans, or ask your workspace owner to upgrade.');
    return { title: 'Not in your plan', content: lines.join('\n').slice(0, 600) };
  }

  // ABP answers a broken business rule with 403 too; it carries a code, a
  // missing permission does not.
  const title = e.code ? 'Couldn’t complete that' : fallback.title;
  if (lines.length === 0) lines.push(fallback.content);
  return { title, content: lines.join('\n').slice(0, 600) };
}
