import { IntegrationKind } from '../../proxy/integrations/integration-kind.enum';

/**
 * Field-by-field checks for the connections people type in (Freshdesk, Zendesk, Shopify, SAP Business One, Tally). They
 * mirror IntegrationConfigRules on the API, which refuses the same settings if a request skips this screen.
 */
export type FieldErrors = Partial<Record<string, string>>;

const FRESHDESK = /^[a-z0-9][a-z0-9-]*\.freshdesk\.com$/;
const SHOPIFY = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const SUBDOMAIN = /^[a-z0-9][a-z0-9-]*$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const COMPANY_DB = /^[A-Za-z0-9_-]{1,100}$/;

/** acme.freshdesk.com from "https://acme.freshdesk.com/a/tickets", lower-cased. */
export function hostOf(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[/?#].*$/, '');
}

/** An absolute web address, https only unless allowHttp; no user name or password inside it. */
export function isWebAddress(value: string, allowHttp: boolean): boolean {
  try {
    const url = new URL(value.trim());
    return (
      (url.protocol === 'https:' || (allowHttp && url.protocol === 'http:')) &&
      url.hostname.length > 0 &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export interface HelpdeskShopFields {
  name: string;
  address: string;
  email: string;
  credential: string;
}

export function helpdeskShopErrors(
  kind: IntegrationKind,
  f: HelpdeskShopFields,
  isNew: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!f.name.trim()) errors['name'] = 'Enter a name for this connection.';
  const host = hostOf(f.address);
  if (kind === IntegrationKind.Freshdesk && !FRESHDESK.test(host))
    errors['address'] = 'Enter your Freshdesk address, such as acme.freshdesk.com.';
  if (kind === IntegrationKind.Shopify && !SHOPIFY.test(host))
    errors['address'] = "Enter your store's address, such as acme.myshopify.com.";
  if (kind === IntegrationKind.Zendesk) {
    if (!SUBDOMAIN.test(host.replace(/\.zendesk\.com$/, '')))
      errors['address'] = 'Enter your Zendesk subdomain: acme for acme.zendesk.com.';
    if (!EMAIL.test(f.email.trim()))
      errors['email'] = 'Enter the email address of the agent the token belongs to.';
  }
  if (isNew && !f.credential.trim()) {
    errors['credential'] =
      kind === IntegrationKind.Freshdesk
        ? 'Enter the Freshdesk API key.'
        : kind === IntegrationKind.Zendesk
          ? 'Enter the Zendesk API token.'
          : 'Enter the Admin API access token.';
  }
  return errors;
}

export interface ErpConnectionFields {
  kind: IntegrationKind.Tally | IntegrationKind.SapB1;
  name: string;
  /** Tally: the gateway (http://host:9000). SAP: the Service Layer (https://host:50000/b1s/v1). */
  url: string;
  companyDb: string;
  username: string;
  password: string;
}

export function erpConnectionErrors(f: ErpConnectionFields, isNew: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!f.name.trim()) errors['name'] = 'Enter a name for this connection.';
  if (f.kind === IntegrationKind.Tally) {
    if (!isWebAddress(f.url, true))
      errors['url'] = 'Enter the Tally gateway address, such as http://192.168.1.20:9000.';
    return errors;
  }
  if (!isWebAddress(f.url, false))
    errors['url'] =
      'Enter the Service Layer address, starting https://, such as https://sap.acme.in:50000/b1s/v1.';
  if (!COMPANY_DB.test(f.companyDb.trim()))
    errors['companyDb'] = 'Enter the company database name, such as SBODEMOIN.';
  if (!f.username.trim()) errors['username'] = 'Enter the SAP Business One user name.';
  if (isNew && !f.password) errors['password'] = 'Enter the SAP Business One password.';
  return errors;
}

/** Writes the connection fields into the config, keeping the sync settings (erp, ledgers, prefix) already there. */
export function applyErpConnection(
  config: Record<string, unknown>,
  f: ErpConnectionFields,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config };
  if (f.kind === IntegrationKind.Tally) {
    next['url'] = f.url.trim();
  } else {
    next['serviceLayerUrl'] = f.url.trim().replace(/\/+$/, '');
    next['companyDb'] = f.companyDb.trim();
    next['username'] = f.username.trim();
  }
  return next;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((e) => !!e);
}
