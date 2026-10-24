import { TestBed } from '@angular/core/testing';
import {
  ConfigStateService,
  LocalizationService,
  RestService,
  SessionStateService,
} from '@abp/ng.core';
import { BehaviorSubject, of } from 'rxjs';
import { APP_LANGUAGES, LanguageService, toAppLanguage, uiResourceKey } from './language.service';

describe('ABP app localization', () => {
  let service: LanguageService;
  let container: HTMLElement;
  let language: BehaviorSubject<string>;
  let resource: BehaviorSubject<Record<string, string>>;
  let culture: string;
  let signedIn: boolean;
  let request: ReturnType<typeof vi.fn>;
  let instant: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.removeItem('ar.lang.pickedSignedOut');
    language = new BehaviorSubject('en');
    resource = new BehaviorSubject<Record<string, string>>({});
    culture = 'en';
    signedIn = true;
    request = vi.fn(() => of(undefined));
    instant = vi.fn((key: { key: string; defaultValue: string }, ...args: string[]) => {
      const value = resource.value[key.key.replace('AutoReach::', '')] ?? key.defaultValue;
      return value.replace(/\{(\d+)\}/g, (match, index) => args[+index] ?? match);
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SessionStateService,
          useValue: {
            getLanguage: () => language.value,
            getLanguage$: () => language,
            setLanguage: (value: string) => language.next(value),
          },
        },
        {
          provide: ConfigStateService,
          useValue: {
            getOne: () => ({ isAuthenticated: signedIn }),
            getSetting$: () => of(undefined),
            getDeep: () => culture,
          },
        },
        {
          provide: LocalizationService,
          useValue: {
            getResource$: () => resource,
            getResource: () => resource.value,
            instant,
          },
        },
        { provide: RestService, useValue: { request } },
      ],
    });
    container = document.createElement('div');
    container.innerHTML = '<p>Loading contacts…</p><span translate="no">Contacts</span>';
    document.body.appendChild(container);
    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    container.remove();
    sessionStorage.removeItem('ar.lang.pickedSignedOut');
    document.documentElement.lang = 'en';
  });

  it('normalizes all supported ABP cultures and offers native language names', () => {
    expect(['en-GB', 'hi-IN', 'mr_IN', 'GU_in', 'fr'].map(toAppLanguage)).toEqual([
      'en',
      'hi',
      'mr',
      'gu',
      'en',
    ]);
    expect(APP_LANGUAGES).toContainEqual({ code: 'gu', label: 'ગુજરાતી', short: 'ગુ' });
  });

  it('uses ABP resource lookup and interpolation for frame labels', () => {
    resource.next({ [uiResourceKey('Sign in with {0}')]: '{0} વડે સાઇન ઇન કરો' });
    culture = 'gu';
    service.set('gu');
    expect(service.t('Sign in with {0}', 'Google')).toBe('Google વડે સાઇન ઇન કરો');
    expect(instant).toHaveBeenLastCalledWith(
      { key: 'AutoReach::Ui:Sign in with {0}', defaultValue: 'Sign in with Google' },
      'Google',
    );
  });

  it('renders screens from delayed ABP resources and preserves opted-out user content', () => {
    service.set('gu');
    expect(container.querySelector('p')!.textContent).toBe('Loading contacts…');
    culture = 'gu';
    resource.next({ [uiResourceKey('Loading contacts…')]: 'સંપર્કો લોડ થઈ રહ્યા છે…' });
    expect(container.querySelector('p')!.textContent).toBe('સંપર્કો લોડ થઈ રહ્યા છે…');
    expect(container.querySelector('span')!.textContent).toBe('Contacts');
    expect(document.documentElement.lang).toBe('gu');
    expect(language.value).toBe('gu');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        url: '/api/auto-reach/my-language',
        body: { language: 'gu' },
      }),
      expect.anything(),
    );
    service.set('en');
    expect(container.querySelector('p')!.textContent).toBe('Loading contacts…');
  });

  it('ignores a stale culture response after a second selection', () => {
    service.set('hi');
    service.set('mr');
    culture = 'hi';
    resource.next({ [uiResourceKey('Loading contacts…')]: 'संपर्क लोड हो रहे हैं…' });
    expect(container.querySelector('p')!.textContent).toBe('Loading contacts…');
    expect(service.t('Loading contacts…')).toBe('Loading contacts…');
    culture = 'mr';
    resource.next({ [uiResourceKey('Loading contacts…')]: 'संपर्क लोड होत आहेत…' });
    expect(container.querySelector('p')!.textContent).toBe('संपर्क लोड होत आहेत…');
  });

  it('falls back to interpolated English when a resource key is missing', () => {
    expect(service.t('Showing {0} of {1}', 2, 10)).toBe('Showing 2 of 10');
  });

  it('keeps a signed-out language selection without calling the user settings API', () => {
    signedIn = false;
    service.set('hi');
    expect(sessionStorage.getItem('ar.lang.pickedSignedOut')).toBe('hi');
    expect(request).not.toHaveBeenCalled();
  });

  it('escapes resource separators without losing literal percent sequences', () => {
    expect(uiResourceKey('Status:: 100% %3A')).toBe('Ui:Status%3A%3A 100%25 %253A');
  });
});
