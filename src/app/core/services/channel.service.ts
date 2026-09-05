import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChannelHealthDto, ChannelService as ChannelApi } from '../../proxy/channels';
import { Channel, TIER_LIMIT } from '../models/channel.model';
import { toChannel } from '../api/mapping';

/**
 * Channel store. The computed views below are what the UI binds to; where the
 * data comes from is this service's problem and nobody else's.
 *
 * `environment.useMockData` decides. When it is true the seed below runs the app
 * standalone — the design is reviewable without a database. When false the same
 * signals are fed by the API, and `marketingHeadroom` becomes the server's number
 * rather than a local guess, which matters because the tier limit is scoped to the
 * whole business portfolio and this browser cannot see the sibling numbers.
 */
@Injectable({ providedIn: 'root' })
export class ChannelService {
  private readonly api = inject(ChannelApi);

  private readonly seed: readonly Channel[] = [
    {
      id: 'ch-1',
      wabaId: '1094427xxxxx8813',
      phoneNumberId: '1174403xxxxx221',
      displayPhone: '+91 90210 44xxx',
      displayName: 'Vertex Automation',
      nameStatus: 'pending',
      quality: 'green',
      tier: 'tier2',
      used24h: 3_400,
      throughput: 80,
      restricted: false,
    },
  ];

  /** Returning undefined keeps the resource idle, so no request is made in mock mode. */
  private readonly channelsResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () =>
      forkJoin({
        list: this.api.getList({ skipCount: 0, maxResultCount: 50 }),
        health: this.api.getAllHealth(),
      }).pipe(
        map(({ list, health }) => {
          const byId = new Map(health.items?.map(h => [h.channelId!, h] as const) ?? []);

          return {
            channels: (list.items ?? []).map(dto => toChannel(dto, byId.get(dto.id!))),
            health: byId,
          };
        }),
      ),
    defaultValue: { channels: [] as Channel[], health: new Map<string, ChannelHealthDto>() },
  });

  private readonly _activeId = signal<string | null>(null);

  readonly channels = computed<readonly Channel[]>(() =>
    environment.useMockData ? this.seed : this.channelsResource.value().channels,
  );

  readonly loading = computed(() => !environment.useMockData && this.channelsResource.isLoading());
  readonly error = computed(() => this.channelsResource.error());

  readonly active = computed<Channel | undefined>(() => {
    const all = this.channels();
    const id = this._activeId();
    return all.find(c => c.id === id) ?? all[0];
  });

  /** Share of the tier limit held back for utility and service traffic. Server-owned
   *  once live — the API is the only place that knows what the tenant configured. */
  readonly reservedFraction = signal(0.2);

  private readonly activeHealth = computed<ChannelHealthDto | undefined>(() => {
    const active = this.active();
    return active ? this.channelsResource.value().health.get(active.id) : undefined;
  });

  /**
   * Headroom left in the rolling 24-hour window, with the slice reserved for
   * utility and service traffic already taken out. A marketing campaign must never
   * be able to starve an AMC reminder.
   */
  readonly marketingHeadroom = computed(() => {
    const health = this.activeHealth();
    if (health) {
      return health.marketingAvailable ?? Number.POSITIVE_INFINITY;
    }

    const channel = this.active();
    if (!channel) return 0;

    const limit = TIER_LIMIT[channel.tier];
    if (limit === null) return Number.POSITIVE_INFINITY;

    return Math.max(0, Math.round(limit * (1 - this.reservedFraction())) - channel.used24h);
  });

  readonly canSend = computed(() => {
    const health = this.activeHealth();
    if (health) return health.canSend && this.marketingHeadroom() > 0;

    const channel = this.active();
    return !!channel && !channel.restricted && this.marketingHeadroom() > 0;
  });

  /** Why the channel cannot send, when it cannot. Null when it can. */
  readonly blockedReason = computed(() => this.activeHealth()?.blockedReason ?? null);

  select(id: string): void {
    this._activeId.set(id);
  }

  reload(): void {
    this.channelsResource.reload();
  }
}
