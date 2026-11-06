import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { ArGrid } from '../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { errorMessage } from '../activities/activity-logic';
import { PRIORITY_LABEL, STATUS_LABEL, dueLabel } from './ticket-logic';
import { ServiceTicketGateway } from './ticket-mock';
import { initialSearch } from '../../core/util/customer-scope';

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
  standalone: true,
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArSearchBox,
    ArStatTile,
    ArSelect,
    RouterLink,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './helpdesk.html',
  styleUrl: './helpdesk.scss',
})
export class ArHelpdesk {
  private readonly api = inject(ServiceTicketGateway).api;
  private readonly permissions = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly PRIORITY_LABEL = PRIORITY_LABEL;
  protected readonly STATUS_TONE = STATUS_TONE;
  protected readonly PRIORITY_TONE = PRIORITY_TONE;
  protected readonly Status = TicketStatus;
  protected readonly Priority = TicketPriority;

  protected readonly canSeeAll = grantedPolicy('AutoReach.Helpdesk.ViewAll', this.permissions);
  protected readonly canCreate = grantedPolicy('AutoReach.Helpdesk.Create', this.permissions);
  protected readonly canManageSettings = grantedPolicy(
    'AutoReach.Helpdesk.ManageSettings',
    this.permissions,
  );

  protected readonly scope = signal<'mine' | 'everyone'>('mine');
  protected readonly status = signal<TicketStatus | null>(null);
  protected readonly overdueOnly = signal(false);
  /** Starts from `?q=` (Customer 360 links here for one customer). */
  protected readonly filter = signal(initialSearch());

  protected readonly tickets = signal<ServiceTicketDto[]>([]);
  protected readonly summary = signal<ServiceTicketSummaryDto | null>(null);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly limit = signal(50);

  private readonly tick = signal(0);

  constructor() {
    const openId = this.route.snapshot.queryParamMap.get('open');
    if (openId) {
      void this.router.navigate(['/helpdesk', openId]);
    }

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

  protected statusTone(status: TicketStatus): ChipTone {
    return STATUS_TONE[status] ?? 'neutral';
  }

  protected statusLabel(status: TicketStatus): string {
    return STATUS_LABEL[status] ?? '';
  }

  protected priorityTone(priority: TicketPriority): ChipTone {
    return PRIORITY_TONE[priority] ?? 'neutral';
  }

  protected priorityLabel(priority: TicketPriority): string {
    return PRIORITY_LABEL[priority] ?? '';
  }

  protected more(): void {
    this.limit.update((n) => n + 50);
  }

  protected onRowSelected(e: any): void {
    const data = e?.data as ServiceTicketDto;
    if (data?.id) {
      void this.router.navigate(['/helpdesk', data.id]);
    }
  }
}
