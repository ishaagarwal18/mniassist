import { LocalizationPipe } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ArTopbar } from '../../layout/topbar';
import { ArButton } from '../../ui/button';
import {
  SharedVoiceAgent,
  SharedVoiceAgentService,
  VoiceAgentAssignment,
  VoiceAgentChannel,
} from '../channels/shared-voice-agent.service';
import { ArVoiceAgentDialog } from '../channels/voice-agent-dialog';

/**
 * Voice agents of the workspace rather than of one number. Each is edited, tested, published and versioned in the same window as a
 * number's own agent, and answers and places AI calls on every number assigned to it. Unassigning a number, or deleting the agent,
 * puts the number back on its own agent; the history of assignments is kept.
 */
@Component({
  selector: 'ar-voice-agents',
  imports: [FormsModule, DatePipe, LocalizationPipe, ArTopbar, ArButton, ArVoiceAgentDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="'AutoReach::SharedAgents.Title' | abpLocalization"
      [help]="'AutoReach::SharedAgents.Help' | abpLocalization"
    />
    <main class="agents">
      <p>{{ 'AutoReach::SharedAgents.Intro' | abpLocalization }}</p>
      @if (error()) {
        <p role="alert">{{ error() | abpLocalization }}</p>
      }
      <form class="create" (submit)="$event.preventDefault(); create()">
        <label class="ar-field"
          ><span>{{ 'AutoReach::SharedAgents.Name' | abpLocalization }}</span>
          <input
            class="ar-field__input"
            name="name"
            maxlength="100"
            [ngModel]="newName()"
            (ngModelChange)="newName.set($event)"
            [disabled]="busy()"
        /></label>
        <label class="ar-field"
          ><span>{{ 'AutoReach::SharedAgents.CopyFrom' | abpLocalization }}</span>
          <select
            class="ar-field__input"
            name="copyFrom"
            [ngModel]="copyFrom()"
            (ngModelChange)="copyFrom.set($event)"
            [disabled]="busy()"
          >
            <option value="">{{ 'AutoReach::SharedAgents.Blank' | abpLocalization }}</option>
            @for (number of channels(); track number.channelId) {
              <option [value]="number.channelId">
                {{ number.name }} · {{ number.phoneNumber }}
              </option>
            }
          </select></label
        >
        <button ar-button type="submit" [disabled]="busy() || !newName().trim()">
          {{ 'AutoReach::SharedAgents.Create' | abpLocalization }}
        </button>
      </form>

      @if (loading()) {
        <p role="status">{{ 'AutoReach::VoiceAgent.Loading' | abpLocalization }}</p>
      } @else if (!agents().length) {
        <p>{{ 'AutoReach::SharedAgents.Empty' | abpLocalization }}</p>
      }
      <ul class="list">
        @for (agent of agents(); track agent.id) {
          <li class="agent">
            <div class="agent__head">
              <h2>{{ agent.name }}</h2>
              <span class="badge">
                {{ 'AutoReach::VoiceAgent.Type.' + agent.type | abpLocalization }}
              </span>
              <span class="badge" [class.badge--off]="!agent.isPublished">
                {{
                  (agent.isPublished
                    ? 'AutoReach::SharedAgents.Published'
                    : 'AutoReach::SharedAgents.NotPublished'
                  ) | abpLocalization
                }}
              </span>
              @if (agent.hasUnpublishedChanges) {
                <span class="badge badge--off">{{
                  'AutoReach::SharedAgents.Unpublished' | abpLocalization
                }}</span>
              }
            </div>
            @if (agent.numbers.length) {
              <ul
                class="numbers"
                [attr.aria-label]="'AutoReach::SharedAgents.Numbers' | abpLocalization"
              >
                @for (number of agent.numbers; track number.channelId) {
                  <li>
                    {{ number.name }} · <span translate="no">{{ number.phoneNumber }}</span>
                    <button
                      type="button"
                      class="link"
                      [disabled]="busy()"
                      (click)="unassign(number.channelId)"
                    >
                      {{ 'AutoReach::SharedAgents.Unassign' | abpLocalization }}
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p>{{ 'AutoReach::SharedAgents.NoNumbers' | abpLocalization }}</p>
            }
            @if (!agent.isPublished && agent.numbers.length) {
              <p role="alert">{{ 'AutoReach::SharedAgents.NotAnswering' | abpLocalization }}</p>
            }
            <div class="actions">
              <button ar-button type="button" (click)="editing.set(agent.id)">
                {{ 'AutoReach::SharedAgents.Edit' | abpLocalization }}
              </button>
              <label class="ar-field assign"
                ><span class="sr-only">{{
                  'AutoReach::SharedAgents.AssignTo' | abpLocalization
                }}</span>
                <select
                  class="ar-field__input"
                  [attr.aria-label]="'AutoReach::SharedAgents.AssignTo' | abpLocalization"
                  [disabled]="busy()"
                  (change)="assign(agent, $any($event.target)); $any($event.target).value = ''"
                >
                  <option value="">
                    {{ 'AutoReach::SharedAgents.AssignTo' | abpLocalization }}
                  </option>
                  @for (number of assignable(agent); track number.channelId) {
                    <option [value]="number.channelId">
                      {{ number.name }} · {{ number.phoneNumber }}
                      @if (number.agentName) {
                        ({{ 'AutoReach::SharedAgents.MovesFrom' | abpLocalization }}
                        {{ number.agentName }})
                      }
                    </option>
                  }
                </select></label
              >
              <button ar-button type="button" variant="ghost" (click)="toggleHistory(agent.id)">
                {{ 'AutoReach::SharedAgents.History' | abpLocalization }}
              </button>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="deleting.set(agent.id)"
              >
                {{ 'AutoReach::SharedAgents.Delete' | abpLocalization }}
              </button>
            </div>
            @if (deleting() === agent.id) {
              <p role="alert">
                {{ 'AutoReach::SharedAgents.ConfirmDelete' | abpLocalization }}
                <button ar-button type="button" [disabled]="busy()" (click)="remove(agent.id)">
                  {{ 'AutoReach::SharedAgents.Delete' | abpLocalization }}
                </button>
                <button ar-button type="button" variant="ghost" (click)="deleting.set(null)">
                  {{ 'AutoReach::VoiceAgent.History.cancel' | abpLocalization }}
                </button>
              </p>
            }
            @if (historyFor() === agent.id) {
              <div class="scroll">
                <table class="history">
                  <caption>
                    {{
                      'AutoReach::SharedAgents.History' | abpLocalization
                    }}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{{ 'AutoReach::SharedAgents.Number' | abpLocalization }}</th>
                      <th scope="col">
                        {{ 'AutoReach::SharedAgents.Assigned' | abpLocalization }}
                      </th>
                      <th scope="col">{{ 'AutoReach::SharedAgents.Ended' | abpLocalization }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of history(); track $index) {
                      <tr>
                        <td>
                          {{ row.channelName }} · <span translate="no">{{ row.phoneNumber }}</span>
                        </td>
                        <td>
                          {{ row.assignedAtUtc | date: 'medium' }} · {{ row.assignedBy || '—' }}
                        </td>
                        <td>
                          @if (row.endedAtUtc) {
                            {{ row.endedAtUtc | date: 'medium' }} · {{ row.endedBy || '—' }}
                          } @else {
                            {{ 'AutoReach::SharedAgents.Current' | abpLocalization }}
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3">
                          {{ 'AutoReach::SharedAgents.NoHistory' | abpLocalization }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </li>
        }
      </ul>
    </main>
    @if (editing(); as id) {
      <ar-voice-agent-dialog [channelId]="id" (close)="closeEditor()" />
    }
  `,
  styles: `
    .agents {
      padding: 16px;
      display: grid;
      gap: 16px;
    }
    .create {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: flex-end;
    }
    .create .ar-field {
      flex: 1 1 200px;
      min-width: 0;
    }
    .list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 12px;
    }
    .agent {
      background: var(--ar-surface-100);
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 12px 16px;
      min-width: 0;
    }
    .agent__head {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .agent__head h2 {
      font-size: 1.05em;
      margin: 0;
      overflow-wrap: anywhere;
    }
    .badge {
      font-size: 0.8em;
      border: 1px solid var(--ar-line-200);
      border-radius: 999px;
      padding: 1px 8px;
    }
    .badge--off {
      color: var(--ar-ink-500);
    }
    .numbers {
      margin: 8px 0;
      padding-inline-start: 20px;
      overflow-wrap: anywhere;
    }
    .link {
      background: none;
      border: 0;
      padding: 0 4px;
      color: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-top: 8px;
    }
    .assign {
      min-width: 0;
      flex: 0 1 260px;
    }
    .scroll {
      overflow-x: auto;
      margin-top: 8px;
    }
    .history {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    .history caption {
      text-align: start;
      font-weight: 600;
    }
    .history th,
    .history td {
      border-bottom: 1px solid var(--ar-line-200);
      padding: 4px 8px;
      text-align: start;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
})
export class ArVoiceAgents implements OnInit {
  private readonly api = inject(SharedVoiceAgentService);
  protected readonly agents = signal<SharedVoiceAgent[]>([]);
  protected readonly channels = signal<VoiceAgentChannel[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly newName = signal('');
  protected readonly copyFrom = signal('');
  protected readonly editing = signal<string | null>(null);
  protected readonly deleting = signal<string | null>(null);
  protected readonly historyFor = signal<string | null>(null);
  protected readonly history = signal<VoiceAgentAssignment[]>([]);

  /** Numbers that could move to this agent: every number not already on it. */
  protected readonly assignable = (agent: SharedVoiceAgent) =>
    this.channels().filter((c) => c.agentId !== agent.id);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const [agents, channels] = await Promise.all([
        firstValueFrom(this.api.list()),
        firstValueFrom(this.api.channels()),
      ]);
      this.agents.set(agents);
      this.channels.set(channels);
    } catch {
      this.error.set('AutoReach::SharedAgents.LoadFailed');
    } finally {
      this.loading.set(false);
    }
  }

  /** Runs a change, then reloads the list (assignments move numbers between agents). */
  private async change(action: () => Promise<unknown>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
      await this.load();
      if (this.historyFor()) await this.loadHistory(this.historyFor()!);
    } catch {
      this.error.set('AutoReach::SharedAgents.SaveFailed');
    } finally {
      this.busy.set(false);
    }
  }

  protected create(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return Promise.resolve();
    return this.change(async () => {
      const agent = await firstValueFrom(this.api.create(name, this.copyFrom() || null));
      this.newName.set('');
      this.copyFrom.set('');
      this.editing.set(agent.id);
    });
  }

  protected assign(agent: SharedVoiceAgent, select: HTMLSelectElement): void {
    const channelId = select.value;
    if (channelId) void this.change(() => firstValueFrom(this.api.assign(agent.id, channelId)));
  }

  protected unassign(channelId: string): Promise<void> {
    return this.change(() => firstValueFrom(this.api.unassign(channelId)));
  }

  protected remove(id: string): Promise<void> {
    return this.change(async () => {
      await firstValueFrom(this.api.delete(id));
      this.deleting.set(null);
      if (this.historyFor() === id) this.historyFor.set(null);
    });
  }

  protected async toggleHistory(id: string): Promise<void> {
    if (this.historyFor() === id) {
      this.historyFor.set(null);
      return;
    }
    this.historyFor.set(id);
    await this.loadHistory(id);
  }

  private async loadHistory(id: string): Promise<void> {
    try {
      this.history.set(await firstValueFrom(this.api.assignments(id)));
    } catch {
      this.history.set([]);
    }
  }

  protected closeEditor(): void {
    this.editing.set(null);
    void this.load();
  }
}
