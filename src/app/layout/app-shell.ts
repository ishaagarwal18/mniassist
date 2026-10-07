import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ArSidebar } from './sidebar';
import { ArSoftphoneBar } from './softphone-bar';
import { ArWhatsAppCallBar } from './whatsapp-call-bar';
import { ArToastHost } from './toast-host';
import { ArConfirmHost } from './confirm-host';
import { AgencyActingStore } from '../core/services/agency-acting.store';

@Component({
  selector: 'ar-app-shell',
  imports: [RouterOutlet, ArSidebar, ArSoftphoneBar, ArWhatsAppCallBar, ArToastHost, ArConfirmHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-sidebar />
    <main class="shell__main">
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
  `,
})
export class ArAppShell {
  protected readonly acting = inject(AgencyActingStore);

  constructor() {
    void this.acting.refresh();
  }

  protected async exit(): Promise<void> {
    await this.acting.leave();
    window.location.assign('/settings/agency');
  }
}
