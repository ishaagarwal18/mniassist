import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { Router, RouterLink } from '@angular/router';
import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import { AR_DIALOG_INLINE, ArButton } from '../../ui';
import { ArTicketSettingsDialog } from './ticket-settings-dialog';

@Component({
  selector: 'ar-helpdesk-settings-page',
  imports: [ArTopbar, ArButton, ArTicketSettingsDialog, RouterLink],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Helpdesk Settings"
      subtitle="Response SLAs by priority, automated notifications and customer ticket portal"
    >
      @if (canEscalate()) {
        <a ar-button variant="ghost" routerLink="/helpdesk/escalation">Breakdown escalation</a>
      }
      <button ar-button type="button" variant="ghost" (click)="back()">Back to Helpdesk</button>
    </ar-topbar>
    <div class="page-container ar-scroll">
      <ar-ticket-settings-dialog (closed)="back()" />
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.25rem 1.5rem 2rem;
        max-width: 800px;
      }
    `,
  ],
})
export class ArHelpdeskSettingsPage {
  protected readonly canEscalate = grantedPolicy(
    'AutoReach.FaultCodes.Manage',
    inject(PermissionService),
  );
  private readonly router = inject(Router);

  back(): void {
    void this.router.navigateByUrl('/helpdesk');
  }
}
