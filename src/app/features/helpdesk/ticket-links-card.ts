import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { EnquiryService } from '../../proxy/pipeline/enquiry.service';
import { InstalledAssetService } from '../../proxy/pipeline/installed-asset.service';
import type { EnquiryDto, InstalledAssetDto } from '../../proxy/pipeline/models';
import type { ServiceTicketDto } from '../../proxy/support/service-ticket.models';
import { ServiceTicketService } from '../../proxy/support/service-ticket.service';
import { ArButton, ArCard } from '../../ui';

/**
 * What a ticket is linked to: one of the customer's enquiries (the fix shows in the deal's history) and the machine it is
 * about. Only the customer's own enquiries and machines are offered.
 */
@Component({
  selector: 'ar-ticket-links-card',
  imports: [ArCard, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-card heading="Linked to">
      <div class="tl">
        <label class="ar-field" for="tl-enquiry">
          <span class="ar-field__label">Enquiry</span>
          <select
            id="tl-enquiry"
            class="ar-field__input"
            [disabled]="!canEdit() || busy()"
            (change)="enquiryId.set($any($event.target).value)"
          >
            <option value="" [selected]="!enquiryId()">Not linked</option>
            @for (e of enquiries(); track e.id) {
              <option [value]="e.id" [selected]="e.id === enquiryId()" translate="no">
                {{ e.reference }} · {{ e.title }}
              </option>
            }
          </select>
        </label>
        <label class="ar-field" for="tl-asset">
          <span class="ar-field__label">Machine</span>
          <select
            id="tl-asset"
            class="ar-field__input"
            [disabled]="!canEdit() || busy()"
            (change)="assetId.set($any($event.target).value)"
          >
            <option value="" [selected]="!assetId()">Not linked</option>
            @for (a of assets(); track a.id) {
              <option [value]="a.id" [selected]="a.id === assetId()" translate="no">
                {{ a.description }}{{ a.serialNumber ? ' · ' + a.serialNumber : '' }}
              </option>
            }
          </select>
        </label>
        @if (canEdit() && changed()) {
          <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
            {{ busy() ? 'Saving…' : 'Save links' }}
          </button>
        }
      </div>
    </ar-card>
  `,
  styles: `
    .tl {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  `,
})
export class ArTicketLinksCard {
  private readonly api = inject(ServiceTicketService);
  private readonly enquiryApi = inject(EnquiryService);
  private readonly assetApi = inject(InstalledAssetService);
  private readonly toasts = inject(ToastService);

  readonly ticket = input.required<{
    id: string;
    contactId: string;
    contactName?: string | null;
    enquiryId?: string | null;
    installedAssetId?: string | null;
  }>();
  readonly canEdit = input(false);
  readonly saved = output<ServiceTicketDto>();

  protected readonly enquiries = signal<EnquiryDto[]>([]);
  protected readonly assets = signal<InstalledAssetDto[]>([]);
  protected readonly enquiryId = signal('');
  protected readonly assetId = signal('');
  protected readonly busy = signal(false);

  constructor() {
    effect(() => {
      const t = this.ticket();
      untracked(() => {
        this.enquiryId.set(t.enquiryId ?? '');
        this.assetId.set(t.installedAssetId ?? '');
        void this.load(t);
      });
    });
  }

  protected changed(): boolean {
    const t = this.ticket();
    return (
      this.enquiryId() !== (t.enquiryId ?? '') || this.assetId() !== (t.installedAssetId ?? '')
    );
  }

  private async load(t: { contactId: string; contactName?: string | null }): Promise<void> {
    try {
      const [assets, enquiries] = await Promise.all([
        firstValueFrom(
          this.assetApi.getList(
            { contactId: t.contactId, maxResultCount: 200, skipCount: 0 },
            { skipHandleError: true },
          ),
        ),
        // Enquiries have no customer filter; search by the customer's name and keep only theirs.
        t.contactName
          ? firstValueFrom(
              this.enquiryApi.getList(
                { filter: t.contactName, maxResultCount: 100, skipCount: 0 },
                { skipHandleError: true },
              ),
            )
          : Promise.resolve({ items: [] as EnquiryDto[] }),
      ]);
      this.assets.set(assets.items ?? []);
      this.enquiries.set((enquiries.items ?? []).filter((e) => e.contactId === t.contactId));
    } catch {
      // Without the lists the links stay as they are.
    }
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.link(
          this.ticket().id,
          { enquiryId: this.enquiryId() || null, installedAssetId: this.assetId() || null },
          { skipHandleError: true },
        ),
      );
      this.saved.emit(saved);
      this.toasts.success('Links saved.', 'Ticket');
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The links could not be saved.'), 'Ticket');
    } finally {
      this.busy.set(false);
    }
  }
}
