import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArBrand, PUBLIC_HOME_PATH } from '../../layout/brand';

@Component({
  selector: 'ar-not-found',
  imports: [RouterLink, ArBrand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <ar-brand onDark />
    </header>
    <main aria-labelledby="not-found-title">
      <div class="message">
        <h1 id="not-found-title">Page not found</h1>
        <p>The page may have moved or the address may be incorrect.</p>
        <a class="home-link" [routerLink]="publicHome">Go to the homepage <span aria-hidden="true">→</span></a>
      </div>
      <div class="error-code" aria-hidden="true">404</div>
    </main>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      background: var(--ar-bg-50);
    }
    header {
      display: flex;
      align-items: center;
      min-height: 4.5rem;
      padding-inline: max(1.5rem, calc((100% - 72rem) / 2));
      background: var(--ar-navy);
    }
    main {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      align-content: center;
      gap: clamp(2rem, 6vw, 6rem);
      flex: 1;
      width: min(100%, 75rem);
      margin-inline: auto;
      padding: clamp(2rem, 6vw, 5rem) 1.5rem;
    }
    h1 {
      margin: 0;
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 750;
      line-height: 1.05;
      letter-spacing: -0.045em;
    }
    p {
      max-width: 32ch;
      margin: 1.25rem 0 2rem;
      color: var(--ar-ink-600);
      font-size: 1.125rem;
    }
    .home-link {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 3rem;
      padding: 0.625rem 1rem;
      border-radius: 0.5rem;
      background: var(--ar-primary-hover);
      color: #fff;
      font-size: 0.9375rem;
      font-weight: 650;
    }
    .home-link:hover {
      background: var(--ar-primary);
    }
    .error-code {
      display: grid;
      place-items: center;
      min-height: clamp(11rem, 30vw, 23rem);
      border: 1px solid #2c4b75;
      border-radius: 1.25rem;
      background:
        linear-gradient(#8fb6ff20 1px, transparent 1px) center / 2rem 2rem,
        linear-gradient(90deg, #8fb6ff20 1px, transparent 1px) center / 2rem 2rem,
        radial-gradient(ellipse at 65% 40%, #184c95, #0b1f33 76%);
      color: #edf5ff;
      font: 700 clamp(4rem, 13vw, 10rem) / 1 var(--ar-font-mono);
      letter-spacing: -0.075em;
      padding-inline-end: 0.075em;
    }
    @media (max-width: 44rem) {
      main {
        grid-template-columns: minmax(0, 1fr);
        gap: 1.75rem;
        text-align: center;
      }
      p {
        margin-inline: auto;
      }
      .error-code {
        grid-row: 1;
      }
    }
  `,
})
export class ArNotFound {
  protected readonly publicHome = PUBLIC_HOME_PATH;
}
