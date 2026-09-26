import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  CreateUpdateWebFormDto,
  WebFormDto,
  WebFormEmbedDto,
  WebFormFieldDto,
  WebFormFieldKind,
  WebFormFieldTarget,
  WebFormSubmissionDto,
} from '../../proxy/web-forms';
import { ArButton, ArChip } from '../../ui';
import { errorMessage } from '../activities/activity-logic';
import {
  KIND_CHOICES,
  TARGET_LABEL,
  fieldsProblem,
  keyFromLabel,
  kindFor,
  targetsFor,
} from './form-logic';
import { WebFormGateway } from './form-mock';

type View =
  | { mode: 'list' }
  | { mode: 'edit'; id: string | null }
  | { mode: 'submissions'; form: WebFormDto }
  | { mode: 'embed'; form: WebFormDto };

function blank(): CreateUpdateWebFormDto {
  return {
    name: '',
    title: 'Tell us what you need',
    intro: null,
    submitLabel: 'Send',
    successMessage: 'Thank you. We have your details and will be in touch shortly.',
    redirectUrl: null,
    consentText: 'I agree to be contacted about my enquiry.',
    marketingOptInText: null,
    createEnquiry: true,
    enquiryTitle: null,
    isActive: true,
    fields: [
      {
        key: 'name',
        label: 'Your name',
        kind: WebFormFieldKind.Text,
        required: true,
        options: [],
        target: WebFormFieldTarget.Name,
      },
      {
        key: 'email',
        label: 'Email',
        kind: WebFormFieldKind.Email,
        required: true,
        options: [],
        target: WebFormFieldTarget.Email,
      },
      {
        key: 'phone',
        label: 'Phone',
        kind: WebFormFieldKind.Phone,
        required: false,
        options: [],
        target: WebFormFieldTarget.Phone,
      },
      {
        key: 'need',
        label: 'What do you need?',
        kind: WebFormFieldKind.LongText,
        required: true,
        options: [],
        target: WebFormFieldTarget.Requirement,
      },
    ],
  };
}

/**
 * Web forms for lead capture: build a form, put it on a website (a link, or an embedded frame), and see who filled it in. A submission makes or
 * finds the contact, records what they agreed to, and opens an enquiry in the pipeline.
 */
@Component({
  selector: 'ar-web-forms',
  imports: [ArTopbar, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forms.html',
  styleUrl: './forms.scss',
})
export class ArWebForms {
  private readonly api = inject(WebFormGateway).api;
  private readonly permissions = inject(PermissionService);

  protected readonly canManage = grantedPolicy('AutoReach.Channels.Manage', this.permissions);
  protected readonly kinds = KIND_CHOICES;
  protected readonly targetLabel = TARGET_LABEL;
  protected readonly targetsFor = targetsFor;
  protected readonly Kind = WebFormFieldKind;

  protected readonly view = signal<View>({ mode: 'list' });
  protected readonly forms = signal<WebFormDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly busy = signal(false);

  // editor
  protected readonly draft = signal<CreateUpdateWebFormDto>(blank());
  protected readonly problem = computed(() =>
    this.draft().name.trim() ? fieldsProblem(this.draft().fields) : 'Give the form a name.',
  );

  // embed and submissions
  protected readonly embed = signal<WebFormEmbedDto | null>(null);
  protected readonly submissions = signal<WebFormSubmissionDto[]>([]);
  protected readonly submissionTotal = signal(0);

  private readonly tick = signal(0);

  constructor() {
    effect(() => {
      this.tick();
      untracked(() => void this.load());
    });
  }

  private async load(): Promise<void> {
    try {
      this.forms.set(await firstValueFrom(this.api.getList()));
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The forms could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected back(): void {
    this.view.set({ mode: 'list' });
    this.tick.update((n) => n + 1);
  }

  protected rate(f: WebFormDto): string {
    return f.viewCount > 0 ? `${Math.round((f.submissionCount / f.viewCount) * 100)}%` : '—';
  }

  protected when(iso: string | null | undefined): string {
    return iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'never';
  }

  // ---- editing ----

  protected startNew(): void {
    this.draft.set(blank());
    this.notice.set(null);
    this.view.set({ mode: 'edit', id: null });
  }

  protected edit(f: WebFormDto): void {
    const {
      id: _id,
      slug: _s,
      viewCount: _v,
      submissionCount: _c,
      lastSubmissionAtUtc: _l,
      creationTime: _t,
      publicUrl: _u,
      ...rest
    } = f;
    this.draft.set({ ...rest, fields: f.fields.map((x) => ({ ...x, options: [...x.options] })) });
    this.notice.set(null);
    this.view.set({ mode: 'edit', id: f.id });
  }

  protected patch(p: Partial<CreateUpdateWebFormDto>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  protected patchField(i: number, p: Partial<WebFormFieldDto>): void {
    this.draft.update((d) => ({
      ...d,
      fields: d.fields.map((f, n) => (n === i ? { ...f, ...p } : f)),
    }));
  }

  protected setKind(i: number, kind: WebFormFieldKind): void {
    const f = this.draft().fields[i];
    // A target the new kind cannot fill is dropped rather than left to fail on save.
    const target = targetsFor(kind).includes(f.target) ? f.target : WebFormFieldTarget.None;
    this.patchField(i, {
      kind,
      target,
      options: kind === WebFormFieldKind.Select && f.options.length === 0 ? ['', ''] : f.options,
    });
  }

  protected setTarget(i: number, target: WebFormFieldTarget): void {
    this.patchField(i, { target, kind: kindFor(target, this.draft().fields[i].kind) });
  }

  protected setLabel(i: number, label: string): void {
    const fields = this.draft().fields;
    // A question's name follows its wording until the form has been saved, so it is never a surprise; afterwards it stays put.
    if (this.view().mode === 'edit' && (this.view() as { id: string | null }).id === null) {
      const taken = new Set(fields.filter((_, n) => n !== i).map((f) => f.key));
      this.patchField(i, { label, key: keyFromLabel(label, taken) });
    } else {
      this.patchField(i, { label });
    }
  }

  protected setOptions(i: number, text: string): void {
    this.patchField(i, { options: text.split('\n') });
  }

  protected addQuestion(): void {
    const taken = new Set(this.draft().fields.map((f) => f.key));
    const label = 'New question';
    this.draft.update((d) => ({
      ...d,
      fields: [
        ...d.fields,
        {
          key: keyFromLabel(label, taken),
          label,
          kind: WebFormFieldKind.Text,
          required: false,
          options: [],
          target: WebFormFieldTarget.None,
        },
      ],
    }));
  }

  protected removeQuestion(i: number): void {
    this.draft.update((d) => ({ ...d, fields: d.fields.filter((_, n) => n !== i) }));
  }

  protected move(i: number, by: -1 | 1): void {
    this.draft.update((d) => {
      const j = i + by;
      if (j < 0 || j >= d.fields.length) return d;
      const fields = [...d.fields];
      [fields[i], fields[j]] = [fields[j], fields[i]];
      return { ...d, fields };
    });
  }

  protected async save(): Promise<void> {
    const v = this.view();
    if (v.mode !== 'edit' || this.problem() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const body: CreateUpdateWebFormDto = {
        ...this.draft(),
        name: this.draft().name.trim(),
        fields: this.draft().fields.map((f) => ({
          ...f,
          options:
            f.kind === WebFormFieldKind.Select
              ? f.options.map((o) => o.trim()).filter(Boolean)
              : [],
        })),
      };
      if (v.id) await firstValueFrom(this.api.update(v.id, body));
      else await firstValueFrom(this.api.create(body));
      this.notice.set('Form saved.');
      this.back();
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The form could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  // ---- list actions ----

  protected async toggle(f: WebFormDto): Promise<void> {
    await this.run(
      () => firstValueFrom(this.api.setActive(f.id, !f.isActive)),
      'That could not be changed.',
    );
    this.notice.set(
      f.isActive ? 'The form is off. Its page now says it is not available.' : 'The form is live.',
    );
  }

  protected async remove(f: WebFormDto): Promise<void> {
    if (
      !window.confirm(
        `Delete "${f.name}"? Its address stops working. The contacts and enquiries it made stay.`,
      )
    )
      return;
    await this.run(() => firstValueFrom(this.api.delete(f.id)), 'The form could not be deleted.');
    this.notice.set('Form deleted.');
  }

  private async run(action: () => Promise<unknown>, fallback: string): Promise<void> {
    this.error.set(null);
    this.notice.set(null);
    try {
      await action();
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, fallback));
    }
  }

  protected async openEmbed(f: WebFormDto): Promise<void> {
    try {
      this.embed.set(await firstValueFrom(this.api.getEmbed(f.id)));
      this.view.set({ mode: 'embed', form: f });
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The embed code could not be made.'));
    }
  }

  protected async openSubmissions(f: WebFormDto): Promise<void> {
    try {
      const page = await firstValueFrom(this.api.getSubmissions(f.id, 0, 100));
      this.submissions.set(page.items ?? []);
      this.submissionTotal.set(page.totalCount ?? 0);
      this.view.set({ mode: 'submissions', form: f });
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The submissions could not be loaded.'));
    }
  }

  protected async copy(text: string, what: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.notice.set(`${what} copied.`);
    } catch {
      this.error.set('Copying was blocked by the browser. Select the text and copy it.');
    }
  }
}
