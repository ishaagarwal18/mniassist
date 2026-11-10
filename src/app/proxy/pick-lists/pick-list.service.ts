import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** What a pick list is, which decides what a workspace may change in it. */
export enum PickListKind {
  /** Plain reference values: added, renamed, reordered and hidden. */
  Reference = 0,
  /** The names of values the system defines (a ticket status): renamed only. */
  OptionNames = 1,
}

export enum PickListValueType {
  Text = 0,
  Number = 1,
}

export interface PickListItemDto {
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PickListDto {
  key: string;
  title: string;
  area: string;
  description: string;
  kind: PickListKind;
  valueType: PickListValueType;
  isCustomised: boolean;
  items: PickListItemDto[];
}

export interface SavePickListItemDto {
  value?: string | null;
  label: string;
  isActive: boolean;
}

export interface SavePickListInput {
  items: SavePickListItemDto[];
}

/** The app's drop-down lists, kept in the database (Settings → Pick lists). */
@Injectable({ providedIn: 'root' })
export class PickListService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<PickListDto>>(
      { method: 'GET', url: '/api/auto-reach/pick-list' },
      { apiName: this.apiName, ...config },
    );

  save = (key: string, input: SavePickListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PickListDto>(
      { method: 'POST', url: '/api/auto-reach/pick-list/save', params: { key }, body: input },
      { apiName: this.apiName, ...config },
    );

  reset = (key: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PickListDto>(
      { method: 'POST', url: '/api/auto-reach/pick-list/reset', params: { key } },
      { apiName: this.apiName, ...config },
    );
}
