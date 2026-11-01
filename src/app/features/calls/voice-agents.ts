import { LocalizationPipe } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ArTopbar } from '../../layout/topbar';
import { ArButton } from '../../ui/button';
import { ArChip } from '../../ui/chip';
import { ArIcon } from '../../ui/icon';
import { ArStatTile } from '../../ui/stat-tile';
import {
  SharedVoiceAgent,
  SharedVoiceAgentService,
  VoiceAgentAssignment,
  VoiceAgentChannel,
} from '../channels/shared-voice-agent.service';
import { ArVoiceAgentDialog } from '../channels/voice-agent-dialog';
import { ArVoiceFunctions } from './voice-functions';

/**
 * Voice agents of the workspace rather than of one number. Each is edited, tested, published and versioned in the same window as a
 * number's own agent, and answers and places AI calls on every number assigned to it. Unassigning a number, or deleting the agent,
 * puts the number back on its own agent; the history of assignments is kept.
 */
@Component({
  selector: 'ar-voice-agents',
  imports: [
    FormsModule,
    DatePipe,
    LocalizationPipe,
    ArTopbar,
    ArButton,
    ArChip,
    ArIcon,
    ArStatTile,
    ArVoiceAgentDialog,
    ArVoiceFunctions,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="'AutoReach::SharedAgents.Title' | abpLocalization"
      [help]="'AutoReach::SharedAgents.Help' | abpLocalization"
    />
    <main class="agents">
      <!-- Executive KPI Cards -->
      <section class="agents__kpis" aria-label="Voice Agents Overview">
        <ar-stat-tile
          label="Total Voice Agents"
          [value]="stats().total"
          note="Configured workspace agents"
        />
        <ar-stat-tile
          label="Published & Live"
          [value]="stats().published"
          tone="good"
          note="Actively handling calls"
        />
        <ar-stat-tile
          label="Pending Updates"
          [value]="stats().withUnpublished"
          tone="amber"
          note="Unpublished draft changes"
        />
        <ar-stat-tile
          label="Assigned Lines"
          [value]="stats().assignedNumbers"
          tone="teal"
          note="Connected inbound/outbound numbers"
        />
      </section>

      <!-- Create Agent Card -->
      <section class="agents__create-card">
        <div class="create-card__header">
          <div class="create-card__title">
            <ar-icon name="plus" class="create-card__icon" />
            <h3>Create Shared Voice Agent</h3>
          </div>
          <p class="create-card__desc">{{ 'AutoReach::SharedAgents.Intro' | abpLocalization }}</p>
        </div>

        @if (error()) {
          <div class="agents__alert" role="alert">
            <ar-icon name="alert" />
            <span>{{ error() | abpLocalization }}</span>
          </div>
        }

        <form class="create-form create" (submit)="$event.preventDefault(); create()">
          <label class="ar-field">
            <span class="ar-field__label">{{ 'AutoReach::SharedAgents.Name' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              name="name"
              maxlength="100"
              placeholder="e.g. Inbound Support Tier 1"
              [ngModel]="newName()"
              (ngModelChange)="newName.set($event)"
              [disabled]="busy()"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">{{ 'AutoReach::SharedAgents.CopyFrom' | abpLocalization }}</span>
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
            </select>
          </label>
          <div class="create-form__actions">
            <button ar-button type="submit" variant="primary" [disabled]="busy() || !newName().trim()">
              {{ 'AutoReach::SharedAgents.Create' | abpLocalization }}
            </button>
          </div>
        </form>
      </section>

      <!-- Agents List -->
      <section class="agents__directory" aria-label="Configured Voice Agents">
        <div class="directory__head">
          <div class="directory__title">Configured Agents ({{ agents().length }})</div>
        </div>

        @if (loading()) {
          <div class="agents__state" role="status">
            <span>{{ 'AutoReach::VoiceAgent.Loading' | abpLocalization }}</span>
          </div>
        } @else if (!agents().length) {
          <div class="agents__state empty">
            <p>{{ 'AutoReach::SharedAgents.Empty' | abpLocalization }}</p>
          </div>
        }

        <div class="agents__grid">
          @for (agent of agents(); track agent.id) {
            <article class="agent-card">
              <header class="agent-card__header">
                <div class="agent-card__info">
                  <div class="agent-card__badge-row">
                    <span class="agent-card__type">
                      {{ 'AutoReach::VoiceAgent.Type.' + agent.type | abpLocalization }}
                    </span>
                    @if (agent.isPublished) {
                      <ar-chip tone="good" [dot]="true">{{ 'AutoReach::SharedAgents.Published' | abpLocalization }}</ar-chip>
                    } @else {
                      <ar-chip tone="neutral">{{ 'AutoReach::SharedAgents.NotPublished' | abpLocalization }}</ar-chip>
                    }
                    @if (agent.hasUnpublishedChanges) {
                      <ar-chip tone="amber">{{ 'AutoReach::SharedAgents.Unpublished' | abpLocalization }}</ar-chip>
                    }
                  </div>
                  <h2 class="agent-card__name">{{ agent.name }}</h2>
                </div>
              </header>

              <div class="agent-card__body">
                <div class="agent-card__section-label">
                  <ar-icon name="phone" class="icon-sm" />
                  <span>{{ 'AutoReach::SharedAgents.Numbers' | abpLocalization }} ({{ agent.numbers.length }})</span>
                </div>

                @if (agent.numbers.length) {
                  <ul class="agent-card__number-list numbers" [attr.aria-label]="'AutoReach::SharedAgents.Numbers' | abpLocalization">
                    @for (number of agent.numbers; track number.channelId) {
                      <li class="number-tag">
                        <span class="number-tag__name">{{ number.name }}</span>
                        <span class="number-tag__phone" translate="no">{{ number.phoneNumber }}</span>
                        <button
                          type="button"
                          class="number-tag__remove link"
                          [attr.aria-label]="'AutoReach::SharedAgents.Unassign' | abpLocalization"
                          [disabled]="busy()"
                          (click)="unassign(number.channelId)"
                          title="Unassign number"
                        >
                          {{ 'AutoReach::SharedAgents.Unassign' | abpLocalization }}
                        </button>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="agent-card__empty-numbers">{{ 'AutoReach::SharedAgents.NoNumbers' | abpLocalization }}</p>
                }

                @if (!agent.isPublished && agent.numbers.length) {
                  <div class="agent-card__warning" role="alert">
                    <ar-icon name="alert" />
                    <span>{{ 'AutoReach::SharedAgents.NotAnswering' | abpLocalization }}</span>
                  </div>
                }
              </div>

              <footer class="agent-card__footer">
                <div class="agent-card__actions">
                  <button ar-button type="button" variant="primary" (click)="editing.set(agent.id)">
                    {{ 'AutoReach::SharedAgents.Edit' | abpLocalization }}
                  </button>
                  <label class="assign-select assign">
                    <span class="sr-only">{{ 'AutoReach::SharedAgents.AssignTo' | abpLocalization }}</span>
                    <select
                      class="ar-field__input assign-select__input"
                      [attr.aria-label]="'AutoReach::SharedAgents.AssignTo' | abpLocalization"
                      [disabled]="busy()"
                      (change)="assign(agent, $any($event.target)); $any($event.target).value = ''"
                    >
                      <option value="">+ {{ 'AutoReach::SharedAgents.AssignTo' | abpLocalization }}</option>
                      @for (number of assignable(agent); track number.channelId) {
                        <option [value]="number.channelId">
                          {{ number.name }} · {{ number.phoneNumber }}
                          @if (number.agentName) {
                            ({{ 'AutoReach::SharedAgents.MovesFrom' | abpLocalization }} {{ number.agentName }})
                          }
                        </option>
                      }
                    </select>
                  </label>
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
                  <div class="agent-card__confirm-delete" role="alert">
                    <span>{{ 'AutoReach::SharedAgents.ConfirmDelete' | abpLocalization }}</span>
                    <div class="confirm-actions">
                      <button ar-button type="button" variant="danger" [disabled]="busy()" (click)="remove(agent.id)">
                        {{ 'AutoReach::SharedAgents.Delete' | abpLocalization }}
                      </button>
                      <button ar-button type="button" variant="ghost" (click)="deleting.set(null)">
                        {{ 'AutoReach::VoiceAgent.History.cancel' | abpLocalization }}
                      </button>
                    </div>
                  </div>
                }

                @if (historyFor() === agent.id) {
                  <div class="agent-card__history-pane">
                    <div class="ar-table-responsive" tabindex="0" role="region" [attr.aria-label]="'AutoReach::SharedAgents.History' | abpLocalization">
                      <table class="ar-table history">
                        <caption class="sr-only">{{ 'AutoReach::SharedAgents.History' | abpLocalization }}</caption>
                        <thead>
                          <tr>
                            <th scope="col">{{ 'AutoReach::SharedAgents.Number' | abpLocalization }}</th>
                            <th scope="col">{{ 'AutoReach::SharedAgents.Assigned' | abpLocalization }}</th>
                            <th scope="col">{{ 'AutoReach::SharedAgents.Ended' | abpLocalization }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of history(); track $index) {
                            <tr>
                              <td class="font-medium">
                                {{ row.channelName }} · <span translate="no">{{ row.phoneNumber }}</span>
                              </td>
                              <td>
                                {{ row.assignedAtUtc | date: 'medium' }} <span class="text-muted">· {{ row.assignedBy || '—' }}</span>
                              </td>
                              <td>
                                @if (row.endedAtUtc) {
                                  {{ row.endedAtUtc | date: 'medium' }} <span class="text-muted">· {{ row.endedBy || '—' }}</span>
                                } @else {
                                  {{ 'AutoReach::SharedAgents.Current' | abpLocalization }}
                                }
                              </td>
                            </tr>
                          } @empty {
                            <tr>
                              <td colspan="3" class="text-center text-muted">
                                {{ 'AutoReach::SharedAgents.NoHistory' | abpLocalization }}
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }
              </footer>
            </article>
          }
        </div>
      </section>

      <ar-voice-functions />
    </main>
    @if (editing(); as id) {
      <ar-voice-agent-dialog [channelId]="id" (close)="closeEditor()" />
    }
  `,
  styles: `
    .agents {
      padding: 24px 32px;
      display: grid;
      gap: 24px;
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .agents__kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .agents__create-card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 20px 24px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
    }

    .create-card__header {
      margin-bottom: 16px;
    }

    .create-card__title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .create-card__title h3 {
      font: 600 1.05rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
    }

    .create-card__desc {
      margin: 4px 0 0;
      color: var(--ar-ink-500);
      font-size: 0.875rem;
    }

    .agents__alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 6px;
      color: #b42318;
      font-size: 0.875rem;
      margin-bottom: 16px;
    }

    .create-form {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: flex-end;
    }

    .create-form .ar-field {
      flex: 1 1 240px;
      min-width: 0;
    }

    .create-form__actions {
      padding-bottom: 2px;
    }

    .directory__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .directory__title {
      font: 600 1.15rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
    }

    .agents__state {
      padding: 32px;
      text-align: center;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      color: var(--ar-ink-500);
      font-size: 0.95rem;
    }

    .agents__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
    }

    .agent-card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .agent-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: var(--ar-line-300);
    }

    .agent-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .agent-card__badge-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .agent-card__type {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ar-ink-500);
      background: var(--ar-bg-100);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .agent-card__name {
      font: 600 1.15rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
      overflow-wrap: anywhere;
    }

    .agent-card__body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .agent-card__section-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .agent-card__number-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .number-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 0.82rem;
      color: var(--ar-ink-700);
    }

    .number-tag__name {
      font-weight: 500;
    }

    .number-tag__phone {
      font-family: var(--ar-font-mono, monospace);
      font-size: 0.78rem;
      color: var(--ar-ink-500);
    }

    .number-tag__remove {
      background: transparent;
      border: none;
      font-size: 1rem;
      line-height: 1;
      padding: 0 2px;
      color: var(--ar-ink-400);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
    }

    .number-tag__remove:hover {
      background: #fee4e2;
      color: #b42318;
    }

    .agent-card__empty-numbers {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ar-ink-400);
      font-style: italic;
    }

    .agent-card__warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #fef6ee;
      border: 1px solid #f9dbaf;
      border-radius: 6px;
      color: #b54708;
      font-size: 0.8rem;
    }

    .agent-card__footer {
      border-top: 1px solid var(--ar-line-200);
      padding-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .agent-card__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .assign-select {
      flex: 1 1 160px;
      min-width: 0;
      margin: 0;
    }

    .assign-select__input {
      font-size: 0.82rem;
      padding: 5px 8px;
      height: 32px;
      border-radius: 6px;
    }

    .agent-card__confirm-delete {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 6px;
      padding: 8px 12px;
      color: #b42318;
      font-size: 0.85rem;
    }

    .confirm-actions {
      display: flex;
      gap: 6px;
    }

    .agent-card__history-pane {
      margin-top: 8px;
    }

    .ar-table-responsive {
      overflow-x: auto;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      max-height: 240px;
    }

    .ar-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;

      thead th {
        position: sticky;
        top: 0;
        background: var(--ar-bg-50);
        color: var(--ar-ink-700);
        font-weight: 600;
        text-align: start;
        padding: 6px 10px;
        border-bottom: 1px solid var(--ar-line-200);
        white-space: nowrap;
        z-index: 1;
      }

      tbody td {
        padding: 6px 10px;
        border-bottom: 1px solid var(--ar-line-200);
        color: var(--ar-ink-900);
      }
    }

    .font-medium {
      font-weight: 500;
    }

    .text-muted {
      color: var(--ar-ink-400);
    }

    .text-center {
      text-align: center;
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

  protected readonly stats = computed(() => {
    const list = this.agents();
    const total = list.length;
    const published = list.filter((a) => a.isPublished).length;
    const withUnpublished = list.filter((a) => a.hasUnpublishedChanges).length;
    const assignedNumbers = list.reduce((sum, a) => sum + (a.numbers?.length || 0), 0);
    return { total, published, withUnpublished, assignedNumbers };
  });

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
