/**
 * The nine things an industrial RFQ needs before anyone can quote it (M10-1). Eight live in the
 * enquiry's attributes under these keys; the expected order date is the enquiry's own
 * expected close date. Keys and bands match the API's EnquiryProfile.
 */
export interface ProfileField {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select';
  options?: readonly string[];
  /** The options come from the database: the account form's industry list (Settings → Pick lists keeps the others). */
  optionsFrom?: 'industries';
  /** Suggestions for a free-text field. */
  suggestions?: readonly string[];
  placeholder?: string;
}

export const BUDGET_BANDS = ['Under ₹5L', '₹5–10L', '₹10–50L', '₹50L–1Cr', 'Over ₹1Cr'] as const;

export const PROFILE_FIELDS: readonly ProfileField[] = [
  { key: 'application', label: 'Application', kind: 'text', placeholder: 'e.g. Bottling line' },
  { key: 'industry', label: 'Industry', kind: 'select', optionsFrom: 'industries' },
  {
    key: 'machine_process',
    label: 'Machine or process',
    kind: 'text',
    placeholder: 'e.g. Thermoforming',
  },
  { key: 'io_count', label: 'I/O count', kind: 'number', placeholder: 'e.g. 64' },
  {
    key: 'comm_protocol',
    label: 'Protocol',
    kind: 'text',
    suggestions: [
      'PROFINET',
      'EtherNet/IP',
      'Modbus TCP',
      'Modbus RTU',
      'PROFIBUS',
      'EtherCAT',
      'OPC UA',
      'Hardwired',
    ],
  },
  {
    key: 'brand_preference',
    label: 'Brand preference',
    kind: 'text',
    suggestions: [
      'Siemens',
      'Rockwell / Allen-Bradley',
      'Mitsubishi',
      'Schneider',
      'Delta',
      'Omron',
      'ABB',
      'No preference',
    ],
  },
  { key: 'budget_band', label: 'Budget band', kind: 'select', options: BUDGET_BANDS },
  {
    key: 'site_location',
    label: 'Site location',
    kind: 'text',
    placeholder: 'e.g. Chakan MIDC, Pune',
  },
];

/** The keys the drawer edits; anything else in the attributes is kept as it is. */
export const PROFILE_KEYS = new Set(PROFILE_FIELDS.map((f) => f.key));

/** How many of the nine are filled in, counting the expected order date. */
export function profileFilled(
  attributes: Record<string, string> | undefined,
  expectedCloseDate?: string,
): number {
  const a = attributes ?? {};
  return PROFILE_FIELDS.filter((f) => (a[f.key] ?? '').trim()).length + (expectedCloseDate ? 1 : 0);
}

/**
 * What to send for the profile: every key, with "" for a cleared one so the API removes it.
 * An I/O count is checked here first so a typo is caught before the round trip.
 */
export function profileInput(draft: Record<string, string>): Record<string, string> | string {
  const out: Record<string, string> = {};
  for (const f of PROFILE_FIELDS) {
    const v = (draft[f.key] ?? '').trim();
    if (f.key === 'io_count' && v && !/^\d{1,3}(,?\d{3})*$|^\d+$/.test(v)) {
      return 'The I/O count must be a whole number.';
    }
    out[f.key] = v;
  }
  return out;
}
