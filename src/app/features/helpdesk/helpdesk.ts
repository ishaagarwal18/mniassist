import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  ServiceTicketDto,
  ServiceTicketSummaryDto,
  TicketPriority,
  TicketStatus,
} from '../../proxy/support';
import { ArButton, ArChip, ArSearchBox, ArStatTile } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ChipTone } from '../../ui/chip';
import { errorMessage } from '../activities/activity-logic';
import { ArTicketDetailDialog } from './ticket-detail-dialog';
import { PRIORITY_LABEL, STATUS_LABEL, dueLabel } from './ticket-logic';
import { ArTicketSettingsDialog } from './ticket-settings-dialog';
import { ServiceTicketGateway } from './ticket-mock';

const STATUS_TONE: Record<TicketStatus, ChipTone> = {
  [TicketStatus.Open]: 'amber',
  [TicketStatus.Pending]: 'teal',
  [TicketStatus.Resolved]: 'good',
  [TicketStatus.Closed]: 'neutral',
};

const PRIORITY_TONE: Record<TicketPriority, ChipTone> = {
  [TicketPriority.Urgent]: 'bad',
  [TicketPriority.High]: 'warn',
  [TicketPriority.Normal]: 'neutral',
  [TicketPriority.Low]: 'neutral',
};

/** The helpdesk queue: every service ticket, with the counts that say how it stands. A ticket is raised from the deal or
 *  contact it is about — this page works the queue, it does not start one from nothing. */
@Component({
  selector: 'ar-helpdesk',
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArSearchBox,
    ArStatTile,
    ArTicketDetailDialog,
    ArTicketSettingsDialog,
    ArSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './helpdesk.html',
  styleUrl: './helpdesk.scss',
})
export class ArHelpdesk {
  private readonly api = inject(ServiceTicketGateway).api;
  private readonly permissions = inject(PermissionService);

  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly PRIORITY_LABEL = PRIORITY_LABEL;
  protected readonly STATUS_TONE = STATUS_TONE;
  protected readonly PRIORITY_TONE = PRIORITY_TONE;
  protected readonly Status = TicketStatus;
  protected readonly Priority = TicketPriority;

  protected readonly canSeeAll = grantedPolicy('AutoReach.Helpdesk.ViewAll', this.permissions);
  protected readonly canManageSettings = grantedPolicy(
    'AutoReach.Helpdesk.ManageSettings',
    this.permissions,
  );

  protected readonly scope = signal<'mine' | 'everyone'>('mine');
  protected readonly status = signal<TicketStatus | null>(null);
  protected readonly overdueOnly = signal(false);
  protected readonly filter = signal('');

  protected readonly tickets = signal<ServiceTicketDto[]>([]);
  protected readonly summary = signal<ServiceTicketSummaryDto | null>(null);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly limit = signal(50);
  protected readonly opened = signal<string | null>(null);
  protected readonly settingsOpen = signal(false);

  private readonly tick = signal(0);

  constructor() {
    effect(() => {
      this.scope();
      this.status();
      this.overdueOnly();
      this.filter();
      this.limit();
      this.tick();
      untracked(() => void this.load());
    });
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const page = await firstValueFrom(
        this.api.getList({
          mine: this.scope() === 'mine',
          status: this.status(),
          overdue: this.overdueOnly(),
          filter: this.filter().trim() || null,
          maxResultCount: this.limit(),
        }),
      );
      this.tickets.set(page.items ?? []);
      this.total.set(page.totalCount ?? 0);
      this.summary.set(await firstValueFrom(this.api.getSummary()));
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The helpdesk queue could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected reload(): void {
    this.tick.update((n) => n + 1);
  }

  protected due(t: ServiceTicketDto): string | null {
    return dueLabel(t, new Date());
  }

  protected more(): void {
    this.limit.update((n) => n + 50);
  }

  protected closeDetail(changed: boolean): void {
    this.opened.set(null);
    if (changed) this.reload();
  }

  protected closeSettings(changed: boolean): void {
    this.settingsOpen.set(false);
    if (changed) this.reload();
  }
}
