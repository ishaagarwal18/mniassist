import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ArOnboardingWizard } from './wizard';
import { opensInline } from './step-panel';
import { OnboardingStore } from '../../core/services/onboarding.store';
import { OnboardingChecklistService } from '../../proxy/identity';
import { AccountRecoveryService } from '../../proxy/identity/account-recovery.service';
import { ToastService } from '../../core/ui/toast.service';
import { OnboardingChecklistStep as Step } from '../../proxy/identity/onboarding-checklist-step.enum';

// The topbar brings third-party widgets unrelated to wizard placement.
vi.mock('@syncfusion/ej2-angular-inputs', () => ({ TextBoxComponent: class {} }));
vi.mock('@syncfusion/ej2-angular-popups', () => ({ DialogComponent: class {} }));
vi.mock('@syncfusion/ej2-angular-progressbar', () => ({
  ProgressBarModule: class {},
  ProgressBarComponent: class {},
}));
vi.mock('@syncfusion/ej2-angular-navigations', () => ({
  TabAllModule: class {},
  TabComponent: class {},
  TabItemsDirective: class {},
  TabItemDirective: class {},
}));

describe('onboarding first incomplete step', () => {
  let response: Subject<object>;

  beforeEach(() => {
    response = new Subject();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OnboardingChecklistService,
          useValue: { get: () => response, startMobileVerification: vi.fn(() => of(undefined)) },
        },
        { provide: AccountRecoveryService, useValue: {} },
        { provide: ToastService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(ArOnboardingWizard, {
      set: { imports: [], template: '{{ current() }}:{{ item()?.label }}' },
    });
  });

  it('sends formatted mobile numbers in the digits-only format required by the API', async () => {
    await TestBed.inject(OnboardingStore).startMobileVerification('+91 (90000) 00002');
    expect(TestBed.inject(OnboardingChecklistService).startMobileVerification).toHaveBeenCalledWith(
      {
        mobile: '919000000002',
      },
    );
  });

  it('does not display demo completion while loading and opens on the business profile first', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    fixture.detectChanges();
    TestBed.tick();
    const store = TestBed.inject(OnboardingStore);
    expect(store.checklist().items).toEqual([]);
    // The API's own order: verification first. The screen puts the business profile ahead of it.
    response.next({
      items: [
        { step: Step.VerifyEmail, done: false },
        { step: Step.VerifyMobile, done: false },
        { step: Step.CompleteProfile, done: false },
        { step: Step.ConnectChannel, done: false },
      ],
      nextStep: Step.VerifyEmail,
    });
    await vi.waitFor(() => {
      TestBed.tick();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('0:Complete your business profile');
    });
    expect(store.checklist().items.map((i) => i.step)).toEqual([
      Step.CompleteProfile,
      Step.VerifyEmail,
      Step.VerifyMobile,
      Step.ConnectChannel,
    ]);
    expect(store.checklist().nextStep).toBe(Step.CompleteProfile);
  });

  it('opens on unverified email once the business profile is done', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    fixture.detectChanges();
    TestBed.tick();
    response.next({
      items: [
        { step: Step.VerifyEmail, done: false },
        { step: Step.VerifyMobile, done: false },
        { step: Step.CompleteProfile, done: true },
      ],
    });
    await vi.waitFor(() => {
      TestBed.tick();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('1:Verify your email');
    });
  });

  it('resumes at mobile only when the real checklist confirms email is verified', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    fixture.detectChanges();
    TestBed.tick();
    response.next({
      items: [
        { step: Step.VerifyEmail, done: true },
        { step: Step.VerifyMobile, done: false },
      ],
    });
    await vi.waitFor(() => {
      TestBed.tick();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('1:Verify your mobile');
    });
  });
});

describe('mobile verification resend and change mobile', () => {
  let mockChecklistService: {
    get: any;
    startMobileVerification: any;
    confirmMobileVerification: any;
  };
  let mockToast: {
    warning: any;
    info: any;
    success: any;
    error: any;
  };

  beforeEach(() => {
    mockChecklistService = {
      get: () =>
        of({ items: [{ step: Step.VerifyMobile, done: false, label: 'Verify your mobile' }] }),
      startMobileVerification: vi.fn(() => of(undefined)),
      confirmMobileVerification: vi.fn(() =>
        of({ items: [{ step: Step.VerifyMobile, done: true }] }),
      ),
    };
    mockToast = {
      warning: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: OnboardingChecklistService, useValue: mockChecklistService },
        { provide: AccountRecoveryService, useValue: {} },
        { provide: ToastService, useValue: mockToast },
      ],
    });
    TestBed.overrideComponent(ArOnboardingWizard, {
      set: { imports: [], template: '' },
    });
  });

  it('sends OTP, sets otpSent to true, and starts countdown', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    const comp = fixture.componentInstance as any;
    comp.mobile.set('+91 9876543210');
    await comp.sendOtp();
    expect(mockChecklistService.startMobileVerification).toHaveBeenCalledWith({
      mobile: '919876543210',
    });
    expect(comp.otpSent()).toBe(true);
    expect(comp.resendCountdown()).toBe(30);
    expect(mockToast.info).toHaveBeenCalledWith(
      'Verification code sent to +91 9876543210.',
      'Verification',
    );
  });

  it('does not resend OTP while countdown is active', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    const comp = fixture.componentInstance as any;
    comp.mobile.set('+91 9876543210');
    await comp.sendOtp();
    mockChecklistService.startMobileVerification.mockClear();

    await comp.resendOtp();
    expect(mockChecklistService.startMobileVerification).not.toHaveBeenCalled();
  });

  it('resends OTP once countdown reaches 0', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    const comp = fixture.componentInstance as any;
    comp.mobile.set('+91 9876543210');
    await comp.sendOtp();
    comp.resendCountdown.set(0);
    mockChecklistService.startMobileVerification.mockClear();

    await comp.resendOtp();
    expect(mockChecklistService.startMobileVerification).toHaveBeenCalledWith({
      mobile: '919876543210',
    });
    expect(mockToast.success).toHaveBeenCalledWith('Verification code resent.', 'Verification');
  });

  it('changeMobile resets otpSent and otpCode while retaining the phone number and clearing timer', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    const comp = fixture.componentInstance as any;
    comp.mobile.set('+91 9876543210');
    await comp.sendOtp();
    comp.otpCode.set('123456');

    comp.changeMobile();
    expect(comp.otpSent()).toBe(false);
    expect(comp.otpCode()).toBe('');
    expect(comp.mobile()).toBe('+91 9876543210');
    expect(comp.resendCountdown()).toBe(0);
  });
});

describe('steps done on the Get started page', () => {
  let checklist: { items: { step: Step; done: boolean }[] };
  let get: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    checklist = {
      items: [
        { step: Step.CompleteProfile, done: false },
        { step: Step.VerifyEmail, done: false },
      ],
    };
    get = vi.fn(() => of(structuredClone(checklist)));
    TestBed.configureTestingModule({
      providers: [
        { provide: OnboardingChecklistService, useValue: { get } },
        { provide: AccountRecoveryService, useValue: {} },
        { provide: ToastService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(ArOnboardingWizard, {
      set: { imports: [], template: '{{ current() }}:{{ item()?.label }}' },
    });
  });

  it('opens a screen only for the profile, number, contacts and template steps', () => {
    for (const step of [
      Step.CompleteProfile,
      Step.ConnectChannel,
      Step.ImportContacts,
      Step.SubmitTemplate,
    ]) {
      expect(opensInline(step)).toBe(true);
    }
    expect(opensInline(Step.VerifyEmail)).toBe(false);
    expect(opensInline(Step.VerifyMobile)).toBe(false);
    // The rules and the acceptance are on the card itself.
    expect(opensInline(Step.ReviewConsentPolicy)).toBe(false);
    // The balance and a top-up are on the card itself.
    expect(opensInline(Step.FundWallet)).toBe(false);
    // Who is in, an invite form and the invitations waiting are on the card itself.
    expect(opensInline(Step.InviteTeam)).toBe(false);
  });

  it('re-reads the checklist when the step screen closes and moves on once the step is done', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    const comp = fixture.componentInstance as any;
    await vi.waitFor(() => {
      TestBed.tick();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('0:Complete your business profile');
    });

    comp.openStep(comp.item());
    expect(comp.openStepId()).toBe(Step.CompleteProfile);

    // Saving the profile ticks the step on the server.
    checklist.items[0].done = true;
    await comp.closeStep(comp.item());
    fixture.detectChanges();

    expect(comp.openStepId()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('1:Verify your email');
  });

  it('stays on the step when its screen is closed without finishing it', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    const comp = fixture.componentInstance as any;
    await vi.waitFor(() => {
      TestBed.tick();
      fixture.detectChanges();
      expect(comp.item()?.step).toBe(Step.CompleteProfile);
    });
    comp.openStep(comp.item());
    await comp.closeStep(comp.item());
    fixture.detectChanges();
    expect(comp.current()).toBe(0);
  });

  it('folds the open screen away when another step is picked', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    const comp = fixture.componentInstance as any;
    await vi.waitFor(() => {
      TestBed.tick();
      fixture.detectChanges();
      expect(comp.item()?.step).toBe(Step.CompleteProfile);
    });
    comp.openStep(comp.item());
    comp.show(1);
    expect(comp.openStepId()).toBeNull();
    expect(comp.current()).toBe(1);
  });
});
