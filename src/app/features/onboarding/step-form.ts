import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { OnboardingChecklistStep as Step } from '../../proxy/identity/onboarding-checklist-step.enum';
import { AR_DIALOG_INLINE } from '../../ui/dialog-inline';
import { ArConnectNumberDialog } from '../channels/connect-number-dialog';
import { ArContactImport } from '../contacts/contact-import-dialog';

/**
 * Connecting a number and importing contacts are dialogs at their own screens; here they lie in the page, as on the
 * `/channels/connect` form page.
 */
@Component({
  selector: 'ar-onboarding-step-form',
  imports: [ArConnectNumberDialog, ArContactImport],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (step() === Step.ConnectChannel) {
      <ar-connect-number-dialog (close)="closed.emit()" />
    } @else {
      <ar-contact-import (closed)="closed.emit()" (imported)="closed.emit()" />
    }
  `,
})
export class ArOnboardingStepForm {
  readonly step = input.required<Step>();
  readonly closed = output<void>();
  protected readonly Step = Step;
}
