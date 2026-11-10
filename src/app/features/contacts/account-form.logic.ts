/** One shipping address as typed on the form. */
export interface ShippingDraft {
  label: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  isDefault: boolean;
}

export const BLANK_SHIPPING_DRAFT: ShippingDraft = {
  label: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  isDefault: false,
};

export interface AccountDraft {
  name: string;
  industry: string;
  gstin: string;
  /** Street lines of the billing address. */
  address: string;
  billingPincode: string;
  shipping: ShippingDraft[];
  city: string;
  state: string;
  website: string;
  notes: string;
  parentId: string;
}

export const BLANK_ACCOUNT_DRAFT: AccountDraft = {
  name: '',
  industry: '',
  gstin: '',
  address: '',
  billingPincode: '',
  shipping: [],
  city: '',
  state: '',
  website: '',
  notes: '',
  parentId: '',
};

export function validateAccountDraft(draft: AccountDraft): string | null {
  if (!draft.name || !draft.name.trim()) {
    return 'An account name is required.';
  }
  if (draft.name.trim().length > 256) {
    return 'Account name cannot exceed 256 characters.';
  }
  if (draft.website && draft.website.trim().length > 512) {
    return 'Website URL cannot exceed 512 characters.';
  }
  if (draft.gstin.trim() && !isValidGstin(draft.gstin)) {
    return "That GSTIN isn't valid. It has 15 characters, like 27ABCDE1234F1Z5.";
  }
  if (draft.billingPincode.trim() && !isValidPincode(draft.billingPincode)) {
    return 'Enter the billing PIN code as six digits.';
  }
  for (const [i, s] of draft.shipping.entries()) {
    const which = s.label.trim() || `Shipping address ${i + 1}`;
    if (!s.address.trim()) return `${which}: enter the address, or remove it.`;
    if (s.pincode.trim() && !isValidPincode(s.pincode))
      return `${which}: enter the PIN code as six digits.`;
    if (s.gstin.trim() && !isValidGstin(s.gstin)) return `${which}: that GSTIN isn't valid.`;
  }
  return null;
}

export function getHierarchyPlacementInfo(
  parentId: string,
  parentName?: string | null,
): { isTopLevel: boolean; label: string; description: string } {
  if (!parentId) {
    return {
      isTopLevel: true,
      label: 'Corporate Group / Holding Entity',
      description: 'This account will sit at the root level of your corporate hierarchy.',
    };
  }

  const name = parentName || 'Selected Parent';
  return {
    isTopLevel: false,
    label: `Subsidiary under ${name}`,
    description: `This account will be organized as an operating plant/subsidiary under ${name}.`,
  };
}

/** A new state: the cities offered are the state's (from the database); a city not in it is cleared. */
export function handleStateChange(
  newState: string,
  currentCity: string,
  cities: readonly string[],
): { state: string; city: string; availableCities: readonly string[] } {
  const cityStillValid =
    !currentCity || cities.some((c) => c.toLowerCase() === currentCity.toLowerCase());
  return {
    state: newState,
    city: cityStillValid ? currentCity : '',
    availableCities: cities,
  };
}

/** A city picked before a state: the state it is in, when the database knows it. */
export function handleCityChange(
  newCity: string,
  currentState: string,
  stateForCity: (city: string) => string | null,
): { state: string; city: string } {
  if (!currentState && newCity) {
    const inferredState = stateForCity(newCity);
    if (inferredState) {
      return { state: inferredState, city: newCity };
    }
  }
  return { state: currentState, city: newCity };
}

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** The shape of an Indian GSTIN — the same rule the server applies. */
export function isValidGstin(value: string): boolean {
  return GSTIN.test(value.trim().toUpperCase());
}

export function isValidPincode(value: string): boolean {
  return /^[1-9][0-9]{5}$/.test(value.trim());
}

/** The GST state code a GSTIN starts with, or null while it is too short to say. */
export function gstinStateCode(value: string): string | null {
  const code = value.trim().slice(0, 2);
  return /^[0-9]{2}$/.test(code) ? code : null;
}
