import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { NetworkLeadDto, NetworkService } from '../../proxy/network/network.service';
import { ArButton, ArChip } from '../../ui';
import type { ChipTone } from '../../ui/chip';
import { LEAD_STATE_LABEL, leadTone, timeLeft } from './network-logic';
import { ArRouteLeadDialog } from './route-lead-dialog';

/** S3, inside the enquiry drawer: where this enquiry stands in the dealer network, and the button that routes it. */
@Component({
  selector: 'ar-enquiry-network',
  imports: [ArButton, ArChip, ArRouteLeadDialog, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <section class="en" aria-label="Dealer network">
        <h3 class="en__t">Dealer network</h3>
        @if (lead(); as l) {
          <p class="en__row">
            <ar-chip [tone]="tone(l.state)" [dot]="true">{{ label(l) }}</ar-chip>
            @if (l.dealerName) {
              <span>{{ l.dealerName }}</span>
            }
            @if (l.state === 'Offered') {
              <small>{{ left(l.answerByUtc) }}</small>
            } @else if (l.dealerStage) {
              <small>dealer's stage: {{ l.dealerStage }}</small>
            }
            <a routerLink="/network">Details →</a>
          </p>
          @if (l.state === 'Unrouted' && canRoute && open()) {
            <button ar-button type="button" variant="ghost" (click)="routing.set(true)">
              Route again
            </button>
          }
        } @else if (canRoute && open()) {
          <p class="en__hint">Send this enquiry to the dealer covering the customer's area.</p>
          <button ar-button type="button" variant="ghost" (click)="routing.set(true)">
            Route to a dealer
          </button>
        }
      </section>
    }
    @if (routing()) {
      <ar-route-lead-dialog [enquiryId]="enquiryId()" (closed)="routed($event)" />
    }
  `,
  styles: `
    .en {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-start;
    }
    .en__t {
      margin: 0;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .en__row {
      margin: 0;
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      font: 400 13px var(--ar-font-sans);
    }
    .en__row small,
    .en__hint {
      color: var(--ar-ink-500);
      font-size: 12px;
      margin: 0;
    }
    .en__row a {
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
    }
  `,
})
export class ArEnquiryNetwork {
  private readonly api = inject(NetworkService);
  private readonly permissions = inject(PermissionService);
  protected readonly canSee = grantedPolicy('AutoReach.Network', this.permissions);
  protected readonly canRoute = grantedPolicy('AutoReach.Network.Route', this.permissions);

  readonly enquiryId = input.required<string>();
  /** False for a won or lost enquiry: nothing left to route. */
  readonly open = input(true);

  protected readonly lead = signal<NetworkLeadDto | null>(null);
  protected readonly routing = signal(false);
  protected readonly visible = () =>
    this.canSee && (!!this.lead() || (this.canRoute && this.open()));

  constructor() {
    effect(() => {
      const id = this.enquiryId();
      this.lead.set(null);
      if (!this.canSee || environment.useMockData) return;
      firstValueFrom(this.api.getForEnquiry(id))
        .then((l) => this.lead.set(l ?? null))
        .catch(() => undefined);
    });
  }

  protected tone(state: string): ChipTone {
    return leadTone(state);
  }

  protected label(l: NetworkLeadDto): string {
    return LEAD_STATE_LABEL[l.state] ?? l.state;
  }

  protected left(iso?: string | null): string {
    return timeLeft(iso);
  }

  protected routed(result: NetworkLeadDto | null): void {
    this.routing.set(false);
    if (result) this.lead.set(result);
  }
}
