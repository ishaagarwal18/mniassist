import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { grantedPolicy } from '../../core/auth/permission';
import { PipelineStore } from '../../core/services/pipeline.service';
import { EnquiryStage, PipelineStageDto, SalesPipelineDto } from '../../proxy/pipeline';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ArLeadRotationPanel } from './lead-rotation-panel';

/** What an open stage can count as. Won and Lost are built in and fixed. */
const BUCKETS: { value: EnquiryStage; label: string; hint: string }[] = [
  { value: EnquiryStage.New, label: 'New', hint: 'A fresh enquiry' },
  { value: EnquiryStage.Qualified, label: 'Qualified', hint: 'Confirmed as real' },
  { value: EnquiryStage.SiteVisit, label: 'Site visit', hint: 'Being surveyed or scoped' },
  { value: EnquiryStage.Quoted, label: 'Quoted', hint: 'A price has gone out' },
  { value: EnquiryStage.Negotiation, label: 'Negotiation', hint: 'Close to a decision' },
];

type Dialog =
  | { kind: 'pipeline' }
  | { kind: 'rename-pipeline'; pipeline: SalesPipelineDto }
  | { kind: 'delete-pipeline'; pipeline: SalesPipelineDto }
  | { kind: 'stage'; stage: PipelineStageDto | null }
  | { kind: 'delete-stage'; stage: PipelineStageDto };

/**
 * Pipelines and their stages. A workspace can run several sales processes, each with its own stages. Every
 * stage says which of the built-in seven it counts as, because scoring, reports, CRM sync and automations
 * all read that; Won and Lost are always present, always last, and can be renamed but nothing else.
 */
@Component({
  selector: 'ar-pipeline-stages',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArLeadRotationPanel, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pipeline-stages.html',
  styleUrl: './pipeline-stages.scss',
})
export class ArPipelineStages {
  private readonly permissions = inject(PermissionService);
  private readonly store = inject(PipelineStore);

  protected readonly canManage = grantedPolicy('AutoReach.Pipeline.Manage', this.permissions);

  protected readonly pipelines = this.store.pipelines;
  protected readonly buckets = BUCKETS;

  private readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => {
    const all = this.pipelines();
    return all.find((p) => p.id === this.selectedId()) ?? all.find((p) => p.isDefault) ?? all.at(0);
  });
  protected readonly openStages = computed(() =>
    (this.selected()?.stages ?? []).filter((s) => !s.isFixed),
  );

  protected readonly dialog = signal<Dialog | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  // dialog fields
  protected readonly name = signal('');
  protected readonly bucket = signal<EnquiryStage>(EnquiryStage.Qualified);
  protected readonly copyFrom = signal('');
  protected readonly moveTo = signal('');

  protected select(id: string | undefined): void {
    this.selectedId.set(id ?? null);
  }

  protected bucketLabel(b: EnquiryStage | undefined): string {
    return BUCKETS.find((x) => x.value === b)?.label ?? (b === EnquiryStage.Won ? 'Won' : 'Lost');
  }

  protected others(p: SalesPipelineDto): SalesPipelineDto[] {
    return this.pipelines().filter((x) => x.id !== p.id);
  }

  protected otherOpenStages(stage: PipelineStageDto): PipelineStageDto[] {
    return this.openStages().filter((s) => s.id !== stage.id);
  }

  // ---- opening dialogs ---------------------------------------------------------

  protected open(d: Dialog): void {
    this.error.set(null);
    this.moveTo.set('');
    this.copyFrom.set('');
    if (d.kind === 'rename-pipeline') this.name.set(d.pipeline.name ?? '');
    else if (d.kind === 'stage') {
      this.name.set(d.stage?.name ?? '');
      this.bucket.set(d.stage?.bucket ?? EnquiryStage.Qualified);
    } else this.name.set('');
    this.dialog.set(d);
  }

  protected close(): void {
    this.dialog.set(null);
  }

  // ---- actions -----------------------------------------------------------------

  protected async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
      this.close();
    } catch (e: unknown) {
      this.error.set(this.message(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected saveDialog(): Promise<void> {
    const d = this.dialog();
    const name = this.name().trim();
    if (!d) return Promise.resolve();
    if ((d.kind === 'pipeline' || d.kind === 'rename-pipeline' || d.kind === 'stage') && !name) {
      this.error.set('A name is required.');
      return Promise.resolve();
    }

    switch (d.kind) {
      case 'pipeline':
        return this.run(async () => {
          await this.store.createPipeline(name, this.copyFrom() || undefined);
        });
      case 'rename-pipeline':
        return this.run(() => this.store.renamePipeline(d.pipeline.id!, name));
      case 'stage': {
        const pipeline = this.selected();
        return this.run(() =>
          d.stage
            ? this.store.saveStage(
                d.stage.id!,
                name,
                d.stage.isFixed ? d.stage.bucket! : this.bucket(),
              )
            : this.store.addStage(pipeline!.id!, name, this.bucket()),
        );
      }
      case 'delete-pipeline':
        return this.run(async () => {
          await this.store.deletePipeline(d.pipeline.id!, this.moveTo() || undefined);
          this.selectedId.set(null);
        });
      case 'delete-stage':
        return this.run(() => this.store.deleteStage(d.stage.id!, this.moveTo() || undefined));
    }
  }

  protected async makeDefault(p: SalesPipelineDto): Promise<void> {
    await this.run(() => this.store.makeDefaultPipeline(p.id!));
  }

  protected canMove(stage: PipelineStageDto, by: -1 | 1): boolean {
    const open = this.openStages();
    const at = open.findIndex((s) => s.id === stage.id);
    return at >= 0 && at + by >= 0 && at + by < open.length;
  }

  protected async move(stage: PipelineStageDto, by: -1 | 1): Promise<void> {
    if (!this.canMove(stage, by)) return;
    const ids = this.openStages().map((s) => s.id!);
    const at = ids.indexOf(stage.id!);
    [ids[at], ids[at + by]] = [ids[at + by], ids[at]];
    await this.run(() => this.store.reorderStages(this.selected()!.id!, ids));
  }

  private message(e: unknown): string {
    const err = e as { error?: { error?: { message?: string } }; message?: string };
    return err?.error?.error?.message ?? err?.message ?? 'That could not be saved.';
  }
}
