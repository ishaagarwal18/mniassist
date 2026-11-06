import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import { SharedVoiceAgent, SharedVoiceAgentService } from '../channels/shared-voice-agent.service';
import { ArButton, ArCard } from '../../ui';

@Component({
  selector: 'ar-new-voice-agent-page',
  imports: [FormsModule, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Create AI Voice Agent"
      subtitle="Design an autonomous AI voice agent for inbound or outbound calls"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">
        Back to Voice Agents
      </button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <ar-card heading="Agent Setup & Persona">
        <form class="agent-form" (submit)="$event.preventDefault(); create()">
          <label class="ar-field">
            <span class="ar-field__label">Agent Name <span class="required">*</span></span>
            <input
              class="ar-field__input"
              required
              maxlength="100"
              placeholder="e.g. Industrial Spares & Breakdown Assistant"
              [(ngModel)]="name"
              name="agentName"
            />
            <span class="ar-field__hint">
              Used internally to identify this voice persona across lines and batches.
            </span>
          </label>

          <label class="ar-field">
            <span class="ar-field__label">Clone Settings From Existing Agent</span>
            <select class="ar-field__input" [(ngModel)]="copyFrom" name="copyFrom">
              <option value="">Start from standard template</option>
              @for (agent of existingAgents(); track agent.id) {
                <option [value]="agent.id">{{ agent.name }}</option>
              }
            </select>
            <span class="ar-field__hint">
              Optionally copy voice pitch, language prompt, tools and rules from an existing agent.
            </span>
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
              [disabled]="busy() || !name().trim()"
            >
              {{ busy() ? 'Creating agent…' : 'Create & Open Studio' }}
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
        max-width: 720px;
      }
      .agent-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-top: 0.5rem;
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
    `,
  ],
})
export class ArNewVoiceAgentPage implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(SharedVoiceAgentService);
  private readonly toasts = inject(ToastService);

  protected readonly name = signal('');
  protected readonly copyFrom = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly existingAgents = signal<SharedVoiceAgent[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const list = await firstValueFrom(this.api.list());
      this.existingAgents.set(list ?? []);
    } catch {
      // Ignore if list fails
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/calls/ai-agents');
  }

  async create(): Promise<void> {
    const trimmed = this.name().trim();
    if (!trimmed || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const agent = await firstValueFrom(this.api.create(trimmed, this.copyFrom() || null));
      this.toasts.success(`Voice agent "${trimmed}" created.`);
      void this.router.navigate(['/calls/ai-agents', agent.id]);
    } catch {
      this.error.set('Failed to create voice agent. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
