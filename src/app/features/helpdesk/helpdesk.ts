import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  ServiceTicketDto,
  ServiceTicketSummaryDto,
  TicketPriority,
  TicketStatus,
} from '../../proxy/support';
import { ArButton, ArChip, ArDialog, ArSearchBox, ArStatTile } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ChipTone } from '../../ui/chip';
import { errorMessage } from '../activities/activity-logic';
import { ArTicketDetailDialog } from './ticket-detail-dialog';
import { PRIORITY_LABEL, STATUS_LABEL, dueLabel } from './ticket-logic';
import { ArTicketSettingsDialog } from './ticket-settings-dialog';
import { ServiceTicketGateway } from './ticket-mock';
import { ArContactPicker } from '../pipeline/contact-picker';
import { PickerOption } from '../../core/services/pipeline.service';

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
    ArDialog,
    ArSearchBox,
    ArStatTile,
    ArTicketDetailDialog,
    ArTicketSettingsDialog,
    ArContactPicker,
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
  protected readonly canCreate = grantedPolicy('AutoReach.Helpdesk.Create', this.permissions);
  protected readonly canManageSettings = grantedPolicy(
    'AutoReach.Helpdesk.ManageSettings',
    this.permissions,
  );

  protected readonly createOpen = signal(false);
  protected readonly createContact = signal<PickerOption | null>(null);
  protected readonly createSubject = signal('');
  protected readonly createDescription = signal('');
  protected readonly createPriority = signal<TicketPriority>(TicketPriority.Normal);
  protected readonly creatingTicket = signal(false);

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
  /** The ticket whose detail is open; ?open=<id> (from Customer 360) opens one on arrival. */
  protected readonly opened = signal<string | null>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('open'),
  );
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

  protected openCreate(): void {
    this.createContact.set(null);
    this.createSubject.set('');
    this.createDescription.set('');
    this.createPriority.set(TicketPriority.Normal);
    this.error.set(null);
    this.createOpen.set(true);
  }

  protected async createTicket(): Promise<void> {
    const contact = this.createContact();
    if (!contact) {
      this.error.set('Please select a contact.');
      return;
    }
    if (!this.createSubject().trim()) {
      this.error.set('Subject is required.');
      return;
    }
    this.creatingTicket.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.create({
          contactId: contact.id,
          subject: this.createSubject().trim(),
          description: this.createDescription().trim() || undefined,
          priority: this.createPriority(),
        }),
      );
      this.createOpen.set(false);
      this.reload();
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'Could not create ticket.'));
    } finally {
      this.creatingTicket.set(false);
    }
  }
}
