import { PermissionService } from '@abp/ng.core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ResellerNumberDto,
  ResellerNumberStatus,
  ResellerNumberType,
  SimBindingStatus,
  TelecomEntityClassification,
  TelecomKycStatus,
} from '../../proxy/channels';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentUserService } from '../../core/services/current-user.service';
import { TelecomStore } from '../../core/services/telecom.store';
import { TenantDto, TenantService } from '../../proxy/tenant-management';
import { ToastService } from '../../core/ui/toast.service';
import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArIcon } from '../../ui';

type ActiveTab = 'inventory' | 'telecom-entity';

@Component({
  selector: 'ar-telecom',
  standalone: true,
  imports: [CommonModule, FormsModule, ArTopbar, ArBanner, ArButton, ArChip, ArIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './telecom.html',
  styleUrl: './telecom.scss',
})
export class ArTelecom {
  protected readonly store = inject(TelecomStore);
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly tenantApi = inject(TenantService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly pageTitle = computed(() => {
    switch (this.mode) {
      case 'new': return 'Add number to inventory';
      case 'settings': return 'Telecom settings';
      case 'allocate': return 'Allocate number';
      case 'release': return 'Release number';
      case 'audit': return 'Compliance audit report';
      default: return 'Telecom & Reseller Numbers';
    }
  });

  /** Only the host chooses which workspace gets a number; a workspace allocates to itself. */
  protected readonly isHost = computed(() => this.currentUser.isHost());
  private readonly tenantsResource = rxResource({
    params: () => (this.isHost() && !environment.useMockData ? { host: true } : undefined),
    stream: () => this.tenantApi.getList({ maxResultCount: 1000, sorting: 'name' }),
    defaultValue: { totalCount: 0, items: [] as TenantDto[] },
  });
  protected readonly tenants = computed<readonly TenantDto[]>(
    () => this.tenantsResource.value().items,
  );
  protected readonly draftTenantId = signal('');

  protected readonly canManage = grantedPolicy('AutoReach.Telecom.Manage', this.permissions);
  protected readonly canResell = grantedPolicy('AutoReach.Telecom.ResellNumbers', this.permissions);

  protected readonly activeTab = signal<ActiveTab>('inventory');

  // Dialog signals
  protected readonly addNumberDialogOpen = signal(false);
  protected readonly allocateDialogOpen = signal(false);
  protected readonly releaseDialogOpen = signal(false);
  protected readonly editSettingsDialogOpen = signal(false);
  protected readonly auditDialogOpen = signal(false);
  protected readonly selectedNumber = signal<ResellerNumberDto | null>(null);

  // Add Number form drafts
  protected readonly draftE164 = signal('+91 ');
  protected readonly draftCountryCode = signal('+91');
  protected readonly draftNationalNumber = signal('');
  protected readonly draftCarrier = signal('Tata Teleservices');
  protected readonly draftType = signal<ResellerNumberType>(ResellerNumberType.VirtualDid);
  protected readonly draftRentalInr = signal(499);
  protected readonly draftSetupInr = signal(0);
  protected readonly draftNotes = signal('');

  // Allocate form drafts
  protected readonly draftTenantName = signal('');
  protected readonly draftVerifiedName = signal('');

  // Release form drafts
  protected readonly draftReleaseReason = signal('Customer requested contract termination');
  protected readonly draftQuarantineDays = signal(30);

  // Settings form drafts
  protected readonly draftLegalName = signal('');
  protected readonly draftClassification = signal<TelecomEntityClassification>(
    TelecomEntityClassification.VirtualNetworkOperator,
  );
  protected readonly draftDotReg = signal('');
  protected readonly draftDltId = signal('');
  protected readonly draftTmId = signal('');
  protected readonly draftPrimaryTsp = signal('');
  protected readonly draftSecondaryTsp = signal('');
  protected readonly draftInterconnect = signal('');
  protected readonly draftCtsoName = signal('');
  protected readonly draftCtsoEmail = signal('');
  protected readonly draftCtsoPhone = signal('');
  protected readonly draftCtsoDesignation = signal('');

  // Enums for template usage
  protected readonly ResellerNumberStatus = ResellerNumberStatus;
  protected readonly ResellerNumberType = ResellerNumberType;
  protected readonly TelecomEntityClassification = TelecomEntityClassification;
  protected readonly TelecomKycStatus = TelecomKycStatus;
  protected readonly SimBindingStatus = SimBindingStatus;

  protected readonly subtitle = computed(() => {
    const k = this.store.kpis();
    return `${k.total} managed numbers · ${k.allocated} allocated to workspaces · ${k.available} available in pool`;
  });

  constructor() {
    if (this.mode === 'new') {
      this.openAddNumberDialog();
    } else if (this.mode === 'settings') {
      this.openEditSettingsDialog();
    } else if (this.mode === 'audit') {
      void this.runAudit();
    } else if (this.mode === 'allocate' || this.mode === 'release') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const num = this.store.rawNumbers().find((x: ResellerNumberDto) => x.id === id);
      if (num) {
        if (this.mode === 'allocate') this.openAllocateDialog(num);
        else this.openReleaseDialog(num);
      }
    }
  }

  protected goAddNumber(): void {
    if (this.router) void this.router.navigate(['/channels/telecom/new']);
    else this.openAddNumberDialog();
  }

  protected goSettings(): void {
    if (this.router) void this.router.navigate(['/channels/telecom/settings']);
    else this.openEditSettingsDialog();
  }

  protected goAllocate(n: ResellerNumberDto): void {
    if (this.router && n.id) void this.router.navigate(['/channels/telecom/allocate', n.id]);
    else this.openAllocateDialog(n);
  }

  protected goRelease(n: ResellerNumberDto): void {
    if (this.router && n.id) void this.router.navigate(['/channels/telecom/release', n.id]);
    else this.openReleaseDialog(n);
  }

  protected goAudit(): void {
    if (this.router) void this.router.navigate(['/channels/telecom/audit']);
    else void this.runAudit();
  }

  protected close(): void {
    this.addNumberDialogOpen.set(false);
    this.allocateDialogOpen.set(false);
    this.releaseDialogOpen.set(false);
    this.editSettingsDialogOpen.set(false);
    this.auditDialogOpen.set(false);
    this.selectedNumber.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/channels/telecom']);
    }
  }

  // Lifecycle & Dialog Openers
  protected openAddNumberDialog(): void {
    this.draftNationalNumber.set('');
    this.draftE164.set('+91 ');
    this.draftRentalInr.set(499);
    this.draftSetupInr.set(0);
    this.draftNotes.set('');
    this.addNumberDialogOpen.set(true);
  }

  protected onNationalNumberInput(val: string): void {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    this.draftNationalNumber.set(clean);
    this.draftE164.set(clean ? `+91 ${clean}` : '+91 ');
  }

  protected async submitAddNumber(): Promise<void> {
    const nat = this.draftNationalNumber().trim();
    if (nat.length < 10) {
      this.toasts.warning('Please enter a valid 10-digit number.', 'Invalid phone number');
      return;
    }

    try {
      await this.store.addNumber({
        e164: `+91 ${nat}`,
        countryCode: '+91',
        nationalNumber: nat,
        tspCarrier: this.draftCarrier(),
        numberType: this.draftType(),
        monthlyRentalPaise: Math.round(this.draftRentalInr() * 100),
        setupFeePaise: Math.round(this.draftSetupInr() * 100),
        notes: this.draftNotes() || undefined,
      });
      this.toasts.success(`Number +91 ${nat} added to reseller inventory.`, 'Number added');
      this.close();
    } catch (err: any) {
      this.toasts.error(err?.message || 'Failed to add number to inventory.', 'Error');
    }
  }

  protected openAllocateDialog(n: ResellerNumberDto): void {
    this.selectedNumber.set(n);
    this.draftTenantName.set('');
    this.draftTenantId.set('');
    this.draftVerifiedName.set(n.verifiedName ?? '');
    this.allocateDialogOpen.set(true);
  }

  protected async submitAllocate(): Promise<void> {
    const num = this.selectedNumber();
    if (!num || !num.id) return;
    const host = this.isHost();
    const tenantId = this.draftTenantId();
    const tenant = host
      ? (this.tenants().find((t) => t.id === tenantId)?.name ?? this.draftTenantName().trim())
      : 'your workspace';
    if (host && !tenantId && !environment.useMockData) {
      this.toasts.warning(
        'Choose the workspace this number is allocated to.',
        'Workspace required',
      );
      return;
    }

    try {
      await this.store.allocate(num.id, {
        tenantId: host && tenantId ? tenantId : undefined,
        tenantName: tenant,
        verifiedName: this.draftVerifiedName().trim() || undefined,
      });
      this.toasts.success(
        `Number ${num.e164} allocated to ${tenant} with active KYC.`,
        'Number Allocated',
      );
      this.close();
    } catch (err: any) {
      this.toasts.error(err?.message || 'Failed to allocate number.', 'Error');
    }
  }

  protected openReleaseDialog(n: ResellerNumberDto): void {
    this.selectedNumber.set(n);
    this.draftReleaseReason.set('Normal release to cooling-off pool');
    this.draftQuarantineDays.set(30);
    this.releaseDialogOpen.set(true);
  }

  protected async submitRelease(): Promise<void> {
    const num = this.selectedNumber();
    if (!num || !num.id) return;

    try {
      await this.store.release(num.id, {
        reason: this.draftReleaseReason(),
        quarantineDays: this.draftQuarantineDays(),
      });
      this.toasts.info(
        `Number ${num.e164} moved to quarantine cooling-off (${this.draftQuarantineDays()} days).`,
        'Number Released',
      );
      this.close();
    } catch (err: any) {
      this.toasts.error(err?.message || 'Failed to release number.', 'Error');
    }
  }

  protected openEditSettingsDialog(): void {
    const s = this.store.settings();
    this.draftLegalName.set(s.legalEntityName ?? '');
    this.draftClassification.set(s.classification);
    this.draftDotReg.set(s.dotRegistrationNumber ?? '');
    this.draftDltId.set(s.dltPrincipalEntityId ?? '');
    this.draftTmId.set(s.telemarketerId ?? '');
    this.draftPrimaryTsp.set(s.primaryTspCarrier ?? '');
    this.draftSecondaryTsp.set(s.secondaryTspCarrier ?? '');
    this.draftInterconnect.set(s.interconnectPoint ?? '');
    this.draftCtsoName.set(s.ctsoName ?? '');
    this.draftCtsoEmail.set(s.ctsoEmail ?? '');
    this.draftCtsoPhone.set(s.ctsoPhone ?? '');
    this.draftCtsoDesignation.set(s.ctsoDesignation ?? '');
    this.editSettingsDialogOpen.set(true);
  }

  protected async submitSettings(): Promise<void> {
    if (!this.draftLegalName().trim() || !this.draftDotReg().trim() || !this.draftDltId().trim()) {
      this.toasts.warning('Please fill in all mandatory legal entity fields.', 'Incomplete form');
      return;
    }

    try {
      await this.store.updateSettings({
        legalEntityName: this.draftLegalName().trim(),
        classification: this.draftClassification(),
        dotRegistrationNumber: this.draftDotReg().trim(),
        dltPrincipalEntityId: this.draftDltId().trim(),
        telemarketerId: this.draftTmId().trim(),
        primaryTspCarrier: this.draftPrimaryTsp().trim(),
        secondaryTspCarrier: this.draftSecondaryTsp().trim() || undefined,
        interconnectPoint: this.draftInterconnect().trim() || undefined,
        ctsoName: this.draftCtsoName().trim(),
        ctsoEmail: this.draftCtsoEmail().trim(),
        ctsoPhone: this.draftCtsoPhone().trim(),
        ctsoDesignation: this.draftCtsoDesignation().trim(),
        simBindingEnforced: true,
        antiSpoofingAuditPassed: true,
        lawfulInterceptionLogging: true,
        metaTechProviderAgreementSigned: true,
        prohibitionOfDisposableNumbersAcknowledged: true,
      });
      this.toasts.success('Telecom entity profile updated successfully.', 'Settings Saved');
      this.close();
    } catch (err: any) {
      this.toasts.error(err?.message || 'Failed to update telecom entity settings.', 'Error');
    }
  }

  protected async runAudit(): Promise<void> {
    try {
      const res = await this.store.runAudit();
      this.toasts.success(
        `Audit complete: ${res.simBoundCount}/${res.totalInventoryCount} numbers compliant with telecom identifier rules.`,
        'Audit Passed',
      );
      this.auditDialogOpen.set(true);
    } catch (err: any) {
      this.toasts.error(err?.message || 'Failed to run telecom compliance audit.', 'Audit Error');
    }
  }

  // Tone Helpers
  protected statusTone(s: ResellerNumberStatus): 'good' | 'amber' | 'bad' | 'neutral' {
    switch (s) {
      case ResellerNumberStatus.Allocated:
        return 'good';
      case ResellerNumberStatus.Available:
        return 'amber';
      case ResellerNumberStatus.Reserved:
        return 'neutral';
      case ResellerNumberStatus.Quarantined:
      case ResellerNumberStatus.Suspended:
        return 'bad';
    }
  }

  protected statusLabel(s: ResellerNumberStatus): string {
    switch (s) {
      case ResellerNumberStatus.Available:
        return 'Available in Pool';
      case ResellerNumberStatus.Allocated:
        return 'Allocated to Tenant';
      case ResellerNumberStatus.Reserved:
        return 'Reserved';
      case ResellerNumberStatus.Quarantined:
        return 'In Quarantine';
      case ResellerNumberStatus.Suspended:
        return 'Suspended';
    }
  }

  protected typeLabel(t: ResellerNumberType): string {
    switch (t) {
      case ResellerNumberType.VirtualDid:
        return 'Virtual DID (SIP Trunk)';
      case ResellerNumberType.SimBoundMobile:
        return 'SIM-Bound Hardware Mobile';
      case ResellerNumberType.TollFree:
        return '1800 Enterprise Toll-Free';
      case ResellerNumberType.LandlineDid:
        return 'Fixed Landline DID';
    }
  }

  protected classificationLabel(c: TelecomEntityClassification): string {
    switch (c) {
      case TelecomEntityClassification.VirtualNetworkOperator:
        return 'Virtual Network Operator (VNO - Access Authorization)';
      case TelecomEntityClassification.TelecomIdentifierUserEntity:
        return 'Telecom Identifier User Entity (TIUE)';
      case TelecomEntityClassification.DltPrincipalEntity:
        return 'DLT Principal Entity (TRAI Commercial Communications)';
      case TelecomEntityClassification.RegisteredTelemarketer:
        return 'Registered Telemarketer (TRAI RTM Aggregator)';
      case TelecomEntityClassification.TechProviderBsp:
        return 'Meta Authorized Tech Provider / BSP';
    }
  }

  protected formatCurrency(inr: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(inr);
  }

  protected when(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
