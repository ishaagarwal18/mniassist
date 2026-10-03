import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export type ShipmentStatus =
  'Dispatched' | 'InTransit' | 'OutForDelivery' | 'Delivered' | 'Exception';

export interface ShippingSettingsDto {
  shiprocketEmail?: string | null;
  /** Read-only: a Shiprocket password is stored. */
  shiprocketConnected?: boolean;
  pickupPincode?: string | null;
  notifyCustomer: boolean;
  dispatchTemplateId?: string | null;
}

export interface UpdateShippingSettingsInput {
  shiprocketEmail?: string | null;
  /** Blank keeps the stored password. */
  shiprocketPassword?: string | null;
  pickupPincode?: string | null;
  notifyCustomer: boolean;
  dispatchTemplateId?: string | null;
}

export interface ShippingRateDto {
  courier: string;
  rateInPaise: number;
  deliveryDays?: number | null;
  etd?: string | null;
}

export interface ShipmentEventDto {
  status: ShipmentStatus;
  atUtc: string;
  description?: string | null;
  location?: string | null;
}

export interface ShipmentDto {
  id: string;
  quotationId: string;
  quotationReference?: string | null;
  contactId: string;
  contactName?: string | null;
  provider: 'Manual' | 'Shiprocket';
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  status: ShipmentStatus;
  dispatchedAtUtc: string;
  expectedOn?: string | null;
  deliveredAtUtc?: string | null;
  packages?: number | null;
  weightKg?: number | null;
  freightInPaise?: number | null;
  lastUpdate?: string | null;
  customerNotified: boolean;
  events: ShipmentEventDto[];
}

export interface DispatchShipmentInput {
  quotationId: string;
  provider: 'Manual' | 'Shiprocket';
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  expectedOn?: string | null;
  packages?: number | null;
  weightKg?: number | null;
  freightInPaise?: number | null;
}

/** Dispatching won orders and tracking them (re-order portal add-on). */
@Injectable({ providedIn: 'root' })
export class ShippingService {
  private restService = inject(RestService);
  apiName = 'AutoReach';
  private base = '/api/auto-reach/shipping';

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ShippingSettingsDto>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/settings` },
      { apiName: this.apiName, ...config },
    );

  updateSettings = (input: UpdateShippingSettingsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ShippingSettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `${this.base}/settings`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getRates = (deliveryPincode: string, weightKg: number, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ShippingRateDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/rates`,
        params: { deliveryPincode, weightKg },
      },
      { apiName: this.apiName, ...config },
    );

  getShipments = (quotationId?: string | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ShipmentDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/shipments`,
        params: { quotationId: quotationId || undefined },
      },
      { apiName: this.apiName, ...config },
    );

  dispatch = (input: DispatchShipmentInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ShipmentDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/dispatch`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateStatus = (
    id: string,
    status: ShipmentStatus,
    note?: string | null,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ShipmentDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `${this.base}/${id}/status`,
        body: { status, note },
      },
      { apiName: this.apiName, ...config },
    );

  refresh = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      { method: 'POST', headers: { Accept: 'application/json' }, url: `${this.base}/refresh` },
      { apiName: this.apiName, ...config },
    );
}
