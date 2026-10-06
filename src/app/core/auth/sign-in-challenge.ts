/**
 * The other answers ABP's password grant gives a correct password: "choose a new one
 * first" and "confirm your email first". Each is `invalid_grant` with a description the
 * sign-in screen turns into a step.
 */

/** Why a new password is needed: an administrator set it, or it is older than the rules allow. */
export type PasswordChangeReason = 'ShouldChangePasswordOnNextLogin' | 'PeriodicallyChangePassword';

export class PasswordChangeRequiredError extends Error {
  constructor(
    readonly reason: PasswordChangeReason,
    /** One-time proof the server issued; sent back with the new password. */
    readonly changePasswordToken: string,
  ) {
    super('Choose a new password to finish signing in.');
    this.name = 'PasswordChangeRequiredError';
  }
}

export class EmailConfirmationRequiredError extends Error {
  constructor(readonly email: string | null) {
    super('Confirm your email address to sign in.');
    this.name = 'EmailConfirmationRequiredError';
  }
}

type GrantError = {
  error?: {
    error_description?: string;
    changePasswordToken?: string;
    email?: string;
  };
};

/** Turns the token endpoint's refusal into one of the steps above, or null for anything else. */
export function signInChallenge(
  e: unknown,
): PasswordChangeRequiredError | EmailConfirmationRequiredError | null {
  const body = (e as GrantError | null)?.error;
  const description = body?.error_description;
  if (
    (description === 'ShouldChangePasswordOnNextLogin' ||
      description === 'PeriodicallyChangePassword') &&
    body?.changePasswordToken
  ) {
    return new PasswordChangeRequiredError(description, body.changePasswordToken);
  }
  if (description === 'RequiresConfirmUser') {
    return new EmailConfirmationRequiredError(body?.email || null);
  }
  return null;
}

/** The extra token-request parameters for the second attempt with a new password. */
export function passwordChangeParameters(
  token: string,
  newPassword: string,
): Record<string, string> {
  return { ChangePasswordToken: token, NewPassword: newPassword };
}
