import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ServiceTicketSettingsDto, TicketPriority } from '../../proxy/support';
import { ArButton, ArDialog } from '../../ui';
import { errorMessage } from '../activities/activity-logic';
import { PRIORITY_SLA_HOURS } from './ticket-logic';
import { ServiceTicketGateway } from './ticket-mock';

/**
 * How soon each priority is promised a response, and the customer-facing page that raises a ticket without anyone signing in.
 * Both live on one screen because they are the same decision — how the workspace wants to be found and held to a time.
 */
@Component({
  selector: 'ar-ticket-settings-dialog',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog title="Helpdesk settings" (dismiss)="closed.emit(changed())">
      @if (loading()) {
        <p class="ts__hint">Loading…</p>
      } @else {
        <section class="ts__section">
          <h2 class="ts__h">SLA — hours to respond, by priority</h2>
          <p class="ts__hint">
            A ticket's due time is set from this the moment it is raised or its priority changes.
          </p>
          <div class="ts__grid">
            <label class="ar-field" for="ts-urgent">
              <span class="ar-field__label">Urgent</span>
              <input
                id="ts-urgent"
                class="ar-field__input"
                type="number"
                min="1"
                max="720"
                [value]="urgentHours()"
                (input)="urgentHours.set(+$any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="ts-high">
              <span class="ar-field__label">High</span>
              <input
                id="ts-high"
                class="ar-field__input"
                type="number"
                min="1"
                max="720"
                [value]="highHours()"
                (input)="highHours.set(+$any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="ts-normal">
              <span class="ar-field__label">Normal</span>
              <input
                id="ts-normal"
                class="ar-field__input"
                type="number"
                min="1"
                max="720"
                [value]="normalHours()"
                (input)="normalHours.set(+$any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="ts-low">
              <span class="ar-field__label">Low</span>
              <input
                id="ts-low"
                class="ar-field__input"
                type="number"
                min="1"
                max="720"
                [value]="lowHours()"
                (input)="lowHours.set(+$any($event.target).value)"
              />
            </label>
          </div>
        </section>

        <section class="ts__section">
          <h2 class="ts__h">Public ticket portal</h2>
          <label class="ts__toggle">
            <input
              type="checkbox"
              [checked]="portalEnabled()"
              (change)="portalEnabled.set($any($event.target).checked)"
            />
            <span>Let customers raise a ticket themselves, with no sign-in</span>
          </label>
          @if (portalEnabled()) {
            <p class="ts__hint">
              Every ticket from this page is Normal priority and unassigned, the same as one written
              up by hand — nobody skips the queue by knowing the address.
            </p>
            @if (portalUrl(); as url) {
              <div class="ts__url">
                <input
                  class="ar-field__input ar-mono"
                  readonly
                  aria-label="Portal address"
                  [value]="url"
                  (focus)="$any($event.target).select()"
                />
                <button ar-button type="button" variant="ghost" (click)="copy(url)">
                  Copy link
                </button>
              </div>
            } @else {
              <p class="ts__hint">Its address is given once you save.</p>
            }
          }
        </section>

        @if (notice(); as msg) {
          <p class="ts__ok" role="status">{{ msg }}</p>
        }
        @if (error(); as msg) {
          <p class="ts__err" role="alert">{{ msg }}</p>
        }
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(changed())">
          Close
        </button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="loading() || saving() || !hoursValid()"
          (click)="save()"
        >
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .ts__hint {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .ts__section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .ts__h {
      margin: 0;
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .ts__grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .ts__toggle {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-800);
      cursor: pointer;
    }
    .ts__toggle input {
      margin-top: 2px;
      width: 16px;
      height: 16px;
      flex: none;
    }
    .ts__url {
      display: flex;
      gap: 8px;
    }
    .ts__url .ar-field__input {
      flex: 1;
    }
    .ts__ok {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-teal-100);
      color: var(--ar-teal-700);
      font: 500 12px var(--ar-font-sans);
    }
    .ts__err {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }

    @media (max-width: 480px) {
      .ts__grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `,
})
export class ArTicketSettingsDialog {
  private readonly api = inject(ServiceTicketGateway).api;

  /** Emitted on close: true if anything was saved, so the page behind can refresh the promise it shows for a new ticket. */
  readonly closed = output<boolean>();

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly changed = signal(false);

  protected readonly urgentHours = signal(PRIORITY_SLA_HOURS[TicketPriority.Urgent]);
  protected readonly highHours = signal(PRIORITY_SLA_HOURS[TicketPriority.High]);
  protected readonly normalHours = signal(PRIORITY_SLA_HOURS[TicketPriority.Normal]);
  protected readonly lowHours = signal(PRIORITY_SLA_HOURS[TicketPriority.Low]);
  protected readonly portalEnabled = signal(false);
  protected readonly portalUrl = signal<string | null>(null);

  protected readonly hoursValid = () =>
    [this.urgentHours(), this.highHours(), this.normalHours(), this.lowHours()].every(
      (h) => Number.isInteger(h) && h >= 1 && h <= 720,
    );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.apply(await firstValueFrom(this.api.getSettings()));
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'These settings could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  private apply(s: ServiceTicketSettingsDto): void {
    this.urgentHours.set(s.urgentHours);
    this.highHours.set(s.highHours);
    this.normalHours.set(s.normalHours);
    this.lowHours.set(s.lowHours);
    this.portalEnabled.set(s.portalEnabled);
    this.portalUrl.set(s.portalUrl ?? null);
  }

  protected async save(): Promise<void> {
    if (this.saving() || !this.hoursValid()) return;
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      this.apply(
        await firstValueFrom(
          this.api.setSettings({
            urgentHours: this.urgentHours(),
            highHours: this.highHours(),
            normalHours: this.normalHours(),
            lowHours: this.lowHours(),
            portalEnabled: this.portalEnabled(),
          }),
        ),
      );
      this.changed.set(true);
      this.notice.set('Saved.');
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'These settings could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async copy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.notice.set('Link copied.');
    } catch {
      this.error.set('Copying was blocked by the browser. Select the text and copy it.');
    }
  }
}
