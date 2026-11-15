import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  VoiceConversationSnapshotDto,
  WhatsAppCallService,
} from '../../proxy/messaging/whats-app-call.service';
import { ArButton } from '../../ui';

/** How often the panel asks the relay for new lines while the call goes on. */
const POLL_MS = 2000;

/**
 * What the AI agent and the caller are saying, while the call is still going (GetLiveConversationAsync reads the
 * relay's in-memory transcript). Polls until the call ends, then keeps the last lines on screen.
 */
@Component({
  selector: 'ar-live-ai-transcript',
  imports: [ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './live-ai-transcript.scss',
  template: `
    <section class="lt" aria-live="polite">
      <header class="lt__head">
        <h3 class="lt__title">
          @if (snapshot()?.ended) {
            Call ended
          } @else {
            <span class="lt__dot" aria-hidden="true"></span> Live AI transcript
          }
          @if (snapshot()?.contactName; as n) {
            · <span translate="no">{{ n }}</span>
          }
        </h3>
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Close</button>
      </header>
      @if (snapshot(); as s) {
        @if (!s.transcriptEnabled) {
          <p class="lt__note">Transcripts are switched off for this agent, so nothing is shown.</p>
        }
        <ol class="lt__turns">
          @for (t of s.turns; track $index) {
            <li class="lt__turn" [class.lt__turn--agent]="t.speaker === 'agent'">
              <span class="lt__who">{{ t.speaker === 'agent' ? 'AI agent' : 'Caller' }}</span>
              <span class="lt__text" translate="no">{{ t.text }}</span>
            </li>
          } @empty {
            <li class="lt__note">Nobody has spoken yet.</li>
          }
        </ol>
      } @else {
        <p class="lt__note">{{ note() }}</p>
      }
    </section>
  `,
})
export class ArLiveAiTranscript {
  private readonly api = inject(WhatsAppCallService);

  readonly callId = input.required<string>();
  readonly closed = output<void>();

  protected readonly snapshot = signal<VoiceConversationSnapshotDto | null>(null);
  protected readonly note = signal('Connecting to the call…');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    effect(() => {
      const id = this.callId();
      untracked(() => this.begin(id));
    });
  }

  private begin(id: string): void {
    this.stop();
    const gen = ++this.generation;
    this.snapshot.set(null);
    this.note.set('Connecting to the call…');
    void this.poll(id, gen);
  }

  private async poll(id: string, gen: number): Promise<void> {
    try {
      const s = await firstValueFrom(this.api.getLiveConversation(id));
      if (gen !== this.generation) return;
      if (s) this.snapshot.set(s);
      else if (!this.snapshot())
        this.note.set('No AI agent is on this call, or it has not started yet.');
      if (s?.ended) return;
    } catch {
      if (gen !== this.generation) return;
      if (!this.snapshot()) this.note.set('The live transcript is not available for this call.');
    }
    this.timer = setTimeout(() => void this.poll(id, gen), POLL_MS);
  }

  private stop(): void {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
