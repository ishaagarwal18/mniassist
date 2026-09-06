import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { FState, Flow, WorkflowStore } from '../../core/services/workflow.service';
import { ChannelService } from '../../core/services/channel.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
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
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flows.html',
  styleUrl: './flows.scss',
})
export class ArFlows {
  private readonly store = inject(WorkflowStore);
  protected readonly channels = inject(ChannelService).channels;

  protected readonly flows = this.store.flows;
  protected readonly loading = this.store.loadingFlows;
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  // ---- New flow dialog ------------------------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly newName = signal('');
  protected readonly newChannel = signal('');

  protected openDialog(): void {
    this.newName.set('');
    this.newChannel.set(this.channels()[0]?.id ?? '');
    this.dialogOpen.set(true);
  }

  protected async createFlow(): Promise<void> {
    if (!this.newName().trim() || !this.newChannel()) {
      window.alert('Give the flow a name and pick a channel.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.createFlow(this.newName(), this.newChannel());
      this.dialogOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The flow could not be created.');
    } finally {
      this.saving.set(false);
    }
  }

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
