import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { signal } from '@angular/core';

import { WorkspaceStore } from '../../core/services/workspace.store';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArOnboardingInviteTeam, INVITE_ROLES, inviteEmailProblem } from './invite-team';

describe('Get started invite team: email', () => {
  it('needs a real-looking address', () => {
    expect(inviteEmailProblem('')).toMatch(/Enter their email/);
    expect(inviteEmailProblem('ravi')).toMatch(/valid email/);
    expect(inviteEmailProblem(' ravi@plant.in ')).toBeNull();
  });

  it('offers the everyday roles with what each can do, and not Owner', () => {
    expect(INVITE_ROLES.map((r) => r.name)).toEqual([
      'Agent',
      'Manager',
      'Administrator',
      'Analyst',
      'Billing',
    ]);
    expect(INVITE_ROLES.every((r) => r.does.length > 10)).toBe(true);
  });
});

describe('Get started invite team: sending', () => {
  let store: {
    members: ReturnType<typeof signal>;
    invitations: ReturnType<typeof signal>;
    loading: ReturnType<typeof signal>;
    invite: ReturnType<typeof vi.fn>;
    resendInvitation: ReturnType<typeof vi.fn>;
    revokeInvitation: ReturnType<typeof vi.fn>;
  };
  let toasts: Record<string, ReturnType<typeof vi.fn>>;
  let confirm: ReturnType<typeof vi.fn>;

  function setup(granted = true) {
    store = {
      members: signal([{ isActive: true }, { isActive: true }, { isActive: false }]),
      invitations: signal([
        {
          id: 'i-1',
          email: 'ravi@plant.in',
          roleName: 'Agent',
          state: 'pending',
          isExpired: false,
        },
        { id: 'i-2', email: 'old@plant.in', roleName: 'Agent', state: 'revoked', isExpired: false },
      ]),
      loading: signal(false),
      invite: vi.fn(async () => 'https://app.example/accept?token=abc'),
      resendInvitation: vi.fn(async () => undefined),
      revokeInvitation: vi.fn(async () => undefined),
    };
    toasts = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
    confirm = vi.fn(async () => true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: WorkspaceStore, useValue: store },
        { provide: PermissionService, useValue: { getGrantedPolicy: () => granted } },
        { provide: ToastService, useValue: toasts },
        { provide: ConfirmService, useValue: { confirm } },
      ],
    });
    const fixture = TestBed.createComponent(ArOnboardingInviteTeam);
    fixture.detectChanges();
    return fixture;
  }

  it('says who is in and lists only the invitations still waiting', () => {
    const el: HTMLElement = setup().nativeElement;
    expect(el.querySelector('.it__sum')?.textContent).toContain('2 people are in this workspace');
    expect(el.querySelector('.it__sum')?.textContent).toContain('1 invitation is waiting');
    expect(el.querySelectorAll('.it__pending li').length).toBe(1);
  });

  it('sends with the chosen role and note, shows the link and reports it', async () => {
    const fixture = setup();
    const comp = fixture.componentInstance as any;
    const invited = vi.fn();
    comp.invited.subscribe(invited);

    comp.email.set('sneha@plant.in');
    comp.role.set('Manager');
    comp.note.set('Campaigns are yours');
    await comp.send();
    fixture.detectChanges();

    expect(store.invite).toHaveBeenCalledWith('sneha@plant.in', 'Manager', 'Campaigns are yours');
    expect(invited).toHaveBeenCalled();
    expect(comp.email()).toBe('');
    expect(fixture.nativeElement.querySelector('.it__sent')?.textContent).toContain(
      'sneha@plant.in',
    );
  });

  it('does not send a bad address', async () => {
    const fixture = setup();
    const comp = fixture.componentInstance as any;
    comp.email.set('not-an-email');
    await comp.send();
    fixture.detectChanges();
    expect(store.invite).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.it__err')).not.toBeNull();
  });

  it('shows the server’s reason when an invitation is refused', async () => {
    const fixture = setup();
    const comp = fixture.componentInstance as any;
    store.invite.mockRejectedValueOnce(new Error('No seats left on your plan.'));
    comp.email.set('ravi2@plant.in');
    await comp.send();
    expect(toasts['error']).toHaveBeenCalled();
  });

  it('asks before revoking', async () => {
    const comp = setup().componentInstance as any;
    confirm.mockResolvedValueOnce(false);
    await comp.revoke('i-1', 'ravi@plant.in');
    expect(store.revokeInvitation).not.toHaveBeenCalled();
    await comp.revoke('i-1', 'ravi@plant.in');
    expect(store.revokeInvitation).toHaveBeenCalledWith('i-1');
  });

  it('tells someone without the invite permission who can invite', () => {
    const el: HTMLElement = setup(false).nativeElement;
    expect(el.textContent).toContain('Ask your workspace owner');
    expect(el.querySelector('.it__form')).toBeNull();
  });
});
