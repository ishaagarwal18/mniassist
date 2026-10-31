import { LocalizationPipe } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  VoiceConversationListItemDto,
  VoiceConversationSnapshotDto,
  WhatsAppCallService,
} from '../../proxy/messaging/whats-app-call.service';
import { ArButton } from '../../ui/button';
import { ArDialog } from '../../ui/dialog';

@Component({
  selector: 'ar-voice-conversations',
  imports: [FormsModule, DatePipe, LocalizationPipe, ArButton, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      [title]="'AutoReach::VoiceConversation.Title' | abpLocalization"
      width="min(900px, calc(100vw - 32px))"
      (dismiss)="closed.emit()"
    >
      <p>{{ 'AutoReach::VoiceConversation.Retention' | abpLocalization }}</p>
      <label class="ar-field"
        ><span>{{ 'AutoReach::VoiceConversation.Search' | abpLocalization }}</span>
        <input
          class="ar-field__input"
          [(ngModel)]="query"
          maxlength="200"
          (keydown.enter)="search()"
      /></label>
      <button ar-button type="button" data-novalidate [disabled]="loading()" (click)="search()">
        {{ 'AutoReach::VoiceConversation.Search' | abpLocalization }}
      </button>
      <button
        ar-button
        type="button"
        variant="ghost"
        data-novalidate
        [disabled]="exporting()"
        (click)="exportCsv()"
      >
        {{ 'AutoReach::VoiceConversation.Export' | abpLocalization }}
      </button>
      @if (loading()) {
        <p role="status">{{ 'AutoReach::VoiceConversation.Loading' | abpLocalization }}</p>
      }
      @if (error()) {
        <p role="alert">{{ 'AutoReach::VoiceConversation.Error' | abpLocalization }}</p>
      }
      @if (!loading() && !rows().length) {
        <p>{{ 'AutoReach::VoiceConversation.Empty' | abpLocalization }}</p>
      }
      @for (row of rows(); track row.callId) {
        <div class="conversation">
          <button
            ar-button
            type="button"
            data-novalidate
            [disabled]="detailLoading()"
            (click)="open(row.callId)"
          >
            {{
              row.contactName || ('AutoReach::VoiceConversation.UnknownContact' | abpLocalization)
            }}
            · {{ row.callStartedAtUtc | date: 'medium' }} ·
            {{ 'AutoReach::VoiceConversation.Open' | abpLocalization }}
          </button>
          @if (row.phoneLine) {
            <p>{{ 'AutoReach::VoiceConversation.PhoneLine' | abpLocalization }}</p>
          }
          @if (row.website) {
            <p>{{ 'AutoReach::VoiceConversation.Website' | abpLocalization }}</p>
          }
          @if (row.transcriptIncomplete) {
            <p>{{ 'AutoReach::VoiceConversation.TranscriptIncomplete' | abpLocalization }}</p>
          }
          <p>{{ row.preview }}</p>
        </div>
      }
      <div class="pager">
        <button
          ar-button
          type="button"
          data-novalidate
          [disabled]="loading() || offset() === 0"
          (click)="page(-1)"
        >
          {{ 'AutoReach::VoiceConversation.Previous' | abpLocalization }}
        </button>
        <span>{{
          'AutoReach::VoiceConversation.Range'
            | abpLocalization: range()[0] : range()[1] : range()[2]
        }}</span>
        <button
          ar-button
          type="button"
          data-novalidate
          [disabled]="loading() || offset() + 10 >= total()"
          (click)="page(1)"
        >
          {{ 'AutoReach::VoiceConversation.Next' | abpLocalization }}
        </button>
      </div>
      @if (detailLoading()) {
        <p role="status">{{ 'AutoReach::VoiceConversation.Loading' | abpLocalization }}</p>
      }
      @if (detail(); as conversation) {
        <section aria-live="polite">
          <p>
            {{ 'AutoReach::VoiceConversation.Expires' | abpLocalization }}
            {{ conversation.expiresAtUtc | date: 'mediumDate' }}
          </p>
          <p>{{ 'AutoReach::VoiceConversation.Disclaimer' | abpLocalization }}</p>
          @if (conversation.transcriptIncomplete) {
            <p role="status">
              {{ 'AutoReach::VoiceConversation.TranscriptIncomplete' | abpLocalization }}
            </p>
          }
          @if (conversation.engineFailedOver) {
            <p role="status">
              {{ 'AutoReach::VoiceConversation.EngineFailedOver' | abpLocalization }}
            </p>
          }
          @if (conversation.latency; as l) {
            @if (l.replies > 0) {
              <p translate="no">
                {{
                  'AutoReach::VoiceConversation.Latency'
                    | abpLocalization: seconds(l.medianMs) : seconds(l.p90Ms) : '' + l.replies
                }}
              </p>
            }
            @if (l.greetingMs > 0) {
              <p translate="no">
                {{
                  'AutoReach::VoiceConversation.GreetingLatency'
                    | abpLocalization: seconds(l.greetingMs)
                }}
              </p>
            }
          }
          @if (conversation.cost; as c) {
            <p translate="no">
              {{
                'AutoReach::VoiceConversation.Cost'
                  | abpLocalization
                    : rupees(c.totalPaise)
                    : rupees(c.modelPaise)
                    : rupees(c.speechPaise)
                    : rupees(c.linePaise)
              }}
            </p>
          }
          @if (conversation.truncated) {
            <p role="status">{{ 'AutoReach::VoiceConversation.Truncated' | abpLocalization }}</p>
          }
          @if (
            conversation.summary || conversation.sentiment || conversation.goalAchieved != null
          ) {
            <div class="analysis">
              <h3>{{ 'AutoReach::VoiceConversation.Analysis' | abpLocalization }}</h3>
              @if (conversation.summary) {
                <p>{{ conversation.summary }}</p>
              }
              @if (conversation.sentiment) {
                <p>
                  {{ 'AutoReach::VoiceConversation.Sentiment' | abpLocalization }}:
                  {{
                    'AutoReach::VoiceConversation.Sentiment.' + conversation.sentiment
                      | abpLocalization
                  }}
                </p>
              }
              @if (conversation.goalAchieved != null) {
                <p>
                  {{
                    (conversation.goalAchieved
                      ? 'AutoReach::VoiceConversation.GoalMet'
                      : 'AutoReach::VoiceConversation.GoalNotMet'
                    ) | abpLocalization
                  }}
                  {{ conversation.goalReason }}
                </p>
              }
            </div>
          }
          @if (conversation.analysisError) {
            <p role="status">
              {{ 'AutoReach::VoiceConversation.AnalysisFailed' | abpLocalization }}
            </p>
          }
          @if (conversation.fields?.length) {
            <dl class="fields">
              @for (field of conversation.fields; track field.key) {
                <div>
                  <dt>{{ field.label }}</dt>
                  <dd>
                    <input
                      class="ar-field__input"
                      [value]="field.value ?? ''"
                      maxlength="500"
                      [attr.aria-label]="field.label"
                      (change)="correct(conversation.callId, field.key, $any($event.target).value)"
                    />
                  </dd>
                </div>
              }
            </dl>
          }
          @if (conversation.actions?.length) {
            <h3>{{ 'AutoReach::VoiceConversation.Actions' | abpLocalization }}</h3>
            <ul class="actions">
              @for (action of conversation.actions; track $index) {
                <li>
                  <code translate="no">{{ action.name }}</code> ·
                  {{ 'AutoReach::VoiceConversation.Action.' + action.status | abpLocalization }}
                  @if (action.say) {
                    — {{ action.say }}
                  }
                </li>
              }
            </ul>
          }
          @if (conversation.hasRecording) {
            <p>{{ 'AutoReach::VoiceConversation.HasRecording' | abpLocalization }}</p>
          }
          @if (!conversation.turns.length) {
            <p>{{ 'AutoReach::VoiceConversation.NoTranscript' | abpLocalization }}</p>
          }
          @for (turn of conversation.turns; track turn.speaker + ':' + turn.itemId) {
            <div class="turn">
              <strong>{{
                'AutoReach::VoiceConversation.' + turn.speaker | abpLocalization
              }}</strong>
              <time>{{ turn.receivedAtUtc | date: 'mediumTime' }}</time>
              <p>{{ turn.text }}</p>
              @if (turn.speaker === 'agent') {
                <div class="feedback">
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    data-novalidate
                    [attr.aria-pressed]="rating(conversation, turn.itemId) === true"
                    (click)="annotate(conversation.callId, turn.itemId, true)"
                  >
                    {{ 'AutoReach::VoiceConversation.Good' | abpLocalization }}
                  </button>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    data-novalidate
                    [attr.aria-pressed]="rating(conversation, turn.itemId) === false"
                    (click)="annotate(conversation.callId, turn.itemId, false)"
                  >
                    {{ 'AutoReach::VoiceConversation.Bad' | abpLocalization }}
                  </button>
                  @if (noteDraft()?.itemId === turn.itemId) {
                    <textarea
                      class="ar-field__input"
                      rows="2"
                      maxlength="500"
                      [attr.aria-label]="'AutoReach::VoiceConversation.NoteLabel' | abpLocalization"
                      [value]="noteDraft()!.text"
                      (input)="
                        noteDraft.set({ itemId: turn.itemId, text: $any($event.target).value })
                      "
                    ></textarea>
                    <button
                      ar-button
                      type="button"
                      data-novalidate
                      (click)="annotate(conversation.callId, turn.itemId, false)"
                    >
                      {{ 'AutoReach::VoiceConversation.SaveNote' | abpLocalization }}
                    </button>
                  }
                  @if (noteFor(conversation, turn.itemId); as note) {
                    <span>{{ note }}</span>
                  }
                </div>
              }
            </div>
          }
          @if (conversation.annotations?.length) {
            <button
              ar-button
              type="button"
              variant="ghost"
              data-novalidate
              [disabled]="suggesting()"
              (click)="suggest(conversation.callId)"
            >
              {{ 'AutoReach::VoiceConversation.Suggest' | abpLocalization }}
            </button>
            @if (suggestion(); as text) {
              <p class="suggestion">{{ text }}</p>
            }
          }
        </section>
      }
      <div dialogActions>
        <button ar-button type="button" (click)="closed.emit()">
          {{ 'AutoReach::VoiceConversation.Close' | abpLocalization }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .conversation,
    .turn {
      border-bottom: 1px solid var(--ar-line-200);
      padding: 12px 0;
      overflow-wrap: anywhere;
    }
    p {
      white-space: pre-wrap;
    }
    time {
      margin-inline-start: 12px;
    }
    .fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px 16px;
    }
    .fields dd {
      margin: 0;
    }
    .feedback {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .suggestion {
      background: var(--ar-surface-100);
      padding: 12px;
      border-radius: 8px;
    }
    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }
  `,
})
export class ArVoiceConversations implements OnInit {
  readonly closed = output<void>();
  private readonly calls = inject(WhatsAppCallService);
  protected query = '';
  private appliedQuery = '';
  protected readonly rows = signal<VoiceConversationListItemDto[]>([]);
  protected readonly detail = signal<VoiceConversationSnapshotDto | null>(null);

  /** 820 → "0.8 s". */
  protected seconds(ms: number): string {
    return (ms / 1000).toFixed(1) + ' s';
  }

  /** 1234 paise → "₹12.34". */
  protected rupees(paise: number): string {
    return '₹' + (paise / 100).toFixed(2);
  }
  protected readonly loading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly error = signal(false);
  protected readonly total = signal(0);
  protected readonly offset = signal(0);
  protected readonly range = computed(() =>
    [this.total() ? this.offset() + 1 : 0, this.offset() + this.rows().length, this.total()].map(
      String,
    ),
  );
  private detailRequest = 0;
  protected readonly exporting = signal(false);
  protected readonly suggesting = signal(false);
  protected readonly suggestion = signal<string | null>(null);
  /** The note being written for a turn marked as needing work. */
  protected readonly noteDraft = signal<{ itemId: string; text: string } | null>(null);

  protected rating(conversation: VoiceConversationSnapshotDto, itemId: string): boolean | null {
    return conversation.annotations?.find((a) => a.itemId === itemId)?.good ?? null;
  }

  protected noteFor(conversation: VoiceConversationSnapshotDto, itemId: string): string | null {
    return conversation.annotations?.find((a) => a.itemId === itemId)?.note ?? null;
  }

  /** Rates an agent turn; a note explains a bad one and feeds the suggested instruction changes. */
  protected async annotate(callId: string, itemId: string, good: boolean): Promise<void> {
    const draft = this.noteDraft();
    const note = !good && draft?.itemId === itemId ? draft.text.trim() || null : null;
    if (!good && draft?.itemId !== itemId) {
      this.noteDraft.set({ itemId, text: this.noteFor(this.detail()!, itemId) ?? '' });
      return;
    }
    this.noteDraft.set(null);
    try {
      const updated = await firstValueFrom(
        this.calls.annotateConversation(callId, { itemId, good, note }),
      );
      if (this.detail()?.callId === callId) this.detail.set(updated);
    } catch {
      this.error.set(true);
    }
  }

  protected async correct(callId: string, key: string, value: string): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.calls.updateConversationField(callId, { key, value: value.trim() || null }),
      );
      if (this.detail()?.callId === callId) this.detail.set(updated);
    } catch {
      this.error.set(true);
    }
  }

  protected async suggest(callId: string): Promise<void> {
    this.suggesting.set(true);
    try {
      const result = await firstValueFrom(this.calls.suggestPromptChanges(callId));
      this.suggestion.set(result.suggestion ?? null);
    } catch {
      this.error.set(true);
    } finally {
      this.suggesting.set(false);
    }
  }

  protected async exportCsv(): Promise<void> {
    this.exporting.set(true);
    try {
      const blob = await firstValueFrom(
        this.calls.getConversationsCsv({ query: this.appliedQuery || undefined }),
      );
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ai-conversations.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      this.error.set(true);
    } finally {
      this.exporting.set(false);
    }
  }

  ngOnInit(): void {
    void this.load();
  }
  protected search(): void {
    if (this.loading()) return;
    this.appliedQuery = this.query.trim();
    this.offset.set(0);
    this.clearDetail();
    void this.load();
  }
  protected page(direction: number): void {
    if (this.loading()) return;
    const offset = this.offset() + direction * 10;
    if (offset < 0 || offset >= this.total()) return;
    this.offset.set(offset);
    this.clearDetail();
    void this.load();
  }
  /** A detail request still in flight belongs to the previous list; bumping the counter makes it land nowhere. */
  private clearDetail(): void {
    this.detailRequest++;
    this.detail.set(null);
    this.detailLoading.set(false);
  }
  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const result = await firstValueFrom(
        this.calls.getConversations({
          query: this.appliedQuery,
          skipCount: this.offset(),
          maxResultCount: 10,
        }),
      );
      this.rows.set(result.items ?? []);
      this.total.set(result.totalCount ?? 0);
    } catch {
      this.rows.set([]);
      this.total.set(0);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  protected async open(id: string): Promise<void> {
    const request = ++this.detailRequest;
    this.detailLoading.set(true);
    this.detail.set(null);
    this.error.set(false);
    try {
      const result = await firstValueFrom(this.calls.getConversation(encodeURIComponent(id)));
      if (request === this.detailRequest) {
        this.detail.set(result);
        if (!result) this.error.set(true);
      }
    } catch {
      if (request === this.detailRequest) this.error.set(true);
    } finally {
      if (request === this.detailRequest) this.detailLoading.set(false);
    }
  }
}
