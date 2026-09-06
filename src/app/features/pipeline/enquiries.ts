import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import {
  EnquiryCard,
  PickerOption,
  PipelineStore,
  Stage,
} from '../../core/services/pipeline.service';
import { EnquiryStage, LeadSource } from '../../proxy/pipeline';
import { inrCompact } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArEnquiryDrawer } from './enquiry-drawer';
import { ArContactPicker } from './contact-picker';

const NEXT: Partial<Record<Stage, EnquiryStage>> = {
  new: EnquiryStage.Qualified,
  qualified: EnquiryStage.SiteVisit,
  siteVisit: EnquiryStage.Quoted,
  quoted: EnquiryStage.Negotiation,
  negotiation: EnquiryStage.Won,
};

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

  protected readonly board = this.store.board;
  protected readonly loading = this.store.loading;
  protected readonly openCount = this.store.openEnquiryCount;
  protected readonly pipelineValue = this.store.pipelineValueInPaise;

  protected readonly selectedId = signal<string | null>(null);

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

  protected canAdvance(stage: Stage): boolean {
    return NEXT[stage] != null;
  }

  protected async advance(card: EnquiryCard, event: Event): Promise<void> {
    event.stopPropagation();
    const target = NEXT[card.stage];
    if (target != null) {
      await this.store.moveEnquiry(card.id, target);
    }
  }
}
