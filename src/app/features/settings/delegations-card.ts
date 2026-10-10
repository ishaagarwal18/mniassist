import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountSwitcher } from '../../core/auth/account-switch';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { settled } from '../../core/util/resource';
import { DelegationService } from '../../proxy/identity/delegation.service';
import type { DelegationDto } from '../../proxy/identity/models';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { MAX_DELEGATION_DAYS, delegationPeriod, indianToday } from './delegation.logic';

/**
 * Letting a colleague act for you for a set period — leave, travel — without sharing a
 * password, and acting for those who have done the same for you. Everything a delegate
 * does is recorded as theirs, acting for you.
 */
@Component({
  selector: 'ar-delegations-card',
  imports: [ArCard, ArButton, ArBanner, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-card heading="Delegated access">
      <p class="dg__muted">
        Let a colleague act for you while you are away, for up to {{ maxDays }} days, without
        sharing your password. They see what you see; everything they do is recorded as theirs.
      </p>
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }

      <h3 class="dg__h">People who can act for you</h3>
      <ul class="dg">
        @for (d of given(); track d.id) {
          <li class="dg__row">
            <span class="dg__who">
              <strong>{{ d.name || d.userName }}</strong>
              <span class="dg__muted">
                {{ d.startTime | date: 'dd MMM yyyy, HH:mm' }} –
                {{ d.endTime | date: 'dd MMM yyyy, HH:mm' }}
              </span>
            </span>
            <span class="dg__act">
              <ar-chip [tone]="d.isActive ? 'good' : 'neutral'">{{
                d.isActive ? 'Active' : 'Starts later'
              }}</ar-chip>
              <button type="button" class="link link--danger" (click)="remove(d)">Remove</button>
            </span>
          </li>
        } @empty {
          <li class="dg__muted">Nobody.</li>
        }
      </ul>
      <button
        ar-button
        type="button"
        variant="ghost"
        icon="plus"
        [disabled]="!!switcher.actingAs()"
        (click)="delegate()"
      >
        Delegate access
      </button>

      <h3 class="dg__h">You can act for</h3>
      <ul class="dg">
        @for (d of received(); track d.id) {
          <li class="dg__row">
            <span class="dg__who">
              <strong>{{ d.name || d.userName }}</strong>
              <span class="dg__muted">until {{ d.endTime | date: 'dd MMM yyyy, HH:mm' }}</span>
            </span>
            <span class="dg__act">
              @if (d.isActive) {
                <button
                  type="button"
                  class="link"
                  [disabled]="busy() || !!switcher.actingAs()"
                  (click)="actFor(d)"
                >
                  Act for them
                </button>
              } @else {
                <ar-chip tone="neutral">From {{ d.startTime | date: 'dd MMM' }}</ar-chip>
              }
            </span>
          </li>
        } @empty {
          <li class="dg__muted">Nobody has delegated to you.</li>
        }
      </ul>
    </ar-card>
  `,
  styles: `
    .dg {
      margin: 0 0 10px;
      padding: 0;
      list-style: none;
    }
    .dg__h {
      margin: 14px 0 6px;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .dg__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 0;
      border-top: 1px solid var(--ar-ink-100);
    }
    .dg__row:first-child {
      border-top: 0;
    }
    .dg__who {
      display: flex;
      flex-direction: column;
      min-width: 0;
      font: 400 13px var(--ar-font-sans);
    }
    .dg__muted {
      margin: 0 0 10px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .dg__who .dg__muted {
      margin: 0;
    }
    .dg__act {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .link {
      border: 0;
      background: none;
      cursor: pointer;
      padding: 0;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .link:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .link--danger {
      color: var(--ar-red-600);
    }
  `,
})
export class ArDelegationsCard {
  private readonly api = inject(DelegationService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  protected readonly switcher = inject(AccountSwitcher);
  private readonly mock = environment.useMockData;
  protected readonly maxDays = MAX_DELEGATION_DAYS;

  private readonly tick = signal(0);
  private readonly givenResource = rxResource({
    params: () => (this.mock ? undefined : { t: this.tick() }),
    stream: () => this.api.getMyDelegations(),
    defaultValue: { items: [] as DelegationDto[] },
  });
  private readonly receivedResource = rxResource({
    params: () => (this.mock ? undefined : { t: this.tick() }),
    stream: () => this.api.getDelegatedToMe(),
    defaultValue: { items: [] as DelegationDto[] },
  });

  protected readonly given = computed(() => settled(this.givenResource, { items: [] }).items ?? []);
  protected readonly received = computed(
    () => settled(this.receivedResource, { items: [] }).items ?? [],
  );

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async delegate(): Promise<void> {
    this.error.set(null);
    if (this.mock) {
      this.toasts.info('Delegation needs the API — it is not available in the standalone build.');
      return;
    }
    let candidates;
    try {
      candidates = (await firstValueFrom(this.api.getCandidates())).items ?? [];
    } catch (e) {
      this.error.set(readApiError(e));
      return;
    }
    if (!candidates.length) {
      this.error.set('There is nobody else in this workspace to delegate to.');
      return;
    }
    const today = indianToday();
    const answer = await this.dialogs.prompt({
      title: 'Delegate access',
      message: `They can act for you from the first day to the end of the last, ${MAX_DELEGATION_DAYS} days at most. You can remove it at any time.`,
      confirmText: 'Delegate',
      fields: [
        {
          key: 'user',
          label: 'Colleague',
          required: true,
          options: candidates.map((c) => ({ value: c.userId, label: c.name || c.userName })),
        },
        { key: 'start', label: 'First day', type: 'date', required: true, value: today },
        { key: 'end', label: 'Last day', type: 'date', required: true },
      ],
    });
    if (!answer) return;
    const period = delegationPeriod(answer['start'], answer['end']);
    if (typeof period === 'string') {
      this.error.set(period);
      return;
    }
    try {
      await firstValueFrom(this.api.create({ targetUserId: answer['user'], ...period }));
      const who = candidates.find((c) => c.userId === answer['user']);
      this.toasts.success(`${who?.name || who?.userName || 'They'} can act for you.`);
      this.tick.update((n) => n + 1);
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  protected async remove(d: DelegationDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Stop ${d.name || d.userName} acting for you?`,
        message:
          'They cannot start acting for you again. If they are acting for you right now, ask them to return to their own account.',
        confirmText: 'Remove',
        tone: 'danger',
      }))
    )
      return;
    try {
      await firstValueFrom(this.api.delete(d.id));
      this.tick.update((n) => n + 1);
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  protected async actFor(d: DelegationDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Act for ${d.name || d.userName}?`,
        message: `You see and do what they can until you return. Everything is recorded as yours, acting for them.`,
        confirmText: 'Act for them',
      }))
    )
      return;
    this.busy.set(true);
    try {
      await this.switcher.switchTo({ kind: 'Delegation', delegationId: d.id });
    } catch (e) {
      this.busy.set(false);
      this.error.set(readApiError(e));
    }
  }
}
