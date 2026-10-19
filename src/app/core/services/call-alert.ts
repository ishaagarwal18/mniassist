import { Injectable } from '@angular/core';

/** One ring cycle: two short bursts, then a pause (seconds). */
export const RING_CYCLE_S = 3;
/** How long one ring is scheduled for: past Meta's minute of ringing and a queued IVR caller's wait is re-armed by the next ring. */
export const RING_FOR_S = 90;

/** The tab title while a call rings, alternating with the page's own title. */
export const ringingTitle = (who: string) => `📞 ${who} is calling`;

/**
 * Makes a ringing WhatsApp call noticeable when the agent isn't looking at the call bar: a ringtone, a flashing tab title, and a
 * desktop notification while the tab is in the background.
 *
 * Browsers allow sound, and the notification permission prompt, only after the person has interacted with the page, so the call
 * bar calls {@link unlock} on the first click. The ringtone is scheduled on the audio clock in one go, so it keeps ringing in a
 * background tab, where timers are slowed down.
 */
@Injectable({ providedIn: 'root' })
export class CallAlert {
  private ctx: AudioContext | null = null;
  private ring: GainNode | null = null;
  private titleTimer: ReturnType<typeof setInterval> | null = null;
  private pageTitle: string | null = null;
  private notification: Notification | null = null;
  private current: string | null = null;

  unlock(): void {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // No Web Audio: the title and the notification still alert.
    }
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }

  /** Starts alerting for a call; the same key again does nothing, so a poll that finds the same call doesn't restart the ring. */
  start(key: string, who: string, detail: string): void {
    if (this.current === key) return;
    this.stop();
    this.current = key;
    this.startRingtone();
    this.startTitle(ringingTitle(who));
    this.showNotification(key, ringingTitle(who), detail);
  }

  stop(): void {
    this.current = null;
    if (this.ring) {
      try {
        this.ring.gain.cancelScheduledValues(0);
        this.ring.disconnect();
      } catch {
        // Already gone.
      }
      this.ring = null;
    }
    if (this.titleTimer) {
      clearInterval(this.titleTimer);
      this.titleTimer = null;
    }
    if (this.pageTitle !== null) {
      document.title = this.pageTitle;
      this.pageTitle = null;
    }
    this.notification?.close();
    this.notification = null;
  }

  private startRingtone(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const out = ctx.createGain();
    out.gain.value = 0.15;
    out.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.05;
    for (let cycle = 0; cycle < RING_FOR_S / RING_CYCLE_S; cycle++) {
      for (const burst of [0, 0.5]) {
        const at = t0 + cycle * RING_CYCLE_S + burst;
        for (const freq of [440, 480]) {
          const osc = ctx.createOscillator();
          osc.frequency.value = freq;
          osc.connect(out);
          osc.start(at);
          osc.stop(at + 0.4);
        }
      }
    }
    this.ring = out;
  }

  private startTitle(text: string): void {
    this.pageTitle = document.title;
    let on = false;
    this.titleTimer = setInterval(() => {
      on = !on;
      document.title = on ? text : (this.pageTitle ?? '');
    }, 1000);
  }

  private showNotification(key: string, title: string, body: string): void {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden)
      return;
    try {
      const n = new Notification(title, {
        body,
        tag: `whatsapp-call-${key}`,
        requireInteraction: true,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      this.notification = n;
    } catch {
      // Some browsers only show notifications from a service worker; the ring and the title still alert.
    }
  }
}
