import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ChannelService } from '../../core/services/channel.service';
import {
  ChatEntryPoint,
  ChatEntryPointAssets,
  ChatWidgetStore,
  ENTRY_POINT_SOURCES,
  SOURCE_LABEL,
} from '../../core/services/chat-widget.store';
import { LeadSource } from '../../proxy/pipeline/lead-source.enum';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ConfirmService } from '../../core/ui/confirm.service';

interface Draft {
  channelId: string;
  name: string;
  source: LeadSource;
  prefilledMessage: string;
  isActive: boolean;
}

/**
 * Website chat widget and QR code generator (M11-3). Each row is a tracked way into
 * a WhatsApp chat — a slug rides in on the pre-filled message and the inbound
 * handler reads it back, so "how many scans did the stall QR get" has an answer.
 */
@Component({
  selector: 'ar-chat-widgets',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-widgets.html',
  styleUrl: './chat-widgets.scss',
})
export class ArChatWidgets {
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(ChatWidgetStore);
  protected readonly channels = inject(ChannelService);

  protected readonly sources = ENTRY_POINT_SOURCES;
  protected readonly sourceLabel = SOURCE_LABEL;

  protected readonly entryPoints = this.store.entryPoints;
  protected readonly loading = this.store.loading;

  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draft = signal<Draft>(this.blankDraft());
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly assetsOpen = signal(false);
  protected readonly assetsFor = signal<ChatEntryPoint | null>(null);
  protected readonly assets = signal<ChatEntryPointAssets | null>(null);
  protected readonly assetsLoading = signal(false);
  protected readonly copied = signal<string | null>(null);

  protected readonly totalClicks = computed(() =>
    this.entryPoints().reduce((sum, e) => sum + e.clickCount, 0),
  );

  private blankDraft(): Draft {
    return {
      channelId: this.channels.active()?.id ?? this.channels.channels()[0]?.id ?? '',
      name: '',
      source: LeadSource.Website,
      prefilledMessage: '',
      isActive: true,
    };
  }

  protected patch<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.draft.set(this.blankDraft());
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected openEdit(entry: ChatEntryPoint): void {
    this.editingId.set(entry.id);
    this.draft.set({
      channelId: entry.channelId,
      name: entry.name,
      source: entry.source,
      prefilledMessage: entry.prefilledMessage,
      isActive: entry.isActive,
    });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d.name.trim() || !d.channelId) {
      this.error.set('A name and a channel are required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const id = this.editingId();
      if (id) {
        await this.store.update(id, {
          name: d.name.trim(),
          source: d.source,
          prefilledMessage: d.prefilledMessage.trim(),
          isActive: d.isActive,
        });
      } else {
        await this.store.create({
          channelId: d.channelId,
          name: d.name.trim(),
          source: d.source,
          prefilledMessage: d.prefilledMessage.trim(),
          isActive: d.isActive,
        });
      }
      this.editorOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save this entry point.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(entry: ChatEntryPoint): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'this chat link',
        entry.name,
        'The link and QR code stop being tracked.',
      ))
    )
      return;
    await this.store.remove(entry.id);
  }

  protected async openAssets(entry: ChatEntryPoint): Promise<void> {
    this.assetsFor.set(entry);
    this.assets.set(null);
    this.assetsOpen.set(true);
    this.assetsLoading.set(true);
    try {
      this.assets.set(await this.store.assets(entry.id));
    } finally {
      this.assetsLoading.set(false);
    }
  }

  protected async copy(what: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(what);
      setTimeout(() => this.copied.set(null), 1500);
    } catch {
      /* clipboard unavailable — the field is selectable */
    }
  }

  protected when(iso?: string): string {
    if (!iso) return 'never';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
