import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CannedReplyService } from '../../proxy/messaging/canned-reply.service';
import type { CannedReplyDto } from '../../proxy/messaging/models';

/**
 * Saved replies for the composer, filtered by folder and search. Picking one renders it for this conversation
 * (the customer's name and other values filled in by the server) and hands the text back to the composer.
 */
@Component({
  selector: 'ar-canned-reply-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './canned-reply-picker.scss',
  template: `
    <div class="cr" role="dialog" aria-label="Saved replies">
      <div class="cr__bar">
        <input
          class="ar-field__input"
          placeholder="Search saved replies"
          aria-label="Search saved replies"
          [value]="query()"
          (input)="query.set($any($event.target).value); search()"
        />
        <select
          class="ar-field__input"
          aria-label="Folder"
          [value]="folder()"
          (change)="folder.set($any($event.target).value); search()"
        >
          <option value="">All folders</option>
          @for (f of folders(); track f) {
            <option [value]="f">{{ f }}</option>
          }
        </select>
      </div>
      <ul class="cr__list">
        @for (r of replies(); track r.id) {
          <li>
            <button type="button" class="cr__item" [disabled]="busy()" (click)="pick(r)">
              <span class="cr__title">
                {{ r.title }}
                @if (r.shortcut) {
                  <span class="cr__short ar-mono">/{{ r.shortcut }}</span>
                }
              </span>
              <span class="cr__body" translate="no">{{ r.body }}</span>
            </button>
          </li>
        } @empty {
          <li class="cr__empty">{{ loading() ? 'Loading…' : 'No saved replies match.' }}</li>
        }
      </ul>
    </div>
  `,
})
export class ArCannedReplyPicker implements OnInit {
  private readonly api = inject(CannedReplyService);

  readonly conversationId = input.required<string>();
  readonly picked = output<string>();

  protected readonly folders = signal<string[]>([]);
  protected readonly replies = signal<CannedReplyDto[]>([]);
  protected readonly query = signal('');
  protected readonly folder = signal('');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  private generation = 0;

  async ngOnInit(): Promise<void> {
    firstValueFrom(this.api.getFolders({ skipHandleError: true })).then(
      (f) => this.folders.set(f.items ?? []),
      () => this.folders.set([]),
    );
    await this.search();
  }

  protected async search(): Promise<void> {
    const gen = ++this.generation;
    this.loading.set(true);
    try {
      const list = await firstValueFrom(
        this.api.search(this.query().trim(), this.folder(), { skipHandleError: true }),
      );
      if (gen === this.generation) this.replies.set(list.items ?? []);
    } catch {
      if (gen === this.generation) this.replies.set([]);
    } finally {
      if (gen === this.generation) this.loading.set(false);
    }
  }

  protected async pick(r: CannedReplyDto): Promise<void> {
    this.busy.set(true);
    try {
      const text = await firstValueFrom(
        this.api.render(
          { id: r.id, conversationId: this.conversationId() },
          { skipHandleError: true },
        ),
      );
      this.picked.emit(text || r.body || '');
    } catch {
      // Rendering failed (a missing value): give them the raw text to finish by hand.
      this.picked.emit(r.body ?? '');
    } finally {
      this.busy.set(false);
    }
  }
}
