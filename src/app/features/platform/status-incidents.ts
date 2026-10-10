import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  PlatformStatusService,
  StatusComponents,
  StatusImpact,
  type StatusIncidentDto,
} from '../../proxy/platform/platform-status.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import {
  COMPONENTS,
  componentNames,
  impactLabel,
  istTime,
  toggleComponent,
} from '../status/status.logic';

interface Draft {
  id: string | null;
  title: string;
  impact: StatusImpact;
  components: StatusComponents;
  message: string;
  /** datetime-local values, in the browser's time. */
  starts: string;
  plannedEnd: string;
}

function localInput(utc?: string | null): string {
  if (!utc) return '';
  const d = new Date(utc);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/**
 * Posting to the public status page (T-19): open an incident, keep its message current,
 * resolve it, or plan maintenance. What is posted here is what every customer reads at
 * /status, so it says what is affected and what to do — not what broke inside.
 */
@Component({
  selector: 'ar-status-incidents',
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Status page"
      subtitle="Incidents and maintenance customers see at /status"
      help="Post an incident as soon as customers are affected, update it at least every hour, and resolve it with what happened."
    >
      <a ar-button variant="ghost" href="/status" target="_blank" rel="noopener"
        >Open status page</a
      >
      <button ar-button variant="primary" icon="plus" (click)="openNew()">New incident</button>
    </ar-topbar>

    <div class="si ar-scroll">
      @for (i of incidents(); track i.id) {
        <article class="si__row" [class.si__row--done]="!!i.resolvedAtUtc">
          <div class="si__main">
            <h2>{{ i.title }}</h2>
            <p class="si__msg">{{ i.message }}</p>
            <p class="si__meta">
              {{ parts(i) }} · from {{ time(i.startsAtUtc) }}
              @if (i.resolvedAtUtc) {
                · resolved {{ time(i.resolvedAtUtc) }}
              }
            </p>
          </div>
          <ar-chip
            [tone]="
              i.resolvedAtUtc
                ? 'neutral'
                : i.impact === 2
                  ? 'bad'
                  : i.impact === 1
                    ? 'warn'
                    : 'teal'
            "
          >
            {{ i.resolvedAtUtc ? 'Resolved' : impact(i.impact) }}
          </ar-chip>
          <div class="si__act">
            @if (!i.resolvedAtUtc) {
              <button ar-button variant="ghost" (click)="openEdit(i)">Update</button>
              <button ar-button variant="ghost" (click)="resolve(i)">Resolve</button>
            }
            <button ar-button variant="ghost" (click)="remove(i)">Delete</button>
          </div>
        </article>
      } @empty {
        <p class="si__empty">Nothing posted. The status page shows all systems operational.</p>
      }
    </div>

    @if (draft(); as d) {
      <ar-dialog
        [title]="d.id ? 'Update incident' : 'New incident'"
        width="min(560px, calc(100vw - 32px))"
        (dismiss)="draft.set(null)"
      >
        <form class="si__form" (submit)="$event.preventDefault(); save()">
          <label class="ar-field">
            <span class="ar-field__label">Title</span>
            <input
              class="ar-field__input"
              required
              maxlength="160"
              placeholder="WhatsApp messages delayed"
              [value]="d.title"
              (input)="patch({ title: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Impact</span>
            <select
              class="ar-field__input"
              [value]="d.impact"
              (change)="patch({ impact: +$any($event.target).value })"
            >
              <option [value]="1">Minor — slower or failing for some</option>
              <option [value]="2">Major — down for most</option>
              <option [value]="0">Planned maintenance</option>
            </select>
          </label>
          <fieldset class="si__parts">
            <legend class="ar-field__label">Affected</legend>
            @for (c of components; track c.value) {
              <label>
                <input
                  type="checkbox"
                  [checked]="has(d.components, c.value)"
                  (change)="patch({ components: toggle(d.components, c.value) })"
                />
                {{ c.label }}
              </label>
            }
          </fieldset>
          <label class="ar-field">
            <span class="ar-field__label">Message to customers</span>
            <textarea
              class="ar-field__input"
              rows="4"
              required
              maxlength="2000"
              placeholder="What is affected, what to do meanwhile, when we will update next."
              [value]="d.message"
              (input)="patch({ message: $any($event.target).value })"
            ></textarea>
          </label>
          <div class="si__when">
            <label class="ar-field">
              <span class="ar-field__label">{{ d.impact === 0 ? 'Starts' : 'Started' }}</span>
              <input
                class="ar-field__input"
                type="datetime-local"
                [value]="d.starts"
                (input)="patch({ starts: $any($event.target).value })"
              />
            </label>
            @if (d.impact === 0) {
              <label class="ar-field">
                <span class="ar-field__label">Planned end</span>
                <input
                  class="ar-field__input"
                  type="datetime-local"
                  [value]="d.plannedEnd"
                  (input)="patch({ plannedEnd: $any($event.target).value })"
                />
              </label>
            }
          </div>
          @if (error(); as e) {
            <p class="si__error">{{ e }}</p>
          }
        </form>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="draft.set(null)">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !d.title.trim() || !d.message.trim() || !d.components"
            (click)="save()"
          >
            {{ d.id ? 'Post update' : 'Post' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    .si {
      display: grid;
      gap: 10px;
      padding: 16px 24px 32px;
      align-content: start;
    }
    .si__row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px 14px;
      padding: 14px 16px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      background: var(--ar-white);
    }
    .si__row--done {
      opacity: 0.75;
    }
    .si__main {
      min-width: 0;
    }
    .si__main h2 {
      margin: 0 0 4px;
      font: 600 14px var(--ar-font-sans);
    }
    .si__msg {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      white-space: pre-line;
    }
    .si__meta,
    .si__empty {
      margin: 4px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .si__act {
      grid-column: 1 / -1;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .si__form {
      display: grid;
      gap: 12px;
    }
    .si__parts {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      border: 0;
      font: 400 13px var(--ar-font-sans);
    }
    .si__when {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    .si__error {
      margin: 0;
      color: var(--ar-red-600);
      font: 400 13px var(--ar-font-sans);
    }
  `,
})
export class ArStatusIncidents {
  private readonly api = inject(PlatformStatusService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  protected readonly components = COMPONENTS;
  protected readonly impact = impactLabel;
  protected readonly time = istTime;
  protected readonly toggle = toggleComponent;

  private readonly tick = signal(0);
  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { t: this.tick() }),
    stream: () => this.api.getIncidents({ skipCount: 0, maxResultCount: 100 }),
    defaultValue: { items: [] as StatusIncidentDto[], totalCount: 0 },
  });
  protected readonly incidents = computed(() => this.resource.value()?.items ?? []);

  protected readonly draft = signal<Draft | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected has(flags: StatusComponents, c: StatusComponents): boolean {
    return (flags & c) === c;
  }

  protected parts(i: StatusIncidentDto): string {
    return componentNames(i.components).join(', ');
  }

  protected patch(p: Partial<Draft>): void {
    const d = this.draft();
    if (d) this.draft.set({ ...d, ...p });
  }

  protected openNew(): void {
    this.error.set(null);
    this.draft.set({
      id: null,
      title: '',
      impact: StatusImpact.Minor,
      components: StatusComponents.None,
      message: '',
      starts: localInput(new Date().toISOString()),
      plannedEnd: '',
    });
  }

  protected openEdit(i: StatusIncidentDto): void {
    this.error.set(null);
    this.draft.set({
      id: i.id,
      title: i.title,
      impact: i.impact,
      components: i.components,
      message: i.message,
      starts: localInput(i.startsAtUtc),
      plannedEnd: localInput(i.plannedEndUtc),
    });
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d) return;
    this.busy.set(true);
    this.error.set(null);
    const input = {
      title: d.title.trim(),
      impact: d.impact,
      components: d.components,
      message: d.message.trim(),
      startsAtUtc: d.starts ? new Date(d.starts).toISOString() : null,
      plannedEndUtc:
        d.impact === StatusImpact.Maintenance && d.plannedEnd
          ? new Date(d.plannedEnd).toISOString()
          : null,
    };
    try {
      await firstValueFrom(d.id ? this.api.update(d.id, input) : this.api.create(input));
      this.toasts.success(d.id ? 'Update posted.' : 'Posted to the status page.');
      this.draft.set(null);
      this.tick.update((n) => n + 1);
    } catch (e) {
      this.error.set(readApiError(e, 'Could not post it.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async resolve(i: StatusIncidentDto): Promise<void> {
    const answer = await this.dialogs.prompt({
      title: `Resolve “${i.title}”?`,
      message: 'Say what happened and whether customers need to do anything.',
      confirmText: 'Resolve',
      fields: [
        {
          key: 'message',
          label: 'Closing message',
          value: 'This is resolved. Everything is working normally.',
          multiline: true,
          required: true,
        },
      ],
    });
    const message = answer?.['message']?.trim();
    if (!message) return;
    try {
      await firstValueFrom(this.api.resolve(i.id, message));
      this.toasts.success('Resolved.');
      this.tick.update((n) => n + 1);
    } catch (e) {
      this.toasts.error(readApiError(e, 'Could not resolve it.'));
    }
  }

  protected async remove(i: StatusIncidentDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Delete “${i.title}”?`,
        message:
          'It disappears from the status page history. Resolve it instead if it really happened.',
        confirmText: 'Delete',
        tone: 'danger',
      }))
    )
      return;
    await firstValueFrom(this.api.delete(i.id));
    this.tick.update((n) => n + 1);
  }
}
