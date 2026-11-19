import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArTopbar } from '../../layout/topbar';
import { ArMeetingDialog } from './meeting-dialog';

@Component({
  selector: 'ar-schedule-meeting-page',
  imports: [ArTopbar, ArMeetingDialog, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Book a meeting with a contact: the time, place or video link, who attends, the records it is about and the reminders they get."
      title="Schedule meeting" />
    <main>
      <a routerLink="/meetings">← Back to meetings</a>
      <ar-meeting-dialog [startPreset]="start" (saved)="back()" (closed)="back()" />
    </main>
  `,
  styles: `
    main {
      width: min(100%, 62rem);
      margin-inline: auto;
      padding: clamp(1rem, 3vw, 2rem);
    }
    a {
      display: inline-block;
      margin-bottom: 1rem;
      font-weight: 600;
    }
  `,
})
export class ArScheduleMeetingPage {
  private readonly router = inject(Router);
  protected readonly start = this.readStart(inject(ActivatedRoute).snapshot.queryParamMap.get('start'));

  protected back(): void {
    void this.router.navigateByUrl('/meetings');
  }

  private readStart(value: string | null): Date | null {
    const date = value ? new Date(value) : null;
    return date && date.getTime() >= Date.now() ? date : null;
  }
}
