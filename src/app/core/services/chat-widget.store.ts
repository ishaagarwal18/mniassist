import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import {
  ChatEntryPointAssetsDto,
  ChatEntryPointDto,
  ChatEntryPointService,
} from '../../proxy/marketing';
import { LeadSource } from '../../proxy/pipeline/lead-source.enum';
import { ChannelService } from './channel.service';
import { settled } from '../util/resource';

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
  [LeadSource.Spares]: 'Spares due',
  [LeadSource.OemNetwork]: 'OEM network',
  [LeadSource.ReorderPortal]: 'Re-order portal',
  [LeadSource.PublicCatalogue]: 'Public catalogue',
  [LeadSource.LeadAd]: 'Facebook / Instagram lead form',
  [LeadSource.VoiceAgent]: 'AI voice agent',
  [LeadSource.Obsolescence]: 'Obsolescence radar',
  [LeadSource.Project]: 'Project',
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

  private readonly resource = rxResource({
    params: () => ({ tick: this.reloadTick() }),
    stream: () =>
      this.api
        .getList({ skipCount: 0, maxResultCount: 200 })
        .pipe(map((page) => (page.items ?? []).map(toEntryPoint))),
    defaultValue: [] as ChatEntryPoint[],
  });

  readonly loading = computed(() => this.resource.isLoading());

  readonly entryPoints = computed<readonly ChatEntryPoint[]>(() => {
    return settled(this.resource, [] as ChatEntryPoint[]);
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
    await firstValueFrom(this.api.delete(id));
    this.reload();
  }

  async assets(id: string): Promise<ChatEntryPointAssets> {
    const dto = await firstValueFrom(this.api.getAssets(id));
    return normaliseAssets(dto);
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
