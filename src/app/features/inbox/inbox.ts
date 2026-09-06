import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { InboxService } from '../../core/services/inbox.service';
import { Conversation } from '../../core/models/conversation.model';
import { untilLabel } from '../../core/util/format';
import { tickingNow } from '../../core/util/now';
import { ArTopbar } from '../../layout/topbar';
import { ArAvatar, ArButton, ArChip, ArDialog, ArIcon, ArSearchBox } from '../../ui';
import { ChannelService } from '../../core/services/channel.service';
import { ArChannelHealthStrip } from '../../ui/channel-health-strip';
import { ArDocumentPicker, PickedDocument } from './document-picker';

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

  protected readonly windowOpen = computed(() => this.windowLeft() !== null);

  protected windowChipFor(c: Conversation): { label: string; tone: 'teal' | 'bad' } | null {
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
