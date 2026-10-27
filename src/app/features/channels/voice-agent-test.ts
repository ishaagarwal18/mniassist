import { LocalizationPipe } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { WhatsAppCallSession, iceGathered } from '../../core/services/whatsapp-call.session';
import {
  VoiceAgentTestDto,
  VoiceAgentTestService,
} from '../../proxy/calling/voice-agent-test.service';
import { ArButton } from '../../ui/button';

/**
 * A test call with the agent's latest saved draft from this browser: the microphone takes the customer's place, the agent answers
 * as on a real call, and the transcript is kept with the tester's verdict. Tools read real data but write nothing.
 */
@Component({
  selector: 'ar-voice-agent-test',
  imports: [DatePipe, LocalizationPipe, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="test" (toggle)="opened($event)">
      <summary>{{ 'AutoReach::VoiceAgentTest.Title' | abpLocalization }}</summary>
      <p>{{ 'AutoReach::VoiceAgentTest.Notice' | abpLocalization }}</p>
      @if (error()) {
        <p role="alert">{{ error() | abpLocalization }}</p>
      }
      @if (!session()) {
        <button ar-button type="button" data-novalidate [disabled]="busy()" (click)="start()">
          {{ 'AutoReach::VoiceAgentTest.Start' | abpLocalization }}
        </button>
      } @else {
        <p role="status">{{ 'AutoReach::VoiceAgentTest.Live' | abpLocalization }}</p>
        <button ar-button type="button" data-novalidate [disabled]="busy()" (click)="end()">
          {{ 'AutoReach::VoiceAgentTest.End' | abpLocalization }}
        </button>
        @for (turn of live(); track turn.speaker + turn.itemId) {
          <p class="turn">
            <strong>{{ 'AutoReach::VoiceConversation.' + turn.speaker | abpLocalization }}:</strong>
            {{ turn.text }}
          </p>
        }
      }
      @if (tests().length) {
        <h4>{{ 'AutoReach::VoiceAgentTest.Recent' | abpLocalization }}</h4>
        <ul class="tests">
          @for (test of tests(); track test.id) {
            <li>
              <details>
                <summary>
                  {{ test.startedAtUtc | date: 'short' }} ·
                  <span translate="no">{{ test.agentName }}</span>
                  @if (test.passed === true) {
                    · {{ 'AutoReach::VoiceAgentTest.Passed' | abpLocalization }}
                  }
                  @if (test.passed === false) {
                    · {{ 'AutoReach::VoiceAgentTest.Failed' | abpLocalization }}
                  }
                </summary>
                @for (turn of test.turns; track turn.speaker + turn.itemId) {
                  <p class="turn">
                    <strong
                      >{{
                        'AutoReach::VoiceConversation.' + turn.speaker | abpLocalization
                      }}:</strong
                    >
                    {{ turn.text }}
                  </p>
                }
                <div class="rate">
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    data-novalidate
                    [attr.aria-pressed]="test.passed === true"
                    (click)="rate(test, true)"
                  >
                    {{ 'AutoReach::VoiceAgentTest.MarkPassed' | abpLocalization }}
                  </button>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    data-novalidate
                    [attr.aria-pressed]="test.passed === false"
                    (click)="rate(test, false)"
                  >
                    {{ 'AutoReach::VoiceAgentTest.MarkFailed' | abpLocalization }}
                  </button>
                </div>
              </details>
            </li>
          }
        </ul>
      }
    </details>
  `,
  styles: `
    .test {
      margin: 12px 0;
    }
    .turn {
      margin: 4px 0;
      overflow-wrap: anywhere;
    }
    .tests {
      list-style: none;
      padding: 0;
    }
    .rate {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  `,
})
/** The recent tests load when the section is first opened. */
export class ArVoiceAgentTest {
  readonly channelId = input.required<string>();
  private readonly api = inject(VoiceAgentTestService);
  private readonly calls = inject(WhatsAppCallSession);
  protected readonly session = signal<string | null>(null);
  protected readonly live = signal<VoiceAgentTestDto['turns']>([]);
  protected readonly tests = signal<VoiceAgentTestDto[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  private pc: RTCPeerConnection | null = null;
  private mic: MediaStream | null = null;
  private audio: HTMLAudioElement | null = null;
  private poll: ReturnType<typeof setInterval> | null = null;
  private loaded = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => void this.end());
  }

  protected opened(event: Event): void {
    if ((event.target as HTMLDetailsElement).open && !this.loaded) {
      this.loaded = true;
      void this.loadTests();
    }
  }

  private async loadTests(): Promise<void> {
    try {
      this.tests.set(await firstValueFrom(this.api.getList(this.channelId())));
    } catch {
      this.tests.set([]);
    }
  }

  protected async start(): Promise<void> {
    if (this.busy() || this.session()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const pc = new RTCPeerConnection({ iceServers: await this.calls.iceServers() });
      this.pc = pc;
      this.mic.getTracks().forEach((t) => pc.addTrack(t, this.mic!));
      pc.ontrack = (e) => {
        this.audio ??= new Audio();
        this.audio.autoplay = true;
        this.audio.srcObject = e.streams[0] ?? new MediaStream([e.track]);
      };
      await pc.setLocalDescription(await pc.createOffer());
      await iceGathered(pc);
      const started = await firstValueFrom(
        this.api.start(this.channelId(), { sdpOffer: pc.localDescription!.sdp }),
      );
      await pc.setRemoteDescription({ type: 'answer', sdp: started.sdpAnswer });
      this.session.set(started.sessionId);
      this.poll = setInterval(() => void this.refresh(), 2000);
    } catch (e) {
      this.release();
      const code = (e as { error?: { error?: { code?: string } } })?.error?.error?.code;
      this.error.set(
        code?.startsWith('AutoReach:') ? code : 'AutoReach::VoiceAgentTest.StartFailed',
      );
    } finally {
      this.busy.set(false);
    }
  }

  private async refresh(): Promise<void> {
    const id = this.session();
    if (!id) return;
    try {
      const now = await firstValueFrom(this.api.get(id));
      this.live.set(now.turns);
      if (now.endedAtUtc) await this.end();
    } catch {
      // A missed poll is retried by the next one.
    }
  }

  protected async end(): Promise<void> {
    const id = this.session();
    this.release();
    if (!id) return;
    this.session.set(null);
    this.live.set([]);
    try {
      await firstValueFrom(this.api.end(id));
    } catch {
      // The relay ends abandoned calls itself.
    }
    await this.loadTests();
  }

  protected async rate(test: VoiceAgentTestDto, passed: boolean): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.api.rate(test.id, { passed: test.passed === passed ? null : passed, note: test.note }),
      );
      this.tests.set(this.tests().map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      this.error.set('AutoReach::VoiceAgentTest.RateFailed');
    }
  }

  private release(): void {
    if (this.poll) clearInterval(this.poll);
    this.poll = null;
    this.mic?.getTracks().forEach((t) => t.stop());
    this.mic = null;
    this.pc?.close();
    this.pc = null;
    if (this.audio) this.audio.srcObject = null;
  }
}
