import { PublicWebFormFieldDto, WebFormFieldDto, WebFormFieldKind, WebFormFieldTarget } from '../../proxy/web-forms';

/** Names for the kinds of question, in the order the builder offers them. */
export const KIND_CHOICES: readonly { kind: WebFormFieldKind; label: string }[] = [
  { kind: WebFormFieldKind.Text, label: 'Short text' },
  { kind: WebFormFieldKind.Email, label: 'Email address' },
  { kind: WebFormFieldKind.Phone, label: 'Phone number' },
  { kind: WebFormFieldKind.LongText, label: 'Long text' },
  { kind: WebFormFieldKind.Select, label: 'Choice (pick one)' },
  { kind: WebFormFieldKind.Number, label: 'Number' },
  { kind: WebFormFieldKind.Checkbox, label: 'Tick box' },
];

export const TARGET_LABEL: Record<WebFormFieldTarget, string> = {
  [WebFormFieldTarget.None]: 'Keep with the enquiry',
  [WebFormFieldTarget.Name]: "Contact's name",
  [WebFormFieldTarget.Email]: "Contact's email",
  [WebFormFieldTarget.Phone]: "Contact's phone",
  [WebFormFieldTarget.Company]: "Contact's company",
  [WebFormFieldTarget.City]: "Contact's city",
  [WebFormFieldTarget.Requirement]: "Enquiry's requirement",
  [WebFormFieldTarget.EstimatedValue]: "Enquiry's value (₹)",
};

/** The kind of question each target needs, so the builder only offers targets that fit. */
const TARGET_KINDS: Partial<Record<WebFormFieldTarget, readonly WebFormFieldKind[]>> = {
  [WebFormFieldTarget.Name]: [WebFormFieldKind.Text],
  [WebFormFieldTarget.Email]: [WebFormFieldKind.Email],
  [WebFormFieldTarget.Phone]: [WebFormFieldKind.Phone],
  [WebFormFieldTarget.Company]: [WebFormFieldKind.Text],
  [WebFormFieldTarget.City]: [WebFormFieldKind.Text],
  [WebFormFieldTarget.Requirement]: [WebFormFieldKind.Text, WebFormFieldKind.LongText, WebFormFieldKind.Select],
  [WebFormFieldTarget.EstimatedValue]: [WebFormFieldKind.Number],
};

/** The targets a question of this kind can fill in. */
export function targetsFor(kind: WebFormFieldKind): WebFormFieldTarget[] {
  const fits = (Object.keys(TARGET_KINDS) as unknown as WebFormFieldTarget[]).filter((t) => TARGET_KINDS[t]!.includes(kind));
  return [WebFormFieldTarget.None, ...fits.map(Number)];
}

/** The kind a target most naturally is, for when a target is picked before the kind. */
export function kindFor(target: WebFormFieldTarget, current: WebFormFieldKind): WebFormFieldKind {
  const allowed = TARGET_KINDS[target];
  return !allowed || allowed.includes(current) ? current : allowed[0];
}

/** A name for an answer, made from the question's words: "Your phone number" becomes "your_phone_number". */
export function keyFromLabel(label: string, taken: ReadonlySet<string> = new Set()): string {
  const base =
    label
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^[^a-z]+/, '')
      .slice(0, 34) || 'question';
  let key = base;
  for (let n = 2; taken.has(key) || RESERVED.has(key); n++) key = `${base}_${n}`;
  return key;
}

const RESERVED = new Set(['consent', 'marketing_optin', 'website', 'hp', 'utm']);

/**
 * Why these questions do not make a usable form, or null. The same checks the server makes, so the builder can say so before saving; the server
 * still has the last word.
 */
export function fieldsProblem(fields: readonly WebFormFieldDto[]): string | null {
  if (fields.length === 0) return 'Add at least one question.';
  if (fields.length > 30) return 'A form can have at most 30 questions.';

  const keys = new Set<string>();
  const targets = new Set<WebFormFieldTarget>();
  for (const f of fields) {
    const label = f.label.trim();
    if (!label) return 'Every question needs a label.';
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(f.key) || RESERVED.has(f.key)) return `The name of "${label}" is not allowed. Use lower-case letters, digits and underscores.`;
    if (keys.has(f.key)) return `Two questions are named "${f.key}".`;
    keys.add(f.key);

    if (f.target !== WebFormFieldTarget.None) {
      if (targets.has(f.target)) return `More than one question fills in the ${TARGET_LABEL[f.target].toLowerCase()}. Only one can.`;
      targets.add(f.target);
      if (!TARGET_KINDS[f.target]!.includes(f.kind)) return `"${label}" is set to fill in the ${TARGET_LABEL[f.target].toLowerCase()}, which needs a different kind of question.`;
    }

    if (f.kind === WebFormFieldKind.Select) {
      const options = f.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) return `"${label}" is a choice, so it needs at least two options.`;
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return `The options of "${label}" must be different from each other.`;
    }
  }

  if (!targets.has(WebFormFieldTarget.Email) && !targets.has(WebFormFieldTarget.Phone)) {
    return "The form must ask for an email or a phone number, set to fill in the contact's email or phone. Otherwise there is nobody to follow up.";
  }
  return null;
}

/** What the visitor typed, checked the way the server will, so a mistake is caught before they press send. */
export function checkAnswers(fields: readonly PublicWebFormFieldDto[], answers: Readonly<Record<string, string>>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = (answers[f.key] ?? '').trim();
    if (f.kind === WebFormFieldKind.Checkbox) {
      if (f.required && v !== 'yes') errors[f.key] = `${f.label} needs to be ticked.`;
      continue;
    }
    if (!v) {
      if (f.required) errors[f.key] = `${f.label} is required.`;
      continue;
    }
    switch (f.kind) {
      case WebFormFieldKind.Email:
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) errors[f.key] = 'Enter a valid email address.';
        break;
      case WebFormFieldKind.Phone: {
        const digits = v.replace(/\D/g, '');
        if (/[^0-9+\s\-().]/.test(v) || digits.length < 10 || digits.length > 15) errors[f.key] = 'Enter a valid phone number.';
        break;
      }
      case WebFormFieldKind.Number:
        if (!/^\d[\d,]*(\.\d+)?$/.test(v)) errors[f.key] = 'Enter a number.';
        break;
      case WebFormFieldKind.Select:
        if (!f.options.some((o) => o.toLowerCase() === v.toLowerCase())) errors[f.key] = 'Choose one of the options.';
        break;
      case WebFormFieldKind.LongText:
        if (v.length > 4000) errors[f.key] = `${f.label} is too long.`;
        break;
      default:
        if (v.length > 200) errors[f.key] = `${f.label} is too long.`;
    }
  }
  return errors;
}

/** The campaign tags on the page's address: only these five, trimmed and short. Nothing else from the address is sent. */
export function campaignTags(search: string): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  const p = new URLSearchParams(search);
  const tag = (k: string, max: number) => {
    const v = (p.get(k) ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
    return v || undefined;
  };
  return { utmSource: tag('utm_source', 100), utmMedium: tag('utm_medium', 100), utmCampaign: tag('utm_campaign', 150) };
}

/** The per-question messages the server sent with a refused submission, by question key (and "consent"). */
export function serverFieldErrors(e: unknown): Record<string, string> {
  const list = (e as { error?: { error?: { validationErrors?: { message?: string; members?: string[] }[] } } })?.error?.error?.validationErrors;
  const out: Record<string, string> = {};
  for (const item of list ?? []) {
    for (const m of item.members ?? []) {
      // The server names a member in camel case ("consent"); questions are named as they were built.
      const key = m.length && /^[A-Z]/.test(m) ? m[0].toLowerCase() + m.slice(1) : m;
      if (item.message && !out[key]) out[key] = item.message;
    }
  }
  return out;
}

/** The address a form's page is shown at, taken apart: the code, and whether it is inside a frame on somebody's site. */
export function embedded(search: string): boolean {
  return new URLSearchParams(search).get('embed') === '1';
}
