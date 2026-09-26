import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ChatEntryPointAssetsDto,
  ChatEntryPointDto,
  ChatEntryPointService,
} from '../../proxy/marketing';
import { LeadSource } from '../../proxy/pipeline/lead-source.enum';
import { ChannelService } from './channel.service';

export interface ChatEntryPoint {
  readonly id: string;
  readonly channelId: string;
  readonly name: string;
  readonly slug: string;
  readonly source: LeadSource;
  readonly prefilledMessage: string;
  readonly isActive: boolean;
  readonly clickCount: number;
  readonly lastClickAt?: string;
}

export interface ChatEntryPointAssets {
  readonly waLink: string;
  readonly prefilledText: string;
  readonly widgetSnippet: string;
  readonly qrSvg: string;
  readonly qrPngDataUri: string;
}

/** The sources that make sense for a hand-made link — CTWA and Import come from elsewhere. */
export const ENTRY_POINT_SOURCES: { value: LeadSource; label: string }[] = [
  { value: LeadSource.Website, label: 'Website' },
  { value: LeadSource.QrCode, label: 'QR code' },
  { value: LeadSource.Exhibition, label: 'Exhibition / stall' },
  { value: LeadSource.Referral, label: 'Referral' },
  { value: LeadSource.Dealer, label: 'Dealer' },
];

export const SOURCE_LABEL: Record<LeadSource, string> = {
  [LeadSource.Manual]: 'Manual',
  [LeadSource.Website]: 'Website',
  [LeadSource.ClickToWhatsApp]: 'Click-to-WhatsApp ad',
  [LeadSource.Exhibition]: 'Exhibition / stall',
  [LeadSource.QrCode]: 'QR code',
  [LeadSource.Referral]: 'Referral',
  [LeadSource.Import]: 'Import',
  [LeadSource.Dealer]: 'Dealer',
  [LeadSource.Renewal]: 'AMC renewal',
};

function toEntryPoint(dto: ChatEntryPointDto): ChatEntryPoint {
  return {
    id: dto.id!,
    channelId: dto.channelId ?? '',
    name: dto.name ?? '',
    slug: dto.slug ?? '',
    source: dto.source ?? LeadSource.Website,
    prefilledMessage: dto.prefilledMessage ?? '',
    isActive: dto.isActive ?? true,
    clickCount: dto.clickCount ?? 0,
    lastClickAt: dto.lastClickUtc ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class ChatWidgetStore {
  private readonly api = inject(ChatEntryPointService);
  private readonly channels = inject(ChannelService);

  private readonly reloadTick = signal(0);
  private seed: ChatEntryPoint[] = [
    {
      id: 'cep-1',
      channelId: 'ch-1',
      name: 'Website — contact page',
      slug: 'web7k2m',
      source: LeadSource.Website,
      prefilledMessage: 'Hi, I have a question about your drives.',
      isActive: true,
      clickCount: 42,
      lastClickAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    },
    {
      id: 'cep-2',
      channelId: 'ch-1',
      name: 'IMTEX 2026 — stall H-14',
      slug: 'imtx14b',
      source: LeadSource.Exhibition,
      prefilledMessage: 'Saw you at IMTEX — please send the retrofit datasheet.',
      isActive: true,
      clickCount: 118,
      lastClickAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    },
  ];

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () =>
      this.api
        .getList({ skipCount: 0, maxResultCount: 200 })
        .pipe(map((page) => (page.items ?? []).map(toEntryPoint))),
    defaultValue: [] as ChatEntryPoint[],
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());

  readonly entryPoints = computed<readonly ChatEntryPoint[]>(() => {
    if (environment.useMockData) {
      this.reloadTick();
      return this.seed;
    }
    return this.resource.value();
  });

  reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async create(input: {
    channelId: string;
    name: string;
    source: LeadSource;
    prefilledMessage: string;
    isActive: boolean;
  }): Promise<void> {
    if (environment.useMockData) {
      this.seed = [
        {
          id: `cep-${crypto.randomUUID().slice(0, 6)}`,
          channelId: input.channelId,
          name: input.name,
          slug: Math.random().toString(36).slice(2, 9),
          source: input.source,
          prefilledMessage: input.prefilledMessage,
          isActive: input.isActive,
          clickCount: 0,
        },
        ...this.seed,
      ];
      this.reloadTick.update((n) => n + 1);
      return;
    }
    await firstValueFrom(
      this.api.create({
        channelId: input.channelId,
        name: input.name,
        source: input.source,
        prefilledMessage: input.prefilledMessage,
        isActive: input.isActive,
      }),
    );
    this.reload();
  }

  async update(
    id: string,
    input: { name: string; source: LeadSource; prefilledMessage: string; isActive: boolean },
  ): Promise<void> {
    if (environment.useMockData) {
      this.seed = this.seed.map((e) => (e.id === id ? { ...e, ...input } : e));
      this.reloadTick.update((n) => n + 1);
      return;
    }
    const existing = this.entryPoints().find((e) => e.id === id);
    await firstValueFrom(
      this.api.update(id, {
        channelId: existing?.channelId ?? this.channels.active()?.id ?? '',
        name: input.name,
        source: input.source,
        prefilledMessage: input.prefilledMessage,
        isActive: input.isActive,
      }),
    );
    this.reload();
  }

  async remove(id: string): Promise<void> {
    if (environment.useMockData) {
      this.seed = this.seed.filter((e) => e.id !== id);
      this.reloadTick.update((n) => n + 1);
      return;
    }
    await firstValueFrom(this.api.delete(id));
    this.reload();
  }

  async assets(id: string): Promise<ChatEntryPointAssets> {
    if (environment.useMockData) {
      return this.mockAssets(this.seed.find((e) => e.id === id));
    }
    const dto = await firstValueFrom(this.api.getAssets(id));
    return normaliseAssets(dto);
  }

  private mockAssets(entry?: ChatEntryPoint): ChatEntryPointAssets {
    const phone =
      this.channels.channels().find((c) => c.id === entry?.channelId)?.displayPhone ??
      '+919021044000';
    const digits = phone.replace(/\D/g, '');
    const text = entry?.prefilledMessage
      ? `${entry.prefilledMessage}\n\n[${entry.slug}]`
      : `[${entry?.slug ?? 'preview'}]`;
    const waLink = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    return {
      waLink,
      prefilledText: text,
      widgetSnippet: mockWidget(waLink, entry?.name ?? 'Chat with us'),
      qrSvg: '',
      qrPngDataUri: '',
    };
  }
}

function normaliseAssets(dto: ChatEntryPointAssetsDto): ChatEntryPointAssets {
  return {
    waLink: dto.waLink ?? '',
    prefilledText: dto.prefilledText ?? '',
    widgetSnippet: dto.widgetSnippet ?? '',
    qrSvg: dto.qrSvg ?? '',
    qrPngDataUri: dto.qrPngDataUri ?? '',
  };
}

function mockWidget(waLink: string, label: string): string {
  return (
    '<!-- AutoReach WhatsApp button -->\n' +
    "<script>(function(){var a=document.createElement('a');" +
    `a.href='${waLink}';a.target='_blank';a.rel='noopener';` +
    `a.setAttribute('aria-label','${label.replace(/'/g, '')}');` +
    "a.style.cssText='position:fixed;right:20px;bottom:20px;z-index:2147483000;" +
    "width:56px;height:56px;border-radius:50%;background:#25D366;';" +
    'document.body.appendChild(a);})();</script>'
  );
}
