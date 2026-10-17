import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map, of, switchMap } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { environment } from '../../../environments/environment';
import { ChannelService as ChannelApi } from '../../proxy/channels';
import { DisplayNameStatus } from '../../proxy/channels/display-name-status.enum';
import { MessagingTier } from '../../proxy/channels/messaging-tier.enum';
import { QualityRating } from '../../proxy/channels/quality-rating.enum';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { errorMessage } from '../activities/activity-logic';
import { ArConnectNumberDialog } from './connect-number-dialog';
import { ToastService } from '../../core/ui/toast.service';

type Quality = 'green' | 'yellow' | 'red' | 'unknown';
type NameReviewState = 'pending' | 'approved' | 'rejected';

interface ManagedNumber {
  readonly channelId: string;
  readonly displayPhoneNumber: string;
  readonly verifiedName: string;
  readonly nameReviewState: NameReviewState;
  readonly requestedName?: string;
  readonly nameRequestedAt?: string;
  readonly nameRejectionReason?: string;
  readonly hasTwoStepPin: boolean;
  readonly pinUpdatedAt?: string;
  readonly isRegistered: boolean;
  readonly quality: Quality;
  readonly tier: string;
}

const QUALITY: Record<QualityRating, Quality> = {
  [QualityRating.Unknown]: 'unknown',
  [QualityRating.Green]: 'green',
  [QualityRating.Yellow]: 'yellow',
  [QualityRating.Red]: 'red',
};

const TIER: Record<MessagingTier, string> = {
  [MessagingTier.Starting]: '250 / 24h',
  [MessagingTier.Tier1]: '1K / 24h',
  [MessagingTier.Tier2]: '10K / 24h',
  [MessagingTier.Tier3]: '100K / 24h',
  [MessagingTier.Tier4]: 'Unlimited',
};

const REVIEW: Record<DisplayNameStatus, NameReviewState> = {
  [DisplayNameStatus.Pending]: 'pending',
  [DisplayNameStatus.Approved]: 'approved',
  [DisplayNameStatus.Rejected]: 'rejected',
};

const SEED: readonly ManagedNumber[] = [
  {
    channelId: 'ch-1',
    displayPhoneNumber: '+91 90210 44872',
    verifiedName: 'Meridian Automation',
    nameReviewState: 'approved',
    hasTwoStepPin: true,
    pinUpdatedAt: new Date(Date.now() - 112 * 86_400_000).toISOString(),
    isRegistered: true,
    quality: 'green',
    tier: '10K / 24h',
  },
  {
    channelId: 'ch-2',
    displayPhoneNumber: '+91 90210 44873',
    verifiedName: 'Meridian Automation Service',
    nameReviewState: 'pending',
    requestedName: 'Meridian Service & Support',
    nameRequestedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    hasTwoStepPin: true,
    pinUpdatedAt: new Date(Date.now() - 9 * 86_400_000).toISOString(),
    isRegistered: true,
    quality: 'yellow',
    tier: '1K / 24h',
  },
  {
    channelId: 'ch-3',
    displayPhoneNumber: '+91 90210 44874',
    verifiedName: 'Meridian Spares',
    nameReviewState: 'rejected',
    nameRejectionReason:
      'The requested name did not match the business name on the verified Meta Business Portfolio.',
    hasTwoStepPin: false,
    isRegistered: false,
    quality: 'unknown',
    tier: '250 / 24h',
  },
];

/**
 * Number registration, two-step PIN and display name.
 *
 * Everything on this screen is owned by Meta, not by us, and the design says so
 * rather than pretending otherwise. A display name change is a request under review,
 * so the live name and the pending one are shown side by side until Meta decides. A
 * PIN is set here and never shown again — there is no screen that needs to read it
 * back, and every log that might capture it is a liability.
 */
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ar-numbers',
  imports: [RouterLink, ArTopbar, ArBanner, ArButton, ArChip, ArConnectNumberDialog, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './numbers.html',
  styleUrl: './numbers.scss',
})
export class ArNumbers {
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly api = inject(ChannelApi);

  protected readonly canOnboard = grantedPolicy('AutoReach.Channels.Onboard', this.permissions);
  protected readonly canManage = grantedPolicy('AutoReach.Channels.Manage', this.permissions);

  protected readonly connectOpen = signal(false);

  private readonly reloadTick = signal(0);

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () =>
      this.api.getList({ skipCount: 0, maxResultCount: 50 }).pipe(
        switchMap((page) => {
          const channels = page.items ?? [];
          if (channels.length === 0) {
            return of([] as ManagedNumber[]);
          }
          return forkJoin(
            channels.map((c) =>
              this.api.getNumberManagement(c.id!).pipe(
                map((nm): ManagedNumber => ({
                  channelId: c.id!,
                  displayPhoneNumber:
                    nm.displayPhoneNumber ?? c.displayPhoneNumber ?? '(unknown number)',
                  verifiedName: nm.verifiedName ?? c.verifiedName ?? '',
                  nameReviewState:
                    nm.nameReviewState != null ? REVIEW[nm.nameReviewState] : 'approved',
                  requestedName: nm.requestedName ?? undefined,
                  nameRequestedAt: nm.nameRequestedAtUtc ?? undefined,
                  nameRejectionReason: nm.nameRejectionReason ?? undefined,
                  hasTwoStepPin: nm.hasTwoStepPin ?? false,
                  pinUpdatedAt: nm.pinUpdatedAtUtc ?? undefined,
                  isRegistered: nm.isRegistered ?? false,
                  quality: c.quality != null ? QUALITY[c.quality] : 'unknown',
                  tier: c.tier != null ? TIER[c.tier] : '—',
                })),
              ),
            ),
          );
        }),
      ),
    defaultValue: [] as ManagedNumber[],
  });

  protected readonly numbers = computed<readonly ManagedNumber[]>(() =>
    environment.useMockData ? SEED : this.resource.value(),
  );

  /** Which card has its name editor open. One at a time — this is not a bulk edit. */
  protected readonly editingName = signal<string | null>(null);
  protected readonly editingPin = signal<string | null>(null);
  protected readonly draftName = signal('');
  protected readonly draftPin = signal('');
  protected readonly draftCurrentPin = signal('');
  protected readonly busy = signal(false);

  protected readonly subtitle = computed(() => {
    const list = this.numbers();
    const unregistered = list.filter((n) => !n.isRegistered).length;
    if (unregistered > 0) {
      return `${unregistered} number${unregistered === 1 ? '' : 's'} not yet registered`;
    }
    return `${list.length} number${list.length === 1 ? '' : 's'} connected`;
  });

  protected startNameEdit(n: ManagedNumber): void {
    this.draftName.set(n.requestedName ?? n.verifiedName);
    this.editingName.set(n.channelId);
  }

  protected async submitName(channelId: string): Promise<void> {
    const name = this.draftName().trim();
    if (name.length < 2) return;
    this.busy.set(true);
    try {
      if (!environment.useMockData) {
        await firstValueFrom(this.api.requestDisplayName(channelId, { displayName: name }));
      }
      this.reloadTick.update((n) => n + 1);
    } finally {
      this.busy.set(false);
      this.editingName.set(null);
    }
  }

  protected async setPin(channelId: string): Promise<void> {
    const pin = this.draftPin().trim();
    if (!/^\d{6}$/.test(pin)) {
      this.toasts.warning('The PIN must be exactly six digits.', 'Two-step PIN');
      return;
    }
    this.busy.set(true);
    try {
      if (!environment.useMockData) {
        await firstValueFrom(
          this.api.setTwoStepPin(channelId, {
            pin,
            currentPin: this.draftCurrentPin().trim() || undefined,
          }),
        );
      }
      this.reloadTick.update((n) => n + 1);
    } finally {
      this.busy.set(false);
      this.editingPin.set(null);
      this.draftPin.set('');
      this.draftCurrentPin.set('');
    }
  }

  // ---- Release a number ------------------------------------------------------------
  protected readonly releasing = signal<ManagedNumber | null>(null);
  protected readonly releaseConfirm = signal('');
  protected readonly releaseDeregister = signal(false);
  protected readonly releaseError = signal<string | null>(null);

  /** The typed number matches the card's, digits only, so spaces and "+" don't matter. */
  protected readonly releaseMatches = computed(() => {
    const n = this.releasing();
    const digits = (s: string) => s.replace(/\D/g, '');
    return (
      !!n &&
      digits(this.releaseConfirm()).length > 0 &&
      digits(this.releaseConfirm()) === digits(n.displayPhoneNumber)
    );
  });

  protected openRelease(n: ManagedNumber): void {
    this.releaseConfirm.set('');
    this.releaseDeregister.set(false);
    this.releaseError.set(null);
    this.releasing.set(n);
  }

  protected async release(): Promise<void> {
    const n = this.releasing();
    if (!n || !this.releaseMatches()) return;
    this.busy.set(true);
    this.releaseError.set(null);
    try {
      if (!environment.useMockData) {
        await firstValueFrom(
          this.api.release(n.channelId, {
            confirmPhoneNumber: this.releaseConfirm().trim(),
            deregisterAtMeta: this.releaseDeregister(),
          }),
        );
      }
      this.releasing.set(null);
      this.toasts.success(
        this.releaseDeregister()
          ? `${n.displayPhoneNumber} was released and deregistered at Meta.`
          : `${n.displayPhoneNumber} was released from this workspace.`,
        'Number released',
      );
      this.reloadTick.update((t) => t + 1);
    } catch (e: unknown) {
      this.releaseError.set(errorMessage(e, 'The number could not be released.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async refresh(): Promise<void> {
    this.reloadTick.update((n) => n + 1);
  }

  protected qualityTone(q: Quality): 'good' | 'warn' | 'bad' | 'neutral' {
    return q === 'green' ? 'good' : q === 'yellow' ? 'warn' : q === 'red' ? 'bad' : 'neutral';
  }

  protected reviewTone(state: NameReviewState): 'good' | 'amber' | 'bad' {
    return state === 'approved' ? 'good' : state === 'pending' ? 'amber' : 'bad';
  }

  protected when(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected age(iso?: string): string {
    if (!iso) return 'never set';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days === 0) return 'set today';
    if (days < 30) return `set ${days} day${days === 1 ? '' : 's'} ago`;
    return `set ${Math.round(days / 30)} month${Math.round(days / 30) === 1 ? '' : 's'} ago`;
  }
}
