import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ArOnboardingWizard } from './wizard';
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

  it('does not display demo completion while loading and opens on unverified email', async () => {
    const fixture = TestBed.createComponent(ArOnboardingWizard);
    fixture.detectChanges();
    TestBed.tick();
    const store = TestBed.inject(OnboardingStore);
    expect(store.checklist().items).toEqual([]);
    response.next({
      items: [
        { step: Step.VerifyEmail, done: false },
        { step: Step.VerifyMobile, done: false },
        { step: Step.CompleteProfile, done: false },
        { step: Step.ConnectChannel, done: false },
      ],
    });
    await vi.waitFor(() => {
      TestBed.tick();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('0:Verify your email');
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
