import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SettingsStore } from '../../core/services/settings.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArBanner, ArCard, ArChip } from '../../ui';

/**
 * The workspace's general settings. Today this is the single-sign-on panel — the one
 * setting that changes how everyone in the workspace authenticates — plus signposts
 * to the settings that already have their own screens.
 */
@Component({
  selector: 'ar-settings',
  imports: [FormsModule, RouterLink, ArTopbar, ArButton, ArBanner, ArCard, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class ArSettings {
  private readonly store = inject(SettingsStore);

  protected readonly sso = this.store.sso;
  protected readonly loading = this.store.ssoLoading;

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal(false);

  // Form fields — seeded from the loaded config when editing opens.
  protected readonly displayName = signal('');
  protected readonly issuer = signal('');
  protected readonly authorizationEndpoint = signal('');
  protected readonly metadataAddress = signal('');
  protected readonly domains = signal('');
  protected readonly defaultRole = signal('Agent');
  protected readonly enforce = signal(false);

  protected readonly domainList = computed(() =>
    this.domains().split(',').map((d) => d.trim()).filter(Boolean));

  protected readonly canSave = computed(() =>
    this.displayName().trim().length > 1 &&
    this.issuer().trim().length > 6 &&
    this.domainList().length > 0);

  protected startEditing(): void {
    const c = this.sso();
    this.displayName.set(c.displayName ?? '');
    this.issuer.set(c.issuer ?? '');
    this.authorizationEndpoint.set(c.authorizationEndpoint ?? '');
    this.metadataAddress.set(c.metadataAddress ?? '');
    this.domains.set(c.allowedEmailDomains.join(', '));
    this.defaultRole.set(c.defaultRoleName || 'Agent');
    this.enforce.set(c.enforceSso);
    this.error.set(null);
    this.editing.set(true);
  }

  protected cancel(): void {
    this.editing.set(false);
  }

  protected async save(enable: boolean): Promise<void> {
    if (!this.canSave() || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      await this.store.saveSso({
        displayName: this.displayName().trim(),
        issuer: this.issuer().trim(),
        authorizationEndpoint: this.authorizationEndpoint().trim() || undefined,
        metadataAddress: this.metadataAddress().trim() || undefined,
        allowedEmailDomains: this.domainList(),
        defaultRoleName: this.defaultRole(),
        enforceSso: this.enforce(),
        enable,
      });
      this.editing.set(false);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the SSO configuration.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async disable(): Promise<void> {
    this.saving.set(true);
    try {
      await this.store.disableSso();
    } finally {
      this.saving.set(false);
    }
  }
}
