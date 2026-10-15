import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChannelService as ChannelApi } from '../../proxy/channels';
import { ChannelService as ChannelStore } from '../../core/services/channel.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArDialog } from '../../ui/dialog';
import { ArTabs } from '../../ui/tabs';
import { ArConnectNumberDialog } from './connect-number-dialog';
import { FacebookSignupService } from './facebook-signup.service';

// Dialogs and tabs are replaced through TestBed below. Keep their third-party
// widgets out of Node, where Syncfusion's mixed CJS/ESM exports cannot be loaded.
vi.mock('@syncfusion/ej2-angular-popups', () => ({ DialogComponent: class {} }));
vi.mock('@syncfusion/ej2-angular-navigations', () => ({
  TabAllModule: class {},
  TabComponent: class {},
  TabItemsDirective: class {},
  TabItemDirective: class {},
}));

const facebook = {
  prepare: vi.fn<(appId: string, graphVersion: string) => Promise<void>>(),
  launch:
    vi.fn<(configuration: string) => Promise<{ code: string | null; status: string | null }>>(),
};

@Component({ selector: 'ar-dialog', template: '<ng-content />' })
class TestDialog {
  readonly title = input<string>();
  readonly dismiss = output<void>();
}

@Component({
  selector: 'ar-tabs',
  template: `@for (tab of tabs(); track tab) {
    <button (click)="activeChange.emit(tab)">{{ tab }}</button>
  }`,
})
class TestTabs {
  readonly tabs = input<readonly string[]>([]);
  readonly active = input<string>();
  readonly activeChange = output<string>();
}

const session = {
  id: 'session',
  metaAppId: 'app',
  embeddedSignupConfigurationId: 'configuration',
  graphVersion: 'v25.0',
};

describe('guided WhatsApp connection', () => {
  const api = {
    getOrStartOnboarding: vi.fn(() => of(session)),
    completeEmbeddedSignup: vi.fn(() => of({ ...session, completedAtUtc: '2026-10-15' })),
    getOrStartSolutionPartnerOnboarding: vi.fn(() => of({ id: 'gupshup-session' })),
  };
  const channels = { reload: vi.fn() };
  const toasts = { success: vi.fn(), warning: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    facebook.prepare.mockResolvedValue(undefined);
    facebook.launch.mockResolvedValue({ code: null, status: 'unknown' });
    TestBed.configureTestingModule({
      imports: [ArConnectNumberDialog],
      providers: [
        provideRouter([]),
        { provide: ChannelApi, useValue: api },
        { provide: ChannelStore, useValue: channels },
        { provide: ToastService, useValue: toasts },
        { provide: FacebookSignupService, useValue: facebook },
      ],
    }).overrideComponent(ArConnectNumberDialog, {
      remove: { imports: [ArDialog, ArTabs] },
      add: { imports: [TestDialog, TestTabs] },
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  function create() {
    const fixture = TestBed.createComponent(ArConnectNumberDialog);
    fixture.detectChanges();
    const button = (text: string) =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
      ).find((b) => b.textContent?.trim() === text);
    const waitForFacebook = () =>
      vi.waitFor(() => {
        fixture.detectChanges();
        expect(button('Continue with Facebook')).toBeDefined();
      });
    return { fixture, button, waitForFacebook };
  }

  function finishFacebook() {
    facebook.launch.mockImplementation(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://www.facebook.com',
          data: JSON.stringify({
            type: 'WA_EMBEDDED_SIGNUP',
            event: 'FINISH',
            data: { waba_id: 'waba', phone_number_id: 'number', business_id: 'business' },
          }),
        }),
      );
      return Promise.resolve({ code: 'one-time-code', status: 'connected' });
    });
  }

  it('automatically prepares Facebook and only offers sign-in when it is ready', async () => {
    let ready!: () => void;
    facebook.prepare.mockReturnValue(new Promise((resolve) => (ready = resolve)));
    const { fixture, button } = create();
    await fixture.whenStable();
    expect(api.getOrStartOnboarding).toHaveBeenCalledOnce();
    expect(button('Continue with Facebook')).toBeUndefined();
    expect(fixture.nativeElement.querySelector('input[name=twoStepPin]')).toBeNull();
    ready();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button('Continue with Facebook')?.disabled).toBe(false);
    expect(button('Start setup')).toBeUndefined();
  });

  it('opens Facebook in the click handler, then requests a PIN and completes exactly once', async () => {
    finishFacebook();
    const { fixture, button, waitForFacebook } = create();
    await waitForFacebook();
    button('Continue with Facebook')!.click();
    expect(facebook.launch).toHaveBeenCalledWith('configuration');
    expect(api.completeEmbeddedSignup).not.toHaveBeenCalled();
    await fixture.whenStable();
    fixture.detectChanges();
    const pin = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[name=twoStepPin]',
    )!;
    expect(pin).not.toBeNull();
    expect(button('Connect number')?.disabled).toBe(true);
    pin.value = '12345';
    pin.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(button('Connect number')?.disabled).toBe(true);
    pin.value = '123456';
    pin.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    button('Connect number')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.completeEmbeddedSignup).toHaveBeenCalledExactlyOnceWith('session', {
      authorizationCode: 'one-time-code',
      wabaId: 'waba',
      phoneNumberId: 'number',
      businessPortfolioId: 'business',
      twoStepPin: '123456',
    });
    expect(channels.reload).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Your WhatsApp number is connected.');
    expect(fixture.nativeElement.querySelector('input[name=twoStepPin]')).toBeNull();
  });

  it('offers a direct retry instead of diagnosing an immediate response as a blocked popup', async () => {
    const { fixture, button, waitForFacebook } = create();
    await waitForFacebook();
    button('Continue with Facebook')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Facebook sign-in did not finish.');
    expect(fixture.nativeElement.textContent).not.toContain('Allow pop-ups');
    expect(button('Try Facebook again')?.disabled).toBe(false);
    button('Try Facebook again')!.click();
    expect(facebook.launch).toHaveBeenCalledTimes(2);
    expect(api.completeEmbeddedSignup).not.toHaveBeenCalled();
    await fixture.whenStable();
  });

  it('recovers from SDK loading failure using the in-app Try again action', async () => {
    facebook.prepare.mockRejectedValueOnce(new Error('Network failure'));
    const { fixture, button, waitForFacebook } = create();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Facebook sign-in could not load.');
    });
    expect(button('Continue with Facebook')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Facebook sign-in could not load.');
    button('Try again')!.click();
    await waitForFacebook();
    expect(button('Continue with Facebook')?.disabled).toBe(false);
    expect(api.getOrStartOnboarding).toHaveBeenCalledTimes(2);
  });

  it('discards the authorization result if the dialog is closed while Facebook is open', async () => {
    let resolveLogin!: (value: { code: string; status: string }) => void;
    facebook.launch.mockReturnValue(new Promise((resolve) => (resolveLogin = resolve)));
    const { fixture, button, waitForFacebook } = create();
    await waitForFacebook();
    button('Continue with Facebook')!.click();
    fixture.destroy();
    resolveLogin({ code: 'unused-code', status: 'connected' });
    await Promise.resolve();
    expect(api.completeEmbeddedSignup).not.toHaveBeenCalled();
  });

  it('keeps Gupshup available independently of Facebook preparation', async () => {
    const { fixture, button } = create();
    await fixture.whenStable();
    button('Gupshup')!.click();
    fixture.detectChanges();
    button('Start setup')!.click();
    await fixture.whenStable();
    expect(api.getOrStartSolutionPartnerOnboarding).toHaveBeenCalledOnce();
    expect(facebook.launch).not.toHaveBeenCalled();
  });
});
