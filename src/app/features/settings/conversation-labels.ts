import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { ConversationLabelService } from '../../proxy/messaging/conversation-label.service';
import type { ConversationLabelDto } from '../../proxy/messaging/models';
import { ArButton } from '../../ui';

/** The colours a label can take: distinct from each other and readable as a dot on white or dark. */
export const LABEL_COLOURS = [
  '#2563EB',
  '#0D9488',
  '#16A34A',
  '#CA8A04',
  '#EA580C',
  '#DC2626',
  '#DB2777',
  '#7C3AED',
  '#475569',
];

/** The first problem with a label, or null when it can be saved. Names are unique, ignoring case. */
export function labelProblem(
  name: string,
  existing: readonly ConversationLabelDto[],
  editingId: string | null,
): string | null {
  const n = name.trim();
  if (!n) return 'Give the label a name.';
  if (n.length > 32) return 'Keep the name to 32 characters.';
  const clash = existing.some(
    (l) => l.id !== editingId && (l.name ?? '').toLowerCase() === n.toLowerCase(),
  );
  return clash ? 'There is already a label with that name.' : null;
}

/** Settings → Conversation labels: the tags agents put on inbox conversations (Hot lead, Warranty, Spares…). */
@Component({
  selector: 'ar-conversation-labels',
  imports: [ArTopbar, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    .lbl__dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex: none;
    }
    .lbl__swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .lbl__swatch {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
    }
    .lbl__swatch[aria-pressed='true'] {
      border-color: var(--ar-ink-900);
    }
  `,
  template: `
    <ar-topbar
      title="Conversation labels"
      subtitle="Tags for sorting the inbox"
      help="Agents put labels on a conversation from the inbox, and the inbox can be filtered by them."
    />
    <div class="wp">
      <section class="wp__card">
        <h2 class="wp__title">{{ editingId() ? 'Edit label' : 'New label' }}</h2>
        <div class="wp__grid">
          <label class="wp__field">
            <span>Name</span>
            <input
              class="ar-field__input"
              maxlength="32"
              placeholder="Hot lead"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
            />
          </label>
          <div class="wp__field">
            <span>Colour</span>
            <div class="lbl__swatches" role="group" aria-label="Colour">
              @for (c of colours; track c) {
                <button
                  type="button"
                  class="lbl__swatch"
                  [style.background]="c"
                  [attr.aria-pressed]="colour() === c"
                  [attr.aria-label]="'Colour ' + c"
                  (click)="colour.set(c)"
                ></button>
              }
            </div>
          </div>
        </div>
        @if (problem(); as p) {
          <p class="wp__muted">{{ p }}</p>
        }
        <div class="wp__actions">
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || problem() !== null"
            (click)="save()"
          >
            {{ busy() ? 'Saving…' : editingId() ? 'Save label' : 'Add label' }}
          </button>
          @if (editingId()) {
            <button ar-button type="button" variant="ghost" (click)="reset()">Cancel</button>
          }
        </div>
      </section>

      <section class="wp__card">
        <ul class="wp__list">
          @for (l of labels(); track l.id) {
            <li class="wp__item">
              <span class="lbl__dot" [style.background]="l.colourHex"></span>
              <span class="wp__grow">
                <span class="wp__name" translate="no">{{ l.name }}</span>
                <span class="wp__sub">{{ l.conversationCount ?? 0 }} conversation(s)</span>
              </span>
              <button ar-button type="button" variant="ghost" (click)="edit(l)">Edit</button>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="remove(l)"
              >
                Delete
              </button>
            </li>
          } @empty {
            <li class="wp__empty">No labels yet.</li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class ArConversationLabels implements OnInit {
  private readonly api = inject(ConversationLabelService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly colours = LABEL_COLOURS;
  protected readonly labels = signal<ConversationLabelDto[]>([]);
  protected readonly name = signal('');
  protected readonly colour = signal(LABEL_COLOURS[0]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected problem(): string | null {
    return labelProblem(this.name(), this.labels(), this.editingId());
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getList(
          { skipCount: 0, maxResultCount: 200, sorting: 'name' },
          { skipHandleError: true },
        ),
      );
      this.labels.set(page.items ?? []);
    } catch {
      this.labels.set([]);
    }
  }

  protected edit(l: ConversationLabelDto): void {
    this.editingId.set(l.id ?? null);
    this.name.set(l.name ?? '');
    this.colour.set(l.colourHex ?? LABEL_COLOURS[0]);
  }

  protected reset(): void {
    this.editingId.set(null);
    this.name.set('');
    this.colour.set(LABEL_COLOURS[0]);
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    try {
      const input = { name: this.name().trim(), colourHex: this.colour() };
      const id = this.editingId();
      await firstValueFrom(
        id
          ? this.api.update(id, input, { skipHandleError: true })
          : this.api.create(input, { skipHandleError: true }),
      );
      this.reset();
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The label could not be saved.'), 'Labels');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(l: ConversationLabelDto): Promise<void> {
    const used = l.conversationCount ?? 0;
    const ok = await this.dialogs.delete(
      'label',
      l.name,
      used ? `It comes off ${used} conversation(s); the conversations themselves stay.` : undefined,
    );
    if (!ok) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(l.id!, { skipHandleError: true }));
      if (this.editingId() === l.id) this.reset();
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The label could not be deleted.'), 'Labels');
    } finally {
      this.busy.set(false);
    }
  }
}
