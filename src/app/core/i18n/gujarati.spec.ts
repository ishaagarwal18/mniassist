import { TestBed } from '@angular/core/testing';
import { ConfigStateService, RestService, SessionStateService } from '@abp/ng.core';
import { BehaviorSubject, of } from 'rxjs';
import { FRAME_TEXTS } from './frame-texts';
import { SCREEN_TEXTS } from './screen-texts';
import { GU_FRAME_TEXTS } from './gu-frame-texts';
import { GU_SCREEN_TEXTS } from './gu-screen-texts';
import { APP_LANGUAGES, LanguageService } from './language.service';

describe('Gujarati coverage', () => {
  it('offers Gujarati in its own script', () => {
    expect(APP_LANGUAGES).toContainEqual({ code: 'gu', label: 'ગુજરાતી', short: 'ગુ' });
  });

  it('covers every frame and screen entry without dropping substitutions', () => {
    const marks = (text: string) => (text.match(/\{\d+\}/g) ?? []).sort().join(',');
    for (const [source, translated] of [
      [FRAME_TEXTS, GU_FRAME_TEXTS],
      [SCREEN_TEXTS, GU_SCREEN_TEXTS],
    ] as const) {
      expect(Object.keys(translated).sort()).toEqual(Object.keys(source).sort());
      const broken = Object.keys(source).filter(
        (key) => !translated[key]?.trim() || marks(key) !== marks(translated[key]),
      );
      expect(broken).toEqual([]);
    }
  });

  it('translates contacts, campaigns and customer document actions', () => {
    expect(GU_SCREEN_TEXTS['Loading contacts…']).toBe('સંપર્કો લોડ થઈ રહ્યા છે…');
    expect(GU_SCREEN_TEXTS['All variables resolve']).toBe('બધા ચલોના મૂલ્યો ઉપલબ્ધ છે');
    expect(GU_SCREEN_TEXTS['Invoice']).toBe('ઇન્વૉઇસ');
  });
});

describe('Gujarati language switching', () => {
  let service: LanguageService;
  let container: HTMLElement;

  afterEach(() => {
    service?.set('en');
    container?.remove();
    TestBed.resetTestingModule();
  });

  it('saves Gujarati, translates labels and restores English while preserving customer content', async () => {
    const language = new BehaviorSubject('en');
    const request = vi.fn(() => of(undefined));
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
            getOne: () => ({ isAuthenticated: true }),
            getSetting$: () => of(undefined),
          },
        },
        { provide: RestService, useValue: { request } },
      ],
    });
    container = document.createElement('div');
    container.innerHTML = '<p>Loading contacts…</p><span translate="no">Contacts</span>';
    document.body.appendChild(container);
    service = TestBed.inject(LanguageService);
    service.set('gu');
    await vi.waitFor(() =>
      expect(container.querySelector('p')!.textContent).toBe('સંપર્કો લોડ થઈ રહ્યા છે…'),
    );
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
    expect(container.querySelector('span')!.textContent).toBe('Contacts');
    service.set('en');
    expect(container.querySelector('p')!.textContent).toBe('Loading contacts…');
    expect(document.documentElement.lang).toBe('en');
  });
});
