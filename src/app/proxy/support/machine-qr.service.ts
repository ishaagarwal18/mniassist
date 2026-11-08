import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { TicketStatus } from './ticket-status.enum';

export enum MachineScanAction {
  View = 0,
  CodeRequest = 1,
  Verify = 2,
  Breakdown = 3,
  Service = 4,
  Spare = 5,
}

export interface MachineScanDto {
  scannedAtUtc: string;
  action: MachineScanAction;
  result: string;
  ipCity?: string | null;
}

export interface MachineQrDto {
  assetId: string;
  active: boolean;
  /** The page the sticker opens. Null with no active sticker. */
  url?: string | null;
  /** The QR as an SVG document. */
  qrSvg?: string | null;
  createdAtUtc?: string | null;
  revokedAtUtc?: string | null;
  lastScannedAtUtc?: string | null;
  scanCount: number;
  recentScans: MachineScanDto[];
}

export interface PrintMachineStickersInput {
  assetIds: string[];
}

/** A machine's QR sticker, for the team: make, regenerate, switch off and print. */
@Injectable({ providedIn: 'root' })
export class MachineQrService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (assetId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MachineQrDto>(
      { method: 'GET', url: `/api/auto-reach/machine-qr/${assetId}` },
      { apiName: this.apiName, ...config },
    );

  create = (assetId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MachineQrDto>(
      { method: 'POST', url: `/api/auto-reach/machine-qr/${assetId}` },
      { apiName: this.apiName, ...config },
    );

  regenerate = (assetId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MachineQrDto>(
      { method: 'POST', url: `/api/auto-reach/machine-qr/${assetId}/regenerate` },
      { apiName: this.apiName, ...config },
    );

  revoke = (assetId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, MachineQrDto>(
      { method: 'POST', url: `/api/auto-reach/machine-qr/${assetId}/revoke` },
      { apiName: this.apiName, ...config },
    );

  printStickers = (input: PrintMachineStickersInput, config?: Partial<Rest.Config>) =>
    this.restService.request<PrintMachineStickersInput, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: '/api/auto-reach/machine-qr/print-stickers',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}

// ---- the public scan page ----------------------------------------------------------------------------------------------

export interface PublicMachineTicketDto {
  reference: string;
  subject: string;
  status: TicketStatus;
  isBreakdown: boolean;
  creationTime: string;
  engineerFirstName?: string | null;
}

export interface PublicMachinePrivateDto {
  coverText: string;
  coverEndsOn?: string | null;
  covered: boolean;
  openTickets: PublicMachineTicketDto[];
}

export interface PublicMachineDto {
  revoked: boolean;
  workspaceName: string;
  logoDataUrl?: string | null;
  description: string;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  siteName?: string | null;
  helpline?: string | null;
  whatsAppNumber?: string | null;
  verified: boolean;
  canReport: boolean;
  canOrderSpares: boolean;
  private?: PublicMachinePrivateDto | null;
}

export interface PublicMachineCodeInput {
  phone: string;
  captchaToken?: string | null;
}

export interface PublicMachineCodeSentDto {
  message: string;
  validForMinutes: number;
  knownNumber: boolean;
}

export interface PublicMachineVerifyInput {
  phone: string;
  code: string;
  captchaToken?: string | null;
}

export interface PublicMachineVerifiedDto {
  session: string;
  expiresAtUtc: string;
  knownNumber: boolean;
}

export interface PublicMachineReportInput {
  name?: string | null;
  phone: string;
  description?: string | null;
  isBreakdown: boolean;
  session?: string | null;
  website?: string | null;
}

export interface PublicMachineReportedDto {
  needsCode: boolean;
  reference?: string | null;
  message: string;
  confirmed: boolean;
}

export interface PublicMachineSpareLinkDto {
  token: string;
  session: string;
  expiresAtUtc: string;
}

/**
 * What the page a machine's QR sticker opens calls. Anonymous: the sticker's token is all the visitor holds. The page session goes in a
 * header, never the address. Errors are handled by the page itself, so the app-wide handler (which talks about signing in) is skipped.
 */
@Injectable({ providedIn: 'root' })
export class MachineScanPublicService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  private readonly own: Partial<Rest.Config> = { skipHandleError: true };

  get = (token: string, session?: string | null) =>
    this.restService.request<any, PublicMachineDto>(
      {
        method: 'GET',
        url: `/api/m/${token}`,
        headers: session ? { 'X-Machine-Session': session } : undefined,
      },
      { apiName: this.apiName, ...this.own },
    );

  sendCode = (token: string, input: PublicMachineCodeInput) =>
    this.restService.request<PublicMachineCodeInput, PublicMachineCodeSentDto>(
      { method: 'POST', url: `/api/m/${token}/code`, body: input },
      { apiName: this.apiName, ...this.own },
    );

  verify = (token: string, input: PublicMachineVerifyInput) =>
    this.restService.request<PublicMachineVerifyInput, PublicMachineVerifiedDto>(
      { method: 'POST', url: `/api/m/${token}/verify`, body: input },
      { apiName: this.apiName, ...this.own },
    );

  report = (token: string, input: PublicMachineReportInput) =>
    this.restService.request<PublicMachineReportInput, PublicMachineReportedDto>(
      { method: 'POST', url: `/api/m/${token}/report`, body: input },
      { apiName: this.apiName, ...this.own },
    );

  spares = (token: string, session: string) =>
    this.restService.request<{ session: string }, PublicMachineSpareLinkDto>(
      { method: 'POST', url: `/api/m/${token}/spares`, body: { session } },
      { apiName: this.apiName, ...this.own },
    );
}
