import { RestService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ArBanner } from '../../ui/banner';
import { ArButton } from '../../ui/button';
import { ArCard } from '../../ui/card';

export interface GoogleCalendarStatus {
  available: boolean;
  connected: boolean;
  email?: string | null;
  connectedAtUtc?: string | null;
}

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private readonly rest = inject(RestService);
  status() {
    return this.rest.request<never, GoogleCalendarStatus>(
      { method: 'GET', url: '/api/auto-reach/google-calendar/status' },
      { apiName: 'AutoReach' },
    );
  }
  start() {
    return this.rest.request<never, { authorizeUrl: string }>(
      { method: 'POST', url: '/api/auto-reach/google-calendar/start' },
      { apiName: 'AutoReach' },
    );
  }
  disconnect() {
    return this.rest.request<never, GoogleCalendarStatus>(
      { method: 'POST', url: '/api/auto-reach/google-calendar/disconnect' },
      { apiName: 'AutoReach' },
    );
  }
}

const OUTCOMES: Record<string, { tone: 'good' | 'bad'; text: string }> = {
  connected: { tone: 'good', text: 'Google Calendar connected.' },
  denied: { tone: 'bad', text: 'Google Calendar was not connected: access was not allowed.' },
  expired: { tone: 'bad', text: 'The connection took too long. Try again.' },
  failed: { tone: 'bad', text: 'Google Calendar could not be connected. Try again.' },
};

/**
 * The signed-in user's own Google Calendar, on their profile. AI voice agents that book meetings in this user's name then avoid the
 * times Google shows them busy. Only free/busy is read; bookings stay in MNI Assist's calendar.
 */
@Component({
  selector: 'ar-google-calendar-card',
  imports: [DatePipe, ArBanner, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-card heading="Google Calendar">
      @if (outcome(); as o) {
        <ar-banner [tone]="o.tone">{{ o.text }}</ar-banner>
      }
      @if (error()) {
        <ar-banner tone="bad">{{ error() }}</ar-banner>
      }
      <p class="gc__note">
        When an AI voice agent books meetings in your name, it avoids the times your Google Calendar
        shows you busy. Only free and busy times are read, never event details; meetings are still
        booked in this app's calendar.
      </p>
      @if (status(); as s) {
        @if (s.connected) {
          <p>
            Connected<span translate="no">{{ s.email ? ' as ' + s.email : '' }}</span>
            @if (s.connectedAtUtc) {
              since {{ s.connectedAtUtc | date: 'mediumDate' }}
            }
            .
          </p>
          <button ar-button type="button" [disabled]="busy()" (click)="disconnect()">
            {{ busy() ? 'Disconnecting…' : 'Disconnect' }}
          </button>
        } @else if (s.available) {
          <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="connect()">
            {{ busy() ? 'Opening Google…' : 'Connect Google Calendar' }}
          </button>
        } @else {
          <p>Not available yet: the platform administrator hasn't set up Google sign-in.</p>
        }
      }
    </ar-card>
  `,
  styles: `
    .gc__note {
      margin: 0 0 8px;
      color: var(--ar-ink-600);
      font-size: 0.9em;
    }
  `,
})
export class ArGoogleCalendarCard implements OnInit {
  private readonly api = inject(GoogleCalendarService);
  protected readonly status = signal<GoogleCalendarStatus | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly outcome = signal<{ tone: 'good' | 'bad'; text: string } | null>(null);

  async ngOnInit(): Promise<void> {
    // Google sends the browser back here with ?googleCalendar=connected (or why it wasn't).
    const back = new URLSearchParams(window.location.search).get('googleCalendar');
    if (back) this.outcome.set(OUTCOMES[back] ?? OUTCOMES['failed']);
    try {
      this.status.set(await firstValueFrom(this.api.status()));
    } catch {
      this.error.set('Your Google Calendar connection could not be loaded.');
    }
  }

  protected async connect(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const { authorizeUrl } = await firstValueFrom(this.api.start());
      window.location.assign(authorizeUrl);
    } catch {
      this.error.set('Google Calendar could not be opened. Try again.');
      this.busy.set(false);
    }
  }

  protected async disconnect(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.outcome.set(null);
    try {
      this.status.set(await firstValueFrom(this.api.disconnect()));
    } catch {
      this.error.set('Google Calendar could not be disconnected. Try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
