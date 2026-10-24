import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly document = inject(DOCUMENT);
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private waitingWorker: ServiceWorker | null = null;

  /** Network connectivity status */
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  /** Whether the app can be installed via the browser prompt */
  readonly canInstall = signal<boolean>(false);

  /** Whether the app is currently running in standalone (installed) mode */
  readonly isInstalled = signal<boolean>(false);

  /** Whether a newer version of the application service worker is waiting */
  readonly hasUpdate = signal<boolean>(false);

  constructor() {
    this.init();
  }

  private init(): void {
    const win = this.document.defaultView;
    if (!win) return;

    // Check if running in standalone mode (already installed)
    const isStandalone =
      win.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in win.navigator &&
        Boolean((win.navigator as { standalone?: boolean }).standalone));
    this.isInstalled.set(isStandalone);

    // Online / Offline tracking
    win.addEventListener('online', () => this.isOnline.set(true));
    win.addEventListener('offline', () => this.isOnline.set(false));

    // Capture install prompt
    win.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    win.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
    });

    // Register Service Worker
    this.registerServiceWorker(win);
  }

  private registerServiceWorker(win: Window): void {
    const isSecure =
      win.location.protocol === 'https:' ||
      win.location.hostname === 'localhost' ||
      win.location.hostname === '127.0.0.1';

    if (!isSecure || !('serviceWorker' in win.navigator)) {
      return;
    }

    win.navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        // If an updated worker is already waiting
        if (reg.waiting) {
          this.waitingWorker = reg.waiting;
          this.hasUpdate.set(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && win.navigator.serviceWorker.controller) {
              this.waitingWorker = newWorker;
              this.hasUpdate.set(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service worker registration failed:', err);
      });

    // Auto-reload when controller changes after applying an update
    let refreshing = false;
    win.navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        win.location.reload();
      }
    });
  }

  /**
   * Triggers the native installation dialog.
   * Returns true if user accepted installation, false otherwise.
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.canInstall.set(false);
      return choice.outcome === 'accepted';
    } catch (err) {
      console.warn('[PWA] prompt error:', err);
      return false;
    }
  }

  /**
   * Tells the waiting service worker to skip waiting and activate immediately.
   * This triggers `controllerchange` and reloads the window.
   */
  applyUpdate(): void {
    if (this.waitingWorker) {
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
