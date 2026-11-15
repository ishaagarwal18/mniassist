import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { ConversationNoteService } from '../../proxy/messaging/conversation-note.service';
import type { ConversationNoteDto } from '../../proxy/messaging/models';
import { ArButton } from '../../ui';

/** Internal notes where a teammate @mentioned you, newest first; opening one jumps to its conversation. */
@Component({
  selector: 'ar-my-mentions',
  imports: [ArButton, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './my-mentions.scss',
  template: `
    <div class="mm" role="dialog" aria-label="My mentions">
      <header class="mm__head">
        <strong>My &#64;mentions</strong>
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Close</button>
      </header>
      @if (loading()) {
        <p class="mm__empty">Loading…</p>
      } @else {
        <ul class="mm__list">
          @for (n of notes(); track n.id) {
            <li>
              <button type="button" class="mm__item" (click)="opened.emit(n.conversationId!)">
                <span class="mm__who">
                  <span translate="no">{{ n.authorName ?? 'A teammate' }}</span> ·
                  {{ n.creationTime | date: 'd MMM, HH:mm' }}
                </span>
                <span class="mm__body" translate="no">{{ n.body }}</span>
              </button>
            </li>
          } @empty {
            <li class="mm__empty">Nobody has mentioned you in a note yet.</li>
          }
        </ul>
        @if (more()) {
          <button ar-button type="button" variant="ghost" (click)="loadMore()">Show more</button>
        }
      }
    </div>
  `,
})
export class ArMyMentions implements OnInit {
  private readonly api = inject(ConversationNoteService);

  readonly opened = output<string>();
  readonly closed = output<void>();

  protected readonly notes = signal<ConversationNoteDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly more = signal(false);
  private total = 0;

  async ngOnInit(): Promise<void> {
    await this.fetch(0);
    this.loading.set(false);
  }

  protected async loadMore(): Promise<void> {
    await this.fetch(this.notes().length);
  }

  private async fetch(skip: number): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getMyMentions({ skipCount: skip, maxResultCount: 20 }, { skipHandleError: true }),
      );
      this.total = page.totalCount ?? 0;
      this.notes.update((list) => [...list, ...(page.items ?? [])]);
    } catch {
      /* leave what is shown */
    }
    this.more.set(this.notes().length < this.total);
  }
}
