import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { FieldServiceService, FieldVisitDto } from '../../proxy/support/field-service.service';
import { ArCard } from '../../ui/card';
import { ArChip } from '../../ui/chip';

/** How a visit's state reads to the office, and the chip tone for it. */
export function visitStatus(state: FieldVisitDto['state']): {
  label: string;
  tone: 'good' | 'warn' | 'neutral';
} {
  switch (state) {
    case 'SignedOff':
      return { label: 'Signed off', tone: 'good' };
    case 'AwaitingSignOff':
      return { label: 'Awaiting sign-off', tone: 'warn' };
    default:
      return { label: 'On site', tone: 'neutral' };
  }
}

/**
 * The engineers' site visits to this ticket, as the office sees them: notes, the checklist and the photos taken
 * on site. Photos need the signed-in session, so each is fetched once and shown from a local object URL.
 * Hidden when no one has visited.
 */
@Component({
  selector: 'ar-field-visits-card',
  imports: [ArCard, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './field-visits-card.html',
  styleUrl: './field-visits-card.scss',
})
export class ArFieldVisitsCard {
  private readonly api = inject(FieldServiceService);

  readonly ticketId = input.required<string>();

  protected readonly visits = signal<FieldVisitDto[]>([]);
  protected readonly failed = signal(false);
  /** Object URLs by photo id, filled as each photo arrives. */
  protected readonly photoUrls = signal<Record<string, string>>({});
  protected readonly status = visitStatus;

  private readonly made: string[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.made.forEach((u) => URL.revokeObjectURL(u)));
    effect(() => {
      const id = this.ticketId();
      if (id) void this.load(id);
    });
  }

  protected when(utc: string | null | undefined): string {
    return utc
      ? new Date(utc).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';
  }

  private async load(ticketId: string): Promise<void> {
    try {
      const visits = await firstValueFrom(
        this.api.getVisitsForTicket(ticketId, { skipHandleError: true }),
      );
      this.visits.set(visits ?? []);
      this.failed.set(false);
      for (const v of visits ?? []) {
        for (const p of v.photos) void this.loadPhoto(v.clientVisitId, p.id);
      }
    } catch {
      this.failed.set(true);
    }
  }

  private async loadPhoto(visitId: string, photoId: string): Promise<void> {
    try {
      const blob = await firstValueFrom(
        this.api.getPhoto(visitId, photoId, { skipHandleError: true }),
      );
      const url = URL.createObjectURL(blob);
      this.made.push(url);
      this.photoUrls.update((m) => ({ ...m, [photoId]: url }));
    } catch {
      // A photo that cannot be read is left as a placeholder; the rest still show.
    }
  }
}
