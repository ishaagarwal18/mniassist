import type { EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { LeadSource } from '../pipeline/lead-source.enum';

export interface ChatEntryPointDto extends EntityDto<string> {
  channelId?: string;
  name?: string;
  slug?: string;
  source?: LeadSource;
  prefilledMessage?: string;
  isActive?: boolean;
  clickCount?: number;
  lastClickUtc?: string | null;
  creationTime?: string;
}

export interface CreateUpdateChatEntryPointDto {
  channelId: string;
  name: string;
  source: LeadSource;
  prefilledMessage?: string | null;
  isActive: boolean;
}

export interface GetChatEntryPointListInput extends PagedAndSortedResultRequestDto {
  channelId?: string | null;
  activeOnly?: boolean | null;
}

export interface ChatEntryPointAssetsDto {
  waLink?: string;
  prefilledText?: string;
  widgetSnippet?: string;
  qrSvg?: string;
  qrPngDataUri?: string;
}
