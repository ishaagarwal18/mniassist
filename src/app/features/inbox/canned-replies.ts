import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { CannedReplyService } from '../../proxy/messaging/canned-reply.service';
import type { CannedReplyDto, CreateUpdateCannedReplyDto } from '../../proxy/messaging/models';
import { ArButton, ArChip } from '../../ui';
import { ArDialog } from '../../ui/dialog';

export interface ReplyDraft {
  id?: string;
  shortcut: string;
  title: string;
  body: string;
  folder: string;
}

/** A shortcut the API accepts: lowercase letters, digits and hyphens. */
export function toShortcut(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/** The {{variables}} a reply's body asks for, in order, once each. */
export function variablesIn(body: string): string[] {
  const seen = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)) seen.add(m[1]);
  return [...seen];
}

/** Problems with a draft, keyed by input; empty when it can be saved. */
export function replyDraftProblems(
  d: ReplyDraft,
  existing: readonly CannedReplyDto[],
): Record<string, string> {
  const p: Record<string, string> = {};
  const shortcut = d.shortcut.trim();
  if (!shortcut) p['shortcut'] = 'Give the reply a shortcut, typed after "/" in the inbox.';
  else if (!/^[a-z0-9-]+$/.test(shortcut))
    p['shortcut'] = 'Use lowercase letters, digits and hyphens only.';
  else if (shortcut.length > 64) p['shortcut'] = 'Keep the shortcut to 64 characters.';
  else if (existing.some((r) => r.id !== d.id && r.shortcut === shortcut))
    p['shortcut'] = 'Another reply already uses that shortcut.';
  if (!d.title.trim()) p['title'] = 'Give the reply a title.';
  else if (d.title.trim().length > 128) p['title'] = 'Keep the title to 128 characters.';
  if (!d.body.trim()) p['body'] = 'Write the reply.';
  else if (d.body.length > 4000) p['body'] = 'Keep the reply to 4,000 characters.';
  if (d.folder.trim().length > 64) p['folder'] = 'Keep the folder name to 64 characters.';
  return p;
}

export function draftToReply(d: ReplyDraft): CreateUpdateCannedReplyDto {
  return {
    shortcut: d.shortcut.trim(),
    title: d.title.trim(),
    body: d.body.trim(),
    folder: d.folder.trim() || null,
  };
}

/** The team's saved replies: written here, then picked in the inbox by "/shortcut" or from the list. */
@Component({
  selector: 'ar-canned-replies',
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './canned-replies.html',
  styleUrl: './canned-replies.scss',
})
export class ArCannedReplies implements OnInit {
  private readonly api = inject(CannedReplyService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly canManage = grantedPolicy(
    'AutoReach.Inbox.ManageCannedReplies',
    inject(PermissionService),
  );

  protected readonly replies = signal<CannedReplyDto[]>([]);
  protected readonly loaded = signal(false);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly query = signal('');
  protected readonly draft = signal<ReplyDraft | null>(null);
  protected readonly problems = signal<Record<string, string>>({});
  protected readonly variablesIn = variablesIn;

  protected readonly folders = computed(() =>
    [
      ...new Set(
        this.replies()
          .map((r) => r.folder ?? '')
          .filter((f) => f),
      ),
    ].sort(),
  );

  /** Replies grouped by folder ("" first, as "No folder"), filtered by the search box. */
  protected readonly groups = computed(() => {
    const q = this.query().trim().toLowerCase();
    const shown = this.replies().filter(
      (r) =>
        !q ||
        (r.title ?? '').toLowerCase().includes(q) ||
        (r.shortcut ?? '').includes(q) ||
        (r.body ?? '').toLowerCase().includes(q),
    );
    const by = new Map<string, CannedReplyDto[]>();
    for (const r of shown) {
      const key = r.folder ?? '';
      by.set(key, [...(by.get(key) ?? []), r]);
    }
    return [...by.entries()]
      .sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
      .map(([folder, items]) => ({
        folder,
        items: items.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '')),
      }));
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getList({ skipCount: 0, maxResultCount: 1000 }, { skipHandleError: true }),
      );
      this.replies.set(page.items ?? []);
      this.failed.set(false);
    } catch {
      this.failed.set(true);
    } finally {
      this.loaded.set(true);
    }
  }

  protected openNew(): void {
    this.problems.set({});
    this.draft.set({ shortcut: '', title: '', body: '', folder: '' });
  }

  protected openEdit(r: CannedReplyDto): void {
    this.problems.set({});
    this.draft.set({
      id: r.id,
      shortcut: r.shortcut ?? '',
      title: r.title ?? '',
      body: r.body ?? '',
      folder: r.folder ?? '',
    });
  }

  protected patch(change: Partial<ReplyDraft>): void {
    this.draft.update((d) => {
      if (!d) return d;
      const next = { ...d, ...change };
      // A new reply's shortcut follows its title until the person types one.
      if ('title' in change && !d.id && (!d.shortcut || d.shortcut === toShortcut(d.title)))
        next.shortcut = toShortcut(next.title);
      return next;
    });
    const d = this.draft();
    if (d && Object.keys(this.problems()).length)
      this.problems.set(replyDraftProblems(d, this.replies()));
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d) return;
    const problems = replyDraftProblems(d, this.replies());
    this.problems.set(problems);
    if (Object.keys(problems).length) return;
    this.busy.set(true);
    try {
      const input = draftToReply(d);
      if (d.id) await firstValueFrom(this.api.update(d.id, input, { skipHandleError: true }));
      else await firstValueFrom(this.api.create(input, { skipHandleError: true }));
      this.toasts.success(d.id ? 'Reply saved.' : 'Reply added.', 'Canned replies');
      this.draft.set(null);
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The reply could not be saved.'), 'Canned replies');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(r: CannedReplyDto): Promise<void> {
    if (!(await this.dialogs.delete('reply', r.title))) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(r.id!, { skipHandleError: true }));
      this.toasts.success('Reply deleted.', 'Canned replies');
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The reply could not be deleted.'), 'Canned replies');
    } finally {
      this.busy.set(false);
    }
  }
}
