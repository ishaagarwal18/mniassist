import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import type { SupportImpersonationGrantDto, SupportSessionDto } from '../../proxy/platform/models';
import { SupportImpersonationService } from '../../proxy/platform/support-impersonation.service';
import { ArButton, ArChip } from '../../ui';

/**
 * Platform staff: the access customers have granted to support, starting and ending a support session in a
 * customer's workspace, and that workspace's session history. Starting a session notifies the customer.
 */
@Component({
  selector: 'ar-support-sign-in',
  imports: [ArTopbar, ArButton, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  template: `
    <ar-topbar
      title="Support sign-in"
      subtitle="Customer-granted access for support"
      help="A customer grants support access from their Settings. Starting a session here is recorded and the customer is told straight away."
    />
    <div class="wp">
      @if (open(); as s) {
        <section class="wp__card" role="status">
          <div class="wp__row">
            <span class="wp__grow">
              <span class="wp__name"
                >You are in a support session with
                <span translate="no">{{ s.tenantName ?? s.tenantId }}</span></span
              >
              <span class="wp__sub">
                Started {{ s.startedAtUtc | date: 'd MMM y, HH:mm' }} ·
                {{ s.writeEnabled ? 'can make changes' : 'read only' }} ·
                {{ s.actionCount ?? 0 }} actions
              </span>
            </span>
            <button
              ar-button
              type="button"
              variant="danger"
              [disabled]="busy() !== null"
              (click)="end(s)"
            >
              {{ busy() === 'end' ? 'Ending…' : 'End session' }}
            </button>
          </div>
        </section>
      }

      <section class="wp__card">
        <h2 class="wp__title">Access granted by customers</h2>
        <ul class="wp__list">
          @for (g of grants(); track g.id) {
            <li class="wp__item">
              <span class="wp__grow">
                <span class="wp__name" translate="no">{{ g.tenantName ?? g.tenantId }}</span>
                <span class="wp__sub">
                  Granted by
                  <span translate="no">{{ g.grantedByName ?? 'a workspace admin' }}</span>
                  {{ g.grantedToName ? 'to ' + g.grantedToName : 'to any support engineer' }} ·
                  until {{ g.expiresAtUtc | date: 'd MMM y, HH:mm' }}
                </span>
                <span class="wp__sub" translate="no">
                  {{ g.reason }}{{ g.ticketRef ? ' · ticket ' + g.ticketRef : '' }}
                </span>
              </span>
              <ar-chip [tone]="g.allowsWrite ? 'warn' : 'neutral'">{{
                g.allowsWrite ? 'Read & write' : 'Read only'
              }}</ar-chip>
              <button ar-button type="button" variant="ghost" (click)="showSessions(g)">
                Sessions
              </button>
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy() !== null || open() !== null"
                (click)="start(g, false)"
              >
                Start (read only)
              </button>
              @if (g.allowsWrite) {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy() !== null || open() !== null"
                  (click)="start(g, true)"
                >
                  Start with changes
                </button>
              }
            </li>
          } @empty {
            <li class="wp__empty">No customer has granted support access right now.</li>
          }
        </ul>
      </section>

      @if (history(); as h) {
        <section class="wp__card">
          <div class="wp__row">
            <h2 class="wp__title wp__grow">
              Sessions · <span translate="no">{{ h.name }}</span>
            </h2>
            <button ar-button type="button" variant="ghost" (click)="history.set(null)">
              Close
            </button>
          </div>
          <table class="wp__table">
            <thead>
              <tr>
                <th>Engineer</th>
                <th>Started</th>
                <th>Ended</th>
                <th>Mode</th>
                <th>Actions</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              @for (s of h.sessions; track s.id) {
                <tr>
                  <td translate="no">{{ s.supportUserName }}</td>
                  <td>{{ s.startedAtUtc | date: 'd MMM y, HH:mm' }}</td>
                  <td>{{ s.endedAtUtc ? (s.endedAtUtc | date: 'd MMM y, HH:mm') : 'Open' }}</td>
                  <td>{{ s.writeEnabled ? 'Read & write' : 'Read only' }}</td>
                  <td>{{ s.actionCount ?? 0 }}</td>
                  <td>{{ s.writeCount ?? 0 }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="wp__empty">No sessions yet.</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
})
export class ArSupportSignIn implements OnInit {
  private readonly api = inject(SupportImpersonationService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly grants = signal<SupportImpersonationGrantDto[]>([]);
  protected readonly open = signal<SupportSessionDto | null>(null);
  protected readonly history = signal<{ name: string; sessions: SupportSessionDto[] } | null>(null);
  protected readonly busy = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    const [g, s] = await Promise.allSettled([
      firstValueFrom(this.api.getActiveGrants()),
      firstValueFrom(this.api.getMyOpenSession({ skipHandleError: true })),
    ]);
    if (g.status === 'fulfilled') this.grants.set(g.value.items ?? []);
    this.open.set(s.status === 'fulfilled' ? (s.value ?? null) : null);
  }

  protected async start(g: SupportImpersonationGrantDto, needsWrite: boolean): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Start a support session with ${g.tenantName ?? 'this workspace'}?`,
      message:
        'The customer is notified now, and everything you do is recorded against this session.',
      details: [
        needsWrite ? 'You will be able to make changes.' : 'Read only: you cannot change anything.',
      ],
      confirmText: 'Start session',
      tone: needsWrite ? 'danger' : 'primary',
    });
    if (!ok) return;
    await this.run('start', async () => {
      this.open.set(
        await firstValueFrom(
          this.api.startSession({ tenantId: g.tenantId, needsWrite }, { skipHandleError: true }),
        ),
      );
      this.toasts.success('Support session started.', 'Support');
    });
  }

  protected async end(s: SupportSessionDto): Promise<void> {
    await this.run('end', async () => {
      await firstValueFrom(this.api.endSession(s.id!, { skipHandleError: true }));
      this.open.set(null);
      this.toasts.success('Support session ended.', 'Support');
    });
  }

  protected async showSessions(g: SupportImpersonationGrantDto): Promise<void> {
    if (!g.tenantId) return;
    try {
      const page = await firstValueFrom(
        this.api.getSessions(
          g.tenantId,
          { skipCount: 0, maxResultCount: 50 },
          { skipHandleError: true },
        ),
      );
      this.history.set({ name: g.tenantName ?? g.tenantId, sessions: page.items ?? [] });
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The sessions could not be loaded.'), 'Support');
    }
  }

  private async run(key: string, work: () => Promise<void>): Promise<void> {
    this.busy.set(key);
    try {
      await work();
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'That did not work. Try again.'), 'Support');
    } finally {
      this.busy.set(null);
    }
  }
}
