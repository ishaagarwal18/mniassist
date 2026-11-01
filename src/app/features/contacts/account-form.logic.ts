import {
  getCitiesForState,
  getMasterIndustries,
  getMasterStateNames,
  getStateForCity,
} from '../../core/models/account-master-data';

export interface AccountDraft {
  name: string;
  industry: string;
  address: string;
  city: string;
  state: string;
  website: string;
  notes: string;
  parentId: string;
}

export const BLANK_ACCOUNT_DRAFT: AccountDraft = {
  name: '',
  industry: '',
  address: '',
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

export function handleStateChange(
  newState: string,
  currentCity: string,
): { state: string; city: string; availableCities: readonly string[] } {
  const cities = getCitiesForState(newState);
  const cityStillValid = !currentCity || cities.some((c) => c.toLowerCase() === currentCity.toLowerCase());
  return {
    state: newState,
    city: cityStillValid ? currentCity : '',
    availableCities: cities,
  };
}

export function handleCityChange(
  newCity: string,
  currentState: string,
): { state: string; city: string } {
  if (!currentState && newCity) {
    const inferredState = getStateForCity(newCity);
    if (inferredState) {
      return { state: inferredState, city: newCity };
    }
  }
  return { state: currentState, city: newCity };
}
