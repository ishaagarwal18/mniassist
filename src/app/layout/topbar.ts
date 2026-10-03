import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ArIcon } from '../ui';
import { helpTopicFor } from '../core/help/help-topics';
import { ArThemeToggle } from './theme-toggle';

/**
 * Every screen's header, and — since `help` is set on essentially every call
 * site — the one place a screen-level explanation lives. Keeping it here
 * rather than a `<ar-help>` scattered per-screen means every page gets the
 * same affordance in the same place, and a screen simply forgetting to pass
 * `help` is the only way one goes without it.
 * <p>
 * The popover's benefits and step-by-step sections come from `HELP_TOPICS`,
 * looked up by the route that rendered this screen — so no screen passes them
 * in. A route without a topic shows the one-line `help` alone, as before.
 * </p>
 */
@Component({
  selector: 'ar-topbar',
  imports: [ArIcon, ArThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tb__titles">
      <div class="tb__title-row">
        <h1 class="tb__title">{{ title() }}</h1>
        @if (summary()) {
          <button
            type="button"
            class="tb__help"
            [class.tb__help--on]="open()"
            [attr.aria-expanded]="open()"
            [attr.aria-label]="'About ' + title()"
            (click)="toggle($event)"
          >
            <ar-icon name="help" [size]="14" />
          </button>
        }
      </div>
      @if (subtitle()) {
        <p class="tb__sub">{{ subtitle() }}</p>
      }
    </div>
    <div class="tb__actions"><ng-content /></div>
    <ar-theme-toggle compact class="tb__theme" />

    @if (open()) {
      @if (topic; as t) {
        <div
          class="tb__pop tb__pop--guide"
          role="dialog"
          [attr.aria-label]="'About ' + title()"
          (click)="$event.stopPropagation()"
        >
          <div class="tb__pop-head">
            <p class="tb__pop-title">{{ title() }}</p>
            <button
              type="button"
              class="tb__pop-close"
              aria-label="Close help"
              (click)="open.set(false)"
            >
              ×
            </button>
          </div>

          <p class="tb__pop-label">What it does</p>
          <p class="tb__pop-body">{{ summary() }}</p>

          <p class="tb__pop-label">Benefits</p>
          <ul class="tb__pop-list">
            @for (b of t.benefits; track $index) {
              <li>{{ b }}</li>
            }
          </ul>

          <p class="tb__pop-label">How to use it</p>
          <ol class="tb__pop-steps">
            @for (s of t.steps; track $index) {
              <li>{{ s }}</li>
            }
          </ol>

          @if (t.tips?.length) {
            <div class="tb__pop-tip">
              @for (tip of t.tips; track $index) {
                <p>{{ tip }}</p>
              }
            </div>
          }
        </div>
      } @else {
        <div class="tb__pop" role="tooltip" (click)="$event.stopPropagation()">
          <p class="tb__pop-title">{{ title() }}</p>
          <p class="tb__pop-body">{{ help() }}</p>
        </div>
      }
    }
  `,
  styles: `
    :host {
      position: relative;
      height: 56px;
      flex: none;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 0 22px;
      background: var(--ar-header-bg);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--ar-line-200);
    }
    .tb__titles {
      flex: 1;
      min-width: 0;
    }
    .tb__title-row {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .tb__title {
      margin: 0;
      font: 600 15.5px var(--ar-font-sans);
      letter-spacing: -0.015em;
      color: var(--ar-ink-900);
    }
    .tb__sub {
      margin: 1px 0 0;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .tb__actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tb__theme {
      margin-left: 2px;
      padding-left: 12px;
      border-left: 1px solid var(--ar-line-200);
    }
    /* Nothing to separate from on screens without header actions. */
    .tb__actions:empty + .tb__theme {
      padding-left: 0;
      border-left: 0;
    }

    .tb__help {
      flex: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--ar-line-300);
      background: var(--ar-bg-50);
      color: var(--ar-ink-400);
      cursor: pointer;
      padding: 0;
    }
    .tb__help:hover,
    .tb__help--on {
      color: var(--ar-teal-600);
      border-color: var(--ar-teal-600);
      background: var(--ar-teal-100);
    }

    .tb__pop {
      position: absolute;
      top: 46px;
      left: 22px;
      z-index: 30;
      width: min(340px, calc(100vw - 44px));
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-pop);
      padding: 12px 14px 13px;
    }
    .tb__pop-title {
      margin: 0 0 4px;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .tb__pop-body {
      margin: 0;
      font: 400 12.5px/1.55 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    .tb__pop--guide {
      width: min(400px, calc(100vw - 44px));
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      padding: 12px 16px 14px;
    }
    .tb__pop-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .tb__pop-head .tb__pop-title {
      margin: 0;
      font-size: 13.5px;
    }
    .tb__pop-close {
      flex: none;
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: var(--ar-radius-control);
      background: transparent;
      color: var(--ar-ink-400);
      font: 400 18px/1 var(--ar-font-sans);
      cursor: pointer;
      padding: 0;
    }
    .tb__pop-close:hover {
      background: var(--ar-bg-100);
      color: var(--ar-ink-900);
    }
    .tb__pop-label {
      margin: 12px 0 4px;
      font: 600 10.5px var(--ar-font-sans);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ar-teal-600);
    }
    .tb__pop-list,
    .tb__pop-steps {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .tb__pop-steps li::marker {
      font-weight: 600;
      color: var(--ar-teal-600);
    }
    .tb__pop-tip {
      margin-top: 12px;
      padding: 8px 10px;
      border-radius: var(--ar-radius-inset);
      background: var(--ar-amber-100);
      font: 400 12px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .tb__pop-tip p {
      margin: 0;
    }
  `,
})
export class ArTopbar {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);

  /** A short, screen-specific explanation shown from the help popover. Omit
   *  only for a screen genuinely too simple to need one. */
  readonly help = input<string | null>(null);

  /** The routed screen this bar sits in; absent when rendered outside a route. */
  private readonly route = inject(ActivatedRoute, { optional: true });

  protected readonly topic = helpTopicFor(this.route?.snapshot.routeConfig?.path);

  /** The "What it does" line: a shared topic's own summary, else the screen's `help`. */
  protected readonly summary = computed(() => this.topic?.summary ?? this.help());

  protected readonly open = signal(false);

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    if (this.open()) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
