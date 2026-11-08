import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  TenderAlertDto,
  TenderAlertStatus,
  TenderFeedService,
  TenderFeedSettingsDto,
} from '../../proxy/projects/tender-feed.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { environment } from '../../../environments/environment';
import { TENDER_STATUS_TEXT, splitList } from './project.logic';

/**
 * The tender feed's settings: on or off, the keywords (with what each has learned), the addresses alerts come from, the inbound
 * address, a box to paste an alert, and the recent alerts with what happened to each.
 */
@Component({
  selector: 'ar-tender-feed-page',
  imports: [ArTopbar, ArButton, ArBanner, ArCard, ArChip, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tender-feed-page.html',
  styleUrl: './tender-feed-page.scss',
})
export class ArTenderFeedPage {
  private readonly api = inject(TenderFeedService);
  private readonly toasts = inject(ToastService);

  protected readonly mock = environment.useMockData;
  protected readonly settings = signal<TenderFeedSettingsDto | null>(null);
  protected readonly enabled = signal(false);
  protected readonly keywordsText = signal('');
  protected readonly sendersText = signal('');
  protected readonly inboundUrl = signal<string | null>(null);
  protected readonly pasteSubject = signal('');
  protected readonly pasteText = signal('');
  protected readonly alerts = signal<TenderAlertDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly Status = TenderAlertStatus;

  constructor() {
    void this.load();
  }

  protected statusText(status: TenderAlertStatus): string {
    return TENDER_STATUS_TEXT[status] ?? '';
  }

  private async load(): Promise<void> {
    if (this.mock) return;
    try {
      const [settings, alerts] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(this.api.getAlerts({ maxResultCount: 50 })),
      ]);
      this.settings.set(settings);
      this.enabled.set(settings.enabled);
      this.keywordsText.set(settings.keywords.map((k) => k.word).join(', '));
      this.sendersText.set(settings.senders.join(', '));
      this.alerts.set(alerts.items ?? []);
    } catch (e) {
      this.error.set(readApiError(e, 'The tender feed could not be loaded.'));
    }
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.updateSettings({
          enabled: this.enabled(),
          keywords: splitList(this.keywordsText()),
          senders: splitList(this.sendersText()),
        }),
      );
      this.settings.set(saved);
      this.toasts.success(
        saved.enabled ? 'Tender feed saved and on.' : 'Tender feed saved. It is off.',
      );
    } catch (e) {
      this.toasts.error(readApiError(e, 'The tender feed could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async newAddress(): Promise<void> {
    this.busy.set(true);
    try {
      const made = await firstValueFrom(this.api.createInboundAddress());
      this.inboundUrl.set(made.url);
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The inbound address could not be made.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async copyAddress(): Promise<void> {
    const url = this.inboundUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    this.toasts.success('Address copied.');
  }

  protected async paste(): Promise<void> {
    const text = this.pasteText().trim();
    if (text.length < 20) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.paste({ subject: this.pasteSubject().trim() || null, text }));
      this.pasteSubject.set('');
      this.pasteText.set('');
      this.toasts.success(
        'Alert taken. It is read in a minute; a match shows on the projects board.',
      );
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The alert could not be taken.'));
    } finally {
      this.busy.set(false);
    }
  }
}
