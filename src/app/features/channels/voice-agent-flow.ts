import { LocalizationPipe } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArButton } from '../../ui/button';
import { stageKey } from './voice-agent-files';
import { VoiceAgentFlow, VoiceFlowStage } from './voice-agent.service';

/**
 * The stages of a conversation-flow agent: each has a goal the agent works towards and, optionally, conditions that send the call
 * to another stage or close it. Without a matching condition the agent moves to the next stage in the list. The map beside the
 * list shows where each stage can lead.
 */
@Component({
  selector: 'ar-voice-agent-flow',
  imports: [FormsModule, LocalizationPipe, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>{{ 'AutoReach::VoiceAgent.Flow.help' | abpLocalization }}</p>
    <ol class="flow">
      @for (stage of flow().stages; track stage; let i = $index; let last = $last) {
        <li class="stage">
          <div class="stage__head">
            <span class="stage__no" aria-hidden="true">{{ i + 1 }}</span>
            <label class="ar-field stage__name"
              ><span>{{ 'AutoReach::VoiceAgent.Flow.name' | abpLocalization }}</span>
              <input
                class="ar-field__input"
                [ngModel]="stage.name"
                (ngModelChange)="rename(stage, $event)"
                maxlength="60"
                required
                [disabled]="disabled()"
            /></label>
            <div class="stage__move">
              <button
                type="button"
                class="icon"
                data-novalidate
                [attr.aria-label]="'AutoReach::VoiceAgent.Flow.up' | abpLocalization"
                [disabled]="disabled() || i === 0"
                (click)="move(i, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="icon"
                data-novalidate
                [attr.aria-label]="'AutoReach::VoiceAgent.Flow.down' | abpLocalization"
                [disabled]="disabled() || last"
                (click)="move(i, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="icon"
                data-novalidate
                [attr.aria-label]="'AutoReach::VoiceAgent.Flow.remove' | abpLocalization"
                [disabled]="disabled()"
                (click)="remove(i)"
              >
                ×
              </button>
            </div>
          </div>
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Flow.goal' | abpLocalization }}</span>
            <textarea
              class="ar-field__input"
              rows="2"
              [(ngModel)]="stage.goal"
              (ngModelChange)="changed.emit()"
              maxlength="800"
              required
              [disabled]="disabled()"
            ></textarea>
          </label>
          @for (next of stage.next; track next; let t = $index) {
            <div class="transition">
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Flow.when' | abpLocalization }}</span>
                <input
                  class="ar-field__input"
                  [(ngModel)]="next.when"
                  (ngModelChange)="changed.emit()"
                  maxlength="200"
                  required
                  [disabled]="disabled()"
              /></label>
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Flow.to' | abpLocalization }}</span>
                <select
                  class="ar-field__input"
                  [(ngModel)]="next.to"
                  (ngModelChange)="changed.emit()"
                  [disabled]="disabled()"
                >
                  @for (other of flow().stages; track other; let o = $index) {
                    @if (other !== stage) {
                      <option [value]="other.key">{{ o + 1 }}. {{ other.name }}</option>
                    }
                  }
                  <option value="end">
                    {{ 'AutoReach::VoiceAgent.Flow.end' | abpLocalization }}
                  </option>
                </select></label
              >
              <button
                type="button"
                class="icon"
                data-novalidate
                [attr.aria-label]="'AutoReach::VoiceAgent.Flow.removeTransition' | abpLocalization"
                [disabled]="disabled()"
                (click)="removeTransition(stage, t)"
              >
                ×
              </button>
            </div>
          }
          @if (stage.next.length < 4) {
            <button
              ar-button
              type="button"
              variant="ghost"
              data-novalidate
              [disabled]="disabled()"
              (click)="addTransition(stage)"
            >
              {{ 'AutoReach::VoiceAgent.Flow.addTransition' | abpLocalization }}
            </button>
          }
          <p class="stage__then">
            {{
              (last ? 'AutoReach::VoiceAgent.Flow.thenEnd' : 'AutoReach::VoiceAgent.Flow.thenNext')
                | abpLocalization
            }}
          </p>
        </li>
      }
    </ol>
    @if (flow().stages.length < 12) {
      <button ar-button type="button" data-novalidate [disabled]="disabled()" (click)="add()">
        {{ 'AutoReach::VoiceAgent.Flow.add' | abpLocalization }}
      </button>
    }
    @if (flow().stages.length > 0) {
      <figure class="map" [attr.aria-label]="'AutoReach::VoiceAgent.Flow.map' | abpLocalization">
        <figcaption>{{ 'AutoReach::VoiceAgent.Flow.map' | abpLocalization }}</figcaption>
        @for (stage of flow().stages; track stage; let i = $index) {
          <div class="map__stage">
            <strong>{{ i + 1 }}. {{ stage.name || '…' }}</strong>
            @for (next of stage.next; track next) {
              <span class="map__edge">
                → {{ target(next.to) }} <em>({{ next.when || '…' }})</em>
              </span>
            }
          </div>
        }
      </figure>
    }
  `,
  styles: `
    .flow {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 12px;
    }
    .stage {
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 8px 12px;
      min-width: 0;
    }
    .stage__head {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .stage__no {
      font-weight: 600;
      min-width: 1.5em;
      padding-bottom: 8px;
    }
    .stage__name {
      flex: 1;
      min-width: 0;
    }
    .stage__move {
      display: flex;
      gap: 4px;
      padding-bottom: 4px;
    }
    .transition {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto;
      gap: 8px;
      align-items: end;
      margin-inline-start: 16px;
    }
    .stage__then {
      margin: 4px 0 0;
      font-size: 0.85em;
      color: var(--ar-ink-500);
    }
    .icon {
      border: 1px solid var(--ar-line-200);
      background: transparent;
      border-radius: 6px;
      min-width: 32px;
      min-height: 32px;
      cursor: pointer;
    }
    .map {
      margin: 12px 0 0;
      padding: 8px 12px;
      border-inline-start: 3px solid var(--ar-line-200);
      display: grid;
      gap: 6px;
    }
    .map figcaption {
      font-size: 0.85em;
      color: var(--ar-ink-500);
    }
    .map__stage {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      overflow-wrap: anywhere;
    }
    @media (max-width: 520px) {
      .transition {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .transition label:first-child {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class ArVoiceAgentFlowEditor {
  readonly flow = input.required<VoiceAgentFlow>();
  readonly disabled = input(false);
  readonly changed = output<void>();

  protected target(key: string): string {
    if (key === 'end') return '■';
    const index = this.flow().stages.findIndex((s) => s.key === key);
    return index < 0 ? '?' : `${index + 1}. ${this.flow().stages[index].name}`;
  }

  /** The key follows the name until the stage is used as a target, so transitions never point at a renamed key. */
  protected rename(stage: VoiceFlowStage, name: string): void {
    stage.name = name;
    const used = this.flow().stages.some((s) => s.next.some((t) => t.to === stage.key));
    if (!used) {
      stage.key = stageKey(
        name,
        this.flow()
          .stages.filter((s) => s !== stage)
          .map((s) => s.key),
      );
    }
    this.changed.emit();
  }

  protected add(): void {
    const stages = this.flow().stages;
    stages.push({
      key: stageKey(
        `stage ${stages.length + 1}`,
        stages.map((s) => s.key),
      ),
      name: '',
      goal: '',
      next: [],
    });
    this.changed.emit();
  }

  protected remove(index: number): void {
    const stages = this.flow().stages;
    const [gone] = stages.splice(index, 1);
    for (const stage of stages) stage.next = stage.next.filter((t) => t.to !== gone.key);
    this.changed.emit();
  }

  protected move(index: number, by: number): void {
    const stages = this.flow().stages;
    const [stage] = stages.splice(index, 1);
    stages.splice(index + by, 0, stage);
    this.changed.emit();
  }

  protected addTransition(stage: VoiceFlowStage): void {
    const to = this.flow().stages.find((s) => s !== stage)?.key ?? 'end';
    stage.next = [...stage.next, { when: '', to }];
    this.changed.emit();
  }

  protected removeTransition(stage: VoiceFlowStage, index: number): void {
    stage.next = stage.next.filter((_, i) => i !== index);
    this.changed.emit();
  }
}
