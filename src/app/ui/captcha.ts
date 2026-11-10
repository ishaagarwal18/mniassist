import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CaptchaService } from '../proxy/security/captcha.service';

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptLoading: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TURNSTILE_SCRIPT;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptLoading = null;
      reject(new Error('Captcha script failed to load'));
    };
    document.head.appendChild(s);
  });
  return scriptLoading;
}

/**
 * The human check on a public form. Asks the API whether one is configured; if not it
 * renders nothing and reports `required: false`, so the form behaves as it always did.
 * With Cloudflare Turnstile configured, it draws the widget and emits its token (null when
 * the token expires).
 */
@Component({
  selector: 'ar-captcha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #host class="ar-captcha"></div>
    @if (failed()) {
      <p class="ar-captcha__err">
        The verification widget did not load. Reload the page to try again.
      </p>
    }
  `,
  styles: `
    .ar-captcha:empty {
      display: none;
    }
    .ar-captcha {
      margin: 4px 0 12px;
    }
    .ar-captcha__err {
      margin: 0 0 12px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-red-600);
    }
  `,
})
export class ArCaptcha implements OnInit, OnDestroy {
  /** Whether the form must wait for a token. Emitted once the configuration is known. */
  readonly required = output<boolean>();
  readonly token = output<string | null>();

  private readonly api = inject(CaptchaService);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  protected readonly failed = signal(false);
  private widgetId: string | null = null;

  async ngOnInit(): Promise<void> {
    let config;
    try {
      config = await firstValueFrom(this.api.getConfig());
    } catch {
      // No answer means no captcha: the server refuses a missing token only when one is configured.
      this.required.emit(false);
      return;
    }
    if (config.provider !== 'turnstile' || !config.siteKey) {
      this.required.emit(false);
      return;
    }
    this.required.emit(true);
    try {
      await loadTurnstile();
      this.widgetId = window.turnstile!.render(this.host().nativeElement, {
        sitekey: config.siteKey,
        callback: (t: string) => this.token.emit(t),
        'expired-callback': () => this.token.emit(null),
        'error-callback': () => this.token.emit(null),
      });
    } catch {
      this.failed.set(true);
    }
  }

  /** A token works once: after a refused submit, ask for a fresh one. */
  reset(): void {
    if (this.widgetId && window.turnstile) {
      window.turnstile.reset(this.widgetId);
      this.token.emit(null);
    }
  }

  ngOnDestroy(): void {
    if (this.widgetId && window.turnstile) window.turnstile.remove(this.widgetId);
  }
}
