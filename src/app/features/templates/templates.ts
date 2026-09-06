import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { TemplateService } from '../../core/services/template.service';
import {
  Template,
  TemplateCategory,
  TemplateQuality,
  TemplateStatus,
} from '../../core/models/template.model';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArSearchBox, ArStatTile } from '../../ui';
import { ChipTone } from '../../ui/chip';

const STATUS_TONE: Record<TemplateStatus, ChipTone> = {
  draft: 'neutral',
  pending: 'amber',
  approved: 'good',
  rejected: 'bad',
  paused: 'warn',
  disabled: 'bad',
};

const QUALITY_TONE: Record<TemplateQuality, ChipTone> = {
  unknown: 'neutral',
  high: 'good',
  medium: 'amber',
  low: 'bad',
};

/**
 * Template studio (M04). The list, the pre-submission lint summary, and
 * submission to Meta. Authoring itself is the visual composer at
 * `/templates/new` (M04-1) — a form beside a live WhatsApp preview.
 *
 * The screen leads with the two states that cost a tenant money: a template Meta
 * re-categorised (billing follows Meta's category, not the filed one) and a
 * rejection (with the reason, so the fix is obvious rather than another day-long
 * round trip).
 */
@Component({
  selector: 'ar-templates',
  imports: [ArTopbar, ArButton, ArChip, ArSearchBox, ArStatTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './templates.html',
  styleUrl: './templates.scss',
})
export class ArTemplates {
  private readonly store = inject(TemplateService);
  private readonly router = inject(Router);

  protected readonly templates = this.store.templates;
  protected readonly counts = this.store.counts;
  protected readonly loading = this.store.loading;

  /** The languages a template name exists in — a group of more than one is M04-9. */
  protected languagesFor(t: Template): string[] {
    return (this.store.languageGroups().get(t.name) ?? [t.language]).slice().sort();
  }

  protected readonly busy = signal(false);

  protected readonly subtitle = computed(() => {
    const c = this.counts();
    if (c.rejected > 0) return `${c.rejected} rejected — needs a fix`;
    if (c.pending > 0) return `${c.pending} awaiting Meta review`;
    return `${c.total} template${c.total === 1 ? '' : 's'}`;
  });

  protected search(term: string): void {
    this.store.filter.set(term);
  }

  protected newTemplate(): void {
    void this.router.navigate(['/templates/new']);
  }

  protected edit(t: Template): void {
    void this.router.navigate(['/templates', t.id, 'edit']);
  }

  protected async submit(t: Template): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.submit(t.id);
    } finally {
      this.busy.set(false);
    }
  }

  protected async sync(): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.syncFromMeta();
    } finally {
      this.busy.set(false);
    }
  }

  protected statusTone(s: TemplateStatus): ChipTone {
    return STATUS_TONE[s];
  }

  protected qualityTone(q: TemplateQuality): ChipTone {
    return QUALITY_TONE[q];
  }

  protected categoryLabel(c: TemplateCategory): string {
    return c[0].toUpperCase() + c.slice(1);
  }

  protected canEdit(t: Template): boolean {
    return t.status === 'draft' || t.status === 'rejected';
  }

  protected canSubmit(t: Template): boolean {
    return t.status === 'draft' || t.status === 'rejected';
  }

  protected when(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
