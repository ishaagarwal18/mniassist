import type { TicketPriority } from './ticket-priority.enum';
import type { TicketSource } from './ticket-source.enum';
import type { TicketStatus } from './ticket-status.enum';

export interface CreateServiceTicketInput {
  contactId: string;
  subject: string;
  description?: string | null;
  category?: string | null;
  priority: TicketPriority;
  enquiryId?: string | null;
  installedAssetId?: string | null;
  conversationId?: string | null;
}

export interface UpdateServiceTicketDetailsInput {
  subject: string;
  description?: string | null;
  category?: string | null;
}

export interface SetTicketPriorityInput {
  priority: TicketPriority;
}

export interface SetTicketStatusInput {
  status: TicketStatus;
}

export interface AssignTicketInput {
  userId?: string | null;
}

export interface LinkTicketInput {
  enquiryId?: string | null;
  installedAssetId?: string | null;
}

export interface AddServiceTicketCommentInput {
  body: string;
  /** True for a note only the team sees; false to send this to the customer, through the ticket's conversation. */
  isInternal: boolean;
}

export interface RecordTicketSatisfactionInput {
  rating: number;
}

export interface GetServiceTicketsInput {
  status?: TicketStatus | null;
  priority?: TicketPriority | null;
  contactId?: string | null;
  enquiryId?: string | null;
  assignedUserId?: string | null;
  mine?: boolean;
  unassigned?: boolean;
  overdue?: boolean;
  filter?: string | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface ServiceTicketDto {
  id: string;
  reference: string;
  contactId: string;
  contactName?: string | null;
  contactNumber?: string | null;
  subject: string;
  description?: string | null;
  category?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  enquiryId?: string | null;
  enquiryReference?: string | null;
  installedAssetId?: string | null;
  conversationId?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  dueAtUtc?: string | null;
  isOverdue: boolean;
  firstRespondedAtUtc?: string | null;
  resolvedAtUtc?: string | null;
  closedAtUtc?: string | null;
  reopenCount: number;
  satisfactionRating?: number | null;
  creationTime: string;
}

export interface ServiceTicketCommentDto {
  id: string;
  ticketId: string;
  authorUserId?: string | null;
  authorName?: string | null;
  isInternal: boolean;
  fromCustomer: boolean;
  body: string;
  creationTime: string;
}

export interface ServiceTicketDetailDto extends ServiceTicketDto {
  comments: ServiceTicketCommentDto[];
}

export interface ServiceTicketSummaryDto {
  openCount: number;
  pendingCount: number;
  overdueCount: number;
  unassignedCount: number;
}

export interface ServiceTicketSettingsDto {
  urgentHours: number;
  highHours: number;
  normalHours: number;
  lowHours: number;
  portalEnabled: boolean;
  /** Set only once the portal has been turned on at least once; the slug it was given stays put after that. */
  portalUrl?: string | null;
}

export interface SetServiceTicketSettingsInput {
  urgentHours: number;
  highHours: number;
  normalHours: number;
  lowHours: number;
  portalEnabled: boolean;
}
