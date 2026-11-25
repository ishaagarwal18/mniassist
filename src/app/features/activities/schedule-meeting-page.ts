import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArTopbar } from '../../layout/topbar';
import { ArMeetingDialog } from './meeting-dialog';
import { ArIcon } from '../../ui';

@Component({
  selector: 'ar-schedule-meeting-page',
  imports: [ArTopbar, ArMeetingDialog, RouterLink, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Book a meeting with a contact: select the time, format or video link, invite attendees, link relevant CRM records, and configure automated reminders."
      title="Schedule meeting"
    />

    <div class="smp-container ar-scroll">
      <!-- Breadcrumb Navigation -->
      <nav class="smp-nav" aria-label="Breadcrumb">
        <a routerLink="/meetings" class="smp-back-link">
          <ar-icon name="chevron" [size]="14" class="smp-back-arrow" />
          <span>Back to Meetings Calendar</span>
        </a>
      </nav>

      <!-- Page Header -->
      <header class="smp-header">
        <div class="smp-header__left">
          <h1 class="smp-title">Schedule a Meeting</h1>
          <p class="smp-desc">
            Coordinate meeting details, invite colleagues and external guests, link CRM deals, and set automated reminders.
          </p>
        </div>
      </header>

      <!-- Meeting Form Container -->
      <main class="smp-main">
        <ar-meeting-dialog
          [embedded]="true"
          [startPreset]="start"
          (saved)="back()"
          (closed)="back()"
        />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: var(--ar-bg-subtle, #f8fafc);
    }

    .smp-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 20px 24px 60px;
    }

    .smp-nav {
      max-width: 960px;
      margin: 0 auto 12px;
    }

    .smp-back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--ar-ink-600, #475569);
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s ease;

      &:hover {
        color: var(--ar-primary, #2563eb);
        background: var(--ar-blue-50, #eff6ff);

        .smp-back-arrow {
          transform: translateX(-2px);
        }
      }
    }

    .smp-back-arrow {
      transform: rotate(90deg);
      transition: transform 0.15s ease;
    }

    .smp-header {
      max-width: 960px;
      margin: 0 auto 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--ar-line-200, #e2e8f0);

      &__left {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    }

    .smp-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: var(--ar-ink-950, #0f172a);
      letter-spacing: -0.02em;
    }

    .smp-desc {
      margin: 0;
      font-size: 13.5px;
      color: var(--ar-ink-500, #64748b);
      line-height: 1.45;
    }

    .smp-main {
      max-width: 960px;
      margin: 0 auto;
    }
  `,
})
export class ArScheduleMeetingPage {
  private readonly router = inject(Router);
  protected readonly start = this.readStart(
    inject(ActivatedRoute).snapshot.queryParamMap.get('start'),
  );

  protected back(): void {
    void this.router.navigateByUrl('/meetings');
  }

  private readStart(value: string | null): Date | null {
    const date = value ? new Date(value) : null;
    return date && date.getTime() >= Date.now() ? date : null;
  }
}
