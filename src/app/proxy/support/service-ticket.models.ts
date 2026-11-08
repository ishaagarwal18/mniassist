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
  /** A machine has stopped: starts the downtime clock now. */
  isBreakdown?: boolean;
}

export interface UpdateServiceTicketDetailsInput {
  subject: string;
  description?: string | null;
  category?: string | null;
  /** Turns the breakdown flag on or off. Left out: unchanged. */
  isBreakdown?: boolean | null;
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
  /** Only open breakdowns an escalation step has flagged. */
  escalated?: boolean;
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
  isBreakdown: boolean;
  breakdownReportedAtUtc?: string | null;
  /** Reported from a machine sticker by a number that isn't on the machine's account. */
  reportedByUnknownNumber: boolean;
  /** The engineer's account of the fix (breakdowns). */
  closedCode?: string | null;
  closedCause?: string | null;
  closedFix?: string | null;
  closedSpares?: string | null;
  /** The code the customer reported, and the library version that answered them. */
  reportedCode?: string | null;
  faultCodeVersion?: number | null;
  /** How many escalation steps the ticket has passed. */
  escalationStep: number;
  /** An escalation step flagged it for the dashboard and it is still open. */
  escalated: boolean;
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
  /** Open breakdowns an escalation step has flagged. */
  escalatedCount: number;
}

export interface ServiceTicketSettingsDto {
  urgentHours: number;
  highHours: number;
  normalHours: number;
  lowHours: number;
  portalEnabled: boolean;
  /** Set only once the portal has been turned on at least once; the slug it was given stays put after that. */
  portalUrl?: string | null;
  /** The approved authentication template for sign-off codes outside the 24-hour window. */
  signOffTemplateId?: string | null;
  /** The approved template confirming a breakdown report from a machine sticker outside the window: name, reference, machine. */
  breakdownTemplateId?: string | null;
}

export interface SetServiceTicketSettingsInput {
  urgentHours: number;
  highHours: number;
  normalHours: number;
  lowHours: number;
  portalEnabled: boolean;
  signOffTemplateId?: string | null;
  breakdownTemplateId?: string | null;
}
