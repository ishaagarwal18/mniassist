import type { EntityDto, PagedResultRequestDto } from '@abp/ng.core';
import type { NotificationKind } from './notification-kind.enum';
import type { NotificationSeverity } from './notification-severity.enum';
import type { NotificationChannels } from './notification-channels.enum';
import type { NotificationDeliveryState } from './notification-delivery-state.enum';

export interface NotificationDto extends EntityDto<string> {
  kind?: NotificationKind;
  severity?: NotificationSeverity;
  title?: string;
  body?: string;
  actionRoute?: string | null;
  occurredAtUtc?: string;
  readAtUtc?: string | null;
  isRead?: boolean;
  deliveredChannels?: NotificationChannels;
  emailState?: NotificationDeliveryState;
  deliveryError?: string | null;
}

export interface NotificationListRequestDto extends PagedResultRequestDto {
  unreadOnly?: boolean;
}

export interface NotificationSummaryDto {
  unreadCount?: number;
  unreadCriticalCount?: number;
  mostRecent?: NotificationDto | null;
}
