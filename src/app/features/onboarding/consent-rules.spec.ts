import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { OnboardingStore } from '../../core/services/onboarding.store';
import { ToastService } from '../../core/ui/toast.service';
import { OnboardingChecklistService } from '../../proxy/identity';
import { OnboardingChecklistStep as Step } from '../../proxy/identity/onboarding-checklist-step.enum';
import { ArOnboardingConsentRules, CONSENT_RULES, CONSENT_RULES_VERSION } from './consent-rules';

describe('Get started consent rules', () => {
  let acceptConsentRules: ReturnType<typeof vi.fn>;
  let toasts: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    acceptConsentRules = vi.fn(() =>
      of({
        items: [{ step: Step.ReviewConsentPolicy, done: true }],
        consentRulesAcceptedBy: 'Asha Patil',
        consentRulesAcceptedAtUtc: '2026-11-09T06:30:00Z',
        consentRulesVersion: CONSENT_RULES_VERSION,
      }),
    );
    toasts = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: OnboardingChecklistService,
          useValue: { get: () => of({ items: [] }), acceptConsentRules },
        },
        { provide: ToastService, useValue: toasts },
      ],
    });
  });

  function render(acceptance?: { by: string; at: string; version: string }) {
    const fixture = TestBed.createComponent(ArOnboardingConsentRules);
    fixture.componentRef.setInput('acceptance', acceptance);
    fixture.detectChanges();
    return fixture;
  }

  it('shows every rule and keeps Accept off until the box is ticked', () => {
    const fixture = render();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.cr__rule').length).toBe(CONSENT_RULES.length);
    const accept = el.querySelector<HTMLButtonElement>('.cr__row button')!;
    expect(accept.disabled).toBe(true);

    el.querySelector<HTMLInputElement>('.cr__agree input')!.click();
    fixture.detectChanges();
    expect(accept.disabled).toBe(false);
  });

  it('sends the rules version, records who accepted and moves on', async () => {
    const fixture = render();
    const accepted = vi.fn();
    fixture.componentInstance.accepted.subscribe(accepted);
    fixture.nativeElement.querySelector('.cr__agree input').click();
    fixture.detectChanges();

    await (fixture.componentInstance as any).accept();

    expect(acceptConsentRules).toHaveBeenCalledWith({ version: CONSENT_RULES_VERSION });
    expect(accepted).toHaveBeenCalled();
    expect(TestBed.inject(OnboardingStore).checklist().consentRules).toEqual({
      by: 'Asha Patil',
      at: '2026-11-09T06:30:00Z',
      version: CONSENT_RULES_VERSION,
    });
  });

  it('shows who accepted instead of the checkbox once the current rules are accepted', () => {
    const fixture = render({
      by: 'Asha Patil',
      at: '2026-11-09T06:30:00Z',
      version: CONSENT_RULES_VERSION,
    });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.cr__ok')?.textContent).toContain('Asha Patil');
    expect(el.querySelector('.cr__agree')).toBeNull();
  });

  it('asks again when the rules changed after the last acceptance', () => {
    const fixture = render({ by: 'Asha Patil', at: '2025-01-01T00:00:00Z', version: '2025-01-01' });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.cr__old')?.textContent).toContain('changed');
    expect(el.querySelector('.cr__agree')).not.toBeNull();
  });
});
