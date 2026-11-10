import type { HostTemplateLibraryDto, SubmitDraftsResultDto } from '../../proxy/messaging/models';
import { ChannelService as ChannelApi } from '../../proxy/channels/channel.service';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import {
  CreateUpdateTemplateDto,
  DraftedTemplateDto,
  TemplateCategory as ApiCategory,
  TemplateComponentKind,
  TemplateDraftTone,
  TemplateDto,
  TemplateHeaderFormat,
  TemplateLintSeverity,
  TemplateQuality as ApiQuality,
  TemplateService as TemplateApi,
  TemplateStatus as ApiStatus,
} from '../../proxy/messaging';
import {
  DraftButton,
  DraftTemplate,
  LintItem,
  LintSeverity,
  Template,
  TemplateButtonKind,
  TemplateButtonView,
  TemplateCategory,
  TemplateHeaderKind,
  TemplateQuality,
  TemplateStatus,
} from '../models/template.model';
import { ChannelService } from './channel.service';
import { settled } from '../util/resource';

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

const HEADER_KIND: Record<TemplateHeaderFormat, TemplateHeaderKind> = {
  [TemplateHeaderFormat.None]: 'none',
  [TemplateHeaderFormat.Text]: 'text',
  [TemplateHeaderFormat.Image]: 'image',
  [TemplateHeaderFormat.Video]: 'video',
  [TemplateHeaderFormat.Document]: 'document',
  [TemplateHeaderFormat.Location]: 'none',
};

const HEADER_KIND_TO_API: Record<TemplateHeaderKind, TemplateHeaderFormat> = {
  none: TemplateHeaderFormat.None,
  text: TemplateHeaderFormat.Text,
  image: TemplateHeaderFormat.Image,
  video: TemplateHeaderFormat.Video,
  document: TemplateHeaderFormat.Document,
};

/** Meta's on-the-wire button `type` ↔ our string kind. */
const BUTTON_KIND: Record<string, TemplateButtonKind> = {
  QUICK_REPLY: 'quick_reply',
  URL: 'url',
  PHONE_NUMBER: 'phone',
};

function parseButtons(json: string | null | undefined): TemplateButtonView[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json) as Array<Record<string, string>>;
    if (!Array.isArray(raw)) return [];
    return raw.map((b) => ({
      kind: BUTTON_KIND[b['type']] ?? 'quick_reply',
      text: b['text'] ?? '',
      url: b['url'] ?? undefined,
      phone: b['phone_number'] ?? undefined,
    }));
  } catch {
    return [];
  }
}

function buildButtonsJson(buttons: readonly DraftButton[]): string {
  return JSON.stringify(
    buttons
      .filter((b) => b.text.trim())
      .map((b) => {
        if (b.kind === 'url') {
          return { type: 'URL', text: b.text.trim(), url: b.url.trim() || 'https://example.com' };
        }
        if (b.kind === 'phone') {
          return { type: 'PHONE_NUMBER', text: b.text.trim(), phone_number: b.phone.trim() };
        }
        return { type: 'QUICK_REPLY', text: b.text.trim() };
      }),
  );
}

function toTemplate(dto: TemplateDto): Template {
  const component = (k: TemplateComponentKind) => dto.components?.find((c) => c.kind === k);
  const part = (k: TemplateComponentKind) => component(k)?.text ?? undefined;
  const headerComponent = component(TemplateComponentKind.Header);
  return {
    id: dto.id!,
    name: dto.name ?? '',
    language: dto.languageCode ?? 'en',
    category: dto.category != null ? CATEGORY[dto.category] : CATEGORY[ApiCategory.Utility],
    effectiveCategory:
      dto.effectiveCategory != null
        ? CATEGORY[dto.effectiveCategory]
        : CATEGORY[ApiCategory.Utility],
    metaAssignedCategory:
      dto.metaAssignedCategory != null ? CATEGORY[dto.metaAssignedCategory] : undefined,
    status: dto.status != null ? STATUS[dto.status] : STATUS[ApiStatus.Draft],
    quality: dto.quality != null ? QUALITY[dto.quality] : QUALITY[ApiQuality.Unknown],
    rejectionReason: dto.rejectionReason ?? undefined,
    submittedAt: dto.submittedAtUtc ?? undefined,
    approvedAt: dto.approvedAtUtc ?? undefined,
    variableCount: dto.variableCount ?? 0,
    headerKind:
      headerComponent?.headerFormat != null ? HEADER_KIND[headerComponent.headerFormat] : 'none',
    header: part(TemplateComponentKind.Header),
    body: part(TemplateComponentKind.Body) ?? '',
    footer: part(TemplateComponentKind.Footer),
    buttons: parseButtons(component(TemplateComponentKind.Buttons)?.buttonsJson),
  };
}

/** A blank draft the composer opens on. */
export function emptyDraft(): DraftTemplate {
  return {
    name: '',
    language: 'en',
    category: 'utility',
    headerKind: 'none',
    header: '',
    body: '',
    footer: '',
    buttons: [],
    samples: {},
  };
}

/** Loads an existing template back into an editable draft. */
export function draftFromTemplate(t: Template): DraftTemplate {
  return {
    id: t.id,
    name: t.name,
    language: t.language,
    category: t.category,
    headerKind: t.headerKind,
    header: t.header ?? '',
    body: t.body,
    footer: t.footer ?? '',
    buttons: t.buttons.map((b) => ({
      kind: b.kind,
      text: b.text,
      url: b.url ?? '',
      phone: b.phone ?? '',
    })),
    samples: {},
  };
}

function toCreateDto(channelId: string, draft: DraftTemplate): CreateUpdateTemplateDto {
  const components: CreateUpdateTemplateDto['components'] = [];
  let order = 0;
  if (draft.headerKind === 'text' && draft.header.trim()) {
    components.push({
      kind: TemplateComponentKind.Header,
      headerFormat: TemplateHeaderFormat.Text,
      text: draft.header.trim(),
      order: order++,
    });
  } else if (draft.headerKind !== 'none' && draft.headerKind !== 'text') {
    components.push({
      kind: TemplateComponentKind.Header,
      headerFormat: HEADER_KIND_TO_API[draft.headerKind],
      text: null,
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
  const withText = draft.buttons.filter((b) => b.text.trim());
  if (withText.length > 0) {
    components.push({
      kind: TemplateComponentKind.Buttons,
      headerFormat: TemplateHeaderFormat.None,
      text: null,
      buttonsJson: buildButtonsJson(withText),
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

export { TemplateDraftTone };

/**
 * Template studio store. Mirrors the pattern used by the contacts and channel
 * stores: the signals are fed by the API.
 */
@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly api = inject(TemplateApi);
  private readonly channels = inject(ChannelService);
  private readonly channelApi = inject(ChannelApi);

  readonly filter = signal('');
  private readonly reloadTick = signal(0);

  private readonly resource = rxResource({
    params: () =>
      !this.channels.active()?.id
        ? undefined
        : { tick: this.reloadTick(), channelId: this.channels.active()!.id },
    stream: ({ params }) =>
      this.api
        .getList({ channelId: params.channelId, skipCount: 0, maxResultCount: 200 })
        .pipe(map((page) => (page.items ?? []).map(toTemplate))),
    defaultValue: [] as Template[],
  });

  readonly loading = computed(() => this.resource.isLoading());

  readonly all = computed<readonly Template[]>(() => {
    return settled(this.resource, [] as Template[]);
  });

  readonly templates = computed<readonly Template[]>(() => {
    const q = this.filter().trim().toLowerCase();
    const list = this.all();
    return q ? list.filter((t) => t.name.includes(q) || t.body.toLowerCase().includes(q)) : list;
  });

  /** Template name → the language codes it exists in (M04-9). */
  readonly languageGroups = computed<Map<string, string[]>>(() => {
    const map = new Map<string, string[]>();
    for (const t of this.all()) {
      const langs = map.get(t.name) ?? [];
      if (!langs.includes(t.language)) langs.push(t.language);
      map.set(t.name, langs);
    }
    return map;
  });

  readonly counts = computed(() => {
    const list = this.all();
    return {
      total: list.length,
      draft: list.filter((t) => t.status === 'draft').length,
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

  /** Loads one template for the composer's edit route. */
  async load(id: string): Promise<Template> {
    return toTemplate(await firstValueFrom(this.api.get(id)));
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

  async update(draft: DraftTemplate): Promise<Template> {
    if (!draft.id) throw new Error('This template has no id — create it first.');

    const channelId = this.channels.active()?.id;
    if (!channelId) {
      throw new Error('Connect a channel before saving a template.');
    }
    const dto = await firstValueFrom(this.api.update(draft.id, toCreateDto(channelId, draft)));
    this.reload();
    return toTemplate(dto);
  }

  async submit(id: string): Promise<void> {
    await firstValueFrom(this.api.submit(id));
    this.reload();
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    this.reload();
  }

  /** AI-assisted body drafting for the composer (M04-10). */
  async draftWithAi(
    goal: string,
    category: TemplateCategory,
    tone: TemplateDraftTone,
  ): Promise<DraftedTemplateDto> {
    return firstValueFrom(
      this.api.draft({
        goal: goal.trim(),
        category: CATEGORY_TO_API[category],
        tone,
        languageCode: 'en',
      }),
    );
  }

  /** Adds the industrial-library templates missing from this number (such as quotation_ready) as drafts. */
  async addLibraryTemplates(): Promise<number> {
    const channelId = this.channels.active()?.id;
    if (!channelId) return 0;
    const added = await firstValueFrom(this.channelApi.addLibraryTemplates(channelId));
    this.reload();
    return added;
  }

  async hostLibrary(
    filter: string,
    skipCount: number,
  ): Promise<{ items: HostTemplateLibraryDto[]; totalCount: number }> {
    const page = await firstValueFrom(
      this.api.getHostLibrary({ filter, skipCount, maxResultCount: 12 }),
    );
    return { items: page.items ?? [], totalCount: page.totalCount ?? 0 };
  }

  async copyHostTemplate(id: string, channelId: string): Promise<void> {
    await firstValueFrom(this.api.copyHost(id, channelId));
    this.reload();
  }

  /** Sends every draft on the active number to Meta for review (one call; the server goes through them in turn). */
  async submitDrafts(): Promise<SubmitDraftsResultDto> {
    const channelId = this.channels.active()?.id;
    if (!channelId) return { submitted: 0, failed: [] };

    try {
      return await firstValueFrom(this.api.submitDrafts(channelId));
    } finally {
      this.reload();
    }
  }

  async syncFromMeta(): Promise<number> {
    const channelId = this.channels.active()?.id;
    if (!channelId) return 0;
    const changed = await firstValueFrom(this.api.syncFromMeta(channelId));
    this.reload();
    return changed;
  }
}
