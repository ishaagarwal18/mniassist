import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface ConsumableRuleDto {
  id: string;
  assetLabel: string;
  partNumber: string;
  description: string;
  quantityPerMachine: number;
  intervalDays: number;
  leadDays: number;
  isActive: boolean;
  machineCount: number;
}

export interface SaveConsumableRuleInput {
  assetLabel: string;
  partNumber: string;
  description?: string | null;
  quantityPerMachine: number;
  intervalDays: number;
  leadDays: number;
  isActive: boolean;
}

export interface SpareReorderDto {
  id: string;
  assetId: string;
  machine: string;
  serialNumber?: string | null;
  site?: string | null;
  contactId: string;
  contactName?: string | null;
  partNumber: string;
  description: string;
  quantity: number;
  dueOn: string;
  daysToDue: number;
  state: 'Due' | 'Quoted';
  quotationId?: string | null;
  remindedAtUtc?: string | null;
  callRequestedAtUtc?: string | null;
  followedUpAtUtc?: string | null;
  /** Follow-ups sent so far for this reminder. */
  followUpCount: number;
}

export interface SparesReminderSettingsDto {
  enabled: boolean;
  templateId?: string | null;
  /** Follow up once this many days after an unanswered reminder; 0 = off. */
  followUpAfterDays: number;
  /** Null sends the reminder template again. */
  followUpTemplateId?: string | null;
  /** How many follow-ups, 1–3, each the same number of days after the last. */
  maxFollowUps: number;
}

export interface SparesQuoteResultDto {
  quotationId: string;
  reference: string;
  enquiryId: string;
  subtotalInPaise: number;
  unpriced: number;
}

/** M4: spares and consumables reorder from the installed base. */
@Injectable({ providedIn: 'root' })
export class SparesService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getRules = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsumableRuleDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/spares/rules',
      },
      { apiName: this.apiName, ...config },
    );

  createRule = (input: SaveConsumableRuleInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsumableRuleDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/spares/rule',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateRule = (id: string, input: SaveConsumableRuleInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ConsumableRuleDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/spares/${id}/rule`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  deleteRule = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/spares/${id}/rule` },
      { apiName: this.apiName, ...config },
    );

  getDue = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SpareReorderDto[]>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: '/api/auto-reach/spares/due' },
      { apiName: this.apiName, ...config },
    );

  scan = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/spares/scan',
      },
      { apiName: this.apiName, ...config },
    );

  quote = (reorderIds: string[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, SparesQuoteResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/spares/quote',
        body: { reorderIds },
      },
      { apiName: this.apiName, ...config },
    );

  markReplaced = (id: string, replacedOn: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: `/api/auto-reach/spares/${id}/mark-replaced`,
        params: { replacedOn },
      },
      { apiName: this.apiName, ...config },
    );

  getReminderSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SparesReminderSettingsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/spares/reminder-settings',
      },
      { apiName: this.apiName, ...config },
    );

  updateReminderSettings = (input: SparesReminderSettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SparesReminderSettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/spares/reminder-settings',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** Sends due reminders now. Returns how many customers were messaged. */
  remind = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/spares/remind',
      },
      { apiName: this.apiName, ...config },
    );

  dismiss = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: `/api/auto-reach/spares/${id}/dismiss` },
      { apiName: this.apiName, ...config },
    );
}
