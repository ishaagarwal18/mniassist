import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { FState, Flow, WorkflowStore } from '../../core/services/workflow.service';
import { ChannelService } from '../../core/services/channel.service';
import { FlowFunnelDto, FlowService } from '../../proxy/flows';
import { environment } from '../../../environments/environment';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ChipTone } from '../../ui/chip';

const SEED_FUNNEL: FlowFunnelDto = {
  flowName: 'RFQ intake',
  started: 214,
  completed: 138,
  completionRate: 0.645,
  screens: [
    {
      screenId: 'APPLICATION',
      title: 'Application',
      order: 0,
      enteredCount: 214,
      completedCount: 190,
      dropOffRate: 0.112,
    },
    {
      screenId: 'COMMERCIAL',
      title: 'Commercial',
      order: 1,
      enteredCount: 190,
      completedCount: 150,
      dropOffRate: 0.211,
    },
    {
      screenId: 'SUMMARY',
      title: 'Summary',
      order: 2,
      enteredCount: 150,
      completedCount: 138,
      dropOffRate: 0.08,
    },
  ],
};

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
  private readonly flowApi = inject(FlowService);
  protected readonly channels = inject(ChannelService).channels;

  // ---- Funnel (M08-5) -----------------------------------------------
  protected readonly funnelOpen = signal(false);
  protected readonly funnel = signal<FlowFunnelDto | null>(null);
  protected readonly funnelName = signal('');

  protected async openFunnel(f: Flow): Promise<void> {
    this.funnelName.set(f.name);
    this.funnel.set(null);
    this.funnelOpen.set(true);
    this.funnel.set(
      environment.useMockData ? SEED_FUNNEL : await firstValueFrom(this.flowApi.getFunnel(f.id)),
    );
  }

  protected pct(fraction?: number): string {
    return `${Math.round((fraction ?? 0) * 100)}%`;
  }

  protected barWidth(entered?: number, started?: number): string {
    if (!started) return '0%';
    return `${Math.max(4, Math.round(((entered ?? 0) / started) * 100))}%`;
  }

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
