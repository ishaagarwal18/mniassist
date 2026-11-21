import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import { CurrentUserService } from '../../core/services/current-user.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  NewsletterAdminService,
  NewsletterIssueStatus,
  NewsletterSubscriberStatus,
  type NewsletterCountsDto,
  type NewsletterIssueDto,
  type NewsletterSubscriberDto,
} from '../../proxy/newsletter/newsletter.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { STARTER_BODY, downloadCsv, issueProgress, issueStatus, subscriberStatus } from './newsletter-logic';

const PAGE = 25;

/**
 * Platform › Newsletter: the issues the platform team writes and sends to everyone who confirmed their sign-up in the
 * public website's footer, and that subscriber list. Sending runs in the background; this page polls while one is out.
 */
@Component({
  selector: 'ar-newsletter-page',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './newsletter-page.html',
  styleUrl: './newsletter-page.scss',
})
export class ArNewsletterPage {
  private readonly api = inject(NewsletterAdminService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly me = inject(CurrentUserService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly Status = NewsletterSubscriberStatus;
  protected readonly IssueStatus = NewsletterIssueStatus;
  protected readonly subscriberStatus = subscriberStatus;
  protected readonly issueStatus = issueStatus;
  protected readonly issueProgress = issueProgress;

  protected readonly tab = signal<'issues' | 'subscribers'>('issues');
  protected readonly counts = signal<NewsletterCountsDto>({ pending: 0, confirmed: 0, unsubscribed: 0 });
  protected readonly busy = signal(false);

  // ---- Issues ----------------------------------------------------------------------------------------------
  protected readonly issues = signal<NewsletterIssueDto[]>([]);
  protected readonly issuesError = signal<string | null>(null);
  protected readonly sendingNow = computed(() => this.issues().some((i) => i.status === NewsletterIssueStatus.Sending));

  /** The issue open in the editor: a draft to change, or a sent one to read. */
  protected readonly editing = signal<{ id: string | null; subject: string; body: string; readOnly: boolean } | null>(null);
  protected readonly editError = signal<string | null>(null);

  // ---- Subscribers -----------------------------------------------------------------------------------------
  protected readonly subscribers = signal<NewsletterSubscriberDto[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly filter = signal('');
  protected readonly statusFilter = signal<NewsletterSubscriberStatus | null>(null);
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE)));

  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    void this.loadIssues();
    void this.loadCounts();

    // While an issue is going out, refresh its progress every few seconds.
    effect(() => {
      clearInterval(this.pollTimer);
      if (this.sendingNow()) this.pollTimer = setInterval(() => void this.loadIssues(), 5000);
    });

    // The subscriber list follows the tab, page and filters; typing waits a moment.
    effect(() => {
      if (this.tab() !== 'subscribers') return;
      const args = { page: this.page(), filter: this.filter().trim(), status: this.statusFilter() };
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => void this.loadSubscribers(args), 250);
    });

    inject(DestroyRef).onDestroy(() => {
      clearInterval(this.pollTimer);
      clearTimeout(this.searchTimer);
    });
  }

  protected async loadIssues(): Promise<void> {
    try {
      const r = await firstValueFrom(this.api.getIssues({ skipHandleError: true }));
      this.issues.set(r.items ?? []);
      this.issuesError.set(null);
      if (!this.sendingNow()) void this.loadCounts();
    } catch (e: unknown) {
      this.issuesError.set(readApiError(e, 'The newsletters could not be loaded.'));
    }
  }

  private async loadCounts(): Promise<void> {
    try {
      this.counts.set(await firstValueFrom(this.api.getCounts({ skipHandleError: true })));
    } catch {
      // The counts are a summary; the lists show their own errors.
    }
  }

  private async loadSubscribers(a: { page: number; filter: string; status: NewsletterSubscriberStatus | null }): Promise<void> {
    try {
      const r = await firstValueFrom(
        this.api.getSubscribers(
          { status: a.status, filter: a.filter || null, skipCount: a.page * PAGE, maxResultCount: PAGE },
          { skipHandleError: true },
        ),
      );
      this.subscribers.set(r.items ?? []);
      this.total.set(r.totalCount ?? 0);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The subscribers could not be loaded.'), 'Newsletter');
    }
  }

  protected setFilter(value: string): void {
    this.filter.set(value);
    this.page.set(0);
  }

  protected setStatusFilter(value: string): void {
    this.statusFilter.set(value === '' ? null : (Number(value) as NewsletterSubscriberStatus));
    this.page.set(0);
  }

  // ---- Issue actions ---------------------------------------------------------------------------------------
  protected openNew(): void {
    this.editError.set(null);
    this.editing.set({ id: null, subject: '', body: STARTER_BODY, readOnly: false });
  }

  protected open(i: NewsletterIssueDto): void {
    this.editError.set(null);
    this.editing.set({
      id: i.id,
      subject: i.subject,
      body: i.bodyHtml,
      readOnly: i.status !== NewsletterIssueStatus.Draft,
    });
  }

  protected edit(key: 'subject' | 'body', value: string): void {
    const e = this.editing();
    if (e) this.editing.set({ ...e, [key]: value });
  }

  /**
   * The preview's document: the body as the email will wrap it. Trusted because it is the platform team's own draft
   * and the frame is sandboxed with no scripts; the sanitiser would otherwise strip the inline styles email relies on.
   */
  protected readonly preview = computed<SafeHtml>(() => {
    const e = this.editing();
    if (!e) return '';
    return this.sanitizer.bypassSecurityTrustHtml(`<!doctype html><html><body style="margin:0;padding:16px;background:#f5f7fb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#344054"><div style="max-width:600px;margin:0 auto;padding:28px;background:#fff;border-radius:14px">${e.body}<hr style="border:0;border-top:1px solid #e4e7ec;margin:28px 0 14px"><p style="margin:0;color:#667085;font-size:12px">You're receiving this because you subscribed to the MNI Assist newsletter at mniassist.com. <a href="#" style="color:#667085">Unsubscribe</a> at any time.</p></div></body></html>`);
  });

  protected async save(): Promise<NewsletterIssueDto | null> {
    const e = this.editing();
    if (!e || e.readOnly) return null;
    if (!e.subject.trim()) {
      this.editError.set('Give it a subject line.');
      return null;
    }
    if (!e.body.trim()) {
      this.editError.set('Write the newsletter first.');
      return null;
    }

    this.busy.set(true);
    this.editError.set(null);
    try {
      const input = { subject: e.subject.trim(), bodyHtml: e.body };
      const saved = await firstValueFrom(
        e.id ? this.api.updateIssue(e.id, input, { skipHandleError: true }) : this.api.createIssue(input, { skipHandleError: true }),
      );
      this.editing.set({ ...e, id: saved.id });
      await this.loadIssues();
      this.toasts.success('Draft saved.', 'Newsletter');
      return saved;
    } catch (err: unknown) {
      this.editError.set(readApiError(err, 'The draft could not be saved.'));
      return null;
    } finally {
      this.busy.set(false);
    }
  }

  protected async sendTest(): Promise<void> {
    const e = this.editing();
    if (!e) return;
    const saved = e.readOnly ? { id: e.id! } : await this.save();
    if (!saved) return;

    const v = await this.dialogs.prompt({
      title: 'Send a test',
      message: 'The newsletter goes to this one address only, with “[Test]” in the subject. Nobody on the list gets it.',
      fields: [{ key: 'email', label: 'Send to', value: this.me.user().email, required: true, placeholder: 'you@company.com' }],
      confirmText: 'Send test',
    });
    if (!v?.['email']) return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.sendTest(saved.id, v['email'].trim(), { skipHandleError: true }));
      this.toasts.success(`Test sent to ${v['email'].trim()}.`, 'Newsletter');
    } catch (err: unknown) {
      this.toasts.error(readApiError(err, 'The test could not be sent.'), 'Newsletter');
    } finally {
      this.busy.set(false);
    }
  }

  protected async send(target?: NewsletterIssueDto): Promise<void> {
    const e = this.editing();
    const saved = target ?? (e && !e.readOnly ? await this.save() : null);
    if (!saved) return;

    const confirmed = this.counts().confirmed;
    const ok = await this.dialogs.confirm({
      title: `Send “${saved.subject}”?`,
      message: `It goes to ${confirmed} confirmed subscriber${confirmed === 1 ? '' : 's'} now. Once sending starts it can't be changed or stopped.`,
      details: ['Send yourself a test first if you haven’t.', 'Each email carries its own unsubscribe link.'],
      confirmText: `Send to ${confirmed}`,
      tone: 'primary',
    });
    if (!ok) return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.send(saved.id, { skipHandleError: true }));
      this.editing.set(null);
      this.toasts.success('Sending has started. Progress shows on the list.', 'Newsletter');
      await this.loadIssues();
    } catch (err: unknown) {
      this.toasts.error(readApiError(err, 'It could not be sent.'), 'Newsletter');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(i: NewsletterIssueDto): Promise<void> {
    if (!(await this.dialogs.delete('this draft', i.subject))) return;
    try {
      await firstValueFrom(this.api.deleteIssue(i.id, { skipHandleError: true }));
      await this.loadIssues();
    } catch (err: unknown) {
      this.toasts.error(readApiError(err, 'The draft could not be deleted.'), 'Newsletter');
    }
  }

  // ---- Subscriber actions ----------------------------------------------------------------------------------
  protected async exportCsv(): Promise<void> {
    this.busy.set(true);
    try {
      const r = await firstValueFrom(this.api.getSubscriberExport({ skipHandleError: true }));
      downloadCsv(r.fileName, r.csv);
    } catch (err: unknown) {
      this.toasts.error(readApiError(err, 'The list could not be exported.'), 'Newsletter');
    } finally {
      this.busy.set(false);
    }
  }

  protected async erase(s: NewsletterSubscriberDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Erase ${s.email}?`,
      message:
        'The address and its consent record are deleted for good, as for a data-erasure request. To stop sending to someone who just wants no more emails, they use the unsubscribe link instead, so their opt-out is remembered.',
      confirmText: 'Erase',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.deleteSubscriber(s.id, { skipHandleError: true }));
      this.subscribers.update((list) => list.filter((x) => x.id !== s.id));
      this.total.update((t) => Math.max(0, t - 1));
      void this.loadCounts();
    } catch (err: unknown) {
      this.toasts.error(readApiError(err, 'The subscriber could not be erased.'), 'Newsletter');
    }
  }
}
