import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VoiceService } from '../../core/services/voice.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArCard } from '../../ui';

@Component({
  selector: 'ar-ivr-prompt-page',
  imports: [FormsModule, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="A recorded or spoken message the phone menu plays, such as a greeting or an out-of-hours notice."
      [title]="isEdit() ? 'Edit IVR Prompt' : 'New IVR Prompt'"
      subtitle="Configure text-to-speech audio, digit gathering and entry point rules"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">
        Back to Voice / IVR
      </button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <ar-card [heading]="isEdit() ? 'Edit Prompt Details' : 'Prompt Definition'">
        <form class="prompt-form" (submit)="$event.preventDefault(); save()">
          <label class="ar-field">
            <span class="ar-field__label">Internal Prompt Name <span class="required">*</span></span>
            <input
              class="ar-field__input"
              required
              maxlength="128"
              placeholder="e.g. Main Menu or After-Hours Support"
              [(ngModel)]="name"
              name="promptName"
            />
            <span class="ar-field__hint">
              Used in the prompt list and branching dropdowns.
            </span>
          </label>

          <label class="ar-field">
            <span class="ar-field__label">Spoken Text (Text-to-Speech) <span class="required">*</span></span>
            <textarea
              class="ar-field__input"
              required
              rows="4"
              maxlength="1024"
              placeholder="Thanks for calling MNI Assist. Press 1 for Sales, press 2 for Emergency Breakdown Support..."
              [(ngModel)]="sayText"
              name="sayText"
            ></textarea>
            <span class="ar-field__hint">
              What the telephony provider's voice synthesizer speaks to the caller.
            </span>
          </label>

          <div class="form-grid">
            <label class="ar-field">
              <span class="ar-field__label">Max Digits to Collect</span>
              <input
                class="ar-field__input"
                type="number"
                min="1"
                max="10"
                [(ngModel)]="maxDigits"
                name="maxDigits"
              />
              <span class="ar-field__hint">Usually 1 for single-digit menu options.</span>
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Input Timeout (Seconds)</span>
              <input
                class="ar-field__input"
                type="number"
                min="1"
                max="60"
                [(ngModel)]="inputTimeoutSeconds"
                name="inputTimeoutSeconds"
              />
              <span class="ar-field__hint">Seconds to wait for keypress before repeating.</span>
            </label>
          </div>

          <label class="entry-point-check">
            <input
              type="checkbox"
              [(ngModel)]="isEntryPoint"
              name="isEntryPoint"
            />
            <span>Make this prompt the entry point (first message played on incoming call)</span>
          </label>

          @if (error()) {
            <p class="error-msg" role="alert">{{ error() }}</p>
          }

          <div class="form-actions">
            <button ar-button type="button" variant="ghost" (click)="cancel()">
              Cancel
            </button>
            <button
              ar-button
              type="submit"
              variant="primary"
              [disabled]="busy() || !name().trim() || !sayText().trim()"
            >
              {{ busy() ? 'Saving prompt…' : (isEdit() ? 'Update Prompt' : 'Create Prompt') }}
            </button>
          </div>
        </form>
      </ar-card>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.5rem 2rem 3rem;
        max-width: 760px;
      }
      .prompt-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-top: 0.5rem;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .entry-point-check {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        font-size: 0.875rem;
        color: var(--ar-ink-800);
        cursor: pointer;
        padding: 0.5rem 0;
      }
      .required {
        color: var(--ar-bad-600);
      }
      .error-msg {
        color: var(--ar-bad-600);
        font-size: 0.875rem;
        margin: 0;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line-200);
      }
      @media (max-width: 640px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ArIvrPromptPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(VoiceService);
  private readonly toasts = inject(ToastService);

  protected readonly editingId = signal<string | null>(null);
  protected readonly isEdit = signal(false);

  protected readonly name = signal('');
  protected readonly sayText = signal('');
  protected readonly maxDigits = signal(1);
  protected readonly inputTimeoutSeconds = signal(5);
  protected readonly isEntryPoint = signal(false);

  protected readonly busy = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.editingId.set(id);
      this.isEdit.set(true);
      const existing = this.store.prompts().find((p) => p.id === id);
      if (existing) {
        this.name.set(existing.name);
        this.sayText.set(existing.sayText);
        this.maxDigits.set(existing.maxDigits ?? 1);
        this.inputTimeoutSeconds.set(existing.inputTimeoutSeconds ?? 5);
        this.isEntryPoint.set(!!existing.isEntryPoint);
      }
    } else {
      this.isEntryPoint.set(this.store.prompts().length === 0);
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/channels/voice-ivr');
  }

  async save(): Promise<void> {
    const nameVal = this.name().trim();
    const sayVal = this.sayText().trim();
    if (!nameVal || !sayVal || this.busy()) return;

    this.busy.set(true);
    this.error.set('');
    try {
      const id = this.editingId();
      if (id) {
        const ok = await this.store.updatePrompt(id, {
          name: nameVal,
          sayText: sayVal,
          maxDigits: this.maxDigits(),
          inputTimeoutSeconds: this.inputTimeoutSeconds(),
        });
        if (ok) {
          this.toasts.success(`Prompt "${nameVal}" updated.`);
          void this.router.navigateByUrl('/channels/voice-ivr');
        } else {
          this.error.set('The prompt was not updated. Check the name and the recording, then try again.');
        }
      } else {
        const ok = await this.store.createPrompt({
          name: nameVal,
          sayText: sayVal,
          maxDigits: this.maxDigits(),
          inputTimeoutSeconds: this.inputTimeoutSeconds(),
          isEntryPoint: this.isEntryPoint(),
        });
        if (ok) {
          this.toasts.success(`Prompt "${nameVal}" created.`);
          void this.router.navigateByUrl('/channels/voice-ivr');
        } else {
          this.error.set('The prompt was not created. Check the name and the recording, then try again.');
        }
      }
    } catch {
      this.error.set('The prompt was not saved. Check the name and the recording, then try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
