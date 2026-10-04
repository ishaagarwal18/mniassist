import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import {
  NumberMigrationDto,
  NumberMigrationService,
  NumberMigrationStatus,
  VerificationCodeMethod,
} from '../../proxy/channels';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip } from '../../ui';
import { ArSelect } from '../../ui/select';

/**
 * Guided migration of a number from the WhatsApp Business app to the Cloud API
 * (M02-8). The first step is the explicit chat-history-loss warning — it is a real
 * checkbox, and the API refuses to start without it.
 */
@Component({
  selector: 'ar-migrate-number',
  imports: [ArTopbar, ArButton, ArChip, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './migrate-number.html',
  styleUrl: './migrate-number.scss',
})
export class ArMigrateNumber {
  private readonly api = inject(NumberMigrationService);

  protected readonly S = NumberMigrationStatus;
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () => this.api.getList(),
    defaultValue: { items: [] as NumberMigrationDto[] },
  });
  protected readonly migrations = computed(() => this.resource.value().items ?? []);

  protected readonly cc = signal('91');
  protected readonly phone = signal('');
  protected readonly waba = signal('');
  protected readonly acknowledged = signal(false);
  protected readonly method = signal(VerificationCodeMethod.Sms);
  protected readonly code = signal('');
  protected readonly pin = signal('');
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly active = computed(() =>
    this.migrations().find(
      (m) =>
        m.status !== NumberMigrationStatus.Completed && m.status !== NumberMigrationStatus.Failed,
    ),
  );

  protected statusLabel(s?: NumberMigrationStatus): string {
    switch (s) {
      case NumberMigrationStatus.Started:
        return 'Started';
      case NumberMigrationStatus.WarningAcknowledged:
        return 'Ready for the code';
      case NumberMigrationStatus.CodeRequested:
        return 'Code sent';
      case NumberMigrationStatus.Completed:
        return 'Migrated';
      case NumberMigrationStatus.Failed:
        return 'Failed';
      default:
        return '';
    }
  }

  protected async start(): Promise<void> {
    if (!this.acknowledged()) {
      this.error.set('You must acknowledge the chat-history warning to continue.');
      return;
    }
    if (!this.phone().trim() || !this.waba().trim()) {
      this.error.set('Enter the number and the WABA ID.');
      return;
    }
    this.busy.set('start');
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.start({
          countryCode: this.cc().trim(),
          phoneNumber: this.phone().trim(),
          wabaId: this.waba().trim(),
          acknowledgeChatHistoryLoss: true,
        }),
      );
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not start the migration.');
    } finally {
      this.busy.set(null);
    }
  }

  protected async requestCode(m: NumberMigrationDto): Promise<void> {
    this.busy.set('code');
    this.error.set(null);
    try {
      await firstValueFrom(this.api.requestCode(m.id!, this.method()));
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not request the code.');
    } finally {
      this.busy.set(null);
    }
  }

  protected async verify(m: NumberMigrationDto): Promise<void> {
    if (!this.code().trim() || this.pin().trim().length !== 6) {
      this.error.set('Enter the 6-digit code and a 6-digit two-step PIN.');
      return;
    }
    this.busy.set('verify');
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.verify(m.id!, { code: this.code().trim(), twoStepPin: this.pin().trim() }),
      );
      this.code.set('');
      this.pin.set('');
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The code could not be verified.');
    } finally {
      this.busy.set(null);
    }
  }
}
