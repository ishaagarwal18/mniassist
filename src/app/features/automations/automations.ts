import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Automation, WState, WorkflowStore } from '../../core/services/workflow.service';
import { ChannelService } from '../../core/services/channel.service';
import { AutomationTriggerKind } from '../../proxy/messaging';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ChipTone } from '../../ui/chip';

const STATE_TONE: Record<WState, ChipTone> = { draft: 'neutral', active: 'good', paused: 'amber' };

/**
 * Automations (M07). The list plus activate/pause and the dry-run — the visual
 * node-graph builder is still to come, but a keyword or scheduled automation can be
 * managed and simulated from here today.
 */
@Component({
  selector: 'ar-automations',
  imports: [RouterLink, ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './automations.html',
  styleUrl: './automations.scss',
})
export class ArAutomations {
  private readonly store = inject(WorkflowStore);
  protected readonly channels = inject(ChannelService).channels;

  protected readonly automations = this.store.automations;
  protected readonly loading = this.store.loadingAutomations;
  protected readonly busy = signal<string | null>(null);
  protected readonly sim = signal<{ id: string; steps: string[] } | null>(null);

  // ---- New automation dialog ----------------------------------------
  protected readonly TK = AutomationTriggerKind;
  protected readonly triggers = [
    { value: AutomationTriggerKind.InboundKeyword, label: 'Inbound keyword' },
    { value: AutomationTriggerKind.ButtonReply, label: 'Button reply' },
    { value: AutomationTriggerKind.ContactCreated, label: 'Contact created' },
    { value: AutomationTriggerKind.AttributeChanged, label: 'Attribute changed' },
    { value: AutomationTriggerKind.EnquiryStageChanged, label: 'Enquiry stage changed' },
    { value: AutomationTriggerKind.ScheduledDate, label: 'Scheduled date' },
    { value: AutomationTriggerKind.FlowCompleted, label: 'Flow completed' },
    { value: AutomationTriggerKind.CampaignReply, label: 'Campaign reply' },
    { value: AutomationTriggerKind.SegmentEntered, label: 'Contact enters a segment (drip)' },
  ];
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly newName = signal('');
  protected readonly newChannel = signal('');
  protected readonly newTrigger = signal<AutomationTriggerKind>(
    AutomationTriggerKind.InboundKeyword,
  );
  protected readonly newKeyword = signal('');

  protected openDialog(): void {
    this.newName.set('');
    this.newChannel.set(this.channels()[0]?.id ?? '');
    this.newTrigger.set(AutomationTriggerKind.InboundKeyword);
    this.newKeyword.set('');
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected async createAutomation(): Promise<void> {
    if (!this.newName().trim() || !this.newChannel()) {
      window.alert('Give the automation a name and pick a channel.');
      return;
    }
    if (this.newTrigger() === AutomationTriggerKind.InboundKeyword && !this.newKeyword().trim()) {
      window.alert('A keyword trigger needs at least one keyword.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.createAutomation(
        this.newName(),
        this.newChannel(),
        this.newTrigger(),
        this.newKeyword(),
      );
      this.dialogOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The automation could not be created.');
    } finally {
      this.saving.set(false);
    }
  }

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
