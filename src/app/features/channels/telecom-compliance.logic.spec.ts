import { describe, expect, it } from 'vitest';

import { TelecomComplianceAuditResultDto } from '../../proxy/channels/telecom.models';
import { auditStanding, checkPassed } from './telecom-compliance.logic';

describe('telecom compliance', () => {
  it('fails checklist lines that record a gap', () => {
    expect(checkPassed('Telecom Lawful Interception Audit Trail: Active')).toBe(true);
    expect(checkPassed('Telecom Lawful Interception Audit Trail: Inactive')).toBe(false);
    expect(checkPassed('Hardware SIM-binding & Carrier Anti-Spoofing: Enforced, 5/5 numbers SIM-bound')).toBe(true);
    expect(checkPassed('Hardware SIM-binding & Carrier Anti-Spoofing: Enforced, 3/5 numbers SIM-bound')).toBe(false);
    expect(checkPassed('Meta Tech Provider & Cloud API Direct Agreement: Not recorded')).toBe(false);
    expect(checkPassed('TRAI DLT Principal Entity ID: ')).toBe(false);
    expect(checkPassed('Chief Telecommunication Security Officer (CTSO): A Shah ()')).toBe(false);
    expect(checkPassed('Chief Telecommunication Security Officer (CTSO): A Shah (a@b.in)')).toBe(true);
  });

  it('is compliant only when every flag holds and every number is KYC verified', () => {
    const base: TelecomComplianceAuditResultDto = {
      totalInventoryCount: 4,
      allocatedCount: 2,
      availableCount: 2,
      quarantinedCount: 0,
      simBoundCount: 4,
      kycVerifiedCount: 4,
      entityLicenseValid: true,
      ctsoAppointed: true,
      antiSpoofingCompliant: true,
      metaTechProviderCompliant: true,
      auditTimestampUtc: '2026-11-19T00:00:00Z',
      checks: [],
    };
    expect(auditStanding(base)).toBe('compliant');
    expect(auditStanding({ ...base, kycVerifiedCount: 3 })).toBe('gaps');
    expect(auditStanding({ ...base, ctsoAppointed: false })).toBe('gaps');
  });
});
