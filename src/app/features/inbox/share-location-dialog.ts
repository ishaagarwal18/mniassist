import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

import { ArButton, ArDialog } from '../../ui';
import { Coordinates, locationErrorText, parseCoordinates } from './location';

export interface SharedLocation extends Coordinates {
  name?: string;
  address?: string;
}

const LAST_KEY = 'ar.inbox.lastSharedLocation';

function readLast(): { name: string; address: string; where: string } | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as { name: string; address: string; where: string }) : null;
  } catch {
    return null;
  }
}

/**
 * Sends a location pin to the customer. Usually it is the business's own address, which this computer's position isn't, so the
 * agent can type a place (name, address, and a Google Maps link or coordinates, remembered on this computer for next time) or
 * use where this device is. Reading the device's location asks the browser; when it can't (blocked, Windows location off, no
 * fix in time) the dialog says which, and the typed place still works.
 */
@Component({
  selector: 'ar-share-location-dialog',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog title="Share a location" (dismiss)="closed.emit()">
      <button
        ar-button
        type="button"
        variant="ghost"
        [disabled]="locating()"
        (click)="useThisDevice()"
      >
        {{ locating() ? 'Finding your location…' : 'Use my current location' }}
      </button>
      @if (deviceError(); as e) {
        <p class="loc__warn" role="alert">{{ e }}</p>
      }

      <p class="loc__or">or type the place</p>
      <label class="ar-field">
        <span class="ar-field__label">Name <span class="ar-field__opt">(optional)</span></span>
        <input
          class="ar-field__input"
          maxlength="100"
          placeholder="Sun Energy Automation"
          [value]="name()"
          (input)="name.set($any($event.target).value)"
        />
      </label>
      <label class="ar-field">
        <span class="ar-field__label">Address <span class="ar-field__opt">(optional)</span></span>
        <input
          class="ar-field__input"
          maxlength="200"
          placeholder="Plot 12, MIDC Bhosari, Pune 411026"
          [value]="address()"
          (input)="address.set($any($event.target).value)"
        />
      </label>
      <label class="ar-field">
        <span class="ar-field__label">Google Maps link or coordinates</span>
        <input
          class="ar-field__input"
          placeholder="https://www.google.com/maps/…  or  18.5204, 73.8567"
          [value]="where()"
          (input)="where.set($any($event.target).value)"
        />
      </label>
      @if (where().trim() && !point()) {
        <p class="loc__warn">
          No coordinates found in that. Paste the full link from the browser's address bar (a short
          maps.app.goo.gl link doesn't carry them), or the numbers from right-clicking the place in
          Google Maps.
        </p>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Cancel</button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="!point()"
          (click)="sendTyped()"
        >
          Send location
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .loc__or {
      margin: 12px 0 4px;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .loc__warn {
      margin: 6px 0 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-warn-700, #b54708);
    }
  `,
})
export class ArShareLocationDialog {
  readonly send = output<SharedLocation>();
  readonly closed = output<void>();

  private readonly last = readLast();
  protected readonly name = signal(this.last?.name ?? '');
  protected readonly address = signal(this.last?.address ?? '');
  protected readonly where = signal(this.last?.where ?? '');
  protected readonly locating = signal(false);
  protected readonly deviceError = signal<string | null>(null);
  protected readonly point = computed(() => parseCoordinates(this.where()));

  protected useThisDevice(): void {
    if (!navigator.geolocation) {
      this.deviceError.set('This browser cannot read a location. Type the place below.');
      return;
    }
    this.locating.set(true);
    this.deviceError.set(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating.set(false);
        this.send.emit({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          name: this.name().trim() || undefined,
          address: this.address().trim() || undefined,
        });
      },
      (error) => {
        this.locating.set(false);
        this.deviceError.set(locationErrorText(error?.code));
      },
      // A desktop has no GPS: asking for high accuracy within 10 s used to time out. Wi-Fi accuracy, 20 s, and a fix from the
      // last few minutes are plenty for "where we are".
      { enableHighAccuracy: false, timeout: 20_000, maximumAge: 5 * 60_000 },
    );
  }

  protected sendTyped(): void {
    const point = this.point();
    if (!point) return;
    const saved = {
      name: this.name().trim(),
      address: this.address().trim(),
      where: this.where().trim(),
    };
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(saved));
    } catch {
      // Storage unavailable: it just isn't remembered.
    }
    this.send.emit({
      ...point,
      name: saved.name || undefined,
      address: saved.address || undefined,
    });
  }
}
