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
import { ArButton, ArChip } from '../../ui';
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
  imports: [ArButton, ArChip, DatePipe, RouterLink],
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
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }
  `,
  template: `
    <div class="ci">
      <section class="wp__card">
        <h2 class="wp__title">Account health</h2>
        @if (health(); as h) {
          <div class="wp__row">
            <span class="wp__name">{{ h.score }} / 100</span>
            <ar-chip [tone]="band(h.band).tone" [dot]="true">{{ band(h.band).label }}</ar-chip>
          </div>
          <ul class="wp__list">
            @for (r of h.reasons; track r.text) {
              <li class="wp__sub">{{ r.points > 0 ? '+' : '' }}{{ r.points }} · {{ r.text }}</li>
            }
          </ul>
          <p class="wp__sub">Worked out {{ h.computedAtUtc | date: 'd MMM, HH:mm' }}</p>
        } @else {
          <p class="wp__empty">Not scored yet.</p>
        }
      </section>

      @if (contactId()) {
        <section class="wp__card">
          <h2 class="wp__title">Prices and engagement</h2>
          @if (priceList(); as p) {
            <p class="wp__muted">
              Price list: <a routerLink="/documents/price-lists" translate="no">{{ p.name }}</a>
              {{ p.region ? '· ' + p.region : ''
              }}{{ p.distributorTier ? ' · ' + p.distributorTier : '' }}
            </p>
          } @else {
            <p class="wp__muted">No price list applies; quotes use list prices.</p>
          }
          <div class="wp__row">
            <span class="wp__grow">
              Engagement score <strong>{{ score() ?? '—' }}</strong>
              @if (scoredAt(); as at) {
                <span class="wp__sub">updated {{ at | date: 'd MMM, HH:mm' }}</span>
              }
            </span>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="busy()"
              (click)="recompute()"
            >
              {{ busy() ? 'Working out…' : 'Recompute' }}
            </button>
          </div>
        </section>
      }
    </div>

    @if (contactId()) {
      <section class="wp__card" style="margin-top: 14px">
        <h2 class="wp__title">Full history</h2>
        <p class="wp__muted">
          Everything with this customer, including contacts merged into this one.
        </p>
        <ul class="wp__list">
          @for (t of timeline(); track $index) {
            <li class="wp__item">
              <ar-chip tone="neutral">{{ kind(t.kind) }}</ar-chip>
              <span class="wp__grow">
                <span class="wp__name" translate="no">{{ t.title }}</span>
                @if (t.detail) {
                  <span class="wp__sub" translate="no">{{ t.detail }}</span>
                }
              </span>
              <span class="wp__sub">
                {{ t.occurredAtUtc | date: 'd MMM y, HH:mm'
                }}{{ t.actorName ? ' · ' + t.actorName : '' }}
              </span>
            </li>
          } @empty {
            <li class="wp__empty">Nothing recorded yet.</li>
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
