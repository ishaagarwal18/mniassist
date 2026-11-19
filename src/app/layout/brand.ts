import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { BRAND_NAME, BRAND_TAGLINE } from '../core/brand-name';
import { HostBrandStore } from '../core/services/host-brand.store';

export { BRAND_NAME, BRAND_TAGLINE };
export const PUBLIC_HOME_PATH = environment.production ? '/' : '/welcome';

/**
 * The MNI Assist logo and wordmark, linked to the public landing page by default.
 * `onDark` puts the logo on a small white tile, because the navy "M" in the
 * artwork would disappear on navy. `logoSrc` swaps in a workspace's own logo
 * (tenant branding); the link and name stay.
 */
@Component({
  selector: 'ar-brand',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.br--dark]': 'onDark()',
    '[class.br--lg]': 'size() === "lg"',
    '[class.br--sm]': 'size() === "sm"',
  },
  template: `
    <a class="br" [routerLink]="destination()" [attr.aria-label]="name() + ' home'" (click)="onBrandClick($event)">
      <span class="br__mark" aria-hidden="true">
        <img [src]="logo()" alt="" />
      </span>
      @if (!iconOnly()) {
        <span class="br__text">
          <span class="br__name" translate="no">{{ name() }}</span>
          @if (tagline() && !host.isReseller()) {
            <span class="br__tag">{{ tag }}</span>
          }
        </span>
      }
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
      min-width: 0;
      --br-h: 32px;
    }
    :host(.br--sm) {
      --br-h: 26px;
    }
    :host(.br--lg) {
      --br-h: 40px;
    }
    .br {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      color: var(--ar-ink-900);
      text-decoration: none;
      border-radius: var(--ar-radius-control);
      cursor: pointer;
    }
    .br:focus-visible {
      outline: 2px solid var(--ar-blue-500);
      outline-offset: 3px;
    }
    .br__mark {
      flex: none;
      display: grid;
      place-items: center;
      line-height: 0;
    }
    .br__mark img {
      /* A fixed height, not 100%: the wrapper has no definite height, and a
         percentage would fall back to the image's full natural size. */
      height: var(--br-h);
      width: auto;
      max-width: none;
      display: block;
    }
    :host(.br--dark) .br,
    :host-context([data-theme='dark']) .br {
      color: #fff;
    }
    :host(.br--dark) .br__mark,
    :host-context([data-theme='dark']) .br__mark {
      padding: 3px 5px;
      border-radius: 7px;
      background: #fff;
    }
    :host(.br--dark) .br__mark img,
    :host-context([data-theme='dark']) .br__mark img {
      height: calc(var(--br-h) - 6px);
    }
    .br__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .br__name {
      font: 700 calc(var(--br-h) * 0.5) var(--ar-font-sans);
      letter-spacing: -0.02em;
      line-height: 1.1;
      white-space: nowrap;
    }
    .br__tag {
      margin-top: 3px;
      max-width: 34ch;
      font: 500 12px/1.35 var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    :host(.br--dark) .br__tag {
      color: #94a3b8;
    }
  `,
})
export class ArBrand {
  readonly destination = input(PUBLIC_HOME_PATH);
  readonly onDark = input(false, { transform: booleanAttribute });
  readonly iconOnly = input(false, { transform: booleanAttribute });
  readonly tagline = input(false, { transform: booleanAttribute });
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** A workspace's own uploaded logo, shown in place of the MNI Assist mark. */
  readonly logoSrc = input<string | null>(null);

  protected readonly host = inject(HostBrandStore);
  protected readonly router = inject(Router, { optional: true });

  /** If already on the landing page, clicking the brand scrolls smoothly to the top. */
  protected onBrandClick(event: MouseEvent): void {
    if (!this.router) return;
    const dest = this.destination();
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    const isCurrent =
      currentUrl === dest ||
      (dest === '/' && currentUrl === '') ||
      (dest === '/welcome' && (currentUrl === '/' || currentUrl === '/welcome'));

    if (isCurrent) {
      event.preventDefault();
      const still =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: still ? 'auto' : 'smooth' });
      }
    }
  }

  /** The reseller's name on their domain, the platform's elsewhere. */
  protected readonly name = this.host.name;
  /** A workspace's logo first, then the reseller's (dark variant on dark), then the platform's. */
  protected readonly logo = computed(
    () =>
      this.logoSrc() ||
      (this.onDark() ? this.host.logoUrlDark() : this.host.logoUrl()) ||
      'brand/mni-assist-logo.png',
  );
  /** A reseller's domain shows no platform tagline. */
  protected readonly tag = BRAND_TAGLINE;
}
