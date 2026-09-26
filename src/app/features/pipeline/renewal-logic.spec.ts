import { AmcRenewalDto, RenewalStatus } from '../../proxy/pipeline/amc-renewal.service';
import {
  amcCommercials,
  daysLeft,
  groupByStatus,
  renewalChip,
  renewalTone,
  upliftBasisPoints,
  upliftPercent,
} from './renewal-logic';

const NOW = new Date('2026-10-01T09:00:00Z');

function row(p: Partial<AmcRenewalDto>): AmcRenewalDto {
  return {
    id: p.id ?? 'r',
    installedAssetId: 'a',
    assetDescription: 'ACS580 drive',
    contactId: 'c',
    currentEndsOn: '2026-12-01T00:00:00Z',
    proposedEndsOn: '2027-12-01T00:00:00Z',
    status: RenewalStatus.Due,
    ...p,
  };
}

describe('renewal logic', () => {
  it('counts whole days to the end date', () => {
    expect(daysLeft('2026-10-01T00:00:00Z', NOW)).toBe(0);
    expect(daysLeft('2026-10-31T00:00:00Z', NOW)).toBe(30);
    expect(daysLeft('2026-09-29T00:00:00Z', NOW)).toBe(-2);
  });

  it('colours by urgency and by what the customer did', () => {
    expect(renewalTone(row({ currentEndsOn: '2026-10-10T00:00:00Z' }), NOW)).toBe('bad');
    expect(
      renewalTone(
        row({
          currentEndsOn: '2026-10-10T00:00:00Z',
          quotationId: 'q',
          status: RenewalStatus.Quoted,
        }),
        NOW,
      ),
    ).toBe('amber');
    expect(renewalTone(row({ currentEndsOn: '2026-10-25T00:00:00Z' }), NOW)).toBe('amber');
    expect(renewalTone(row({ status: RenewalStatus.Interested }), NOW)).toBe('teal');
    expect(renewalTone(row({ status: RenewalStatus.Won }), NOW)).toBe('good');
    expect(renewalTone(row({}), NOW)).toBe('neutral');
  });

  it('groups open renewals into columns, soonest first', () => {
    const cols = groupByStatus([
      row({ id: 'late', currentEndsOn: '2026-12-20T00:00:00Z' }),
      row({ id: 'soon', currentEndsOn: '2026-10-20T00:00:00Z' }),
      row({ id: 'q', status: RenewalStatus.Quoted }),
      row({ id: 'won', status: RenewalStatus.Won }),
    ]);
    expect(cols.map((c) => c.status)).toEqual([
      RenewalStatus.Due,
      RenewalStatus.Contacted,
      RenewalStatus.Interested,
      RenewalStatus.Quoted,
    ]);
    expect(cols[0].rows.map((r) => r.id)).toEqual(['soon', 'late']);
    expect(cols[3].rows.map((r) => r.id)).toEqual(['q']);
  });

  it('reads AMC value and term from the form', () => {
    expect(amcCommercials('', '')).toEqual({ valueInPaise: undefined, termMonths: undefined });
    expect(amcCommercials('₹42,000.50', '24')).toEqual({ valueInPaise: 4200050, termMonths: 24 });
    expect(amcCommercials('forty', '')).toContain('rupees');
    expect(amcCommercials('100', '0')).toContain('1 to 60');
    expect(amcCommercials('100', '1.5')).toContain('1 to 60');
  });

  it('converts uplift between percent and basis points', () => {
    expect(upliftPercent(500)).toBe('5');
    expect(upliftPercent(750)).toBe('7.5');
    expect(upliftBasisPoints('5')).toBe(500);
    expect(upliftBasisPoints('7.5%')).toBe(750);
    expect(upliftBasisPoints('-10')).toBe(-1000);
    expect(upliftBasisPoints('abc')).toBeNull();
    expect(upliftBasisPoints('150')).toBeNull();
  });
  it('labels the installed-base renewal chip', () => {
    expect(renewalChip(RenewalStatus.Quoted)).toEqual({ label: 'Renewal: quoted', tone: 'amber' });
    expect(renewalChip(RenewalStatus.Won).tone).toBe('good');
    expect(renewalChip(RenewalStatus.Lapsed).tone).toBe('bad');
    expect(renewalChip(RenewalStatus.Contacted).label).toBe('Renewal: reminded');
  });
});
