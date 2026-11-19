import {
  TelecomComplianceAuditResultDto,
  TelecomEntitySettingsDto,
} from '../../proxy/channels/telecom.models';

/** What the page says about the workspace's telecom standing: never "Compliant" unless the records show it. */
export type TelecomStanding = 'compliant' | 'gaps' | 'not-audited';

export const STANDING_TEXT: Record<TelecomStanding, string> = {
  compliant: 'Compliant',
  gaps: 'Needs attention',
  'not-audited': 'Not audited',
};

/** The entity's standing from its saved settings and the last audit's flags. */
export function entityStanding(s: TelecomEntitySettingsDto | null | undefined): TelecomStanding {
  if (!s || !s.lastComplianceAuditUtc) return 'not-audited';
  const ok =
    !!s.dotRegistrationNumber?.trim() &&
    !!s.dltPrincipalEntityId?.trim() &&
    !!s.ctsoName?.trim() &&
    !!s.ctsoEmail?.trim() &&
    s.simBindingEnforced &&
    s.antiSpoofingAuditPassed &&
    s.lawfulInterceptionLogging &&
    s.metaTechProviderAgreementSigned &&
    s.prohibitionOfDisposableNumbersAcknowledged;
  return ok ? 'compliant' : 'gaps';
}

/** The overall result of one audit run. */
export function auditStanding(r: TelecomComplianceAuditResultDto): TelecomStanding {
  const ok =
    r.entityLicenseValid &&
    r.ctsoAppointed &&
    r.antiSpoofingCompliant &&
    r.metaTechProviderCompliant &&
    r.kycVerifiedCount === r.totalInventoryCount;
  return ok ? 'compliant' : 'gaps';
}

const FAIL_WORDS = /\b(Not enforced|Inactive|Not recorded|Not acknowledged)\b/i;

/**
 * Whether one line of the audit checklist passed. The API reports each line as "Check: what is recorded", so a
 * line fails when it records a negative ("Not enforced", "Inactive"…), an empty value, or a count short of the
 * total ("3/5 numbers").
 */
export function checkPassed(line: string): boolean {
  if (FAIL_WORDS.test(line)) return false;
  const value = line.includes(':') ? line.slice(line.indexOf(':') + 1).trim() : line.trim();
  if (!value) return false; // the recorded value is blank
  if (/\(\s*\)/.test(value)) return false; // e.g. "A Shah ()": the email or number in brackets is blank
  for (const m of line.matchAll(/(\d+)\/(\d+)\s+numbers/g)) {
    if (+m[1] < +m[2]) return false;
  }
  return true;
}
