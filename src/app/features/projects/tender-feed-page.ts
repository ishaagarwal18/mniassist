import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { ArBanner, ArButton, ArCard, ArChip, ArDialog } from '../../ui';
import type { ChipTone } from '../../ui/chip';
import { TENDER_STATUS_TEXT, rupeesShort, splitList } from './project.logic';

/** The filter tabs over the recent alerts. */
export type TenderFilter = 'all' | 'suggested' | 'created' | 'queued' | 'other';

export function alertFilter(status: TenderAlertStatus): Exclude<TenderFilter, 'all'> {
  switch (status) {
    case TenderAlertStatus.Suggested:
      return 'suggested';
    case TenderAlertStatus.ProjectCreated:
      return 'created';
    case TenderAlertStatus.Queued:
      return 'queued';
    default:
      return 'other';
  }
}

/** Whole days from today to a closing date; negative once closed. */
export function daysToClose(closingOn: string | null | undefined, now = new Date()): number | null {
  if (!closingOn) return null;
  const close = new Date(closingOn);
  if (Number.isNaN(close.getTime())) return null;
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(close.getFullYear(), close.getMonth(), close.getDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * The tender feed's settings: on or off, the keywords (with what each has learned), the addresses alerts come from, the inbound
 * address, a box to paste an alert, and the recent alerts with what happened to each.
 */
@Component({
  selector: 'ar-tender-feed-page',
  imports: [ArTopbar, ArButton, ArBanner, ArCard, ArChip, ArDialog, RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tender-feed-page.html',
  styleUrl: './tender-feed-page.scss',
})
export class ArTenderFeedPage {
  private readonly api = inject(TenderFeedService);
  private readonly toasts = inject(ToastService);

  protected readonly settings = signal<TenderFeedSettingsDto | null>(null);
  protected readonly enabled = signal(false);
  protected readonly keywords = signal<string[]>([]);
  protected readonly senders = signal<string[]>([]);
  protected readonly keywordDraft = signal('');
  protected readonly senderDraft = signal('');
  protected readonly filter = signal<TenderFilter>('all');
  protected readonly pasteOpen = signal(false);
  protected readonly rupees = rupeesShort;

  /** Unsaved changes in the settings panel. */
  protected readonly dirty = computed(() => {
    const s = this.settings();
    if (!s) return false;
    const same = (a: string[], b: string[]) => a.join('') === b.join('');
    return (
      s.enabled !== this.enabled() ||
      !same(s.keywords.map((k) => k.word), this.keywords()) ||
      !same(s.senders, this.senders())
    );
  });

  /** Keyword weights learned so far, by word. */
  protected readonly weights = computed(
    () => new Map((this.settings()?.keywords ?? []).map((k) => [k.word.toLowerCase(), k.weight])),
  );

  protected readonly counts = computed(() => {
    const c: Record<TenderFilter, number> = { all: 0, suggested: 0, created: 0, queued: 0, other: 0 };
    for (const a of this.alerts()) {
      c.all++;
      c[alertFilter(a.status)]++;
    }
    return c;
  });

  protected readonly shown = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.alerts() : this.alerts().filter((a) => alertFilter(a.status) === f);
  });

  protected readonly filters: { key: TenderFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'suggested', label: 'Suggested' },
    { key: 'created', label: 'Project made' },
    { key: 'queued', label: 'Being read' },
    { key: 'other', label: 'Other' },
  ];
  protected readonly inboundUrl = signal<string | null>(null);
  protected readonly pasteSubject = signal('');
  protected readonly pasteText = signal('');
  protected readonly alerts = signal<TenderAlertDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);
  protected readonly Status = TenderAlertStatus;

  constructor() {
    void this.load();
  }

  protected statusText(status: TenderAlertStatus): string {
    return TENDER_STATUS_TEXT[status] ?? '';
  }

  protected statusTone(status: TenderAlertStatus): ChipTone {
    switch (status) {
      case TenderAlertStatus.Failed:
        return 'bad';
      case TenderAlertStatus.Suggested:
        return 'ai';
      case TenderAlertStatus.ProjectCreated:
        return 'good';
      case TenderAlertStatus.Queued:
        return 'teal';
      default:
        return 'neutral';
    }
  }

  protected closeText(closingOn: string | null | undefined): string | null {
    const d = daysToClose(closingOn);
    if (d === null) return null;
    if (d < 0) return 'Closed';
    if (d === 0) return 'Closes today';
    return d === 1 ? 'Closes tomorrow' : `${d} days left`;
  }

  protected closeUrgent(closingOn: string | null | undefined): boolean {
    const d = daysToClose(closingOn);
    return d !== null && d >= 0 && d <= 7;
  }

  /** Adds comma/line-separated entries from a draft box, skipping duplicates. */
  protected addEntries(list: 'keywords' | 'senders', event?: Event): void {
    event?.preventDefault();
    const draft = list === 'keywords' ? this.keywordDraft : this.senderDraft;
    const target = list === 'keywords' ? this.keywords : this.senders;
    const fresh = splitList(draft());
    if (!fresh.length) return;
    const have = new Set(target().map((w) => w.toLowerCase()));
    const next = [...target()];
    for (const w of fresh) {
      if (!have.has(w.toLowerCase())) {
        have.add(w.toLowerCase());
        next.push(w);
      }
    }
    target.set(next);
    draft.set('');
  }

  protected removeEntry(list: 'keywords' | 'senders', value: string): void {
    const target = list === 'keywords' ? this.keywords : this.senders;
    target.set(target().filter((w) => w !== value));
  }

  /** Backspace in an empty draft box takes off the last entry. */
  protected backspace(list: 'keywords' | 'senders', event: Event): void {
    const draft = list === 'keywords' ? this.keywordDraft : this.senderDraft;
    const target = list === 'keywords' ? this.keywords : this.senders;
    if (draft() === '' && target().length) {
      event.preventDefault();
      target.set(target().slice(0, -1));
    }
  }

  protected resetSettings(): void {
    const s = this.settings();
    if (!s) return;
    this.enabled.set(s.enabled);
    this.keywords.set(s.keywords.map((k) => k.word));
    this.senders.set([...s.senders]);
  }

  protected async load(refreshForm = true): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [settings, alerts] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(this.api.getAlerts({ maxResultCount: 50 })),
      ]);
      this.settings.set(settings);
      if (refreshForm) {
        this.enabled.set(settings.enabled);
        this.keywords.set(settings.keywords.map((k) => k.word));
        this.senders.set([...settings.senders]);
      }
      this.alerts.set(alerts.items ?? []);
    } catch (e) {
      this.error.set(readApiError(e, 'The tender feed could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(): Promise<void> {
    this.addEntries('keywords');
    this.addEntries('senders');
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.updateSettings({
          enabled: this.enabled(),
          keywords: this.keywords(),
          senders: this.senders(),
        }),
      );
      this.settings.set(saved);
      this.keywords.set(saved.keywords.map((k) => k.word));
      this.senders.set([...saved.senders]);
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
      await this.load(false);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The inbound address could not be made.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async copyAddress(): Promise<void> {
    const url = this.inboundUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.toasts.success('Address copied.');
    } catch {
      this.toasts.error('Could not copy automatically. Select and copy the address manually.');
    }
  }

  protected async paste(): Promise<void> {
    const text = this.pasteText().trim();
    if (text.length < 20) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.paste({ subject: this.pasteSubject().trim() || null, text }));
      this.pasteSubject.set('');
      this.pasteText.set('');
      this.pasteOpen.set(false);
      this.toasts.success('Alert queued. Matching alerts appear on the projects board.');
      await this.load(false);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The alert could not be taken.'));
    } finally {
      this.busy.set(false);
    }
  }
}
