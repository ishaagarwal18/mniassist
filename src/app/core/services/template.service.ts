import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateUpdateTemplateDto,
  TemplateCategory as ApiCategory,
  TemplateComponentKind,
  TemplateDto,
  TemplateHeaderFormat,
  TemplateLintSeverity,
  TemplateQuality as ApiQuality,
  TemplateService as TemplateApi,
  TemplateStatus as ApiStatus,
} from '../../proxy/messaging';
import {
  DraftTemplate,
  LintItem,
  LintSeverity,
  Template,
  TemplateCategory,
  TemplateQuality,
  TemplateStatus,
} from '../models/template.model';
import { ChannelService } from './channel.service';

const STATUS: Record<ApiStatus, TemplateStatus> = {
  [ApiStatus.Draft]: 'draft',
  [ApiStatus.Pending]: 'pending',
  [ApiStatus.Approved]: 'approved',
  [ApiStatus.Rejected]: 'rejected',
  [ApiStatus.Paused]: 'paused',
  [ApiStatus.Disabled]: 'disabled',
};

const CATEGORY: Record<ApiCategory, TemplateCategory> = {
  [ApiCategory.Marketing]: 'marketing',
  [ApiCategory.Utility]: 'utility',
  [ApiCategory.Authentication]: 'authentication',
};

const CATEGORY_TO_API: Record<TemplateCategory, ApiCategory> = {
  marketing: ApiCategory.Marketing,
  utility: ApiCategory.Utility,
  authentication: ApiCategory.Authentication,
};

const QUALITY: Record<ApiQuality, TemplateQuality> = {
  [ApiQuality.Unknown]: 'unknown',
  [ApiQuality.High]: 'high',
  [ApiQuality.Medium]: 'medium',
  [ApiQuality.Low]: 'low',
};

const SEVERITY: Record<TemplateLintSeverity, LintSeverity> = {
  [TemplateLintSeverity.Info]: 'info',
  [TemplateLintSeverity.Warning]: 'warning',
  [TemplateLintSeverity.Error]: 'error',
};

function toTemplate(dto: TemplateDto): Template {
  const part = (k: TemplateComponentKind) =>
    dto.components?.find((c) => c.kind === k)?.text ?? undefined;
  return {
    id: dto.id!,
    name: dto.name ?? '',
    language: dto.languageCode ?? 'en',
    category: dto.category != null ? CATEGORY[dto.category] : CATEGORY[ApiCategory.Utility],
    effectiveCategory: dto.effectiveCategory != null ? CATEGORY[dto.effectiveCategory] : CATEGORY[ApiCategory.Utility],
    metaAssignedCategory:
      dto.metaAssignedCategory != null ? CATEGORY[dto.metaAssignedCategory] : undefined,
    status: dto.status != null ? STATUS[dto.status] : STATUS[ApiStatus.Draft],
    quality: dto.quality != null ? QUALITY[dto.quality] : QUALITY[ApiQuality.Unknown],
    rejectionReason: dto.rejectionReason ?? undefined,
    submittedAt: dto.submittedAtUtc ?? undefined,
    approvedAt: dto.approvedAtUtc ?? undefined,
    variableCount: dto.variableCount ?? 0,
    header: part(TemplateComponentKind.Header),
    body: part(TemplateComponentKind.Body) ?? '',
    footer: part(TemplateComponentKind.Footer),
  };
}

function toCreateDto(channelId: string, draft: DraftTemplate): CreateUpdateTemplateDto {
  const components: CreateUpdateTemplateDto['components'] = [];
  let order = 0;
  if (draft.header.trim()) {
    components.push({
      kind: TemplateComponentKind.Header,
      headerFormat: TemplateHeaderFormat.Text,
      text: draft.header.trim(),
      order: order++,
    });
  }
  components.push({
    kind: TemplateComponentKind.Body,
    headerFormat: TemplateHeaderFormat.None,
    text: draft.body,
    order: order++,
  });
  if (draft.footer.trim()) {
    components.push({
      kind: TemplateComponentKind.Footer,
      headerFormat: TemplateHeaderFormat.None,
      text: draft.footer.trim(),
      order: order++,
    });
  }
  return {
    channelId,
    name: draft.name.trim(),
    languageCode: draft.language.trim() || 'en',
    category: CATEGORY_TO_API[draft.category],
    components,
  };
}

/**
 * Template studio store. Mirrors the pattern used by the contacts and channel
 * stores: a seeded list runs the screen standalone, the same signals are fed by
 * the API once `useMockData` is off.
 */
@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly api = inject(TemplateApi);
  private readonly channels = inject(ChannelService);

  readonly filter = signal('');
  private readonly reloadTick = signal(0);

  private readonly seed: readonly Template[] = [
    {
      id: 't-1',
      name: 'amc_renewal_30d',
      language: 'en',
      category: 'utility',
      effectiveCategory: 'utility',
      status: 'approved',
      quality: 'high',
      variableCount: 4,
      header: 'AMC renewal due',
      body: 'Hello {{1}}, the annual maintenance contract on your {{2}} at {{3}} expires on {{4}}. Reply here and we will send the renewal quotation.',
      footer: 'You are receiving this because you hold an AMC with us.',
      approvedAt: '2026-07-14T00:00:00Z',
    },
    {
      id: 't-2',
      name: 'quotation_followup_d5',
      language: 'en',
      category: 'utility',
      effectiveCategory: 'marketing',
      metaAssignedCategory: 'marketing',
      status: 'approved',
      quality: 'medium',
      variableCount: 3,
      body: 'Hi {{1}}, following up on quotation {{2}} for {{3}}. Happy to revise it or walk you through the sizing — just reply here.',
      approvedAt: '2026-08-02T00:00:00Z',
    },
    {
      id: 't-3',
      name: 'vfd_retrofit_bulletin',
      language: 'en',
      category: 'marketing',
      effectiveCategory: 'marketing',
      status: 'pending',
      quality: 'unknown',
      variableCount: 1,
      body: 'Hello {{1}}, our August technical bulletin covers VFD retrofits on ageing DOL starters — typical payback under 14 months. Reply BULLETIN for the PDF.',
      submittedAt: '2026-08-24T00:00:00Z',
    },
    {
      id: 't-4',
      name: 'calibration_due_v1',
      language: 'en',
      category: 'utility',
      effectiveCategory: 'utility',
      status: 'rejected',
      quality: 'unknown',
      variableCount: 2,
      body: 'Hi {{1}}, calibration on {{2}} is due. Book now for 10% off!',
      rejectionReason: 'Promotional content ("10% off") is not permitted in a utility template.',
    },
  ];

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () =>
      this.api
        .getList({ channelId: this.channels.active()?.id, skipCount: 0, maxResultCount: 200 })
        .pipe(map((page) => (page.items ?? []).map(toTemplate))),
    defaultValue: [] as Template[],
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());

  readonly all = computed<readonly Template[]>(() =>
    environment.useMockData ? this.seed : this.resource.value(),
  );

  readonly templates = computed<readonly Template[]>(() => {
    const q = this.filter().trim().toLowerCase();
    const list = this.all();
    return q ? list.filter((t) => t.name.includes(q) || t.body.toLowerCase().includes(q)) : list;
  });

  readonly counts = computed(() => {
    const list = this.all();
    return {
      total: list.length,
      pending: list.filter((t) => t.status === 'pending').length,
      rejected: list.filter((t) => t.status === 'rejected').length,
      recategorised: list.filter((t) => !!t.metaAssignedCategory).length,
    };
  });

  reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async lint(draft: DraftTemplate): Promise<LintItem[]> {
    const channelId = this.channels.active()?.id ?? '';
    const result = await firstValueFrom(this.api.lint(toCreateDto(channelId, draft)));
    return (result.items ?? []).map((i) => ({
      severity: i.severity != null ? SEVERITY[i.severity] : SEVERITY[TemplateLintSeverity.Info],
      code: i.code ?? '',
      message: i.message ?? '',
    }));
  }

  async create(draft: DraftTemplate): Promise<Template> {
    const channelId = this.channels.active()?.id;
    if (!channelId) {
      throw new Error('Connect a channel before creating a template.');
    }
    const dto = await firstValueFrom(this.api.create(toCreateDto(channelId, draft)));
    this.reload();
    return toTemplate(dto);
  }

  async submit(id: string): Promise<void> {
    await firstValueFrom(this.api.submit(id));
    this.reload();
  }

  async syncFromMeta(): Promise<number> {
    const channelId = this.channels.active()?.id;
    if (!channelId) return 0;
    const changed = await firstValueFrom(this.api.syncFromMeta(channelId));
    this.reload();
    return changed;
  }
}
