import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { grantedPolicy } from '../../core/auth/permission';
import { Asset, PickerOption, PipelineStore } from '../../core/services/pipeline.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArDateInput } from '../../ui/date-input';
import { ChipTone } from '../../ui/chip';
import { ArContactPicker } from './contact-picker';
import { RouterLink } from '@angular/router';
import { RenewalStatus } from '../../proxy/pipeline/amc-renewal.service';
import { amcCommercials, renewalChip } from './renewal-logic';
import type { AmcImportResultDto } from '../../proxy/pipeline/models';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';

/**
 * Installed base (M10). Every machine with its AMC / calibration / warranty dates —
 * the register the reminder engine reads from. The soonest due date leads each row
 * because that is the thing that turns into a utility message.
 */
@Component({
  selector: 'ar-installed-base',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArContactPicker, RouterLink, ArDateInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './installed-base.html',
  styleUrl: './installed-base.scss',
})
export class ArInstalledBase {
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(PipelineStore);

  protected readonly canCreate = grantedPolicy('AutoReach.InstalledBase.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.InstalledBase.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.InstalledBase.Delete', this.permissions);
  protected readonly canManageReminders = grantedPolicy(
    'AutoReach.InstalledBase.ManageReminders',
    this.permissions,
  );

  protected readonly assets = this.store.assets;
  protected readonly loading = this.store.loading;
  protected readonly includeRetired = this.store.includeRetired;
  protected readonly busy = signal<string | null>(null);

  // ---- Register machine dialog ------------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly contact = signal<PickerOption | null>(null);
  protected readonly f = signal({
    description: '',
    serialNumber: '',
    make: '',
    model: '',
    siteName: '',
    siteCity: '',
    amcEndsOn: '',
    amcValue: '',
    amcTermMonths: '',
  });

  // ---- AMC import ------------------------------------------------------------------------
  protected readonly importOpen = signal(false);
  protected readonly csv = signal('');
  protected readonly importing = signal(false);
  protected readonly importResult = signal<AmcImportResultDto | null>(null);
  protected readonly importError = signal<string | null>(null);

  protected openImport(): void {
    this.csv.set('');
    this.importResult.set(null);
    this.importError.set(null);
    this.importOpen.set(true);
  }

  protected async pickCsv(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      this.importError.set(
        'That file is over 2 MB. Split it into smaller files of up to 5,000 rows.',
      );
      return;
    }
    this.csv.set(await file.text());
    this.importResult.set(null);
  }

  protected async runImport(dryRun: boolean): Promise<void> {
    this.importing.set(true);
    this.importError.set(null);
    try {
      const result = await this.store.importAmc(this.csv(), dryRun);
      this.importResult.set(result);
    } catch (e: unknown) {
      this.importError.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'The file could not be imported.',
      );
    } finally {
      this.importing.set(false);
    }
  }

  protected patchAsset(key: keyof ReturnType<ArInstalledBase['f']>, value: string): void {
    this.f.update((s) => ({ ...s, [key]: value }));
  }

  protected readonly editingAssetId = signal<string | null>(null);

  protected openDialog(): void {
    this.editingAssetId.set(null);
    this.contact.set(null);
    this.f.set({
      description: '',
      serialNumber: '',
      make: '',
      model: '',
      siteName: '',
      siteCity: '',
      amcEndsOn: '',
      amcValue: '',
      amcTermMonths: '',
    });
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(a: Asset): void {
    this.editingAssetId.set(a.id);
    this.contact.set(null);
    this.f.set({
      description: a.description,
      serialNumber: a.serial ?? '',
      make: a.make ?? '',
      model: '',
      siteName: a.site ?? '',
      siteCity: '',
      amcEndsOn: a.nextDueOn ? a.nextDueOn.slice(0, 10) : '',
      amcValue: '',
      amcTermMonths: '12',
    });
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected async registerMachine(): Promise<void> {
    const v = this.f();
    if (!v.description.trim()) {
      this.toasts.warning('Describe the machine — e.g. “Line 3 VFD panel”.', 'Installed base');
      return;
    }
    const amc = amcCommercials(v.amcValue, v.amcTermMonths);
    if (typeof amc === 'string') {
      this.error.set(amc);
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const editingId = this.editingAssetId();
      if (editingId) {
        await this.store.updateAsset(editingId, {
          contactId: this.contact()?.id,
          description: v.description.trim(),
          serialNumber: v.serialNumber.trim() || undefined,
          make: v.make.trim() || undefined,
          model: v.model.trim() || undefined,
          siteName: v.siteName.trim() || undefined,
          siteCity: v.siteCity.trim() || undefined,
          amcEndsOn: v.amcEndsOn || undefined,
          amcValueInPaise: amc.valueInPaise,
          amcTermMonths: amc.termMonths,
        });
        this.toasts.success(`“${v.description.trim()}” updated.`);
      } else {
        await this.store.createAsset({
          contactId: this.contact()?.id,
          description: v.description.trim(),
          serialNumber: v.serialNumber.trim() || undefined,
          make: v.make.trim() || undefined,
          model: v.model.trim() || undefined,
          siteName: v.siteName.trim() || undefined,
          siteCity: v.siteCity.trim() || undefined,
          amcEndsOn: v.amcEndsOn || undefined,
          amcValueInPaise: amc.valueInPaise,
          amcTermMonths: amc.termMonths,
        });
        this.toasts.success(`“${v.description.trim()}” registered.`);
      }
      this.dialogOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The machine could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteAsset(a: Asset): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'machine',
        a.description,
        'This permanently removes the machine from the installed base register.',
      ))
    ) {
      return;
    }
    this.busy.set(a.id);
    try {
      await this.store.deleteAsset(a.id);
      this.toasts.success(`“${a.description}” deleted.`);
    } catch {
      this.toasts.error(`Could not delete “${a.description}”.`);
    } finally {
      this.busy.set(null);
    }
  }

  protected readonly dueSoon = computed(
    () =>
      this.assets().filter(
        (a) => !a.retired && this.daysTo(a.nextDueOn) != null && this.daysTo(a.nextDueOn)! <= 30,
      ).length,
  );

  protected daysTo(iso?: string): number | null {
    return iso ? Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000) : null;
  }

  protected dueLabel(a: Asset): string {
    const d = this.daysTo(a.nextDueOn);
    if (d == null) return '—';
    if (d < 0) return `overdue ${-d}d`;
    if (d === 0) return 'today';
    return `in ${d}d`;
  }

  protected dueTone(a: Asset): ChipTone {
    const d = this.daysTo(a.nextDueOn);
    if (d == null) return 'neutral';
    if (d < 0) return 'bad';
    if (d <= 14) return 'amber';
    return 'neutral';
  }

  protected renewal(a: Asset): { label: string; tone: ChipTone } | null {
    return a.renewalStatus == null ? null : renewalChip(a.renewalStatus as RenewalStatus);
  }

  protected async recordService(a: Asset): Promise<void> {
    this.busy.set(a.id);
    try {
      await this.store.recordService(a.id);
    } finally {
      this.busy.set(null);
    }
  }

  protected async retire(a: Asset): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: 'Retire this machine?',
        message: `“${a.description}” is retired and its service and AMC reminders stop.`,
        confirmText: 'Retire',
        tone: 'danger',
      }))
    )
      return;
    this.busy.set(a.id);
    try {
      await this.store.retireAsset(a.id);
    } finally {
      this.busy.set(null);
    }
  }
}
