import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TemplateService } from '../../proxy/messaging/template.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import type { TemplateDto } from '../../proxy/messaging/models';
import { ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

/** The library template WhatsApp alerts go out on (NotificationDeliveryWorker / AlertTemplateWorker). */
export const ALERT_TEMPLATE_NAME = 'ops_alert';

export type AlertTemplateState = 'approved' | 'pending' | 'blocked' | 'missing';

/** One state for the whole workspace: approved on any number is enough to send alerts from that number. */
export function alertTemplateState(rows: readonly TemplateDto[]): AlertTemplateState {
  const mine = rows.filter((t) => t.name === ALERT_TEMPLATE_NAME);
  if (mine.some((t) => t.status === TemplateStatus.Approved)) return 'approved';
  if (mine.some((t) => t.status === TemplateStatus.Pending || t.status === TemplateStatus.Draft))
    return 'pending';
  if (mine.length > 0) return 'blocked';
  return 'missing';
}

const VIEW: Record<AlertTemplateState, { tone: ChipTone; label: string; text: string }> = {
  approved: {
    tone: 'good',
    label: 'Approved',
    text: 'WhatsApp alerts can reach people any time.',
  },
  pending: {
    tone: 'warn',
    label: 'Waiting for Meta',
    text: 'Until Meta approves it, WhatsApp alerts only reach people who messaged the number in the last 24 hours.',
  },
  blocked: {
    tone: 'bad',
    label: 'Rejected or paused',
    text: 'WhatsApp alerts only reach people who messaged the number in the last 24 hours. Open Templates to fix it.',
  },
  missing: {
    tone: 'neutral',
    label: 'Not added yet',
    text: 'It is added and sent for approval automatically within a few hours of connecting a WhatsApp number.',
  },
};

/**
 * Shows whether the ops_alert template is approved, so nobody has to open Templates to find out why WhatsApp alerts
 * aren't arriving. Hidden when the template list can't be read (no permission, no channel module).
 */
@Component({
  selector: 'ar-alert-template-status',
  imports: [ArChip, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state(); as s) {
      <div class="ats" role="status">
        <span class="ats__label"
          >WhatsApp alert template <code translate="no">{{ name }}</code></span
        >
        <ar-chip [tone]="view[s].tone" [dot]="true">{{ view[s].label }}</ar-chip>
        <span class="ats__text">{{ view[s].text }}</span>
        @if (s !== 'approved') {
          <a class="ats__link" routerLink="/templates">Open Templates</a>
        }
      </div>
    }
  `,
  styleUrl: './alert-template-status.scss',
})
export class ArAlertTemplateStatus implements OnInit {
  private readonly templates = inject(TemplateService);

  protected readonly name = ALERT_TEMPLATE_NAME;
  protected readonly view = VIEW;
  protected readonly state = signal<AlertTemplateState | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.templates.getList(
          { filter: ALERT_TEMPLATE_NAME, maxResultCount: 100 },
          { skipHandleError: true },
        ),
      );
      this.state.set(alertTemplateState(page.items ?? []));
    } catch {
      this.state.set(null);
    }
  }
}
