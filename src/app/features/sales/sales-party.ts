import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountMasterDataService } from '../../core/services/account-master-data.service';
import { AccountStore } from '../../core/services/account.store';
import { ContactService } from '../../proxy/contacts/contact.service';
import type { AccountShippingAddressDto, CustomerAccountDto } from '../../proxy/contacts/models';

/** One place goods can go, as a new invoice or challan offers it. */
export interface ShipToOption {
  label: string;
  /** The full address on one block of text, as printed on the document. */
  text: string;
  gstin?: string | null;
  stateCode?: string | null;
  isDefault: boolean;
}

/** What a new sales document needs from the customer's account. */
export interface SalesParty {
  accountId: string | null;
  accountName: string | null;
  gstin: string | null;
  billingAddress: string;
  /** GST state code of the billing address (from the GSTIN, else the state). */
  billingStateCode: string | null;
  shipTo: ShipToOption[];
}

export const EMPTY_PARTY: SalesParty = {
  accountId: null,
  accountName: null,
  gstin: null,
  billingAddress: '',
  billingStateCode: null,
  shipTo: [],
};

/** Address lines, then "City, State PIN", skipping what is blank. */
export function formatAddress(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  pincode?: string | null,
): string {
  const place = [city, state].filter((x) => x && x.trim()).join(', ');
  const last = [place, pincode?.trim()].filter(Boolean).join(' ');
  return [street?.trim(), last].filter(Boolean).join('\n');
}

/**
 * Looks up a customer's company (the contact's account) so a new invoice or challan starts with its GSTIN, billing address and
 * shipping addresses filled in. A contact with no account gives an empty party: the user types the details.
 */
@Injectable({ providedIn: 'root' })
export class SalesPartyService {
  private readonly contacts = inject(ContactService);
  private readonly accounts = inject(AccountStore);
  private readonly masterData = inject(AccountMasterDataService);

  async forContact(contactId: string): Promise<SalesParty> {
    try {
      const accountId = environment.useMockData
        ? null
        : (await firstValueFrom(this.contacts.get(contactId, { skipHandleError: true }))).accountId;
      if (!accountId) return EMPTY_PARTY;
      const account = await this.accounts.details(accountId);
      return account ? this.fromAccount(account) : EMPTY_PARTY;
    } catch {
      return EMPTY_PARTY;
    }
  }

  stateCode(stateName?: string | null): string | null {
    return this.masterData.stateCode(stateName);
  }

  private fromAccount(a: CustomerAccountDto): SalesParty {
    const gstin = a.gstin?.trim() || null;
    const billingAddress = formatAddress(a.billingAddress, a.city, a.state, a.billingPincode);
    return {
      accountId: a.id ?? null,
      accountName: a.name ?? null,
      gstin,
      billingAddress,
      billingStateCode: gstin ? gstin.slice(0, 2) : this.masterData.stateCode(a.state),
      shipTo: (a.shippingAddresses ?? []).map((s) => this.shipTo(s)),
    };
  }

  private shipTo(s: AccountShippingAddressDto): ShipToOption {
    const gstin = s.gstin?.trim() || null;
    return {
      label: s.label,
      text: formatAddress(s.address, s.city, s.state, s.pincode),
      gstin,
      stateCode: gstin ? gstin.slice(0, 2) : this.masterData.stateCode(s.state),
      isDefault: !!s.isDefault,
    };
  }
}
