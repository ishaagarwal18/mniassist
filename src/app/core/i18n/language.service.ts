import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpContext } from '@angular/common/http';
import { ConfigStateService, Rest, RestService, SessionStateService } from '@abp/ng.core';
import { distinctUntilChanged, filter } from 'rxjs';

import { environment } from '../../../environments/environment';
import { QUIET_REQUEST } from '../http/api-feedback.interceptor';
import { FRAME_TEXTS } from './frame-texts';

export type AppLanguage = 'en' | 'hi' | 'mr';

export const APP_LANGUAGES: readonly { code: AppLanguage; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
  { code: 'mr', label: 'मराठी', short: 'म' },
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
  return code === 'hi' || code === 'mr' ? code : 'en';
}

/** Frame text in a language: the English itself when there is no entry. `{0}`… are filled from `args`. */
export function translate(lang: AppLanguage, text: string, ...args: (string | number)[]): string {
  const found = lang === 'en' ? text : (FRAME_TEXTS[text]?.[lang] ?? text);
  return args.length ? found.replace(/\{(\d+)\}/g, (m, i) => String(args[+i] ?? m)) : found;
}

/**
 * The app's language: English, Hindi or Marathi. Setting it does three things — ABP's session
 * language (sent to the API as Accept-Language, so server messages come back in it), the frame's
 * own text (menu, header, sign-in; see FRAME_TEXTS), and, when signed in, the user's saved choice,
 * so it follows them to their other devices.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly session = inject(SessionStateService);
  private readonly config = inject(ConfigStateService);
  private readonly rest = inject(RestService);

  readonly lang = signal<AppLanguage>(toAppLanguage(this.session.getLanguage()));

  constructor() {
    const destroyRef = inject(DestroyRef);
    document.documentElement.lang = this.lang();

    // ABP also sets the session language (from the server's culture at start-up): follow it.
    this.session
      .getLanguage$()
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((l) => this.apply(toAppLanguage(l)));

    // Signed in: the saved choice wins, unless one was just picked on the sign-in page.
    if (!environment.useMockData) {
      this.config
        .getSetting$(LANGUAGE_SETTING)
        .pipe(
          filter(() => !!this.config.getOne('currentUser')?.isAuthenticated),
          distinctUntilChanged(),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe((saved) => this.reconcile(saved));
    }
  }

  /** Frame text in the current language. Reads the language signal, so templates follow a change. */
  t(text: string, ...args: (string | number)[]): string {
    return translate(this.lang(), text, ...args);
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
    this.lang.set(code);
    document.documentElement.lang = code;
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
    if (environment.useMockData) return;
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
