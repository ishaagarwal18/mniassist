import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { CurrentUserService } from '../../core/services/current-user.service';
import { ArBrand, PUBLIC_HOME_PATH } from '../../layout/brand';
import { ArIcon } from '../../ui';

/** The industry pages, by address and name, for the header, footer and landing page. */
export const INDUSTRY_LINKS = [
  { slug: 'system-integrators', label: 'System integrators' },
  { slug: 'oems', label: 'Machine OEMs' },
  { slug: 'distributors', label: 'Distributors and dealers' },
] as const;

/**
 * The frame of the public pages beside the landing page (ROI calculator, industry pages): the brand, sign-in and sign-up, and a
 * footer leading back to plans and to each other. Styled with the landing page header's frosted glass, hover effect, and trace box.
 */
@Component({
  selector: 'ar-public-frame',
  imports: [RouterLink, RouterLinkActive, ArBrand, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pf-nav" [class.pf-nav--open]="mobileMenuOpen()">
      <div class="pf-wrap pf-nav__row">
        <ar-brand onDark />
        <nav class="pf-nav__links" aria-label="Pages">
          <a routerLink="/roi" routerLinkActive="is-active">ROI calculator</a>
          @for (i of industries; track i.slug) {
            <a [routerLink]="['/industries', i.slug]" routerLinkActive="is-active">{{ i.label }}</a>
          }
        </nav>
        <div class="pf-nav__cta">
          @if (signedIn()) {
            <a class="pf-btn pf-btn--primary" routerLink="/home">Open MNI Assist</a>
          } @else {
            <a class="pf-btn pf-btn--ghost" routerLink="/login">Log in</a>
            <a class="pf-btn pf-btn--primary pf-nav__signup" routerLink="/signup">Create a workspace</a>
          }
        </div>
        <button
          type="button"
          class="pf-nav__toggle"
          [attr.aria-expanded]="mobileMenuOpen()"
          aria-label="Toggle navigation menu"
          (click)="toggleMobileMenu()"
        >
          <ar-icon [name]="mobileMenuOpen() ? 'close' : 'menu'" [size]="20" />
        </button>
      </div>

      @if (mobileMenuOpen()) {
        <div class="pf-nav__mobile" (click)="closeMobileMenu()">
          <nav class="pf-nav__mobile-links" aria-label="Mobile pages" (click)="$event.stopPropagation()">
            <a
              routerLink="/roi"
              routerLinkActive="is-active"
              class="pf-nav__mobile-item"
              (click)="closeMobileMenu()"
            >ROI calculator</a>
            @for (i of industries; track i.slug) {
              <a
                [routerLink]="['/industries', i.slug]"
                routerLinkActive="is-active"
                class="pf-nav__mobile-item"
                (click)="closeMobileMenu()"
              >{{ i.label }}</a>
            }
            <div class="pf-nav__mobile-cta">
              @if (signedIn()) {
                <a class="pf-btn pf-btn--primary pf-btn--lg" routerLink="/home" (click)="closeMobileMenu()">Open MNI Assist</a>
              } @else {
                <a class="pf-btn pf-btn--primary pf-btn--lg" routerLink="/signup" (click)="closeMobileMenu()">Create a workspace</a>
                <a class="pf-btn pf-btn--ghost pf-btn--lg" routerLink="/login" (click)="closeMobileMenu()">Log in</a>
              }
            </div>
          </nav>
        </div>
      }
    </header>
    <main [class.pf-wrap]="!bleed()" [class.pf-main]="true" [class.pf-main--bleed]="bleed()"><ng-content /></main>
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

    /* Header with landing page glassmorphism & ambient border */
    .pf-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(6, 11, 28, 0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(59, 130, 246, 0.16);
    }
    .pf-nav__row {
      display: flex;
      align-items: center;
      gap: 20px;
      height: 62px;
    }

    /* Links with landing page hover effect & trace box */
    .pf-nav__links {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
    }
    .pf-nav__links a {
      position: relative;
      display: inline-flex;
      align-items: center;
      padding: 6px 13px;
      border-radius: var(--ar-radius-control, 6px);
      font: 500 13px/1.4 var(--ar-font-sans);
      color: var(--ar-nav-text, #94A3B8);
      text-decoration: none;
      border: 1px solid transparent;
      transition:
        color 220ms ease,
        background-color 220ms ease,
        border-color 220ms ease,
        box-shadow 220ms ease,
        transform 180ms ease;
    }
    .pf-nav__links a:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transform: translateY(-1px);
    }
    .pf-nav__links a.is-active {
      color: #FFFFFF;
      background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
      border-color: rgba(96, 165, 250, 0.4);
      box-shadow:
        0 1px 3px rgba(15, 23, 42, 0.2),
        0 0 12px rgba(37, 99, 235, 0.35);
      font-weight: 600;
      transform: none;
    }

    /* Nav CTA & Buttons */
    .pf-nav__cta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pf-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      padding: 0 16px;
      border-radius: var(--ar-radius-control, 6px);
      text-decoration: none;
      font: 600 13px var(--ar-font-sans);
      border: 1px solid transparent;
      box-sizing: border-box;
      transition:
        background-color 220ms ease,
        border-color 220ms ease,
        color 220ms ease,
        transform 180ms ease,
        box-shadow 220ms ease;
    }
    .pf-btn--primary {
      background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
      color: #FFFFFF;
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
    }
    .pf-btn--primary:hover {
      background: linear-gradient(180deg, #1D4ED8 0%, #1E40AF 100%);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      transform: translateY(-1px);
    }
    .pf-btn--ghost {
      color: var(--ar-nav-text, #94A3B8);
      background: transparent;
    }
    .pf-btn--ghost:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.12);
    }
    .pf-btn--lg {
      width: 100%;
      height: 42px;
      font-size: 14px;
    }

    /* Mobile toggle */
    .pf-nav__toggle {
      display: none;
      border: 0;
      background: none;
      color: var(--ar-nav-text, #94A3B8);
      padding: 8px;
      border-radius: var(--ar-radius-control, 6px);
      cursor: pointer;
      margin-left: auto;
    }
    .pf-nav__toggle:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.08);
    }

    /* Mobile dropdown drawer */
    .pf-nav__mobile {
      position: fixed;
      top: 62px;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(6, 11, 28, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      z-index: 99;
      padding: 20px;
      overflow-y: auto;
    }
    .pf-nav__mobile-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 480px;
      margin: 0 auto;
    }
    .pf-nav__mobile-item {
      padding: 12px 16px;
      border-radius: var(--ar-radius-control, 6px);
      font: 500 15px var(--ar-font-sans);
      color: var(--ar-nav-text, #94A3B8);
      text-decoration: none;
      border: 1px solid transparent;
      transition: all 180ms ease;
    }
    .pf-nav__mobile-item:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.14);
    }
    .pf-nav__mobile-item.is-active {
      color: #FFFFFF;
      background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
    }
    .pf-nav__mobile-cta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    @media (max-width: 860px) {
      .pf-nav__links {
        display: none;
      }
      .pf-nav__cta .pf-nav__signup {
        display: none;
      }
      .pf-nav__toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    }

    .pf-main {
      flex: 1;
      padding-top: 32px;
      padding-bottom: 48px;
    }
    .pf-main--bleed {
      padding: 0;
      width: 100%;
      max-width: 100%;
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
  readonly bleed = input(false);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly publicHome = PUBLIC_HOME_PATH;
  protected readonly signedIn = inject(CurrentUserService).isAuthenticated;
  protected readonly industries = INDUSTRY_LINKS;
  protected readonly year = new Date().getFullYear();

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
