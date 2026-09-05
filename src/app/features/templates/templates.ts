import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { TemplateService } from '../../core/services/template.service';
import {
  DraftTemplate,
  LintItem,
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

const emptyDraft = (): DraftTemplate => ({
  name: '',
  language: 'en',
  category: 'utility',
  header: '',
  body: '',
  footer: '',
});

/**
 * Template studio (M04). Authoring, the pre-submission lint, and submission to
 * Meta — the three things that were missing from the client even though the API
 * supported them.
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

  protected readonly templates = this.store.templates;
  protected readonly counts = this.store.counts;
  protected readonly loading = this.store.loading;

  protected readonly composerOpen = signal(false);
  protected readonly draft = signal<DraftTemplate>(emptyDraft());
  protected readonly lint = signal<LintItem[] | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly bodyVariableCount = computed(() => {
    const matches = this.draft().body.match(/\{\{\s*\d+\s*\}\}/g) ?? [];
    return new Set(matches.map((m) => m.replace(/\D/g, ''))).size;
  });

  protected readonly lintHasErrors = computed(() =>
    (this.lint() ?? []).some((i) => i.severity === 'error'),
  );

  protected readonly subtitle = computed(() => {
    const c = this.counts();
    if (c.rejected > 0) return `${c.rejected} rejected — needs a fix`;
    if (c.pending > 0) return `${c.pending} awaiting Meta review`;
    return `${c.total} template${c.total === 1 ? '' : 's'}`;
  });

  protected search(term: string): void {
    this.store.filter.set(term);
  }

  protected openComposer(): void {
    this.draft.set(emptyDraft());
    this.lint.set(null);
    this.error.set(null);
    this.composerOpen.set(true);
  }

  protected patch<K extends keyof DraftTemplate>(key: K, value: DraftTemplate[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
    this.lint.set(null);
  }

  protected async runLint(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.lint.set(await this.store.lint(this.draft()));
    } catch {
      this.error.set('Could not reach the linter.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async createTemplate(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.store.create(this.draft());
      this.composerOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not create the template.');
    } finally {
      this.busy.set(false);
    }
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
