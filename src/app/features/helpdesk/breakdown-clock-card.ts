import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BreakdownClockDto, BreakdownClockService } from '../../proxy/support/escalation.service';
import { ArCard } from '../../ui';
import { environment } from '../../../environments/environment';
import { ACTION_FIELDS, CONDITION_TEXT, duration, hasAction } from './escalation.logic';

/**
 * A breakdown ticket's downtime clock: how long the machine has been down (business time, not counting time waiting for the customer),
 * which policy it follows, and each escalation step: fired, already met, or still to come.
 */
@Component({
  selector: 'ar-breakdown-clock-card',
  imports: [ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './breakdown-clock-card.html',
  styleUrl: './breakdown-clock-card.scss',
})
export class ArBreakdownClockCard {
  readonly ticketId = input.required<string>();
  /** Bumped by the page after a change (status, assignment), so the clock is read again. */
  readonly version = input(0);

  private readonly api = inject(BreakdownClockService);
  protected readonly clock = signal<BreakdownClockDto | null>(null);
  protected readonly duration = duration;
  protected readonly CONDITION_TEXT = CONDITION_TEXT;

  constructor() {
    effect(() => {
      const id = this.ticketId();
      this.version();
      if (environment.useMockData) return;
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    try {
      this.clock.set(await firstValueFrom(this.api.get(id)));
    } catch {
      this.clock.set(null);
    }
  }

  protected actionsText(actions: number): string {
    return ACTION_FIELDS.filter((a) => hasAction(actions, a.flag))
      .map((a) => a.label)
      .join(', ');
  }
}
