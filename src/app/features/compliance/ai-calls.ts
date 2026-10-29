import { PermissionService, RestService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ArButton } from '../../ui/button';

/** The workspace's AI call rules: the editable recording notice and the rules every AI call follows. */
export interface VoiceCompliance {
  noticeEnabled: boolean;
  notice: string;
  callingFrom: string;
  callingTo: string;
  transcriptRetentionDays: number;
  optedOutOfCalls: number;
}

@Injectable({ providedIn: 'root' })
export class VoiceComplianceService {
  private readonly rest = inject(RestService);
  get() {
    return this.rest.request<never, VoiceCompliance>(
      { method: 'GET', url: '/api/auto-reach/voice-compliance' },
      { apiName: 'AutoReach' },
    );
  }
  update(noticeEnabled: boolean, notice: string) {
    return this.rest.request<unknown, VoiceCompliance>(
      {
        method: 'PUT',
        url: '/api/auto-reach/voice-compliance',
        body: { noticeEnabled, notice },
      },
      { apiName: 'AutoReach' },
    );
  }
}

/**
 * The Compliance page's AI calls card. The recording notice is the workspace's to word or turn off; the calling window,
 * opt-out, redaction and transcript retention apply to every AI call and are shown, not edited.
 */
@Component({
  selector: 'ar-ai-call-compliance',
  imports: [FormsModule, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card" aria-labelledby="ai-calls-h">
      <h2 class="card__h" id="ai-calls-h">AI calls</h2>
      @if (error()) {
        <p role="alert" class="ac__err">{{ error() }}</p>
      }
      @if (rules(); as r) {
        <div class="ac__notice">
          <label class="ac__check"
            ><input
              type="checkbox"
              [ngModel]="enabled()"
              (ngModelChange)="enabled.set($event); saved.set(false)"
              [disabled]="busy() || !canEdit"
            />
            Tell callers the call is recorded</label
          >
          <label class="ar-field ac__text"
            ><span class="ar-field__label">Said right after the AI agent's greeting</span>
            <input
              class="ar-field__input"
              maxlength="200"
              [ngModel]="notice()"
              (ngModelChange)="notice.set($event); saved.set(false)"
              [disabled]="busy() || !canEdit || !enabled()"
            />
          </label>
          @if (canEdit) {
            <button ar-button type="button" [disabled]="busy()" (click)="save()">
              {{ busy() ? 'Saving…' : 'Save' }}
            </button>
          }
        </div>
        @if (saved()) {
          <p role="status" class="ac__note">Saved. New AI calls use it.</p>
        }
        <ul class="ac__rules">
          <li>
            AI agents say they are an AI assistant in every greeting and never claim to be a person.
          </li>
          <li>
            Calls the AI agent places go out only between
            <strong translate="no">{{ r.callingFrom }}</strong> and
            <strong translate="no">{{ r.callingTo }}</strong> India time, and never to someone who
            opted out of messages or calls.
          </li>
          <li>
            A caller who asks not to be called again is opted out of calls straight away, and the
            request is kept in the consent ledger.
            <span translate="no">{{ r.optedOutOfCalls }}</span> contacts are opted out of calls.
          </li>
          <li>
            Card, Aadhaar and PAN numbers and spoken one-time codes are masked before a transcript
            is kept. Call recordings (audio) are not changed.
          </li>
          <li>
            Transcripts are deleted <span translate="no">{{ r.transcriptRetentionDays }}</span>
            days after the call, or with the contact's data on an erasure request, and are included
            in an access request's export.
          </li>
        </ul>
      } @else if (!error()) {
        <p role="status">Loading…</p>
      }
    </section>
  `,
  styles: `
    .card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 16px 18px 18px;
    }
    .card__h {
      margin: 0 0 12px;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .ac__notice {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      align-items: flex-end;
    }
    .ac__check {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
      padding-bottom: 6px;
    }
    .ac__text {
      flex: 1 1 320px;
      min-width: 0;
    }
    .ac__rules {
      margin: 14px 0 0;
      padding-left: 18px;
      display: grid;
      gap: 6px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .ac__note,
    .ac__err {
      margin: 8px 0 0;
      font: 400 12px var(--ar-font-sans);
    }
  `,
})
export class ArAiCallCompliance implements OnInit {
  private readonly api = inject(VoiceComplianceService);
  protected readonly canEdit = inject(PermissionService).getGrantedPolicy(
    'AutoReach.Compliance.ManageConsentText',
  );
  protected readonly rules = signal<VoiceCompliance | null>(null);
  protected readonly enabled = signal(true);
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.show(await firstValueFrom(this.api.get()));
    } catch {
      this.error.set('The AI call rules could not be loaded.');
    }
  }

  private show(rules: VoiceCompliance): void {
    this.rules.set(rules);
    this.enabled.set(rules.noticeEnabled);
    this.notice.set(rules.notice);
  }

  protected async save(): Promise<void> {
    if (this.busy()) return;
    const notice = this.notice().trim();
    if (this.enabled() && !notice) {
      this.error.set('Enter the notice, or turn it off.');
      return;
    }
    this.busy.set(true);
    this.saved.set(false);
    this.error.set('');
    try {
      this.show(await firstValueFrom(this.api.update(this.enabled(), notice)));
      this.saved.set(true);
    } catch {
      this.error.set('The notice could not be saved.');
    } finally {
      this.busy.set(false);
    }
  }
}
