import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ArTopbar } from '../../layout/topbar';
import { CrmTaskDto, CrmTaskStatus, CrmTaskSummaryDto, TaskPriority } from '../../proxy/activities';
import { ArButton, ArIcon, ArSearchBox } from '../../ui';
import { ActivityDirectory } from './activity-directory';
import { ActivityGateway } from './activity-gateway';
import {
  BUCKET_LABEL,
  DueBucket,
  dueBucket,
  dueLabel,
  errorMessage,
  groupTasks,
  utcOffsetMinutes,
} from './activity-logic';
import { ArActivityShareDialog } from './activity-share-dialog';
import { ArTaskDialog } from './task-dialog';
import { recurrenceLabel } from './recurrence';
import { initialSearch } from '../../core/util/customer-scope';

/**
 * Tasks: what has to be done, grouped by when. Your own by default; those allowed can look across the team. Ticking a task
 * completes it (and puts it on its deal's timeline); ticking it again puts it back.
 */
@Component({
  selector: 'ar-tasks',
  imports: [ArTopbar, ArButton, ArIcon, ArSearchBox, ArTaskDialog, ArActivityShareDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
})
export class ArTasks {
  private readonly api = inject(ActivityGateway).tasks;
  protected readonly directory = inject(ActivityDirectory);

  protected readonly Status = CrmTaskStatus;
  protected readonly High = TaskPriority.High;

  protected readonly scope = signal<'mine' | 'everyone'>('mine');
  protected readonly showDone = signal(false);
  /** Starts from `?q=` (Customer 360 links here for one customer). */
  protected readonly filter = signal(initialSearch());

  protected readonly tasks = signal<CrmTaskDto[]>([]);
  protected readonly summary = signal<CrmTaskSummaryDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);

  protected readonly quickTitle = signal('');
  protected readonly editing = signal<CrmTaskDto | null>(null);
  protected readonly creating = signal(false);
  /** The task being shared with colleagues. */
  protected readonly sharing = signal<CrmTaskDto | null>(null);

  private readonly tick = signal(0);
  /** Groups are worked out against this, refreshed with each load, so "today" is right whenever the list was read. */
  protected readonly now = signal(new Date());

  /** Selected summary card bucket filter ('all' = no bucket filter). */
  protected readonly selectedBucket = signal<DueBucket | 'all'>('all');

  protected readonly groups = computed(() => {
    const all = groupTasks(this.tasks(), this.now());
    const sel = this.selectedBucket();
    if (sel === 'all') return all;
    return all.filter((g) => g.bucket === sel);
  });
  protected readonly total = computed(() => this.tasks().length);

  protected readonly selectedBucketLabel = computed(() => {
    const sel = this.selectedBucket();
    return sel === 'all' ? '' : BUCKET_LABEL[sel] ?? sel;
  });

  protected toggleBucketFilter(bucket: DueBucket): void {
    if (bucket === 'done') {
      if (this.selectedBucket() === 'done') {
        this.selectedBucket.set('all');
      } else {
        this.showDone.set(true);
        this.selectedBucket.set('done');
      }
    } else {
      this.selectedBucket.update((curr) => (curr === bucket ? 'all' : bucket));
    }
  }

  protected clearAllFilters(): void {
    this.filter.set('');
    this.selectedBucket.set('all');
  }

  constructor() {
    void this.directory.load();

    effect(() => {
      // Reload when the scope, the filter or the done toggle changes, or after a change.
      this.scope();
      this.showDone();
      this.filter();
      this.tick();
      untracked(() => void this.load());
    });
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await firstValueFrom(
        this.api.getList({
          mine: this.scope() === 'mine',
          status: this.showDone() ? undefined : CrmTaskStatus.Open,
          filter: this.filter().trim() || null,
          maxResultCount: 200,
        }),
      );
      this.tasks.set(page.items ?? []);
      this.now.set(new Date());
      this.summary.set(await firstValueFrom(this.api.getSummary(utcOffsetMinutes())));
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'Tasks could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected reload(): void {
    this.tick.update((n) => n + 1);
  }

  protected dueText(t: CrmTaskDto): string {
    return t.status === CrmTaskStatus.Done
      ? 'Done'
      : t.status === CrmTaskStatus.Cancelled
        ? 'Cancelled'
        : dueLabel(t.dueAtUtc, this.now(), t.status);
  }

  protected repeatText(t: CrmTaskDto): string {
    return recurrenceLabel(t.recurrence);
  }

  protected isOverdue(t: CrmTaskDto): boolean {
    return dueBucket(t, this.now()) === 'overdue';
  }

  protected isDueToday(t: CrmTaskDto): boolean {
    return dueBucket(t, this.now()) === 'today';
  }

  protected isMine(t: CrmTaskDto): boolean {
    return t.assigneeUserId === this.directory.meId;
  }

  protected async toggle(t: CrmTaskDto): Promise<void> {
    this.busy.set(t.id!);
    this.error.set(null);
    try {
      await firstValueFrom(
        t.status === CrmTaskStatus.Open ? this.api.complete(t.id!) : this.api.reopen(t.id!),
      );
      this.reload();
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The task could not be changed.'));
    } finally {
      this.busy.set(null);
    }
  }

  /** A title and Enter: a task for yourself, no date. The dialog is for anything more. */
  protected async quickAdd(): Promise<void> {
    const title = this.quickTitle().trim();
    if (!title) return;
    this.error.set(null);
    try {
      await firstValueFrom(this.api.create({ title }));
      this.quickTitle.set('');
      this.reload();
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The task could not be added.'));
    }
  }

  protected closeDialog(changed: boolean): void {
    this.editing.set(null);
    this.creating.set(false);
    if (changed) this.reload();
  }
}
