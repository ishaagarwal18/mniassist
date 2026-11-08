import { Injectable, inject } from '@angular/core';
import type { PagedResultDto } from '@abp/ng.core';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AddServiceTicketCommentInput,
  AssignTicketInput,
  CreateServiceTicketInput,
  GetServiceTicketsInput,
  LinkTicketInput,
  RecordTicketSatisfactionInput,
  ServiceTicketCommentDto,
  ServiceTicketDetailDto,
  ServiceTicketDto,
  ServiceTicketService,
  ServiceTicketSettingsDto,
  ServiceTicketSummaryDto,
  SetServiceTicketSettingsInput,
  SetTicketPriorityInput,
  SetTicketStatusInput,
  TicketPriority,
  TicketSource,
  TicketStatus,
  UpdateServiceTicketDetailsInput,
} from '../../proxy/support';

let ticketCounter = 0;
let commentCounter = 0;
const newTicketId = () => `ticket-${Date.now().toString(36)}-${++ticketCounter}`;
const newCommentId = () => `comment-${Date.now().toString(36)}-${++commentCounter}`;

function refuse(code: string, message: string): Observable<never> {
  return throwError(() => ({ error: { error: { code: `AutoReach:${code}`, message } } }));
}

const DEFAULT_SLA_HOURS: Record<TicketPriority, number> = {
  [TicketPriority.Urgent]: 4,
  [TicketPriority.High]: 8,
  [TicketPriority.Normal]: 24,
  [TicketPriority.Low]: 72,
};

function dueAt(
  priority: TicketPriority,
  fromIso: string,
  hours: Record<TicketPriority, number>,
): string {
  return new Date(Date.parse(fromIso) + hours[priority] * 3_600_000).toISOString();
}

function recomputeOverdue(t: ServiceTicketDto): void {
  t.isOverdue =
    !!t.dueAtUtc &&
    Date.parse(t.dueAtUtc) < Date.now() &&
    (t.status === TicketStatus.Open || t.status === TicketStatus.Pending);
}

/** Tickets for sample-data mode, kept in memory for the life of the page. */
@Injectable({ providedIn: 'root' })
export class TicketMockStore {
  readonly tickets: ServiceTicketDto[] = [];
  readonly comments: ServiceTicketCommentDto[] = [];
  settings: ServiceTicketSettingsDto = {
    urgentHours: DEFAULT_SLA_HOURS[TicketPriority.Urgent],
    highHours: DEFAULT_SLA_HOURS[TicketPriority.High],
    normalHours: DEFAULT_SLA_HOURS[TicketPriority.Normal],
    lowHours: DEFAULT_SLA_HOURS[TicketPriority.Low],
    portalEnabled: false,
    portalUrl: null,
  };
  private reference = 1;

  hoursMap(): Record<TicketPriority, number> {
    return {
      [TicketPriority.Urgent]: this.settings.urgentHours,
      [TicketPriority.High]: this.settings.highHours,
      [TicketPriority.Normal]: this.settings.normalHours,
      [TicketPriority.Low]: this.settings.lowHours,
    };
  }

  constructor() {
    const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
    const t1 = this.make({
      contactName: 'Sandeep Rao',
      subject: 'Motor overheating on line 2',
      category: 'Motor',
      priority: TicketPriority.Urgent,
      status: TicketStatus.Open,
      creationTime: ago(2),
    });
    const t2 = this.make({
      contactName: 'Priya Nambiar',
      subject: 'PLC not responding to remote commands',
      category: 'PLC',
      priority: TicketPriority.High,
      status: TicketStatus.Pending,
      creationTime: ago(20),
      assignedUserId: 'mock-me',
      assignedUserName: 'You',
    });
    const t3 = this.make({
      contactName: 'Devendra Joshi',
      subject: 'Annual calibration due',
      category: 'Calibration',
      priority: TicketPriority.Low,
      status: TicketStatus.Resolved,
      creationTime: ago(96),
      resolvedAtUtc: ago(48),
      dueAtUtc: null,
    });
    this.tickets.push(t1, t2, t3);
    this.comments.push(
      this.makeComment(t2.id, {
        body: 'Checked the spares — a replacement module is in stock.',
        isInternal: true,
        authorName: 'You',
      }),
    );
  }

  make(p: Partial<ServiceTicketDto> & { contactName?: string }): ServiceTicketDto {
    const created = p.creationTime ?? new Date().toISOString();
    const priority = p.priority ?? TicketPriority.Normal;
    const status = p.status ?? TicketStatus.Open;
    const t: ServiceTicketDto = {
      id: newTicketId(),
      reference: `TKT-${new Date(created).getFullYear()}-${String(this.reference++).padStart(4, '0')}`,
      contactId: p.contactId ?? 'mock-contact',
      contactName: p.contactName ?? 'Customer',
      contactNumber: '919900112233',
      subject: 'Service issue',
      description: null,
      category: null,
      status,
      priority,
      source: TicketSource.Manual,
      enquiryId: null,
      enquiryReference: null,
      installedAssetId: null,
      conversationId: null,
      assignedUserId: null,
      assignedUserName: null,
      dueAtUtc:
        status === TicketStatus.Open || status === TicketStatus.Pending
          ? dueAt(priority, created, this.hoursMap())
          : null,
      isOverdue: false,
      firstRespondedAtUtc: null,
      resolvedAtUtc: null,
      closedAtUtc: null,
      reopenCount: 0,
      satisfactionRating: null,
      isBreakdown: false,
      breakdownReportedAtUtc: null,
      reportedByUnknownNumber: false,
      creationTime: created,
      ...p,
    };
    recomputeOverdue(t);
    return t;
  }

  makeComment(ticketId: string, p: Partial<ServiceTicketCommentDto>): ServiceTicketCommentDto {
    return {
      id: newCommentId(),
      ticketId,
      authorUserId: 'mock-me',
      authorName: 'You',
      isInternal: true,
      fromCustomer: false,
      body: '',
      creationTime: new Date().toISOString(),
      ...p,
    };
  }
}

/** The same tickets as {@link ServiceTicketService}, answered from memory. */
export class MockServiceTicketApi {
  constructor(private readonly s: TicketMockStore) {}

  create = (input: CreateServiceTicketInput): Observable<ServiceTicketDto> => {
    const t = this.s.make({
      contactId: input.contactId,
      contactName: 'Customer',
      subject: input.subject,
      description: input.description ?? null,
      category: input.category ?? null,
      priority: input.priority,
      enquiryId: input.enquiryId ?? null,
      installedAssetId: input.installedAssetId ?? null,
      conversationId: input.conversationId ?? null,
    });
    this.s.tickets.unshift(t);
    return of({ ...t });
  };

  get = (id: string): Observable<ServiceTicketDetailDto> => {
    const t = this.s.tickets.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That ticket no longer exists.');
    recomputeOverdue(t);
    const comments = this.s.comments
      .filter((c) => c.ticketId === id)
      .sort((a, b) => a.creationTime.localeCompare(b.creationTime));
    return of({ ...t, comments: comments.map((c) => ({ ...c })) });
  };

  getList = (input: GetServiceTicketsInput): Observable<PagedResultDto<ServiceTicketDto>> => {
    this.s.tickets.forEach(recomputeOverdue);
    const items = this.s.tickets
      .filter((t) => input.status == null || t.status === input.status)
      .filter((t) => input.priority == null || t.priority === input.priority)
      .filter((t) => !input.contactId || t.contactId === input.contactId)
      .filter((t) => !input.enquiryId || t.enquiryId === input.enquiryId)
      .filter((t) => !input.unassigned || !t.assignedUserId)
      .filter((t) => !input.mine || t.assignedUserId === 'mock-me')
      .filter((t) => !input.overdue || t.isOverdue)
      .filter(
        (t) =>
          !input.filter ||
          `${t.reference} ${t.subject}`.toLowerCase().includes(input.filter.toLowerCase()),
      )
      .sort((a, b) => b.creationTime.localeCompare(a.creationTime));
    const page = items.slice(
      input.skipCount ?? 0,
      (input.skipCount ?? 0) + (input.maxResultCount ?? 50),
    );
    return of({ items: page.map((t) => ({ ...t })), totalCount: items.length });
  };

  getSummary = (): Observable<ServiceTicketSummaryDto> => {
    this.s.tickets.forEach(recomputeOverdue);
    return of({
      openCount: this.s.tickets.filter((t) => t.status === TicketStatus.Open).length,
      pendingCount: this.s.tickets.filter((t) => t.status === TicketStatus.Pending).length,
      overdueCount: this.s.tickets.filter((t) => t.isOverdue).length,
      unassignedCount: this.s.tickets.filter((t) => !t.assignedUserId).length,
    });
  };

  updateDetails = (
    id: string,
    input: UpdateServiceTicketDetailsInput,
  ): Observable<ServiceTicketDto> => {
    const t = this.s.tickets.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That ticket no longer exists.');
    Object.assign(t, {
      subject: input.subject,
      description: input.description ?? null,
      category: input.category ?? null,
    });
    return of({ ...t });
  };

  setPriority = (id: string, input: SetTicketPriorityInput): Observable<ServiceTicketDto> => {
    const t = this.s.tickets.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That ticket no longer exists.');
    t.priority = input.priority;
    if (t.status === TicketStatus.Open || t.status === TicketStatus.Pending) {
      t.dueAtUtc = dueAt(input.priority, new Date().toISOString(), this.s.hoursMap());
    }
    recomputeOverdue(t);
    return of({ ...t });
  };

  setStatus = (id: string, input: SetTicketStatusInput): Observable<ServiceTicketDto> => {
    const t = this.s.tickets.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That ticket no longer exists.');
    const now = new Date().toISOString();
    const wasFinished = t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed;
    const nowOpenAgain =
      input.status === TicketStatus.Open || input.status === TicketStatus.Pending;

    if (wasFinished && nowOpenAgain) {
      t.reopenCount += 1;
      t.resolvedAtUtc = null;
      t.closedAtUtc = null;
      t.dueAtUtc = dueAt(t.priority, now, this.s.hoursMap());
    } else if (input.status === TicketStatus.Resolved) {
      t.resolvedAtUtc = now;
      t.dueAtUtc = null;
    } else if (input.status === TicketStatus.Closed) {
      t.closedAtUtc = t.closedAtUtc ?? now;
      t.dueAtUtc = null;
    }

    t.status = input.status;
    recomputeOverdue(t);
    return of({ ...t });
  };

  assign = (id: string, input: AssignTicketInput): Observable<ServiceTicketDto> => {
    const t = this.s.tickets.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That ticket no longer exists.');
    t.assignedUserId = input.userId ?? null;
    t.assignedUserName = input.userId ? 'You' : null;
    return of({ ...t });
  };

  link = (id: string, input: LinkTicketInput): Observable<ServiceTicketDto> => {
    const t = this.s.tickets.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That ticket no longer exists.');
    t.enquiryId = input.enquiryId ?? null;
    t.installedAssetId = input.installedAssetId ?? null;
    return of({ ...t });
  };

  addComment = (
    id: string,
    input: AddServiceTicketCommentInput,
  ): Observable<ServiceTicketCommentDto> => {
    const t = this.s.tickets.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That ticket no longer exists.');
    if (!input.isInternal) {
      if (!t.conversationId)
        return refuse(
          'TicketHasNoConversation',
          'This ticket has no conversation to reply through yet.',
        );
      t.firstRespondedAtUtc = t.firstRespondedAtUtc ?? new Date().toISOString();
      if (t.status === TicketStatus.Open) {
        t.status = TicketStatus.Pending;
        recomputeOverdue(t);
      }
    }
    const c = this.s.makeComment(id, {
      body: input.body,
      isInternal: input.isInternal,
      authorName: 'You',
    });
    this.s.comments.push(c);
    return of({ ...c });
  };

  recordSatisfaction = (
    id: string,
    input: RecordTicketSatisfactionInput,
  ): Observable<ServiceTicketDto> => {
    const t = this.s.tickets.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That ticket no longer exists.');
    if (input.rating < 1 || input.rating > 5)
      return refuse('TicketRatingInvalid', 'Satisfaction rating must be between 1 and 5.');
    t.satisfactionRating = input.rating;
    return of({ ...t });
  };

  getSettings = (): Observable<ServiceTicketSettingsDto> => of({ ...this.s.settings });

  setSettings = (input: SetServiceTicketSettingsInput): Observable<ServiceTicketSettingsDto> => {
    for (const [field, hours] of Object.entries({
      urgentHours: input.urgentHours,
      highHours: input.highHours,
      normalHours: input.normalHours,
      lowHours: input.lowHours,
    })) {
      if (hours < 1 || hours > 720)
        return refuse('TicketSlaHoursInvalid', `${field} must be between 1 and 720 hours.`);
    }

    // The portal's address, once given, stays put even while the portal is switched off — the same as the server's own behaviour.
    const portalUrl = input.portalEnabled
      ? (this.s.settings.portalUrl ?? 'https://mniassist.com/t/h.mocktkt01')
      : this.s.settings.portalUrl;

    this.s.settings = {
      urgentHours: input.urgentHours,
      highHours: input.highHours,
      normalHours: input.normalHours,
      lowHours: input.lowHours,
      portalEnabled: input.portalEnabled,
      portalUrl,
      signOffTemplateId: input.signOffTemplateId ?? null,
      breakdownTemplateId: input.breakdownTemplateId ?? null,
    };
    return of({ ...this.s.settings });
  };

  delete = (id: string): Observable<void> => {
    const idx = this.s.tickets.findIndex((t) => t.id === id);
    if (idx !== -1) this.s.tickets.splice(idx, 1);
    return of(void 0);
  };
}

export type ServiceTicketApi = Pick<
  ServiceTicketService,
  keyof MockServiceTicketApi & keyof ServiceTicketService
>;

/** Where tickets come from: the server, or memory on sample data. */
@Injectable({ providedIn: 'root' })
export class ServiceTicketGateway {
  readonly api: ServiceTicketApi = environment.useMockData
    ? (new MockServiceTicketApi(inject(TicketMockStore)) as unknown as ServiceTicketApi)
    : inject(ServiceTicketService);
}
