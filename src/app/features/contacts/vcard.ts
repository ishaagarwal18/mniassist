/**
 * vCard (.vcf) reading for the contact import: phones' "Share contact" files and
 * exports from Google Contacts, Outlook and iCloud (vCard 2.1, 3.0 and 4.0).
 * Each card becomes a plain row; rows become the CSV the import API reads, so a
 * vCard goes through the same mapping, consent and dry-run steps as a spreadsheet.
 */

export interface CardContact {
  name: string;
  phone: string;
  /** Every number on the card, the chosen one first. */
  phones: string[];
  email: string;
  company: string;
  designation: string;
  city: string;
  state: string;
  website: string;
  note: string;
}

export const EMPTY_CARD: CardContact = {
  name: '',
  phone: '',
  phones: [],
  email: '',
  company: '',
  designation: '',
  city: '',
  state: '',
  website: '',
  note: '',
};

interface Line {
  name: string;
  params: Record<string, string[]>;
  value: string;
}

/** Joins folded lines (a continuation starts with a space or tab) and v2.1 soft line breaks. */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of raw) {
    if (/^[ \t]/.test(line) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else if (
      out.length &&
      /=$/.test(out[out.length - 1]) &&
      /QUOTED-PRINTABLE/i.test(out[out.length - 1])
    ) {
      out[out.length - 1] = out[out.length - 1].slice(0, -1) + line;
    } else {
      out.push(line);
    }
  }
  return out.filter((l) => l.trim().length > 0);
}

function decodeQuotedPrintable(value: string, charset = 'utf-8'): string {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '=' && /^[0-9A-F]{2}$/i.test(value.slice(i + 1, i + 3))) {
      bytes.push(parseInt(value.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(value.charCodeAt(i));
    }
  }
  try {
    return new TextDecoder(charset).decode(new Uint8Array(bytes));
  } catch {
    return String.fromCharCode(...bytes);
  }
}

/** vCard text escapes: \n, \, \; and \\. */
const unescape = (s: string) =>
  s
    .replace(/\\n/gi, '\n')
    .replace(/\\([,;\\])/g, '$1')
    .trim();

/** Splits on unescaped semicolons (structured values such as N and ADR). */
const parts = (s: string) => s.split(/(?<!\\);/).map(unescape);

function parseLine(line: string): Line | null {
  const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  let value = line.slice(colon + 1);
  const [rawName, ...rawParams] = head.split(';');
  const name = rawName.replace(/^item\d+\./i, '').toUpperCase();
  const params: Record<string, string[]> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    // vCard 2.1 writes bare types: TEL;CELL;VOICE:…
    const key = (eq < 0 ? 'TYPE' : p.slice(0, eq)).toUpperCase();
    const vals = (eq < 0 ? p : p.slice(eq + 1)).replace(/"/g, '').split(',');
    params[key] = [...(params[key] ?? []), ...vals.map((v) => v.toUpperCase())];
  }
  if (params['ENCODING']?.includes('QUOTED-PRINTABLE')) {
    value = decodeQuotedPrintable(value, params['CHARSET']?.[0]?.toLowerCase());
  }
  return { name, params, value };
}

/** Mobile and WhatsApp numbers first: the import needs one WhatsApp-reachable number. */
function phoneRank(l: Line): number {
  const t = l.params['TYPE'] ?? [];
  if (t.some((x) => x.includes('WHATSAPP'))) return 0;
  if (t.includes('CELL') || t.includes('MOBILE') || t.includes('IPHONE')) return 1;
  if (t.includes('PREF')) return 2;
  if (t.includes('FAX')) return 9;
  return 5;
}

const cleanPhone = (v: string) => v.replace(/^tel:/i, '').replace(/[^\d+]/g, '');

/** Every card in a .vcf file. Cards without a name or a number are skipped. */
export function parseVCards(text: string): CardContact[] {
  const cards: CardContact[] = [];
  let lines: Line[] | null = null;
  for (const raw of unfold(text)) {
    const line = parseLine(raw);
    if (!line) continue;
    if (line.name === 'BEGIN' && line.value.toUpperCase() === 'VCARD') {
      lines = [];
    } else if (line.name === 'END' && line.value.toUpperCase() === 'VCARD') {
      if (lines) {
        const card = fromLines(lines);
        if (card.name || card.phone) cards.push(card);
      }
      lines = null;
    } else if (lines) {
      lines.push(line);
    }
  }
  return cards;
}

function fromLines(lines: Line[]): CardContact {
  const first = (n: string) => lines.find((l) => l.name === n);
  const card: CardContact = { ...EMPTY_CARD };

  card.name = unescape(first('FN')?.value ?? '');
  if (!card.name) {
    const n = first('N');
    if (n) {
      const [family = '', given = '', middle = '', prefix = '', suffix = ''] = parts(n.value);
      card.name = [prefix, given, middle, family, suffix].filter(Boolean).join(' ');
    }
  }

  const phones = lines
    .filter((l) => l.name === 'TEL')
    .sort((a, b) => phoneRank(a) - phoneRank(b))
    .map((l) => cleanPhone(l.value))
    .filter((p) => p.replace(/\D/g, '').length >= 6);
  card.phones = [...new Set(phones)];
  card.phone = card.phones[0] ?? '';

  card.email = unescape(first('EMAIL')?.value ?? '');
  card.company = parts(first('ORG')?.value ?? '')[0] ?? '';
  card.designation = unescape(first('TITLE')?.value ?? first('ROLE')?.value ?? '');
  const adr = first('ADR');
  if (adr) {
    // PO box; extended; street; locality; region; postal code; country
    const a = parts(adr.value);
    card.city = a[3] ?? '';
    card.state = a[4] ?? '';
  }
  card.website = unescape(first('URL')?.value ?? '');
  card.note = unescape(first('NOTE')?.value ?? '');
  return card;
}

const CSV_COLUMNS: { key: keyof CardContact; header: string }[] = [
  { key: 'name', header: 'Name' },
  { key: 'phone', header: 'Phone' },
  { key: 'company', header: 'Company' },
  { key: 'designation', header: 'Designation' },
  { key: 'city', header: 'City' },
  { key: 'state', header: 'State' },
  { key: 'email', header: 'Email' },
  { key: 'website', header: 'Website' },
];

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The cards as CSV, with headers the import API maps on its own (Name, Phone, Company…). */
export function cardsToCsv(cards: readonly CardContact[]): string {
  const head = CSV_COLUMNS.map((c) => c.header).join(',');
  const rows = cards.map((card) =>
    CSV_COLUMNS.map((c) => csvCell(String(card[c.key] ?? ''))).join(','),
  );
  return [head, ...rows].join('\r\n');
}
