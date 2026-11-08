import { RestService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ArButton } from '../../ui/button';
import { VoiceAgentDefinition, VoiceAgentTools } from './voice-agent.service';

export interface VoicePlaybook {
  key: string;
  name: string;
  purpose: string;
  direction: 'inbound' | 'outbound' | 'both';
  agent: VoiceAgentDefinition;
  requirements: { key: string; label: string; met: boolean | null; hint: string }[];
  scenarios: { say: string; expect: string }[];
}

@Injectable({ providedIn: 'root' })
export class VoicePlaybookService {
  private readonly rest = inject(RestService);
  getList() {
    return this.rest.request<never, VoicePlaybook[]>(
      { method: 'GET', url: '/api/auto-reach/voice-playbook' },
      { apiName: 'AutoReach' },
    );
  }
}

const ACTIONS: [keyof VoiceAgentTools, string][] = [
  ['searchKnowledge', 'answers from knowledge'],
  ['searchCatalogue', 'looks up products'],
  ['updateCrm', 'saves details to the CRM'],
  ['bookMeetings', 'books meetings'],
  ['raiseTickets', 'raises tickets'],
  ['sendFollowUps', 'sends WhatsApp follow-ups'],
  ['transferToPeople', 'hands calls to people'],
  ['lookUpBalance', 'tells balances'],
  ['lookUpContracts', 'checks service contracts'],
  ['lookUpFaultCodes', 'looks up alarm codes'],
  ['sendPaymentLinks', 'sends payment links'],
  ['rememberCallers', 'remembers callers'],
];

/**
 * Tested agents for common jobs: lead qualification, support, booking, reminders and collections. Each sets up the instructions,
 * actions, after-call goal and fields at once; the workspace's own people, teams and connections stay as chosen. What the workspace
 * still needs is listed, and what to try in a test call.
 */
@Component({
  selector: 'ar-voice-playbooks',
  imports: [ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    <ul class="pb">
      @for (p of playbooks(); track p.key) {
        <li>
          <details
            (toggle)="open.set($any($event.target).open ? p.key : open() === p.key ? null : open())"
          >
            <summary>
              <strong>{{ p.name }}</strong> · {{ directionLabel(p.direction) }}
              <span class="pb__purpose">{{ p.purpose }}</span>
            </summary>
            <p>The agent {{ actions(p) }}.</p>
            <p><strong>Success:</strong> {{ p.agent.analysis?.goal }}</p>
            <h4>Set up first</h4>
            <ul class="pb__needs">
              @for (r of p.requirements; track r.key) {
                <li [class.pb__missing]="r.met === false">
                  {{ r.met === true ? '✓' : r.met === false ? 'Missing:' : 'Choose:' }}
                  {{ r.label }}
                  @if (r.met !== true) {
                    <span class="pb__hint">({{ r.hint }})</span>
                  }
                </li>
              }
            </ul>
            <h4>Try in a test call</h4>
            <ul class="pb__tries">
              @for (s of p.scenarios; track s.say) {
                <li>
                  <q>{{ s.say }}</q> {{ s.expect }}
                </li>
              }
            </ul>
            <button ar-button type="button" [disabled]="disabled()" (click)="use(p)">
              Use this playbook
            </button>
          </details>
        </li>
      } @empty {
        @if (!error()) {
          <li>Loading…</li>
        }
      }
    </ul>
    @if (applied()) {
      <p role="status">
        {{ applied() }} is in the draft. Choose the acting user and any teams on the Actions tab,
        then save, test and publish.
      </p>
    }
  `,
  styles: `
    .pb {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 6px;
    }
    .pb > li {
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      padding: 6px 10px;
      min-width: 0;
    }
    .pb summary {
      cursor: pointer;
    }
    .pb__purpose {
      display: block;
      color: var(--ar-ink-600);
      font-size: 0.9em;
    }
    .pb h4 {
      margin: 8px 0 4px;
      font-size: 0.95em;
    }
    .pb__needs,
    .pb__tries {
      margin: 0 0 8px;
      padding-left: 18px;
      display: grid;
      gap: 2px;
      font-size: 0.9em;
    }
    .pb__missing {
      color: var(--ar-attention-700, #b54708);
    }
    .pb__hint {
      color: var(--ar-ink-500);
    }
  `,
})
export class ArVoicePlaybooks implements OnInit {
  private readonly api = inject(VoicePlaybookService);
  readonly disabled = input(false);
  readonly apply = output<{ agent: VoiceAgentDefinition; keepTools: boolean }>();
  protected readonly playbooks = signal<VoicePlaybook[]>([]);
  protected readonly open = signal<string | null>(null);
  protected readonly applied = signal('');
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.playbooks.set(await firstValueFrom(this.api.getList()));
    } catch {
      this.error.set('The playbooks could not be loaded.');
    }
  }

  protected directionLabel(direction: VoicePlaybook['direction']): string {
    return direction === 'outbound'
      ? 'calls customers'
      : direction === 'both'
        ? 'answers or calls'
        : 'answers calls';
  }

  protected actions(p: VoicePlaybook): string {
    const tools = p.agent.tools;
    const list = ACTIONS.filter(([key]) => tools?.[key] === true).map(([, label]) => label);
    return list.length > 1
      ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
      : (list[0] ?? 'talks with callers');
  }

  protected use(p: VoicePlaybook): void {
    this.apply.emit({ agent: p.agent, keepTools: false });
    this.applied.set(p.name);
  }
}
