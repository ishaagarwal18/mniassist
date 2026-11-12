import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CurrentUserService } from '../../core/services/current-user.service';
import { ArBrand, PUBLIC_HOME_PATH } from '../../layout/brand';

/** The industry pages, by address and name, for the header, footer and landing page. */
export const INDUSTRY_LINKS = [
  { slug: 'system-integrators', label: 'System integrators' },
  { slug: 'oems', label: 'Machine OEMs' },
  { slug: 'distributors', label: 'Distributors and dealers' },
] as const;

/**
 * The frame of the public pages beside the landing page (ROI calculator, industry pages): the brand, sign-in and sign-up, and a
 * footer leading back to plans and to each other. No sign-in needed; a signed-in visitor gets "Open MNI Assist".
 */
@Component({
  selector: 'ar-public-frame',
  imports: [RouterLink, ArBrand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pf-nav">
      <div class="pf-wrap pf-nav__row">
        <ar-brand onDark />
        <nav class="pf-nav__links" aria-label="Pages">
          <a routerLink="/roi">ROI calculator</a>
          @for (i of industries; track i.slug) {
            <a [routerLink]="['/industries', i.slug]">{{ i.label }}</a>
          }
        </nav>
        <div class="pf-nav__cta">
          @if (signedIn()) {
            <a class="pf-btn pf-btn--primary" routerLink="/home">Open MNI Assist</a>
          } @else {
            <a class="pf-btn pf-btn--ghost" routerLink="/login">Log in</a>
            <a class="pf-btn pf-btn--primary" routerLink="/signup">Create a workspace</a>
          }
        </div>
      </div>
    </header>
    <main class="pf-wrap pf-main"><ng-content /></main>
    <footer class="pf-foot">
      <div class="pf-wrap pf-foot__row">
        <span>© {{ year }} Emnisoft Pvt Ltd. MNI Assist is a product of Emnisoft Pvt Ltd.</span>
        <nav aria-label="More">
          <a [routerLink]="publicHome">Plans and features</a>
          <a routerLink="/roi">ROI calculator</a>
          <a routerLink="/privacy">Privacy policy</a>
        </nav>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--ar-bg-50);
      color: var(--ar-ink-900);
    }
    .pf-wrap {
      width: 100%;
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 20px;
      box-sizing: border-box;
    }
    .pf-nav {
      background: var(--ar-nav);
      border-bottom: 1px solid var(--ar-nav-line);
    }
    .pf-nav__row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      align-items: center;
      min-height: 60px;
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .pf-nav__links {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      flex: 1;
    }
    .pf-nav__links a {
      color: var(--ar-nav-text);
      text-decoration: none;
      font-size: 13px;
    }
    .pf-nav__links a:hover {
      color: #fff;
    }
    .pf-nav__cta {
      display: flex;
      gap: 8px;
    }
    .pf-btn {
      display: inline-flex;
      align-items: center;
      height: 34px;
      padding: 0 14px;
      border-radius: var(--ar-radius-control);
      text-decoration: none;
      font: 600 13px var(--ar-font-sans);
    }
    .pf-btn--primary {
      background: var(--ar-blue-500);
      color: #fff;
    }
    .pf-btn--ghost {
      color: var(--ar-nav-text);
    }
    .pf-main {
      flex: 1;
      padding-top: 32px;
      padding-bottom: 48px;
    }
    .pf-foot {
      padding: 24px 0;
      border-top: 1px solid var(--ar-line-200);
      font-size: 13px;
      color: var(--ar-ink-500);
    }
    .pf-foot__row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
      justify-content: space-between;
    }
    .pf-foot nav {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
    }
    .pf-foot a {
      color: inherit;
    }
  `,
})
export class ArPublicFrame {
  protected readonly publicHome = PUBLIC_HOME_PATH;
  protected readonly signedIn = inject(CurrentUserService).isAuthenticated;
  protected readonly industries = INDUSTRY_LINKS;
  protected readonly year = new Date().getFullYear();
}
