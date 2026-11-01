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
import { ArButton, ArChip, ArIcon, ArSearchBox } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { ActivityDirectory } from './activity-directory';
import { ActivityGateway } from './activity-mock';
import {
  DueBucket,
  dueBucket,
  dueLabel,
  errorMessage,
  groupTasks,
  utcOffsetMinutes,
} from './activity-logic';
import { ArTaskDialog } from './task-dialog';
import { recurrenceLabel } from './recurrence';

/**
 * Tasks: what has to be done, grouped by when. Your own by default; those allowed can look across the team. Ticking a task
 * completes it (and puts it on its deal's timeline); ticking it again puts it back.
 */
@Component({
  selector: 'ar-tasks',
  imports: [ArTopbar, ArButton, ArChip, ArIcon, ArSearchBox, ArTaskDialog],
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
  protected readonly filter = signal('');

  protected readonly tasks = signal<CrmTaskDto[]>([]);
  protected readonly summary = signal<CrmTaskSummaryDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);

  protected readonly quickTitle = signal('');
  protected readonly editing = signal<CrmTaskDto | null>(null);
  protected readonly creating = signal(false);

  private readonly tick = signal(0);
  /** Groups are worked out against this, refreshed with each load, so "today" is right whenever the list was read. */
  protected readonly now = signal(new Date());

  protected readonly groups = computed(() => groupTasks(this.tasks(), this.now()));
  protected readonly total = computed(() => this.tasks().length);

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

  protected bucketTone(b: DueBucket): ChipTone {
    return b === 'overdue' ? 'bad' : b === 'today' ? 'amber' : 'neutral';
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
