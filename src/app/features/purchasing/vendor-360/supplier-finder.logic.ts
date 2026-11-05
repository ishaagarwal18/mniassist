import type { Vendor360SupplierDto } from '../../../proxy/purchasing/vendor-360.models';

/** The second line of a supplier in the finder: why it may not be usable, then how to tell it apart. */
export function supplierMatchDetail(s: Vendor360SupplierDto): string {
  const parts = [
    s.isBlacklisted ? 'Blacklisted' : !s.isActive ? 'Not in use' : null,
    s.gstin ?? null,
    s.contactName ?? null,
    s.phone ?? null,
  ].filter((p): p is string => !!p);
  return parts.join(' · ') || 'No GSTIN or contact recorded';
}

/** The server's rule, for sample data: every word of the search is in the name, GSTIN, phone or contact person. */
export function matchesEveryWord(s: Vendor360SupplierDto, term: string): boolean {
  const hay = [s.name, s.gstin, s.phone, s.contactName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}
