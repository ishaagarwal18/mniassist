import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ArTopbar } from '../../layout/topbar';
import { AR_DIALOG_INLINE, ArButton } from '../../ui';
import { ArTicketSettingsDialog } from './ticket-settings-dialog';

@Component({
  selector: 'ar-helpdesk-settings-page',
  imports: [ArTopbar, ArButton, ArTicketSettingsDialog],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Helpdesk Settings"
      subtitle="Response SLAs by priority, automated notifications and customer ticket portal"
    >
      <button ar-button type="button" variant="ghost" (click)="back()">
        Back to Helpdesk
      </button>
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
  private readonly router = inject(Router);

  back(): void {
    void this.router.navigateByUrl('/helpdesk');
  }
}
