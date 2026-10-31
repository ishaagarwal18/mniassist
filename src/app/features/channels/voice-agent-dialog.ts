import { LocalizationPipe } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ArButton } from '../../ui/button';
import { ArDialog } from '../../ui/dialog';
import { ActivityUserDto } from '../../proxy/activities/activity.models';
import { ActivityDirectoryService } from '../../proxy/activities/activity.service';
import { TemplateDto } from '../../proxy/messaging/models';
import { TemplateService } from '../../proxy/messaging/template.service';
import { TeamService } from '../../proxy/identity/team.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import {
  VoiceAgentService,
  VoiceAgentSettings,
  VoiceAgentTools,
  VoiceAgentVersion,
  VoiceAgentReview,
  VoiceAgentType,
  VOICE_AGENT_TIERS,
  VOICE_AGENT_ENGINES,
  VOICE_SPEECH_NOISE,
  VOICE_SPEECH_PATIENCE,
  VoiceAgentSpeech,
  defaultVoiceAgentSpeech,
  VOICE_AGENT_VOICES,
  VoiceAgentAnalysis,
  VoiceAnalysisField,
  noVoiceAgentAnalysis,
  noVoiceAgentTools,
} from './voice-agent.service';
import { voiceAgentTemplates } from './voice-agent-templates';
import { ArVoiceAgentTest } from './voice-agent-test';
import { ArVoiceAgentBuilder, VoiceAgentApply } from './voice-agent-builder';
import { ArVoiceAgentCompare } from './voice-agent-compare';
import { flowProblems } from './voice-agent-files';
import { ArVoiceAgentFlowEditor } from './voice-agent-flow';
import { VoiceFunction, VoiceFunctionService } from '../calls/voice-functions';
import { IntegrationKind } from '../../proxy/integrations/integration-kind.enum';
import { IntegrationService } from '../../proxy/integrations/integration.service';

@Component({
  selector: 'ar-voice-agent-dialog',
  imports: [
    FormsModule,
    LocalizationPipe,
    DatePipe,
    ArButton,
    ArDialog,
    ArVoiceAgentTest,
    ArVoiceAgentBuilder,
    ArVoiceAgentCompare,
    ArVoiceAgentFlowEditor,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      cssClass="ar-dialog ar-voice-agent-dialog"
      [title]="'AutoReach::VoiceAgent.Title' | abpLocalization"
      width="min(680px, calc(100vw - 32px))"
      (dismiss)="dismiss()"
    >
      @if (loading()) {
        <p role="status">{{ 'AutoReach::VoiceAgent.Loading' | abpLocalization }}</p>
      } @else if (settings(); as model) {
        <p class="notice">
          {{
            (model.serverAllowed
              ? 'AutoReach::VoiceAgent.Allowed'
              : 'AutoReach::VoiceAgent.Disabled'
            ) | abpLocalization
          }}
        </p>
        <p role="status">
          {{
            (model.usesLegacyConfiguration
              ? 'AutoReach::VoiceAgent.Publication.legacy'
              : model.publishedVersionId
                ? 'AutoReach::VoiceAgent.Publication.live'
                : 'AutoReach::VoiceAgent.Publication.unpublished'
            ) | abpLocalization
          }}
        </p>
        @if (model.hasUnpublishedChanges) {
          <p>{{ 'AutoReach::VoiceAgent.Publication.pending' | abpLocalization }}</p>
        }
        @if (model.isShared) {
          <p class="shared">
            {{ 'AutoReach::SharedAgents.AnswersOn' | abpLocalization }}
            @for (number of model.numbers ?? []; track number.channelId; let last = $last) {
              <span translate="no">{{ number.name }} ({{ number.phoneNumber }})</span
              >{{ last ? '' : ', ' }}
            } @empty {
              {{ 'AutoReach::SharedAgents.NoNumbers' | abpLocalization }}
            }
          </p>
        } @else if (model.sharedAgentName) {
          <p class="shared" role="status">
            {{ 'AutoReach::SharedAgents.NumberUses' | abpLocalization }}
            <strong translate="no">{{ model.sharedAgentName }}</strong
            >.
            {{ 'AutoReach::SharedAgents.NumberUsesHelp' | abpLocalization }}
          </p>
        }
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.Template' | abpLocalization }}</span>
          <select
            class="ar-field__input"
            [ngModel]="templateId()"
            (ngModelChange)="templateId.set($event)"
            [disabled]="saving()"
          >
            <option value="">
              {{ 'AutoReach::VoiceAgent.Template.choose' | abpLocalization }}
            </option>
            @for (template of templates; track template.id) {
              <option [value]="template.id">
                {{ 'AutoReach::VoiceAgent.Template.' + template.id | abpLocalization }}
              </option>
            }
          </select></label
        >
        <p>{{ 'AutoReach::VoiceAgent.Template.notice' | abpLocalization }}</p>
        <button
          ar-button
          type="button"
          data-novalidate
          [disabled]="saving() || !templateId()"
          (click)="applyTemplate()"
        >
          {{ 'AutoReach::VoiceAgent.Template.apply' | abpLocalization }}
        </button>
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.Name' | abpLocalization }}</span>
          <input
            class="ar-field__input"
            [(ngModel)]="model.name"
            (ngModelChange)="saved.set(false)"
            required
            maxlength="100"
            [disabled]="saving()"
        /></label>
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.Type' | abpLocalization }}</span>
          <select
            class="ar-field__input"
            [ngModel]="model.type ?? 'prompt'"
            (ngModelChange)="setType($event)"
            [disabled]="saving()"
          >
            <option value="prompt">
              {{ 'AutoReach::VoiceAgent.Type.prompt' | abpLocalization }}
            </option>
            <option value="flow">{{ 'AutoReach::VoiceAgent.Type.flow' | abpLocalization }}</option>
          </select></label
        >
        <p>{{ 'AutoReach::VoiceAgent.Type.help' | abpLocalization }}</p>
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.Instructions' | abpLocalization }}</span>
          <textarea
            class="ar-field__input"
            [(ngModel)]="model.instructions"
            (ngModelChange)="saved.set(false)"
            required
            maxlength="12000"
            rows="6"
            [disabled]="saving()"
          ></textarea>
        </label>
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.Greeting' | abpLocalization }}</span>
          <textarea
            class="ar-field__input"
            [(ngModel)]="model.greeting"
            (ngModelChange)="saved.set(false)"
            required
            maxlength="1000"
            rows="3"
            [disabled]="saving()"
          ></textarea>
        </label>
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceAgent.Voicemail' | abpLocalization }}</span>
          <textarea
            class="ar-field__input"
            [(ngModel)]="model.voicemailMessage"
            (ngModelChange)="saved.set(false)"
            maxlength="500"
            rows="2"
            [disabled]="saving()"
          ></textarea>
        </label>
        <p>{{ 'AutoReach::VoiceAgent.Voicemail.help' | abpLocalization }}</p>
        <div class="options">
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Engine' | abpLocalization }}</span>
            <select
              class="ar-field__input"
              [ngModel]="model.engine ?? ''"
              (ngModelChange)="model.engine = $event; saved.set(false)"
              [disabled]="saving()"
            >
              @for (option of engines; track option) {
                <option
                  [value]="option"
                  [disabled]="
                    option === 'pipeline' && !pipelineReady() && model.engine !== 'pipeline'
                  "
                >
                  {{ 'AutoReach::VoiceAgent.Engine.' + (option || 'default') | abpLocalization }}
                </option>
              }
            </select></label
          >
          @if (model.engine !== 'pipeline') {
            <label class="ar-field"
              ><span>{{ 'AutoReach::VoiceAgent.Voice' | abpLocalization }}</span>
              <select
                class="ar-field__input"
                [(ngModel)]="model.voice"
                (ngModelChange)="saved.set(false); previewFailed.set(false)"
                [disabled]="saving()"
              >
                @for (voice of voices; track voice) {
                  <option [value]="voice">
                    {{ voice[0].toUpperCase() + voice.slice(1) }}
                    @if (voice === 'marin' || voice === 'cedar') {
                      ({{ 'AutoReach::VoiceAgent.Voice.recommended' | abpLocalization }})
                    }
                  </option>
                }
              </select></label
            >
            <label class="ar-field"
              ><span>{{ 'AutoReach::VoiceAgent.Model' | abpLocalization }}</span>
              <select
                class="ar-field__input"
                [ngModel]="model.tier ?? ''"
                (ngModelChange)="model.tier = $event; saved.set(false)"
                [disabled]="saving()"
              >
                @for (option of models; track option) {
                  <option [value]="option">
                    {{ 'AutoReach::VoiceAgent.Model.' + (option || 'default') | abpLocalization }}
                  </option>
                }
              </select></label
            >
          }
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Language' | abpLocalization }}</span>
            <select
              class="ar-field__input"
              [(ngModel)]="model.language"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            >
              @for (language of languages; track language) {
                <option [value]="language">
                  {{ 'AutoReach::VoiceAgent.Language.' + language | abpLocalization }}
                </option>
              }
            </select></label
          >
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Duration' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              type="number"
              [(ngModel)]="model.maxSeconds"
              (ngModelChange)="saved.set(false)"
              min="30"
              max="600"
              step="1"
              required
              [disabled]="saving()"
          /></label>
        </div>
        <div class="options">
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Silence.reminder' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              type="number"
              [(ngModel)]="model.silenceReminderSeconds"
              (ngModelChange)="saved.set(false)"
              min="0"
              max="120"
              step="1"
              [disabled]="saving()"
          /></label>
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Silence.end' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              type="number"
              [(ngModel)]="model.endSilenceSeconds"
              (ngModelChange)="saved.set(false)"
              min="0"
              max="300"
              step="1"
              [disabled]="saving()"
          /></label>
        </div>
        @if (model.engine === 'pipeline') {
          <p class="engine">{{ 'AutoReach::VoiceAgent.Engine.help' | abpLocalization }}</p>
          @if (!pipelineReady()) {
            <p class="engine" role="alert">
              {{ 'AutoReach::VoiceAgent.Engine.unavailable' | abpLocalization }}
            </p>
          }
        } @else {
          <div class="preview">
            <button
              ar-button
              type="button"
              variant="ghost"
              data-novalidate
              [disabled]="previewing() || !model.greeting.trim()"
              (click)="previewVoice()"
            >
              {{
                (previewing()
                  ? 'AutoReach::VoiceAgent.Voice.previewing'
                  : 'AutoReach::VoiceAgent.Voice.preview'
                ) | abpLocalization
              }}
            </button>
            <span>{{ 'AutoReach::VoiceAgent.Voice.previewHelp' | abpLocalization }}</span>
            @if (previewFailed()) {
              <span role="alert">{{
                'AutoReach::VoiceAgent.Voice.previewFailed' | abpLocalization
              }}</span>
            }
          </div>
          <p>{{ 'AutoReach::VoiceAgent.Model.help' | abpLocalization }}</p>
        }
        <p>{{ 'AutoReach::VoiceAgent.Silence.help' | abpLocalization }}</p>
        @if (model.type === 'flow' && model.flow) {
          <fieldset class="tools">
            <legend>{{ 'AutoReach::VoiceAgent.Flow' | abpLocalization }}</legend>
            <ar-voice-agent-flow
              [flow]="model.flow"
              [disabled]="saving()"
              (changed)="saved.set(false)"
            />
          </fieldset>
        }
        <fieldset class="tools">
          <legend>{{ 'AutoReach::VoiceAgent.Tools' | abpLocalization }}</legend>
          <p>{{ 'AutoReach::VoiceAgent.Tools.notice' | abpLocalization }}</p>
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Tools.actingUser' | abpLocalization }}</span>
            <select
              class="ar-field__input"
              [(ngModel)]="tools.actingUserId"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            >
              <option [ngValue]="null">
                {{ 'AutoReach::VoiceAgent.Tools.noUser' | abpLocalization }}
              </option>
              @for (user of users(); track user.userId) {
                <option [ngValue]="user.userId">{{ user.name }}</option>
              }
            </select></label
          >
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.bookMeetings"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.book' | abpLocalization }}</label
          >
          @if (tools.bookMeetings) {
            <div class="options">
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Tools.minutes' | abpLocalization }}</span>
                <input
                  class="ar-field__input"
                  type="number"
                  min="10"
                  max="240"
                  step="5"
                  [(ngModel)]="tools.meetingMinutes"
                  (ngModelChange)="saved.set(false)"
                  [disabled]="saving()"
              /></label>
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Tools.from' | abpLocalization }}</span>
                <input
                  class="ar-field__input"
                  type="time"
                  [ngModel]="clock(tools.workStartMinute)"
                  (ngModelChange)="tools.workStartMinute = minutes($event); saved.set(false)"
                  [disabled]="saving()"
              /></label>
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Tools.to' | abpLocalization }}</span>
                <input
                  class="ar-field__input"
                  type="time"
                  [ngModel]="clock(tools.workEndMinute)"
                  (ngModelChange)="tools.workEndMinute = minutes($event); saved.set(false)"
                  [disabled]="saving()"
              /></label>
            </div>
          }
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.updateCrm"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.crm' | abpLocalization }}</label
          >
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.raiseTickets"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.tickets' | abpLocalization }}</label
          >
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.sendFollowUps"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.followUps' | abpLocalization }}</label
          >
          @if (tools.sendFollowUps) {
            <label class="ar-field"
              ><span>{{ 'AutoReach::VoiceAgent.Tools.template' | abpLocalization }}</span>
              <select
                class="ar-field__input"
                [(ngModel)]="tools.followUpTemplateId"
                (ngModelChange)="saved.set(false)"
                [disabled]="saving()"
              >
                <option [ngValue]="null">
                  {{ 'AutoReach::VoiceAgent.Tools.noTemplate' | abpLocalization }}
                </option>
                @for (template of followUpTemplates(); track template.id) {
                  <option [ngValue]="template.id">
                    {{ template.name }} ({{ template.languageCode }})
                  </option>
                }
              </select></label
            >
            <p>{{ 'AutoReach::VoiceAgent.Tools.templateHelp' | abpLocalization }}</p>
          }
          <p>{{ 'AutoReach::VoiceAgent.Tools.confirmation' | abpLocalization }}</p>
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.lookUpBalance"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.balance' | abpLocalization }}</label
          >
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.lookUpOrders"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.orders' | abpLocalization }}</label
          >
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.lookUpContracts"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.contracts' | abpLocalization }}</label
          >
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.sendPaymentLinks"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.paymentLinks' | abpLocalization }}</label
          >
          <p>{{ 'AutoReach::VoiceAgent.Tools.accountHelp' | abpLocalization }}</p>
          @if (helpdesks().length > 0 || shops().length > 0) {
            <div class="options">
              @if (helpdesks().length > 0) {
                <label class="ar-field"
                  ><span>Helpdesk for the caller's tickets</span>
                  <select
                    class="ar-field__input"
                    [(ngModel)]="tools.helpdeskConnectionId"
                    (ngModelChange)="saved.set(false)"
                    [disabled]="saving()"
                  >
                    <option [ngValue]="null">None</option>
                    @for (c of helpdesks(); track c.id) {
                      <option [ngValue]="c.id">{{ c.name }}</option>
                    }
                  </select></label
                >
              }
              @if (shops().length > 0) {
                <label class="ar-field"
                  ><span>Online store for the caller's orders</span>
                  <select
                    class="ar-field__input"
                    [(ngModel)]="tools.shopConnectionId"
                    (ngModelChange)="saved.set(false)"
                    [disabled]="saving()"
                  >
                    <option [ngValue]="null">None</option>
                    @for (c of shops(); track c.id) {
                      <option [ngValue]="c.id">{{ c.name }}</option>
                    }
                  </select></label
                >
              }
            </div>
            <p>
              Tickets are found and raised, and orders found, by the number the caller rings from. A
              new ticket is read back and raised only after the caller agrees.
            </p>
          }
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.searchKnowledge"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.knowledge' | abpLocalization }}</label
          >
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.searchCatalogue"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.catalogue' | abpLocalization }}</label
          >
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.rememberCallers"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.memory' | abpLocalization }}</label
          >
          <p>{{ 'AutoReach::VoiceAgent.Tools.readsHelp' | abpLocalization }}</p>
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="tools.transferToPeople"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Tools.transfer' | abpLocalization }}</label
          >
          @if (tools.transferToPeople) {
            <div class="transfer-teams" role="group" aria-labelledby="va-transfer-teams">
              <span id="va-transfer-teams">{{
                'AutoReach::VoiceAgent.Tools.transferTeams' | abpLocalization
              }}</span>
              @for (team of teams(); track team.id) {
                <label class="check"
                  ><input
                    type="checkbox"
                    [checked]="tools.transferTeamIds.includes(team.id)"
                    (change)="toggleTransferTeam(team.id, $any($event.target).checked)"
                    [disabled]="
                      saving() ||
                      (!tools.transferTeamIds.includes(team.id) &&
                        tools.transferTeamIds.length >= 5)
                    "
                  />
                  {{ team.name }}
                  @if (tools.transferTeamIds[0] === team.id) {
                    ({{ 'AutoReach::VoiceAgent.Tools.transferDefault' | abpLocalization }})
                  }
                </label>
              } @empty {
                <p>{{ 'AutoReach::VoiceAgent.Tools.noTeams' | abpLocalization }}</p>
              }
            </div>
            <p>{{ 'AutoReach::VoiceAgent.Tools.transferHelp' | abpLocalization }}</p>
          }
          @if (functions().length > 0) {
            <div class="transfer-teams" role="group" aria-labelledby="va-functions">
              <span id="va-functions">Custom functions the agent may call</span>
              @for (fn of functions(); track fn.id) {
                <label class="check"
                  ><input
                    type="checkbox"
                    [checked]="(tools.functionIds ?? []).includes(fn.id)"
                    (change)="toggleFunction(fn.id, $any($event.target).checked)"
                    [disabled]="
                      saving() ||
                      (!(tools.functionIds ?? []).includes(fn.id) &&
                        (tools.functionIds ?? []).length >= 10)
                    "
                  />
                  <code translate="no">{{ fn.name }}</code>
                  · {{ fn.isWrite ? 'changes something' : 'looks up'
                  }}{{ fn.enabled ? '' : ' (off)' }}
                </label>
              }
            </div>
            <p>Set up functions under AI voice agents, Custom functions.</p>
          }
        </fieldset>
        <fieldset class="tools speech">
          <legend>{{ 'AutoReach::VoiceAgent.Speech' | abpLocalization }}</legend>
          <div class="options">
            <label class="ar-field"
              ><span>{{ 'AutoReach::VoiceAgent.Speech.patience' | abpLocalization }}</span>
              <select
                class="ar-field__input"
                [(ngModel)]="speech.patience"
                (ngModelChange)="saved.set(false)"
                [disabled]="saving()"
              >
                @for (option of patience; track option) {
                  <option [value]="option">
                    {{ 'AutoReach::VoiceAgent.Speech.patience.' + option | abpLocalization }}
                  </option>
                }
              </select></label
            >
            <label class="ar-field"
              ><span>{{ 'AutoReach::VoiceAgent.Speech.speed' | abpLocalization }}</span>
              <input
                class="ar-field__input"
                type="number"
                min="80"
                max="120"
                step="5"
                [(ngModel)]="speech.speedPercent"
                (ngModelChange)="saved.set(false)"
                [disabled]="saving()"
            /></label>
            @if (model.engine !== 'pipeline') {
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Speech.noise' | abpLocalization }}</span>
                <select
                  class="ar-field__input"
                  [(ngModel)]="speech.noiseReduction"
                  (ngModelChange)="saved.set(false)"
                  [disabled]="saving()"
                >
                  @for (option of noise; track option) {
                    <option [value]="option">
                      {{
                        'AutoReach::VoiceAgent.Speech.noise.' + (option || 'off') | abpLocalization
                      }}
                    </option>
                  }
                </select></label
              >
            }
          </div>
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="speech.interruptible"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Speech.interruptible' | abpLocalization }}</label
          >
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Speech.vocabulary' | abpLocalization }}</span>
            <textarea
              class="ar-field__input"
              rows="3"
              [ngModel]="vocabularyText()"
              (ngModelChange)="setVocabulary($event)"
              [disabled]="saving()"
            ></textarea>
          </label>
          <p>{{ 'AutoReach::VoiceAgent.Speech.vocabularyHelp' | abpLocalization }}</p>
          @for (row of speech.pronunciations; track $index) {
            <div class="options field-row">
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Speech.word' | abpLocalization }}</span>
                <input
                  class="ar-field__input"
                  maxlength="50"
                  [(ngModel)]="row.word"
                  (ngModelChange)="saved.set(false)"
                  [disabled]="saving()"
              /></label>
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Speech.say' | abpLocalization }}</span>
                <input
                  class="ar-field__input"
                  maxlength="100"
                  [(ngModel)]="row.say"
                  (ngModelChange)="saved.set(false)"
                  [disabled]="saving()"
              /></label>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="saving()"
                (click)="removePronunciation($index)"
              >
                {{ 'AutoReach::VoiceAgent.Analysis.remove' | abpLocalization }}
              </button>
            </div>
          }
          @if (speech.pronunciations.length < 30) {
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="saving()"
              (click)="addPronunciation()"
            >
              {{ 'AutoReach::VoiceAgent.Speech.addPronunciation' | abpLocalization }}
            </button>
          }
          <p>{{ 'AutoReach::VoiceAgent.Speech.help' | abpLocalization }}</p>
        </fieldset>
        <fieldset class="tools">
          <legend>{{ 'AutoReach::VoiceAgent.Analysis' | abpLocalization }}</legend>
          <p>{{ 'AutoReach::VoiceAgent.Analysis.notice' | abpLocalization }}</p>
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="analysis.summarize"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Analysis.summary' | abpLocalization }}</label
          >
          <label class="check"
            ><input
              type="checkbox"
              [(ngModel)]="analysis.sentiment"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
            />
            {{ 'AutoReach::VoiceAgent.Analysis.sentiment' | abpLocalization }}</label
          >
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceAgent.Analysis.goal' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              maxlength="500"
              [(ngModel)]="analysis.goal"
              (ngModelChange)="saved.set(false)"
              [disabled]="saving()"
          /></label>
          @for (field of analysis.fields; track $index) {
            <div class="options field-row">
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Analysis.label' | abpLocalization }}</span>
                <input
                  class="ar-field__input"
                  maxlength="80"
                  [(ngModel)]="field.label"
                  (ngModelChange)="saved.set(false)"
                  [disabled]="saving()"
              /></label>
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Analysis.key' | abpLocalization }}</span>
                <input
                  class="ar-field__input"
                  maxlength="40"
                  [(ngModel)]="field.key"
                  (ngModelChange)="saved.set(false)"
                  [disabled]="saving()"
              /></label>
              <label class="ar-field"
                ><span>{{ 'AutoReach::VoiceAgent.Analysis.type' | abpLocalization }}</span>
                <select
                  class="ar-field__input"
                  [(ngModel)]="field.type"
                  (ngModelChange)="saved.set(false)"
                  [disabled]="saving()"
                >
                  @for (type of fieldTypes; track type) {
                    <option [ngValue]="type">
                      {{ 'AutoReach::VoiceAgent.Analysis.type.' + type | abpLocalization }}
                    </option>
                  }
                </select></label
              >
              @if (field.type === 'choice') {
                <label class="ar-field"
                  ><span>{{ 'AutoReach::VoiceAgent.Analysis.choices' | abpLocalization }}</span>
                  <input
                    class="ar-field__input"
                    maxlength="500"
                    placeholder="hot|warm|cold"
                    [(ngModel)]="field.choices"
                    (ngModelChange)="saved.set(false)"
                    [disabled]="saving()"
                /></label>
              }
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="saving()"
                (click)="removeField($index)"
              >
                {{ 'AutoReach::VoiceAgent.Analysis.remove' | abpLocalization }}
              </button>
            </div>
          }
          @if (analysis.fields.length < 20) {
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="saving()"
              (click)="addField()"
            >
              {{ 'AutoReach::VoiceAgent.Analysis.add' | abpLocalization }}
            </button>
          }
        </fieldset>
        <p>{{ 'AutoReach::VoiceAgent.Scope' | abpLocalization }}</p>
        <ar-voice-agent-test [channelId]="channelId()" />
        @if (saved()) {
          <p role="status">{{ 'AutoReach::VoiceAgent.Saved' | abpLocalization }}</p>
        }
        <details class="build" (toggle)="buildOpen.set($any($event.target).open)">
          <summary>{{ 'AutoReach::VoiceAgent.Builder' | abpLocalization }}</summary>
          @if (buildOpen()) {
            <ar-voice-agent-builder
              [current]="model"
              [disabled]="saving()"
              (apply)="applyDefinition($event)"
            />
          }
        </details>
        <details (toggle)="historyToggled($event)">
          <summary>{{ 'AutoReach::VoiceAgent.History' | abpLocalization }}</summary>
          <p>{{ 'AutoReach::VoiceAgent.History.notice' | abpLocalization }}</p>
          @if (historyLoading()) {
            <p role="status">{{ 'AutoReach::VoiceAgent.Loading' | abpLocalization }}</p>
          }
          @if (historyError()) {
            <p role="alert">{{ 'AutoReach::VoiceAgent.History.failed' | abpLocalization }}</p>
            <button
              ar-button
              type="button"
              data-novalidate
              [disabled]="historyLoading() || saving()"
              (click)="loadHistory()"
            >
              {{ 'AutoReach::VoiceAgent.History.retry' | abpLocalization }}
            </button>
          }
          @if (versions(); as history) {
            @if (!history.length) {
              <p>{{ 'AutoReach::VoiceAgent.History.empty' | abpLocalization }}</p>
            }
            @if (history.length > 1) {
              <p>{{ 'AutoReach::VoiceAgent.Compare.help' | abpLocalization }}</p>
            }
            @for (version of history; track version.id) {
              @if (history.length > 1) {
                <label class="check"
                  ><input
                    type="checkbox"
                    [checked]="comparing().includes(version.id)"
                    [disabled]="!comparing().includes(version.id) && comparing().length >= 2"
                    (change)="toggleCompare(version.id, $any($event.target).checked)"
                  />
                  {{ 'AutoReach::VoiceAgent.Compare.pick' | abpLocalization }}
                  {{ version.profile.name }}</label
                >
              }
              <details class="version">
                <summary>
                  {{ version.profile.name }} ·
                  {{
                    version.savedAtUtc
                      ? (version.savedAtUtc | date: 'medium')
                      : ('AutoReach::VoiceAgent.History.legacy' | abpLocalization)
                  }}
                </summary>
                <p class="snapshot">{{ version.profile.instructions }}</p>
                <p class="snapshot">{{ version.profile.greeting }}</p>
                <p>
                  {{ version.profile.voice }} ·
                  {{
                    'AutoReach::VoiceAgent.Language.' + version.profile.language | abpLocalization
                  }}
                  · {{ version.profile.maxSeconds }}s
                </p>
                <p>
                  {{ 'AutoReach::VoiceAgent.Silence.reminder' | abpLocalization }}:
                  {{ version.profile.silenceReminderSeconds || 0 }} ·
                  {{ 'AutoReach::VoiceAgent.Silence.end' | abpLocalization }}:
                  {{ version.profile.endSilenceSeconds || 0 }}
                </p>
                @if (version.restoredFrom) {
                  <p>{{ 'AutoReach::VoiceAgent.History.restored' | abpLocalization }}</p>
                }
                <button
                  ar-button
                  type="button"
                  data-novalidate
                  [disabled]="saving()"
                  (click)="restoreCandidate.set(version)"
                >
                  {{ 'AutoReach::VoiceAgent.History.restore' | abpLocalization }}
                </button>
              </details>
            }
          }
          @if (comparison(); as pair) {
            <ar-voice-agent-compare [left]="pair[0]" [right]="pair[1]" />
          }
          @if (restoreCandidate(); as candidate) {
            <p>
              {{ 'AutoReach::VoiceAgent.History.confirm' | abpLocalization }}
              {{ candidate.profile.name }}
            </p>
            <button
              ar-button
              type="button"
              data-novalidate
              [disabled]="saving() || historyLoading()"
              (click)="restoreVersion()"
            >
              {{ 'AutoReach::VoiceAgent.History.confirmButton' | abpLocalization }}
            </button>
            <button
              ar-button
              type="button"
              data-novalidate
              [disabled]="saving()"
              (click)="restoreCandidate.set(null)"
            >
              {{ 'AutoReach::VoiceAgent.History.cancel' | abpLocalization }}
            </button>
          }
        </details>
      }
      @if (error()) {
        <p role="alert">{{ error() | abpLocalization }}</p>
      }
      <div dialogActions class="actions">
        <button ar-button type="button" variant="ghost" [disabled]="saving()" (click)="dismiss()">
          {{ 'AutoReach::VoiceAgent.Close' | abpLocalization }}
        </button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="loading() || saving() || !settings()"
          (click)="save()"
        >
          {{
            (saving() ? 'AutoReach::VoiceAgent.Saving' : 'AutoReach::VoiceAgent.Save')
              | abpLocalization
          }}
        </button>
        <button
          ar-button
          type="button"
          data-novalidate
          [disabled]="loading() || saving() || !settings()?.draftVersionId"
          (click)="publishCandidate.set(true)"
        >
          {{ 'AutoReach::VoiceAgent.Publication.publish' | abpLocalization }}
        </button>
        @if (publishCandidate()) {
          <p class="publication-confirmation">
            {{ 'AutoReach::VoiceAgent.Publication.confirm' | abpLocalization }}
          </p>
          <div class="review">
            <button
              ar-button
              type="button"
              variant="ghost"
              data-novalidate
              [disabled]="saving() || reviewing()"
              (click)="review()"
            >
              {{
                (reviewing()
                  ? 'AutoReach::VoiceAgent.Review.running'
                  : 'AutoReach::VoiceAgent.Review'
                ) | abpLocalization
              }}
            </button>
            @if (findings(); as result) {
              @if (result.findings.length === 0) {
                <p role="status">{{ 'AutoReach::VoiceAgent.Review.clean' | abpLocalization }}</p>
              } @else {
                <ul class="findings">
                  @for (finding of result.findings; track $index) {
                    <li [class.warning]="finding.severity === 'warning'">
                      <strong>{{
                        'AutoReach::VoiceAgent.Review.' + finding.severity | abpLocalization
                      }}</strong>
                      @if (finding.code) {
                        {{ 'AutoReach::VoiceAgent.Review.' + finding.code | abpLocalization }}
                      } @else {
                        <span translate="no">{{ finding.text }}</span>
                      }
                    </li>
                  }
                </ul>
              }
              <p>
                {{
                  (result.modelReviewed
                    ? 'AutoReach::VoiceAgent.Review.byModel'
                    : 'AutoReach::VoiceAgent.Review.checksOnly'
                  ) | abpLocalization
                }}
              </p>
            }
            @if (reviewFailed()) {
              <p role="alert">{{ 'AutoReach::VoiceAgent.Review.failed' | abpLocalization }}</p>
            }
          </div>
          <button ar-button type="button" data-novalidate [disabled]="saving()" (click)="publish()">
            {{ 'AutoReach::VoiceAgent.Publication.confirmButton' | abpLocalization }}
          </button>
          <button
            ar-button
            type="button"
            data-novalidate
            [disabled]="saving()"
            (click)="publishCandidate.set(false)"
          >
            {{ 'AutoReach::VoiceAgent.Publication.cancel' | abpLocalization }}
          </button>
        }
      </div>
    </ar-dialog>
  `,
  styles: `
    .tools {
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 12px 16px;
      margin: 12px 0;
    }
    .check {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 8px 0;
    }
    .shared {
      border-inline-start: 3px solid var(--ar-line-300);
      padding-inline-start: 8px;
      overflow-wrap: anywhere;
    }
    .preview {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin: 8px 0;
    }
    .build {
      margin: 8px 0 12px;
    }
    .build > summary {
      cursor: pointer;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .review {
      flex-basis: 100%;
    }
    .findings {
      margin: 8px 0;
      padding-inline-start: 20px;
      overflow-wrap: anywhere;
    }
    .findings li.warning strong {
      color: var(--ar-ink-900);
    }
    .transfer-teams {
      margin-inline-start: 24px;
    }
    .options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      width: 100%;
    }
    .publication-confirmation {
      flex-basis: 100%;
      margin: 0;
      text-align: start;
    }
    .notice {
      padding: 12px;
      border: 1px solid var(--ar-line, #dce1e8);
      border-radius: 8px;
    }
    textarea {
      resize: vertical;
    }
    [role='alert'] {
      color: var(--ar-danger, #b42318);
    }
    .snapshot {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .version {
      margin: 12px 0;
    }
    summary {
      cursor: pointer;
      overflow-wrap: anywhere;
    }
  `,
})
export class ArVoiceAgentDialog implements OnInit {
  readonly channelId = input.required<string>();
  readonly close = output<void>();
  private readonly api = inject(VoiceAgentService);
  private readonly directory = inject(ActivityDirectoryService);
  private readonly templatesApi = inject(TemplateService);
  private readonly teamApi = inject(TeamService);
  protected readonly users = signal<ActivityUserDto[]>([]);
  protected readonly teams = signal<{ id: string; name: string }[]>([]);
  protected readonly functions = signal<VoiceFunction[]>([]);
  private readonly functionsApi = inject(VoiceFunctionService);
  private readonly integrationsApi = inject(IntegrationService);
  protected readonly helpdesks = signal<{ id: string; name: string }[]>([]);
  protected readonly shops = signal<{ id: string; name: string }[]>([]);
  protected readonly followUpTemplates = signal<TemplateDto[]>([]);
  protected readonly settings = signal<VoiceAgentSettings | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal('');
  protected readonly languages = [
    'auto',
    'en',
    'hi',
    'mr',
    'gu',
    'bn',
    'ta',
    'te',
    'kn',
    'ml',
    'pa',
    'or',
    'ur',
  ];
  protected readonly templates = voiceAgentTemplates;
  protected readonly voices = VOICE_AGENT_VOICES;
  protected readonly models = VOICE_AGENT_TIERS;
  protected readonly engines = VOICE_AGENT_ENGINES;
  /** The call relay has the speech pipeline's keys. */
  protected readonly pipelineReady = computed(
    () => this.settings()?.engines?.includes('pipeline') ?? false,
  );
  protected readonly previewing = signal(false);
  protected readonly previewFailed = signal(false);
  private previewAudio: HTMLAudioElement | null = null;

  /** Plays the greeting in the chosen voice (the server's OpenAI speech model, close to how calls sound). */
  protected async previewVoice(): Promise<void> {
    const model = this.settings();
    if (!model || this.previewing()) return;
    this.previewing.set(true);
    this.previewFailed.set(false);
    try {
      const audio = await firstValueFrom(
        this.api.previewVoice(model.voice, model.greeting.trim().slice(0, 300)),
      );
      this.previewAudio?.pause();
      const url = URL.createObjectURL(audio);
      this.previewAudio = new Audio(url);
      this.previewAudio.onended = () => URL.revokeObjectURL(url);
      await this.previewAudio.play();
    } catch {
      this.previewFailed.set(true);
    } finally {
      this.previewing.set(false);
    }
  }
  protected readonly templateId = signal('');
  protected readonly versions = signal<VoiceAgentVersion[] | null>(null);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal(false);
  protected readonly restoreCandidate = signal<VoiceAgentVersion | null>(null);
  protected readonly publishCandidate = signal(false);
  protected readonly comparing = signal<string[]>([]);
  protected readonly buildOpen = signal(false);
  protected readonly reviewing = signal(false);
  protected readonly reviewFailed = signal(false);
  protected readonly findings = signal<VoiceAgentReview | null>(null);
  private historyOpen = false;

  /** The two versions picked, older first (the history lists newest first). */
  protected readonly comparison = computed<[VoiceAgentVersion, VoiceAgentVersion] | null>(() => {
    const history = this.versions() ?? [];
    const picked = history.filter((v) => this.comparing().includes(v.id));
    return picked.length === 2 ? [picked[1], picked[0]] : null;
  });

  protected toggleCompare(id: string, on: boolean): void {
    const rest = this.comparing().filter((v) => v !== id);
    this.comparing.set(on ? [...rest, id] : rest);
  }

  protected setType(type: VoiceAgentType): void {
    const model = this.settings();
    if (!model) return;
    model.type = type;
    if (type === 'flow' && !model.flow?.stages.length) {
      model.flow = { stages: [{ key: 'stage_1', name: '', goal: '', next: [] }] };
    }
    this.settings.set({ ...model });
    this.saved.set(false);
  }

  /** Puts a drafted, templated or imported agent into the draft. This workspace's people, template and teams stay as chosen. */
  protected applyDefinition({ agent, keepTools }: VoiceAgentApply): void {
    const model = this.settings();
    if (!model || this.saving()) return;
    const current = this.tools;
    this.settings.set({
      ...model,
      ...agent,
      concurrencyStamp: model.concurrencyStamp,
      tools: keepTools
        ? current
        : {
            ...noVoiceAgentTools(),
            ...agent.tools,
            actingUserId: current.actingUserId,
            followUpTemplateId: current.followUpTemplateId,
            transferTeamIds: current.transferTeamIds,
            functionIds: current.functionIds ?? [],
            helpdeskConnectionId: current.helpdeskConnectionId ?? null,
            shopConnectionId: current.shopConnectionId ?? null,
          },
      analysis: { ...noVoiceAgentAnalysis(), ...agent.analysis },
      type: agent.type ?? 'prompt',
      flow: agent.type === 'flow' ? (agent.flow ?? { stages: [] }) : null,
    });
    this.publishCandidate.set(false);
    this.saved.set(false);
    this.error.set('');
  }

  protected async review(): Promise<void> {
    const model = this.settings();
    if (!model || this.reviewing()) return;
    this.reviewing.set(true);
    this.reviewFailed.set(false);
    this.findings.set(null);
    try {
      this.findings.set(await firstValueFrom(this.api.review(model)));
    } catch {
      this.reviewFailed.set(true);
    } finally {
      this.reviewing.set(false);
    }
  }

  protected historyToggled(event: Event): void {
    this.historyOpen = (event.target as HTMLDetailsElement).open;
    if (this.historyOpen && !this.versions() && !this.historyLoading() && !this.historyError())
      void this.loadHistory();
  }

  protected async loadHistory(): Promise<void> {
    if (this.historyLoading() || this.saving()) return;
    this.historyLoading.set(true);
    this.historyError.set(false);
    try {
      this.versions.set(await firstValueFrom(this.api.versions(this.channelId())));
    } catch {
      this.historyError.set(true);
    } finally {
      this.historyLoading.set(false);
    }
  }

  protected async restoreVersion(): Promise<void> {
    const model = this.settings();
    const version = this.restoreCandidate();
    if (!model || !version || this.saving() || this.historyLoading()) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    this.publishCandidate.set(false);
    try {
      this.settings.set(
        await firstValueFrom(
          this.api.restore(this.channelId(), version.id, model.concurrencyStamp),
        ),
      );
      this.restoreCandidate.set(null);
      this.templateId.set('');
      this.saved.set(true);
      this.versions.set(null);
    } catch {
      this.error.set('AutoReach::VoiceAgent.SaveFailed');
    } finally {
      this.saving.set(false);
    }
    if (this.saved()) await this.loadHistory();
  }

  protected applyTemplate(): void {
    const model = this.settings();
    const template = this.templates.find((t) => t.id === this.templateId());
    if (!model || !template || this.saving()) return;
    this.settings.set({
      ...model,
      name: template.name,
      instructions: template.instructions,
      greeting: template.greeting,
    });
    this.publishCandidate.set(false);
    this.saved.set(false);
    this.error.set('');
  }

  /** The settings' tools, always present once loaded (older settings come back without them). */
  protected get tools(): VoiceAgentTools {
    const model = this.settings()!;
    return (model.tools ??= noVoiceAgentTools());
  }

  protected clock(minute: number): string {
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  }

  protected readonly fieldTypes: VoiceAnalysisField['type'][] = [
    'text',
    'choice',
    'boolean',
    'number',
    'date',
  ];

  protected readonly patience = VOICE_SPEECH_PATIENCE;
  protected readonly noise = VOICE_SPEECH_NOISE;

  protected get speech(): VoiceAgentSpeech {
    const model = this.settings()!;
    return (model.speech ??= defaultVoiceAgentSpeech());
  }

  /** One term per line. Blank lines stay while typing and are dropped when saved. */
  protected vocabularyText(): string {
    return this.speech.vocabulary.join('\n');
  }

  protected setVocabulary(text: string): void {
    this.speech.vocabulary = text.split(/\r?\n/);
    this.saved.set(false);
  }

  protected addPronunciation(): void {
    this.speech.pronunciations = [...this.speech.pronunciations, { word: '', say: '' }];
    this.saved.set(false);
  }

  protected removePronunciation(index: number): void {
    this.speech.pronunciations = this.speech.pronunciations.filter((_, i) => i !== index);
    this.saved.set(false);
  }

  protected get analysis(): VoiceAgentAnalysis {
    const model = this.settings()!;
    return (model.analysis ??= noVoiceAgentAnalysis());
  }

  protected addField(): void {
    this.analysis.fields = [
      ...this.analysis.fields,
      { key: '', label: '', type: 'text', choices: null },
    ];
    this.saved.set(false);
  }

  protected removeField(index: number): void {
    this.analysis.fields = this.analysis.fields.filter((_, i) => i !== index);
    this.saved.set(false);
  }

  protected minutes(clock: string): number {
    const [hours, mins] = (clock || '00:00').split(':').map(Number);
    return hours * 60 + mins;
  }

  /** People and approved templates to choose from; the settings still open if either list fails to load. */
  private async loadChoices(): Promise<void> {
    try {
      this.users.set(await firstValueFrom(this.directory.getUsers()));
    } catch {
      this.users.set([]);
    }
    try {
      const page = await firstValueFrom(
        this.templatesApi.getList({
          channelId: this.channelId(),
          status: TemplateStatus.Approved,
          maxResultCount: 100,
        }),
      );
      this.followUpTemplates.set(page.items ?? []);
    } catch {
      this.followUpTemplates.set([]);
    }
    try {
      const page = await firstValueFrom(this.teamApi.getList({ maxResultCount: 100 }));
      this.teams.set(
        (page.items ?? [])
          .filter((t) => t.id && t.isActive !== false)
          .map((t) => ({ id: t.id!, name: t.name ?? '' })),
      );
    } catch {
      this.teams.set([]);
    }
    try {
      this.functions.set(await firstValueFrom(this.functionsApi.getList()));
    } catch {
      this.functions.set([]);
    }
    try {
      const page = await firstValueFrom(this.integrationsApi.getList({ maxResultCount: 100 }));
      const of = (...kinds: IntegrationKind[]) =>
        (page.items ?? [])
          .filter((c) => c.id && kinds.includes(c.kind as IntegrationKind))
          .map((c) => ({ id: c.id!, name: c.name ?? '' }));
      this.helpdesks.set(of(IntegrationKind.Freshdesk, IntegrationKind.Zendesk));
      this.shops.set(of(IntegrationKind.Shopify));
    } catch {
      this.helpdesks.set([]);
      this.shops.set([]);
    }
  }

  protected toggleFunction(functionId: string, on: boolean): void {
    const ids = (this.tools.functionIds ?? []).filter((id) => id !== functionId);
    this.tools.functionIds = on ? [...ids, functionId] : ids;
    this.saved.set(false);
  }

  /** Ticked in order: the first team ticked is the one the agent rings unless another fits better. */
  protected toggleTransferTeam(teamId: string, on: boolean): void {
    const ids = this.tools.transferTeamIds.filter((id) => id !== teamId);
    this.tools.transferTeamIds = on ? [...ids, teamId] : ids;
    this.saved.set(false);
  }

  async ngOnInit(): Promise<void> {
    void this.loadChoices();
    try {
      const loaded = await firstValueFrom(this.api.get(this.channelId()));
      this.settings.set({
        ...loaded,
        tools: { ...noVoiceAgentTools(), ...loaded.tools },
      });
    } catch {
      this.error.set('AutoReach::VoiceAgent.LoadFailed');
    } finally {
      this.loading.set(false);
    }
  }

  protected dismiss(): void {
    if (!this.saving()) this.close.emit();
  }

  protected async publish(): Promise<void> {
    const model = this.settings();
    if (!model?.draftVersionId || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      this.settings.set(
        await firstValueFrom(
          this.api.publish(this.channelId(), model.draftVersionId, model.concurrencyStamp),
        ),
      );
      this.publishCandidate.set(false);
      this.findings.set(null);
      this.saved.set(false);
    } catch {
      this.error.set('AutoReach::VoiceAgent.SaveFailed');
    } finally {
      this.saving.set(false);
    }
  }

  protected async save(): Promise<void> {
    const model = this.settings();
    if (!model || this.saving()) return;
    const reminder = model.silenceReminderSeconds ?? 0;
    const end = model.endSilenceSeconds ?? 0;
    if (
      !model.name.trim() ||
      !model.instructions.trim() ||
      !model.greeting.trim() ||
      !Number.isInteger(model.maxSeconds) ||
      model.maxSeconds < 30 ||
      model.maxSeconds > 600 ||
      !Number.isInteger(reminder) ||
      (reminder !== 0 && (reminder < 5 || reminder > 120)) ||
      !Number.isInteger(end) ||
      (end !== 0 && (end < 10 || end > 300)) ||
      (reminder > 0 && end > 0 && end < reminder + 5)
    ) {
      this.error.set('AutoReach::VoiceAgent.Invalid');
      return;
    }
    const tools = model.tools ?? noVoiceAgentTools();
    const acts =
      tools.bookMeetings ||
      tools.updateCrm ||
      tools.raiseTickets ||
      tools.sendFollowUps ||
      tools.sendPaymentLinks;
    if (
      (acts && !tools.actingUserId) ||
      (tools.transferToPeople && (tools.transferTeamIds ?? []).length === 0) ||
      !Number.isInteger(tools.meetingMinutes) ||
      tools.meetingMinutes < 10 ||
      tools.meetingMinutes > 240 ||
      tools.workEndMinute <= tools.workStartMinute
    ) {
      this.error.set('AutoReach::VoiceAgent.Tools.invalid');
      return;
    }
    if (model.type === 'flow') {
      const problems = flowProblems(model.flow);
      if (problems.length) {
        this.error.set(problems[0]);
        return;
      }
    }
    const analysis = model.analysis ?? noVoiceAgentAnalysis();
    const keys = analysis.fields.map((f) => f.key.trim());
    if (
      analysis.fields.some(
        (f) =>
          !/^[a-z][a-z0-9_]{0,39}$/.test(f.key.trim()) ||
          !f.label.trim() ||
          (f.type === 'choice' && (f.choices ?? '').split('|').filter((c) => c.trim()).length < 2),
      ) ||
      new Set(keys).size !== keys.length
    ) {
      this.error.set('AutoReach::VoiceAgent.Analysis.invalid');
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    this.publishCandidate.set(false);
    try {
      this.settings.set(await firstValueFrom(this.api.update(this.channelId(), model)));
      this.versions.set(null);
      this.restoreCandidate.set(null);
      this.saved.set(true);
    } catch {
      this.error.set('AutoReach::VoiceAgent.SaveFailed');
    } finally {
      this.saving.set(false);
    }
    if (this.saved() && this.historyOpen) await this.loadHistory();
  }
}
