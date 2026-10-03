import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { BrandingStore } from '../../core/services/branding.store';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArBanner } from '../../ui';

const DEFAULT_PRIMARY = '#1769FF'; // --ar-blue-500
const DEFAULT_ACCENT = '#1769FF'; // --ar-blue-500, the sidebar's active marker

/**
 * Tenant branding (M14-ish — not in the original build spec's numbering, added on
 * request). A logo and two accent colours are the whole surface: enough for a
 * tenant's sidebar to feel like their own product without opening up anything that
 * would need re-running the WCAG contrast pass this app's own design tokens already
 * went through (see BrandingStore's own remarks on why only decorative chrome, never
 * text, reads these colours).
 */
@Component({
  selector: 'ar-branding',
  imports: [ArTopbar, ArButton, ArBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branding.html',
  styleUrl: './branding.scss',
})
export class ArBranding {
  protected readonly store = inject(BrandingStore);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal(false);

  protected readonly primaryDraft = signal<string>(DEFAULT_PRIMARY);
  protected readonly accentDraft = signal<string>(DEFAULT_ACCENT);

  protected readonly logoPreview = computed(() => this.store.logoDataUrl());
  protected readonly hasLogo = computed(() => this.store.hasLogo());

  constructor() {
    // Seed the drafts once real branding loads, so the pickers open on what's
    // actually saved rather than always starting from AutoReach's own defaults.
    // Runs once per real (non-null) load — after that the drafts are the user's own
    // in-progress edits and must not be overwritten by a background refresh.
    let seeded = false;
    effect(() => {
      const b = this.store.branding();
      if (seeded || b === null) return;
      seeded = true;
      this.primaryDraft.set(b.primaryColor ?? DEFAULT_PRIMARY);
      this.accentDraft.set(b.accentColor ?? DEFAULT_ACCENT);
    });
  }

  protected async saveColors(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);
    try {
      await this.store.updateColors({
        primaryColor: this.primaryDraft(),
        accentColor: this.accentDraft(),
      });
      this.saved.set(true);
    } catch {
      this.error.set('Could not save. Check both colours are valid and try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async resetColors(): Promise<void> {
    this.primaryDraft.set(DEFAULT_PRIMARY);
    this.accentDraft.set(DEFAULT_ACCENT);
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.updateColors({ primaryColor: null, accentColor: null });
      this.saved.set(true);
    } catch {
      this.error.set('Could not reset. Try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async onLogoFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 512 * 1024) {
      this.error.set('Logo must be 512 KB or smaller.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      this.error.set('Logo must be a PNG, JPEG, WebP or SVG image.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.uploadLogo(file);
      this.saved.set(true);
    } catch {
      this.error.set('Could not upload the logo. Try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeLogo(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.removeLogo();
    } catch {
      this.error.set('Could not remove the logo. Try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
