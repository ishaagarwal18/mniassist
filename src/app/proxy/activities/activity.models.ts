export enum CrmTaskStatus {
  Open = 0,
  Done = 1,
  Cancelled = 2,
}

export enum TaskPriority {
  Low = 0,
  Normal = 1,
  High = 2,
}

export enum MeetingKind {
  InPerson = 0,
  Call = 1,
  Video = 2,
  SiteVisit = 3,
}

export enum MeetingStatus {
  Scheduled = 0,
  Completed = 1,
  Cancelled = 2,
  NoShow = 3,
}

export enum RecurrenceFrequency {
  None = 0,
  Daily = 1,
  Weekly = 2,
  Monthly = 3,
}

/** JavaScript's own numbering: Sunday is 0. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RecurrenceDto {
  frequency: RecurrenceFrequency;
  interval?: number;
  weekdays?: Weekday[];
  untilUtc?: string | null;
  count?: number | null;
}

export enum AttendeeResponse {
  Pending = 0,
  Accepted = 1,
  Declined = 2,
}

// ---- people ----

export interface ActivityUserDto {
  userId?: string;
  name?: string;
  email?: string | null;
}

// ---- tasks ----

export interface CrmTaskDto {
  id?: string;
  title?: string;
  notes?: string | null;
  dueAtUtc?: string | null;
  priority?: TaskPriority;
  status?: CrmTaskStatus;
  assigneeUserId?: string;
  assigneeName?: string | null;
  createdByUserId?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  enquiryId?: string | null;
  enquiryReference?: string | null;
  quotationId?: string | null;
  completedAtUtc?: string | null;
  reminderLeadMinutes?: number | null;
  /** Ways the reminder goes out besides the bell. */
  reminderChannels?: ReminderChannels;
  links?: ActivityLinkDto[];
  recurrence?: RecurrenceDto | null;
  seriesId?: string | null;
  nextTaskId?: string | null;
}

export interface CreateUpdateCrmTaskDto {
  title: string;
  notes?: string | null;
  dueAtUtc?: string | null;
  priority?: TaskPriority;
  assigneeUserId?: string | null;
  contactId?: string | null;
  enquiryId?: string | null;
  quotationId?: string | null;
  reminderLeadMinutes?: number | null;
  reminderChannels?: ReminderChannels;
  /** Null leaves them as they are; an empty list removes them all. */
  links?: ActivityLinkInput[] | null;
  recurrence?: RecurrenceDto | null;
  utcOffsetMinutes?: number;
}

export interface GetCrmTasksInput {
  assigneeUserId?: string | null;
  mine?: boolean;
  status?: CrmTaskStatus | null;
  contactId?: string | null;
  enquiryId?: string | null;
  quotationId?: string | null;
  overdueOnly?: boolean;
  dueBeforeUtc?: string | null;
  filter?: string | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface CrmTaskSummaryDto {
  open?: number;
  overdue?: number;
  dueToday?: number;
  dueThisWeek?: number;
  noDate?: number;
  doneLast7Days?: number;
}

// ---- meetings ----

export interface MeetingAttendeeDto {
  id?: string;
  userId?: string | null;
  name?: string;
  email?: string | null;
  response?: AttendeeResponse;
}

export interface MeetingDto {
  id?: string;
  title?: string;
  description?: string | null;
  startUtc?: string;
  endUtc?: string;
  kind?: MeetingKind;
  location?: string | null;
  meetingUrl?: string | null;
  status?: MeetingStatus;
  organizerUserId?: string;
  organizerName?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  enquiryId?: string | null;
  enquiryReference?: string | null;
  outcome?: string | null;
  cancelReason?: string | null;
  reminderLeadMinutes?: number;
  reminderChannels?: ReminderChannels;
  remindCustomer?: boolean;
  links?: ActivityLinkDto[];
  attendees?: MeetingAttendeeDto[];
  seriesId?: string | null;
  seriesIndex?: number;
  seriesTotal?: number;
}

export interface GuestDto {
  name: string;
  email?: string | null;
}

export interface CreateUpdateMeetingDto {
  title: string;
  description?: string | null;
  startUtc: string;
  endUtc: string;
  kind?: MeetingKind;
  location?: string | null;
  meetingUrl?: string | null;
  contactId?: string | null;
  enquiryId?: string | null;
  reminderLeadMinutes?: number;
  reminderChannels?: ReminderChannels;
  remindCustomer?: boolean;
  links?: ActivityLinkInput[] | null;
  attendeeUserIds?: string[];
  guests?: GuestDto[];
  allowConflicts?: boolean;
  recurrence?: RecurrenceDto | null;
  utcOffsetMinutes?: number;
}

export interface GetMeetingsInput {
  fromUtc: string;
  toUtc: string;
  userId?: string | null;
  everyone?: boolean;
  enquiryId?: string | null;
  contactId?: string | null;
  includeCancelled?: boolean;
}

export interface CheckConflictsInput {
  startUtc: string;
  endUtc: string;
  userIds: string[];
  excludeMeetingId?: string | null;
  bufferMinutes?: number;
}

export interface MeetingConflictDto {
  userId?: string;
  userName?: string;
  meetingId?: string;
  title?: string;
  startUtc?: string;
  endUtc?: string;
}

export interface SuggestSlotsInput {
  userIds: string[];
  durationMinutes?: number;
  fromUtc: string;
  toUtc: string;
  workStartMinute?: number;
  workEndMinute?: number;
  utcOffsetMinutes?: number;
  includeWeekends?: boolean;
  bufferMinutes?: number;
  excludeMeetingId?: string | null;
  max?: number;
}

export interface SlotDto {
  startUtc?: string;
  endUtc?: string;
}

export interface IcsFileDto {
  fileName?: string;
  content?: string;
}

/** Ways a reminder goes out besides the bell; a set of flags. */
export enum ReminderChannels {
  None = 0,
  Email = 1,
  WhatsApp = 2,
  Sms = 4,
}

export enum ActivityLinkType {
  Contact = 1,
  Account = 2,
  Enquiry = 3,
  Quotation = 4,
  SalesOrder = 5,
  SalesInvoice = 6,
  DeliveryChallan = 7,
  Campaign = 8,
  ServiceTicket = 9,
}

export interface ActivityLinkInput {
  type: ActivityLinkType;
  recordId: string;
}

export interface ActivityLinkDto {
  type?: ActivityLinkType;
  recordId?: string;
  label?: string;
}

export interface SearchActivityLinksInput {
  type: ActivityLinkType;
  filter?: string | null;
  maxResultCount?: number;
}

export interface ShareActivityInput {
  userIds: string[];
  channels?: ReminderChannels;
  note?: string | null;
}

export interface ActivitySendLineDto {
  name?: string;
  channel?: ReminderChannels;
  sent?: boolean;
  note?: string;
}

export interface ActivitySendResultDto {
  lines?: ActivitySendLineDto[];
}

export interface ActivityMessagingSettingsDto {
  smsTemplateId?: string | null;
  taskTemplateApproved?: boolean;
  meetingTemplateApproved?: boolean;
}

export interface UpdateActivityMessagingSettingsInput {
  smsTemplateId?: string | null;
}
