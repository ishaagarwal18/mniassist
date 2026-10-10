import { accountSwitchParameters, actingAsFrom } from './account-switch';

describe('accountSwitchParameters', () => {
  it('sends the kind and the target user for an impersonation', () => {
    expect(accountSwitchParameters({ kind: 'ImpersonateUser', userId: 'u-1' })).toEqual({
      kind: 'ImpersonateUser',
      user_id: 'u-1',
    });
  });

  it('sends the workspace when the host enters one', () => {
    expect(
      accountSwitchParameters({ kind: 'ManageWorkspace', tenant: { id: 't-1', name: 'vertex' } }),
    ).toEqual({ kind: 'ManageWorkspace', tenant_id: 't-1' });
  });

  it('sends user and workspace for a linked account, and the delegation id for a delegation', () => {
    expect(
      accountSwitchParameters({
        kind: 'LinkedAccount',
        userId: 'u-2',
        tenant: { id: 't-2', name: 'meridian' },
      }),
    ).toEqual({ kind: 'LinkedAccount', user_id: 'u-2', tenant_id: 't-2' });
    expect(accountSwitchParameters({ kind: 'Delegation', delegationId: 'd-1' })).toEqual({
      kind: 'Delegation',
      delegation_id: 'd-1',
    });
  });

  it('never sends a workspace on the way back: the token says where home is', () => {
    expect(
      accountSwitchParameters({ kind: 'ReturnToSelf', tenant: { id: 't-1', name: 'vertex' } }),
    ).toEqual({ kind: 'ReturnToSelf' });
  });
});

describe('actingAsFrom', () => {
  it('is null on one’s own account', () => {
    expect(actingAsFrom({ id: 'u-1', userName: 'asha' })).toBeNull();
    expect(actingAsFrom(undefined)).toBeNull();
  });

  it('reads who is really there', () => {
    expect(
      actingAsFrom({
        impersonatorUserId: 'u-9',
        impersonatorUserName: 'admin',
        impersonatorTenantId: null,
        impersonatorTenantName: null,
      }),
    ).toEqual({ userName: 'admin', tenantId: null, tenantName: null });
  });
});
