import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { GrowthService } from '../../core/services/growth.service';
import { ManagedNumber } from '../../core/models/growth.model';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip } from '../../ui';

/**
 * Number registration, two-step PIN and display name.
 *
 * Everything on this screen is owned by Meta, not by us, and the design says so
 * rather than pretending otherwise. A display name change is a request under review,
 * so the live name and the pending one are shown side by side until Meta decides. A
 * PIN is set here and never shown again — there is no screen that needs to read it
 * back, and every log that might capture it is a liability.
 */
@Component({
  selector: 'ar-numbers',
  imports: [ArTopbar, ArBanner, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './numbers.html',
  styleUrl: './numbers.scss',
})
export class ArNumbers {
  private readonly growth = inject(GrowthService);

  protected readonly numbers = this.growth.numbers;

  /** Which card has its name editor open. One at a time — this is not a bulk edit. */
  protected readonly editingName = signal<string | null>(null);
  protected readonly editingPin = signal<string | null>(null);
  protected readonly draftName = signal('');

  protected readonly subtitle = computed(() => {
    const list = this.numbers();
    const unregistered = list.filter((n) => !n.isRegistered).length;
    if (unregistered > 0) {
      return `${unregistered} number${unregistered === 1 ? '' : 's'} not yet registered`;
    }
    return `${list.length} number${list.length === 1 ? '' : 's'} connected`;
  });

  protected startNameEdit(n: ManagedNumber): void {
    this.draftName.set(n.requestedName ?? n.verifiedName);
    this.editingName.set(n.channelId);
  }

  protected submitName(channelId: string): void {
    const name = this.draftName().trim();
    if (name.length >= 2) {
      this.growth.requestName(channelId, name);
    }
    this.editingName.set(null);
  }

  protected setPin(channelId: string): void {
    this.growth.setPin(channelId);
    this.editingPin.set(null);
  }

  protected qualityTone(q: ManagedNumber['quality']): 'good' | 'warn' | 'bad' | 'neutral' {
    return q === 'green' ? 'good' : q === 'yellow' ? 'warn' : q === 'red' ? 'bad' : 'neutral';
  }

  protected reviewTone(state: ManagedNumber['nameReviewState']): 'good' | 'amber' | 'bad' {
    return state === 'approved' ? 'good' : state === 'pending' ? 'amber' : 'bad';
  }

  protected when(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected age(iso?: string): string {
    if (!iso) return 'never set';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days === 0) return 'set today';
    if (days < 30) return `set ${days} day${days === 1 ? '' : 's'} ago`;
    return `set ${Math.round(days / 30)} month${Math.round(days / 30) === 1 ? '' : 's'} ago`;
  }
}
