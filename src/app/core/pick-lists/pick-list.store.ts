import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import {
  PickListDto,
  PickListKind,
  PickListService,
  SavePickListInput,
} from '../../proxy/pick-lists';
import { CurrentUserService } from '../services/current-user.service';
import { setOptionNames } from './option-names';

/** One option as a picker shows it. */
export interface PickOption {
  readonly value: string;
  readonly label: string;
}

const CACHE_PREFIX = 'ar.pickLists.';

/**
 * The app's drop-down lists, from the database (Settings → Pick lists): the shared defaults with this workspace's changes. Loaded
 * once per sign-in. The last copy is kept in this browser so pickers fill at once and the field app works offline; it is the
 * database's own data, replaced as soon as the server answers.
 */
@Injectable({ providedIn: 'root' })
export class PickListStore {
  private readonly api = inject(PickListService);
  private readonly user = inject(CurrentUserService);
  private readonly tick = signal(0);

  /** Whose lists these are: the workspace, or the platform. */
  private readonly scope = computed(() => {
    if (!this.user.isAuthenticated()) return null;
    return this.user.tenantName() || 'host';
  });

  private readonly resource = rxResource({
    params: () => {
      const scope = this.scope();
      return scope ? { scope, tick: this.tick() } : undefined;
    },
    stream: () => this.api.getList().pipe(map((r) => r.items ?? [])),
    defaultValue: [] as PickListDto[],
  });

  /** Every list, hidden options included; the cached copy until the server answers. */
  readonly lists = computed<readonly PickListDto[]>(() => {
    const scope = this.scope();
    if (!scope) return [];
    const loaded = this.resource.error() ? [] : this.resource.value();
    return loaded.length ? loaded : readCache(scope);
  });

  readonly loading = computed(() => this.resource.isLoading());
  readonly failed = computed(() => this.resource.error() != null);

  private readonly byKey = computed(() => new Map(this.lists().map((l) => [l.key, l])));

  constructor() {
    effect(() => {
      const scope = this.scope();
      const loaded = this.resource.error() ? [] : this.resource.value();
      if (scope && loaded.length) writeCache(scope, loaded);
    });
    effect(() => {
      setOptionNames(
        new Map(
          this.lists()
            .filter((l) => l.kind === PickListKind.OptionNames)
            .map((l) => [l.key, new Map(l.items.map((i) => [i.value, i.label]))]),
        ),
      );
    });
  }

  /** One list, or undefined before the lists arrive. */
  list(key: string): PickListDto | undefined {
    return this.byKey().get(key);
  }

  /** The options a picker offers: shown ones, in order. Empty until the lists arrive. */
  options(key: string): readonly PickOption[] {
    return (this.byKey().get(key)?.items ?? [])
      .filter((i) => i.isActive)
      .map((i) => ({ value: i.value, label: i.label }));
  }

  /** The options of a text list as plain strings (its values are its names). */
  texts(key: string): readonly string[] {
    return this.options(key).map((o) => o.value);
  }

  /** The options of a number list as numbers. */
  numbers(key: string): readonly number[] {
    return this.options(key)
      .map((o) => Number(o.value))
      .filter((n) => Number.isFinite(n));
  }

  /** What an option is called; the value itself when the list does not have it. */
  label(key: string, value: string | number | null | undefined): string {
    if (value == null || value === '') return '';
    const v = String(value);
    return (
      this.byKey()
        .get(key)
        ?.items.find((i) => i.value === v)?.label ?? v
    );
  }

  async save(key: string, input: SavePickListInput): Promise<PickListDto> {
    const saved = await firstValueFrom(this.api.save(key, input));
    this.replace(saved);
    return saved;
  }

  async reset(key: string): Promise<PickListDto> {
    const saved = await firstValueFrom(this.api.reset(key));
    this.replace(saved);
    return saved;
  }

  reload(): void {
    this.tick.update((n) => n + 1);
  }

  private replace(list: PickListDto): void {
    this.resource.update((all) => (all ?? []).map((l) => (l.key === list.key ? list : l)));
  }
}

function readCache(scope: string): PickListDto[] {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + scope);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? (parsed as PickListDto[]) : [];
  } catch {
    return [];
  }
}

function writeCache(scope: string, lists: readonly PickListDto[]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + scope, JSON.stringify(lists));
  } catch {
    /* storage full or blocked: the next visit loads from the server */
  }
}
