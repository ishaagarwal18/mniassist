import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ResellerNumberDto,
  ResellerNumberStatus,
  ResellerNumberType,
  SimBindingStatus,
  TelecomComplianceAuditResultDto,
  TelecomEntityClassification,
  TelecomEntitySettingsDto,
  TelecomKycStatus,
  TelecomService as TelecomApi,
  UpdateTelecomEntitySettingsDto,
  CreateResellerNumberInput,
  AllocateNumberInput,
  ReleaseNumberInput,
  UpdateNumberKycInput,
} from '../../proxy/channels';
import { DisplayNameStatus } from '../../proxy/channels/display-name-status.enum';
import { MessagingTier } from '../../proxy/channels/messaging-tier.enum';
import { QualityRating } from '../../proxy/channels/quality-rating.enum';

const SEED_SETTINGS: TelecomEntitySettingsDto = {
  id: 'tel-settings-1',
  legalEntityName: 'Meridian Industrial Automation & Telecom Solutions Pvt Ltd',
  classification: TelecomEntityClassification.VirtualNetworkOperator,
  dotRegistrationNumber: 'DOT/VNO-ACCESS/2024/7821-MH',
  dltPrincipalEntityId: '1101589300000045192',
  telemarketerId: '1702159840000019284',
  primaryTspCarrier: 'Tata Teleservices Limited',
  secondaryTspCarrier: 'Bharti Airtel Enterprise Services',
  interconnectPoint: 'NLD/SIP Trunk Interconnect POP-Mumbai',
  ctsoName: 'Vikram Malhotra',
  ctsoEmail: 'telecom-security@mni-assist.com',
  ctsoPhone: '+91 98201 55432',
  ctsoDesignation: 'Chief Telecommunication Security Officer (CTSO)',
  simBindingEnforced: true,
  antiSpoofingAuditPassed: true,
  lawfulInterceptionLogging: true,
  metaTechProviderAgreementSigned: true,
  prohibitionOfDisposableNumbersAcknowledged: true,
  lastComplianceAuditUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  auditNotes:
    'Annual DoT and TRAI commercial communications compliance verification completed successfully.',
};

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

// Sample data for the in-browser demo mode (environment.useMockData) only; never shown against the real API.
const SEED_NUMBERS: ResellerNumberDto[] = [
  {
    id: 'num-1',
    e164: '+91 90210 44872',
    countryCode: '+91',
    nationalNumber: '9021044872',
    tspCarrier: 'Tata Teleservices',
    numberType: ResellerNumberType.VirtualDid,
    status: ResellerNumberStatus.Allocated,
    allocatedTenantName: 'Meridian Automation Hub',
    allocatedAtUtc: new Date(Date.now() - 120 * 86_400_000).toISOString(),
    monthlyRentalPaise: 49900,
    monthlyRentalInr: 499,
    setupFeePaise: 0,
    setupFeeInr: 0,
    verifiedName: 'Meridian Industrial Core',
    displayNameStatus: DisplayNameStatus.Approved,
    isRegisteredWithMeta: true,
    metaPhoneNumberId: 'PN_9021044872',
    metaWabaId: 'WABA_882910',
    quality: QualityRating.Green,
    tier: MessagingTier.Tier2,
    kycStatus: TelecomKycStatus.Verified,
    kycDocumentRef: 'GST-DOC-27AAECM9821R1Z8',
    simBindingStatus: SimBindingStatus.AuthorizedCarrierAllocation,
    simBindingCertRef: 'TTL-DID-ALLOC-2024-912',
    notes: 'Primary outbound transactional & service channel',
  },
  {
    id: 'num-2',
    e164: '+91 90210 44880',
    countryCode: '+91',
    nationalNumber: '9021044880',
    tspCarrier: 'Tata Teleservices',
    numberType: ResellerNumberType.VirtualDid,
    status: ResellerNumberStatus.Available,
    monthlyRentalPaise: 49900,
    monthlyRentalInr: 499,
    setupFeePaise: 0,
    setupFeeInr: 0,
    verifiedName: 'AutoReach Virtual DID',
    displayNameStatus: DisplayNameStatus.Approved,
    isRegisteredWithMeta: true,
    quality: QualityRating.Green,
    tier: MessagingTier.Tier1,
    kycStatus: TelecomKycStatus.Verified,
    kycDocumentRef: 'POOL-MASTER-KYC-01',
    simBindingStatus: SimBindingStatus.AuthorizedCarrierAllocation,
    notes: 'Clean DID in inventory pool, pre-provisioned on Tata SIP Trunk',
  },
  {
    id: 'num-3',
    e164: '+91 90210 44881',
    countryCode: '+91',
    nationalNumber: '9021044881',
    tspCarrier: 'Bharti Airtel',
    numberType: ResellerNumberType.VirtualDid,
    status: ResellerNumberStatus.Available,
    monthlyRentalPaise: 49900,
    monthlyRentalInr: 499,
    setupFeePaise: 0,
    setupFeeInr: 0,
    verifiedName: 'Airtel Enterprise DID',
    displayNameStatus: DisplayNameStatus.Approved,
    isRegisteredWithMeta: true,
    quality: QualityRating.Green,
    tier: MessagingTier.Tier1,
    kycStatus: TelecomKycStatus.Verified,
    kycDocumentRef: 'AIRTEL-BULK-2024-55',
    simBindingStatus: SimBindingStatus.AuthorizedCarrierAllocation,
    notes: 'High-throughput Airtel enterprise route',
  },
  {
    id: 'num-4',
    e164: '+91 90210 44882',
    countryCode: '+91',
    nationalNumber: '9021044882',
    tspCarrier: 'Reliance Jio',
    numberType: ResellerNumberType.SimBoundMobile,
    status: ResellerNumberStatus.Available,
    monthlyRentalPaise: 79900,
    monthlyRentalInr: 799,
    setupFeePaise: 99900,
    setupFeeInr: 999,
    verifiedName: 'Jio SIM-Bound Business Line',
    displayNameStatus: DisplayNameStatus.Approved,
    isRegisteredWithMeta: true,
    quality: QualityRating.Green,
    tier: MessagingTier.Tier1,
    kycStatus: TelecomKycStatus.Verified,
    simBindingStatus: SimBindingStatus.Compliant,
    simBindingCertRef: 'JIO-ESIM-BIND-8812',
    notes: 'Dedicated cryptographically bound SIM hardware line',
  },
  {
    id: 'num-5',
    e164: '+91 1800 209 4488',
    countryCode: '+91',
    nationalNumber: '18002094488',
    tspCarrier: 'Tata Teleservices',
    numberType: ResellerNumberType.TollFree,
    status: ResellerNumberStatus.Allocated,
    allocatedTenantName: 'Apex Precision Pumps',
    allocatedAtUtc: new Date(Date.now() - 45 * 86_400_000).toISOString(),
    monthlyRentalPaise: 149900,
    monthlyRentalInr: 1499,
    setupFeePaise: 199900,
    setupFeeInr: 1999,
    verifiedName: 'Apex Toll-Free Support',
    displayNameStatus: DisplayNameStatus.Approved,
    isRegisteredWithMeta: true,
    metaPhoneNumberId: 'PN_18002094488',
    quality: QualityRating.Green,
    tier: MessagingTier.Tier3,
    kycStatus: TelecomKycStatus.Verified,
    simBindingStatus: SimBindingStatus.AuthorizedCarrierAllocation,
    notes: 'Customer support hotline WhatsApp channel',
  },
  {
    id: 'num-6',
    e164: '+91 90210 44899',
    countryCode: '+91',
    nationalNumber: '9021044899',
    tspCarrier: 'Bharti Airtel',
    numberType: ResellerNumberType.VirtualDid,
    status: ResellerNumberStatus.Quarantined,
    monthlyRentalPaise: 49900,
    monthlyRentalInr: 499,
    setupFeePaise: 0,
    setupFeeInr: 0,
    displayNameStatus: DisplayNameStatus.Pending,
    isRegisteredWithMeta: false,
    quality: QualityRating.Unknown,
    tier: MessagingTier.Starting,
    kycStatus: TelecomKycStatus.PendingKyc,
    simBindingStatus: SimBindingStatus.PendingVerification,
    quarantinedUntilUtc: new Date(Date.now() + 22 * 86_400_000).toISOString(),
    notes: 'Cooling-off quarantine after tenant deboarding',
  },
];

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

  private readonly localSettings = signal<TelecomEntitySettingsDto>(SEED_SETTINGS);
  private readonly localNumbers = signal<ResellerNumberDto[]>(SEED_NUMBERS);

  private readonly settingsResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () =>
      environment.useMockData ? of(this.localSettings()) : this.api.getEntitySettings(),
    defaultValue: environment.useMockData ? SEED_SETTINGS : EMPTY_SETTINGS,
  });

  private readonly numbersResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () =>
      environment.useMockData
        ? of({ totalCount: this.localNumbers().length, items: this.localNumbers() })
        : this.api
            .getNumbers({
              skipCount: 0,
              maxResultCount: 200,
            })
            .pipe(),
    defaultValue: environment.useMockData
      ? { totalCount: SEED_NUMBERS.length, items: SEED_NUMBERS }
      : { totalCount: 0, items: [] },
  });

  readonly settings = computed<TelecomEntitySettingsDto>(() => {
    if (environment.useMockData) return this.localSettings();
    return this.settingsResource.value() ?? EMPTY_SETTINGS;
  });

  readonly rawNumbers = computed<readonly ResellerNumberDto[]>(() => {
    if (environment.useMockData) return this.localNumbers();
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
      if (environment.useMockData) {
        const created: ResellerNumberDto = {
          id: 'num-' + (this.localNumbers().length + 1),
          e164: input.e164,
          countryCode: input.countryCode,
          nationalNumber: input.nationalNumber,
          tspCarrier: input.tspCarrier,
          numberType: input.numberType ?? ResellerNumberType.VirtualDid,
          status: ResellerNumberStatus.Available,
          monthlyRentalPaise: input.monthlyRentalPaise ?? 49900,
          monthlyRentalInr: (input.monthlyRentalPaise ?? 49900) / 100,
          setupFeePaise: input.setupFeePaise ?? 0,
          setupFeeInr: (input.setupFeePaise ?? 0) / 100,
          displayNameStatus: DisplayNameStatus.Pending,
          isRegisteredWithMeta: false,
          quality: QualityRating.Unknown,
          tier: MessagingTier.Starting,
          kycStatus: TelecomKycStatus.Verified,
          simBindingStatus: SimBindingStatus.AuthorizedCarrierAllocation,
          notes: input.notes,
        };
        this.localNumbers.update((arr) => [created, ...arr]);
      } else {
        await firstValueFrom(this.api.createNumber(input));
        this.refresh();
      }
    } finally {
      this.busy.set(false);
    }
  }

  async allocate(id: string, input: AllocateNumberInput): Promise<void> {
    this.busy.set(true);
    try {
      if (environment.useMockData) {
        this.localNumbers.update((arr) =>
          arr.map((n) =>
            n.id === id
              ? {
                  ...n,
                  status: ResellerNumberStatus.Allocated,
                  allocatedTenantName: input.tenantName ?? 'Allocated Workspace',
                  allocatedAtUtc: new Date().toISOString(),
                  verifiedName: input.verifiedName ?? n.verifiedName,
                  kycStatus: TelecomKycStatus.Verified,
                }
              : n,
          ),
        );
      } else {
        await firstValueFrom(this.api.allocateNumber(id, input));
        this.refresh();
      }
    } finally {
      this.busy.set(false);
    }
  }

  async release(id: string, input: ReleaseNumberInput): Promise<void> {
    this.busy.set(true);
    try {
      if (environment.useMockData) {
        const quarantineDays = input.quarantineDays ?? 30;
        this.localNumbers.update((arr) =>
          arr.map((n) =>
            n.id === id
              ? {
                  ...n,
                  status: ResellerNumberStatus.Quarantined,
                  allocatedTenantName: undefined,
                  allocatedAtUtc: undefined,
                  quarantinedUntilUtc: new Date(
                    Date.now() + quarantineDays * 86_400_000,
                  ).toISOString(),
                  notes: `${n.notes ?? ''} [Released: ${input.reason ?? 'Normal release'}]`.trim(),
                }
              : n,
          ),
        );
      } else {
        await firstValueFrom(this.api.releaseNumber(id, input));
        this.refresh();
      }
    } finally {
      this.busy.set(false);
    }
  }

  async updateKyc(id: string, input: UpdateNumberKycInput): Promise<void> {
    this.busy.set(true);
    try {
      if (environment.useMockData) {
        this.localNumbers.update((arr) =>
          arr.map((n) =>
            n.id === id
              ? {
                  ...n,
                  kycStatus: input.status,
                  kycDocumentRef: input.documentRef ?? n.kycDocumentRef,
                  notes: input.notes ?? n.notes,
                }
              : n,
          ),
        );
      } else {
        await firstValueFrom(this.api.updateNumberKyc(id, input));
        this.refresh();
      }
    } finally {
      this.busy.set(false);
    }
  }

  async updateSettings(input: UpdateTelecomEntitySettingsDto): Promise<void> {
    this.busy.set(true);
    try {
      if (environment.useMockData) {
        this.localSettings.update((s) => ({
          ...s,
          ...input,
          lastComplianceAuditUtc: new Date().toISOString(),
        }));
      } else {
        const res = await firstValueFrom(this.api.updateEntitySettings(input));
        this.localSettings.set(res);
        this.refresh();
      }
    } finally {
      this.busy.set(false);
    }
  }

  async runAudit(): Promise<TelecomComplianceAuditResultDto> {
    this.busy.set(true);
    try {
      if (environment.useMockData) {
        const list = this.rawNumbers();
        const settings = this.settings();
        const res: TelecomComplianceAuditResultDto = {
          totalInventoryCount: list.length,
          allocatedCount: list.filter((n) => n.status === ResellerNumberStatus.Allocated).length,
          availableCount: list.filter((n) => n.status === ResellerNumberStatus.Available).length,
          quarantinedCount: list.filter((n) => n.status === ResellerNumberStatus.Quarantined)
            .length,
          simBoundCount: list.filter(
            (n) =>
              n.simBindingStatus === SimBindingStatus.Compliant ||
              n.simBindingStatus === SimBindingStatus.AuthorizedCarrierAllocation,
          ).length,
          kycVerifiedCount: list.filter((n) => n.kycStatus === TelecomKycStatus.Verified).length,
          entityLicenseValid: true,
          ctsoAppointed: true,
          antiSpoofingCompliant: true,
          metaTechProviderCompliant: true,
          auditTimestampUtc: new Date().toISOString(),
          checks: [
            `DoT Entity Classification: ${settings.classification} (${settings.dotRegistrationNumber})`,
            `TRAI DLT Principal Entity ID Active: ${settings.dltPrincipalEntityId}`,
            `TRAI Telemarketer Registration Active: ${settings.telemarketerId}`,
            `Chief Telecommunication Security Officer (CTSO): ${settings.ctsoName} (${settings.ctsoEmail})`,
            `Primary Interconnect TSP: ${settings.primaryTspCarrier}`,
            `Hardware SIM-binding & Carrier Anti-Spoofing: Enforced & Active`,
            `Telecom Lawful Interception Audit Trail: Active & Compliant`,
            `Meta Tech Provider & Cloud API Direct Agreement: Signed & In Good Standing`,
            `Strict Prohibition of Spoofed/Disposable Numbers: Enforced across all ${list.length} inventory numbers`,
          ],
        };
        this.auditResult.set(res);
        return res;
      } else {
        const res = await firstValueFrom(this.api.runComplianceAudit());
        this.auditResult.set(res);
        this.refresh();
        return res;
      }
    } finally {
      this.busy.set(false);
    }
  }
}
