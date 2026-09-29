import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { EnquiryCard, PickerOption, PipelineStore } from '../../core/services/pipeline.service';
import { LeadSource } from '../../proxy/pipeline';
import { inrCompact } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArEnquiryDrawer } from './enquiry-drawer';
import { ArContactPicker } from './contact-picker';

/**
 * Enquiry pipeline (M10). A column per stage; each card advances one stage at a
 * time — the API records the move and the stage-change event, so the board is a
 * view over the real pipeline rather than a local kanban. Opening a card slides in
 * the detail drawer without leaving the board.
 */
@Component({
  selector: 'ar-enquiries',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArEnquiryDrawer, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './enquiries.html',
  styleUrl: './enquiries.scss',
})
export class ArEnquiries {
  private readonly store = inject(PipelineStore);
  private readonly router = inject(Router);

  protected readonly pipelines = this.store.pipelines;
  protected readonly currentPipeline = this.store.currentPipeline;

  protected readonly board = this.store.board;
  protected readonly loading = this.store.loading;
  protected readonly openCount = this.store.openEnquiryCount;
  protected readonly pipelineValue = this.store.pipelineValueInPaise;

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
      window.alert('Pick the contact this enquiry is for.');
      return;
    }
    if (!this.title().trim()) {
      window.alert('Give the enquiry a short title.');
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
