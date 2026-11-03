import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionService } from '@abp/ng.core';

import { AccountStore, CustomerAccount, moveProblem } from '../../core/services/account.store';
import { AccountMasterDataService } from '../../core/services/account-master-data.service';
import {
  AccountDraft,
  BLANK_ACCOUNT_DRAFT,
  BLANK_SHIPPING_DRAFT,
  ShippingDraft,
  getHierarchyPlacementInfo,
  gstinStateCode,
  handleCityChange,
  handleStateChange,
  validateAccountDraft,
} from './account-form.logic';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArIcon } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ToastService } from '../../core/ui/toast.service';
import { grantedPolicy } from '../../core/auth/permission';

@Component({
  selector: 'ar-account-form',
  imports: [ArTopbar, ArButton, ArCard, ArBanner, ArIcon, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-form.html',
  styleUrl: './account-form.scss',
})
export class ArAccountForm {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(AccountStore);
  private readonly masterData = inject(AccountMasterDataService);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly canCreate = grantedPolicy('AutoReach.Contacts.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Contacts.Update', this.permissions);

  protected readonly editingId = signal<string | null>(null);
  protected readonly isEdit = computed(() => !!this.editingId());
  protected readonly draft = signal<AccountDraft>({ ...BLANK_ACCOUNT_DRAFT });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  // Master Data collections for dropdowns bound from backend
  protected readonly industries = this.masterData.industries;
  protected readonly states = this.masterData.states;
  protected readonly availableCities = computed(() => {
    return this.masterData.getCitiesForState(this.draft().state);
  });

  // Adding Custom Industry
  protected readonly addingIndustry = signal(false);
  protected readonly customIndustryInput = signal('');

  // Adding Custom City
  protected readonly addingCity = signal(false);
  protected readonly customCityInput = signal('');

  protected startAddIndustry(): void {
    this.addingIndustry.set(true);
    this.customIndustryInput.set('');
  }

  protected cancelAddIndustry(): void {
    this.addingIndustry.set(false);
    this.customIndustryInput.set('');
  }

  protected confirmAddIndustry(): void {
    const val = this.customIndustryInput().trim();
    if (!val) return;
    this.masterData.addIndustry(val);
    this.patch('industry', val);
    this.addingIndustry.set(false);
    this.customIndustryInput.set('');
    this.toast.success(`Industry "${val}" added and selected.`);
  }

  protected onIndustrySelectChange(val: string): void {
    if (val === '__ADD_NEW__') {
      this.startAddIndustry();
    } else {
      this.patch('industry', val);
    }
  }

  protected startAddCity(): void {
    this.addingCity.set(true);
    this.customCityInput.set('');
  }

  protected cancelAddCity(): void {
    this.addingCity.set(false);
    this.customCityInput.set('');
  }

  protected confirmAddCity(): void {
    const val = this.customCityInput().trim();
    if (!val) return;
    const state = this.draft().state || null;
    this.masterData.addCity(val, state);
    this.onCitySelect(val);
    this.addingCity.set(false);
    this.customCityInput.set('');
    this.toast.success(`City "${val}" added and selected.`);
  }

  protected onCitySelectChange(val: string): void {
    if (val === '__ADD_NEW__') {
      this.startAddCity();
    } else {
      this.onCitySelect(val);
    }
  }

  /** Accounts the current one may sit under (avoids cycles and depth limit) */
  protected readonly parentOptions = computed(() => {
    const id = this.editingId();
    return this.store
      .all()
      .filter((a) => a.id !== id && moveProblem(id, a.id, this.store.all()) === null);
  });

  /** Information banner about where this account sits in the hierarchy */
  protected readonly hierarchyInfo = computed(() => {
    const parentId = this.draft().parentId;
    const parent = parentId ? this.store.all().find((a) => a.id === parentId) : null;
    return getHierarchyPlacementInfo(parentId, parent?.name);
  });

  constructor() {
    // 1. Check route params: ':accountId' for edit mode
    this.route.paramMap.subscribe((params) => {
      const id = params.get('accountId');
      this.editingId.set(id);
    });

    // 2. Check query params: '?parentId=...' for creating a subsidiary under parent
    this.route.queryParamMap.subscribe((query) => {
      const pId = query.get('parentId');
      if (pId && !this.editingId()) {
        this.draft.update((d) => ({ ...d, parentId: pId }));
      }
    });

    // 3. In edit mode, load the account in full: the list leaves out its shipping addresses.
    effect(() => {
      const id = this.editingId();
      if (id) void this.loadAccount(id);
    });
  }

  private async loadAccount(id: string): Promise<void> {
    try {
      const a = await this.store.details(id);
      if (!a || this.editingId() !== id) return;
      this.draft.set({
        name: a.name ?? '',
        industry: a.industry ?? '',
        gstin: a.gstin ?? '',
        address: a.billingAddress ?? '',
        billingPincode: a.billingPincode ?? '',
        shipping: (a.shippingAddresses ?? []).map((s) => ({
          label: s.label ?? '',
          address: s.address ?? '',
          city: s.city ?? '',
          state: s.state ?? '',
          pincode: s.pincode ?? '',
          gstin: s.gstin ?? '',
          isDefault: !!s.isDefault,
        })),
        city: a.city ?? '',
        state: a.state ?? '',
        website: a.website ?? '',
        notes: a.notes ?? '',
        parentId: a.parentAccountId ?? '',
      });
    } catch {
      this.error.set('The account could not be loaded.');
    }
  }

  /** Upper-cases the GSTIN as typed, and fills the billing state from its first two digits when none is chosen. */
  protected onGstinInput(value: string): void {
    const gstin = value.toUpperCase().replace(/\s/g, '');
    this.patch('gstin', gstin);
    if (!this.draft().state) {
      const state = this.masterData.stateForCode(gstinStateCode(gstin));
      if (state) this.onStateSelect(state);
    }
  }

  // ---- shipping addresses ----

  protected addShipping(): void {
    this.draft.update((d) => ({
      ...d,
      shipping: [
        ...d.shipping,
        {
          ...BLANK_SHIPPING_DRAFT,
          label: d.shipping.length ? `Site ${d.shipping.length + 1}` : 'Main plant',
          isDefault: d.shipping.length === 0,
        },
      ],
    }));
  }

  /** A new shipping address filled from the billing address — the usual case for a single-site customer. */
  protected addShippingFromBilling(): void {
    const d = this.draft();
    this.draft.set({
      ...d,
      shipping: [
        ...d.shipping,
        {
          label: d.shipping.length ? `Site ${d.shipping.length + 1}` : 'Main plant',
          address: d.address,
          city: d.city,
          state: d.state,
          pincode: d.billingPincode,
          gstin: d.gstin,
          isDefault: d.shipping.length === 0,
        },
      ],
    });
  }

  protected removeShipping(index: number): void {
    this.draft.update((d) => {
      const shipping = d.shipping.filter((_, i) => i !== index);
      if (shipping.length && !shipping.some((s) => s.isDefault)) {
        shipping[0] = { ...shipping[0], isDefault: true };
      }
      return { ...d, shipping };
    });
  }

  protected patchShipping<K extends keyof ShippingDraft>(
    index: number,
    key: K,
    value: ShippingDraft[K],
  ): void {
    this.draft.update((d) => ({
      ...d,
      shipping: d.shipping.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    }));
  }

  protected setDefaultShipping(index: number): void {
    this.draft.update((d) => ({
      ...d,
      shipping: d.shipping.map((s, i) => ({ ...s, isDefault: i === index })),
    }));
  }

  protected shippingCities(state: string): readonly string[] {
    return this.masterData.getCitiesForState(state);
  }

  protected patch<K extends keyof AccountDraft>(key: K, value: AccountDraft[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected onStateSelect(newState: string): void {
    const currentCity = this.draft().city;
    const res = handleStateChange(newState, currentCity);
    this.draft.update((d) => ({
      ...d,
      state: res.state,
      city: res.city,
    }));
  }

  protected onCitySelect(newCity: string): void {
    const currentState = this.draft().state;
    const res = handleCityChange(newCity, currentState);
    this.draft.update((d) => ({
      ...d,
      state: res.state,
      city: res.city,
    }));
  }

  protected cancel(): void {
    void this.router.navigate(['/contacts/accounts']);
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    const problem = validateAccountDraft(d);
    if (problem) {
      this.error.set(problem);
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      const id = this.editingId();
      await this.store.save(id, {
        name: d.name.trim(),
        industry: d.industry.trim() || null,
        gstin: d.gstin.trim().toUpperCase() || null,
        billingAddress: d.address.trim() || null,
        billingPincode: d.billingPincode.trim() || null,
        shippingAddresses: d.shipping.map((s) => ({
          label: s.label.trim(),
          address: s.address.trim(),
          city: s.city.trim() || null,
          state: s.state.trim() || null,
          pincode: s.pincode.trim() || null,
          gstin: s.gstin.trim().toUpperCase() || null,
          isDefault: s.isDefault,
        })),
        city: d.city.trim() || null,
        state: d.state.trim() || null,
        website: d.website.trim() || null,
        notes: d.notes.trim() || null,
        parentAccountId: d.parentId || null,
      });

      this.toast.success(
        id
          ? `Account "${d.name.trim()}" updated.`
          : `Account "${d.name.trim()}" created successfully.`,
      );
      void this.router.navigate(['/contacts/accounts']);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the account.');
    } finally {
      this.busy.set(false);
    }
  }
}
