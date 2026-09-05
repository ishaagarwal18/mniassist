import type { EntityDto, PagedResultRequestDto } from '@abp/ng.core';
import type { NotificationChannels } from './notification-channels.enum';
import type { NotificationDeliveryState } from './notification-delivery-state.enum';
import type { NotificationKind } from './notification-kind.enum';
import type { NotificationSeverity } from './notification-severity.enum';

export interface NotificationDto extends EntityDto<string> {
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
  /** Client route to open. The bell turns each row into a link with this. */
  actionRoute?: string;
  occurredAtUtc: string;
  readAtUtc?: string;
  isRead: boolean;
  /** What actually went out, as opposed to what was asked for. */
  deliveredChannels: NotificationChannels;
  emailState: NotificationDeliveryState;
  deliveryError?: string;
}

export interface NotificationListRequestDto extends PagedResultRequestDto {
  unreadOnly: boolean;
}

export interface NotificationSummaryDto {
  unreadCount: number;
  /** Unread criticals. The bell shows a different colour above zero. */
  unreadCriticalCount: number;
  mostRecent?: NotificationDto;
}
