import {
  SupplierListDto,
  SupplierListItemDto,
  SupplierListSort,
  SupplierListStatus,
} from '../../../proxy/inventory/purchasing.service';

/** Rows on one page of Purchasing › Suppliers. */
export const SUPPLIER_PAGE_SIZE = 50;

export interface SupplierQuery {
  filter: string;
  status: SupplierListStatus;
  withDuesOnly: boolean;
  sort: SupplierListSort;
  /** 0-based. */
  page: number;
}

export const BLANK_SUPPLIER_QUERY: SupplierQuery = {
  filter: '',
  status: SupplierListStatus.All,
  withDuesOnly: false,
  sort: SupplierListSort.Name,
  page: 0,
};

/** "1–50 of 1,243", or nothing on an empty page. */
export function pageLabel(page: number, shown: number, total: number): string {
  if (!total || !shown) return '';
  const from = page * SUPPLIER_PAGE_SIZE + 1;
  const n = (v: number) => v.toLocaleString('en-IN');
  return `${n(from)}–${n(from + shown - 1)} of ${n(total)}`;
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / SUPPLIER_PAGE_SIZE));
}

/** The query kept in the address (`sq`, `ss`, `sd`, `so`, `sp`), so coming back from editing a supplier finds the same page. */
export function readSupplierQuery(
  params: Record<string, string | null | undefined>,
): SupplierQuery {
  const int = (v: string | null | undefined, max: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= max ? n : 0;
  };
  return {
    filter: (params['sq'] ?? '').slice(0, 128),
    status: int(params['ss'], 3) as SupplierListStatus,
    withDuesOnly: params['sd'] === '1',
    sort: int(params['so'], 2) as SupplierListSort,
    page: int(params['sp'], 100_000),
  };
}

export function supplierQueryParams(q: SupplierQuery): Record<string, string | null> {
  return {
    sq: q.filter.trim() || null,
    ss: q.status ? String(q.status) : null,
    sd: q.withDuesOnly ? '1' : null,
    so: q.sort ? String(q.sort) : null,
    sp: q.page ? String(q.page) : null,
  };
}

/** The server's rules, applied to a list in the browser: search, status, dues, order and paging. */
export function localSupplierPage(all: SupplierListItemDto[], q: SupplierQuery): SupplierListDto {
  const words = q.filter.toLowerCase().split(/\s+/).filter(Boolean);
  const searched = all.filter((s) => {
    const hay = [s.name, s.gstin, s.phone, s.email, s.contactName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const active = (s: SupplierListItemDto) => s.isActive && !s.isBlacklisted;
  const notInUse = (s: SupplierListItemDto) => !s.isActive && !s.isBlacklisted;
  let rows = searched.filter((s) =>
    q.status === SupplierListStatus.Active
      ? active(s)
      : q.status === SupplierListStatus.NotInUse
        ? notInUse(s)
        : q.status === SupplierListStatus.Blacklisted
          ? !!s.isBlacklisted
          : true,
  );
  if (q.withDuesOnly) rows = rows.filter((s) => (s.outstandingPayableInPaise ?? 0) > 0);
  rows = [...rows].sort((a, b) =>
    q.sort === SupplierListSort.OutstandingHighest
      ? (b.outstandingPayableInPaise ?? 0) - (a.outstandingPayableInPaise ?? 0) ||
        a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name),
  );
  return {
    totalCount: rows.length,
    items: rows.slice(q.page * SUPPLIER_PAGE_SIZE, (q.page + 1) * SUPPLIER_PAGE_SIZE),
    allCount: searched.length,
    activeCount: searched.filter(active).length,
    notInUseCount: searched.filter(notInUse).length,
    blacklistedCount: searched.filter((s) => !!s.isBlacklisted).length,
    showsDues: true,
  };
}
