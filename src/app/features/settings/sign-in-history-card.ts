import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { settled } from '../../core/util/resource';
import { SecurityLogService } from '../../proxy/identity/security-log.service';
import type { SecurityLogDto } from '../../proxy/identity/models';
import { ArCard, ArChip } from '../../ui';
import {
  browserSummary,
  securityActionLabel,
  securityActionTone,
} from '../admin/security-log.util';

const SHOWN = 10;

/**
 * The signed-in user's own recent sign-ins and security changes — the "was that me?"
 * list. A failed attempt from an address they do not recognise is the cue to change the
 * password and turn on two-step verification.
 */
@Component({
  selector: 'ar-sign-in-history-card',
  imports: [ArCard, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-card heading="Recent sign-in activity">
      <p class="sh__muted">
        Your last {{ shown }} sign-ins, failed attempts and security changes. Something you do not
        recognise? Change your password and sign out your other devices.
      </p>
      <ul class="sh">
        @for (l of logs(); track l.id) {
          <li class="sh__row">
            <ar-chip [tone]="tone(l.action)">{{ label(l.action) }}</ar-chip>
            <span class="sh__meta">
              {{ l.creationTime | date: 'dd MMM, HH:mm' }} · {{ l.clientIpAddress || '—' }} ·
              {{ browser(l.browserInfo) }}
            </span>
          </li>
        } @empty {
          <li class="sh__muted">Nothing recorded yet.</li>
        }
      </ul>
    </ar-card>
  `,
  styles: `
    .sh {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .sh__row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-top: 1px solid var(--ar-ink-100);
    }
    .sh__row:first-child {
      border-top: 0;
    }
    .sh__meta,
    .sh__muted {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .sh__muted {
      margin: 0 0 10px;
    }
  `,
})
export class ArSignInHistoryCard {
  private readonly api = inject(SecurityLogService);
  protected readonly shown = SHOWN;

  private readonly resource = rxResource({
    params: () => ({}),
    stream: () => this.api.getMyList({ maxResultCount: SHOWN }),
    defaultValue: { totalCount: 0, items: [] as SecurityLogDto[] },
  });

  protected readonly logs = computed<SecurityLogDto[]>(
    () => settled(this.resource, { totalCount: 0, items: [] }).items ?? [],
  );

  protected label = securityActionLabel;
  protected tone = securityActionTone;
  protected browser = browserSummary;
}
