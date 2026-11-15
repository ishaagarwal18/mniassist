import { documentLink, filterHits } from './document-ref-picker';

describe('document reference', () => {
  it('links documents that have a page', () => {
    expect(documentLink('SalesInvoice', 'i1')).toEqual(['/sales/invoices', 'i1']);
    expect(documentLink('Other', 'x')).toBeNull();
    expect(documentLink('PurchaseOrder', 'p1')).toBeNull();
    expect(documentLink('VendorBill', '')).toBeNull();
  });

  it('finds documents by number or party', () => {
    const hits = [
      { id: '1', number: 'PO-1001', party: 'Siemens' },
      { id: '2', number: 'PO-1002', party: 'ABB' },
    ];
    expect(filterHits(hits, 'abb').map((h) => h.id)).toEqual(['2']);
    expect(filterHits(hits, '').length).toBe(2);
  });
});
