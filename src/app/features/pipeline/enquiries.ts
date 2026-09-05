import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { EnquiryCard, PipelineStore, Stage } from '../../core/services/pipeline.service';
import { EnquiryStage } from '../../proxy/pipeline';
import { inrCompact } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip } from '../../ui';

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
 * view over the real pipeline rather than a local kanban.
 */
@Component({
  selector: 'ar-enquiries',
  imports: [ArTopbar, ArButton, ArChip],
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

  protected value(paise?: number): string {
    return paise == null ? '—' : inrCompact(paise / 100);
  }

  protected canAdvance(stage: Stage): boolean {
    return NEXT[stage] != null;
  }

  protected async advance(card: EnquiryCard): Promise<void> {
    const target = NEXT[card.stage];
    if (target != null) {
      await this.store.moveEnquiry(card.id, target);
    }
  }
}
