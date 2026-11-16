import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map, of } from 'rxjs';
import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../auth/permission';
import { ChannelHealthDto, ChannelService as ChannelApi } from '../../proxy/channels';
import { Channel, TIER_LIMIT } from '../models/channel.model';
import { toChannel } from '../api/mapping';
import { settled } from '../util/resource';

/**
 * Channel store. The computed views below are what the UI binds to; where the
 * data comes from is this service's problem and nobody else's.
 *
 * The signals are fed by the API, and `marketingHeadroom` is the server's number
 * rather than a local guess, which matters because the tier limit is scoped to the
 * whole business portfolio and this browser cannot see the sibling numbers.
 */
@Injectable({ providedIn: 'root' })
export class ChannelService {
  private readonly api = inject(ChannelApi);
  /** Health needs Channels.ViewHealth. Without it the list still loads, with no health figures. */
  readonly canViewHealth = grantedPolicy(
    'AutoReach.Channels.ViewHealth',
    inject(PermissionService),
  );

  private readonly channelsResource = rxResource({
    params: () => ({ health: this.canViewHealth() }),
    stream: ({ params }) =>
      forkJoin({
        list: this.api.getList({ skipCount: 0, maxResultCount: 50 }),
        health: params.health ? this.api.getAllHealth() : of({ items: [] as ChannelHealthDto[] }),
      }).pipe(
        map(({ list, health }) => {
          const byId = new Map(health.items?.map((h) => [h.channelId!, h] as const) ?? []);

          return {
            channels: (list.items ?? []).map((dto) => toChannel(dto, byId.get(dto.id!))),
            health: byId,
          };
        }),
      ),
    defaultValue: { channels: [] as Channel[], health: new Map<string, ChannelHealthDto>() },
  });

  private readonly _activeId = signal<string | null>(null);

  readonly channels = computed<readonly Channel[]>(
    () =>
      settled(this.channelsResource, {
        channels: [] as Channel[],
        health: new Map<string, ChannelHealthDto>(),
      }).channels,
  );

  readonly loading = computed(() => this.channelsResource.isLoading());
  readonly error = computed(() => this.channelsResource.error());

  readonly active = computed<Channel | undefined>(() => {
    const all = this.channels();
    const id = this._activeId();
    return all.find((c) => c.id === id) ?? all[0];
  });

  /** Share of the tier limit held back for utility and service traffic. Server-owned
   *  once live — the API is the only place that knows what the tenant configured. */
  readonly reservedFraction = signal(0.2);

  private readonly activeHealth = computed<ChannelHealthDto | undefined>(() => {
    const active = this.active();
    return active
      ? settled(this.channelsResource, {
          channels: [] as Channel[],
          health: new Map<string, ChannelHealthDto>(),
        }).health.get(active.id)
      : undefined;
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
