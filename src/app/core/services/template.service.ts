import type { HostTemplateLibraryDto, SubmitDraftsResultDto } from '../../proxy/messaging/models';
import { ChannelService as ChannelApi } from '../../proxy/channels/channel.service';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
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

/** A small subset of the server lint, run in the browser for the mock-data build so
 *  the composer's "Check" button does something useful offline. */
function localLint(draft: DraftTemplate): LintItem[] {
  const items: LintItem[] = [];
  const push = (severity: LintSeverity, code: string, message: string) =>
    items.push({ severity, code, message });

  if (!/^[a-z0-9_]+$/.test(draft.name.trim())) {
    push('error', 'name', 'The name may only contain lowercase letters, digits and underscores.');
  }
  if (!draft.body.trim()) {
    push('error', 'body', 'The body cannot be empty.');
  }
  if (draft.body.length > 1024) {
    push(
      'error',
      'body-length',
      `The body is ${draft.body.length} characters; Meta's limit is 1024.`,
    );
  }

  const nums = (draft.body.match(/\{\{\s*(\d+)\s*\}\}/g) ?? []).map((m) => +m.replace(/\D/g, ''));
  const distinct = [...new Set(nums)].sort((a, b) => a - b);
  distinct.forEach((n, i) => {
    if (n !== i + 1) {
      push(
        'error',
        'vars',
        `Variables must be numbered {{1}}, {{2}}, … in order — found {{${n}}}.`,
      );
    }
  });
  if (/\{\{\s*\d+\s*\}\}[.,!?]?\s*$/.test(draft.body.trim())) {
    push(
      'warning',
      'var-trailing',
      'A message that ends on a variable is a common rejection reason.',
    );
  }

  if (
    draft.category === 'utility' &&
    /\b(off|discount|sale|free|offer|% off)\b/i.test(draft.body)
  ) {
    push(
      'warning',
      'promo',
      'This reads as promotional — Meta will likely re-categorise it as marketing (billed higher).',
    );
  }

  const quick = draft.buttons.filter((b) => b.kind === 'quick_reply' && b.text.trim()).length;
  if (quick > 3) {
    push('error', 'buttons-quick', `At most 3 quick-reply buttons are allowed; this has ${quick}.`);
  }
  draft.buttons.forEach((b) => {
    if (b.text.trim().length > 25) {
      push('error', 'button-label', `Button label "${b.text}" is over Meta's 25-character limit.`);
    }
    if (b.kind === 'url' && !/^https?:\/\//.test(b.url.trim())) {
      push(
        'error',
        'button-url',
        `The URL button "${b.text || '(unnamed)'}" needs a full http(s) URL.`,
      );
    }
    if (b.kind === 'phone' && !/^\+\d{6,}$/.test(b.phone.trim())) {
      push(
        'error',
        'button-phone',
        `The call button "${b.text || '(unnamed)'}" needs a phone number in +country format.`,
      );
    }
  });

  return items;
}

export { TemplateDraftTone };

/** Mock-mode mirror of the server's heuristic draft (M04-10). */
function localDraft(
  goal: string,
  category: TemplateCategory,
  tone: TemplateDraftTone,
): DraftedTemplateDto {
  const g = goal.trim();
  const sentence = g
    ? g[0].toUpperCase() + g.slice(1) + (/[.!?]$/.test(g) ? '' : '.')
    : 'We have an update for you.';

  if (category === 'authentication') {
    return {
      providerName: 'AutoReach assistant (built-in)',
      bodyVariants: [
        '{{1}} is your verification code. For your security, do not share this code with anyone.',
        'Your one-time code is {{1}}. It expires in 10 minutes. Do not share it.',
      ],
      suggestedButtonLabels: [],
    };
  }

  const ctaByTone: Record<TemplateDraftTone, string> = {
    [TemplateDraftTone.Friendly]: 'Let us know if you have any questions.',
    [TemplateDraftTone.Formal]: 'Please reply to this message if you require any clarification.',
    [TemplateDraftTone.Concise]: 'Reply to proceed.',
    [TemplateDraftTone.Persuasive]: "Reply YES to confirm and we'll take it from here.",
  };
  const greetByTone: Record<TemplateDraftTone, string> = {
    [TemplateDraftTone.Friendly]: 'Hi {{1}},\n\n',
    [TemplateDraftTone.Formal]: 'Dear {{1}},\n\n',
    [TemplateDraftTone.Concise]: '',
    [TemplateDraftTone.Persuasive]: 'Hi {{1}},\n\n',
  };
  const order = [
    tone,
    ...[
      TemplateDraftTone.Friendly,
      TemplateDraftTone.Formal,
      TemplateDraftTone.Concise,
      TemplateDraftTone.Persuasive,
    ].filter((t) => t !== tone),
  ];
  const optOut = category === 'marketing' ? '\n\nReply STOP to opt out.' : '';
  const bodyVariants = order
    .slice(0, 3)
    .map((t) => `${greetByTone[t]}${sentence}\n\n${ctaByTone[t]}${optOut}`.trim());

  const lg = g.toLowerCase();
  let suggestedButtonLabels = ['Yes, tell me more', 'Not now'];
  if (/quot|price|order/.test(lg)) suggestedButtonLabels = ['View quotation', 'Talk to sales'];
  else if (/appointment|visit|demo|book/.test(lg))
    suggestedButtonLabels = ['Confirm', 'Reschedule'];
  else if (/service|amc|maintenance|warranty/.test(lg))
    suggestedButtonLabels = ['Book service', 'Call me back'];

  return { providerName: 'AutoReach assistant (built-in)', bodyVariants, suggestedButtonLabels };
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
  private readonly channelApi = inject(ChannelApi);

  readonly filter = signal('');
  private readonly reloadTick = signal(0);
  private readonly seedTick = signal(0);

  private seedList: Template[] = [
    {
      id: 't-1',
      name: 'amc_renewal_30d',
      language: 'en',
      category: 'utility',
      effectiveCategory: 'utility',
      status: 'approved',
      quality: 'high',
      variableCount: 4,
      headerKind: 'text',
      header: 'AMC renewal due',
      body: 'Hello {{1}}, the annual maintenance contract on your {{2}} at {{3}} expires on {{4}}. Reply here and we will send the renewal quotation.',
      footer: 'You are receiving this because you hold an AMC with us.',
      buttons: [
        { kind: 'quick_reply', text: 'Send AMC options' },
        { kind: 'phone', text: 'Call service desk', phone: '+912040001234' },
      ],
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
      headerKind: 'none',
      body: 'Hi {{1}}, following up on quotation {{2}} for {{3}}. Happy to revise it or walk you through the sizing — just reply here.',
      buttons: [],
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
      headerKind: 'document',
      body: 'Hello {{1}}, our August technical bulletin covers VFD retrofits on ageing DOL starters — typical payback under 14 months.',
      buttons: [{ kind: 'url', text: 'Read the bulletin', url: 'https://example.com/bulletin' }],
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
      headerKind: 'none',
      body: 'Hi {{1}}, calibration on {{2}} is due. Book now for 10% off!',
      buttons: [],
      rejectionReason: 'Promotional content ("10% off") is not permitted in a utility template.',
    },
  ];

  private readonly resource = rxResource({
    params: () =>
      environment.useMockData || !this.channels.active()?.id
        ? undefined
        : { tick: this.reloadTick(), channelId: this.channels.active()!.id },
    stream: ({ params }) =>
      this.api
        .getList({ channelId: params.channelId, skipCount: 0, maxResultCount: 200 })
        .pipe(map((page) => (page.items ?? []).map(toTemplate))),
    defaultValue: [] as Template[],
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());

  readonly all = computed<readonly Template[]>(() => {
    if (environment.useMockData) {
      this.seedTick();
      return this.seedList;
    }
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
    if (environment.useMockData) {
      return localLint(draft);
    }
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
    if (environment.useMockData) {
      this.seedTick();
      const found = this.seedList.find((t) => t.id === id);
      if (!found) throw new Error('Template not found.');
      return found;
    }
    return toTemplate(await firstValueFrom(this.api.get(id)));
  }

  private mockDraftToTemplate(draft: DraftTemplate, id: string): Template {
    const vars = new Set(
      [draft.header, draft.body, draft.footer]
        .join(' ')
        .match(/\{\{\s*(\d+)\s*\}\}/g)
        ?.map((m) => m.replace(/\D/g, '')) ?? [],
    );
    return {
      id,
      name: draft.name.trim(),
      language: draft.language.trim() || 'en',
      category: draft.category,
      effectiveCategory: draft.category,
      status: 'draft',
      quality: 'unknown',
      variableCount: vars.size,
      headerKind: draft.headerKind,
      header: draft.headerKind === 'text' ? draft.header.trim() || undefined : undefined,
      body: draft.body,
      footer: draft.footer.trim() || undefined,
      buttons: draft.buttons
        .filter((b) => b.text.trim())
        .map((b) => ({
          kind: b.kind,
          text: b.text.trim(),
          url: b.kind === 'url' ? b.url.trim() : undefined,
          phone: b.kind === 'phone' ? b.phone.trim() : undefined,
        })),
    };
  }

  async create(draft: DraftTemplate): Promise<Template> {
    if (environment.useMockData) {
      const t = this.mockDraftToTemplate(draft, `t-${crypto.randomUUID().slice(0, 8)}`);
      this.seedList = [t, ...this.seedList];
      this.seedTick.update((n) => n + 1);
      return t;
    }
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
    if (environment.useMockData) {
      const t = this.mockDraftToTemplate(draft, draft.id);
      this.seedList = this.seedList.map((x) => (x.id === draft.id ? t : x));
      this.seedTick.update((n) => n + 1);
      return t;
    }
    const channelId = this.channels.active()?.id;
    if (!channelId) {
      throw new Error('Connect a channel before saving a template.');
    }
    const dto = await firstValueFrom(this.api.update(draft.id, toCreateDto(channelId, draft)));
    this.reload();
    return toTemplate(dto);
  }

  async submit(id: string): Promise<void> {
    if (environment.useMockData) {
      this.seedList = this.seedList.map((t) =>
        t.id === id ? { ...t, status: 'pending', submittedAt: new Date().toISOString() } : t,
      );
      this.seedTick.update((n) => n + 1);
      return;
    }
    await firstValueFrom(this.api.submit(id));
    this.reload();
  }

  async delete(id: string): Promise<void> {
    if (environment.useMockData) {
      this.seedList = this.seedList.filter((t) => t.id !== id);
      this.seedTick.update((n) => n + 1);
      return;
    }
    await firstValueFrom(this.api.delete(id));
    this.reload();
  }

  /** AI-assisted body drafting for the composer (M04-10). */
  async draftWithAi(
    goal: string,
    category: TemplateCategory,
    tone: TemplateDraftTone,
  ): Promise<DraftedTemplateDto> {
    if (environment.useMockData) {
      return localDraft(goal, category, tone);
    }
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
    if (!channelId || environment.useMockData) return 0;
    const added = await firstValueFrom(this.channelApi.addLibraryTemplates(channelId));
    this.reload();
    return added;
  }

  async hostLibrary(
    filter: string,
    skipCount: number,
  ): Promise<{ items: HostTemplateLibraryDto[]; totalCount: number }> {
    if (environment.useMockData) return { items: [], totalCount: 0 };
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
    if (environment.useMockData) {
      const drafts = this.seedList.filter((t) => t.status === 'draft').length;
      this.seedList = this.seedList.map((t) =>
        t.status === 'draft'
          ? { ...t, status: 'pending', submittedAt: new Date().toISOString() }
          : t,
      );
      this.seedTick.update((n) => n + 1);
      return { submitted: drafts, failed: [] };
    }
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
