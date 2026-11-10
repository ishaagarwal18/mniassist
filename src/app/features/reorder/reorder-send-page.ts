import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { PickerOption } from '../../core/services/pipeline.service';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { ReorderPortalService } from '../../proxy/reorder/reorder-portal.service';
import { AR_DIALOG_INLINE, ArButton, ArDialog } from '../../ui';
import { ArContactPicker } from '../pipeline/contact-picker';
import { REORDER_PAGE_STYLES } from './reorder-pages';
import { ArSendReorderLink } from './send-reorder-link';

/**
 * Sending one customer their personal re-order link, as a page (/reorders/send): choose the customer, then the link goes on
 * WhatsApp and shows here to copy (the same send-link form the inbox and contacts use, shown on the page). `?contact=<id>&name=…`
 * starts at the second step. Done returns to Re-orders.
 */
@Component({
  selector: 'ar-reorder-send-page',
  imports: [ArTopbar, ArDialog, ArButton, ArContactPicker, ArSendReorderLink],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="Send a re-order link" [subtitle]="sendTo()?.label ?? 'Choose the customer'" />
    <div class="rp ar-scroll">
      @if (!canSend()) {
        <p class="ro__err" role="alert">Your role can't send re-order links.</p>
      } @else if (sendTo(); as c) {
        <ar-send-reorder-link [contactId]="c.id" [contactName]="c.label" (closed)="back()" />
        <div>
          <button ar-button type="button" variant="ghost" (click)="another()">
            Send to another customer
          </button>
        </div>
      } @else {
        <ar-dialog title="Choose the customer" (dismiss)="back()">
          <p class="ro__hint">
            The link is personal and works for {{ lifetimeDays() }} days. The customer confirms with
            a code sent to their WhatsApp before any prices show.
          </p>
          <ar-contact-picker (picked)="picked.set($event)" />
          <div dialogActions>
            <button ar-button type="button" variant="ghost" (click)="back()">Cancel</button>
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="!picked()"
              (click)="sendTo.set(picked())"
            >
              Continue
            </button>
          </div>
        </ar-dialog>
      }
    </div>
  `,
  styles: REORDER_PAGE_STYLES,
})
export class ArReorderSendPage {
  private readonly api = inject(ReorderPortalService);
  private readonly router = inject(Router);
  private readonly origin = inject(CockpitOriginService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  protected readonly canSend = grantedPolicy(
    'AutoReach.ReorderPortal.SendLinks',
    inject(PermissionService),
  );

  protected readonly picked = signal<PickerOption | null>(null);
  /** The customer the link goes to; set, the link is sent. */
  protected readonly sendTo = signal<PickerOption | null>(
    this.query.get('contact')
      ? { id: this.query.get('contact')!, label: this.query.get('name') || 'the customer' }
      : null,
  );
  protected readonly lifetimeDays = signal(7);

  constructor() {
    firstValueFrom(this.api.getSettings())
      .then((s) => this.lifetimeDays.set(s.linkLifetimeDays))
      .catch(() => {
        // The hint keeps the default; sending still says when the link stops working.
      });
  }

  protected another(): void {
    this.picked.set(null);
    this.sendTo.set(null);
  }

  protected back(): void {
    void this.router.navigateByUrl(this.origin.returnUrl('/reorders'));
  }
}
