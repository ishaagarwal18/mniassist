import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { FState, Flow, WorkflowStore } from '../../core/services/workflow.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

const STATE_TONE: Record<FState, ChipTone> = {
  draft: 'neutral',
  published: 'good',
  deprecated: 'warn',
  blocked: 'bad',
};

/**
 * WhatsApp Flows (M08). Publish / deprecate against Meta and see the version and
 * screen count. The in-chat form designer that produces the Flow JSON is still to
 * come; a flow with valid JSON can be published from here now.
 */
@Component({
  selector: 'ar-flows',
  imports: [ArTopbar, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flows.html',
  styleUrl: './flows.scss',
})
export class ArFlows {
  private readonly store = inject(WorkflowStore);

  protected readonly flows = this.store.flows;
  protected readonly loading = this.store.loadingFlows;
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected tone(s: FState): ChipTone {
    return STATE_TONE[s];
  }
  protected when(iso?: string): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';
  }

  protected async publish(f: Flow): Promise<void> {
    this.busy.set(f.id);
    this.error.set(null);
    try {
      await this.store.publishFlow(f.id);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Meta rejected the flow.');
    } finally {
      this.busy.set(null);
    }
  }

  protected async deprecate(f: Flow): Promise<void> {
    if (
      !window.confirm(
        `Deprecate "${f.name}"? It stays live for in-flight sessions but cannot be sent again.`,
      )
    )
      return;
    this.busy.set(f.id);
    try {
      await this.store.deprecateFlow(f.id);
    } finally {
      this.busy.set(null);
    }
  }
}
