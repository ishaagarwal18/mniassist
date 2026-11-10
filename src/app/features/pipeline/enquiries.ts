import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DragEventArgs, KanbanModule } from '@syncfusion/ej2-angular-kanban';

import { grantedPolicy } from '../../core/auth/permission';
import { EnquiryCard, PickerOption, PipelineStore } from '../../core/services/pipeline.service';
import { LeadSource } from '../../proxy/pipeline';
import { registerSyncfusionLicense } from '../../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../../core/ui/syncfusion-theme';
import { inrCompact } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ArEnquiryDrawer } from './enquiry-drawer';
import { ArContactPicker } from './contact-picker';
import { ToastService } from '../../core/ui/toast.service';

// Syncfusion checks the licence in each component's constructor, before ours runs.
registerSyncfusionLicense();

/** A board column's key: the stage's id, or the built-in bucket where there is none. */
const columnKey = (stageId: string | undefined, stage: string) => stageId ?? stage;

/**
 * Enquiry pipeline (M10). A Syncfusion Kanban with a column per stage. A card is
 * dragged to another stage, or advanced one stage with its button; either way the
 * API records the move and the stage-change event, so the board is a view over the
 * real pipeline rather than a local kanban. Opening a card slides in the detail
 * drawer without leaving the board.
 */
@Component({
  selector: 'ar-enquiries',
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArEnquiryDrawer,
    ArContactPicker,
    ArSelect,
    KanbanModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './enquiries.html',
  styleUrl: './enquiries.scss',
})
export class ArEnquiries {
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly store = inject(PipelineStore);
  private readonly router = inject(Router);

  protected readonly canCreate = grantedPolicy('AutoReach.Pipeline.Create', this.permissions);
  protected readonly canManage = grantedPolicy('AutoReach.Pipeline.Manage', this.permissions);

  protected readonly pipelines = this.store.pipelines;
  protected readonly currentPipeline = this.store.currentPipeline;

  protected readonly board = this.store.board;
  protected readonly loading = this.store.loading;
  protected readonly openCount = this.store.openEnquiryCount;
  protected readonly pipelineValue = this.store.pipelineValueInPaise;

  protected readonly hotLeadsCount = computed(
    () => this.cards().filter((c) => c.card?.band === 'hot').length,
  );
  protected readonly avgDealValue = computed(() => {
    const count = this.openCount();
    return count > 0 ? Math.round(this.pipelineValue() / count) : 0;
  });

  private readonly headerTemplate = viewChild<TemplateRef<unknown>>('headerTemplate');

  /** Kanban columns and cards, flattened from the store's board. */
  protected readonly columns = computed(() => {
    const template = this.headerTemplate();
    return this.board().map((col) => ({
      keyField: columnKey(col.stageId, col.stage),
      headerText: col.label,
      showItemCount: false,
      ...(template ? { template } : {}),
    }));
  });
  protected readonly cards = computed(() =>
    this.board().flatMap((col) =>
      col.cards.map((card) => ({ ...card, column: columnKey(col.stageId, col.stage), card })),
    ),
  );
  protected readonly moveError = signal<string | null>(null);

  constructor() {
    ensureSyncfusionTheme('kanban');
  }

  protected columnMeta(key: string): string {
    const col = this.board().find((c) => columnKey(c.stageId, c.stage) === key);
    return col ? `${col.count} · ${this.value(col.valueInPaise)}` : '';
  }

  /** A card dropped on another stage moves the real enquiry there. */
  protected async onDrop(args: DragEventArgs): Promise<void> {
    for (const moved of args.data) {
      const card = moved['card'] as EnquiryCard;
      const to = moved['column'] as string;
      if (!card || to === columnKey(card.stageId, card.stage)) continue;
      this.moveError.set(null);
      try {
        await this.store.moveEnquiryToStage(card.id, to);
      } catch (e: unknown) {
        this.moveError.set(e instanceof Error ? e.message : 'The enquiry could not be moved.');
        this.store.reload(); // put the card back where the server says it is
      }
    }
  }

  /** A link can open one enquiry straight away: /enquiries?open={id} (the dealer network's accepted leads use it). */
  protected readonly selectedId = signal<string | null>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('open'),
  );

  // ---- New enquiry dialog ---------------------------------------------
  protected readonly sources = [
    { value: LeadSource.Manual, label: 'Entered manually' },
    { value: LeadSource.Website, label: 'Website' },
    { value: LeadSource.ClickToWhatsApp, label: 'Click-to-WhatsApp ad' },
    { value: LeadSource.Exhibition, label: 'Exhibition' },
    { value: LeadSource.Referral, label: 'Referral' },
    { value: LeadSource.Dealer, label: 'Dealer' },
  ];
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly contact = signal<PickerOption | null>(null);
  protected readonly title = signal('');
  protected readonly requirement = signal('');
  protected readonly valueRupees = signal('');
  protected readonly source = signal<LeadSource>(LeadSource.Manual);

  protected openDialog(): void {
    this.contact.set(null);
    this.title.set('');
    this.requirement.set('');
    this.valueRupees.set('');
    this.source.set(LeadSource.Manual);
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected async createEnquiry(): Promise<void> {
    const c = this.contact();
    if (!c) {
      this.toasts.warning('Pick the contact this enquiry is for.', 'Enquiry');
      return;
    }
    if (!this.title().trim()) {
      this.toasts.warning('Give the enquiry a short title.', 'Enquiry');
      return;
    }
    const rupees = Number(this.valueRupees().replace(/[^\d.]/g, ''));
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.createEnquiry({
        contactId: c.id,
        pipelineId: this.store.pipelineId() ?? undefined,
        source: this.source(),
        title: this.title().trim(),
        requirement: this.requirement().trim() || undefined,
        estimatedValueInPaise: rupees > 0 ? Math.round(rupees * 100) : undefined,
      });
      this.dialogOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The enquiry could not be created.');
    } finally {
      this.saving.set(false);
    }
  }

  protected value(paise?: number): string {
    return paise == null ? '—' : inrCompact(paise / 100);
  }

  protected next(card: EnquiryCard): { stageId: string; label: string } | undefined {
    return this.store.nextStageOf(this.currentPipeline()?.id, card.stageId, card.stage);
  }

  protected async advance(card: EnquiryCard, event: Event): Promise<void> {
    event.stopPropagation();
    const target = this.next(card);
    if (target) {
      await this.store.moveEnquiryToStage(card.id, target.stageId);
    }
  }

  protected choosePipeline(id: string): void {
    this.store.pipelineId.set(id);
  }

  protected managePipelines(): void {
    void this.router.navigate(['/enquiries/pipelines']);
  }
}
