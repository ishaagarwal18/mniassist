import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';
import { readApiError } from '../../core/util/api-error';

import { FeatureFlagDto, FeatureFlagService, SetFeatureFlagInput } from '../../proxy/platform';
import { PlatformAdminService } from '../../proxy/administration';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArIcon } from '../../ui/icon';
import { ArStatTile } from '../../ui/stat-tile';
import { ArSearchBox } from '../../ui/search-box';
import { ArBanner } from '../../ui/banner';
import { ArGrid } from '../../ui/grid';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';

export interface FeatureDef {
  readonly value: string;
  readonly label: string;
  readonly category: string;
  readonly description: string;
  readonly badge: string;
}

export const FEATURE_DEFINITIONS: readonly FeatureDef[] = [
  {
    value: 'mm-lite',
    label: 'Marketing Messages Lite',
    category: 'Messaging',
    description:
      'High-throughput transactional & marketing WhatsApp send path bypassing heavy legacy queuing.',
    badge: 'Core Pipeline',
  },
  {
    value: 'voice-agent-ai',
    label: 'Autonomous Voice Agent',
    category: 'Voice AI',
    description:
      'Bilingual Hindi/English IVR with sub-second speech pipeline and live CRM lookups.',
    badge: 'AI Telephony',
  },
  {
    value: 'auto-reorder-portal',
    label: 'WhatsApp Quick Reorder & Commerce',
    category: 'Commerce',
    description:
      'Self-service spare parts catalog & instant quote-to-order flow for end customers.',
    badge: 'Commerce',
  },
  {
    value: 'smart-amc-dispatch',
    label: 'AMC Automatic Ticket Dispatch',
    category: 'Field Service',
    description:
      'Autonomous service ticket creation and engineer routing from machine telemetry triggers.',
    badge: 'Automation',
  },
];

export interface WorkspaceOption {
  readonly id: string;
  readonly name: string;
}

const DEFAULT_TENANTS: readonly WorkspaceOption[] = [
  { id: 't-1', name: 'Sun Energy Automation' },
  { id: 't-2', name: 'Apex Precision Tooling' },
  { id: 't-3', name: 'Vanguard Robotics & IoT' },
  { id: 't-4', name: 'Metro Fasteners & Supplies' },
  { id: 't-5', name: 'Bharat Precision Hydraulics' },
];

export interface EvaluationResult {
  readonly enabled: boolean;
  readonly source: 'override' | 'global' | 'canary' | 'none';
  readonly reason: string;
  readonly bucket: number;
  readonly rolloutPercent?: number;
}

export function computeTenantBucket(tenantId: string, featureKey: string): number {
  const str = `${(tenantId || '').trim().toLowerCase()}:${(featureKey || '').trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

export function evaluateFeatureFlag(
  flags: FeatureFlagDto[],
  tenantId: string,
  featureKey: string,
): EvaluationResult {
  const cleanId = (tenantId || '').trim();
  const cleanKey = (featureKey || '').trim();
  const bucket = computeTenantBucket(cleanId, cleanKey);

  // 1. Check workspace override
  const override = flags.find(
    (f) => f.key === cleanKey && f.tenantId && f.tenantId.toLowerCase() === cleanId.toLowerCase(),
  );

  if (override) {
    const isEn = !!override.enabled;
    return {
      enabled: isEn,
      source: 'override',
      reason: isEn
        ? `Workspace override explicitly forces this feature ON for "${override.tenantName || override.tenantId}".`
        : `Workspace override explicitly forces this feature OFF for "${override.tenantName || override.tenantId}".`,
      bucket,
    };
  }

  // 2. Check global rule
  const globalRule = flags.find((f) => f.key === cleanKey && !f.tenantId);

  if (!globalRule) {
    return {
      enabled: false,
      source: 'none',
      reason: `No rule configured for "${cleanKey}". Defaulting to disabled.`,
      bucket,
    };
  }

  if (globalRule.enabled) {
    return {
      enabled: true,
      source: 'global',
      reason: 'Global rule is active: 100% full rollout enabled for all workspaces.',
      bucket,
      rolloutPercent: 100,
    };
  }

  const rollout = globalRule.rolloutPercent ?? 0;
  if (rollout <= 0) {
    return {
      enabled: false,
      source: 'global',
      reason: 'Global rule is disabled (0% rollout) with no matching workspace override.',
      bucket,
      rolloutPercent: 0,
    };
  }

  const inside = bucket < rollout;
  return {
    enabled: inside,
    source: 'canary',
    reason: inside
      ? `Tenant hash bucket #${bucket} is within the ${rollout}% canary rollout threshold (< ${rollout}). Feature is active!`
      : `Tenant hash bucket #${bucket} is outside the ${rollout}% canary rollout threshold (>= ${rollout}). Feature is inactive.`,
    bucket,
    rolloutPercent: rollout,
  };
}

@Component({
  selector: 'ar-feature-flags',
  imports: [
    CommonModule,
    FormsModule,
    NgTemplateOutlet,
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArIcon,
    ArStatTile,
    ArSearchBox,
    ArBanner,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-flags.html',
  styleUrl: './feature-flags.scss',
})
export class ArFeatureFlags implements OnInit {
  private readonly dialogs = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(FeatureFlagService);
  private readonly admin = inject(PlatformAdminService, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly definitions = FEATURE_DEFINITIONS;
  protected readonly defaultTenants = DEFAULT_TENANTS;
  /** The platform's own workspaces, for the pickers. */
  protected readonly tenants = signal<WorkspaceOption[]>([]);

  private readonly tick = signal(0);

  // Search & Filtering
  protected readonly searchQuery = signal('');
  protected readonly scopeFilter = signal<
    'all' | 'global' | 'override' | 'active' | 'staged' | 'disabled'
  >('all');
  protected readonly featureFilter = signal<string>('all');

  // Simulator / Evaluator
  protected readonly simulatorOpen = signal(false);
  protected readonly simTenantId = signal('');
  protected readonly simFeatureKey = signal('mm-lite');

  // Backend query
  private readonly resource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () => this.api.getAll(),
    defaultValue: { items: [] as FeatureFlagDto[] },
  });

  /** The rules in the database. */
  protected readonly flags = computed<FeatureFlagDto[]>(() => {
    if (this.resource.error()) return [];
    const val = this.resource.value();
    return (val as { items?: FeatureFlagDto[] } | undefined)?.items ?? [];
  });

  protected readonly loading = computed(() => this.resource.isLoading());
  protected readonly loadError = computed(() =>
    this.resource.error()
      ? readApiError(this.resource.error(), 'The feature flag rules could not be loaded.')
      : null,
  );

  // Metrics
  protected readonly metrics = computed(() => {
    const list = this.flags();
    const total = list.length;
    const active = list.filter((f) => f.enabled).length;
    const staged = list.filter((f) => !f.enabled && (f.rolloutPercent ?? 0) > 0).length;
    const overrides = list.filter((f) => !!f.tenantId).length;
    const globals = list.filter((f) => !f.tenantId).length;
    return { total, active, staged, overrides, globals };
  });

  // Filtered Grid rows
  protected readonly filteredFlags = computed<FeatureFlagDto[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const scope = this.scopeFilter();
    const feat = this.featureFilter();

    return this.flags().filter((f) => {
      // Feature filter
      if (feat !== 'all' && f.key !== feat) return false;

      // Scope & status filter
      if (scope === 'global' && !!f.tenantId) return false;
      if (scope === 'override' && !f.tenantId) return false;
      if (scope === 'active' && !f.enabled && (f.rolloutPercent ?? 0) <= 0) return false;
      if (
        scope === 'staged' &&
        (f.enabled || (f.rolloutPercent ?? 0) <= 0 || (f.rolloutPercent ?? 0) >= 100)
      ) {
        return false;
      }
      if (scope === 'disabled' && (f.enabled || (f.rolloutPercent ?? 0) > 0)) return false;

      // Search query
      if (q) {
        const kLabel = this.keyLabel(f.key).toLowerCase();
        const kVal = (f.key || '').toLowerCase();
        const tName = (f.tenantName || '').toLowerCase();
        const tId = (f.tenantId || '').toLowerCase();
        const note = (f.note || '').toLowerCase();
        if (
          !kLabel.includes(q) &&
          !kVal.includes(q) &&
          !tName.includes(q) &&
          !tId.includes(q) &&
          !note.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  });

  // Simulator resolution result
  protected readonly simulationResult = computed<EvaluationResult>(() => {
    return evaluateFeatureFlag(this.flags(), this.simTenantId(), this.simFeatureKey());
  });

  // Editor Modal / Page Form
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = signal({
    key: 'mm-lite',
    scopeType: 'global' as 'global' | 'override',
    tenantId: '',
    tenantName: '',
    strategy: 'on' as 'on' | 'staged' | 'off',
    rolloutPercent: 25,
    note: '',
  });

  protected readonly rulePreviewText = computed(() => {
    const f = this.form();
    const feat = this.featureDef(f.key)?.label || f.key;
    const scope =
      f.scopeType === 'override'
        ? `Workspace "${this.resolveTenantName(f.tenantId, f.tenantName) || f.tenantId || 'Specified Workspace'}"`
        : 'All Workspaces (Global default)';

    if (f.strategy === 'on') {
      return `Feature "${feat}" will be 100% ENABLED for ${scope}.`;
    }
    if (f.strategy === 'staged') {
      return `Feature "${feat}" will be rolled out to ${f.rolloutPercent}% of ${scope} using deterministic tenant hashing.`;
    }
    return `Feature "${feat}" will be completely DISABLED (0%) for ${scope}.`;
  });

  constructor() {
    if (this.mode === 'new') {
      this.openNew();
    } else if (this.mode === 'edit') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const item = this.flags().find((f: FeatureFlagDto) => f.id === id);
      if (item) this.openEdit(item);
      else this.openNew();
    }
  }

  async ngOnInit(): Promise<void> {
    if (this.admin) {
      try {
        const page = await firstValueFrom(
          this.admin.getTenants({ skipCount: 0, maxResultCount: 200 }),
        );
        const list = (page?.items ?? [])
          .filter((t) => t.id)
          .map((t) => ({ id: t.id!, name: t.name ?? t.id! }));
        this.tenants.set(list);
        if (!this.simTenantId() && list.length) this.simTenantId.set(list[0].id);
      } catch {
        // The workspace list only fills the pickers; a Workspace ID can still be typed in.
      }
    }
  }

  protected featureDef(key?: string | null): FeatureDef | undefined {
    return FEATURE_DEFINITIONS.find((k) => k.value === key);
  }

  protected keyLabel(key?: string): string {
    return this.featureDef(key)?.label ?? key ?? '';
  }

  protected resolveTenantName(id?: string | null, fallbackName?: string | null): string {
    if (!id) return '';
    const match = this.tenants().find((t) => t.id === id);
    if (match) return match.name;
    return fallbackName || id;
  }

  protected selectScopeWorkspace(tenantId: string): void {
    const t = this.tenants().find((item) => item.id === tenantId);
    this.form.update((curr) => ({
      ...curr,
      tenantId,
      tenantName: t ? t.name : curr.tenantName,
    }));
  }

  protected toggleSimulator(): void {
    this.simulatorOpen.update((open) => !open);
  }

  protected simulateFor(f: FeatureFlagDto): void {
    this.simulatorOpen.set(true);
    this.simFeatureKey.set(f.key || 'mm-lite');
    if (f.tenantId) {
      this.simTenantId.set(f.tenantId);
    }
  }

  protected async copyKey(key: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await navigator.clipboard.writeText(key);
      this.toast.info(`Copied key "${key}" to clipboard.`);
    } catch {
      this.toast.warning(`Could not copy "${key}".`);
    }
  }

  protected goNew(): void {
    if (this.router && this.isPage) {
      void this.router.navigate(['/platform/feature-flags/new']);
    } else {
      this.openNew();
    }
  }

  protected goEdit(f: FeatureFlagDto): void {
    if (this.router && this.isPage && f.id) {
      void this.router.navigate(['/platform/feature-flags', f.id, 'edit']);
    } else {
      this.openEdit(f);
    }
  }

  protected close(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/platform/feature-flags']);
    }
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.form.set({
      key: 'mm-lite',
      scopeType: 'global',
      tenantId: '',
      tenantName: '',
      strategy: 'on',
      rolloutPercent: 25,
      note: '',
    });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected openEdit(f: FeatureFlagDto): void {
    this.editingId.set(f.id ?? null);
    const isOverride = !!f.tenantId;
    let strategy: 'on' | 'staged' | 'off' = 'off';
    if (f.enabled) {
      strategy = 'on';
    } else if ((f.rolloutPercent ?? 0) > 0) {
      strategy = 'staged';
    }

    this.form.set({
      key: f.key ?? 'mm-lite',
      scopeType: isOverride ? 'override' : 'global',
      tenantId: f.tenantId ?? '',
      tenantName: f.tenantName ?? '',
      strategy,
      rolloutPercent: f.rolloutPercent && f.rolloutPercent > 0 ? f.rolloutPercent : 25,
      note: f.note ?? '',
    });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected patch<K extends keyof ReturnType<typeof this.form>>(
    key: K,
    value: ReturnType<typeof this.form>[K],
  ): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected async quickToggle(f: FeatureFlagDto, event?: Event): Promise<void> {
    event?.stopPropagation();
    const nextEnabled = !f.enabled;
    const nextRollout = nextEnabled ? 100 : 0;

    try {
      await firstValueFrom(
        this.api.set({
          key: f.key ?? 'mm-lite',
          tenantId: f.tenantId ?? null,
          enabled: nextEnabled,
          rolloutPercent: nextRollout,
          note: f.note ?? null,
        }),
      );
      this.toast.success(
        `Rule for ${this.keyLabel(f.key)} is now ${nextEnabled ? 'enabled (100%)' : 'disabled (0%)'}.`,
      );
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.toast.error(readApiError(e, 'The feature flag rule was not saved. Try again.'));
    }
  }

  protected async save(): Promise<void> {
    const f = this.form();
    this.busy.set(true);
    this.error.set(null);

    const isOverride = f.scopeType === 'override';
    const tenantId = isOverride ? f.tenantId.trim() || null : null;
    const enabled = f.strategy === 'on';
    const rolloutPercent =
      f.strategy === 'staged'
        ? Math.min(100, Math.max(1, Number(f.rolloutPercent) || 25))
        : enabled
          ? 100
          : 0;
    const note = f.note.trim() || null;

    if (isOverride && !tenantId) {
      this.error.set('Please select or enter a valid Workspace ID for the override rule.');
      this.busy.set(false);
      return;
    }

    const payload: SetFeatureFlagInput = {
      key: f.key,
      tenantId,
      enabled,
      rolloutPercent,
      note,
    };

    try {
      await firstValueFrom(this.api.set(payload));

      this.toast.success(
        this.editingId() ? 'Feature flag rule updated.' : 'New feature flag rule created.',
      );
      this.close();
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'Could not save the feature flag rule.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(f: FeatureFlagDto, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (
      !f.id ||
      !(await this.dialogs.delete(
        `this rule for ${this.keyLabel(f.key)}`,
        f.tenantName ? `Workspace: ${f.tenantName}` : 'Global default rule',
      ))
    )
      return;

    try {
      await firstValueFrom(this.api.delete(f.id));
      this.toast.success('Feature flag rule deleted.');
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.toast.error(readApiError(e, 'Could not delete the rule.'));
    }
  }

  protected state(f: FeatureFlagDto): string {
    if (f.enabled) return 'On for all (100%)';
    if ((f.rolloutPercent ?? 0) > 0) return `${f.rolloutPercent}% rollout`;
    return 'Switched off';
  }
}
