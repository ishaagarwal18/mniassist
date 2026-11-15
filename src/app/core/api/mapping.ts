import {
  ChannelDto,
  ChannelHealthDto,
  ChannelState,
  DisplayNameStatus,
  MessagingTier as ApiMessagingTier,
  QualityRating as ApiQualityRating,
} from '../../proxy/channels';
import {
  ConsentSource as ApiConsentSource,
  ContactDto,
  DecisionRole,
  SegmentDto,
} from '../../proxy/contacts';
import {
  ConversationDto,
  MessageDto,
  MessageDirection,
  MessageStatus,
} from '../../proxy/messaging';
import { environment } from '../../../environments/environment';
import { Channel, MessagingTier, QualityRating } from '../models/channel.model';
import { Contact, ConsentSource, Segment } from '../models/contact.model';
import { Conversation, Message, MessageMedia } from '../models/conversation.model';

/**
 * Server DTOs to view models.
 *
 * `dto.id!` appears throughout: ABP's `EntityDto<TKey>` declares `id` optional
 * because the same type is reused for create payloads, but every DTO the API
 * returns has one. Threading `string | undefined` through the view models would
 * make every template guard against a case the server cannot produce.
 *
 * These live in one place on purpose. The DTOs are generated and will be
 * regenerated; the view models are hand-shaped for the screens. Keeping the
 * translation here means a change on either side shows up as a type error in a
 * single file rather than scattered through components.
 */

const QUALITY: Record<ApiQualityRating, QualityRating> = {
  [ApiQualityRating.Unknown]: 'unknown',
  [ApiQualityRating.Green]: 'green',
  [ApiQualityRating.Yellow]: 'yellow',
  [ApiQualityRating.Red]: 'red',
};

const TIER: Record<ApiMessagingTier, MessagingTier> = {
  [ApiMessagingTier.Starting]: 'starting',
  [ApiMessagingTier.Tier1]: 'tier1',
  [ApiMessagingTier.Tier2]: 'tier2',
  [ApiMessagingTier.Tier3]: 'tier3',
  [ApiMessagingTier.Tier4]: 'tier4',
};

const NAME_STATUS: Record<DisplayNameStatus, Channel['nameStatus']> = {
  [DisplayNameStatus.Pending]: 'pending',
  [DisplayNameStatus.Approved]: 'approved',
  [DisplayNameStatus.Rejected]: 'rejected',
};

const CONSENT_SOURCE: Record<ApiConsentSource, ConsentSource> = {
  [ApiConsentSource.Website]: 'website',
  [ApiConsentSource.WhatsAppOptIn]: 'whatsapp_optin',
  [ApiConsentSource.Import]: 'import',
  [ApiConsentSource.ClickToWhatsApp]: 'ctwa',
  [ApiConsentSource.QrCode]: 'qr',
  [ApiConsentSource.Manual]: 'manual',
  [ApiConsentSource.Api]: 'api',
  [ApiConsentSource.EmailOptIn]: 'email_optin',
  [ApiConsentSource.SmsOptIn]: 'sms_optin',
  [ApiConsentSource.VoiceOptIn]: 'voice_optin',
  [ApiConsentSource.InstagramOptIn]: 'instagram',
  [ApiConsentSource.MessengerOptIn]: 'messenger',
  [ApiConsentSource.ConsentManager]: 'consent_manager',
  [ApiConsentSource.LeadAd]: 'lead_ad',
};

const DECISION_ROLE: Record<
  DecisionRole,
  NonNullable<Contact['attributes']['decisionRole']> | undefined
> = {
  [DecisionRole.Unknown]: undefined,
  [DecisionRole.Maintenance]: 'Maintenance',
  [DecisionRole.Purchase]: 'Purchase',
  [DecisionRole.Engineering]: 'Engineering',
  [DecisionRole.PlantHead]: 'Plant head',
  [DecisionRole.Dealer]: 'Dealer',
};

export function toChannel(dto: ChannelDto, health?: ChannelHealthDto): Channel {
  return {
    supportsVoiceAi: true,
    id: dto.id!,
    wabaId: dto.wabaId ?? '',
    phoneNumberId: dto.phoneNumberId ?? '',
    displayPhone: dto.displayPhoneNumber ?? '',
    displayName: dto.verifiedName ?? '',
    nameStatus: dto.displayNameStatus != null ? NAME_STATUS[dto.displayNameStatus] : 'pending',
    quality: dto.quality != null ? QUALITY[dto.quality] : 'unknown',
    tier: dto.tier != null ? TIER[dto.tier] : 'starting',
    // Usage comes from the health endpoint because it is portfolio-scoped: the
    // channel row alone cannot know what its sibling numbers have consumed.
    used24h: health?.used24h ?? 0,
    throughput: dto.throughputMps ?? 0,
    restricted: dto.state === ChannelState.Restricted || dto.state === ChannelState.Suspended,
  };
}

export function toSegment(dto: SegmentDto): Segment {
  return {
    id: dto.id!,
    name: dto.name ?? '',
    count: dto.cachedMemberCount ?? 0,
  };
}

export function toContact(dto: ContactDto): Contact {
  const attributes = dto.attributes ?? {};
  const systems = attributes['systems']
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    id: dto.id!,
    name: dto.displayName ?? dto.waId ?? '',
    phoneE164: formatWaId(dto.waId),
    company: [dto.companyName, dto.city].filter(Boolean).join(' · '),
    attributes: {
      industry: attributes['industry'],
      plantLocation: attributes['plant_location'] ?? dto.city,
      systems: systems?.length ? systems : undefined,
      decisionRole: dto.role != null ? DECISION_ROLE[dto.role] : undefined,
      capexBand: attributes['capex_band'],
    },
    consent: {
      source: dto.consentSource != null ? CONSENT_SOURCE[dto.consentSource] : 'manual',
      evidence: attributes['consent_evidence'] ?? '—',
      textVersion: attributes['consent_text_version'] ?? '—',
      grantedAt: formatDate(dto.consentAtUtc),
    },
    amcExpiry: attributes['amc_expiry'],
    lastActivity: formatRelative(dto.lastInboundAtUtc ?? dto.lastOutboundAtUtc),
    score: dto.engagementScore ?? 0,
    stored: {
      companyName: dto.companyName ?? undefined,
      emailAddress: dto.emailAddress ?? attributes['email'] ?? undefined,
      website: attributes['website'] ?? undefined,
      accountId: dto.accountId ?? undefined,
      city: dto.city ?? undefined,
      state: dto.state ?? undefined,
      designation: dto.designation ?? undefined,
      role: dto.role,
      languageCode: dto.languageCode,
      ownerUserId: dto.ownerUserId ?? undefined,
      tags: dto.tags ?? [],
    },
  };
}

/** Channels whose contacts have no phone number, keyed by the API's ChannelKind. WhatsApp (0) is absent on purpose. */
const PHONELESS_CHANNEL: Record<number, string | undefined> = {
  1: 'Instagram',
  2: 'Messenger',
  4: 'Email',
};

/** Email has no service window: a reply is never blocked waiting for one. */
const EMAIL_CHANNEL = 4;

/** SMS has no service window either, but every reply must be an approved DLT template. */
const SMS_CHANNEL = 3;

export function toConversation(
  dto: ConversationDto,
  messages: readonly Message[] = [],
): Conversation {
  return {
    id: dto.id!,
    contactId: dto.contactId ?? undefined,
    contactName: dto.contactDisplayName ?? formatWaId(dto.contactWaId),
    company: dto.contactCompanyName ?? '',
    phoneE164: formatWaId(dto.contactWaId),
    channel: dto.channelKind === SMS_CHANNEL ? 'SMS' : PHONELESS_CHANNEL[dto.channelKind ?? 0],
    windowless:
      dto.channelKind === EMAIL_CHANNEL || dto.channelKind === SMS_CHANNEL ? true : undefined,
    sms: dto.channelKind === SMS_CHANNEL ? true : undefined,
    snippet: dto.lastMessagePreview ?? '',
    at: formatClock(dto.lastInboundAtUtc ?? dto.lastOutboundAtUtc),
    unread: dto.unreadCount ?? 0,
    // A closed window is null rather than a past date, because the composer
    // branches on "is there a window" and a stale timestamp reads as an open one.
    window: {
      expiresAt:
        dto.isWindowOpen && dto.windowExpiresAtUtc ? new Date(dto.windowExpiresAtUtc) : null,
    },
    messages,
  };
}

export function toMessage(dto: MessageDto, conversationId?: string): Message {
  return {
    id: dto.id!,
    direction: dto.direction === MessageDirection.Inbound ? 'in' : 'out',
    body: dto.body ?? '',
    at: formatClock(dto.sentAtUtc ?? dto.creationTime),
    status: dto.status != null ? toMessageStatus(dto.status) : undefined,
    pending: dto.status === MessageStatus.Queued || undefined,
    failure:
      dto.status === MessageStatus.Failed
        ? dto.errorTitle?.trim() || 'WhatsApp did not accept it.'
        : undefined,
    opens: dto.openCount ? dto.openCount : undefined,
    lastOpenedAt: dto.lastOpenedAtUtc ? formatClock(dto.lastOpenedAtUtc) : undefined,
    media: toMessageMedia(dto, conversationId),
    mediaRemoved: dto.mediaScan === 2,
    location:
      dto.locationLatitude != null && dto.locationLongitude != null
        ? {
            latitude: dto.locationLatitude,
            longitude: dto.locationLongitude,
            name: dto.locationName ?? undefined,
            address: dto.locationAddress ?? undefined,
          }
        : undefined,
    buttons: toMessageButtons(dto.interactiveJson),
    providerId: dto.waMessageId ?? undefined,
  };
}

/** An extra attachment row's id is its message's id plus #n (SocialAttachments.RowId on the API). */
const EXTRA_ROW = /^(.+)#(\d+)$/;

/**
 * Folds Messenger/Instagram extra-attachment rows (mid#2, mid#3…) into the message they came with, in order, so a
 * message with three photos reads as one bubble. A row whose message isn't loaded (an older page) stays on its own.
 */
export function groupAttachmentRows(messages: readonly Message[]): Message[] {
  const byProvider = new Map<string, number>();
  messages.forEach((m, i) => {
    if (m.providerId && !EXTRA_ROW.test(m.providerId)) byProvider.set(m.providerId, i);
  });

  const extras = new Map<number, { n: number; m: Message }[]>();
  const folded = new Set<number>();
  messages.forEach((m, i) => {
    const match = m.providerId ? EXTRA_ROW.exec(m.providerId) : null;
    const parent = match ? byProvider.get(match[1]) : undefined;
    if (match && parent !== undefined) {
      const list = extras.get(parent) ?? [];
      list.push({ n: Number(match[2]), m });
      extras.set(parent, list);
      folded.add(i);
    }
  });

  if (folded.size === 0) return [...messages];
  return messages.flatMap((m, i) => {
    if (folded.has(i)) return [];
    const list = extras.get(i);
    return list ? [{ ...m, extras: list.sort((a, b) => a.n - b.n).map((e) => e.m) }] : [m];
  });
}

function toMessageButtons(json: string | null | undefined) {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as { buttons?: { id?: string; title?: string }[] };
    const buttons = (parsed.buttons ?? []).map((b) => ({ id: b.id ?? '', title: b.title ?? '' }));
    return buttons.length ? buttons : undefined;
  } catch {
    return undefined;
  }
}

function toMessageMedia(dto: MessageDto, conversationId?: string): MessageMedia | undefined {
  if (!dto.mediaBlobRef || !conversationId || !dto.id) {
    return undefined;
  }

  const base = environment.apis['AutoReach']?.url ?? environment.apis.default.url;
  const mime = dto.mediaMimeType ?? 'application/octet-stream';

  const url = `${base}/api/auto-reach/inbox/${conversationId}/messages/${dto.id}/media`;
  return {
    url,
    thumbnailUrl: mime.startsWith('image/') ? `${url}/thumbnail` : undefined,
    mimeType: mime,
    fileName: dto.mediaFileName ?? undefined,
    kind: mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('video/')
        ? 'video'
        : mime.startsWith('audio/')
          ? 'audio'
          : 'document',
  };
}

function toMessageStatus(status: MessageStatus): Message['status'] {
  switch (status) {
    case MessageStatus.Sent:
      return 'sent';
    case MessageStatus.Delivered:
      return 'delivered';
    case MessageStatus.Read:
      return 'read';
    default:
      // Queued, failed and withheld have no tick to show. Falling back to 'sent'
      // would tell the agent a failed message went out.
      return undefined;
  }
}

/** wa_id has no plus and no spacing. Rendered as +91 XXXXX XXXXX for Indian numbers. */
function formatWaId(waId: string | null | undefined): string {
  if (!waId) return '';
  const digits = waId.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  return `+${digits}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatClock(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const today = new Date();

  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return sameDay
    ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'No activity';

  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;

  return formatDate(iso);
}
