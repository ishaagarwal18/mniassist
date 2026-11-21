import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import {
  AccountHealthDto,
  AccountHealthService,
  HealthBand,
} from '../../proxy/contacts/account-health.service';
import { ContactMergeService } from '../../proxy/contacts/contact-merge.service';
import { ContactService } from '../../proxy/contacts/contact.service';
import { ContactTimelineKind } from '../../proxy/contacts/contact-timeline-kind.enum';
import type { ContactTimelineEntryDto } from '../../proxy/contacts/models';
import { PriceListDto, PriceListService } from '../../proxy/library/price-list.service';
import { ArButton, ArChip, ArIcon } from '../../ui';
import { ChipTone } from '../../ui/chip';

const BAND: Record<HealthBand, { tone: ChipTone; label: string }> = {
  Healthy: { tone: 'good', label: 'Healthy' },
  Watch: { tone: 'warn', label: 'Watch' },
  AtRisk: { tone: 'bad', label: 'At risk' },
};

const KIND: Partial<Record<ContactTimelineKind, string>> = {
  [ContactTimelineKind.Message]: 'Message',
  [ContactTimelineKind.CampaignSend]: 'Campaign',
  [ContactTimelineKind.Note]: 'Note',
  [ContactTimelineKind.ConsentChange]: 'Consent',
  [ContactTimelineKind.EnquiryEvent]: 'Enquiry',
  [ContactTimelineKind.Quotation]: 'Quotation',
  [ContactTimelineKind.FlowSubmission]: 'Flow',
  [ContactTimelineKind.Reminder]: 'Reminder',
  [ContactTimelineKind.AutomationStep]: 'Automation',
  [ContactTimelineKind.ObsolescenceNotice]: 'Obsolescence',
};

export function timelineKindLabel(k: ContactTimelineKind | undefined): string {
  return (k !== undefined && KIND[k]) || 'Activity';
}

/**
 * The lookups for one customer that no other screen shows: account health with its reasons, the price list that
 * applies to them, their engagement score (recompute on demand) and the full history, including everything from
 * contacts that were merged into this one.
 */
@Component({
  selector: 'ar-customer-insights',
  imports: [ArButton, ArChip, ArIcon, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
      margin: 16px 0;
    }
    .ci {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }
    .ah-card,
    .pe-card,
    .fh-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .ah-card:hover,
    .pe-card:hover,
    .fh-card:hover {
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
    }
    .ah-card__header,
    .pe-card__header,
    .fh-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }
    .ah-card__title-wrap,
    .pe-card__title-wrap {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #0f172a;
    }
    .ah-card__title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .ah-card__body {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .ah-gauge-container {
      position: relative;
      width: 80px;
      height: 80px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ah-gauge {
      display: block;
    }
    .ah-gauge__content {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .ah-gauge__val {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      font-family: var(--ar-font-mono, monospace);
    }
    .ah-gauge__max {
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }
    .ah-factors {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      flex-grow: 1;
      min-width: 180px;
    }
    .ah-factors__label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .ah-factors__list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .ah-factor-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
    }
    .ah-factor-pts {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      font-family: var(--ar-font-mono, monospace);
      flex-shrink: 0;
    }
    .ah-factor-pts--pos {
      background: #ecfdf5;
      color: #059669;
    }
    .ah-factor-pts--neg {
      background: #fef2f2;
      color: #dc2626;
    }
    .ah-factor-desc {
      color: #334155;
      line-height: 1.3;
    }
    .ah-factors__empty {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0;
    }
    .ah-card__footer {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: #64748b;
      padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
    }
    .ah-empty-state {
      padding: 1.5rem 0;
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .pe-card__body {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .pe-info-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.82rem;
    }
    .pe-info-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .pe-price-link {
      font-weight: 600;
      color: #2563eb;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .pe-price-link:hover {
      text-decoration: underline;
    }
    .pe-tag {
      font-size: 0.7rem;
      font-weight: 500;
      color: #475569;
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .pe-info-muted {
      color: #64748b;
    }
    .pe-score-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }
    .pe-score-meta {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .pe-score-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .pe-score-val-wrap {
      display: inline-flex;
      align-items: baseline;
      gap: 0.5rem;
    }
    .pe-score-val {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      font-family: var(--ar-font-mono, monospace);
    }
    .pe-score-time {
      font-size: 0.72rem;
      color: #64748b;
    }
    .pe-recompute-btn {
      font-size: 0.78rem;
    }
    .fh-card__subtitle {
      font-size: 0.78rem;
      color: #64748b;
      margin: 0.15rem 0 0;
    }
    .fh-timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .fh-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      font-size: 0.82rem;
      transition: background 0.15s ease;
    }
    .fh-item:hover {
      background: #f1f5f9;
    }
    .fh-chip {
      flex-shrink: 0;
    }
    .fh-content {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      flex-grow: 1;
      min-width: 0;
    }
    .fh-title {
      font-weight: 600;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .fh-detail {
      font-size: 0.75rem;
      color: #64748b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .fh-meta {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.72rem;
      color: #64748b;
      flex-shrink: 0;
    }
    .fh-actor {
      font-weight: 500;
    }
    .fh-empty {
      padding: 1.5rem;
      text-align: center;
      color: #64748b;
      font-size: 0.82rem;
    }
  `,
  template: `
    <div class="ci">
      <section class="ah-card">
        <div class="ah-card__header">
          <div class="ah-card__title-wrap">
            <ar-icon name="account-health" [size]="18" />
            <h2 class="ah-card__title">Account Health</h2>
          </div>
          @if (health(); as h) {
            <ar-chip [tone]="band(h.band).tone" [dot]="true">{{ band(h.band).label }}</ar-chip>
          }
        </div>

        @if (health(); as h) {
          <div class="ah-card__body">
            <!-- Circular SVG Progress Gauge (radius 30, dasharray 188.5) -->
            <div class="ah-gauge-container">
              <svg class="ah-gauge" viewBox="0 0 80 80" width="80" height="80">
                <circle
                  cx="40"
                  cy="40"
                  r="30"
                  fill="none"
                  stroke="#E2E8F0"
                  stroke-width="7"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="30"
                  fill="none"
                  [attr.stroke]="scoreColor(h.score)"
                  stroke-width="7"
                  stroke-linecap="round"
                  stroke-dasharray="188.5"
                  [attr.stroke-dashoffset]="strokeOffset(h.score)"
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div class="ah-gauge__content">
                <span class="ah-gauge__val">{{ h.score }}</span>
                <span class="ah-gauge__max">/100</span>
              </div>
            </div>

            <!-- Score Factors -->
            <div class="ah-factors">
              <span class="ah-factors__label">Scoring Factors</span>
              @if (h.reasons && h.reasons.length > 0) {
                <div class="ah-factors__list">
                  @for (r of h.reasons; track r.text) {
                    <div class="ah-factor-item">
                      <span
                        class="ah-factor-pts"
                        [class.ah-factor-pts--pos]="r.points > 0"
                        [class.ah-factor-pts--neg]="r.points < 0"
                      >
                        {{ r.points > 0 ? '+' : '' }}{{ r.points }}
                      </span>
                      <span class="ah-factor-desc">{{ r.text }}</span>
                    </div>
                  }
                </div>
              } @else {
                <p class="ah-factors__empty">No specific scoring factors recorded.</p>
              }
            </div>
          </div>

          <div class="ah-card__footer">
            <ar-icon name="clock" [size]="13" />
            <span>Calculated {{ h.computedAtUtc | date: 'd MMM y, HH:mm' }}</span>
          </div>
        } @else {
          <div class="ah-empty-state">
            <ar-icon name="account-health" [size]="28" />
            <p>Account health has not been scored yet.</p>
          </div>
        }
      </section>

      @if (contactId()) {
        <section class="pe-card">
          <div class="pe-card__header">
            <div class="pe-card__title-wrap">
              <ar-icon name="price-lists" [size]="18" />
              <h2 class="ah-card__title">Prices and Engagement</h2>
            </div>
          </div>
          <div class="pe-card__body">
            <div class="pe-info-row">
              <span class="pe-info-label">Active Price List</span>
              @if (priceList(); as p) {
                <a routerLink="/documents/price-lists" class="pe-price-link" translate="no">
                  {{ p.name }}
                  @if (p.region) {
                    <span class="pe-tag">{{ p.region }}</span>
                  }
                  @if (p.distributorTier) {
                    <span class="pe-tag">{{ p.distributorTier }}</span>
                  }
                </a>
              } @else {
                <span class="pe-info-muted">No price list applies; quotes use list prices.</span>
              }
            </div>

            <div class="pe-score-row">
              <div class="pe-score-meta">
                <span class="pe-score-label">Engagement Score</span>
                <div class="pe-score-val-wrap">
                  <span class="pe-score-val">{{ score() ?? '—' }}</span>
                  @if (scoredAt(); as at) {
                    <span class="pe-score-time">Updated {{ at | date: 'd MMM, HH:mm' }}</span>
                  }
                </div>
              </div>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="recompute()"
                class="pe-recompute-btn"
              >
                <ar-icon name="refresh" [size]="13" />
                {{ busy() ? 'Calculating…' : 'Recompute' }}
              </button>
            </div>
          </div>
        </section>
      }
    </div>

    @if (contactId()) {
      <section class="fh-card" style="margin-top: 14px">
        <div class="fh-card__header">
          <div>
            <h2 class="ah-card__title">Customer Activity History</h2>
            <p class="fh-card__subtitle">Complete unified audit trail across all linked contacts.</p>
          </div>
        </div>
        <ul class="fh-timeline">
          @for (t of timeline(); track $index) {
            <li class="fh-item">
              <ar-chip tone="neutral" class="fh-chip">{{ kind(t.kind) }}</ar-chip>
              <div class="fh-content">
                <span class="fh-title" translate="no">{{ t.title }}</span>
                @if (t.detail) {
                  <span class="fh-detail" translate="no">{{ t.detail }}</span>
                }
              </div>
              <div class="fh-meta">
                <ar-icon name="clock" [size]="12" />
                <span>{{ t.occurredAtUtc | date: 'd MMM y, HH:mm' }}</span>
                @if (t.actorName) {
                  <span class="fh-actor">· {{ t.actorName }}</span>
                }
              </div>
            </li>
          } @empty {
            <li class="fh-empty">Nothing recorded yet in audit history.</li>
          }
        </ul>
      </section>
    }
  `,
})
export class ArCustomerInsights {
  private readonly healthApi = inject(AccountHealthService);
  private readonly priceApi = inject(PriceListService);
  private readonly contacts = inject(ContactService);
  private readonly merge = inject(ContactMergeService);
  private readonly toasts = inject(ToastService);

  /** The contact or account the page shows; health works for both. */
  readonly customerId = input.required<string>();
  /** Set only for a person: price list, score and timeline are per contact. */
  readonly contactId = input<string | null | undefined>(null);

  protected readonly health = signal<AccountHealthDto | null>(null);
  protected readonly priceList = signal<PriceListDto | null>(null);
  protected readonly score = signal<number | null>(null);
  protected readonly scoredAt = signal<string | null>(null);
  protected readonly timeline = signal<ContactTimelineEntryDto[]>([]);
  protected readonly busy = signal(false);

  constructor() {
    effect(() => {
      const customer = this.customerId();
      const contact = this.contactId();
      untracked(() => void this.load(customer, contact ?? null));
    });
  }

  protected band(b: HealthBand) {
    return BAND[b] ?? BAND.Watch;
  }

  protected kind(k: ContactTimelineKind | undefined): string {
    return timelineKindLabel(k);
  }

  protected strokeOffset(score: number): number {
    const clamped = Math.max(0, Math.min(100, score || 0));
    return 188.5 - (188.5 * clamped) / 100;
  }

  protected scoreColor(score: number): string {
    if (score >= 80) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  }

  private async load(customerId: string, contactId: string | null): Promise<void> {
    const quiet = { skipHandleError: true };
    const [h, p, c, t] = await Promise.allSettled([
      firstValueFrom(this.healthApi.getForCustomer(customerId, quiet)),
      contactId
        ? firstValueFrom(this.priceApi.resolveForContact(contactId, quiet))
        : Promise.resolve(null),
      contactId ? firstValueFrom(this.contacts.get(contactId, quiet)) : Promise.resolve(null),
      contactId
        ? firstValueFrom(this.merge.getTimeline(contactId, { maxResultCount: 50 }, quiet))
        : Promise.resolve(null),
    ]);
    this.health.set(h.status === 'fulfilled' ? h.value : null);
    this.priceList.set(p.status === 'fulfilled' ? p.value : null);
    if (c.status === 'fulfilled' && c.value) {
      this.score.set(c.value.engagementScore ?? null);
      this.scoredAt.set(c.value.scoreUpdatedAtUtc ?? null);
    }
    this.timeline.set(t.status === 'fulfilled' ? (t.value?.items ?? []) : []);
  }

  protected async recompute(): Promise<void> {
    const id = this.contactId();
    if (!id) return;
    this.busy.set(true);
    try {
      const c = await firstValueFrom(this.contacts.recomputeScore(id, { skipHandleError: true }));
      this.score.set(c.engagementScore ?? null);
      this.scoredAt.set(c.scoreUpdatedAtUtc ?? null);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The score could not be worked out.'), 'Customer');
    } finally {
      this.busy.set(false);
    }
  }
}
