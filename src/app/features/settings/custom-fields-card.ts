import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { CustomFieldEntity } from '../../proxy/contacts/custom-field-entity.enum';
import { CustomFieldService } from '../../proxy/contacts/custom-field.service';
import { CustomFieldType } from '../../proxy/contacts/custom-field-type.enum';
import type {
  CreateUpdateCustomFieldDto,
  CustomFieldDefinitionDto,
} from '../../proxy/contacts/models';
import { ArButton, ArChip } from '../../ui';
import { ArDialog } from '../../ui/dialog';

const TYPE: Record<CustomFieldType, string> = {
  [CustomFieldType.Text]: 'Text',
  [CustomFieldType.Number]: 'Number',
  [CustomFieldType.Date]: 'Date',
  [CustomFieldType.SingleSelect]: 'Pick one',
  [CustomFieldType.MultiSelect]: 'Pick several',
  [CustomFieldType.Boolean]: 'Yes / no',
};

/** The field being added or edited in the dialog. */
export interface FieldDraft {
  id?: string;
  appliesTo: CustomFieldEntity;
  key: string;
  /** True once the person has typed a key, so the label stops proposing one. */
  keyTouched: boolean;
  label: string;
  type: CustomFieldType;
  isRequired: boolean;
  order: string;
  helpText: string;
  /** One choice per line. */
  options: string;
}

export const hasOptions = (t: CustomFieldType): boolean =>
  t === CustomFieldType.SingleSelect || t === CustomFieldType.MultiSelect;

/** The key the API would store for a label: lowercased, words joined by underscores. */
export function keyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export function optionLines(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split('\n')
    .map((o) => o.trim())
    .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()));
}

/** Problems with a draft, keyed by input; empty when it can be saved. */
export function fieldDraftProblems(
  d: FieldDraft,
  existing: readonly CustomFieldDefinitionDto[],
): Record<string, string> {
  const p: Record<string, string> = {};
  if (!d.label.trim()) p['label'] = 'Give the field a name.';
  else if (d.label.trim().length > 128) p['label'] = 'Keep the name to 128 characters.';
  if (!d.id) {
    const key = keyFromLabel(d.key);
    if (!key) p['key'] = 'Give the field a key (letters, numbers and underscores).';
    else if (
      existing.some((f) => f.appliesTo === d.appliesTo && (f.key ?? '').toLowerCase() === key)
    )
      p['key'] = 'Another field on this record already uses that key.';
  }
  if (hasOptions(d.type) && optionLines(d.options).length === 0)
    p['options'] = 'Add at least one choice, one per line.';
  if (d.order.trim() && !/^-?\d+$/.test(d.order.trim()))
    p['order'] = 'The position is a whole number.';
  if (d.helpText.length > 512) p['helpText'] = 'Keep the help text to 512 characters.';
  return p;
}

export function draftToInput(d: FieldDraft): CreateUpdateCustomFieldDto {
  return {
    appliesTo: d.appliesTo,
    key: keyFromLabel(d.key),
    label: d.label.trim(),
    type: d.type,
    isRequired: d.isRequired,
    order: d.order.trim() ? Number(d.order.trim()) : 0,
    helpText: d.helpText.trim() || null,
    options: hasOptions(d.type) ? optionLines(d.options) : [],
  };
}

/** The workspace's extra contact and enquiry fields: add, edit, remove, or install the industrial pack. */
@Component({
  selector: 'ar-custom-fields-card',
  imports: [ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../shared/work-page.scss', './custom-fields-card.scss'],
  templateUrl: './custom-fields-card.html',
})
export class ArCustomFieldsCard implements OnInit {
  private readonly api = inject(CustomFieldService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly canManage = grantedPolicy(
    'AutoReach.Contacts.ManageCustomFields',
    inject(PermissionService),
  );

  protected readonly enquiry = CustomFieldEntity.Enquiry;
  protected readonly contact = CustomFieldEntity.Contact;
  protected readonly T = CustomFieldType;
  protected readonly types = (Object.keys(TYPE) as unknown as CustomFieldType[]).map((k) => ({
    value: Number(k) as CustomFieldType,
    label: TYPE[Number(k) as CustomFieldType],
  }));
  protected readonly hasOptions = hasOptions;

  protected readonly fields = signal<CustomFieldDefinitionDto[]>([]);
  protected readonly busy = signal(false);
  protected readonly draft = signal<FieldDraft | null>(null);
  protected readonly problems = signal<Record<string, string>>({});

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected type(t: CustomFieldType | undefined): string {
    return t === undefined ? '' : (TYPE[t] ?? '');
  }

  private async load(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getList({ skipCount: 0, maxResultCount: 200 }, { skipHandleError: true }),
      );
      this.fields.set(
        [...(page.items ?? [])].sort(
          (a, b) => (a.appliesTo ?? 0) - (b.appliesTo ?? 0) || (a.order ?? 0) - (b.order ?? 0),
        ),
      );
    } catch {
      this.fields.set([]);
    }
  }

  protected openNew(): void {
    this.problems.set({});
    this.draft.set({
      appliesTo: CustomFieldEntity.Contact,
      key: '',
      keyTouched: false,
      label: '',
      type: CustomFieldType.Text,
      isRequired: false,
      order: String((this.fields().length + 1) * 10),
      helpText: '',
      options: '',
    });
  }

  protected openEdit(f: CustomFieldDefinitionDto): void {
    this.problems.set({});
    this.draft.set({
      id: f.id,
      appliesTo: f.appliesTo ?? CustomFieldEntity.Contact,
      key: f.key ?? '',
      keyTouched: true,
      label: f.label ?? '',
      type: f.type ?? CustomFieldType.Text,
      isRequired: !!f.isRequired,
      order: String(f.order ?? 0),
      helpText: f.helpText ?? '',
      options: [...(f.options ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((o) => o.value ?? '')
        .join('\n'),
    });
  }

  protected patch(change: Partial<FieldDraft>): void {
    this.draft.update((d) => {
      if (!d) return d;
      const next = { ...d, ...change };
      // A new field's key follows its name until the person edits the key themselves.
      if ('label' in change && !d.id && !d.keyTouched) next.key = keyFromLabel(next.label);
      if ('key' in change) next.keyTouched = true;
      return next;
    });
    if (Object.keys(this.problems()).length) {
      const d = this.draft();
      if (d) this.problems.set(fieldDraftProblems(d, this.fields()));
    }
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d) return;
    const problems = fieldDraftProblems(d, this.fields());
    this.problems.set(problems);
    if (Object.keys(problems).length) return;
    this.busy.set(true);
    try {
      const input = draftToInput(d);
      if (d.id) await firstValueFrom(this.api.update(d.id, input, { skipHandleError: true }));
      else await firstValueFrom(this.api.create(input, { skipHandleError: true }));
      this.toasts.success(d.id ? 'Field saved.' : 'Field added.', 'Custom fields');
      this.draft.set(null);
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The field could not be saved.'), 'Custom fields');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(f: CustomFieldDefinitionDto): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'field',
        f.label,
        'Values already saved on records stay, but the field no longer shows on forms or in segments.',
      ))
    )
      return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(f.id!, { skipHandleError: true }));
      this.toasts.success('Field deleted.', 'Custom fields');
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The field could not be deleted.'), 'Custom fields');
    } finally {
      this.busy.set(false);
    }
  }

  protected async installPack(): Promise<void> {
    this.busy.set(true);
    try {
      const before = this.fields().length;
      await firstValueFrom(this.api.installIndustrialPack({ skipHandleError: true }));
      await this.load();
      const added = this.fields().length - before;
      this.toasts.success(
        added > 0
          ? added === 1
            ? '1 field added.'
            : `${added} fields added.`
          : 'You already had every field in the pack.',
        'Custom fields',
      );
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The field pack could not be added.'), 'Custom fields');
    } finally {
      this.busy.set(false);
    }
  }
}
