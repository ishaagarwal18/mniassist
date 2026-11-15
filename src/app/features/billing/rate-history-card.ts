import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { BillingService } from '../../proxy/billing/billing.service';
import type { RateHistoryDto } from '../../proxy/billing/models';
import { PricingCategory } from '../../proxy/messaging/pricing-category.enum';

const CATEGORY: Partial<Record<PricingCategory, string>> = {
  [PricingCategory.Marketing]: 'Marketing',
  [PricingCategory.Utility]: 'Utility',
  [PricingCategory.Authentication]: 'Authentication',
  [PricingCategory.Service]: 'Service',
  [PricingCategory.UtilityInWindow]: 'Utility (in reply window)',
};

export function categoryLabel(c: PricingCategory | undefined): string {
  return (c !== undefined && CATEGORY[c]) || 'Other';
}

/** What each WhatsApp message type has cost per message over time in India, and any change already scheduled. */
@Component({
  selector: 'ar-rate-history-card',
  imports: [DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
  `,
  template: `
    <section class="wp__card">
      <h2 class="wp__title">Message rates over time</h2>
      <p class="wp__muted">Per message, for customers in India.</p>
      @for (h of history(); track h.category) {
        <h3 class="wp__name" style="margin-top: 12px">
          {{ label(h.category) }} · now ₹{{ (h.currentRateInPaise ?? 0) / 100 | number: '1.2-4' }}
          @if (h.nextChangeFromUtc) {
            <span class="wp__sub">
              → ₹{{ (h.nextRateInPaise ?? 0) / 100 | number: '1.2-4' }} from
              {{ h.nextChangeFromUtc | date: 'd MMM y' }}
            </span>
          }
        </h3>
        <table class="wp__table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Rate</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            @for (p of h.points ?? []; track p.effectiveFromUtc) {
              <tr>
                <td>{{ p.effectiveFromUtc | date: 'd MMM y' }}</td>
                <td>
                  {{
                    p.effectiveToUtc
                      ? (p.effectiveToUtc | date: 'd MMM y')
                      : p.isCurrent
                        ? 'Now'
                        : '—'
                  }}
                </td>
                <td>₹{{ (p.rateInPaise ?? 0) / 100 | number: '1.2-4' }}</td>
                <td>
                  {{
                    p.changePercent
                      ? (p.changePercent > 0 ? '+' : '') + (p.changePercent | number: '1.0-1') + '%'
                      : '—'
                  }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @empty {
        <p class="wp__empty">{{ loading() ? 'Loading…' : 'No rate history yet.' }}</p>
      }
    </section>
  `,
})
export class ArRateHistoryCard implements OnInit {
  private readonly api = inject(BillingService);

  protected readonly history = signal<RateHistoryDto[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      this.history.set(
        (await firstValueFrom(this.api.getRateHistory('IN', { skipHandleError: true }))).items ??
          [],
      );
    } catch {
      this.history.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  protected label(c: PricingCategory | undefined): string {
    return categoryLabel(c);
  }
}
