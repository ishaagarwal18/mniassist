import { IntegrationKind } from '../../proxy/integrations/integration-kind.enum';
import {
  applyErpConnection,
  erpConnectionErrors,
  hasErrors,
  helpdeskShopErrors,
  hostOf,
  isWebAddress,
} from './connector-validation';

describe('connector validation', () => {
  const shop = { name: 'Store', address: 'acme.myshopify.com', email: '', credential: 'tok' };

  it('reads a host out of a pasted link', () => {
    expect(hostOf(' https://Acme.Freshdesk.com/a/tickets?x=1 ')).toBe('acme.freshdesk.com');
  });

  it('accepts good helpdesk and store settings', () => {
    expect(hasErrors(helpdeskShopErrors(IntegrationKind.Shopify, shop, true))).toBe(false);
    expect(
      hasErrors(
        helpdeskShopErrors(
          IntegrationKind.Zendesk,
          { name: 'Desk', address: 'acme.zendesk.com', email: 'a@acme.in', credential: 't' },
          true,
        ),
      ),
    ).toBe(false);
  });

  it('names the field that is wrong', () => {
    const errors = helpdeskShopErrors(
      IntegrationKind.Freshdesk,
      { name: '', address: 'acme.com', email: '', credential: '' },
      true,
    );
    expect(Object.keys(errors).sort()).toEqual(['address', 'credential', 'name']);
  });

  it('keeps a stored key on edit', () => {
    expect(
      helpdeskShopErrors(IntegrationKind.Shopify, { ...shop, credential: '' }, false)['credential'],
    ).toBeUndefined();
  });

  it('wants https for SAP and allows http for the Tally gateway', () => {
    expect(isWebAddress('http://192.168.1.20:9000', true)).toBe(true);
    expect(isWebAddress('http://sap.acme.in:50000/b1s/v1', false)).toBe(false);
    expect(isWebAddress('https://user:pw@sap.acme.in', false)).toBe(false);
  });

  it('checks SAP Business One fields', () => {
    const errors = erpConnectionErrors(
      {
        kind: IntegrationKind.SapB1,
        name: 'SAP',
        url: 'https://sap.acme.in:50000/b1s/v1',
        companyDb: 'SBO DEMO',
        username: '',
        password: '',
      },
      true,
    );
    expect(Object.keys(errors).sort()).toEqual(['companyDb', 'password', 'username']);
  });

  it('writes connection fields without losing the sync settings', () => {
    const next = applyErpConnection(
      { erp: { customers: true }, cardCodePrefix: 'AR' },
      {
        kind: IntegrationKind.SapB1,
        name: 'SAP',
        url: 'https://sap.acme.in/b1s/v1/',
        companyDb: 'SBO',
        username: 'manager',
        password: 'x',
      },
    );
    expect(next).toEqual({
      erp: { customers: true },
      cardCodePrefix: 'AR',
      serviceLayerUrl: 'https://sap.acme.in/b1s/v1',
      companyDb: 'SBO',
      username: 'manager',
    });
  });
});
