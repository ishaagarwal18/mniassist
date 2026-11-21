/**
 * A Corporate Identity Number: listed (L) or unlisted (U), a 5-digit industry code, the 2-letter
 * state, the 4-digit year, the 3-letter company type and a 6-digit registration number,
 * e.g. U72900MH2015PTC123456.
 */
const CIN = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;

/** The CIN in capitals with spaces removed, or null when it is blank or not a valid CIN. */
export function cleanCin(cin: string | null | undefined): string | null {
  const c = (cin ?? '').replace(/\s+/g, '').toUpperCase();
  return CIN.test(c) ? c : null;
}

/** The registered address on one line, with surplus whitespace removed; null when blank. */
export function cleanAddress(address: string | null | undefined): string | null {
  const a = (address ?? '').replace(/\s+/g, ' ').trim();
  return a || null;
}
