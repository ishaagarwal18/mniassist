import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { grantedPolicy } from '../../core/auth/permission';
import { Automation, WState, WorkflowStore } from '../../core/services/workflow.service';
import { ChannelService } from '../../core/services/channel.service';
import { PipelineStore } from '../../core/services/pipeline.service';
import { AutomationTriggerKind } from '../../proxy/messaging';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ChipTone } from '../../ui/chip';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArContactPicker } from '../pipeline/contact-picker';
import { PickerOption } from '../../core/services/pipeline.service';

const STATE_TONE: Record<WState, ChipTone> = { draft: 'neutral', active: 'good', paused: 'amber' };

/**
 * Automations (M07). The list plus activate/pause and the dry-run — the visual
 * node-graph builder is still to come, but a keyword or scheduled automation can be
 * managed and simulated from here today.
 */
@Component({
  selector: 'ar-automations',
  imports: [RouterLink, ArTopbar, ArButton, ArChip, ArDialog, ArSelect, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './automations.html',
  styleUrl: './automations.scss',
})
export class ArAutomations {
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(WorkflowStore);
  protected readonly channels = inject(ChannelService).channels;
  protected readonly pipelines = inject(PipelineStore).pipelines;

  protected readonly canCreate = grantedPolicy('AutoReach.Automations.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Automations.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Automations.Delete', this.permissions);
  protected readonly canActivate = grantedPolicy(
    'AutoReach.Automations.Activate',
    this.permissions,
  );

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
  /** For "enquiry stage changed": the pipeline and stage to wait for. Blank means any. */
  protected readonly newPipelineId = signal('');
  protected readonly newStageId = signal('');

  protected stagesOfNewPipeline() {
    const p = this.pipelines().find((x) => x.id === this.newPipelineId());
    return p?.stages ?? [];
  }

  protected openDialog(): void {
    this.newName.set('');
    this.newChannel.set(this.channels()[0]?.id ?? '');
    this.newTrigger.set(AutomationTriggerKind.InboundKeyword);
    this.newKeyword.set('');
    this.newPipelineId.set('');
    this.newStageId.set('');
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected async createAutomation(): Promise<void> {
    if (!this.newName().trim() || !this.newChannel()) {
      this.toasts.warning('Give the automation a name and pick a channel.', 'Automation');
      return;
    }
    if (this.newTrigger() === AutomationTriggerKind.InboundKeyword && !this.newKeyword().trim()) {
      this.toasts.warning('A keyword trigger needs at least one keyword.', 'Automation');
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
        this.newTrigger() === AutomationTriggerKind.EnquiryStageChanged
          ? {
              pipelineId: this.newPipelineId() || undefined,
              stageId: this.newStageId() || undefined,
            }
          : undefined,
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

  // ---- Dry-run: pick the contact to run it against -----------------------------------
  protected readonly dryRunFor = signal<Automation | null>(null);
  protected readonly dryRunContact = signal<PickerOption | null>(null);

  protected simulate(a: Automation): void {
    this.dryRunContact.set(null);
    this.dryRunFor.set(a);
  }

  protected async runDryRun(): Promise<void> {
    const a = this.dryRunFor();
    const contact = this.dryRunContact();
    if (!a || !contact) return;
    this.dryRunFor.set(null);
    this.busy.set(a.id);
    try {
      this.sim.set({ id: a.id, steps: await this.store.simulate(a.id, contact.id) });
    } catch {
      this.sim.set({ id: a.id, steps: ['Could not run the simulation.'] });
    } finally {
      this.busy.set(null);
    }
  }

  protected async deleteAutomation(a: Automation): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'automation',
        a.name,
        'This will permanently remove the automation and its steps.',
      ))
    ) {
      return;
    }
    this.busy.set(a.id);
    try {
      await this.store.deleteAutomation(a.id);
      this.toasts.success(`“${a.name}” deleted.`);
    } catch {
      this.toasts.error(`Could not delete “${a.name}”.`);
    } finally {
      this.busy.set(null);
    }
  }
}
