import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { WorkspaceStore } from '../../core/services/workspace.store';
import {
  LeadRotationDto,
  LeadRotationMode,
  LeadRotationService,
  LeadSource,
} from '../../proxy/pipeline';
import { ArButton, ArChip } from '../../ui';
import { ArSelect } from '../../ui/select';

interface Row {
  userId: string;
  paused: boolean;
  weight: number;
  /** Empty means no limit. */
  cap: string;
}

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: LeadSource.Manual, label: 'Entered manually' },
  { value: LeadSource.Website, label: 'Website' },
  { value: LeadSource.ClickToWhatsApp, label: 'Click-to-WhatsApp ad' },
  { value: LeadSource.Exhibition, label: 'Exhibition' },
  { value: LeadSource.QrCode, label: 'QR code' },
  { value: LeadSource.Referral, label: 'Referral' },
  { value: LeadSource.Import, label: 'Import' },
  { value: LeadSource.Dealer, label: 'Dealer' },
];

/**
 * Lead rotation for one pipeline: new enquiries are shared out to a team in turn, or to whoever has the
 * fewest open deals. A person can be paused (leave, full plate) without losing their place. An owner
 * chosen by hand is never overridden.
 */
@Component({
  selector: 'ar-lead-rotation-panel',
  imports: [ArButton, ArChip, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lead-rotation-panel.html',
  styleUrl: './lead-rotation-panel.scss',
})
export class ArLeadRotationPanel {
  private readonly api = inject(LeadRotationService);
  private readonly members = inject(WorkspaceStore).members;

  readonly pipelineId = input.required<string>();

  protected readonly Mode = LeadRotationMode;
  protected readonly sources = SOURCES;

  protected readonly loaded = signal(false);
  protected readonly enabled = signal(false);
  protected readonly mode = signal<LeadRotationMode>(LeadRotationMode.RoundRobin);
  protected readonly assignContact = signal(true);
  protected readonly emailAssignee = signal(false);
  protected readonly chosenSources = signal<ReadonlySet<LeadSource>>(new Set());
  protected readonly rows = signal<Row[]>([]);
  protected readonly nextUserId = signal<string | null>(null);
  /** Open-lead count per user; a user with none has no entry. */
  protected readonly load = signal<Partial<Record<string, number>>>({});
  protected readonly atCap = signal<ReadonlySet<string>>(new Set());
  protected readonly dirty = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** People who can be added: active workspace members not already in the rotation. */
  protected readonly addable = computed(() => {
    const taken = new Set(this.rows().map((r) => r.userId));
    return this.members().filter((m) => m.isActive && !taken.has(m.userId));
  });

  constructor() {
    effect(() => {
      const id = this.pipelineId();
      this.loaded.set(false);
      void this.fetch(id);
    });
  }

  protected name(userId: string): string {
    const m = this.members().find((x) => x.userId === userId);
    return m ? m.name || m.userName : 'Removed user';
  }

  protected isActive(userId: string): boolean {
    return this.members().find((x) => x.userId === userId)?.isActive ?? false;
  }

  protected touch(): void {
    this.dirty.set(true);
  }

  protected setSource(s: LeadSource, on: boolean): void {
    this.chosenSources.update((set) => {
      const next = new Set(set);
      if (on) next.add(s);
      else next.delete(s);
      return next;
    });
    this.touch();
  }

  protected add(userId: string): void {
    if (!userId) return;
    this.rows.update((r) => [...r, { userId, paused: false, weight: 1, cap: '' }]);
    this.touch();
  }

  protected remove(i: number): void {
    this.rows.update((r) => r.filter((_, at) => at !== i));
    this.touch();
  }

  protected move(i: number, by: -1 | 1): void {
    this.rows.update((r) => {
      const next = [...r];
      const j = i + by;
      if (j < 0 || j >= next.length) return r;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    this.touch();
  }

  protected setWeight(i: number, value: string): void {
    const n = Math.min(10, Math.max(1, Math.round(Number(value)) || 1));
    this.rows.update((r) => r.map((row, at) => (at === i ? { ...row, weight: n } : row)));
    this.touch();
  }

  protected setCap(i: number, value: string): void {
    const digits = value.replace(/[^\d]/g, '');
    this.rows.update((r) => r.map((row, at) => (at === i ? { ...row, cap: digits } : row)));
    this.touch();
  }

  protected togglePause(i: number): void {
    this.rows.update((r) => r.map((row, at) => (at === i ? { ...row, paused: !row.paused } : row)));
    this.touch();
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const dto = await firstValueFrom(
        this.api.save(this.pipelineId(), {
          isEnabled: this.enabled(),
          mode: this.mode(),
          sources: [...this.chosenSources()],
          assignContact: this.assignContact(),
          emailAssignee: this.emailAssignee(),
          members: this.rows().map((r) => ({
            userId: r.userId,
            isPaused: r.paused,
            weight: r.weight,
            maxOpenDeals: r.cap ? Math.min(1000, Math.max(1, Number(r.cap))) : null,
          })),
        }),
      );
      this.apply(dto);
    } catch (e: unknown) {
      const err = e as { error?: { error?: { message?: string } }; message?: string };
      this.error.set(
        err?.error?.error?.message ?? err?.message ?? 'The rotation could not be saved.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  private async fetch(id: string): Promise<void> {
    if (environment.useMockData) {
      this.loaded.set(true);
      return;
    }
    try {
      this.apply(await firstValueFrom(this.api.get(id)));
    } catch {
      this.error.set('Could not load the rotation.');
    }
  }

  private apply(dto: LeadRotationDto): void {
    this.enabled.set(!!dto.isEnabled);
    this.mode.set(dto.mode ?? LeadRotationMode.RoundRobin);
    this.assignContact.set(dto.assignContact ?? true);
    this.emailAssignee.set(dto.emailAssignee ?? false);
    this.chosenSources.set(new Set(dto.sources ?? []));
    this.rows.set(
      (dto.members ?? []).map((m) => ({
        userId: m.userId!,
        paused: !!m.isPaused,
        weight: m.weight ?? 1,
        cap: m.maxOpenDeals ? String(m.maxOpenDeals) : '',
      })),
    );
    this.atCap.set(new Set((dto.members ?? []).filter((m) => m.atCap).map((m) => m.userId!)));
    this.nextUserId.set(dto.nextUserId ?? null);
    this.load.set(
      Object.fromEntries((dto.members ?? []).map((m) => [m.userId!, m.openDeals ?? 0])),
    );
    this.dirty.set(false);
    this.loaded.set(true);
  }
}
