import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { ChannelService } from '../../proxy/channels/channel.service';
import { MessagingTier } from '../../proxy/channels/messaging-tier.enum';
import type {
  BusinessProfileDto,
  ChannelHealthDto,
  ChannelQualitySnapshotDto,
} from '../../proxy/channels/models';
import { QualityRating } from '../../proxy/channels/quality-rating.enum';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { ArSendingLimitsCard } from './sending-limits-card';

const QUALITY: Record<QualityRating, { tone: ChipTone; label: string }> = {
  [QualityRating.Unknown]: { tone: 'neutral', label: 'Not rated yet' },
  [QualityRating.Green]: { tone: 'good', label: 'High' },
  [QualityRating.Yellow]: { tone: 'warn', label: 'Medium' },
  [QualityRating.Red]: { tone: 'bad', label: 'Low' },
};

const TIER: Record<MessagingTier, string> = {
  [MessagingTier.Starting]: '250 customers a day',
  [MessagingTier.Tier1]: '1,000 customers a day',
  [MessagingTier.Tier2]: '10,000 customers a day',
  [MessagingTier.Tier3]: '100,000 customers a day',
  [MessagingTier.Tier4]: 'Unlimited',
};

/** Meta's business categories (the codes its business-profile API takes). */
export const META_VERTICALS: { value: string; label: string }[] = [
  { value: 'PROF_SERVICES', label: 'Professional services' },
  { value: 'RETAIL', label: 'Shopping and retail' },
  { value: 'AUTO', label: 'Automotive' },
  { value: 'EDU', label: 'Education' },
  { value: 'FINANCE', label: 'Finance and banking' },
  { value: 'HEALTH', label: 'Medical and health' },
  { value: 'TRAVEL', label: 'Travel and transport' },
  { value: 'EVENT_PLAN', label: 'Event planning' },
  { value: 'GOVT', label: 'Public service' },
  { value: 'NONPROFIT', label: 'Non-profit' },
  { value: 'OTHER', label: 'Other' },
];

type ProfileForm = Record<
  'about' | 'description' | 'email' | 'website' | 'address' | 'vertical',
  string
>;

const EMPTY_PROFILE: ProfileForm = {
  about: '',
  description: '',
  email: '',
  website: '',
  address: '',
  vertical: '',
};

/** The fields that differ from what Meta holds now; an emptied field is sent as "" so Meta clears it. */
export function profileChanges(
  form: Record<string, string>,
  original: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(form)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([k, v]) => v !== (original[k] ?? '').trim()),
  );
}

/** Meta's answer → form values ('' for anything it has no value for). */
export function profileForm(dto: BusinessProfileDto | null | undefined): ProfileForm {
  return {
    about: dto?.about ?? '',
    description: dto?.description ?? '',
    email: dto?.email ?? '',
    website: dto?.website ?? '',
    address: dto?.address ?? '',
    vertical: dto?.vertical ?? '',
  };
}

/**
 * One WhatsApp number's health: Meta's quality rating and messaging limit, today's use, the last 30 days of
 * quality changes, and the business profile customers see.
 */
@Component({
  selector: 'ar-number-health',
  imports: [ArTopbar, ArButton, ArChip, DatePipe, DecimalPipe, RouterLink, ArSendingLimitsCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  template: `
    <ar-topbar
      [title]="health()?.displayPhoneNumber ?? 'WhatsApp number'"
      subtitle="Quality, limits and business profile"
      help="Meta rates every number on how customers react to its messages. A low rating lowers the daily limit, so watch the history after big campaigns."
    />
    <div class="wp">
      <p class="wp__muted"><a routerLink="/channels/numbers">← Numbers</a></p>

      @if (health(); as h) {
        <section class="wp__card">
          <h2 class="wp__title">Health now</h2>
          <div class="wp__grid">
            <div>
              <span class="wp__sub">Quality rating</span>
              <ar-chip [tone]="quality(h.quality).tone" [dot]="true">{{
                quality(h.quality).label
              }}</ar-chip>
            </div>
            <div>
              <span class="wp__sub">Messaging limit</span>
              <span class="wp__name">{{ tier(h.tier) }}</span>
            </div>
            <div>
              <span class="wp__sub">Used in the last 24 hours</span>
              <span class="wp__name">
                {{ h.used24h ?? 0 | number
                }}{{ h.dailyLimit ? ' of ' + (h.dailyLimit | number) : '' }}
              </span>
            </div>
            <div>
              <span class="wp__sub">Left for marketing</span>
              <span class="wp__name">{{
                h.marketingAvailable == null ? 'No limit' : (h.marketingAvailable | number)
              }}</span>
            </div>
          </div>
          @if (!h.canSend) {
            <p class="wp__error">
              Sending is stopped: {{ h.blockedReason ?? 'Meta has paused this number.' }}
            </p>
          }
        </section>
        <ar-sending-limits-card [channelId]="id" />
      }

      <section class="wp__card">
        <h2 class="wp__title">Quality over the last 30 days</h2>
        <table class="wp__table">
          <thead>
            <tr>
              <th>When</th>
              <th>Rating</th>
              <th>Limit</th>
              <th>Customers reached (24 h)</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            @for (q of history(); track q.id) {
              <tr>
                <td>{{ q.capturedAtUtc | date: 'd MMM, HH:mm' }}</td>
                <td>
                  <ar-chip [tone]="quality(q.quality).tone" [dot]="true">{{
                    quality(q.quality).label
                  }}</ar-chip>
                </td>
                <td>{{ tier(q.tier) }}</td>
                <td>{{ q.uniqueRecipients24h ?? 0 | number }}</td>
                <td translate="no">{{ q.note ?? '' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="wp__empty">No changes recorded in the last 30 days.</td>
              </tr>
            }
          </tbody>
        </table>
        @if (downgrades() > 0) {
          <p class="wp__error">The rating dropped {{ downgrades() }} time(s) in this period.</p>
        }
      </section>

      <section class="wp__card">
        <h2 class="wp__title">Business profile</h2>
        <p class="wp__muted">
          What customers see when they open your number in WhatsApp, as WhatsApp shows it now. Only
          the fields you change are sent.
        </p>
        <div class="wp__grid">
          <label class="wp__field wp__field--wide">
            <span>About (shown under the name)</span>
            <input
              class="ar-field__input"
              maxlength="139"
              [value]="form().about"
              (input)="set('about', $any($event.target).value)"
            />
          </label>
          <label class="wp__field wp__field--wide">
            <span>Description</span>
            <textarea
              class="ar-field__input"
              rows="3"
              maxlength="512"
              [value]="form().description"
              (input)="set('description', $any($event.target).value)"
            ></textarea>
          </label>
          <label class="wp__field">
            <span>Email</span>
            <input
              class="ar-field__input"
              type="email"
              maxlength="128"
              [value]="form().email"
              (input)="set('email', $any($event.target).value)"
            />
          </label>
          <label class="wp__field">
            <span>Website</span>
            <input
              class="ar-field__input"
              type="url"
              maxlength="256"
              placeholder="https://"
              [value]="form().website"
              (input)="set('website', $any($event.target).value)"
            />
          </label>
          <label class="wp__field wp__field--wide">
            <span>Address</span>
            <input
              class="ar-field__input"
              maxlength="256"
              [value]="form().address"
              (input)="set('address', $any($event.target).value)"
            />
          </label>
          <label class="wp__field">
            <span>Category</span>
            <select
              class="ar-field__input"
              [value]="form().vertical"
              (change)="set('vertical', $any($event.target).value)"
            >
              <option value="">Not set</option>
              @for (v of verticalOptions(); track v.value) {
                <option [value]="v.value">{{ v.label }}</option>
              }
            </select>
          </label>
        </div>
        @if (profileError(); as e) {
          <p class="wp__error">{{ e }}</p>
        } @else if (!profileLoaded()) {
          <p class="wp__muted">Reading the profile from WhatsApp…</p>
        } @else if (profileProblem(); as p) {
          <p class="wp__muted">{{ p }}</p>
        }
        <div class="wp__actions">
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="saving() || !profileLoaded() || profileProblem() !== null"
            (click)="saveProfile()"
          >
            {{ saving() ? 'Sending to WhatsApp…' : 'Update profile' }}
          </button>
        </div>
      </section>
    </div>
  `,
})
export class ArNumberHealth implements OnInit {
  private readonly api = inject(ChannelService);
  private readonly toasts = inject(ToastService);
  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly health = signal<ChannelHealthDto | null>(null);
  protected readonly history = signal<ChannelQualitySnapshotDto[]>([]);
  protected readonly saving = signal(false);
  protected readonly form = signal<ProfileForm>({ ...EMPTY_PROFILE });
  /** What Meta held when the page loaded (or after the last save); changes are worked out against it. */
  private readonly original = signal<ProfileForm>({ ...EMPTY_PROFILE });
  protected readonly profileLoaded = signal(false);
  protected readonly profileError = signal<string | null>(null);
  /** Meta's own list, plus the number's current category when it is one the list doesn't name. */
  protected readonly verticalOptions = computed(() => {
    const current = this.original().vertical;
    return current && !META_VERTICALS.some((v) => v.value === current)
      ? [{ value: current, label: current }, ...META_VERTICALS]
      : META_VERTICALS;
  });

  protected readonly downgrades = computed(() => {
    const ordered = [...this.history()].reverse();
    let n = 0;
    for (let i = 1; i < ordered.length; i++) {
      if (
        (ordered[i].quality ?? 0) > (ordered[i - 1].quality ?? 0) &&
        ordered[i - 1].quality !== QualityRating.Unknown
      )
        n++;
    }
    return n;
  });

  protected readonly profileProblem = computed(() => {
    const f = this.form();
    if (!this.profileLoaded()) return null;
    const changes = profileChanges(f, this.original());
    if (Object.keys(changes).length === 0) return 'Nothing has changed yet.';
    if (changes['email'] === '' || changes['website'] === '')
      return 'The email and website can be changed here but not removed.';
    if (changes['email'] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(changes['email']))
      return 'Enter a valid email address.';
    if (changes['website'] && !/^https?:\/\/\S+\.\S+/.test(changes['website']))
      return 'The website must start with https://.';
    return null;
  });

  async ngOnInit(): Promise<void> {
    const [h, q, p] = await Promise.allSettled([
      firstValueFrom(this.api.getHealth(this.id)),
      firstValueFrom(this.api.getQualityHistory(this.id, 30)),
      firstValueFrom(this.api.getBusinessProfile(this.id, { skipHandleError: true })),
    ]);
    if (p.status === 'fulfilled') {
      const current = profileForm(p.value);
      this.original.set(current);
      this.form.set({ ...current });
      this.profileLoaded.set(true);
    } else {
      this.profileError.set(readApiError(p.reason, 'The profile could not be read from WhatsApp.'));
    }
    if (h.status === 'fulfilled') this.health.set(h.value);
    if (q.status === 'fulfilled') {
      this.history.set(
        [...(q.value.items ?? [])].sort((a, b) =>
          (b.capturedAtUtc ?? '').localeCompare(a.capturedAtUtc ?? ''),
        ),
      );
    }
  }

  protected quality(q: QualityRating | undefined) {
    return QUALITY[q ?? QualityRating.Unknown] ?? QUALITY[QualityRating.Unknown];
  }

  protected tier(t: MessagingTier | undefined): string {
    return t === undefined ? '—' : (TIER[t] ?? '—');
  }

  protected set(key: keyof ProfileForm, value: string): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected async saveProfile(): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.api.updateBusinessProfile(this.id, profileChanges(this.form(), this.original()), {
          skipHandleError: true,
        }),
      );
      this.toasts.success('Business profile updated on WhatsApp.', 'WhatsApp number');
      this.original.set({ ...this.form() });
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'WhatsApp did not accept the change.'), 'WhatsApp number');
    } finally {
      this.saving.set(false);
    }
  }
}
