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

import { environment } from '../../../environments/environment';
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
import { ChannelService } from '../../core/services/channel.service';
import { ArChannelHealthStrip } from '../../ui/channel-health-strip';
import { ArDocumentPicker, PickedDocument } from './document-picker';
import { ArCallDialog } from '../calls/call-dialog';

@Component({
  selector: 'ar-inbox',
  imports: [
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inbox.html',
  styleUrl: './inbox.scss',
})
export class ArInbox {
  private readonly inbox = inject(InboxService);
  private readonly channels = inject(ChannelService);

  /** Re-emits every 30 seconds so every countdown below recomputes on its own. */
  private readonly now = tickingNow(30_000);

  protected readonly channel = this.channels.active;
  protected readonly conversations = this.inbox.conversations;
  protected readonly selected = this.inbox.selected;
  protected readonly unassigned = this.inbox.unassignedCount;

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

  constructor() {
    // Templates are fetched the first time an SMS conversation is opened, not for every inbox visit.
    effect(() => {
      if (!this.selected()?.sms || this.smsTemplatesLoaded || environment.useMockData) return;
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

  protected shareLocation(): void {
    if (!navigator.geolocation) {
      window.alert('This browser cannot read a location.');
      return;
    }
    this.sending.set(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await this.inbox.sendLocation(
            pos.coords.latitude,
            pos.coords.longitude,
            this.draft().trim() || 'Shared location',
          );
          this.draft.set('');
        } finally {
          this.sending.set(false);
        }
      },
      () => {
        this.sending.set(false);
        window.alert('Could not read your location — check the browser permission.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
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
      window.alert('A message and at least one button are needed.');
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
