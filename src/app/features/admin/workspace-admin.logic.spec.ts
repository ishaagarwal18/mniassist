import { BillingCycle } from '../../proxy/billing/billing-cycle.enum';
import { PlanFeature } from '../../proxy/billing/plan-feature.enum';
import { SubscriptionPlan } from '../../proxy/billing/subscription-plan.enum';
import { InvoiceState } from '../../proxy/billing/invoice-state.enum';
import {
  assignPlanInput,
  endOfIndianDay,
  featureLabel,
  generateInvoiceInput,
  invoiceFormDefault,
  invoiceStateChip,
  planFormFrom,
  subscriptionSummary,
} from './workspace-admin.logic';

const TODAY = new Date(2026, 9, 10);

describe('workspace administration', () => {
  it('names every plan feature', () => {
    for (const v of Object.values(PlanFeature).filter((x) => typeof x === 'number')) {
      expect(featureLabel(v as PlanFeature)).not.toContain('Feature ');
    }
  });

  it('summarises the subscription', () => {
    expect(subscriptionSummary(null)).toContain('Starter trial terms');
    expect(
      subscriptionSummary({
        plan: SubscriptionPlan.Pro,
        cycle: BillingCycle.Annual,
        isTrial: false,
        startedAtUtc: '2026-01-01T00:00:00Z',
        currentPeriodEndUtc: '2027-01-01T00:00:00Z',
        monthlyFeeInPaise: 999900,
        includedAgentSeats: 10,
      }),
    ).toBe('Pro, annual · renews 2027-01-01');
  });

  it('builds the assign-plan input, blanks meaning the plan’s own terms', () => {
    const f = { ...planFormFrom(null), plan: SubscriptionPlan.Growth };
    expect(assignPlanInput(f, TODAY)).toEqual({
      plan: SubscriptionPlan.Growth,
      cycle: BillingCycle.Monthly,
      isTrial: false,
      currentPeriodEndUtc: null,
      expiresAtUtc: null,
      monthlyFeeInPaise: null,
      includedAgentSeats: null,
    });
  });

  it('turns rupees into paise and dates into the end of the Indian day', () => {
    const input = assignPlanInput(
      { ...planFormFrom(null), monthlyFeeRupees: '4999.50', seats: '12', expires: '2026-12-31' },
      TODAY,
    );
    expect(input).toMatchObject({
      monthlyFeeInPaise: 499950,
      includedAgentSeats: 12,
      expiresAtUtc: '2026-12-31T18:29:59.000Z',
    });
    expect(endOfIndianDay('2026-10-10')).toBe('2026-10-10T18:29:59.000Z');
  });

  it('refuses dates in the past and bad numbers', () => {
    const base = planFormFrom(null);
    expect(assignPlanInput({ ...base, expires: '2026-10-01' }, TODAY)).toContain('past');
    expect(assignPlanInput({ ...base, seats: '0' }, TODAY)).toContain('Seats');
    expect(assignPlanInput({ ...base, monthlyFeeRupees: 'abc' }, TODAY)).toContain('rupees');
    expect(
      assignPlanInput({ ...base, periodEnd: '2026-12-31', expires: '2026-11-30' }, TODAY),
    ).toContain('before the current period');
  });
});

describe('platform invoices to a workspace', () => {
  it('defaults to the current calendar month', () => {
    expect(invoiceFormDefault(TODAY)).toEqual({
      start: '2026-10-01',
      end: '2026-10-31',
      place: '',
    });
    expect(invoiceFormDefault(new Date(2028, 1, 15)).end).toBe('2028-02-29');
  });

  it('sends the period as whole Indian days', () => {
    const input = generateInvoiceInput({ start: '2026-10-01', end: '2026-10-31', place: '' });
    expect(input).toEqual({
      periodStartUtc: '2026-09-30T18:30:00.000Z',
      periodEndUtc: '2026-10-31T18:29:59.000Z',
      placeOfSupplyStateCode: null,
    });
  });

  it('keeps a chosen place of supply and refuses a malformed one', () => {
    const ok = generateInvoiceInput({ start: '2026-10-01', end: '2026-10-31', place: ' 27 ' });
    expect(typeof ok === 'string' ? ok : ok.placeOfSupplyStateCode).toBe('27');
    expect(generateInvoiceInput({ start: '2026-10-01', end: '2026-10-31', place: 'MH' })).toContain(
      'two-digit',
    );
  });

  it('refuses a missing or backwards period', () => {
    expect(generateInvoiceInput({ start: '', end: '2026-10-31', place: '' })).toContain('Choose');
    expect(generateInvoiceInput({ start: '2026-10-31', end: '2026-10-01', place: '' })).toContain(
      'on or after',
    );
  });

  it('labels each invoice state', () => {
    expect(invoiceStateChip(InvoiceState.Draft).label).toBe('Draft');
    expect(invoiceStateChip(InvoiceState.Issued)).toEqual({ label: 'Issued', tone: 'amber' });
    expect(invoiceStateChip(InvoiceState.Paid).tone).toBe('good');
    expect(invoiceStateChip(InvoiceState.Cancelled).tone).toBe('bad');
  });
});
