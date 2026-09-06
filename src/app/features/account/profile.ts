import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CurrentUserService } from '../../core/services/current-user.service';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard } from '../../ui';

/**
 * The signed-in user's own profile — name, contact details and password. Backed by
 * ABP's Account module (`/api/account/my-profile`); seeded in mock mode.
 */
@Component({
  selector: 'ar-profile',
  imports: [ArTopbar, ArBanner, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ArProfile {
  private readonly account = inject(CurrentUserService);

  protected readonly loading = signal(true);
  protected readonly savingDetails = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly detailsError = signal<string | null>(null);
  protected readonly detailsSaved = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordSaved = signal(false);

  // ---- details form -------------------------------------------------
  protected readonly userName = signal('');
  protected readonly name = signal('');
  protected readonly surname = signal('');
  protected readonly email = signal('');
  protected readonly phoneNumber = signal('');
  protected readonly isExternal = signal(false);
  protected readonly hasPassword = signal(true);

  // ---- password form ----------------------------------------------
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');

  protected readonly canSaveDetails = computed(
    () => this.name().trim().length > 0 && /^\S+@\S+\.\S+$/.test(this.email().trim()),
  );
  protected readonly canSavePassword = computed(
    () =>
      this.newPassword().length >= 6 &&
      this.newPassword() === this.confirmPassword() &&
      (!this.hasPassword() || this.currentPassword().length > 0),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const p = await this.account.loadProfile();
      this.userName.set(p.userName ?? '');
      this.name.set(p.name ?? '');
      this.surname.set(p.surname ?? '');
      this.email.set(p.email ?? '');
      this.phoneNumber.set(p.phoneNumber ?? '');
      this.isExternal.set(p.isExternal ?? false);
      this.hasPassword.set(p.hasPassword ?? true);
    } catch {
      this.detailsError.set('Could not load your profile.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async saveDetails(): Promise<void> {
    if (!this.canSaveDetails() || this.savingDetails()) return;
    this.savingDetails.set(true);
    this.detailsError.set(null);
    this.detailsSaved.set(false);
    try {
      await this.account.saveProfile({
        userName: this.userName().trim(),
        email: this.email().trim(),
        name: this.name().trim() || null,
        surname: this.surname().trim() || null,
        phoneNumber: this.phoneNumber().trim() || null,
      });
      this.detailsSaved.set(true);
    } catch (e: unknown) {
      this.detailsError.set(e instanceof Error ? e.message : 'Your profile could not be saved.');
    } finally {
      this.savingDetails.set(false);
    }
  }

  protected async savePassword(): Promise<void> {
    if (!this.canSavePassword() || this.savingPassword()) return;
    this.savingPassword.set(true);
    this.passwordError.set(null);
    this.passwordSaved.set(false);
    try {
      await this.account.changePassword(this.currentPassword(), this.newPassword());
      this.passwordSaved.set(true);
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
    } catch (e: unknown) {
      this.passwordError.set(
        e instanceof Error
          ? e.message
          : 'The password could not be changed — check the current one.',
      );
    } finally {
      this.savingPassword.set(false);
    }
  }
}
