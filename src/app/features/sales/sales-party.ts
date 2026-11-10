import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountMasterDataService } from '../../core/services/account-master-data.service';
import { AccountStore } from '../../core/services/account.store';
import { ContactService } from '../../proxy/contacts/contact.service';
import type {
  AccountShippingAddressDto,
  ContactDto,
  CustomerAccountDto,
} from '../../proxy/contacts/models';

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

/** The ship-to an account starts with: its default shipping address, else its first, else none (-1: the billing address). */
export function defaultShipIndex(party: SalesParty): number {
  if (!party.shipTo.length) return -1;
  const i = party.shipTo.findIndex((s) => s.isDefault);
  return i >= 0 ? i : 0;
}

/** The site address for a ship-to choice: that shipping address, or the billing address. */
export function shipToText(party: SalesParty, index: number): string {
  return party.shipTo[index]?.text ?? party.billingAddress;
}

export const personName = (c: ContactDto): string =>
  c.displayName || c.waId || c.emailAddress || 'Unnamed';

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
      const accountId = (
        await firstValueFrom(this.contacts.get(contactId, { skipHandleError: true }))
      ).accountId;
      return accountId ? await this.forAccount(accountId) : EMPTY_PARTY;
    } catch {
      return EMPTY_PARTY;
    }
  }

  /** The account itself, when the document starts from the company rather than one of its people. */
  async forAccount(accountId: string): Promise<SalesParty> {
    try {
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
