import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { ArTopbar } from '../../../layout/topbar';
import { BillOfMaterialService } from '../../../proxy/manufacturing/bill-of-material.service';
import type { BillOfMaterialDto } from '../../../proxy/manufacturing/bill-of-material.models';
import { InstalledAssetService } from '../../../proxy/pipeline/installed-asset.service';
import {
  ComponentSource,
  CreateUpdateInstalledComponentDto,
  InstalledComponentDto,
  InstalledComponentService,
  MachineCriticality,
} from '../../../proxy/pipeline/installed-component.service';
import type { InstalledAssetDto } from '../../../proxy/pipeline/models';
import { ArBanner, ArButton, ArCard, ArChip } from '../../../ui';
import { bandText, stageText, stageTone } from '../obsolescence/obsolescence.logic';
import { environment } from '../../../../environments/environment';
import { ArMachineQrCard } from './machine-qr-card';

const SOURCE_LABEL: Record<ComponentSource, string> = {
  [ComponentSource.Typed]: 'Typed',
  [ComponentSource.Import]: 'Imported',
  [ComponentSource.Nameplate]: 'Nameplate',
  [ComponentSource.BomCopy]: 'From BOM',
};

/** A list older than this shows "may be out of date". */
const CHECK_EVERY_DAYS = 365;

function blank(): CreateUpdateInstalledComponentDto {
  return {
    partNumber: '',
    description: '',
    make: '',
    series: '',
    quantity: 1,
    position: '',
    firmware: '',
  };
}

/**
 * One installed machine and the parts inside it (PLC, I/O, drives, HMI): what the obsolescence radar traces a phase-out to.
 * Parts are typed, imported from a CSV, read off a nameplate photo, or copied from a bill of materials.
 */
@Component({
  selector: 'ar-machine-page',
  imports: [ArTopbar, ArButton, ArBanner, ArCard, ArChip, RouterLink, DatePipe, ArMachineQrCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './machine-page.html',
  styleUrl: './machine-page.scss',
})
export class ArMachinePage {
  private readonly assetsApi = inject(InstalledAssetService);
  private readonly api = inject(InstalledComponentService);
  private readonly bomsApi = inject(BillOfMaterialService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);

  protected readonly mock = environment.useMockData;
  protected readonly Criticality = MachineCriticality;
  protected readonly canEdit = grantedPolicy(
    'AutoReach.InstalledBase.Components',
    this.permissions,
  );
  protected readonly canUseBoms = grantedPolicy('AutoReach.BillOfMaterials', this.permissions);
  protected readonly canQr = grantedPolicy('AutoReach.InstalledBase.Qr', this.permissions);

  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;

  protected readonly machine = signal<InstalledAssetDto | null>(null);
  protected readonly components = signal<InstalledComponentDto[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly form = signal<CreateUpdateInstalledComponentDto>(blank());
  protected readonly editingId = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly formSource = signal(ComponentSource.Typed);
  protected readonly draftNote = signal<string | null>(null);
  protected readonly importProblems = signal<string[]>([]);
  protected readonly boms = signal<BillOfMaterialDto[]>([]);
  protected readonly bomId = signal('');

  protected readonly stale = computed(() => {
    const checked = this.machine()?.componentsCheckedOn;
    if (!checked) return this.components().length > 0;
    return Date.now() - Date.parse(checked) > CHECK_EVERY_DAYS * 86_400_000;
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    if (this.mock) return;
    try {
      const [machine, components] = await Promise.all([
        firstValueFrom(this.assetsApi.get(this.id)),
        firstValueFrom(this.api.getList(this.id)),
      ]);
      this.machine.set(machine);
      this.components.set(components);
    } catch (e) {
      this.loadError.set(readApiError(e, 'This machine could not be loaded.'));
    }
  }

  protected stageText = stageText;
  protected stageTone = stageTone;
  protected bandText = bandText;

  protected sourceText(s: ComponentSource): string {
    return SOURCE_LABEL[s];
  }

  protected patch(change: Partial<CreateUpdateInstalledComponentDto>): void {
    this.form.update((f) => ({ ...f, ...change }));
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.form.set(blank());
    this.formSource.set(ComponentSource.Typed);
    this.draftNote.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(c: InstalledComponentDto): void {
    this.editingId.set(c.id);
    this.form.set({
      partNumber: c.partNumber,
      description: c.description,
      make: c.make ?? '',
      series: c.series ?? '',
      quantity: c.quantity,
      position: c.position ?? '',
      firmware: c.firmware ?? '',
      installedOn: c.installedOn ?? null,
    });
    this.draftNote.set(null);
    this.formOpen.set(true);
  }

  protected async save(): Promise<void> {
    const f = this.form();
    if (!f.partNumber.trim()) {
      this.toasts.warning('Type the part number.');
      return;
    }
    this.busy.set(true);
    try {
      const input = { ...f, partNumber: f.partNumber.trim(), source: this.formSource() };
      const id = this.editingId();
      if (id) await firstValueFrom(this.api.update(id, input));
      else await firstValueFrom(this.api.create(this.id, input));
      this.formOpen.set(false);
      this.toasts.success(id ? 'Component saved.' : 'Component added.');
      this.components.set(await firstValueFrom(this.api.getList(this.id)));
    } catch (e) {
      this.toasts.error(readApiError(e, 'The component could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(c: InstalledComponentDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Remove ${c.partNumber}?`,
      message: 'It comes off this machine’s list. Nothing else changes.',
      confirmText: 'Remove',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(c.id));
      this.components.update((list) => list.filter((x) => x.id !== c.id));
    } catch (e) {
      this.toasts.error(readApiError(e, 'The component could not be removed.'));
    }
  }

  protected async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busy.set(true);
    this.importProblems.set([]);
    try {
      const body = new FormData();
      body.append('assetId', this.id);
      body.append('file', file, file.name);
      const result = await firstValueFrom(this.api.import(body));
      this.importProblems.set(result.problems ?? []);
      this.toasts.success(`${result.added} added, ${result.updated} updated.`);
      this.components.set(await firstValueFrom(this.api.getList(this.id)));
    } catch (e) {
      this.toasts.error(readApiError(e, 'The file could not be imported.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected downloadTemplate(): void {
    const csv = [
      'Machine serial,Part number,Description,Make,Series,Quantity,Position,Firmware',
      ',6ES7315-2AH14-0AB0,CPU 315-2 DP,Siemens,S7-300,1,Main panel rack 0 slot 2,V3.3',
      '',
    ].join(String.fromCharCode(13, 10));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'machine-components.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /** A nameplate photo, read by AI, opens the form filled in for a person to check and save. */
  protected async readNameplate(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busy.set(true);
    try {
      const body = new FormData();
      body.append('file', file, file.name);
      const draft = await firstValueFrom(this.api.readNameplate(this.id, body));
      this.editingId.set(null);
      this.form.set({
        ...blank(),
        partNumber: draft.partNumber ?? '',
        description: draft.description ?? '',
        make: draft.make ?? '',
        series: draft.series ?? '',
      });
      this.formSource.set(ComponentSource.Nameplate);
      this.draftNote.set(
        [
          'Read from the photo: check it before saving.',
          draft.ratings ? `Ratings: ${draft.ratings}.` : '',
          draft.serialNumber ? `Serial: ${draft.serialNumber}.` : '',
          draft.note ?? '',
        ]
          .filter((x) => x)
          .join(' '),
      );
      this.formOpen.set(true);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The photo could not be read.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async loadBoms(): Promise<void> {
    if (this.boms().length) return;
    try {
      const page = await firstValueFrom(this.bomsApi.getList({ maxResultCount: 200 }));
      this.boms.set(page.items ?? []);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The bills of materials could not be loaded.'));
    }
  }

  protected async copyBom(): Promise<void> {
    if (!this.bomId()) return;
    this.busy.set(true);
    try {
      const n = await firstValueFrom(this.api.copyFromBom(this.id, this.bomId()));
      this.toasts.success(`${n} component${n === 1 ? '' : 's'} copied from the bill of materials.`);
      this.components.set(await firstValueFrom(this.api.getList(this.id)));
    } catch (e) {
      this.toasts.error(readApiError(e, 'The bill of materials could not be copied.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async setCriticality(value: string): Promise<void> {
    try {
      this.machine.set(await firstValueFrom(this.api.setCriticality(this.id, Number(value))));
    } catch (e) {
      this.toasts.error(readApiError(e, 'The criticality could not be saved.'));
    }
  }

  protected async markChecked(): Promise<void> {
    try {
      this.machine.set(await firstValueFrom(this.api.markChecked(this.id)));
      this.toasts.success('Component list marked as checked today.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The check could not be recorded.'));
    }
  }
}
