/**
 * ABP's password grant answers a correct password on a two-factor account with
 * `invalid_grant` / `RequiresTwoFactor`. The sign-in screen then asks for the code
 * and repeats the grant with it.
 */
export const REQUIRES_TWO_FACTOR = 'RequiresTwoFactor';

/** The authenticator provider name ASP.NET Identity registers. */
export const AUTHENTICATOR_PROVIDER = 'Authenticator';

/** Thrown by sign-in when the password was right and a second factor is needed. */
export class TwoFactorRequiredError extends Error {
  constructor() {
    super('A code from your authenticator app is needed to finish signing in.');
    this.name = 'TwoFactorRequiredError';
  }
}

export function isTwoFactorChallenge(e: unknown): boolean {
  const err = e as { error?: { error_description?: string } } | null | undefined;
  return err?.error?.error_description === REQUIRES_TWO_FACTOR;
}

/** What proves the second factor: a code from the app, or one of the recovery codes. */
export type SecondFactor = { code: string } | { recoveryCode: string };

/** The extra token-request parameters ABP reads for the second attempt. */
export function secondFactorParameters(proof: SecondFactor): Record<string, string> {
  if ('code' in proof) {
    return {
      TwoFactorProvider: AUTHENTICATOR_PROVIDER,
      TwoFactorCode: proof.code.replace(/[^0-9a-z]/gi, ''),
    };
  }
  return { RecoveryCode: proof.recoveryCode.trim() };
}
