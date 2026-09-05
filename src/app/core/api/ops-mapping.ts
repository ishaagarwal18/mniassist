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
 * Every `dto.id!` here is deliberate: ABP's `EntityDto<TKey>` declares `id` as
 * optional because the same type is reused for creates, but a DTO that came back
 * from the server always has one. Asserting once here is better than making every
 * template handle a null id that cannot occur.
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
    kind: NotificationKind[dto.kind] ?? 'Unknown',
    tone: TONE[dto.severity] ?? 'info',
    title: dto.title,
    body: dto.body,
    occurredAt: dto.occurredAtUtc,
    read: dto.isRead,
    route: dto.actionRoute,
    emailState: EMAIL_STATE[dto.emailState] ?? 'pending',
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
    number: dto.number,
    state: INVOICE_STATE[dto.state] ?? 'draft',
    periodStart: dto.periodStartUtc,
    periodEnd: dto.periodEndUtc,
    issuedAt: dto.issuedAtUtc,
    dueAt: dto.dueAtUtc,
    customerName: dto.customerLegalName,
    customerGstin: dto.customerGstin,
    placeOfSupply: dto.placeOfSupplyStateCode,
    interState: dto.isInterState,
    taxableValueInPaise: dto.taxableValueInPaise,
    cgstInPaise: dto.cgstInPaise,
    sgstInPaise: dto.sgstInPaise,
    igstInPaise: dto.igstInPaise,
    roundOffInPaise: dto.roundOffInPaise,
    totalInPaise: dto.totalInPaise,
    lines: (dto.lines ?? []).map(l => ({
      description: l.description,
      sac: l.hsnOrSacCode,
      quantity: l.quantity,
      taxableValueInPaise: l.taxableValueInPaise,
      gstRateBasisPoints: l.gstRateBasisPoints,
    })),
  };
}

export function toReconciliationRun(dto: ReconciliationRunDto): ReconciliationRun {
  return {
    id: dto.id!,
    channelNumber: dto.channelDisplayNumber ?? '—',
    periodLabel: `${formatDay(dto.periodStartUtc)} – ${formatDay(dto.periodEndUtc)}`,
    ranAt: dto.runAtUtc,
    source: dto.source,
    ourConversations: dto.ourConversationCount,
    metaConversations: dto.metaConversationCount,
    ourCostInPaise: dto.ourCostInPaise,
    metaCostInPaise: dto.metaCostInPaise,
    varianceBasisPoints: dto.costVarianceBasisPoints,
    withinTolerance: dto.withinTolerance,
    acknowledged: dto.acknowledgedAtUtc != null,
    variances: (dto.variances ?? []).map(v => ({
      category: String(v.category),
      ourCount: v.ourCount,
      metaCount: v.metaCount,
      ourCostInPaise: v.ourCostInPaise,
      metaCostInPaise: v.metaCostInPaise,
      likelyCause: v.likelyCause,
    })),
  };
}

export function toWebhookSubscription(dto: WebhookSubscriptionDto): WebhookSubscription {
  return {
    id: dto.id!,
    url: dto.url,
    description: dto.description ?? dto.url,
    enabled: dto.isEnabled,
    events: (dto.events ?? []).map(e => WebhookEvent[e] ?? String(e)),
    lastSuccessAt: dto.lastSuccessAtUtc,
    lastFailureAt: dto.lastFailureAtUtc,
    consecutiveFailures: dto.consecutiveFailureCount,
    lastError: dto.lastError,
  };
}

export function toSupportGrant(dto: SupportImpersonationGrantDto): SupportGrant {
  return {
    id: dto.id!,
    reason: dto.reason,
    grantedBy: dto.grantedByName ?? '—',
    grantedTo: dto.grantedToName,
    grantedAt: dto.grantedAtUtc,
    expiresAt: dto.expiresAtUtc,
    allowsWrite: dto.allowsWrite,
    revokedAt: dto.revokedAtUtc,
    active: dto.isActive,
    sessionCount: dto.sessionCount,
    ticketRef: dto.ticketRef,
  };
}

export function toSupportSession(dto: SupportSessionDto): SupportSession {
  return {
    id: dto.id!,
    engineer: dto.supportUserName,
    startedAt: dto.startedAtUtc,
    endedAt: dto.endedAtUtc,
    writeEnabled: dto.writeEnabled,
    actionCount: dto.actionCount,
    writeCount: dto.writeCount,
  };
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
