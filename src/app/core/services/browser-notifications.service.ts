import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { WebPushScope } from '../../proxy/notifications/web-push-scope.enum';
import { WebPushService } from '../../proxy/notifications/web-push.service';

/** A base64url VAPID key as the bytes PushManager.subscribe wants. */
export function applicationServerKey(base64Url: string): Uint8Array {
  const padded = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** "Chrome on Android", "Edge on Windows" — enough to tell devices apart in a list. */
export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} on ${os}` : browser;
}

/**
 * This browser's notifications (M06-11): whether it can show them, whether it is subscribed,
 * and turning them on and off. The service worker shows them; the API decides who gets what.
 */
@Injectable({ providedIn: 'root' })
export class BrowserNotifications {
  private readonly api = inject(WebPushService);

  readonly supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  readonly permission = signal<NotificationPermission>(
    this.supported ? Notification.permission : 'denied',
  );
  /** This browser's push endpoint when it is subscribed; null when not. */
  readonly endpoint = signal<string | null>(null);
  readonly scope = signal<WebPushScope>(WebPushScope.AssignedToMe);
  readonly serverEnabled = signal(true);

  async refresh(): Promise<void> {
    if (!this.supported || environment.useMockData) return;
    this.permission.set(Notification.permission);
    const config = await firstValueFrom(this.api.getConfig());
    this.serverEnabled.set(config.enabled);
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    this.endpoint.set(subscription?.endpoint ?? null);
    if (subscription) {
      const mine = await firstValueFrom(this.api.getMySubscriptions());
      const here = mine.find((s) => s.endpoint === subscription.endpoint);
      if (here) this.scope.set(here.scope);
      else this.endpoint.set(null); // subscribed for someone else, or before a key change
    }
  }

  /** Asks the browser's permission, subscribes it, and tells the API. Throws with a reason to show. */
  async enable(scope: WebPushScope): Promise<void> {
    if (!this.supported) throw new Error('This browser cannot show notifications.');
    const permission = await Notification.requestPermission();
    this.permission.set(permission);
    if (permission !== 'granted') {
      throw new Error(
        'Notifications are blocked for this site. Allow them in the browser’s site settings, then try again.',
      );
    }

    const config = await firstValueFrom(this.api.getConfig());
    if (!config.enabled || !config.publicKey)
      throw new Error('Browser notifications are switched off on this server.');

    const registration = await navigator.serviceWorker.ready;
    const key = applicationServerKey(config.publicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameKey(subscription, key)) {
      // Made for an older server key: it would never receive anything.
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key as BufferSource,
    });

    await this.register(subscription, scope);
  }

  async setScope(scope: WebPushScope): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await this.register(subscription, scope);
  }

  async disable(): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await firstValueFrom(this.api.unsubscribe({ endpoint: subscription.endpoint }));
      await subscription.unsubscribe();
    }
    this.endpoint.set(null);
  }

  sendTest(): Promise<void> {
    return firstValueFrom(this.api.sendTest());
  }

  private async register(subscription: PushSubscription, scope: WebPushScope): Promise<void> {
    const json = subscription.toJSON();
    await firstValueFrom(
      this.api.subscribe({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.['p256dh'] ?? '',
        auth: json.keys?.['auth'] ?? '',
        scope,
        userAgent: navigator.userAgent.slice(0, 256),
      }),
    );
    this.endpoint.set(subscription.endpoint);
    this.scope.set(scope);
  }
}

function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  return a.length === key.length && a.every((b, i) => b === key[i]);
}
