import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  DraftButton,
  DraftTemplate,
  LintItem,
  TemplateButtonKind,
  TemplateCategory,
  TemplateHeaderKind,
} from '../../core/models/template.model';
import {
  TemplateService,
  TemplateDraftTone,
  draftFromTemplate,
  emptyDraft,
} from '../../core/services/template.service';
import { DraftedTemplateDto } from '../../proxy/messaging';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArIcon } from '../../ui';
import { IconName } from '../../ui/icon';

interface BodySegment {
  readonly text: string;
  /** True when this segment is an unfilled {{n}} placeholder. */
  readonly variable: boolean;
}

const HEADER_KINDS: { value: TemplateHeaderKind; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
];

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'utility', label: 'Utility' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'authentication', label: 'Authentication' },
];

const BUTTON_ICON: Record<TemplateButtonKind, IconName> = {
  quick_reply: 'send',
  url: 'link',
  phone: 'channel',
};

const HEADER_MEDIA_ICON: Record<TemplateHeaderKind, IconName> = {
  none: 'document',
  text: 'document',
  image: 'attach',
  video: 'flow',
  document: 'document',
};

/**
 * Visual template composer (M04-1). A form on the left, a live WhatsApp-accurate
 * preview on the right — header, body with variables substituted from sample
 * values, footer, and the button row rendered the way the handset draws it.
 *
 * The preview is the point: a template that reads fine in a textarea can look
 * broken in the client (a variable stranded at the end of a line, a button label
 * that wraps), and finding that out from a Meta rejection costs a day.
 */
@Component({
  selector: 'ar-template-composer',
  imports: [RouterLink, ArTopbar, ArButton, ArChip, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-composer.html',
  styleUrl: './template-composer.scss',
})
export class ArTemplateComposer {
  private readonly store = inject(TemplateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly headerKinds = HEADER_KINDS;
  protected readonly categories = CATEGORIES;
  protected readonly buttonIcon = BUTTON_ICON;

  protected readonly draft = signal<DraftTemplate>(emptyDraft());
  protected readonly lint = signal<LintItem[] | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal(false);

  // ── AI draft (M04-10) ────────────────────────────────────────────────────
  protected readonly aiTones: { value: TemplateDraftTone; label: string }[] = [
    { value: TemplateDraftTone.Friendly, label: 'Friendly' },
    { value: TemplateDraftTone.Formal, label: 'Formal' },
    { value: TemplateDraftTone.Concise, label: 'Concise' },
    { value: TemplateDraftTone.Persuasive, label: 'Persuasive' },
  ];
  protected readonly aiOpen = signal(false);
  protected readonly aiGoal = signal('');
  protected readonly aiTone = signal<TemplateDraftTone>(TemplateDraftTone.Friendly);
  protected readonly aiBusy = signal(false);
  protected readonly aiResult = signal<DraftedTemplateDto | null>(null);
  protected readonly aiError = signal<string | null>(null);

  protected async runAiDraft(): Promise<void> {
    if (this.aiGoal().trim().length < 3) {
      this.aiError.set('Describe what the message should say first.');
      return;
    }
    this.aiBusy.set(true);
    this.aiError.set(null);
    try {
      const result = await this.store.draftWithAi(
        this.aiGoal(),
        this.draft().category,
        this.aiTone(),
      );
      this.aiResult.set(result);
    } catch (e: unknown) {
      this.aiError.set(e instanceof Error ? e.message : 'The draft could not be generated.');
    } finally {
      this.aiBusy.set(false);
    }
  }

  protected useVariant(body: string): void {
    this.patch('body', body);
  }

  protected addSuggestedButton(label: string): void {
    if (!this.canAdd('quick_reply')) return;
    this.patch('buttons', [
      ...this.draft().buttons,
      { kind: 'quick_reply' as TemplateButtonKind, text: label, url: '', phone: '' },
    ]);
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editing.set(true);
      void this.loadDraft(id);
    }
  }

  private async loadDraft(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const t = await this.store.load(id);
      if (t.status !== 'draft' && t.status !== 'rejected') {
        this.error.set('Only draft or rejected templates can be edited.');
      }
      this.draft.set(draftFromTemplate(t));
    } catch {
      this.error.set('Could not load this template.');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Field editing ────────────────────────────────────────────────────────
  protected patch<K extends keyof DraftTemplate>(key: K, value: DraftTemplate[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
    this.lint.set(null);
  }

  protected setSample(n: string, value: string): void {
    this.draft.update((d) => ({ ...d, samples: { ...d.samples, [n]: value } }));
  }

  /** The distinct variable numbers used across header/body/footer, in order. */
  protected readonly variables = computed<number[]>(() => {
    const d = this.draft();
    const found = [d.header, d.body, d.footer].join('\n').match(/\{\{\s*(\d+)\s*\}\}/g);
    return [...new Set((found ?? []).map((m) => +m.replace(/\D/g, '')))].sort((a, b) => a - b);
  });

  protected appendVariable(): void {
    const next = (this.variables().at(-1) ?? 0) + 1;
    this.patch('body', `${this.draft().body}{{${next}}}`);
  }

  // ── Buttons ──────────────────────────────────────────────────────────────
  protected readonly quickReplyCount = computed(
    () => this.draft().buttons.filter((b) => b.kind === 'quick_reply').length,
  );

  protected canAdd(kind: TemplateButtonKind): boolean {
    const buttons = this.draft().buttons;
    if (buttons.length >= 10) return false;
    if (kind === 'quick_reply') return this.quickReplyCount() < 3;
    return !buttons.some((b) => b.kind === kind);
  }

  protected addButton(kind: TemplateButtonKind): void {
    const button: DraftButton = { kind, text: '', url: '', phone: '' };
    this.patch('buttons', [...this.draft().buttons, button]);
  }

  protected patchButton<K extends keyof DraftButton>(
    i: number,
    key: K,
    value: DraftButton[K],
  ): void {
    this.patch(
      'buttons',
      this.draft().buttons.map((b, idx) => (idx === i ? { ...b, [key]: value } : b)),
    );
  }

  protected removeButton(i: number): void {
    this.patch(
      'buttons',
      this.draft().buttons.filter((_, idx) => idx !== i),
    );
  }

  protected buttonLabel(kind: TemplateButtonKind): string {
    return kind === 'quick_reply'
      ? 'Quick reply'
      : kind === 'url'
        ? 'Visit website'
        : 'Call phone number';
  }

  // ── Live preview ─────────────────────────────────────────────────────────
  private fill(text: string): string {
    return text.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => {
      const s = this.draft().samples[n]?.trim();
      return s ? s : `{{${n}}}`;
    });
  }

  protected readonly previewHeaderText = computed(() =>
    this.draft().headerKind === 'text' ? this.fill(this.draft().header) : '',
  );

  protected readonly previewFooter = computed(() => this.draft().footer.trim());

  /** Body split into plain runs and still-unfilled `{{n}}` placeholders, so the
   *  preview can grey the placeholders the way an unresolved variable reads. */
  protected readonly previewBody = computed<BodySegment[]>(() => {
    const filled = this.fill(this.draft().body) || 'Your message text will appear here.';
    const out: BodySegment[] = [];
    const re = /\{\{\s*\d+\s*\}\}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(filled)) !== null) {
      if (m.index > last) out.push({ text: filled.slice(last, m.index), variable: false });
      out.push({ text: m[0], variable: true });
      last = m.index + m[0].length;
    }
    if (last < filled.length) out.push({ text: filled.slice(last), variable: false });
    return out;
  });

  protected headerMediaIcon(): IconName {
    return HEADER_MEDIA_ICON[this.draft().headerKind];
  }

  protected previewButtonHref(b: DraftButton): string | null {
    if (b.kind === 'url') return this.fill(b.url) || null;
    if (b.kind === 'phone') return b.phone ? `tel:${b.phone}` : null;
    return null;
  }

  // ── Lint / save ──────────────────────────────────────────────────────────
  protected readonly lintErrors = computed(
    () => (this.lint() ?? []).filter((i) => i.severity === 'error').length,
  );

  protected readonly canSave = computed(() => {
    const d = this.draft();
    return !this.busy() && !!d.name.trim() && !!d.body.trim();
  });

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

  protected async save(alsoSubmit: boolean): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const saved = this.editing()
        ? await this.store.update(this.draft())
        : await this.store.create(this.draft());
      if (alsoSubmit) {
        await this.store.submit(saved.id);
      }
      await this.router.navigate(['/templates']);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the template.');
    } finally {
      this.busy.set(false);
    }
  }
}
