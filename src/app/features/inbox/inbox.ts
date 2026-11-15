import { readApiError } from '../../core/util/api-error';
import { ArMyMentions } from './my-mentions';
import { ArConversationLabelPicker } from './conversation-label-picker';
import { ArCannedReplyPicker } from './canned-reply-picker';
import { SNOOZE_CHOICES, SnoozeChoice, snoozeUntil } from './snooze.logic';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SmsChannelService, SmsTemplateDto } from '../../proxy/sms/sms-channel.service';
import { InboxService } from '../../core/services/inbox.service';
import { previewSms, sendableSmsTemplates, smsVariablesComplete } from './sms-logic';
import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../core/auth/permission';
import { PaymentService } from '../../proxy/payments/payment.service';
import { amountProblem } from '../payments/payment-logic';
import { Conversation } from '../../core/models/conversation.model';
import { untilLabel } from '../../core/util/format';
import { tickingNow } from '../../core/util/now';
import { ArTopbar } from '../../layout/topbar';
import { ArAvatar, ArButton, ArChip, ArDialog, ArIcon, ArSearchBox } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ChannelService } from '../../core/services/channel.service';
import { ArChannelHealthStrip } from '../../ui/channel-health-strip';
import { ArDocumentPicker, PickedDocument } from './document-picker';
import { ArSendReorderLink } from '../reorder/send-reorder-link';
import { ArCallDialog } from '../calls/call-dialog';
import { InboxService as InboxApi } from '../../proxy/messaging/inbox.service';
import {
  WhatsAppCallService,
  CallPermissionDto,
} from '../../proxy/messaging/whats-app-call.service';
import {
  PhotoDraftDto,
  PhotoQuoteService,
  PhotoReadingDto,
} from '../../proxy/pipeline/photo-quote.service';
import { BoqImportService } from '../../proxy/pipeline/boq-import.service';
import { inr } from '../../core/util/format';
import { RouterLink } from '@angular/router';
import { WhatsAppCallSession } from '../../core/services/whatsapp-call.session';
import { ToastService } from '../../core/ui/toast.service';
import { persistedToggle } from '../../core/util/persisted-toggle';

import { ConversationState } from '../../proxy/messaging/conversation-state.enum';
import { CurrentUserService } from '../../core/services/current-user.service';
import { ArAuthHref, ArAuthSrc } from '../../core/media/protected-media';
import { ArShareLocationDialog, SharedLocation } from './share-location-dialog';
@Component({
  selector: 'ar-inbox',
  imports: [
    ArMyMentions,
    ArConversationLabelPicker,
    ArCannedReplyPicker,
    ArAuthHref,
    ArAuthSrc,
    ArShareLocationDialog,
    ArSendReorderLink,
    ArTopbar,
    ArAvatar,
    ArChip,
    ArIcon,
    ArButton,
    ArDialog,
    ArSearchBox,
    ArChannelHealthStrip,
    ArDocumentPicker,
    ArCallDialog,
    RouterLink,
    ArSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inbox.html',
  styleUrl: './inbox.scss',
})
export class ArInbox {
  private readonly toasts = inject(ToastService);
  private readonly inbox = inject(InboxService);
  private readonly channels = inject(ChannelService);

  /** Re-emits every 30 seconds so every countdown below recomputes on its own. */
  private readonly now = tickingNow(30_000);

  protected readonly channel = this.channels.active;
  protected readonly conversations = this.inbox.conversations;

  /** The list can fold to a strip of avatars, for more room to read and write. */
  protected readonly listCollapsed = persistedToggle('ar.inbox.listCollapsed');
  protected readonly listQuery = signal('');
  protected readonly shownConversations = computed(() => {
    const q = this.listQuery().trim().toLowerCase();
    const all = this.conversations();
    if (!q) return all;
    return all.filter((c) =>
      [c.contactName, c.company, c.snippet, c.channel].some((v) => v?.toLowerCase().includes(q)),
    );
  });
  protected readonly selected = this.inbox.selected;
  protected readonly unassigned = this.inbox.unassignedCount;

  // ---- Filters ---------------------------------------------------------------------------
  protected readonly Status = ConversationState;
  protected readonly counts = this.inbox.counts;
  protected readonly listLoaded = this.inbox.listLoaded;
  protected readonly state = this.inbox.state;
  protected readonly unreadOnly = this.inbox.unreadOnly;
  protected readonly closingSoon = this.inbox.windowClosingSoon;
  protected readonly filtersOpen = signal(false);
  private readonly me = inject(CurrentUserService);
  protected readonly hasNumber = computed(() => this.channels.channels().length > 0);

  /** Only conversations assigned to the signed-in person. */
  protected readonly mineOnly = computed(() => {
    const a = this.assignee();
    return !!a && a.id === this.me.id();
  });

  protected readonly filterCount = computed(
    () =>
      (this.state() !== null ? 1 : 0) +
      (this.unreadOnly() ? 1 : 0) +
      (this.closingSoon() ? 1 : 0) +
      (this.assignee() ? 1 : 0),
  );

  protected setMine(on: boolean): void {
    const id = this.me.id();
    this.assignee.set(on && id ? { id, name: 'you' } : null);
  }

  protected clearFilters(): void {
    this.state.set(null);
    this.unreadOnly.set(false);
    this.closingSoon.set(false);
    this.assignee.set(null);
    this.listQuery.set('');
  }

  /** The whole composer hinges on this: with the window open, replies are
   *  free-form and cost nothing; once it closes, only an approved template
   *  can reopen the conversation. */
  protected readonly selectedId = this.inbox.selectedId;

  protected readonly windowLeft = computed(() => {
    const thread = this.selected();
    return thread ? untilLabel(thread.window.expiresAt, this.now()) : null;
  });

  /** The call dialog, open for the selected conversation's contact. */
  protected readonly calling = signal(false);

  protected readonly windowOpen = computed(
    () => !!this.selected()?.windowless || this.windowLeft() !== null,
  );

  protected windowChipFor(c: Conversation): { label: string; tone: 'teal' | 'bad' } | null {
    if (c.windowless) return null;
    const left = untilLabel(c.window.expiresAt, this.now());
    return left
      ? { label: `Window open · ${left}`, tone: 'teal' }
      : { label: 'Window closed', tone: 'bad' };
  }

  protected select(id: string): void {
    this.inbox.select(id);
  }

  // ---- Composer -----------------------------------------------------------

  protected readonly draft = signal('');
  protected readonly attached = signal<PickedDocument | null>(null);
  protected readonly pickerOpen = signal(false);
  protected readonly sending = signal(false);

  // ---- AI reply suggestions (M06-12) ------------------------------------
  protected readonly suggestions = signal<string[]>([]);
  protected readonly suggestBusy = signal(false);

  protected async suggestReplies(): Promise<void> {
    this.suggestBusy.set(true);
    try {
      this.suggestions.set(await this.inbox.suggestReplies());
    } finally {
      this.suggestBusy.set(false);
    }
  }

  // ---- Hand-off summary (Q5) -------------------------------------------------------------------------------------------
  private readonly inboxApi = inject(InboxApi);
  protected readonly summary = signal<{
    conversationId: string;
    text: string | null;
    by: string;
  } | null>(null);
  protected readonly summaryBusy = signal(false);

  // ---- snooze, auto-assign, mentions ---------------------------------
  protected readonly snoozeChoices = SNOOZE_CHOICES;
  protected readonly cannedOpen = signal(false);

  /** A saved reply goes into the draft (after anything already typed) for a last look before sending. */
  protected useCanned(text: string): void {
    const current = this.draft().trim();
    this.draft.set(
      current
        ? `${current}
${text}`
        : text,
    );
    this.cannedOpen.set(false);
  }
  protected readonly snoozeOpen = signal(false);
  protected readonly mentionsOpen = signal(false);
  protected readonly threadBusy = signal<string | null>(null);

  protected async snooze(conversationId: string, choice: SnoozeChoice): Promise<void> {
    this.snoozeOpen.set(false);
    const until = snoozeUntil(choice);
    await this.threadAction('snooze', async () => {
      await this.inbox.snooze(conversationId, until);
      this.toasts.success(
        `Snoozed until ${until.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}. A reply from the customer brings it back.`,
        'Inbox',
      );
    });
  }

  protected async autoAssign(conversationId: string): Promise<void> {
    await this.threadAction('assign', async () => {
      await this.inbox.autoAssign(conversationId);
      this.toasts.success('Assigned by your routing rules.', 'Inbox');
    });
  }

  protected openMention(conversationId: string): void {
    this.mentionsOpen.set(false);
    this.inbox.select(conversationId);
  }

  private async threadAction(key: string, work: () => Promise<void>): Promise<void> {
    this.threadBusy.set(key);
    try {
      await work();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'That did not work. Try again.'), 'Inbox');
    } finally {
      this.threadBusy.set(null);
    }
  }

  protected async summarise(conversationId: string): Promise<void> {
    this.summaryBusy.set(true);
    try {
      const r = await firstValueFrom(this.inboxApi.summarise(conversationId));
      this.summary.set({ conversationId, text: r.summary ?? null, by: r.providerName });
    } catch (e: unknown) {
      this.summary.set({
        conversationId,
        text: null,
        by: this.problem(e, 'The summary could not be written.'),
      });
    } finally {
      this.summaryBusy.set(false);
    }
  }

  // ---- Quote from a nameplate or RFQ photo (S2) ------------------------------------------------------------------------
  private readonly photos = inject(PhotoQuoteService);
  protected readonly photo = signal<{ conversationId: string; messageId: string } | null>(null);
  protected readonly photoReading = signal<PhotoReadingDto | null>(null);
  protected readonly photoDraft = signal<PhotoDraftDto | null>(null);
  protected readonly photoBusy = signal(false);
  protected readonly photoError = signal<string | null>(null);
  /** The customer's other readable attachments in this conversation, and the ones chosen to go into the same draft. */
  protected readonly photoOthers = signal<{ id: string; label: string }[]>([]);
  protected readonly photoMore = signal<string[]>([]);
  /** Files read into one draft besides the first: twelve in all (DraftQuoteFromPhotoInput.MaxMoreFiles). */
  protected readonly maxMoreFiles = 11;
  private readonly mayQuote = grantedPolicy(
    'AutoReach.Quotations.Create',
    inject(PermissionService),
  );
  /** The longer route for a BOQ: read in the background, then every line checked on the review page before a draft is made. */
  private readonly boqImports = inject(BoqImportService);
  private readonly router = inject(Router);
  protected readonly mayImport = grantedPolicy(
    'AutoReach.Quotations.Import',
    inject(PermissionService),
  );
  /** Photos can be read only with an AI model set up; until then "Quote from this photo" isn't offered (it could only fail). */
  private readonly photosReadable = signal(false);
  protected readonly canQuote = computed(() => this.mayQuote() && this.photosReadable());

  // ---- Spares re-order portal: send this customer their personal link -------------------------------------------------
  protected readonly canReorder = grantedPolicy(
    'AutoReach.ReorderPortal.SendLinks',
    inject(PermissionService),
  );
  protected readonly reorderFor = signal<{ id: string; name: string } | null>(null);

  protected async readPhoto(
    conversationId: string,
    messageId: string,
    messages: readonly {
      id: string;
      direction: string;
      media?: { kind: string; mimeType: string; fileName?: string | null } | null;
    }[] = [],
  ): Promise<void> {
    this.photo.set({ conversationId, messageId });
    this.photoMore.set([]);
    this.photoOthers.set(
      messages
        .filter(
          (m) =>
            m.id !== messageId &&
            m.direction === 'in' &&
            !!m.media &&
            (m.media.kind === 'image' || this.isQuotable(m.media.mimeType)),
        )
        .slice(-12)
        .map((m) => ({
          id: m.id,
          label: m.media!.kind === 'image' ? 'Photo' : m.media!.fileName || 'Document',
        })),
    );
    this.photoReading.set(null);
    this.photoDraft.set(null);
    this.photoError.set(null);
    this.photoBusy.set(true);
    try {
      this.photoReading.set(await firstValueFrom(this.photos.read({ conversationId, messageId })));
    } catch (e: unknown) {
      this.photoError.set(this.problem(e, 'The file could not be read.'));
    } finally {
      this.photoBusy.set(false);
    }
  }

  protected async draftFromPhoto(): Promise<void> {
    const p = this.photo();
    if (!p) return;
    this.photoBusy.set(true);
    this.photoError.set(null);
    try {
      this.photoDraft.set(
        await firstValueFrom(
          this.photos.draft({ ...p, enquiryId: null, moreMessageIds: this.photoMore() }),
        ),
      );
    } catch (e: unknown) {
      this.photoError.set(this.problem(e, 'The quotation could not be drafted.'));
    } finally {
      this.photoBusy.set(false);
    }
  }

  /** Starts a BOQ import from this file (and any others ticked) and opens its review page. */
  protected async reviewFromPhoto(): Promise<void> {
    const p = this.photo();
    if (!p) return;
    this.photoBusy.set(true);
    this.photoError.set(null);
    try {
      const started = await firstValueFrom(
        this.boqImports.startFromConversation({
          conversationId: p.conversationId,
          messageIds: [p.messageId, ...this.photoMore()],
        }),
      );
      this.photo.set(null);
      await this.router.navigate(['/quotations/import', started.id]);
    } catch (e: unknown) {
      this.photoError.set(this.problem(e, 'The file could not be sent for review.'));
    } finally {
      this.photoBusy.set(false);
    }
  }

  protected toggleMore(id: string, on: boolean): void {
    this.photoMore.update((ids) =>
      on
        ? [...ids.filter((x) => x !== id), id].slice(0, this.maxMoreFiles)
        : ids.filter((x) => x !== id),
    );
  }

  /** PDFs, Excel (.xlsx and .xls) sheets and CSVs can be read into a draft quote; images have their own button. */
  protected isQuotable(mimeType: string): boolean {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ].includes(mimeType);
  }

  protected money(paise: number | null | undefined): string {
    return paise == null ? '—' : inr(paise);
  }

  protected matchLabel(match: string): string {
    return match === 'exact' ? 'In catalogue' : match === 'similar' ? 'Similar part' : 'Not found';
  }

  // ---- WhatsApp call permission (M3) -----------------------------------------------------------------------------------
  private readonly callsApi = inject(WhatsAppCallService);
  protected readonly calls = inject(WhatsAppCallSession);
  protected readonly callPermission = signal<{
    conversationId: string;
    value: CallPermissionDto | null;
    note?: string;
  } | null>(null);

  protected async askToCall(conversationId: string): Promise<void> {
    try {
      const value = await firstValueFrom(this.callsApi.requestPermission(conversationId));
      this.callPermission.set({
        conversationId,
        value,
        note: 'Asked. They can now call you on WhatsApp; their answer shows here.',
      });
    } catch (e: unknown) {
      this.callPermission.set({
        conversationId,
        value: null,
        note: this.problem(e, 'The request could not be sent.'),
      });
    }
  }

  /** The AI agent calling this conversation's customer: the reason is optional, the server checks permission and hours. */
  protected readonly aiCall = signal<{
    conversationId: string;
    purpose: string;
    note: string;
    busy: boolean;
    /** whatsapp, or phone: the workspace's phone line (Exotel). */
    line?: 'whatsapp' | 'phone' | 'sip';
  } | null>(null);

  protected async placeAiCall(): Promise<void> {
    const current = this.aiCall();
    if (!current || current.busy) return;
    this.aiCall.set({ ...current, busy: true, note: '' });
    let note: string;
    try {
      const input = { purpose: current.purpose.trim() || null };
      if (current.line === 'phone' || current.line === 'sip') {
        await firstValueFrom(
          this.callsApi.startPhoneAi(current.conversationId, {
            ...input,
            line: current.line === 'sip' ? 'sip' : 'exotel',
          }),
        );
        note =
          'The AI agent is calling on the phone line. Its transcript appears on the call in the call log.';
      } else {
        await firstValueFrom(this.callsApi.startAi(current.conversationId, input));
        note =
          'The AI agent is calling. Its transcript appears under AI conversations on the WhatsApp calls page.';
      }
    } catch (e: unknown) {
      note = this.problem(e, 'The AI call could not be placed.');
    }
    if (this.aiCall()?.conversationId === current.conversationId)
      this.aiCall.set({ ...current, busy: false, note });
  }

  private problem(e: unknown, fallback: string): string {
    return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
  }

  protected useSuggestion(text: string): void {
    this.draft.set(text);
    this.suggestions.set([]);
  }

  protected async send(): Promise<void> {
    const doc = this.attached();
    const text = this.draft().trim();
    if (!doc && !text) return;

    this.sending.set(true);
    try {
      if (doc) {
        await this.inbox.sendDocument(doc.id, text || undefined);
      } else {
        await this.inbox.sendText(text);
      }
      this.draft.set('');
      this.attached.set(null);
    } finally {
      this.sending.set(false);
    }
  }

  // ---- SMS replies: an approved DLT template, never free text -----------------------------------------------------

  private readonly sms = inject(SmsChannelService);
  private smsTemplatesLoaded = false;
  protected readonly smsTemplates = signal<SmsTemplateDto[]>([]);
  protected readonly smsTemplate = signal<SmsTemplateDto | null>(null);
  protected readonly smsValues = signal<Record<string, string>>({});
  protected readonly smsError = signal<string | null>(null);

  protected readonly smsPreview = computed(() => {
    const t = this.smsTemplate();
    return t ? previewSms(t, this.smsValues()) : '';
  });

  protected readonly smsReady = computed(() => {
    const t = this.smsTemplate();
    return !!t && smsVariablesComplete(t, this.smsValues());
  });

  /** The agent filter, when the inbox was opened for one agent's conversations. */
  protected readonly assignee = this.inbox.assignee;

  constructor() {
    if (this.mayQuote()) {
      firstValueFrom(this.photos.getAvailable())
        .then((available) => this.photosReadable.set(available === true))
        .catch(() => this.photosReadable.set(false));
    }

    // /inbox?assignee={userId}&name={userName}: one agent's queue, from Analytics' agent table.
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const assigneeId = query.get('assignee');
    if (assigneeId)
      this.inbox.assignee.set({ id: assigneeId, name: query.get('name') ?? 'one agent' });

    // /inbox?conversation={id}: straight to one conversation, from a browser notification (M06-11).
    const conversationId = query.get('conversation');
    if (conversationId) this.inbox.select(conversationId);

    // Templates are fetched the first time an SMS conversation is opened, not for every inbox visit.
    effect(() => {
      if (!this.selected()?.sms || this.smsTemplatesLoaded) return;
      this.smsTemplatesLoaded = true;
      untracked(() => {
        firstValueFrom(this.sms.getTemplates())
          .then((all) => this.smsTemplates.set(sendableSmsTemplates(all)))
          .catch(() => (this.smsTemplatesLoaded = false));
      });
    });
  }

  protected pickSmsTemplate(id: string): void {
    this.smsTemplate.set(this.smsTemplates().find((t) => t.id === id) ?? null);
    this.smsValues.set({});
  }

  protected smsValue(name: string): string {
    return Object.hasOwn(this.smsValues(), name) ? this.smsValues()[name] : '';
  }

  protected setSmsValue(name: string, value: string): void {
    this.smsValues.update((v) => ({ ...v, [name]: value }));
  }

  protected async sendSms(contactId: string | undefined): Promise<void> {
    const t = this.smsTemplate();
    if (!t || !contactId || !this.smsReady()) return;
    this.sending.set(true);
    this.smsError.set(null);
    try {
      await firstValueFrom(
        this.sms.send({ contactId, templateId: t.id, variables: this.smsValues() }),
      );
      this.smsTemplate.set(null);
      this.smsValues.set({});
      this.inbox.reload();
    } catch (e: unknown) {
      this.smsError.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'The SMS could not be sent.',
      );
    } finally {
      this.sending.set(false);
    }
  }

  // ---- Payment requests (BillDesk) -----------------------------------------------------------------------------------

  private readonly paymentsApi = inject(PaymentService);
  protected readonly canRequestPayment = grantedPolicy(
    'AutoReach.Payments.Request',
    inject(PermissionService),
  );
  protected readonly paymentOpen = signal(false);
  protected readonly payAmount = signal('');
  protected readonly payDescription = signal('');
  protected readonly payError = signal<string | null>(null);

  protected openPayment(): void {
    this.payAmount.set('');
    this.payDescription.set('');
    this.payError.set(null);
    this.paymentOpen.set(true);
  }

  protected async requestPayment(conversationId: string): Promise<void> {
    const problem = amountProblem(this.payAmount());
    if (problem) {
      this.payError.set(problem);
      return;
    }
    if (!this.payDescription().trim()) {
      this.payError.set("Say what it's for, so the customer recognises it.");
      return;
    }

    this.sending.set(true);
    this.payError.set(null);
    try {
      await firstValueFrom(
        this.paymentsApi.create({
          conversationId,
          amount: Number(this.payAmount().trim().replace(/,/g, '')),
          description: this.payDescription().trim(),
        }),
      );
      this.paymentOpen.set(false);
      this.inbox.reload();
    } catch (e: unknown) {
      this.payError.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'The payment link could not be sent.',
      );
    } finally {
      this.sending.set(false);
    }
  }

  protected onPick(doc: PickedDocument): void {
    this.attached.set(doc);
    this.pickerOpen.set(false);
  }

  // ---- Rich sends (M06-6) ----------------------------------------------

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.sending.set(true);
    try {
      await this.inbox.sendMedia(file, this.draft().trim() || undefined);
      this.draft.set('');
    } finally {
      this.sending.set(false);
    }
  }

  /** The share-location dialog: a typed place (usually the business's address) or this device's position. */
  protected readonly locationOpen = signal(false);

  protected shareLocation(): void {
    this.locationOpen.set(true);
  }

  protected async sendLocation(location: SharedLocation): Promise<void> {
    this.locationOpen.set(false);
    this.sending.set(true);
    try {
      await this.inbox.sendLocation(
        location.latitude,
        location.longitude,
        location.name ?? (this.draft().trim() || 'Shared location'),
        location.address,
      );
      if (!location.name) this.draft.set('');
    } finally {
      this.sending.set(false);
    }
  }

  // Reply-button composer
  protected readonly buttonsOpen = signal(false);
  protected readonly btnBody = signal('');
  protected readonly btnFooter = signal('');
  protected readonly btnTitles = signal<string[]>(['', '', '']);

  protected openButtons(): void {
    this.btnBody.set(this.draft().trim());
    this.btnFooter.set('');
    this.btnTitles.set(['', '', '']);
    this.buttonsOpen.set(true);
  }

  protected setBtnTitle(i: number, value: string): void {
    this.btnTitles.update((t) => t.map((x, j) => (j === i ? value : x)));
  }

  protected async sendButtons(): Promise<void> {
    const titles = this.btnTitles()
      .map((t) => t.trim())
      .filter(Boolean);
    if (!this.btnBody().trim() || titles.length === 0) {
      this.toasts.warning('A message and at least one button are needed.', 'Buttons');
      return;
    }
    this.sending.set(true);
    try {
      await this.inbox.sendButtons(
        this.btnBody(),
        this.btnFooter() || undefined,
        titles.map((title) => ({ title })),
      );
      this.buttonsOpen.set(false);
      this.draft.set('');
    } finally {
      this.sending.set(false);
    }
  }
}
