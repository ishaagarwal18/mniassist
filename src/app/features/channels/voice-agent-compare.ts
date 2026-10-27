import { LocalizationPipe, LocalizationService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { compareRows, diffLines } from './voice-agent-files';
import { VoiceAgentVersion } from './voice-agent.service';

/** Two saved versions side by side: every setting in a row (changed ones marked), then the instructions line by line. */
@Component({
  selector: 'ar-voice-agent-compare',
  imports: [LocalizationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scroll">
      <table class="compare">
        <caption>
          {{
            'AutoReach::VoiceAgent.Compare' | abpLocalization
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ 'AutoReach::VoiceAgent.Compare.setting' | abpLocalization }}</th>
            <th scope="col">{{ label(left()) }}</th>
            <th scope="col">{{ label(right()) }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.label) {
            <tr [class.changed]="row.changed">
              <th scope="row">
                {{ row.label | abpLocalization }}
                @if (row.changed) {
                  <span class="badge">{{
                    'AutoReach::VoiceAgent.Compare.changed' | abpLocalization
                  }}</span>
                }
              </th>
              <td translate="no">{{ row.left }}</td>
              <td translate="no">{{ row.right }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <h4>{{ 'AutoReach::VoiceAgent.Instructions' | abpLocalization }}</h4>
    @if (sameInstructions()) {
      <p>{{ 'AutoReach::VoiceAgent.Compare.sameInstructions' | abpLocalization }}</p>
    } @else {
      <div class="diff" translate="no">
        @for (line of instructions(); track $index) {
          <div [class]="'diff__' + line.kind">
            <span class="diff__mark" aria-hidden="true">{{ mark[line.kind] }}</span>
            <span class="sr-only">{{
              'AutoReach::VoiceAgent.Compare.' + line.kind | abpLocalization
            }}</span>
            <span class="diff__text">{{ line.text }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .scroll {
      overflow-x: auto;
    }
    .compare {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    .compare caption {
      text-align: start;
      font-weight: 600;
      padding-bottom: 4px;
    }
    .compare th,
    .compare td {
      border-bottom: 1px solid var(--ar-line-200);
      padding: 4px 8px;
      text-align: start;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    .compare tr.changed td {
      background: var(--ar-line-100);
    }
    .badge {
      display: inline-block;
      margin-inline-start: 4px;
      font-size: 0.8em;
      font-weight: 400;
      color: var(--ar-ink-500);
    }
    .diff {
      overflow-wrap: anywhere;
      font-size: 0.85em;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      padding: 8px;
      max-height: 320px;
      overflow: auto;
    }
    .diff > div {
      display: flex;
      white-space: pre-wrap;
      min-height: 1.2em;
    }
    .diff__text {
      min-width: 0;
    }
    .diff__added {
      background: color-mix(in srgb, green 14%, transparent);
    }
    .diff__removed {
      background: color-mix(in srgb, red 12%, transparent);
      text-decoration: line-through;
    }
    .diff__same {
      color: var(--ar-ink-500);
    }
    .diff__mark {
      flex: 0 0 1.2em;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
})
export class ArVoiceAgentCompare {
  /** The older version on the left, the newer on the right. */
  readonly left = input.required<VoiceAgentVersion>();
  readonly right = input.required<VoiceAgentVersion>();
  private readonly localization = inject(LocalizationService);
  protected readonly mark = { added: '+', removed: '−', same: ' ' } as const;
  private readonly dates = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected readonly rows = computed(() =>
    compareRows(this.left().profile, this.right().profile, (code) =>
      this.localization.instant(`AutoReach::VoiceAgent.Tools.${code}`),
    ),
  );
  protected readonly instructions = computed(() =>
    diffLines(this.left().profile.instructions, this.right().profile.instructions),
  );
  protected readonly sameInstructions = computed(
    () => this.left().profile.instructions === this.right().profile.instructions,
  );

  protected label(version: VoiceAgentVersion): string {
    return version.savedAtUtc
      ? this.dates.format(new Date(version.savedAtUtc))
      : this.localization.instant('AutoReach::VoiceAgent.History.legacy');
  }
}
