import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import {
  ResellerNumberDto,
  ResellerNumberStatus,
  TelecomComplianceAuditResultDto,
  TelecomEntityClassification,
  TelecomEntitySettingsDto,
  TelecomService as TelecomApi,
  UpdateTelecomEntitySettingsDto,
  CreateResellerNumberInput,
  AllocateNumberInput,
  ReleaseNumberInput,
  UpdateNumberKycInput,
} from '../../proxy/channels';

/** What a workspace sees before it has filled in its profile, or while it loads: nothing invented. */
const EMPTY_SETTINGS: TelecomEntitySettingsDto = {
  legalEntityName: '',
  classification: TelecomEntityClassification.VirtualNetworkOperator,
  dotRegistrationNumber: '',
  dltPrincipalEntityId: '',
  telemarketerId: '',
  primaryTspCarrier: '',
  ctsoName: '',
  ctsoEmail: '',
  ctsoPhone: '',
  ctsoDesignation: '',
  simBindingEnforced: false,
  antiSpoofingAuditPassed: false,
  lawfulInterceptionLogging: false,
  metaTechProviderAgreementSigned: false,
  prohibitionOfDisposableNumbersAcknowledged: false,
};

@Injectable({
  providedIn: 'root',
})
export class TelecomStore {
  private readonly api = inject(TelecomApi);

  readonly reloadTick = signal(0);
  readonly busy = signal(false);
  readonly searchQuery = signal('');
  readonly statusFilter = signal<ResellerNumberStatus | 'all'>('all');
  readonly carrierFilter = signal<string>('all');
  readonly auditResult = signal<TelecomComplianceAuditResultDto | null>(null);

  private readonly settingsResource = rxResource({
    params: () => ({ tick: this.reloadTick() }),
    stream: () => this.api.getEntitySettings(),
    defaultValue: EMPTY_SETTINGS,
  });

  private readonly numbersResource = rxResource({
    params: () => ({ tick: this.reloadTick() }),
    stream: () =>
      this.api
        .getNumbers({
          skipCount: 0,
          maxResultCount: 200,
        })
        .pipe(),
    defaultValue: { totalCount: 0, items: [] },
  });

  readonly settings = computed<TelecomEntitySettingsDto>(() => {
    return this.settingsResource.value() ?? EMPTY_SETTINGS;
  });

  readonly rawNumbers = computed<readonly ResellerNumberDto[]>(() => {
    return this.numbersResource.value()?.items ?? [];
  });

  readonly filteredNumbers = computed<readonly ResellerNumberDto[]>(() => {
    const list = this.rawNumbers();
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const carrier = this.carrierFilter();

    return list.filter((n) => {
      if (status !== 'all' && n.status !== status) return false;
      if (carrier !== 'all' && n.tspCarrier !== carrier) return false;
      if (!q) return true;
      return (
        n.e164.toLowerCase().includes(q) ||
        n.nationalNumber.includes(q) ||
        (n.allocatedTenantName && n.allocatedTenantName.toLowerCase().includes(q)) ||
        (n.verifiedName && n.verifiedName.toLowerCase().includes(q)) ||
        n.tspCarrier.toLowerCase().includes(q)
      );
    });
  });

  readonly kpis = computed(() => {
    const list = this.rawNumbers();
    const total = list.length;
    const allocated = list.filter((n) => n.status === ResellerNumberStatus.Allocated).length;
    const available = list.filter((n) => n.status === ResellerNumberStatus.Available).length;
    const quarantined = list.filter((n) => n.status === ResellerNumberStatus.Quarantined).length;
    const monthlyRevenue = list
      .filter((n) => n.status === ResellerNumberStatus.Allocated)
      .reduce((sum, n) => sum + n.monthlyRentalInr, 0);

    return {
      total,
      allocated,
      available,
      quarantined,
      monthlyRevenue,
    };
  });

  readonly carriers = computed(() => {
    const set = new Set<string>();
    for (const n of this.rawNumbers()) {
      if (n.tspCarrier) set.add(n.tspCarrier);
    }
    return Array.from(set).sort();
  });

  refresh(): void {
    this.reloadTick.update((t) => t + 1);
  }

  async addNumber(input: CreateResellerNumberInput): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.createNumber(input));
      this.refresh();
    } finally {
      this.busy.set(false);
    }
  }

  async allocate(id: string, input: AllocateNumberInput): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.allocateNumber(id, input));
      this.refresh();
    } finally {
      this.busy.set(false);
    }
  }

  async release(id: string, input: ReleaseNumberInput): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.releaseNumber(id, input));
      this.refresh();
    } finally {
      this.busy.set(false);
    }
  }

  async updateKyc(id: string, input: UpdateNumberKycInput): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.updateNumberKyc(id, input));
      this.refresh();
    } finally {
      this.busy.set(false);
    }
  }

  async updateSettings(input: UpdateTelecomEntitySettingsDto): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.updateEntitySettings(input));
      this.refresh();
    } finally {
      this.busy.set(false);
    }
  }

  async runAudit(): Promise<TelecomComplianceAuditResultDto> {
    this.busy.set(true);
    try {
      const res = await firstValueFrom(this.api.runComplianceAudit());
      this.auditResult.set(res);
      this.refresh();
      return res;
    } finally {
      this.busy.set(false);
    }
  }
}
