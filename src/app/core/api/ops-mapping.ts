import {
  InvoiceDto,
  InvoiceState as InvoiceStateDto,
  ReconciliationRunDto,
} from '../../proxy/billing';
import { WebhookSubscriptionDto, WebhookEvent } from '../../proxy/integrations';
import { NotificationDto, NotificationDeliveryState, NotificationKind, NotificationSeverity } from '../../proxy/notifications';
import { SupportImpersonationGrantDto, SupportSessionDto } from '../../proxy/platform';
import {
  Invoice,
  InvoiceState,
  NotificationTone,
  OpsNotification,
  ReconciliationRun,
  SupportGrant,
  SupportSession,
  WebhookSubscription,
} from '../models/ops.model';

/**
 * The single translation point between the server DTOs and the client's own view
 * models for the operational screens.
 *
 * The generated DTOs mark almost every field optional (ABP's api-definition does
 * not distinguish "nullable on write" from "always present on read"), so the
 * fallbacks below are load-bearing: they turn "the server always sends this" into
 * a type the templates do not have to guard.
 */

const TONE: Record<NotificationSeverity, NotificationTone> = {
  [NotificationSeverity.Info]: 'info',
  [NotificationSeverity.Warning]: 'warning',
  [NotificationSeverity.Critical]: 'critical',
};

const EMAIL_STATE: Record<NotificationDeliveryState, OpsNotification['emailState']> = {
  [NotificationDeliveryState.Pending]: 'pending',
  [NotificationDeliveryState.Sent]: 'sent',
  [NotificationDeliveryState.Failed]: 'failed',
  [NotificationDeliveryState.Skipped]: 'skipped',
};

export function toNotification(dto: NotificationDto): OpsNotification {
  return {
    id: dto.id!,
    kind: dto.kind != null ? (NotificationKind[dto.kind] ?? 'Unknown') : 'Unknown',
    tone: dto.severity != null ? (TONE[dto.severity] ?? 'info') : 'info',
    title: dto.title ?? '',
    body: dto.body ?? '',
    occurredAt: dto.occurredAtUtc ?? '',
    read: dto.isRead ?? false,
    route: dto.actionRoute ?? undefined,
    emailState: dto.emailState != null ? (EMAIL_STATE[dto.emailState] ?? 'pending') : 'pending',
  };
}

const INVOICE_STATE: Record<InvoiceStateDto, InvoiceState> = {
  [InvoiceStateDto.Draft]: 'draft',
  [InvoiceStateDto.Issued]: 'issued',
  [InvoiceStateDto.Paid]: 'paid',
  [InvoiceStateDto.Cancelled]: 'cancelled',
  [InvoiceStateDto.Credited]: 'credited',
};

export function toInvoice(dto: InvoiceDto): Invoice {
  return {
    id: dto.id!,
    number: dto.number ?? '',
    state: dto.state != null ? (INVOICE_STATE[dto.state] ?? 'draft') : 'draft',
    periodStart: dto.periodStartUtc ?? '',
    periodEnd: dto.periodEndUtc ?? '',
    issuedAt: dto.issuedAtUtc ?? undefined,
    dueAt: dto.dueAtUtc ?? undefined,
    customerName: dto.customerLegalName ?? '',
    customerGstin: dto.customerGstin ?? undefined,
    placeOfSupply: dto.placeOfSupplyStateCode ?? '',
    interState: dto.isInterState ?? false,
    taxableValueInPaise: dto.taxableValueInPaise ?? 0,
    cgstInPaise: dto.cgstInPaise ?? 0,
    sgstInPaise: dto.sgstInPaise ?? 0,
    igstInPaise: dto.igstInPaise ?? 0,
    roundOffInPaise: dto.roundOffInPaise ?? 0,
    totalInPaise: dto.totalInPaise ?? 0,
    lines: (dto.lines ?? []).map(l => ({
      description: l.description ?? '',
      sac: l.hsnOrSacCode ?? '',
      quantity: l.quantity ?? 0,
      taxableValueInPaise: l.taxableValueInPaise ?? 0,
      gstRateBasisPoints: l.gstRateBasisPoints ?? 0,
    })),
  };
}

export function toReconciliationRun(dto: ReconciliationRunDto): ReconciliationRun {
  return {
    id: dto.id!,
    channelNumber: dto.channelDisplayNumber ?? '—',
    periodLabel: `${formatDay(dto.periodStartUtc)} – ${formatDay(dto.periodEndUtc)}`,
    ranAt: dto.runAtUtc ?? '',
    source: dto.source ?? '',
    ourConversations: dto.ourConversationCount ?? 0,
    metaConversations: dto.metaConversationCount ?? 0,
    ourCostInPaise: dto.ourCostInPaise ?? 0,
    metaCostInPaise: dto.metaCostInPaise ?? 0,
    varianceBasisPoints: dto.costVarianceBasisPoints ?? 0,
    withinTolerance: dto.withinTolerance ?? true,
    acknowledged: dto.acknowledgedAtUtc != null,
    variances: (dto.variances ?? []).map(v => ({
      category: String(v.category),
      ourCount: v.ourCount ?? 0,
      metaCount: v.metaCount ?? 0,
      ourCostInPaise: v.ourCostInPaise ?? 0,
      metaCostInPaise: v.metaCostInPaise ?? 0,
      likelyCause: v.likelyCause ?? undefined,
    })),
  };
}

export function toWebhookSubscription(dto: WebhookSubscriptionDto): WebhookSubscription {
  return {
    id: dto.id!,
    url: dto.url ?? '',
    description: dto.description ?? dto.url ?? '',
    enabled: dto.isEnabled ?? false,
    events: (dto.events ?? []).map(e => WebhookEvent[e] ?? String(e)),
    lastSuccessAt: dto.lastSuccessAtUtc ?? undefined,
    lastFailureAt: dto.lastFailureAtUtc ?? undefined,
    consecutiveFailures: dto.consecutiveFailureCount ?? 0,
    lastError: dto.lastError ?? undefined,
  };
}

export function toSupportGrant(dto: SupportImpersonationGrantDto): SupportGrant {
  return {
    id: dto.id!,
    reason: dto.reason ?? '',
    grantedBy: dto.grantedByName ?? '—',
    grantedTo: dto.grantedToName ?? '',
    grantedAt: dto.grantedAtUtc ?? '',
    expiresAt: dto.expiresAtUtc ?? '',
    allowsWrite: dto.allowsWrite ?? false,
    revokedAt: dto.revokedAtUtc ?? undefined,
    active: dto.isActive ?? false,
    sessionCount: dto.sessionCount ?? 0,
    ticketRef: dto.ticketRef ?? undefined,
  };
}

export function toSupportSession(dto: SupportSessionDto): SupportSession {
  return {
    id: dto.id!,
    engineer: dto.supportUserName ?? '',
    startedAt: dto.startedAtUtc ?? '',
    endedAt: dto.endedAtUtc ?? undefined,
    writeEnabled: dto.writeEnabled ?? false,
    actionCount: dto.actionCount ?? 0,
    writeCount: dto.writeCount ?? 0,
  };
}

function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
