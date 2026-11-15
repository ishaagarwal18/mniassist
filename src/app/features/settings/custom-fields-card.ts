import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { CustomFieldEntity } from '../../proxy/contacts/custom-field-entity.enum';
import { CustomFieldService } from '../../proxy/contacts/custom-field.service';
import { CustomFieldType } from '../../proxy/contacts/custom-field-type.enum';
import type { CustomFieldDefinitionDto } from '../../proxy/contacts/models';
import { ArButton, ArChip } from '../../ui';

const TYPE: Record<CustomFieldType, string> = {
  [CustomFieldType.Text]: 'Text',
  [CustomFieldType.Number]: 'Number',
  [CustomFieldType.Date]: 'Date',
  [CustomFieldType.SingleSelect]: 'Pick one',
  [CustomFieldType.MultiSelect]: 'Pick several',
  [CustomFieldType.Boolean]: 'Yes / no',
};

/** The workspace's extra contact and enquiry fields, and a one-click industrial pack (plant, OEM, segment…). */
@Component({
  selector: 'ar-custom-fields-card',
  imports: [ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
  `,
  template: `
    <section class="wp__card">
      <div class="wp__row">
        <h2 class="wp__title wp__grow">Custom fields</h2>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="busy()"
          (click)="installPack()"
        >
          {{ busy() ? 'Adding…' : 'Add industrial field pack' }}
        </button>
      </div>
      <p class="wp__muted">
        Extra details kept on contacts and enquiries. The pack adds the usual industrial ones;
        fields you already have are kept.
      </p>
      <ul class="wp__list">
        @for (f of fields(); track f.id) {
          <li class="wp__item">
            <span class="wp__grow">
              <span class="wp__name" translate="no">{{ f.label }}</span>
              <span class="wp__sub">
                {{ f.appliesTo === enquiry ? 'Enquiry' : 'Contact' }} · {{ type(f.type) }}
                @if (f.options?.length) {
                  · {{ f.options!.length }} choices
                }
              </span>
            </span>
            @if (f.isRequired) {
              <ar-chip tone="warn">Required</ar-chip>
            }
            @if (f.isSystem) {
              <ar-chip tone="neutral">Built in</ar-chip>
            }
          </li>
        } @empty {
          <li class="wp__empty">No custom fields yet.</li>
        }
      </ul>
    </section>
  `,
})
export class ArCustomFieldsCard implements OnInit {
  private readonly api = inject(CustomFieldService);
  private readonly toasts = inject(ToastService);

  protected readonly enquiry = CustomFieldEntity.Enquiry;
  protected readonly fields = signal<CustomFieldDefinitionDto[]>([]);
  protected readonly busy = signal(false);

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

  protected async installPack(): Promise<void> {
    this.busy.set(true);
    try {
      const before = this.fields().length;
      await firstValueFrom(this.api.installIndustrialPack({ skipHandleError: true }));
      await this.load();
      const added = this.fields().length - before;
      this.toasts.success(
        added > 0
          ? `${added} field${added === 1 ? '' : 's'} added.`
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
