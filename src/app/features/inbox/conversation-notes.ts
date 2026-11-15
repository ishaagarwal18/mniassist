import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ActivityDirectory } from '../activities/activity-directory';
import { ConversationNoteService } from '../../proxy/messaging/conversation-note.service';
import type { ConversationNoteDto } from '../../proxy/messaging/models';
import { ArButton } from '../../ui';
import {
  MentionPerson,
  insertMention,
  matchPeople,
  mentionQuery,
  mentionedIds,
} from './note-mentions';

/**
 * Internal notes on a conversation: only the team sees them, never the customer. Typing "@" suggests teammates;
 * the people mentioned are notified and find the note under "My @mentions". Only a note's author can delete it.
 */
@Component({
  selector: 'ar-conversation-notes',
  imports: [ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conversation-notes.html',
  styleUrl: './conversation-notes.scss',
})
export class ArConversationNotes {
  private readonly api = inject(ConversationNoteService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly directory = inject(ActivityDirectory);

  readonly conversationId = input.required<string>();

  protected readonly canWrite = grantedPolicy('AutoReach.Inbox.Note', inject(PermissionService));
  protected readonly open = signal(false);
  protected readonly notes = signal<ConversationNoteDto[]>([]);
  protected readonly failed = signal(false);
  protected readonly body = signal('');
  protected readonly busy = signal(false);
  protected readonly caret = signal(0);
  /** The highlighted suggestion, for arrow keys. */
  protected readonly active = signal(0);
  private readonly picked = signal<MentionPerson[]>([]);
  private readonly box = viewChild<ElementRef<HTMLTextAreaElement>>('box');

  protected readonly meId = computed(() => this.directory.meId);
  private readonly people = computed<MentionPerson[]>(() =>
    this.directory
      .users()
      .filter((u) => u.userId && u.name && u.userId !== this.directory.meId)
      .map((u) => ({ userId: u.userId!, name: u.name! })),
  );
  private readonly mention = computed(() => mentionQuery(this.body(), this.caret()));
  protected readonly suggestions = computed(() => {
    const m = this.mention();
    return m ? matchPeople(this.people(), m.query) : [];
  });

  constructor() {
    effect(() => {
      const id = this.conversationId();
      untracked(() => {
        this.body.set('');
        this.picked.set([]);
        void this.load(id);
      });
    });
  }

  protected toggle(): void {
    this.open.update((o) => !o);
    if (this.open()) void this.directory.load();
  }

  private async load(id: string): Promise<void> {
    try {
      const r = await firstValueFrom(this.api.getList(id, { skipHandleError: true }));
      if (id !== this.conversationId()) return;
      this.notes.set(r.items ?? []);
      this.failed.set(false);
    } catch {
      this.failed.set(true);
    }
  }

  protected when(utc: string | undefined): string {
    return utc
      ? new Date(utc).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';
  }

  protected onInput(el: HTMLTextAreaElement): void {
    this.body.set(el.value);
    this.caret.set(el.selectionStart ?? el.value.length);
    this.active.set(0);
  }

  protected onKeydown(e: KeyboardEvent): void {
    const list = this.suggestions();
    if (list.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        this.active.set((this.active() + step + list.length) % list.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.pick(list[this.active()] ?? list[0]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.caret.set(-1);
        return;
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void this.send();
    }
  }

  protected pick(person: MentionPerson): void {
    const m = this.mention();
    if (!m) return;
    const next = insertMention(this.body(), m.start, this.caret(), person);
    this.body.set(next.text);
    this.picked.update((p) => (p.some((x) => x.userId === person.userId) ? p : [...p, person]));
    this.caret.set(next.caret);
    const el = this.box()?.nativeElement;
    if (el) {
      el.value = next.text;
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
    }
  }

  protected async send(): Promise<void> {
    const text = this.body().trim();
    if (!text || this.busy()) return;
    if (text.length > 4000) {
      this.toasts.warning('Keep a note to 4,000 characters.', 'Notes');
      return;
    }
    this.busy.set(true);
    try {
      const note = await firstValueFrom(
        this.api.create(
          this.conversationId(),
          { body: text, mentionedUserIds: mentionedIds(text, this.picked()) },
          { skipHandleError: true },
        ),
      );
      this.notes.update((n) => [...n, note]);
      this.body.set('');
      this.picked.set([]);
      const el = this.box()?.nativeElement;
      if (el) el.value = '';
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The note could not be saved.'), 'Notes');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(note: ConversationNoteDto): Promise<void> {
    if (!(await this.dialogs.delete('note'))) return;
    try {
      await firstValueFrom(this.api.delete(note.id!, { skipHandleError: true }));
      this.notes.update((n) => n.filter((x) => x.id !== note.id));
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The note could not be deleted.'), 'Notes');
    }
  }
}
