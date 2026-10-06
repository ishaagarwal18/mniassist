import {
  EmailConfirmationRequiredError,
  PasswordChangeRequiredError,
  passwordChangeParameters,
  signInChallenge,
} from './sign-in-challenge';

const refusal = (body: Record<string, string>) => ({ error: { error: 'invalid_grant', ...body } });

describe('a sign-in that needs one more step', () => {
  it('asks for a new password after an admin set one, with the server’s token', () => {
    const c = signInChallenge(
      refusal({ error_description: 'ShouldChangePasswordOnNextLogin', changePasswordToken: 't-1' }),
    );
    expect(c).toBeInstanceOf(PasswordChangeRequiredError);
    expect((c as PasswordChangeRequiredError).reason).toBe('ShouldChangePasswordOnNextLogin');
    expect((c as PasswordChangeRequiredError).changePasswordToken).toBe('t-1');
  });

  it('asks for a new password when the old one is past its age', () => {
    const c = signInChallenge(
      refusal({ error_description: 'PeriodicallyChangePassword', changePasswordToken: 't-2' }),
    );
    expect((c as PasswordChangeRequiredError).reason).toBe('PeriodicallyChangePassword');
  });

  it('asks for email confirmation, remembering the address', () => {
    const c = signInChallenge(
      refusal({ error_description: 'RequiresConfirmUser', email: 'a@b.in' }),
    );
    expect(c).toBeInstanceOf(EmailConfirmationRequiredError);
    expect((c as EmailConfirmationRequiredError).email).toBe('a@b.in');
  });

  it('is nothing special for a wrong password, a missing token, or another error', () => {
    expect(
      signInChallenge(refusal({ error_description: 'Invalid username or password!' })),
    ).toBeNull();
    expect(
      signInChallenge(refusal({ error_description: 'PeriodicallyChangePassword' })),
    ).toBeNull();
    expect(signInChallenge(new Error('network'))).toBeNull();
  });

  it('sends the token and the new password back in ABP’s parameter names', () => {
    expect(passwordChangeParameters('t', 'N3w!pass')).toEqual({
      ChangePasswordToken: 't',
      NewPassword: 'N3w!pass',
    });
  });
});
