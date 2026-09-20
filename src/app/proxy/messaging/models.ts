import type {
  EntityDto,
  FullAuditedEntityDto,
  PagedAndSortedResultRequestDto,
  PagedResultRequestDto,
} from '@abp/ng.core';
import type { DecisionRole } from '../contacts/decision-role.enum';
import type { ConsentScope } from '../contacts/consent-scope.enum';
import type { SuppressionReason } from '../contacts/suppression-reason.enum';
import type { ContactLifecycle } from '../contacts/contact-lifecycle.enum';
import type { QuotationState } from '../pipeline/quotation-state.enum';
import type { EnquiryStage } from '../pipeline/enquiry-stage.enum';
import type { ReminderKind } from '../pipeline/reminder-kind.enum';
import type { ConversationState } from './conversation-state.enum';
import type { WindowOrigin } from './window-origin.enum';
import type { TemplateComponentKind } from './template-component-kind.enum';
import type { TemplateHeaderFormat } from './template-header-format.enum';
import type { TemplateCategory } from './template-category.enum';
import type { TemplateStatus } from './template-status.enum';
import type { MessageDirection } from './message-direction.enum';
import type { MessageStatus } from './message-status.enum';
import type { PricingCategory } from './pricing-category.enum';
import type { ConversationStatus } from './conversation-status.enum';
import type { ConversationPriority } from './conversation-priority.enum';
import type { TemplateQuality } from './template-quality.enum';
import type { TemplateLintSeverity } from './template-lint-severity.enum';

export interface AssignConversationInput {
  userId?: string | null;
}

export interface CannedReplyDto extends EntityDto<string> {
  shortcut?: string;
  title?: string;
  body?: string;
  folder?: string | null;
  useCount?: number;
  variables?: string[];
}

export interface ComposerCapabilityDto {
  canSendFreeForm?: boolean;
  canSendTemplate?: boolean;
  windowExpiresAtUtc?: string | null;
  windowMinutesRemaining?: number | null;
  restriction?: string | null;
}

export interface ContactPanelDto {
  id?: string;
  waId?: string;
  displayName?: string | null;
  companyName?: string | null;
  designation?: string | null;
  role?: DecisionRole;
  city?: string | null;
  state?: string | null;
  languageCode?: string;
  consentScope?: ConsentScope;
  suppression?: SuppressionReason;
  lifecycle?: ContactLifecycle;
  quotationState?: QuotationState;
  ownerUserId?: string | null;
  ownerUserName?: string | null;
  tags?: string[];
  attributes?: Record<string, string>;
}

export interface ContextAssetDto {
  id?: string;
  make?: string | null;
  model?: string | null;
  description?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  warrantyEndsOn?: string | null;
  amcEndsOn?: string | null;
}

export interface ContextEnquiryDto {
  id?: string;
  reference?: string;
  title?: string | null;
  stage?: EnquiryStage;
  estimatedValueInPaise?: number | null;
  expectedCloseDate?: string | null;
}

export interface ContextQuotationDto {
  id?: string;
  reference?: string;
  state?: QuotationState;
  subtotalInPaise?: number;
  issuedAtUtc?: string | null;
  validUntilUtc?: string | null;
  isLapsed?: boolean;
}

export interface ContextReminderDto {
  id?: string;
  kind?: ReminderKind;
  dueOnUtc?: string;
  isSent?: boolean;
}

export interface ConversationContextDto {
  conversation?: ConversationDto;
  contact?: ContactPanelDto;
  openEnquiries?: ContextEnquiryDto[];
  recentQuotations?: ContextQuotationDto[];
  installedAssets?: ContextAssetDto[];
  upcomingReminders?: ContextReminderDto[];
  notes?: ConversationNoteDto[];
  labels?: ConversationLabelDto[];
  composer?: ComposerCapabilityDto;
}

export interface ConversationDto extends EntityDto<string> {
  channelId?: string;
  contactId?: string;
  contactWaId?: string | null;
  /** 0 WhatsApp, 1 Instagram, 2 Messenger, 3 SMS, 4 Email, 5 Voice. */
  channelKind?: number;
  contactDisplayName?: string | null;
  contactCompanyName?: string | null;
  state?: ConversationState;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  lastInboundAtUtc?: string | null;
  lastOutboundAtUtc?: string | null;
  windowExpiresAtUtc?: string | null;
  windowOrigin?: WindowOrigin | null;
  isWindowOpen?: boolean;
  unreadCount?: number;
  lastMessagePreview?: string | null;
  snoozedUntilUtc?: string | null;
}

export interface ConversationLabelDto extends EntityDto<string> {
  name?: string;
  colourHex?: string;
  conversationCount?: number;
}

export interface ConversationNoteDto extends EntityDto<string> {
  conversationId?: string;
  body?: string;
  authorUserId?: string | null;
  authorName?: string | null;
  creationTime?: string;
  mentionedUserIds?: string[];
  mentionedUserNames?: string[];
}

export interface CreateConversationNoteDto {
  body: string;
  mentionedUserIds?: string[];
}

export interface CreateUpdateCannedReplyDto {
  shortcut: string;
  title: string;
  body: string;
  folder?: string | null;
}

export interface CreateUpdateConversationLabelDto {
  name: string;
  colourHex: string;
}

export interface CreateUpdateTemplateComponentDto {
  kind?: TemplateComponentKind;
  headerFormat?: TemplateHeaderFormat;
  text?: string | null;
  buttonsJson?: string | null;
  order?: number;
}

export interface CreateUpdateTemplateDto {
  channelId?: string;
  name: string;
  languageCode: string;
  category?: TemplateCategory;
  components?: CreateUpdateTemplateComponentDto[];
}

export interface GetInboxInput extends PagedAndSortedResultRequestDto {
  state?: ConversationState | null;
  assignedUserId?: string | null;
  unreadOnly?: boolean;
  windowClosingSoon?: boolean;
  filter?: string | null;
}

export interface GetTemplateListInput extends PagedAndSortedResultRequestDto {
  channelId?: string | null;
  category?: TemplateCategory | null;
  status?: TemplateStatus | null;
  filter?: string | null;
}

export interface InboxCountsDto {
  all?: number;
  unassigned?: number;
  mine?: number;
  unread?: number;
  windowClosingSoon?: number;
  snoozed?: number;
}

export interface InboxPollDto {
  watermarkUtc?: string;
  isUnchanged?: boolean;
  changed?: ConversationDto[];
  counts?: InboxCountsDto;
  nextPollSeconds?: number;
}

export interface InboxPollInput {
  sinceUtc?: string | null;
  assignedUserId?: string | null;
  unassignedOnly?: boolean;
}

export interface MessageDto extends EntityDto<string> {
  conversationId?: string;
  direction?: MessageDirection;
  waMessageId?: string | null;
  templateId?: string | null;
  templateName?: string | null;
  campaignId?: string | null;
  body?: string | null;
  mediaBlobRef?: string | null;
  mediaMimeType?: string | null;
  mediaFileName?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  locationName?: string | null;
  locationAddress?: string | null;
  interactiveJson?: string | null;
  status?: MessageStatus;
  pricingCategory?: PricingCategory;
  priceInPaise?: number;
  creationTime?: string;
  sentAtUtc?: string | null;
  deliveredAtUtc?: string | null;
  readAtUtc?: string | null;
  errorCode?: number | null;
  errorTitle?: string | null;
}

export interface RenderCannedReplyDto {
  id?: string;
  conversationId?: string;
  values?: Record<string, string>;
}

export interface RenderTemplateInput {
  variables?: Record<string, string>;
}

export interface RenderedTemplateDto {
  headerText?: string | null;
  bodyText?: string;
  footerText?: string | null;
  buttonLabels?: string[];
  unresolvedVariables?: string[];
}

/** M04-10: AI-assisted template drafting. */
export enum TemplateDraftTone {
  Friendly = 0,
  Formal = 1,
  Concise = 2,
  Persuasive = 3,
}

export interface DraftTemplateInput {
  goal: string;
  category?: TemplateCategory;
  tone?: TemplateDraftTone;
  languageCode?: string;
  audience?: string | null;
  brand?: string | null;
}

export interface DraftedTemplateDto {
  providerName: string;
  bodyVariants: string[];
  suggestedButtonLabels: string[];
}

export interface SearchConversationsInput extends PagedResultRequestDto {
  term?: string | null;
  channelId?: string | null;
  assignedUserId?: string | null;
  unassignedOnly?: boolean;
  status?: ConversationStatus | null;
  state?: ConversationState | null;
  priority?: ConversationPriority | null;
  labelIds?: string[];
  fromUtc?: string | null;
  toUtc?: string | null;
  awaitingReplyOnly?: boolean;
}

export interface SendMessageInput {
  text?: string | null;
  templateId?: string | null;
  variables?: Record<string, string>;
  libraryDocumentId?: string | null;
}


/** M06-12: AI-drafted reply options for the composer. */
export interface SuggestedRepliesDto {
  providerName: string;
  suggestions: string[];
  basedOn?: string | null;
}

export interface SendLocationInput {
  latitude: number;
  longitude: number;
  name?: string | null;
  address?: string | null;
}

export interface ReplyButtonInput {
  id?: string | null;
  title: string;
}

export interface SendInteractiveInput {
  bodyText: string;
  footerText?: string | null;
  buttons: ReplyButtonInput[];
}

export interface SetConversationLabelsDto {
  labelIds?: string[];
}

export interface SetConversationStatusDto {
  status?: ConversationStatus;
  priority?: ConversationPriority;
}

export interface SnoozeConversationInput {
  untilUtc?: string;
}

export interface TemplateLanguageVariantDto {
  templateId?: string;
  languageCode?: string;
  status?: TemplateStatus;
  quality?: TemplateQuality;
}

export interface TemplateLanguageGroupDto {
  name?: string;
  channelId?: string;
  category?: TemplateCategory;
  languages?: TemplateLanguageVariantDto[];
}

export interface TemplateComponentDto extends EntityDto<string> {
  kind?: TemplateComponentKind;
  headerFormat?: TemplateHeaderFormat;
  text?: string | null;
  buttonsJson?: string | null;
  order?: number;
  variableCount?: number;
}

export interface TemplateDto extends FullAuditedEntityDto<string> {
  channelId?: string;
  name?: string;
  languageCode?: string;
  category?: TemplateCategory;
  metaAssignedCategory?: TemplateCategory | null;
  effectiveCategory?: TemplateCategory;
  status?: TemplateStatus;
  quality?: TemplateQuality;
  metaTemplateId?: string | null;
  rejectionReason?: string | null;
  submittedAtUtc?: string | null;
  approvedAtUtc?: string | null;
  variableCount?: number;
  components?: TemplateComponentDto[];
}

export interface TemplateLintItemDto {
  severity?: TemplateLintSeverity;
  code?: string;
  message?: string;
}

export interface TemplateLintResultDto {
  items?: TemplateLintItemDto[];
  hasErrors?: boolean;
}
