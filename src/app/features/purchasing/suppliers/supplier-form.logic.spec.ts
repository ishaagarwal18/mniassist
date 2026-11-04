import { describe, expect, it } from 'vitest';

import {
  SupplierForm,
  supplierForm,
  toSaveSupplierInput,
  validateSupplierForm,
} from './supplier-form.logic';

const form = (over: Partial<SupplierForm> = {}): SupplierForm => ({
  ...supplierForm(),
  name: 'Bharat Gears',
  ...over,
});

describe('supplier form', () => {
  it('needs only a name', () => {
    expect(validateSupplierForm(form())).toEqual({});
    expect(validateSupplierForm(form({ name: ' ' }))['name']).toBeTruthy();
  });

  it('checks GSTIN, lead time, email, account number and IFSC', () => {
    const e = validateSupplierForm(
      form({
        gstin: '27ABC',
        leadDays: '400',
        email: 'nope',
        bankAccountNumber: '12',
        bankIfsc: 'HDFC1',
      }),
    );
    expect(Object.keys(e).sort()).toEqual([
      'bankAccountNumber',
      'bankIfsc',
      'email',
      'gstin',
      'leadDays',
    ]);
  });

  it('needs the account number and IFSC together', () => {
    expect(validateSupplierForm(form({ bankAccountNumber: '50200081729381' }))['bankIfsc']).toBe(
      'Needed with the other bank detail.',
    );
    expect(
      validateSupplierForm(
        form({ bankAccountNumber: '5020 0081 7293 81', bankIfsc: 'hdfc0001092' }),
      ),
    ).toEqual({});
  });

  it('needs a reason to blacklist', () => {
    expect(validateSupplierForm(form({ isBlacklisted: true }))['blacklistReason']).toBeTruthy();
    expect(
      validateSupplierForm(form({ isBlacklisted: true, blacklistReason: 'QC failures' })),
    ).toEqual({});
  });

  it('saves shipping as the billing address when the same', () => {
    const same = toSaveSupplierInput(form({ address: 'Plot 4, MIDC, Pune', shippingAddress: 'x' }));
    expect(same.shippingAddress).toBe('Plot 4, MIDC, Pune');
    const other = toSaveSupplierInput(
      form({ address: 'Pune', shippingAddress: 'Chakan', shipSameAsBilling: false }),
    );
    expect(other.shippingAddress).toBe('Chakan');
  });

  it('cleans the values it sends', () => {
    const input = toSaveSupplierInput(
      form({
        gstin: '27aabcu9603r1zm',
        leadDays: '14',
        bankAccountNumber: '5020 0081',
        bankIfsc: 'hdfc0001092',
        blacklistReason: 'stale',
      }),
    );
    expect(input).toMatchObject({
      gstin: '27AABCU9603R1ZM',
      leadDays: 14,
      bankAccountNumber: '50200081',
      bankIfsc: 'HDFC0001092',
      isBlacklisted: false,
      blacklistReason: null,
      contactName: null,
    });
  });

  it('reads an existing supplier, shipping elsewhere when it differs', () => {
    const f = supplierForm({
      id: 's1',
      name: 'X',
      isActive: true,
      address: 'Pune',
      shippingAddress: 'Chakan',
    });
    expect(f.shipSameAsBilling).toBe(false);
    expect(
      supplierForm({ id: 's1', name: 'X', isActive: true, address: 'Pune' }).shipSameAsBilling,
    ).toBe(true);
  });
});
