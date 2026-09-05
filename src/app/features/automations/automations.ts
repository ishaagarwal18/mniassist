import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { Automation, WState, WorkflowStore } from '../../core/services/workflow.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

const STATE_TONE: Record<WState, ChipTone> = { draft: 'neutral', active: 'good', paused: 'amber' };

/**
 * Automations (M07). The list plus activate/pause and the dry-run — the visual
 * node-graph builder is still to come, but a keyword or scheduled automation can be
 * managed and simulated from here today.
 */
@Component({
  selector: 'ar-automations',
  imports: [ArTopbar, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './automations.html',
  styleUrl: './automations.scss',
})
export class ArAutomations {
  private readonly store = inject(WorkflowStore);

  protected readonly automations = this.store.automations;
  protected readonly loading = this.store.loadingAutomations;
  protected readonly busy = signal<string | null>(null);
  protected readonly sim = signal<{ id: string; steps: string[] } | null>(null);

  protected tone(s: WState): ChipTone {
    return STATE_TONE[s];
  }
  protected pct(n: number): string {
    return `${(n * 100).toFixed(0)}%`;
  }
  protected when(iso?: string): string {
    return iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'never run';
  }

  protected async toggle(a: Automation): Promise<void> {
    this.busy.set(a.id);
    try {
      await this.store.setAutomationActive(a.id, a.state !== 'active');
    } finally {
      this.busy.set(null);
    }
  }

  protected async simulate(a: Automation): Promise<void> {
    const contactId = window.prompt('Contact id to dry-run against:')?.trim();
    if (!contactId) return;
    this.busy.set(a.id);
    try {
      this.sim.set({ id: a.id, steps: await this.store.simulate(a.id, contactId) });
    } catch {
      this.sim.set({ id: a.id, steps: ['Could not run the simulation.'] });
    } finally {
      this.busy.set(null);
    }
  }
}
