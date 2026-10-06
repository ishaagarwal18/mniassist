import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { rxResource } from '@angular/core/rxjs-interop';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { readApiError } from '../../core/util/api-error';
import { settled } from '../../core/util/resource';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { TextTemplateService } from '../../proxy/text-templates/text-template.service';
import type {
  EmailTemplateDto,
  EmailTemplateSummaryDto,
  EmailTemplateVariableDto,
} from '../../proxy/text-templates/models';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { insertAt, variableSnippet } from './email-templates.logic';

const PREVIEW_DELAY_MS = 600;

/**
 * The platform's own emails — invitations, password resets, quotations to sign — and their
 * wording. A workspace edits its own copy; on the host this edits the default every
 * workspace without its own copy sends. The preview fills in sample values.
 */
@Component({
  selector: 'ar-email-templates',
  imports: [ArTopbar, ArCard, ArButton, ArChip, ArBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Email templates"
      subtitle="The wording of invitations, password resets and quotation emails"
      help="Change what the platform's own emails say. The variables listed under each email, such as the workspace name, are filled in when it is sent. Keep the html.escape filter on anything a person typed, such as names. Restore default puts the original wording back."
    />

    <div class="et ar-scroll">
      <nav class="et__list" aria-label="Email templates">
        @for (t of templates(); track t.key) {
          <button
            type="button"
            class="et__item"
            [class.et__item--on]="t.key === selectedKey()"
            (click)="select(t.key)"
          >
            <span class="et__item-name">{{ t.displayName }}</span>
            <span class="et__item-desc">{{ t.description }}</span>
            @if (t.isCustomized) {
              <ar-chip tone="teal">Customised</ar-chip>
            } @else if (t.usesHostWording) {
              <ar-chip tone="neutral">Platform wording</ar-chip>
            }
          </button>
        }
      </nav>

      <div class="et__main">
        @if (error(); as e) {
          <ar-banner tone="bad">{{ e }}</ar-banner>
        }

        @if (template(); as t) {
          <ar-card [heading]="t.displayName">
            <p class="et__muted">{{ t.description }}</p>

            @if (t.hasSubject) {
              <label class="fld">
                <span class="fld__k">Subject</span>
                <input
                  #subjectInput
                  class="ar-field__input"
                  maxlength="512"
                  [readOnly]="!canEdit()"
                  [value]="subject()"
                  (input)="subject.set($any($event.target).value)"
                  (focus)="lastField.set('subject')"
                />
              </label>
            }

            <label class="fld">
              <span class="fld__k">{{ t.key === 'Layout' ? 'Layout (HTML)' : 'Body (HTML)' }}</span>
              <textarea
                #bodyInput
                class="ar-field__input et__code"
                rows="16"
                spellcheck="false"
                [readOnly]="!canEdit()"
                [value]="body()"
                (input)="body.set($any($event.target).value)"
                (focus)="lastField.set('body')"
              ></textarea>
            </label>

            <div class="et__vars">
              <span class="fld__k">Variables {{ canEdit() ? '— click to insert' : '' }}</span>
              <div class="et__var-list">
                @for (v of t.variables; track v.name) {
                  <button
                    type="button"
                    class="et__var"
                    [disabled]="!canEdit()"
                    [title]="v.description + ' — e.g. ' + v.sample"
                    (click)="insert(v)"
                  >
                    {{ v.name }}
                  </button>
                }
              </div>
            </div>

            <div class="et__actions">
              @if (canEdit()) {
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy() || !dirty()"
                  (click)="save()"
                >
                  {{ busy() ? 'Saving…' : 'Save' }}
                </button>
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy() || !dirty()"
                  (click)="discard()"
                >
                  Discard changes
                </button>
                @if (t.isCustomized) {
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy()"
                    (click)="restore()"
                  >
                    Restore default
                  </button>
                }
              } @else {
                <span class="et__muted">You can read these templates but not change them.</span>
              }
            </div>
          </ar-card>

          <ar-card heading="Preview">
            @if (previewError(); as e) {
              <ar-banner tone="warn">{{ e }}</ar-banner>
            }
            @if (previewSubject(); as s) {
              <p class="et__subject"><span>Subject</span> {{ s }}</p>
            }
            <iframe
              class="et__frame"
              title="Email preview"
              sandbox=""
              referrerpolicy="no-referrer"
              [srcdoc]="previewHtml()"
            ></iframe>
            <p class="et__muted">Sample values are filled in. Links in the preview do not open.</p>
          </ar-card>
        } @else if (!error()) {
          <p class="et__muted">Loading…</p>
        }
      </div>
    </div>
  `,
  styles: `
    .et {
      padding: 20px;
      display: grid;
      grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .et {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .et__list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .et__item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 10px 12px;
      text-align: left;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      background: var(--ar-white);
      cursor: pointer;
    }
    .et__item--on {
      border-color: var(--ar-blue-600);
      box-shadow: inset 3px 0 0 var(--ar-blue-600);
    }
    .et__item-name {
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .et__item-desc {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .et__main {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }
    .et__muted {
      margin: 0 0 12px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .fld {
      display: block;
      margin-bottom: 12px;
    }
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .et__code {
      font: 400 12.5px/1.5 var(--ar-font-mono);
      white-space: pre;
      resize: vertical;
      width: 100%;
    }
    .et__var-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .et__var {
      padding: 3px 8px;
      border: 1px solid var(--ar-line-200);
      border-radius: 999px;
      background: var(--ar-bg-100);
      font: 400 12px var(--ar-font-mono);
      color: var(--ar-ink-700);
      cursor: pointer;
    }
    .et__var:disabled {
      cursor: default;
    }
    .et__actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    .et__subject {
      margin: 0 0 10px;
      font: 500 13px var(--ar-font-sans);
    }
    .et__subject span {
      color: var(--ar-ink-500);
      font-weight: 400;
      margin-right: 6px;
    }
    .et__frame {
      width: 100%;
      height: 360px;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      background: #ffffff;
    }
  `,
})
export class ArEmailTemplates {
  private readonly api = inject(TextTemplateService);
  private readonly permissions = inject(PermissionService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialogs = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly mock = environment.useMockData;

  private readonly subjectInput = viewChild<ElementRef<HTMLInputElement>>('subjectInput');
  private readonly bodyInput = viewChild<ElementRef<HTMLTextAreaElement>>('bodyInput');

  protected readonly canEdit = computed(() =>
    grantedPolicy('AutoReach.TextTemplates.Edit', this.permissions),
  );

  private readonly listTick = signal(0);
  private readonly listResource = rxResource({
    params: () => (this.mock ? undefined : { t: this.listTick() }),
    stream: () => this.api.getList(),
    defaultValue: { items: [] as EmailTemplateSummaryDto[] },
  });
  protected readonly templates = computed<EmailTemplateSummaryDto[]>(() =>
    this.mock ? [] : (settled(this.listResource, { items: [] }).items ?? []),
  );

  protected readonly selectedKey = signal<string | null>(null);
  protected readonly template = signal<EmailTemplateDto | null>(null);
  protected readonly subject = signal('');
  protected readonly body = signal('');
  protected readonly lastField = signal<'subject' | 'body'>('body');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly dirty = computed(() => {
    const t = this.template();
    if (!t) return false;
    return this.body() !== t.body || (t.hasSubject && this.subject() !== (t.subject ?? ''));
  });

  protected readonly previewHtml = signal<SafeHtml>('');
  protected readonly previewSubject = signal<string | null>(null);
  protected readonly previewError = signal<string | null>(null);
  private previewTimer: ReturnType<typeof setTimeout> | undefined;
  private previewSeq = 0;

  constructor() {
    // Open the first template once the list arrives.
    effect(() => {
      const first = this.templates()[0];
      if (first && this.selectedKey() === null) void this.load(first.key);
    });

    // Re-render the preview a moment after the wording stops changing.
    effect(() => {
      const key = this.selectedKey();
      const body = this.body();
      const subject = this.subject();
      if (!key || !this.template()) return;
      clearTimeout(this.previewTimer);
      this.previewTimer = setTimeout(() => void this.preview(key, subject, body), PREVIEW_DELAY_MS);
    });
  }

  protected async select(key: string): Promise<void> {
    if (key === this.selectedKey()) return;
    if (
      this.dirty() &&
      !(await this.dialogs.confirm({
        title: 'Discard your changes?',
        message: 'The changes to this template have not been saved.',
        confirmText: 'Discard',
      }))
    ) {
      return;
    }
    await this.load(key);
  }

  private async load(key: string): Promise<void> {
    this.selectedKey.set(key);
    this.error.set(null);
    try {
      this.show(await firstValueFrom(this.api.get(key)));
    } catch (e) {
      this.template.set(null);
      this.error.set(readApiError(e));
    }
  }

  private show(t: EmailTemplateDto): void {
    this.template.set(t);
    this.subject.set(t.subject ?? '');
    this.body.set(t.body);
  }

  protected insert(v: EmailTemplateVariableDto): void {
    const t = this.template();
    const toSubject = this.lastField() === 'subject' && !!t?.hasSubject && v.name !== 'content';
    const field = toSubject ? this.subjectInput()?.nativeElement : this.bodyInput()?.nativeElement;
    const target = toSubject ? this.subject : this.body;
    const value = target();
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? value.length;
    const next = insertAt(value, start, end, variableSnippet(v, toSubject));
    target.set(next.value);
    // Put the caret after what was inserted, once Angular has written the new value.
    queueMicrotask(() => {
      field?.focus();
      field?.setSelectionRange(next.caret, next.caret);
    });
  }

  protected async save(): Promise<void> {
    const t = this.template();
    if (!t || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.show(
        await firstValueFrom(
          this.api.update(t.key, {
            subject: t.hasSubject ? this.subject() : null,
            body: this.body(),
          }),
        ),
      );
      this.listTick.update((n) => n + 1);
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected discard(): void {
    const t = this.template();
    if (t) this.show(t);
  }

  protected async restore(): Promise<void> {
    const t = this.template();
    if (!t || this.busy()) return;
    if (
      !(await this.dialogs.confirm({
        title: 'Restore the default wording?',
        message: 'Your changes to this email are removed. It goes back to the platform wording.',
        confirmText: 'Restore',
      }))
    ) {
      return;
    }
    this.busy.set(true);
    try {
      this.show(await firstValueFrom(this.api.restoreDefault(t.key)));
      this.listTick.update((n) => n + 1);
      this.toast.success('Default wording restored.');
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  private async preview(key: string, subject: string, body: string): Promise<void> {
    const seq = ++this.previewSeq;
    const t = this.template();
    try {
      const r = await firstValueFrom(
        this.api.preview(key, { subject: t?.hasSubject ? subject : null, body }),
      );
      if (seq !== this.previewSeq) return;
      // Safe to trust: it is shown only in a frame with an empty sandbox — no scripts, no
      // same-origin access — and Angular's sanitiser would otherwise strip the inline styles
      // every email relies on.
      this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(r.html));
      this.previewSubject.set(t?.hasSubject ? r.subject : null);
      this.previewError.set(null);
    } catch (e) {
      if (seq !== this.previewSeq) return;
      this.previewError.set(readApiError(e));
    }
  }
}
