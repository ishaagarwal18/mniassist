import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  DealRegistrationDto,
  DealRegistrationService,
  DealRegistrationStatus,
  OemSettingsService,
  OemSupplierDto,
  SaveDealRegistrationInput,
  SpaService,
} from '../../proxy/oem/oem-pricing.service';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import { EnquiryService } from '../../proxy/pipeline/enquiry.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { ArAccountSearch, PickedAccount } from '../projects/account-search';
import { REG_STATUS_TEXT, REG_STATUS_TONE, indiaDay, rupees, toPaise } from './oem.logic';

function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** A deal registration: new (from an enquiry with ?enquiry=) or an existing one, with the OEM's answer and the deal's end. */
@Component({
  selector: 'ar-registration-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, ArChip, ArAccountSearch, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registration-page.html',
  styleUrl: './oem-pages.scss',
})
export class ArRegistrationPage {
  private readonly api = inject(DealRegistrationService);
  private readonly oemsApi = inject(OemSettingsService);
  private readonly enquiries = inject(EnquiryService);
  private readonly spas = inject(SpaService);
  private readonly accounts = inject(CustomerAccountService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);

  protected readonly canCreate = grantedPolicy('AutoReach.Spa.Create', this.permissions);
  protected readonly canApprove = grantedPolicy('AutoReach.Spa.Approve', this.permissions);

  protected readonly id = signal<string | null>(null);
  protected readonly saved = signal<DealRegistrationDto | null>(null);
  protected readonly oems = signal<OemSupplierDto[]>([]);
  protected readonly customerName = signal('');
  protected readonly enquiryReference = signal<string | null>(null);
  protected readonly valueText = signal('');
  protected readonly oemRefText = signal('');
  protected readonly form = signal<SaveDealRegistrationInput>({
    supplierId: '',
    customerAccountId: '',
    registeredOn: today(),
  });
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly Status = DealRegistrationStatus;
  protected readonly rupees = rupees;

  protected readonly problem = computed(() => {
    const f = this.form();
    if (!f.supplierId) return 'Choose the OEM.';
    if (!f.customerAccountId) return 'Find the customer.';
    if (!f.registeredOn) return 'Give the date it was registered.';
    if (f.expiresOn && f.expiresOn < f.registeredOn)
      return "It can't end before it was registered.";
    return null;
  });

  constructor() {
    void this.load();
  }

  protected statusText(s: DealRegistrationStatus): string {
    return REG_STATUS_TEXT[s];
  }

  protected tone(s: DealRegistrationStatus) {
    return REG_STATUS_TONE[s];
  }

  protected patch(change: Partial<SaveDealRegistrationInput>): void {
    this.form.update((f) => ({ ...f, ...change }));
  }

  protected pickCustomer(a: PickedAccount): void {
    this.patch({ customerAccountId: a.id });
    this.customerName.set(a.name);
  }

  private async load(): Promise<void> {
    try {
      this.oems.set((await firstValueFrom(this.oemsApi.getList())).filter((o) => o.isOem));
      const id = this.route.snapshot.paramMap.get('id');
      if (id && id !== 'new') {
        this.id.set(id);
        this.fill(await firstValueFrom(this.api.get(id)));
        return;
      }
      const enquiryId = this.route.snapshot.queryParamMap.get('enquiry');
      if (enquiryId) {
        const e = await firstValueFrom(this.enquiries.get(enquiryId));
        this.enquiryReference.set(e.reference ?? null);
        this.patch({
          enquiryId,
          projectId: e.projectId ?? null,
          productsSummary: e.title ?? null,
          estimatedValueInPaise: e.estimatedValueInPaise ?? null,
        });
        if (e.estimatedValueInPaise) this.valueText.set(String(e.estimatedValueInPaise / 100));
        // The enquiry's customer is its contact's account: the special-price draft works it out.
        const draft = await firstValueFrom(this.spas.getDraftFromEnquiry(enquiryId));
        if (draft.customerAccountId) {
          const account = await firstValueFrom(this.accounts.get(draft.customerAccountId));
          this.pickCustomer({ id: draft.customerAccountId, name: account.name ?? '' });
        }
      }
    } catch (e) {
      this.error.set(readApiError(e, 'The registration could not be loaded.'));
    }
  }

  private fill(r: DealRegistrationDto): void {
    this.saved.set(r);
    this.customerName.set(r.customerName);
    this.enquiryReference.set(r.enquiryReference ?? null);
    this.valueText.set(r.estimatedValueInPaise ? String(r.estimatedValueInPaise / 100) : '');
    this.oemRefText.set(r.oemReference ?? '');
    this.form.set({
      supplierId: r.supplierId,
      oemReference: r.oemReference,
      customerAccountId: r.customerAccountId,
      enquiryId: r.enquiryId,
      projectId: r.projectId,
      productsSummary: r.productsSummary,
      estimatedValueInPaise: r.estimatedValueInPaise,
      registeredOn: indiaDay(r.registeredOn),
      expiresOn: indiaDay(r.expiresOn) || null,
      note: r.note,
      ownerUserId: r.ownerUserId,
    });
  }

  protected async save(): Promise<void> {
    if (this.problem()) return;
    this.busy.set(true);
    const input: SaveDealRegistrationInput = {
      ...this.form(),
      oemReference: this.oemRefText().trim() || null,
      estimatedValueInPaise: toPaise(this.valueText()),
    };
    try {
      const id = this.id();
      const saved = id
        ? await firstValueFrom(this.api.update(id, input))
        : await firstValueFrom(this.api.create(input));
      this.toasts.success(`${saved.reference} saved.`);
      if (!id) {
        await this.router.navigate(['/oem/registrations', saved.id]);
        this.id.set(saved.id);
      }
      this.fill(saved);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The registration could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async setStatus(status: DealRegistrationStatus): Promise<void> {
    const id = this.id();
    if (!id) return;
    this.busy.set(true);
    try {
      this.fill(
        await firstValueFrom(
          this.api.setStatus(id, {
            status,
            oemReference: this.oemRefText().trim() || null,
            expiresOn: this.form().expiresOn ?? null,
          }),
        ),
      );
      this.toasts.success(`Marked ${REG_STATUS_TEXT[status].toLowerCase()}.`);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The status could not be changed.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const r = this.saved();
    if (!r) return;
    const ok = await this.dialogs.confirm({
      title: `Delete ${r.reference}?`,
      message: 'A registration with special prices made under it can only be cancelled.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(r.id));
      await this.router.navigate(['/oem/registrations']);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The registration could not be deleted.'));
    }
  }
}
