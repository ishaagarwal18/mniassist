import { IntegrationKind } from '../../proxy/integrations/integration-kind.enum';
import { applyErpForm, describeRun, erpFormProblem, readErpForm } from './erp-sync-logic';

describe('erp sync form', () => {
  it('reads switches and names, defaulting to off and blank', () => {
    expect(readErpForm({ url: 'http://tally:9000' })).toEqual({
      customers: false,
      salesOrders: false,
      invoices: false,
      stock: false,
      company: '',
      salesLedger: '',
      debtorsGroup: '',
      cardCodePrefix: '',
    });
    const form = readErpForm({
      erp: { customers: true, invoices: true },
      company: 'Emnisoft Pvt Ltd',
    });
    expect(form.customers).toBe(true);
    expect(form.salesOrders).toBe(false);
    expect(form.company).toBe('Emnisoft Pvt Ltd');
  });

  it('writes Tally names, keeps the gateway URL, and drops blanks', () => {
    const config = { url: 'http://tally:9000', salesLedger: 'Old' };
    const next = applyErpForm(
      config,
      {
        ...readErpForm({}),
        customers: true,
        company: ' Emnisoft Pvt Ltd ',
        salesLedger: '',
        cardCodePrefix: 'AR',
      },
      IntegrationKind.Tally,
    );
    expect(next).toEqual({
      url: 'http://tally:9000',
      erp: { customers: true, salesOrders: false, invoices: false, stock: false },
      company: 'Emnisoft Pvt Ltd',
    });
    expect(config.salesLedger).toBe('Old'); // the original is not mutated
  });

  it('writes only the SAP prefix for SAP, and removes erp when everything is off', () => {
    const next = applyErpForm(
      { erp: { invoices: true }, db: 'SBODEMO' },
      { ...readErpForm({}), cardCodePrefix: 'C', company: 'Emnisoft Pvt Ltd' },
      IntegrationKind.SapB1,
    );
    expect(next).toEqual({ db: 'SBODEMO', cardCodePrefix: 'C' });
  });

  it('refuses sales orders without customers', () => {
    expect(erpFormProblem({ ...readErpForm({}), salesOrders: true })).toContain('customer sync');
    expect(erpFormProblem({ ...readErpForm({}), salesOrders: true, customers: true })).toBeNull();
  });

  it('describes a run', () => {
    expect(describeRun({ retried: 0, recovered: 0, stillFailing: 0, invoices: 3 })).toBe(
      'Nothing was waiting to retry; 3 invoices read.',
    );
    expect(
      describeRun({
        retried: 2,
        recovered: 1,
        stillFailing: 1,
        invoices: 0,
        invoiceError: 'Tally is not running',
      }),
    ).toBe(
      '1 of 2 retried records went through; invoices could not be read: Tally is not running.',
    );
    expect(
      describeRun({ retried: 0, recovered: 0, stillFailing: 0, invoices: 0, stockItems: 412 }),
    ).toBe('Nothing was waiting to retry; 0 invoices read; stock read for 412 items.');
  });

  it('keeps stock reading on its own', () => {
    const next = applyErpForm({}, { ...readErpForm({}), stock: true }, IntegrationKind.Tally);
    expect(next).toEqual({
      erp: { customers: false, salesOrders: false, invoices: false, stock: true },
    });
    expect(readErpForm(next).stock).toBe(true);
  });
});
