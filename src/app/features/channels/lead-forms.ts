import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  LeadAdImportStatus,
  LeadAdsService,
  type LeadAdsLeadDto,
  type LeadAdsPageChoiceDto,
  type LeadAdsPageDto,
} from '../../proxy/lead-ads/lead-ads.service';
import { ArBanner, ArButton, ArCard, ArChip, ArDialog } from '../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';
import {
  platformLabel,
  readCallback,
  rememberState,
  statusLabel,
  statusTone,
  takeState,
} from './lead-forms.logic';

function when(utc: string | null | undefined): string {
  return utc
    ? new Date(utc).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
}

/**
 * Facebook and Instagram lead forms (Lead Ads). Connect the workspace's Facebook Pages and
 * every lead-form submission arrives as a contact and, if the Page is set to, an enquiry
 * shared out by lead rotation. Facebook sends the person back to /channels/lead-forms/callback,
 * which is this same screen finishing the sign-in.
 */
@Component({
  selector: 'ar-lead-forms',
  imports: [ArTopbar, ArButton, ArCard, ArChip, ArBanner, ArDialog, RouterLink, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Lead forms"
      subtitle="Facebook and Instagram lead ads, straight into enquiries"
      help="Connect the Facebook Page your lead ads run on. Every form submission becomes a contact and an enquiry."
    >
      <button ar-button variant="primary" icon="plus" [disabled]="busy()" (click)="connect()">
        Connect a Facebook Page
      </button>
    </ar-topbar>

    <div class="lf ar-scroll">
      @if (notice(); as n) {
        <ar-banner [tone]="n.tone">{{ n.text }}</ar-banner>
      }

      <ar-card heading="Connected Pages">
        @for (p of pages(); track p.id) {
          <div class="lf__page">
            <div class="lf__who">
              <strong>{{ p.pageName }}</strong>
              <span class="lf__muted">
                {{ p.leadsLast30Days }} leads in 30 days · last checked
                {{ when(p.syncedThroughUtc) }}
              </span>
              @if (p.lastError) {
                <span class="lf__error">{{ p.lastError }}</span>
              }
            </div>
            <label class="lf__toggle">
              <input
                type="checkbox"
                [checked]="p.createEnquiries"
                (change)="setEnquiries(p, $any($event.target).checked)"
              />
              Open an enquiry for each lead
            </label>
            <div class="lf__act">
              <button ar-button variant="ghost" [disabled]="busy()" (click)="sync(p)">
                Fetch leads now
              </button>
              <button ar-button variant="ghost" [disabled]="busy()" (click)="disconnect(p)">
                Disconnect
              </button>
            </div>
          </div>
        } @empty {
          <p class="lf__muted">
            No Page connected. Connect the Facebook Page your lead ads run on; Instagram lead ads
            use the Facebook Page linked to the Instagram account.
          </p>
        }
      </ar-card>

      <ar-card heading="Recent leads">
        <ejs-grid arGrid="lead-forms-leads" [dataSource]="leads()" aria-label="Recent leads">
          <e-columns>
            <e-column headerText="Received" width="140">
              <ng-template #template let-l>
                {{ when(l.submittedAtUtc ?? l.creationTime) }}
              </ng-template>
            </e-column>
            <e-column headerText="Person" width="160">
              <ng-template #template let-l>
                @if (l.contactId) {
                  <a [routerLink]="['/contacts', l.contactId]">{{ l.contactName || 'Contact' }}</a>
                } @else {
                  —
                }
              </ng-template>
            </e-column>
            <e-column headerText="Form and ad" width="200">
              <ng-template #template let-l>
                <div>
                  {{ l.formName || '—' }}
                  @if (l.adName) {
                    <span class="lf__muted block text-xs"> · {{ l.adName }}</span>
                  }
                </div>
              </ng-template>
            </e-column>
            <e-column headerText="From" width="130">
              <ng-template #template let-l>
                {{ platform(l.platform) }}
              </ng-template>
            </e-column>
            <e-column headerText="Status" width="180">
              <ng-template #template let-l>
                <div>
                  <ar-chip [tone]="tone(l.status)">{{ label(l.status) }}</ar-chip>
                  @if (l.enquiryId) {
                    <a class="lf__ref ml-1" [routerLink]="['/enquiries', l.enquiryId]">{{
                      l.enquiryReference
                    }}</a>
                  }
                  @if (l.error) {
                    <div class="lf__error text-xs">{{ l.error }}</div>
                  }
                </div>
              </ng-template>
            </e-column>
            <e-column headerText="Action" width="110">
              <ng-template #template let-l>
                @if (l.status === failed) {
                  <button ar-button variant="ghost" [disabled]="busy()" (click)="retry(l)">
                    Try again
                  </button>
                }
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
      </ar-card>
    </div>

    @if (choice(); as c) {
      <ar-dialog
        title="Choose the Pages to connect"
        width="min(520px, calc(100vw - 32px))"
        (dismiss)="choice.set(null)"
      >
        @if (c.pages.length === 0) {
          <p class="lf__muted">
            Facebook returned no Pages. Sign in with someone who is an admin of the Page, and allow
            every permission Facebook asks for.
          </p>
        }
        <div class="lf__choices">
          @for (p of c.pages; track p.pageId) {
            <label class="lf__choice">
              <input
                type="checkbox"
                [checked]="picked().has(p.pageId)"
                (change)="toggle(p.pageId)"
              />
              <span>
                <strong>{{ p.pageName }}</strong>
                <span class="lf__muted">
                  {{ p.category || 'Page'
                  }}{{ p.alreadyConnected ? ' · already connected (refreshes it)' : '' }}
                </span>
              </span>
            </label>
          }
        </div>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="choice.set(null)">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || picked().size === 0"
            (click)="connectPicked()"
          >
            Connect {{ picked().size || '' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    .lf {
      display: grid;
      gap: 14px;
      padding: 16px 24px 32px;
      align-content: start;
    }
    .lf__page {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 8px 16px;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid var(--ar-line-200);
    }
    .lf__page:first-child {
      border-top: 0;
    }
    .lf__who {
      display: grid;
      gap: 2px;
      min-width: 0;
      font: 400 13px var(--ar-font-sans);
    }
    .lf__muted {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .lf__error {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-red-600);
    }
    .lf__toggle {
      display: flex;
      gap: 6px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
    }
    .lf__act {
      display: flex;
      gap: 6px;
    }
    .lf__table {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    th,
    td {
      text-align: left;
      vertical-align: top;
      padding: 8px 10px;
      border-bottom: 1px solid var(--ar-line-200);
    }
    th {
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .lf__ref {
      margin-left: 6px;
      font: 500 12px var(--ar-font-mono);
    }
    .lf__choices {
      display: grid;
      gap: 10px;
    }
    .lf__choice {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      font: 400 13px var(--ar-font-sans);
    }
    .lf__choice span {
      display: grid;
    }
    @media (max-width: 760px) {
      .lf__page {
        grid-template-columns: minmax(0, 1fr);
      }
      .lf {
        padding: 12px 16px 24px;
      }
    }
  `,
})
export class ArLeadForms {
  private readonly api = inject(LeadAdsService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly pages = signal<LeadAdsPageDto[]>([]);
  protected readonly leads = signal<LeadAdsLeadDto[]>([]);
  protected readonly choice = signal<LeadAdsPageChoiceDto | null>(null);
  protected readonly picked = signal<Set<string>>(new Set());
  protected readonly busy = signal(false);
  protected readonly notice = signal<{ tone: 'good' | 'bad' | 'warn'; text: string } | null>(null);

  protected readonly failed = LeadAdImportStatus.Failed;
  protected readonly when = when;
  protected readonly label = statusLabel;
  protected readonly tone = statusTone;
  protected readonly platform = platformLabel;

  constructor() {
    void this.reload();
    if (this.route.snapshot.url.some((s) => s.path === 'callback')) void this.finishSignIn();
  }

  private async reload(): Promise<void> {
    try {
      const [pages, leads] = await Promise.all([
        firstValueFrom(this.api.getPages()),
        firstValueFrom(this.api.getLeads({ skipCount: 0, maxResultCount: 50 })),
      ]);
      this.pages.set(pages.items ?? []);
      this.leads.set(leads.items ?? []);
    } catch {
      /* the interceptor has shown the error */
    }
  }

  protected async connect(): Promise<void> {
    this.busy.set(true);
    try {
      const start = await firstValueFrom(this.api.getLoginStart());
      rememberState(start.state);
      window.location.assign(start.authorizeUrl);
    } catch (e) {
      this.busy.set(false);
      this.notice.set({ tone: 'bad', text: readApiError(e, 'Could not start Facebook sign-in.') });
    }
  }

  private async finishSignIn(): Promise<void> {
    const result = readCallback(this.route.snapshot.queryParams, takeState());
    // Drop the code from the address bar, whatever happens next.
    void this.router.navigate(['/channels/lead-forms'], { replaceUrl: true });
    if (!result.ok) {
      this.notice.set({ tone: 'warn', text: result.reason });
      return;
    }
    this.busy.set(true);
    try {
      const choice = await firstValueFrom(this.api.completeLogin(result.code, result.state));
      this.picked.set(
        new Set(choice.pages.filter((p) => !p.alreadyConnected).map((p) => p.pageId)),
      );
      this.choice.set(choice);
    } catch (e) {
      this.notice.set({ tone: 'bad', text: readApiError(e, 'Facebook sign-in did not complete.') });
    } finally {
      this.busy.set(false);
    }
  }

  protected toggle(pageId: string): void {
    const next = new Set(this.picked());
    if (next.has(pageId)) next.delete(pageId);
    else next.add(pageId);
    this.picked.set(next);
  }

  protected async connectPicked(): Promise<void> {
    const c = this.choice();
    if (!c) return;
    this.busy.set(true);
    try {
      const connected = await firstValueFrom(
        this.api.connectPages(c.selectionId, [...this.picked()]),
      );
      this.choice.set(null);
      this.toasts.success(
        `${connected.items?.length ?? 0} Page${(connected.items?.length ?? 0) === 1 ? '' : 's'} connected. New leads will arrive here.`,
      );
      this.notice.set(null);
      await this.reload();
    } catch (e) {
      this.notice.set({ tone: 'bad', text: readApiError(e, 'Could not connect the Pages.') });
      this.choice.set(null);
    } finally {
      this.busy.set(false);
    }
  }

  protected async setEnquiries(p: LeadAdsPageDto, value: boolean): Promise<void> {
    await firstValueFrom(this.api.updatePage(p.id, value));
    this.pages.update((list) =>
      list.map((x) => (x.id === p.id ? { ...x, createEnquiries: value } : x)),
    );
  }

  protected async sync(p: LeadAdsPageDto): Promise<void> {
    this.busy.set(true);
    try {
      const r = await firstValueFrom(this.api.syncPage(p.id));
      this.toasts.success(
        r.found === 0
          ? 'No new leads.'
          : `${r.imported} new lead${r.imported === 1 ? '' : 's'} imported${r.failed ? `, ${r.failed} failed` : ''}.`,
      );
      await this.reload();
    } catch (e) {
      this.toasts.error(readApiError(e, 'Could not fetch the leads.'));
      await this.reload();
    } finally {
      this.busy.set(false);
    }
  }

  protected async disconnect(p: LeadAdsPageDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Disconnect ${p.pageName}?`,
        message:
          'New leads from its forms will no longer arrive here. Leads already imported, and their contacts and enquiries, stay.',
        confirmText: 'Disconnect',
        tone: 'danger',
      }))
    )
      return;
    await firstValueFrom(this.api.disconnectPage(p.id));
    await this.reload();
  }

  protected async retry(l: LeadAdsLeadDto): Promise<void> {
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(this.api.retryLead(l.id));
      this.leads.update((list) => list.map((x) => (x.id === l.id ? updated : x)));
      if (updated.status === LeadAdImportStatus.Imported) this.toasts.success('Lead imported.');
      else this.toasts.error(updated.error || 'It failed again.');
    } finally {
      this.busy.set(false);
    }
  }
}
