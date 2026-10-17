import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ArSidebar } from './sidebar';
import { NavDrawer } from './nav-drawer';
import { ArSoftphoneBar } from './softphone-bar';
import { ArWhatsAppCallBar } from './whatsapp-call-bar';
import { ArToastHost } from './toast-host';
import { ArConfirmHost } from './confirm-host';
import { ArIcon } from '../ui';
import { AgencyActingStore } from '../core/services/agency-acting.store';
import { PwaService } from '../core/services/pwa.service';
import { AccountSwitcher } from '../core/auth/account-switch';
import { CurrentUserService } from '../core/services/current-user.service';
import { readApiError } from '../core/util/api-error';
import { ToastService } from '../core/ui/toast.service';

@Component({
  selector: 'ar-app-shell',
  imports: [
    RouterOutlet,
    ArSidebar,
    ArSoftphoneBar,
    ArWhatsAppCallBar,
    ArToastHost,
    ArConfirmHost,
    ArIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-sidebar />
    @if (drawer.open()) {
      <button
        type="button"
        class="shell__scrim"
        aria-label="Close the menu"
        (click)="drawer.close()"
      ></button>
    }
    <main class="shell__main">
      @if (!pwa.isOnline()) {
        <div class="shell__banner shell__banner--offline" role="status">
          <ar-icon name="alert" [size]="14" />
          <span>You are currently offline. Running with cached data.</span>
        </div>
      }
      @if (pwa.hasUpdate()) {
        <div class="shell__banner shell__banner--update" role="status">
          <ar-icon name="refresh" [size]="14" />
          <span>A new version of MNI Assist is available.</span>
          <button type="button" (click)="pwa.applyUpdate()">Update now</button>
        </div>
      }
      @if (switcher.actingAs(); as a) {
        <div class="shell__acting" role="status">
          <span>
            You are <strong>{{ user.fullName() }}</strong>
            @if (user.tenantName()) {
              in {{ user.tenantName() }}
            }
            — signed in as {{ a.userName }}. Everything you do is recorded as theirs, with your name
            beside it.
          </span>
          <button type="button" [disabled]="returning()" (click)="returnToSelf()">
            {{ returning() ? 'Returning…' : 'Return to your account' }}
          </button>
        </div>
      }
      @if (acting.session(); as s) {
        <div class="shell__acting" role="status">
          <span>
            Viewing <strong>{{ s.clientDisplayName }}</strong> as their agency — read-only
          </span>
          <button type="button" (click)="exit()">Exit client view</button>
        </div>
      }
      <div class="shell__content"><router-outlet /></div>
    </main>
    <ar-softphone-bar />
    <ar-whatsapp-call-bar />
    <ar-toast-host />
    <ar-confirm-host />
  `,
  styles: `
    :host {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--ar-bg-100);
    }
    .shell__scrim {
      display: none;
    }
    @media (max-width: 720px) {
      .shell__scrim {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 1050;
        border: 0;
        padding: 0;
        background: transparent;
      }
    }
    .shell__main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      /* A soft cobalt light falloff in the dark theme; nothing in light. */
      background-image: var(--ar-page-glow);
    }
    .shell__content {
      flex: 1;
      min-height: 0;
      min-width: 0;
      overflow-x: auto;
      display: flex;
      flex-direction: column;
    }
    .shell__content > :not(router-outlet) {
      flex: 1;
      min-height: 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .shell__acting {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 16px;
      background: var(--ar-amber-500);
      color: var(--ar-on-attention);
      font: 500 12.5px var(--ar-font-sans);
    }
    .shell__acting button {
      border: 1px solid var(--ar-on-attention);
      border-radius: var(--ar-radius-chip);
      background: transparent;
      color: var(--ar-on-attention);
      font: 600 11.5px var(--ar-font-sans);
      padding: 3px 10px;
      cursor: pointer;
    }
    .shell__banner {
      flex: none;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 7px 16px;
      font: 500 12.5px var(--ar-font-sans);
    }
    .shell__banner--offline {
      background: var(--ar-surface-dark);
      color: var(--ar-white);
      border-bottom: 1px solid var(--ar-line-300);
    }
    .shell__banner--update {
      background: var(--ar-ai-fill);
      color: var(--ar-white);
      justify-content: space-between;
    }
    .shell__banner--update button {
      border: 1px solid var(--ar-white);
      border-radius: var(--ar-radius-chip);
      background: transparent;
      color: var(--ar-white);
      font: 600 11.5px var(--ar-font-sans);
      padding: 3px 10px;
      cursor: pointer;
    }
    .shell__banner--update button:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  `,
})
export class ArAppShell {
  protected readonly drawer = inject(NavDrawer);

  @HostListener('document:keydown.escape')
  protected closeDrawer(): void {
    this.drawer.close();
  }

  protected readonly acting = inject(AgencyActingStore);
  protected readonly pwa = inject(PwaService);
  protected readonly switcher = inject(AccountSwitcher);
  protected readonly user = inject(CurrentUserService);
  private readonly toasts = inject(ToastService);
  protected readonly returning = signal(false);

  constructor() {
    void this.acting.refresh();
  }

  protected async returnToSelf(): Promise<void> {
    this.returning.set(true);
    try {
      await this.switcher.returnToSelf();
    } catch (e) {
      this.returning.set(false);
      this.toasts.error(
        readApiError(e, 'Could not return to your account. Sign out and in again.'),
      );
    }
  }

  protected async exit(): Promise<void> {
    await this.acting.leave();
    window.location.assign('/settings/agency');
  }
}
