import { CustomFieldDefinitionDto, CustomFieldType } from '../../proxy/contacts';

/**
 * The workspace's custom fields on a contact or an enquiry. Values live in the record's attributes under
 * the field's key, written the way the API normalises them: a number, a date as yyyy-MM-dd, "true"/"false",
 * one option, or several options joined by ", ". These checks mirror the API's so the form can say what is
 * wrong before saving; the API checks again.
 */

/** Fields in the order the workspace set, with a stable fallback on the label. */
export function sortFields(
  fields: readonly CustomFieldDefinitionDto[],
): CustomFieldDefinitionDto[] {
  return [...fields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.label ?? '').localeCompare(b.label ?? ''),
  );
}

export function optionsOf(field: CustomFieldDefinitionDto): string[] {
  return [...(field.options ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((o) => o.value ?? '')
    .filter((v) => v);
}

/** The chosen options of a multi-select value. */
export function splitMulti(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v);
}

/** Adds or removes one option, keeping the field's own option order. */
export function toggleMulti(
  field: CustomFieldDefinitionDto,
  value: string | undefined,
  option: string,
): string {
  const chosen = new Set(splitMulti(value));
  if (chosen.has(option)) chosen.delete(option);
  else chosen.add(option);
  return optionsOf(field)
    .filter((o) => chosen.has(o))
    .join(', ');
}

/** What is wrong with a value, or null when it can be saved. */
export function customFieldProblem(
  field: CustomFieldDefinitionDto,
  raw: string | undefined,
): string | null {
  const value = (raw ?? '').trim();
  const label = field.label ?? field.key ?? 'This field';
  if (!value) return field.isRequired ? `${label} is required.` : null;

  switch (field.type) {
    case CustomFieldType.Number:
      return /^-?\d+(\.\d+)?$/.test(value.replace(/,/g, '')) ? null : `${label} must be a number.`;
    case CustomFieldType.Date:
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
        ? null
        : `${label} must be a date.`;
    case CustomFieldType.Boolean:
      return value === 'true' || value === 'false' ? null : `${label} must be yes or no.`;
    case CustomFieldType.SingleSelect:
      return optionsOf(field).includes(value) ? null : `Choose one of the options for ${label}.`;
    case CustomFieldType.MultiSelect: {
      const known = optionsOf(field);
      return splitMulti(value).every((v) => known.includes(v))
        ? null
        : `Choose from the options for ${label}.`;
    }
    default:
      return value.length > 1000 ? `${label} is too long.` : null;
  }
}

/** Every problem, keyed by field key; empty when all values can be saved. */
export function customFieldProblems(
  fields: readonly CustomFieldDefinitionDto[],
  values: Record<string, string>,
): Record<string, string> {
  const problems: Record<string, string> = {};
  for (const f of fields) {
    if (!f.key) continue;
    const p = customFieldProblem(f, values[f.key]);
    if (p) problems[f.key] = p;
  }
  return problems;
}

/**
 * The attributes to send: one entry per field, trimmed, numbers without thousands separators. A blank
 * value is sent as "" so the API removes it (attributes are merged, so leaving a key out keeps the old value).
 */
export function customFieldAttributes(
  fields: readonly CustomFieldDefinitionDto[],
  values: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (!f.key) continue;
    let v = (values[f.key] ?? '').trim();
    if (f.type === CustomFieldType.Number) v = v.replace(/,/g, '');
    out[f.key] = v;
  }
  return out;
}

/** The stored values of these fields, from a record's attributes. */
export function customFieldValuesOf(
  fields: readonly CustomFieldDefinitionDto[],
  attributes: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  const lower = new Map(Object.entries(attributes ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  for (const f of fields) {
    if (f.key) out[f.key] = lower.get(f.key.toLowerCase()) ?? '';
  }
  return out;
}

/** A value as people read it, for the record's details view. */
export function showCustomValue(field: CustomFieldDefinitionDto, raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '—';
  if (field.type === CustomFieldType.Boolean) return value === 'true' ? 'Yes' : 'No';
  if (field.type === CustomFieldType.Date) {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return value;
}
