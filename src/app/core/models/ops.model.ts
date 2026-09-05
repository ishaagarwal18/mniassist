/**
 * View models for the operational screens — notifications, invoicing, webhooks and
 * support access.
 *
 * These are the client's own shapes, not the API's. The proxy layer under
 * `src/app/proxy` mirrors the server DTOs exactly; `core/api/mapping.ts` is the one
 * place the two meet. Keeping them apart means a DTO rename is a one-file change
 * rather than a sweep through every template.
 */

export type NotificationTone = 'info' | 'warning' | 'critical';

export interface OpsNotification {
  readonly id: string;
  readonly kind: string;
  readonly tone: NotificationTone;
  readonly title: string;
  readonly body: string;
  readonly occurredAt: string;
  readonly read: boolean;
  readonly route?: string;
  /** Whether the email went out, failed, or was never attempted. */
  readonly emailState: 'pending' | 'sent' | 'failed' | 'skipped';
}

export type InvoiceState = 'draft' | 'issued' | 'paid' | 'cancelled' | 'credited';

export interface InvoiceLine {
  readonly description: string;
  /** SAC for a service, HSN for goods. Required on every line by GST rules. */
  readonly sac: string;
  readonly quantity: number;
  readonly taxableValueInPaise: number;
  readonly gstRateBasisPoints: number;
}

export interface Invoice {
  readonly id: string;
  readonly number: string;
  readonly state: InvoiceState;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly issuedAt?: string;
  readonly dueAt?: string;
  readonly customerName: string;
  readonly customerGstin?: string;
  readonly placeOfSupply: string;
  /** Same state as the supplier means CGST + SGST; anything else means one IGST line. */
  readonly interState: boolean;
  readonly taxableValueInPaise: number;
  readonly cgstInPaise: number;
  readonly sgstInPaise: number;
  readonly igstInPaise: number;
  readonly roundOffInPaise: number;
  readonly totalInPaise: number;
  readonly lines: readonly InvoiceLine[];
}

export interface ReconciliationVariance {
  readonly category: string;
  readonly ourCount: number;
  readonly metaCount: number;
  readonly ourCostInPaise: number;
  readonly metaCostInPaise: number;
  readonly likelyCause?: string;
}

export interface ReconciliationRun {
  readonly id: string;
  readonly channelNumber: string;
  readonly periodLabel: string;
  readonly ranAt: string;
  readonly source: string;
  readonly ourConversations: number;
  readonly metaConversations: number;
  readonly ourCostInPaise: number;
  readonly metaCostInPaise: number;
  readonly varianceBasisPoints: number;
  readonly withinTolerance: boolean;
  readonly acknowledged: boolean;
  readonly variances: readonly ReconciliationVariance[];
}

export interface WebhookSubscription {
  readonly id: string;
  readonly url: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly events: readonly string[];
  readonly lastSuccessAt?: string;
  readonly lastFailureAt?: string;
  readonly consecutiveFailures: number;
  readonly lastError?: string;
}

export interface WebhookDelivery {
  readonly id: string;
  readonly event: string;
  readonly state: 'pending' | 'delivered' | 'failed' | 'abandoned';
  readonly attempts: number;
  readonly createdAt: string;
  readonly statusCode?: number;
  readonly error?: string;
}

export interface SupportGrant {
  readonly id: string;
  readonly reason: string;
  readonly grantedBy: string;
  readonly grantedTo?: string;
  readonly grantedAt: string;
  readonly expiresAt: string;
  readonly allowsWrite: boolean;
  readonly revokedAt?: string;
  readonly active: boolean;
  readonly sessionCount: number;
  readonly ticketRef?: string;
}

export interface SupportSession {
  readonly id: string;
  readonly engineer: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly writeEnabled: boolean;
  readonly actionCount: number;
  readonly writeCount: number;
}
