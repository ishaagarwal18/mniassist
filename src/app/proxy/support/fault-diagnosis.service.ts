import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type {
  FaultCheckDto,
  FaultCodeSource,
  FaultCodeState,
  FaultSeverity,
} from './fault-code.service';

export interface EngineerFaultEntryDto {
  id: string;
  code: string;
  make: string;
  series?: string | null;
  title: string;
  severity: FaultSeverity;
  state: FaultCodeState;
  /** A draft: engineers only, marked "not reviewed". */
  notReviewed: boolean;
  version: number;
  safetyNote?: string | null;
  causes: string[];
  checks: FaultCheckDto[];
  escalateWhen?: string | null;
  sourceKind: FaultCodeSource;
  sourceDocument?: string | null;
  sourcePage?: number | null;
}

export interface EngineerPastTicketDto {
  id: string;
  reference: string;
  closedAtUtc?: string | null;
  cause?: string | null;
  fix?: string | null;
  spares?: string | null;
}

export interface EngineerSpareDto {
  partNumber: string;
  name?: string | null;
  productId?: string | null;
  available?: number | null;
}

export interface EngineerDiagnosisDto {
  ticketId: string;
  code?: string | null;
  machine?: string | null;
  make?: string | null;
  series?: string | null;
  matchedBy?: string | null;
  entries: EngineerFaultEntryDto[];
  pastTickets: EngineerPastTicketDto[];
  spares: EngineerSpareDto[];
  customerAnswer?: string | null;
  customerAnswerVersion?: number | null;
  note?: string | null;
}

/** The engineer's Diagnosis panel inside a ticket. Nothing here is sent to the customer. */
@Injectable({ providedIn: 'root' })
export class FaultDiagnosisService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (ticketId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EngineerDiagnosisDto>(
      { method: 'GET', url: `/api/auto-reach/fault-diagnosis/${ticketId}` },
      { apiName: this.apiName, ...config },
    );

  diagnose = (
    ticketId: string,
    input: { code?: string | null; photoDataUrl?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, EngineerDiagnosisDto>(
      { method: 'POST', url: `/api/auto-reach/fault-diagnosis/${ticketId}/diagnose`, body: input },
      { apiName: this.apiName, ...config },
    );
}
