import { Injectable, inject } from '@angular/core';
import type { PagedResultDto } from '@abp/ng.core';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CallLogDto,
  CallOutcome,
  CallService,
  CallSetupDto,
  GetCallsInput,
  LogManualCallInput,
  SetCallOutcomeInput,
  StartCallInput,
  VoiceCallDirection,
  VoiceCallMode,
  VoiceCallStatus,
} from '../../proxy/voice';

let counter = 0;
const newId = () => `call-${Date.now().toString(36)}-${++counter}`;

function refuse(code: string, message: string): Observable<never> {
  return throwError(() => ({ error: { error: { code: `AutoReach:${code}`, message } } }));
}

/**
 * Calls for sample-data mode, kept in memory for the life of the page. There is no telephony: "starting" a call ringing and, a few seconds
 * later, answered, so the whole flow (dial, then say how it went) can be tried without an Exotel account.
 */
@Injectable({ providedIn: 'root' })
export class CallMockStore {
  readonly calls: CallLogDto[] = [];
  myNumber: string | null = '919812345678';

  constructor() {
    const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
    this.calls.push(
      this.make({
        contactName: 'Sandeep Rao',
        status: VoiceCallStatus.Completed,
        durationSeconds: 312,
        startedAtUtc: ago(3),
        outcome: CallOutcome.CallBackLater,
        notes: 'Wants the payback sheet before Friday.',
      }),
      this.make({
        contactName: 'Priya Nambiar',
        status: VoiceCallStatus.NoAnswer,
        durationSeconds: 0,
        startedAtUtc: ago(26),
      }),
      this.make({
        contactName: 'Devendra Joshi',
        status: VoiceCallStatus.Completed,
        durationSeconds: 95,
        startedAtUtc: ago(50),
      }),
    );
  }

  make(p: Partial<CallLogDto> & { contactName?: string }): CallLogDto {
    const started = p.startedAtUtc ?? new Date().toISOString();
    const ended = p.status !== undefined && p.status !== VoiceCallStatus.Ringing;
    return {
      id: newId(),
      contactId: p.contactId ?? 'mock-contact',
      contactName: p.contactName ?? 'Customer',
      contactNumber: '919900112233',
      mode: VoiceCallMode.ClickToCall,
      direction: VoiceCallDirection.Outbound,
      status: VoiceCallStatus.Ringing,
      suggestedOutcome: CallOutcome.None,
      outcome: CallOutcome.None,
      durationSeconds: 0,
      creationTime: started,
      startedAtUtc: started,
      repName: 'You',
      repUserId: 'mock-me',
      isOver: ended,
      endedAtUtc: ended
        ? new Date(Date.parse(started) + (p.durationSeconds ?? 0) * 1000).toISOString()
        : null,
      ...p,
    } as CallLogDto;
  }
}

/** The same calls as {@link CallService}, answered from memory. */
export class MockCallApi {
  constructor(private readonly s: CallMockStore) {}

  getSetup = (): Observable<CallSetupDto> => of({ channelReady: true, myNumber: this.s.myNumber });

  setMyNumber = (phoneNumber: string): Observable<CallSetupDto> => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10)
      return refuse('CallNumberInvalid', 'That does not look like a phone number.');
    this.s.myNumber = digits.length === 10 ? `91${digits}` : digits;
    return this.getSetup();
  };

  start = (input: StartCallInput): Observable<CallLogDto> => {
    if (!input.repNumber && !this.s.myNumber)
      return refuse(
        'CallNeedsRepNumber',
        'Add the phone number we should ring you on, then try again.',
      );
    if (input.repNumber && input.saveNumber) this.setMyNumber(input.repNumber);
    const call = this.s.make({ contactId: input.contactId, enquiryId: input.enquiryId ?? null });
    this.s.calls.unshift(call);
    // Answered shortly after, as a real one would report.
    setTimeout(() => {
      Object.assign(call, {
        status: VoiceCallStatus.Completed,
        durationSeconds: 74,
        isOver: true,
        endedAtUtc: new Date().toISOString(),
        suggestedOutcome: CallOutcome.Connected,
      });
    }, 5000);
    return of({ ...call });
  };

  logManual = (input: LogManualCallInput): Observable<CallLogDto> => {
    if (Date.parse(input.startedAtUtc) > Date.now() + 5 * 60_000)
      return refuse('CallStartedInFuture', 'A call cannot have started in the future.');
    const call = this.s.make({
      contactId: input.contactId,
      enquiryId: input.enquiryId ?? null,
      mode: VoiceCallMode.Manual,
      direction: input.direction,
      status: VoiceCallStatus.Completed,
      durationSeconds: input.durationSeconds,
      startedAtUtc: input.startedAtUtc,
      outcome: input.outcome,
      notes: input.notes ?? null,
      outcomeRecordedAtUtc: new Date().toISOString(),
    });
    this.s.calls.unshift(call);
    return of({ ...call });
  };

  setOutcome = (id: string, input: SetCallOutcomeInput): Observable<CallLogDto> => {
    const call = this.s.calls.find((c) => c.id === id);
    if (!call) return refuse('NotFound', 'That call no longer exists.');
    Object.assign(call, {
      outcome: input.outcome,
      notes: input.notes?.trim() || null,
      suggestedOutcome: CallOutcome.None,
      outcomeRecordedAtUtc: new Date().toISOString(),
      enquiryId: input.enquiryId ?? call.enquiryId,
    });
    return of({ ...call });
  };

  getList = (input: GetCallsInput): Observable<PagedResultDto<CallLogDto>> => {
    const items = this.s.calls
      .filter((c) => !input.contactId || c.contactId === input.contactId)
      .filter((c) => !input.enquiryId || c.enquiryId === input.enquiryId)
      .filter((c) => input.status == null || c.status === input.status)
      .filter(
        (c) =>
          !input.needsOutcome ||
          (c.isOver && c.outcome === CallOutcome.None && c.mode !== VoiceCallMode.Ivr),
      )
      .sort((a, b) =>
        (b.startedAtUtc ?? b.creationTime).localeCompare(a.startedAtUtc ?? a.creationTime),
      );
    const page = items.slice(
      input.skipCount ?? 0,
      (input.skipCount ?? 0) + (input.maxResultCount ?? 50),
    );
    return of({ items: page.map((c) => ({ ...c })), totalCount: items.length });
  };

  get = (id: string): Observable<CallLogDto> => {
    const call = this.s.calls.find((c) => c.id === id);
    return call ? of({ ...call }) : refuse('NotFound', 'That call no longer exists.');
  };

  /** Sample data has no AI phone calls. */
  getAiConversation = (_id: string): Observable<null> => of(null);
}

export type CallApi = Pick<CallService, keyof MockCallApi & keyof CallService>;

/** Where calls come from: the server, or memory on sample data. One code path for every page and dialog that shows or starts a call. */
@Injectable({ providedIn: 'root' })
export class CallGateway {
  readonly api: CallApi = environment.useMockData
    ? (new MockCallApi(inject(CallMockStore)) as unknown as CallApi)
    : inject(CallService);
}
