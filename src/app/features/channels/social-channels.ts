import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  InstagramChannelDto,
  InstagramChannelService,
  MessengerAvailablePagesDto,
  MessengerChannelDto,
  MessengerChannelService,
  SocialChannelState,
} from '../../proxy/social/social-channels.service';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

type Kind = 'messenger' | 'instagram';

const STATE: Record<SocialChannelState, { tone: ChipTone; label: string }> = {
  [SocialChannelState.Onboarding]: { tone: 'neutral', label: 'Setting up' },
  [SocialChannelState.Active]: { tone: 'good', label: 'Connected' },
  [SocialChannelState.Suspended]: { tone: 'bad', label: 'Suspended' },
  [SocialChannelState.Restricted]: { tone: 'warn', label: 'Restricted' },
};

/**
 * Facebook Messenger and Instagram: connect a Facebook Page or an Instagram professional account so their
 * messages arrive in the inbox. Meta sends the browser back to /messenger/oauth-callback or
 * /instagram/oauth-callback (the RedirectUri the API is configured with); this page handles both.
 */
@Component({
  selector: 'ar-social-channels',
  imports: [ArTopbar, ArButton, ArChip, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  template: `
    <ar-topbar
      title="Messenger & Instagram"
      subtitle="Answer Facebook Page and Instagram messages from the inbox"
      help="Sign in with Meta, then pick the Page or account to connect. Their messages land in the inbox alongside WhatsApp."
    />
    <div class="wp">
      @if (callbackBusy()) {
        <div class="wp__card"><p class="wp__muted">Finishing the sign-in with Meta…</p></div>
      }
      @if (callbackError(); as e) {
        <div class="wp__card">
          <p class="wp__error">{{ e }}</p>
        </div>
      }

      @if (pages(); as p) {
        <section class="wp__card">
          <h2 class="wp__title">Pick the Facebook Page to connect</h2>
          <p class="wp__muted">Messages sent to this Page on Messenger will come into the inbox.</p>
          @if (p.pages.length === 0) {
            <p class="wp__empty">
              This Facebook account manages no Pages, or none were shared during sign-in. Sign in
              again and tick the Page.
            </p>
          }
          <ul class="wp__list">
            @for (o of p.pages; track o.pageId) {
              <li class="wp__item">
                <span class="wp__grow">
                  <span class="wp__name" translate="no">{{ o.pageName }}</span>
                  @if (o.category) {
                    <span class="wp__sub" translate="no">{{ o.category }}</span>
                  }
                </span>
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy() !== null"
                  (click)="connectPage(p.selectionId, o.pageId)"
                >
                  {{ busy() === o.pageId ? 'Connecting…' : 'Connect' }}
                </button>
              </li>
            }
          </ul>
        </section>
      }

      <section class="wp__card">
        <div class="wp__row">
          <h2 class="wp__title wp__grow">Facebook Messenger</h2>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() !== null"
            (click)="start('messenger')"
          >
            {{ busy() === 'messenger' ? 'Opening Facebook…' : 'Connect a Page' }}
          </button>
        </div>
        <p class="wp__muted">Sign in with the Facebook account that manages your business Page.</p>
        <ul class="wp__list">
          @for (c of messenger(); track c.id) {
            <li class="wp__item">
              <span class="wp__grow">
                <span class="wp__name" translate="no">{{ c.pageName }}</span>
                <span class="wp__sub">
                  Page {{ c.pageId }}
                  @if (c.webhookSubscribedAtUtc) {
                    · receiving messages since {{ c.webhookSubscribedAtUtc | date: 'd MMM y' }}
                  } @else {
                    · not receiving messages yet
                  }
                </span>
                @if (c.restrictionReason) {
                  <span class="wp__error">{{ c.restrictionReason }}</span>
                }
              </span>
              <ar-chip [tone]="state(c.state).tone" [dot]="true">{{
                state(c.state).label
              }}</ar-chip>
            </li>
          } @empty {
            <li class="wp__empty">No Page connected yet.</li>
          }
        </ul>
      </section>

      <section class="wp__card">
        <div class="wp__row">
          <h2 class="wp__title wp__grow">Instagram</h2>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() !== null"
            (click)="start('instagram')"
          >
            {{ busy() === 'instagram' ? 'Opening Instagram…' : 'Connect an account' }}
          </button>
        </div>
        <p class="wp__muted">
          Needs an Instagram professional (business or creator) account. Sign-in lasts 60 days and
          is renewed automatically.
        </p>
        <ul class="wp__list">
          @for (c of instagram(); track c.id) {
            <li class="wp__item">
              <span class="wp__grow">
                <span class="wp__name" translate="no">&#64;{{ c.username }}</span>
                <span class="wp__sub"
                  >Sign-in valid until {{ c.tokenExpiresAtUtc | date: 'd MMM y' }}</span
                >
                @if (c.restrictionReason) {
                  <span class="wp__error">{{ c.restrictionReason }}</span>
                }
              </span>
              <ar-chip [tone]="state(c.state).tone" [dot]="true">{{
                state(c.state).label
              }}</ar-chip>
            </li>
          } @empty {
            <li class="wp__empty">No Instagram account connected yet.</li>
          }
        </ul>
      </section>

      <p class="wp__muted">
        Conversations from these channels open in the <a routerLink="/inbox">inbox</a>.
      </p>
    </div>
  `,
})
export class ArSocialChannels implements OnInit {
  private readonly messengerApi = inject(MessengerChannelService);
  private readonly instagramApi = inject(InstagramChannelService);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  /** Set on the two callback routes: which login Meta is returning from. */
  private readonly callback = (this.route.snapshot.data['callback'] as Kind | undefined) ?? null;

  protected readonly messenger = signal<MessengerChannelDto[]>([]);
  protected readonly instagram = signal<InstagramChannelDto[]>([]);
  protected readonly pages = signal<MessengerAvailablePagesDto | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly callbackBusy = signal(false);
  protected readonly callbackError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    if (this.callback) await this.finishLogin(this.callback);
    await this.load();
  }

  protected state(s: SocialChannelState) {
    return STATE[s] ?? STATE[SocialChannelState.Onboarding];
  }

  private async load(): Promise<void> {
    const [m, i] = await Promise.allSettled([
      firstValueFrom(this.messengerApi.getList()),
      firstValueFrom(this.instagramApi.getList()),
    ]);
    if (m.status === 'fulfilled') this.messenger.set(m.value.items ?? []);
    if (i.status === 'fulfilled') this.instagram.set(i.value.items ?? []);
  }

  protected async start(kind: Kind): Promise<void> {
    this.busy.set(kind);
    try {
      const api = kind === 'messenger' ? this.messengerApi : this.instagramApi;
      const start = await firstValueFrom(api.getLoginStart({ skipHandleError: true }));
      window.location.href = start.authorizeUrl;
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The sign-in could not be started.'), 'Meta sign-in');
      this.busy.set(null);
    }
  }

  private async finishLogin(kind: Kind): Promise<void> {
    const q = this.route.snapshot.queryParamMap;
    const code = q.get('code');
    const state = q.get('state');
    const denied = q.get('error_description') ?? q.get('error');
    // The code works once: keep it out of history so a reload can't resend it.
    this.location.replaceState('/channels/social');

    if (denied || !code || !state) {
      this.callbackError.set(
        denied
          ? `Meta did not connect the account: ${denied}`
          : 'The sign-in did not finish. Try again.',
      );
      return;
    }

    this.callbackBusy.set(true);
    try {
      if (kind === 'messenger') {
        this.pages.set(
          await firstValueFrom(
            this.messengerApi.completeLogin(
              { state, authorizationCode: code },
              { skipHandleError: true },
            ),
          ),
        );
      } else {
        const c = await firstValueFrom(
          this.instagramApi.completeLogin(
            { state, authorizationCode: code },
            { skipHandleError: true },
          ),
        );
        this.toasts.success(`@${c.username} is connected.`, 'Instagram');
      }
    } catch (e: unknown) {
      this.callbackError.set(readApiError(e, 'The sign-in could not be finished. Try again.'));
    } finally {
      this.callbackBusy.set(false);
    }
  }

  protected async connectPage(selectionId: string, pageId: string): Promise<void> {
    this.busy.set(pageId);
    try {
      const c = await firstValueFrom(
        this.messengerApi.connectPage({ selectionId, pageId }, { skipHandleError: true }),
      );
      this.pages.set(null);
      this.toasts.success(`${c.pageName} is connected.`, 'Messenger');
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The Page could not be connected.'), 'Messenger');
    } finally {
      this.busy.set(null);
    }
  }
}
