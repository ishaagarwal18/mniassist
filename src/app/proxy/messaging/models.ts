import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { ConversationState } from './conversation-state.enum';
import type { MessageDirection } from './message-direction.enum';
import type { MessageStatus } from './message-status.enum';
import type { PricingCategory } from './pricing-category.enum';
import type { TemplateCategory } from './template-category.enum';
import type { TemplateComponentKind } from './template-component-kind.enum';
import type { TemplateHeaderFormat } from './template-header-format.enum';
import type { TemplateLintSeverity } from './template-lint-severity.enum';
import type { TemplateQuality } from './template-quality.enum';
import type { TemplateStatus } from './template-status.enum';
import type { WindowOrigin } from './window-origin.enum';

export interface AssignConversationInput {
  userId?: string;
}

export interface ConversationDto extends EntityDto<string> {
  channelId?: string;
  contactId?: string;
  contactWaId?: string;
  contactDisplayName?: string;
  contactCompanyName?: string;
  state: ConversationState;
  assignedUserId?: string;
  assignedUserName?: string;
  lastInboundAtUtc?: string;
  lastOutboundAtUtc?: string;
  /** null when no window is open — the composer must fall back to templates. */
  windowExpiresAtUtc?: string;
  windowOrigin?: WindowOrigin;
  isWindowOpen: boolean;
  unreadCount: number;
  lastMessagePreview?: string;
  snoozedUntilUtc?: string;
}

export interface GetInboxInput extends PagedAndSortedResultRequestDto {
  state?: ConversationState;
  assignedUserId?: string;
  unreadOnly: boolean;
  /** Windows closing inside the next hour — the queue an agent works first. */
  windowClosingSoon: boolean;
  filter?: string;
}

export interface InboxCountsDto {
  all: number;
  unassigned: number;
  mine: number;
  unread: number;
  windowClosingSoon: number;
  snoozed: number;
}

export interface MessageDto extends EntityDto<string> {
  conversationId?: string;
  direction: MessageDirection;
  waMessageId?: string;
  templateId?: string;
  templateName?: string;
  campaignId?: string;
  body?: string;
  mediaBlobRef?: string;
  mediaMimeType?: string;
  status: MessageStatus;
  pricingCategory: PricingCategory;
  priceInPaise: number;
  creationTime?: string;
  sentAtUtc?: string;
  deliveredAtUtc?: string;
  readAtUtc?: string;
  errorCode?: number;
  errorTitle?: string;
}

export interface SendMessageInput {
  text?: string;
  templateId?: string;
  variables: Record<string, string>;
  libraryDocumentId?: string;
}

export interface SnoozeConversationInput {
  untilUtc: string;
}

export interface CreateUpdateTemplateComponentDto {
  kind: TemplateComponentKind;
  headerFormat: TemplateHeaderFormat;
  text?: string;
  buttonsJson?: string;
  order: number;
}

export interface CreateUpdateTemplateDto {
  channelId: string;
  name: string;
  languageCode: string;
  category: TemplateCategory;
  components: CreateUpdateTemplateComponentDto[];
}

export interface GetTemplateListInput extends PagedAndSortedResultRequestDto {
  channelId?: string;
  category?: TemplateCategory;
  status?: TemplateStatus;
  filter?: string;
}

export interface RenderTemplateInput {
  variables: Record<string, string>;
}

export interface RenderedTemplateDto {
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  buttonLabels: string[];
  unresolvedVariables: string[];
}

export interface TemplateComponentDto extends EntityDto<string> {
  kind: TemplateComponentKind;
  headerFormat: TemplateHeaderFormat;
  text?: string;
  buttonsJson?: string;
  order: number;
  variableCount: number;
}

export interface TemplateDto extends FullAuditedEntityDto<string> {
  channelId?: string;
  name?: string;
  languageCode?: string;
  category: TemplateCategory;
  /** Set when Meta re-categorised the template. Billing follows this. */
  metaAssignedCategory?: TemplateCategory;
  effectiveCategory: TemplateCategory;
  status: TemplateStatus;
  quality: TemplateQuality;
  metaTemplateId?: string;
  rejectionReason?: string;
  submittedAtUtc?: string;
  approvedAtUtc?: string;
  variableCount: number;
  components: TemplateComponentDto[];
}

export interface TemplateLintItemDto {
  severity: TemplateLintSeverity;
  code?: string;
  message?: string;
}

export interface TemplateLintResultDto {
  items: TemplateLintItemDto[];
  hasErrors: boolean;
}
