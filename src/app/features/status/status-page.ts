import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ArBrand } from '../../layout/brand';
import { ArThemeToggle } from '../../layout/theme-toggle';
import {
  PlatformStatusService,
  type PlatformStatusDto,
  type StatusIncidentDto,
} from '../../proxy/platform/platform-status.service';
import { ArChip } from '../../ui';
import {
  componentNames,
  impactLabel,
  istTime,
  overallHeadline,
  stateLabel,
  stateTone,
} from './status.logic';

const REFRESH_MS = 60_000;

/**
 * The public status page (T-19): is MNI Assist working, and if not, what is wrong and
 * what to do. No sign-in and no app shell, so it still opens when sign-in is the thing
 * that is broken. Refreshes itself every minute.
 */
@Component({
  selector: 'ar-status-page',
  imports: [ArBrand, ArThemeToggle, ArChip, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="st">
      <header class="st__top">
        <a routerLink="/"><ar-brand /></a>
        <ar-theme-toggle />
      </header>

      <main class="st__main">
        <h1 class="st__h1">System status</h1>

        @if (unreachable()) {
          <section class="st__banner st__banner--bad" role="status">
            <strong>We can't reach MNI Assist right now.</strong>
            <span>
              If this lasts more than a few minutes, the platform may be down. Messages sent to your
              WhatsApp number are held by Meta and delivered when we are back.
            </span>
          </section>
        } @else if (status(); as s) {
          <section
            class="st__banner"
            [class]="'st__banner st__banner--' + tone(s.overall)"
            role="status"
          >
            <strong>{{ headline(s.overall) }}</strong>
            <span>Checked {{ time(s.checkedAtUtc) }}. This page refreshes every minute.</span>
          </section>

          @for (i of s.active; track i.id) {
            <article class="inc inc--active">
              <div class="inc__head">
                <h2>{{ i.title }}</h2>
                <ar-chip [tone]="i.impact === 2 ? 'bad' : i.impact === 1 ? 'warn' : 'teal'">{{
                  impact(i.impact)
                }}</ar-chip>
              </div>
              <p class="inc__msg">{{ i.message }}</p>
              <p class="inc__meta">{{ meta(i) }}</p>
            </article>
          }

          <section class="st__list" aria-label="Components">
            @for (c of s.components; track c.component) {
              <div class="st__row">
                <span>{{ c.name }}</span>
                <ar-chip [tone]="tone(c.state)" [dot]="true">{{ label(c.state) }}</ar-chip>
              </div>
            }
          </section>

          @if (s.upcoming.length) {
            <h2 class="st__h2">Planned maintenance</h2>
            @for (i of s.upcoming; track i.id) {
              <article class="inc">
                <div class="inc__head">
                  <h3>{{ i.title }}</h3>
                </div>
                <p class="inc__msg">{{ i.message }}</p>
                <p class="inc__meta">
                  {{ time(i.startsAtUtc)
                  }}{{ i.plannedEndUtc ? ' to ' + time(i.plannedEndUtc) : '' }} · {{ parts(i) }}
                </p>
              </article>
            }
          }

          <h2 class="st__h2">Last 14 days</h2>
          @for (i of s.recent; track i.id) {
            <article class="inc inc--past">
              <div class="inc__head">
                <h3>{{ i.title }}</h3>
              </div>
              <p class="inc__msg">{{ i.message }}</p>
              <p class="inc__meta">
                {{ time(i.startsAtUtc) }} to {{ time(i.resolvedAtUtc) }} · {{ parts(i) }}
              </p>
            </article>
          } @empty {
            <p class="st__quiet">No incidents in the last 14 days.</p>
          }
        } @else {
          <p class="st__quiet">Checking…</p>
        }

        <p class="st__help">
          Something not working that isn't listed here?
          @if (status()?.supportEmail; as mail) {
            Write to <span class="st__mail">{{ mail }}</span
            >.
          } @else {
            Tell your MNI Assist account manager.
          }
        </p>
      </main>
    </div>
  `,
  styles: `
    .st {
      min-height: 100vh;
      background: var(--ar-bg-100);
      color: var(--ar-ink-900);
    }
    .st__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 760px;
      margin: 0 auto;
      padding: 20px 16px;
    }
    .st__main {
      display: grid;
      gap: 14px;
      max-width: 760px;
      margin: 0 auto;
      padding: 8px 16px 48px;
    }
    .st__h1 {
      margin: 0;
      font: 700 26px var(--ar-font-sans);
      letter-spacing: -0.02em;
    }
    .st__h2 {
      margin: 18px 0 0;
      font: 600 15px var(--ar-font-sans);
    }
    .st__banner {
      display: grid;
      gap: 4px;
      padding: 16px 18px;
      border-radius: var(--ar-radius-card, 10px);
      border: 1px solid var(--ar-line-200);
      background: var(--ar-white);
      font: 400 13px/1.5 var(--ar-font-sans);
    }
    .st__banner strong {
      font: 600 17px var(--ar-font-sans);
    }
    .st__banner--good {
      border-color: var(--ar-green-200, var(--ar-line-200));
      background: var(--ar-green-100, var(--ar-white));
    }
    .st__banner--warn,
    .st__banner--teal {
      border-color: var(--ar-amber-200, var(--ar-line-200));
      background: var(--ar-amber-100, var(--ar-white));
    }
    .st__banner--bad {
      border-color: var(--ar-red-200);
      background: var(--ar-red-100);
    }
    .st__list {
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      background: var(--ar-white);
    }
    .st__row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-top: 1px solid var(--ar-line-200);
      font: 400 14px var(--ar-font-sans);
    }
    .st__row:first-child {
      border-top: 0;
    }
    .inc {
      display: grid;
      gap: 6px;
      padding: 14px 16px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      background: var(--ar-white);
    }
    .inc--active {
      border-left: 4px solid var(--ar-red-600);
    }
    .inc__head {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }
    .inc h2,
    .inc h3 {
      margin: 0;
      font: 600 14px var(--ar-font-sans);
    }
    .inc__msg {
      margin: 0;
      font: 400 13.5px/1.5 var(--ar-font-sans);
      white-space: pre-line;
    }
    .inc__meta,
    .st__quiet,
    .st__help {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .st__help {
      margin-top: 18px;
    }
    .st__mail {
      font-family: var(--ar-font-mono);
      user-select: all;
    }
  `,
})
export class ArStatusPage {
  private readonly api = inject(PlatformStatusService);

  protected readonly status = signal<PlatformStatusDto | null>(null);
  protected readonly unreachable = signal(false);

  protected readonly headline = overallHeadline;
  protected readonly label = stateLabel;
  protected readonly tone = stateTone;
  protected readonly impact = impactLabel;
  protected readonly time = istTime;

  constructor() {
    void this.load();
    const timer = setInterval(() => void this.load(), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected parts(i: StatusIncidentDto): string {
    return componentNames(i.components).join(', ');
  }

  protected meta(i: StatusIncidentDto): string {
    return `Since ${istTime(i.startsAtUtc)} · updated ${istTime(i.lastUpdatedAtUtc)} · ${this.parts(i)}`;
  }

  private async load(): Promise<void> {
    try {
      this.status.set(await firstValueFrom(this.api.get()));
      this.unreachable.set(false);
    } catch {
      this.unreachable.set(true);
    }
  }
}
