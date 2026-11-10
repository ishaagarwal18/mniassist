import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpContext } from '@angular/common/http';
import {
  ConfigStateService,
  LocalizationService,
  Rest,
  RestService,
  SessionStateService,
} from '@abp/ng.core';
import { distinctUntilChanged, filter } from 'rxjs';
import { QUIET_REQUEST } from '../http/api-feedback.interceptor';
import { ScreenTranslator } from './screen-translator';

export type AppLanguage = 'en' | 'hi' | 'mr' | 'gu';

export const APP_LANGUAGES: readonly { code: AppLanguage; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
  { code: 'mr', label: 'मराठी', short: 'म' },
  { code: 'gu', label: 'ગુજરાતી', short: 'ગુ' },
];

/**
 * The user's saved choice: ABP's own default-language setting, set at user level (falling back to the
 * workspace's, then the global one). Visible to the client in the application configuration.
 */
export const LANGUAGE_SETTING = 'Abp.Localization.DefaultLanguage';

/** Set when the language is picked while signed out, so signing in keeps it rather than the saved one. */
const PICKED_SIGNED_OUT_KEY = 'ar.lang.pickedSignedOut';

export function toAppLanguage(value: string | null | undefined): AppLanguage {
  const code = (value ?? '').toLowerCase().split(/[-_;]/)[0];
  return code === 'hi' || code === 'mr' || code === 'gu' ? code : 'en';
}

/** ABP separates resource and key with `::`; escape literal colons and percent signs in UI text. */
export function uiResourceKey(text: string): string {
  return `Ui:${text.replaceAll('%', '%25').replaceAll(':', '%3A')}`;
}

/**
 * ABP owns the selected culture, localization resources and interpolation. This adapter keeps
 * existing frame templates and screen text working with the same backend AutoReach resource.
 * The user's ABP language setting is also saved so the choice follows them across devices.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly session = inject(SessionStateService);
  private readonly config = inject(ConfigStateService);
  private readonly rest = inject(RestService);
  private readonly localization = inject(LocalizationService);
  private readonly resourceVersion = signal(0);

  readonly lang = signal<AppLanguage>(toAppLanguage(this.session.getLanguage()));

  constructor() {
    const destroyRef = inject(DestroyRef);
    document.documentElement.lang = this.lang();

    // ABP also sets the session language (from the server's culture at start-up): follow it.
    this.session
      .getLanguage$()
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((l) => this.apply(toAppLanguage(l)));

    // Refresh labels only after ABP has loaded the selected culture. A language selection can
    // arrive before its HTTP response; never render the previous culture as the new one.
    this.localization
      .getResource$('AutoReach')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((resource) => this.refreshResource(resource));

    destroyRef.onDestroy(() => this.translator?.stop());

    // Signed in: the saved choice wins, unless one was just picked on the sign-in page.

    this.config
      .getSetting$(LANGUAGE_SETTING)
      .pipe(
        filter(() => !!this.config.getOne('currentUser')?.isAuthenticated),
        distinctUntilChanged(),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((saved) => this.reconcile(saved));
  }

  /** Frame text in the current language. Reads the language signal, so templates follow a change. */
  t(text: string, ...args: (string | number)[]): string {
    this.lang();
    this.resourceVersion();
    const fallback = text.replace(/\{(\d+)\}/g, (match, index) => String(args[+index] ?? match));
    if (
      toAppLanguage(this.config.getDeep('localization.currentCulture.cultureName')) !== this.lang()
    )
      return fallback;
    return this.localization.instant(
      { key: `AutoReach::${uiResourceKey(text)}`, defaultValue: fallback },
      ...args.map(String),
    );
  }

  /** Switches the app's language, and saves it for the user when signed in. */
  set(code: AppLanguage): void {
    if (code === this.lang()) return;
    this.session.setLanguage(code);
    this.apply(code);

    const signedIn = !!this.config.getOne('currentUser')?.isAuthenticated;
    if (signedIn) {
      this.save(code);
    } else {
      try {
        sessionStorage.setItem(PICKED_SIGNED_OUT_KEY, code);
      } catch {
        /* storage blocked: the saved choice will apply after sign-in instead */
      }
    }
  }

  private apply(code: AppLanguage): void {
    if (code !== this.lang()) this.translator?.stop();
    this.lang.set(code);
    document.documentElement.lang = code;
    if (code === 'en') this.translator?.stop();
    this.refreshResource(this.localization.getResource('AutoReach'));
  }

  private translator: ScreenTranslator | null = null;
  private readonly dictionaries = new WeakMap<
    Record<string, string>,
    ReadonlyMap<string, string>
  >();
  private lastResource: Record<string, string> | undefined;
  private lastCulture: AppLanguage | undefined;

  private refreshResource(resource: Record<string, string> | undefined): void {
    if (
      toAppLanguage(this.config.getDeep('localization.currentCulture.cultureName')) !== this.lang()
    )
      return;
    if (resource === this.lastResource && this.lang() === this.lastCulture) return;
    if (resource && this.lastResource && this.lang() === this.lastCulture) {
      const keys = Object.keys(resource);
      if (
        keys.length === Object.keys(this.lastResource).length &&
        keys.every((key) => resource[key] === this.lastResource![key])
      ) {
        this.lastResource = resource;
        return;
      }
    }
    this.lastResource = resource;
    this.lastCulture = this.lang();
    this.resourceVersion.update((version) => version + 1);
    this.translateScreens(resource);
  }

  /**
   * Existing screens render English literals. Feed their rendering adapter exclusively from
   * ABP's current resource, including updates received after configuration refreshes.
   */
  private translateScreens(resource: Record<string, string> | undefined): void {
    if (this.lang() === 'en') {
      this.translator?.stop();
      return;
    }
    if (!resource) return;
    const cached = this.dictionaries.get(resource);
    if (cached) {
      this.translator ??= new ScreenTranslator(document.body);
      this.translator.use(cached);
      return;
    }
    const dict = new Map<string, string>();
    for (const [key, value] of Object.entries(resource)) {
      if (key.startsWith('Ui:')) {
        const english = key.slice(3).replaceAll('%3A', ':').replaceAll('%25', '%');
        dict.set(english, value);
      }
    }
    this.dictionaries.set(resource, dict);
    this.translator ??= new ScreenTranslator(document.body);
    this.translator.use(dict);
  }

  private reconcile(saved: string | undefined): void {
    let picked: string | null = null;
    try {
      picked = sessionStorage.getItem(PICKED_SIGNED_OUT_KEY);
      sessionStorage.removeItem(PICKED_SIGNED_OUT_KEY);
    } catch {
      /* storage blocked */
    }
    if (picked) {
      // Chosen on the sign-in page: keep it, and remember it for this user from now on.
      if (toAppLanguage(saved) !== toAppLanguage(picked) || !saved)
        this.save(toAppLanguage(picked));
      return;
    }
    if (saved && toAppLanguage(saved) !== this.lang()) {
      this.session.setLanguage(toAppLanguage(saved));
      this.apply(toAppLanguage(saved));
    }
  }

  // Best effort: the switch has already happened here; failing to remember it is not worth an error.
  private save(code: AppLanguage): void {
    this.rest
      .request<{ language: string }, void>(
        {
          method: 'PUT',
          url: '/api/auto-reach/my-language',
          body: { language: code },
          // No toast either way: the app-wide feedback would show a save or a failure for a background call.
          context: new HttpContext().set(QUIET_REQUEST, true),
        } as Rest.Request<{ language: string }>,
        { apiName: 'AutoReach', skipHandleError: true },
      )
      .subscribe({ error: () => undefined });
  }
}
