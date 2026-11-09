import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';

import { AR_EMBEDDED_PAGE, ArEmbeddedPage } from '../../core/ui/embedded-page';
import { OnboardingChecklistStep as Step } from '../../proxy/identity/onboarding-checklist-step.enum';
import { ArBusinessProfile } from '../settings/business-profile';
import { ArOnboardingStepForm } from './step-form';
import { ArTemplateComposer } from '../templates/template-composer';

/** The steps Get started opens a screen for (verifying email and mobile, accepting the consent rules, adding funds and inviting the team are done on the card). */
const INLINE = new Set<Step>([
  Step.CompleteProfile,
  Step.ConnectChannel,
  Step.ImportContacts,
  Step.SubmitTemplate,
]);

export function opensInline(step: Step): boolean {
  return INLINE.has(step);
}

/** What the shown page reaches as AR_EMBEDDED_PAGE: its "done" closes the panel. */
@Injectable()
class StepEmbedding implements ArEmbeddedPage {
  readonly done = new Subject<void>();
  finished(): void {
    this.done.next();
  }
}

/**
 * One Get started step, done inside the Get started page under its card — no popup, no other page. The business
 * profile and template screens are the same components as at their own addresses, shown
 * in a frame here with {@link AR_EMBEDDED_PAGE} provided, so their sub-pages open in place and a save that would leave
 * the page closes the panel instead. Connecting a number and importing contacts show their forms in the page.
 *
 * Every screen loads only when its step is opened (`@defer`), so Get started stays as light as before.
 */
@Component({
  selector: 'ar-onboarding-step-panel',
  imports: [ArOnboardingStepForm, ArBusinessProfile, ArTemplateComposer],
  providers: [StepEmbedding, { provide: AR_EMBEDDED_PAGE, useExisting: StepEmbedding }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (step()) {
      @case (Step.ConnectChannel) {
        @defer {
          <ar-onboarding-step-form [step]="step()" (closed)="closed.emit()" />
        } @placeholder {
          <p class="wait" role="status">Loading…</p>
        }
      }
      @case (Step.ImportContacts) {
        @defer {
          <ar-onboarding-step-form [step]="step()" (closed)="closed.emit()" />
        } @placeholder {
          <p class="wait" role="status">Loading…</p>
        }
      }
      @default {
        <div class="ar-step-frame">
          @switch (step()) {
            @case (Step.CompleteProfile) {
              @defer {
                <ar-business-profile />
              } @placeholder {
                <p class="wait" role="status">Loading…</p>
              }
            }
            @case (Step.SubmitTemplate) {
              @defer {
                <ar-template-composer />
              } @placeholder {
                <p class="wait" role="status">Loading…</p>
              }
            }
          }
        </div>
      }
    }
  `,
  // The frame's rules for the page inside it (its header, its scroll) are in styles.scss (.ar-step-frame).
  styles: `
    :host {
      display: block;
      margin-top: 6px;
    }
    .wait {
      margin: 0;
      padding: 18px 4px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArOnboardingStepPanel {
  readonly step = input.required<Step>();
  /** The page's job is done (e.g. the template was saved), or the form's own Close / Cancel was pressed. */
  readonly closed = output<void>();

  protected readonly Step = Step;

  constructor() {
    inject(StepEmbedding)
      .done.pipe(takeUntilDestroyed())
      .subscribe(() => this.closed.emit());
  }
}
