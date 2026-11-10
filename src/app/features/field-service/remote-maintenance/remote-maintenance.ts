import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PickerOption } from '../../../core/services/pipeline.service';
import { inrCompact } from '../../../core/util/format';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  DiagnosticTurnType,
  EquipmentCategory,
  equipmentCategoryOptions,
  InitiateRemoteMaintenanceInput,
  MaintenanceChannel,
  maintenanceChannelOptions,
  MaintenanceSessionStatus,
  MaintenanceSeverity,
  maintenanceSeverityOptions,
  RemoteMaintenanceService,
  RemoteMaintenanceSessionDto,
  RemoteMaintenanceStatsDto,
} from '../../../proxy/maintenance';
import { ContactService } from '../../../proxy/contacts/contact.service';
import {
  ArButton,
  ArCard,
  ArChip,
  ArDialog,
  ArIcon,
  ArMeter,
  ArStatTile,
  ArTabs,
  ChipTone,
  MeterTone,
} from '../../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../../ui/grid';

const STATUS_TONES: Record<MaintenanceSessionStatus, ChipTone> = {
  [MaintenanceSessionStatus.Initiated]: 'neutral',
  [MaintenanceSessionStatus.Diagnosing]: 'amber',
  [MaintenanceSessionStatus.RemediationProvided]: 'teal',
  [MaintenanceSessionStatus.ResolvedRemotely]: 'good',
  [MaintenanceSessionStatus.EscalatedToFieldTicket]: 'bad',
  [MaintenanceSessionStatus.Cancelled]: 'neutral',
};

const STATUS_LABELS: Record<MaintenanceSessionStatus, string> = {
  [MaintenanceSessionStatus.Initiated]: 'Started',
  [MaintenanceSessionStatus.Diagnosing]: 'Diagnosing',
  [MaintenanceSessionStatus.RemediationProvided]: 'Fix suggested',
  [MaintenanceSessionStatus.ResolvedRemotely]: 'Resolved remotely',
  [MaintenanceSessionStatus.EscalatedToFieldTicket]: 'Escalated to a visit',
  [MaintenanceSessionStatus.Cancelled]: 'Cancelled',
};

const SEVERITY_TONES: Record<MaintenanceSeverity, ChipTone> = {
  [MaintenanceSeverity.Low]: 'neutral',
  [MaintenanceSeverity.Medium]: 'amber',
  [MaintenanceSeverity.High]: 'warn',
  [MaintenanceSeverity.CriticalEmergency]: 'bad',
};

const SEVERITY_LABELS: Record<MaintenanceSeverity, string> = {
  [MaintenanceSeverity.Low]: 'Low',
  [MaintenanceSeverity.Medium]: 'Medium',
  [MaintenanceSeverity.High]: 'High',
  [MaintenanceSeverity.CriticalEmergency]: 'Critical',
};

/** Sensor names and units the AI sends in a session's telemetry snapshot; anything else is shown by its own name. */
const TELEMETRY_LABELS: Record<string, { label: string; unit: string }> = {
  temp_c: { label: 'Temperature', unit: '°C' },
  bus_voltage: { label: 'DC bus voltage', unit: 'V' },
  motor_current: { label: 'Motor current', unit: 'A' },
  fan_rpm: { label: 'Fan speed', unit: 'rpm' },
  ping_loss_percent: { label: 'Packet loss', unit: '%' },
};

export interface TelemetryReading {
  key: string;
  label: string;
  value: string;
}

/** The readings in a telemetry snapshot (JSON object), labelled; none when it is missing or not an object. */
export function telemetryReadings(json: string | null | undefined): TelemetryReading[] {
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.entries(data as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .map(([key, v]) => {
      const known = TELEMETRY_LABELS[key];
      const label =
        known?.label ??
        key
          .replace(/[_-]+/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .toLowerCase()
          .replace(/^\w/, (c) => c.toUpperCase());
      return { key, label, value: `${v}${known ? ' ' + known.unit : ''}`.replace(' °C', '°C') };
    });
}

/** A JSON list of strings (steps, spares); a plain string becomes one item. */
export function stringList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed.map(String).filter((s) => s.trim());
    return [String(parsed)];
  } catch {
    return [json];
  }
}

/** "CustomerConfirmedResolution" / "IVR_Step1_Selected" → "Customer confirmed resolution" / "IVR step1 selected". */
export function actionLabel(action: string): string {
  const words = action
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/);
  return words
    .map((w, i) => (i === 0 || /^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase()))
    .join(' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

const TABS = ['Live console', 'All sessions'] as const;
type Tab = (typeof TABS)[number];

/**
 * AI remote maintenance: a technician reports a breakdown over WhatsApp or the IVR line, the AI diagnoses it from the fault code,
 * symptoms and telemetry, and guides the fix step by step; when it cannot be fixed remotely it is escalated to a field visit.
 * The live console shows one session (equipment, conversation, AI plan); All sessions lists them.
 */
@Component({
  selector: 'ar-remote-maintenance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ArTopbar,
    ArButton,
    ArCard,
    ArChip,
    ArDialog,
    ArIcon,
    ArMeter,
    ArStatTile,
    ArTabs,
    ArGrid,
    GridModule,
    RouterLink,
  ],
  template: `
    <ar-topbar
      title="Remote maintenance"
      subtitle="AI diagnoses breakdowns over WhatsApp and the IVR line, and guides the fix"
      help="A technician reports a fault; the AI works out the likely cause from the fault code, symptoms and machine readings, then guides the fix step by step. If it can't be fixed remotely, escalate it to a field visit."
    >
      <button
        type="button"
        ar-button
        variant="ghost"
        icon="refresh"
        [disabled]="isLoading()"
        (click)="loadData()"
      >
        Refresh
      </button>
      <a ar-button variant="ai" icon="sparkle" routerLink="/field-service/remote-maintenance/new">
        New session
      </a>
    </ar-topbar>

    <div class="rm ar-scroll" [attr.aria-busy]="isLoading()">
      @if (loadError(); as e) {
        <div class="rm__alert" role="alert">
          <ar-icon name="alert" [size]="16" />
          <span>{{ e }}</span>
          <button type="button" class="rm__link" (click)="loadData()">Try again</button>
        </div>
      }

      <section class="rm__tiles" aria-label="Summary">
        <ar-stat-tile
          label="Resolved remotely"
          [value]="stats() ? round(stats()!.remoteResolutionRatePercent) + '%' : '–'"
          [note]="
            stats()
              ? stats()!.resolvedRemotelyCount + ' of ' + stats()!.totalSessions + ' sessions'
              : null
          "
          tone="good"
        />
        <ar-stat-tile
          label="Field visits avoided"
          [value]="stats() ? formatRupeesCompact(stats()!.estimatedCostSavingsInRupees) : '–'"
          [note]="stats() ? 'Saved at ₹15,000 a visit' : null"
          tone="teal"
        />
        <ar-stat-tile
          label="Escalated to a visit"
          [value]="stats()?.escalatedToFieldCount ?? '–'"
          [note]="stats() ? 'Sessions that needed an engineer on site' : null"
        />
        <ar-stat-tile
          label="Average time to resolve"
          [value]="stats() ? round(stats()!.averageResolutionTimeMinutes) + ' min' : '–'"
          [note]="stats() ? channelSplit() : null"
        />
      </section>

      <ar-tabs [tabs]="tabs" [active]="activeTab()" (activeChange)="activeTab.set($any($event))" />

      @if (activeTab() === 'Live console') {
        @if (currentSession(); as s) {
          <!-- Session bar -->
          <ar-card class="rm__bar-card">
            <div class="rm__bar">
              <label class="ar-field rm__pick">
                <span class="ar-field__label">Session</span>
                <select
                  class="ar-field__input"
                  [ngModel]="selectedSessionId"
                  (ngModelChange)="selectedSessionId = $event; onSessionSelected()"
                >
                  @for (o of sessions(); track o.id) {
                    <option [value]="o.id">
                      {{ o.sessionCode }} · {{ o.customerName }} · {{ o.equipmentModel }}
                    </option>
                  }
                </select>
              </label>
              <div class="rm__bar-meta">
                <ar-chip [tone]="getStatusTone(s.status)" [dot]="true">{{
                  getStatusLabel(s.status)
                }}</ar-chip>
                <ar-chip [tone]="getSeverityTone(s.severity)"
                  >{{ getSeverityLabel(s.severity) }} severity</ar-chip
                >
              </div>
            </div>
            <div class="rm__bar">
              <div class="rm__seg" role="radiogroup" aria-label="Channel for this session">
                <button
                  type="button"
                  role="radio"
                  class="rm__seg-btn"
                  [class.rm__seg-btn--on]="s.preferredChannel === MaintenanceChannel.WhatsApp"
                  [attr.aria-checked]="s.preferredChannel === MaintenanceChannel.WhatsApp"
                  [disabled]="isClosed(s)"
                  (click)="switchChannel(MaintenanceChannel.WhatsApp)"
                >
                  <ar-icon name="send" [size]="14" /> WhatsApp
                </button>
                <button
                  type="button"
                  role="radio"
                  class="rm__seg-btn"
                  [class.rm__seg-btn--on]="s.preferredChannel === MaintenanceChannel.IvrPhone"
                  [attr.aria-checked]="s.preferredChannel === MaintenanceChannel.IvrPhone"
                  [disabled]="isClosed(s)"
                  (click)="switchChannel(MaintenanceChannel.IvrPhone)"
                >
                  <ar-icon name="phone" [size]="14" /> IVR phone
                </button>
              </div>
            </div>
          </ar-card>

          <div class="rm__console">
            <!-- Equipment -->
            <ar-card heading="Equipment" class="rm__col">
              <dl class="rm__facts">
                <div>
                  <dt>Customer</dt>
                  <dd translate="no">{{ s.customerName }}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd class="ar-mono" translate="no">{{ s.customerContactPhone || '—' }}</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd translate="no">{{ s.equipmentModel }}</dd>
                </div>
                <div>
                  <dt>Serial no.</dt>
                  <dd class="ar-mono" translate="no">{{ s.equipmentSerialNumber || '—' }}</dd>
                </div>
                <div>
                  <dt>Fault code</dt>
                  <dd>
                    @if (s.faultCode) {
                      <span class="rm__code" translate="no">{{ s.faultCode }}</span>
                    } @else {
                      <span class="rm__muted">None reported</span>
                    }
                  </dd>
                </div>
              </dl>

              <h4 class="rm__sub">Machine readings</h4>
              @if (telemetry().length) {
                <ul class="rm__sensors">
                  @for (t of telemetry(); track t.key) {
                    <li>
                      <span>{{ t.label }}</span>
                      <strong translate="no">{{ t.value }}</strong>
                    </li>
                  }
                </ul>
              } @else {
                <p class="rm__muted">No readings were sent with this session.</p>
              }

              <h4 class="rm__sub">Reported symptoms</h4>
              <p class="rm__text">{{ s.reportedSymptoms || 'None given.' }}</p>
            </ar-card>

            <!-- Conversation -->
            <ar-card class="rm__col rm__chat-card">
              <header class="rm__chat-head">
                <span
                  class="rm__chat-icon"
                  [class.rm__chat-icon--ivr]="s.preferredChannel === MaintenanceChannel.IvrPhone"
                >
                  <ar-icon
                    [name]="s.preferredChannel === MaintenanceChannel.WhatsApp ? 'send' : 'phone'"
                    [size]="16"
                  />
                </span>
                <div>
                  <h3>
                    {{
                      s.preferredChannel === MaintenanceChannel.WhatsApp
                        ? 'WhatsApp conversation'
                        : 'IVR call'
                    }}
                  </h3>
                  <small
                    >{{ s.diagnosticTurns.length }}
                    {{ s.diagnosticTurns.length === 1 ? 'exchange' : 'exchanges' }}</small
                  >
                </div>
              </header>

              <ol class="rm__turns" aria-label="Conversation">
                @for (t of s.diagnosticTurns; track t.id) {
                  <li class="rm__turn">
                    @if (t.inputOrPrompt) {
                      <div class="rm__msg rm__msg--tech">
                        <span class="rm__who">Technician · {{ formatTime(t.createdAtUtc) }}</span>
                        @if (t.turnType === DiagnosticTurnType.IvrMenuChoice) {
                          <span class="rm__key"
                            >Pressed <kbd>{{ t.inputOrPrompt }}</kbd></span
                          >
                        } @else {
                          <p>{{ t.inputOrPrompt }}</p>
                        }
                      </div>
                    }
                    @if (t.aiResponseOrGuidance) {
                      <div class="rm__msg rm__msg--ai">
                        <span class="rm__who"
                          ><ar-icon name="sparkle" [size]="12" /> AI assistant</span
                        >
                        <p class="rm__pre">{{ t.aiResponseOrGuidance }}</p>
                        @if (t.actionTaken) {
                          <span class="rm__action">{{ actionText(t.actionTaken) }}</span>
                        }
                      </div>
                    }
                  </li>
                } @empty {
                  <li class="rm__muted rm__turns-empty">No messages yet.</li>
                }
              </ol>

              <div class="rm__compose">
                @if (isClosed(s)) {
                  <p class="rm__muted">
                    This session is {{ getStatusLabel(s.status).toLowerCase() }}: no more replies.
                  </p>
                } @else if (s.preferredChannel === MaintenanceChannel.WhatsApp) {
                  <div class="rm__compose-row">
                    <input
                      type="text"
                      class="ar-field__input"
                      aria-label="Technician's reply"
                      placeholder="Type the technician's reply, e.g. 'Insulation is 25 MΩ'"
                      [(ngModel)]="waMessageInput"
                      (keyup.enter)="sendWhatsAppTurn()"
                    />
                    <button
                      type="button"
                      ar-button
                      variant="primary"
                      icon="send"
                      [disabled]="!waMessageInput.trim()"
                      (click)="sendWhatsAppTurn()"
                    >
                      Send
                    </button>
                  </div>
                  <div class="rm__quick" aria-label="Quick replies">
                    <button
                      type="button"
                      class="rm__chip"
                      (click)="quickReply('Insulation measured 25 MΩ. Healthy.')"
                    >
                      Insulation healthy
                    </button>
                    <button
                      type="button"
                      class="rm__chip"
                      (click)="quickReply('FIXED: Machine running normal.')"
                    >
                      Fixed and running
                    </button>
                    <button
                      type="button"
                      class="rm__chip"
                      (click)="quickReply('ESCALATE: Motor windings burnt.')"
                    >
                      Needs an engineer
                    </button>
                  </div>
                } @else {
                  <span class="ar-label">Keypad</span>
                  <div class="rm__keypad">
                    <button type="button" class="rm__key-btn" (click)="sendIvrDigit('1')">
                      <kbd>1</kbd> Steps
                    </button>
                    <button type="button" class="rm__key-btn" (click)="sendIvrDigit('2')">
                      <kbd>2</kbd> Reset
                    </button>
                    <button type="button" class="rm__key-btn" (click)="sendIvrDigit('9')">
                      <kbd>9</kbd> Fixed
                    </button>
                    <button
                      type="button"
                      class="rm__key-btn rm__key-btn--esc"
                      (click)="sendIvrDigit('0')"
                    >
                      <kbd>0</kbd> Engineer
                    </button>
                  </div>
                }
              </div>
            </ar-card>

            <!-- AI plan -->
            <ar-card heading="AI diagnosis" class="rm__col">
              <div class="rm__conf">
                <div class="rm__conf-top">
                  <span>Confidence</span>
                  <strong>{{
                    s.confidencePercent ? s.confidencePercent.toFixed(0) + '%' : '–'
                  }}</strong>
                </div>
                <ar-meter
                  [value]="s.confidencePercent || 0"
                  [tone]="confidenceTone(s.confidencePercent)"
                  [thickness]="6"
                  label="Diagnosis confidence"
                />
              </div>

              <h4 class="rm__sub">Likely cause</h4>
              <p class="rm__text">
                {{ s.rootCauseDiagnosis || 'The AI is still working out the cause.' }}
              </p>

              @if (remediationSteps().length) {
                <h4 class="rm__sub">Steps to fix</h4>
                <ol class="rm__steps">
                  @for (step of remediationSteps(); track $index) {
                    <li>{{ step }}</li>
                  }
                </ol>
              }

              @if (spareParts().length) {
                <h4 class="rm__sub">Spares that may be needed</h4>
                <ul class="rm__spares">
                  @for (p of spareParts(); track $index) {
                    <li>
                      <ar-icon name="machine" [size]="14" /><span translate="no">{{ p }}</span>
                    </li>
                  }
                </ul>
              }

              @if (s.estimatedDowntimeMinutes) {
                <p class="rm__downtime">
                  <ar-icon name="clock" [size]="14" /> About {{ s.estimatedDowntimeMinutes }} min
                  downtime if fixed remotely
                </p>
              }

              @if (s.resolutionNotes) {
                <div
                  class="rm__outcome"
                  [class.rm__outcome--bad]="
                    s.status === MaintenanceSessionStatus.EscalatedToFieldTicket
                  "
                >
                  {{ s.resolutionNotes }}
                </div>
              }

              <div class="rm__decide">
                <button
                  type="button"
                  ar-button
                  variant="primary"
                  [disabled]="isClosed(s)"
                  (click)="markResolvedRemotely()"
                >
                  Mark resolved
                </button>
                <button
                  type="button"
                  ar-button
                  variant="danger"
                  [disabled]="isClosed(s)"
                  (click)="openEscalateModal()"
                >
                  Escalate to a visit
                </button>
              </div>
            </ar-card>
          </div>
        } @else if (!isLoading()) {
          <ar-card>
            <div class="rm__empty">
              <span class="rm__empty-icon"><ar-icon name="machine" [size]="24" /></span>
              <h2>No remote maintenance sessions yet</h2>
              <p>
                Start one when a customer reports a breakdown. The AI diagnoses it and guides their
                technician over WhatsApp or the IVR line.
              </p>
              <a
                ar-button
                variant="ai"
                icon="sparkle"
                routerLink="/field-service/remote-maintenance/new"
              >
                New session
              </a>
            </div>
          </ar-card>
        }
      }

      @if (activeTab() === 'All sessions') {
        <ar-card>
          <div class="rm__filters">
            <label class="ar-field">
              <span class="ar-field__label">Channel</span>
              <select
                class="ar-field__input"
                [(ngModel)]="filterChannel"
                (ngModelChange)="applyFilters()"
              >
                <option [ngValue]="null">All channels</option>
                <option [ngValue]="MaintenanceChannel.WhatsApp">WhatsApp</option>
                <option [ngValue]="MaintenanceChannel.IvrPhone">IVR phone</option>
              </select>
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Status</span>
              <select
                class="ar-field__input"
                [(ngModel)]="filterStatus"
                (ngModelChange)="applyFilters()"
              >
                <option [ngValue]="null">All statuses</option>
                @for (o of statusOptions; track o.value) {
                  <option [ngValue]="o.value">{{ o.label }}</option>
                }
              </select>
            </label>
            <span class="rm__count"
              >{{ filteredSessions().length }} of {{ sessions().length }} sessions</span
            >
          </div>

          <ejs-grid
            arGrid="remote-maintenance-sessions"
            [dataSource]="filteredSessions()"
            aria-label="Remote maintenance sessions"
          >
            <e-columns>
              <e-column field="sessionCode" headerText="Session" width="150">
                <ng-template #template let-s>
                  <button type="button" class="rm__link ar-mono" (click)="viewInConsole(s)">
                    {{ s.sessionCode }}
                  </button>
                </ng-template>
              </e-column>
              <e-column field="customerName" headerText="Customer" width="220" />
              <e-column field="equipmentModel" headerText="Equipment" width="210" />
              <e-column field="faultCode" headerText="Fault code" width="140">
                <ng-template #template let-s>
                  @if (s.faultCode) {
                    <span class="rm__code" translate="no">{{ s.faultCode }}</span>
                  } @else {
                    <span class="rm__muted">—</span>
                  }
                </ng-template>
              </e-column>
              <e-column field="preferredChannel" headerText="Channel" width="120">
                <ng-template #template let-s>
                  {{
                    s.preferredChannel === MaintenanceChannel.WhatsApp ? 'WhatsApp' : 'IVR phone'
                  }}
                </ng-template>
              </e-column>
              <e-column field="severity" headerText="Severity" width="140">
                <ng-template #template let-s>
                  <ar-chip [tone]="getSeverityTone(s.severity)">{{
                    getSeverityLabel(s.severity)
                  }}</ar-chip>
                </ng-template>
              </e-column>
              <e-column field="status" headerText="Status" width="170">
                <ng-template #template let-s>
                  <ar-chip [tone]="getStatusTone(s.status)" [dot]="true">{{
                    getStatusLabel(s.status)
                  }}</ar-chip>
                </ng-template>
              </e-column>
              <e-column
                field="confidencePercent"
                headerText="Confidence"
                width="120"
                textAlign="Right"
              >
                <ng-template #template let-s>
                  {{ s.confidencePercent ? s.confidencePercent.toFixed(0) + '%' : '–' }}
                </ng-template>
              </e-column>
              <e-column field="creationTime" headerText="Started" width="150">
                <ng-template #template let-s>{{ formatDateTime(s.creationTime) }}</ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        </ar-card>
      }
    </div>

    <!-- Escalate -->
    @if (showEscalateModal()) {
      <ar-dialog title="Escalate to a field visit" (dismiss)="showEscalateModal.set(false)">
        <div class="rm__form rm__form--one">
          <p class="rm__note">
            A field service ticket is raised with the whole diagnostic history, so the engineer
            arrives knowing what was tried.
          </p>
          <label class="ar-field">
            <span class="ar-field__label"
              >Why it can't be fixed remotely <span class="ar-field__req">*</span></span
            >
            <textarea class="ar-field__input" rows="3" [(ngModel)]="escalateReason"></textarea>
          </label>
          <label class="ar-field">
            <span class="ar-field__label"
              >Field engineer <span class="ar-field__opt">optional</span></span
            >
            <input
              class="ar-field__input"
              [(ngModel)]="escalateEngineer"
              placeholder="Who should go"
            />
          </label>
        </div>
        <div dialogActions>
          <button type="button" ar-button variant="ghost" (click)="showEscalateModal.set(false)">
            Cancel
          </button>
          <button
            type="button"
            ar-button
            variant="danger"
            [disabled]="!escalateReason.trim()"
            (click)="confirmEscalateToField()"
          >
            Escalate
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .rm {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .rm > ar-card,
    .rm ar-card {
      display: block;
      min-width: 0;
    }
    .rm__alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--ar-red-100);
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-control);
      color: var(--ar-bad-600);
      font: 500 13px var(--ar-font-sans);
    }
    .rm__alert .rm__link {
      margin-left: auto;
      color: var(--ar-bad-600);
    }
    .rm__link {
      padding: 0;
      background: none;
      border: 0;
      cursor: pointer;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-blue-600);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .rm__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    /* Session bar */
    .rm__bar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 12px 16px;
    }
    .rm__pick {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 320px;
      min-width: 0;
    }
    .rm__bar-meta {
      display: flex;
      gap: 6px;
      align-items: center;
      padding-bottom: 6px;
    }
    .rm__seg {
      display: inline-flex;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      overflow: hidden;
    }
    .rm__seg-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: var(--ar-white);
      border: 0;
      cursor: pointer;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .rm__seg-btn + .rm__seg-btn {
      border-left: 1px solid var(--ar-line-300);
    }
    .rm__seg-btn--on {
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
      font-weight: 600;
    }
    .rm__seg-btn:disabled {
      cursor: default;
      opacity: 0.6;
    }

    /* Console */
    .rm__console {
      display: grid;
      grid-template-columns: minmax(240px, 1fr) minmax(360px, 1.6fr) minmax(260px, 1.1fr);
      gap: 14px;
      align-items: start;
    }
    .rm__facts {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font: 400 12.5px var(--ar-font-sans);
    }
    .rm__facts > div {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 8px;
    }
    .rm__facts dt {
      color: var(--ar-ink-500);
    }
    .rm__facts dd {
      margin: 0;
      color: var(--ar-ink-900);
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    .rm__code {
      display: inline-block;
      padding: 1px 7px;
      border-radius: var(--ar-radius-chip);
      background: var(--ar-amber-50);
      border: 1px solid var(--ar-amber-200);
      color: var(--ar-amber-800);
      font: 600 11.5px var(--ar-font-mono);
    }
    .rm__sub {
      margin: 16px 0 8px;
      font: 700 11px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .rm__text {
      margin: 0;
      font: 400 13px var(--ar-font-sans);
      line-height: 1.5;
      color: var(--ar-ink-800);
    }
    .rm__muted {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .rm__sensors {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .rm__sensors li {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 10px;
      border: 1px solid var(--ar-line-100);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .rm__sensors strong {
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }

    /* Conversation */
    .rm__chat-card {
      display: flex;
      flex-direction: column;
    }
    .rm__chat-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--ar-line-100);
    }
    .rm__chat-head h3 {
      margin: 0;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .rm__chat-head small {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .rm__chat-icon {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: var(--ar-good-50);
      color: var(--ar-good-700);
    }
    .rm__chat-icon--ivr {
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
    }
    .rm__turns {
      list-style: none;
      margin: 0;
      padding: 14px 2px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 560px;
      overflow-y: auto;
    }
    .rm__turn {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .rm__turns-empty {
      padding: 24px 0;
      text-align: center;
    }
    .rm__msg {
      max-width: 88%;
      padding: 9px 12px;
      border-radius: 12px;
      font: 400 13px var(--ar-font-sans);
      line-height: 1.5;
      color: var(--ar-ink-800);
    }
    .rm__msg p {
      margin: 0;
    }
    .rm__msg--tech {
      align-self: flex-end;
      background: var(--ar-blue-100);
      border-bottom-right-radius: 4px;
    }
    .rm__msg--ai {
      align-self: flex-start;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-bottom-left-radius: 4px;
    }
    .rm__pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .rm__who {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 3px;
      font: 600 11px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .rm__key kbd,
    .rm__key-btn kbd {
      display: inline-grid;
      place-items: center;
      min-width: 22px;
      height: 22px;
      padding: 0 5px;
      border: 1px solid var(--ar-line-300);
      border-bottom-width: 2px;
      border-radius: 5px;
      background: var(--ar-white);
      font: 700 12px var(--ar-font-mono);
      color: var(--ar-ink-900);
    }
    .rm__action {
      display: inline-block;
      margin-top: 6px;
      padding: 1px 8px;
      border-radius: var(--ar-radius-chip);
      background: var(--ar-teal-50);
      color: var(--ar-teal-700);
      font: 500 11px var(--ar-font-sans);
    }
    .rm__compose {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--ar-line-100);
    }
    .rm__compose-row {
      display: flex;
      gap: 8px;
    }
    .rm__compose-row input {
      flex: 1;
      min-width: 0;
    }
    .rm__quick {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .rm__chip {
      padding: 4px 10px;
      border: 1px solid var(--ar-line-300);
      border-radius: 999px;
      background: var(--ar-white);
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .rm__chip:hover {
      border-color: var(--ar-blue-500);
      color: var(--ar-blue-700);
    }
    .rm__keypad {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .rm__key-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-white);
      cursor: pointer;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .rm__key-btn:hover {
      background: var(--ar-bg-50);
    }
    .rm__key-btn--esc {
      color: var(--ar-bad-600);
    }

    /* AI plan */
    .rm__conf {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rm__conf-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .rm__conf-top strong {
      font: 600 20px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .rm__steps {
      margin: 0;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font: 400 13px var(--ar-font-sans);
      line-height: 1.45;
      color: var(--ar-ink-800);
    }
    .rm__spares {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rm__spares li {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 7px 10px;
      border: 1px solid var(--ar-line-100);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .rm__spares ar-icon {
      margin-top: 2px;
      color: var(--ar-ink-400);
    }
    .rm__downtime {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 14px 0 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .rm__outcome {
      margin-top: 14px;
      padding: 9px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-good-50);
      color: var(--ar-good-700);
      font: 400 12.5px var(--ar-font-sans);
      line-height: 1.45;
    }
    .rm__outcome--bad {
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
    }
    .rm__decide {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid var(--ar-line-100);
    }

    /* Empty */
    .rm__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 36px 16px;
      text-align: center;
    }
    .rm__empty-icon {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
    }
    .rm__empty h2 {
      margin: 4px 0 0;
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .rm__empty p {
      margin: 0 0 6px;
      max-width: 440px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    /* All sessions */
    .rm__filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 12px;
    }
    .rm__filters .ar-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 180px;
    }
    .rm__count {
      margin-left: auto;
      padding-bottom: 8px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    /* Dialog forms */
    .rm__form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
    }
    .rm__form--one {
      grid-template-columns: minmax(0, 1fr);
    }
    .rm__form .ar-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .rm__wide {
      grid-column: 1 / -1;
    }
    .rm__note {
      margin: 0;
      padding: 9px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-amber-50);
      border: 1px solid var(--ar-amber-200);
      color: var(--ar-amber-800);
      font: 400 12.5px var(--ar-font-sans);
      line-height: 1.45;
    }
    .rm__form-error {
      margin: 0;
      padding: 8px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 500 12.5px var(--ar-font-sans);
    }

    @media (max-width: 1180px) {
      .rm__console {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .rm__chat-card {
        grid-column: 1 / -1;
        order: -1;
      }
    }
    @media (max-width: 760px) {
      .rm {
        padding: 14px 16px 24px;
      }
      .rm__console,
      .rm__form {
        grid-template-columns: minmax(0, 1fr);
      }
      .rm__keypad {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class ArRemoteMaintenance implements OnInit {
  private service = inject(RemoteMaintenanceService);
  private contacts = inject(ContactService);
  private toasts = inject(ToastService);

  readonly MaintenanceChannel = MaintenanceChannel;
  readonly MaintenanceSessionStatus = MaintenanceSessionStatus;
  readonly DiagnosticTurnType = DiagnosticTurnType;
  readonly equipmentCategoryOptions = equipmentCategoryOptions;
  readonly maintenanceChannelOptions = maintenanceChannelOptions;
  readonly maintenanceSeverityOptions = maintenanceSeverityOptions;
  readonly tabs = TABS;
  readonly statusOptions = [
    MaintenanceSessionStatus.Diagnosing,
    MaintenanceSessionStatus.RemediationProvided,
    MaintenanceSessionStatus.ResolvedRemotely,
    MaintenanceSessionStatus.EscalatedToFieldTicket,
    MaintenanceSessionStatus.Cancelled,
  ].map((value) => ({ value, label: STATUS_LABELS[value] }));

  activeTab = signal<Tab>('Live console');
  isLoading = signal(false);
  loadError = signal<string | null>(null);

  sessions = signal<RemoteMaintenanceSessionDto[]>([]);
  currentSession = signal<RemoteMaintenanceSessionDto | null>(null);
  stats = signal<RemoteMaintenanceStatsDto | null>(null);

  selectedSessionId = '';
  waMessageInput = '';

  // All sessions filters
  filterChannel: MaintenanceChannel | null = null;
  filterStatus: MaintenanceSessionStatus | null = null;
  filteredSessions = signal<RemoteMaintenanceSessionDto[]>([]);

  // Dialogs
  showInitiateModal = signal(false);
  showEscalateModal = signal(false);

  // New session form
  initContact = signal<PickerOption | null>(null);
  initCustomerPhone = '';
  initEquipmentModel = '';
  initEquipmentSerial = '';
  initCategory = EquipmentCategory.VfdAndDrive;
  initChannel = MaintenanceChannel.WhatsApp;
  initFaultCode = '';
  initSymptoms = '';
  initSeverity = MaintenanceSeverity.Medium;
  initBusy = signal(false);
  initError = signal<string | null>(null);

  // Escalate form
  escalateReason = '';
  escalateEngineer = '';

  remediationSteps = computed(() => stringList(this.currentSession()?.remediationStepsJson));
  spareParts = computed(() => stringList(this.currentSession()?.recommendedSparePartsJson));
  telemetry = computed(() => telemetryReadings(this.currentSession()?.telemetrySnapshotJson));
  channelSplit = computed(() => {
    const s = this.stats();
    return s ? `${s.whatsAppSessionCount} WhatsApp · ${s.ivrSessionCount} IVR` : '';
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.service.getList({ maxResultCount: 50 }).subscribe({
      next: (res) => {
        this.setSessions(res.items ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('The sessions could not be loaded.');
        this.isLoading.set(false);
      },
    });

    this.service.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set(null),
    });
  }

  /** A new list: keep the session on screen when it is still there, else show the newest. */
  private setSessions(list: RemoteMaintenanceSessionDto[]): void {
    this.sessions.set(list);
    const keep = list.find((s) => s.id === this.selectedSessionId) ?? list[0] ?? null;
    this.currentSession.set(keep);
    this.selectedSessionId = keep?.id ?? '';
    this.applyFilters();
  }

  /** Replace one session everywhere it is shown. */
  private updateSession(updated: RemoteMaintenanceSessionDto): void {
    this.currentSession.set(updated);
    this.sessions.update((list) => list.map((s) => (s.id === updated.id ? updated : s)));
    this.applyFilters();
  }

  onSessionSelected(): void {
    const found = this.sessions().find((s) => s.id === this.selectedSessionId);
    if (found) this.currentSession.set(found);
  }

  viewInConsole(session: RemoteMaintenanceSessionDto): void {
    this.currentSession.set(session);
    this.selectedSessionId = session.id ?? '';
    this.activeTab.set('Live console');
  }

  isClosed(s: RemoteMaintenanceSessionDto): boolean {
    return (
      s.status === MaintenanceSessionStatus.ResolvedRemotely ||
      s.status === MaintenanceSessionStatus.EscalatedToFieldTicket ||
      s.status === MaintenanceSessionStatus.Cancelled
    );
  }

  switchChannel(newChannel: MaintenanceChannel): void {
    const cur = this.currentSession();
    if (!cur?.id || cur.preferredChannel === newChannel) return;

    this.service.switchChannel({ sessionId: cur.id, newChannel }).subscribe({
      next: (res) => {
        this.updateSession(res);
        this.toasts.info('Channel switched.');
      },
      error: (err) =>
        this.toasts.error(err?.error?.error?.message ?? 'The channel could not be switched.'),
    });
  }

  sendWhatsAppTurn(): void {
    const text = this.waMessageInput.trim();
    const cur = this.currentSession();
    if (!text || !cur?.id) return;

    this.service
      .sendChannelTurn({
        sessionId: cur.id,
        turnType: DiagnosticTurnType.UserPrompt,
        channel: MaintenanceChannel.WhatsApp,
        inputOrPrompt: text,
      })
      .subscribe({
        next: (res) => {
          this.updateSession(res);
          this.waMessageInput = '';
        },
        error: (err) =>
          this.toasts.error(err?.error?.error?.message ?? 'The reply could not be sent.'),
      });
  }

  sendIvrDigit(digit: string): void {
    const cur = this.currentSession();
    if (!cur?.id) return;

    this.service
      .sendChannelTurn({
        sessionId: cur.id,
        turnType: DiagnosticTurnType.IvrMenuChoice,
        channel: MaintenanceChannel.IvrPhone,
        inputOrPrompt: digit,
      })
      .subscribe({
        next: (res) => this.updateSession(res),
        error: (err) =>
          this.toasts.error(err?.error?.error?.message ?? 'The key press could not be sent.'),
      });
  }

  quickReply(text: string): void {
    this.waMessageInput = text;
    this.sendWhatsAppTurn();
  }

  markResolvedRemotely(): void {
    const cur = this.currentSession();
    if (!cur?.id) return;
    const notes = 'Operator confirmed the equipment is running normally after the remote fix.';

    this.service.resolveRemotely({ sessionId: cur.id, resolutionNotes: notes }).subscribe({
      next: (res) => {
        this.updateSession(res);
        this.toasts.success('Session resolved remotely.');
        this.refreshStats();
      },
      error: (err) =>
        this.toasts.error(err?.error?.error?.message ?? 'The session could not be resolved.'),
    });
  }

  openEscalateModal(): void {
    const model = this.currentSession()?.equipmentModel;
    this.escalateReason = model
      ? `The fault on ${model} persists after the remote steps. It needs a part replaced and tested on site.`
      : '';
    this.escalateEngineer = '';
    this.showEscalateModal.set(true);
  }

  confirmEscalateToField(): void {
    const cur = this.currentSession();
    if (!cur?.id || !this.escalateReason.trim()) return;

    this.service
      .escalateToFieldTicket({
        sessionId: cur.id,
        reason: this.escalateReason.trim(),
        assignedFieldEngineer: this.escalateEngineer.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.updateSession(res);
          this.showEscalateModal.set(false);
          this.toasts.info('Escalated to a field visit. A field service ticket was raised.');
          this.refreshStats();
        },
        error: (err) =>
          this.toasts.error(err?.error?.error?.message ?? 'The session could not be escalated.'),
      });
  }

  private refreshStats(): void {
    this.service.getStats().subscribe({ next: (s) => this.stats.set(s), error: () => undefined });
  }

  openInitiate(): void {
    this.initContact.set(null);
    this.initCustomerPhone = '';
    this.initEquipmentModel = '';
    this.initEquipmentSerial = '';
    this.initCategory = EquipmentCategory.VfdAndDrive;
    this.initChannel = MaintenanceChannel.WhatsApp;
    this.initFaultCode = '';
    this.initSymptoms = '';
    this.initSeverity = MaintenanceSeverity.Medium;
    this.initError.set(null);
    this.showInitiateModal.set(true);
  }

  /** The contact reporting the fault; their WhatsApp number fills the phone. */
  async pickInitContact(option: PickerOption | null): Promise<void> {
    this.initContact.set(option);
    if (!option) return;
    try {
      const c = await firstValueFrom(this.contacts.get(option.id, { skipHandleError: true }));
      if (this.initContact()?.id === option.id && c.waId && !this.initCustomerPhone.trim()) {
        this.initCustomerPhone = c.waId.startsWith('+') ? c.waId : `+${c.waId}`;
      }
    } catch {
      // The phone is typed by hand.
    }
  }

  onInitiateSubmit(): void {
    const contact = this.initContact();
    const phone = this.initCustomerPhone.trim();
    const missing = [
      !contact && 'the customer contact',
      !phone && 'their phone',
      !this.initEquipmentModel.trim() && 'the equipment model',
      !this.initEquipmentSerial.trim() && 'the serial number',
      !this.initSymptoms.trim() && 'what happened',
    ].filter(Boolean);
    if (missing.length || !contact) {
      this.initError.set(`Fill in ${missing.join(', ')}.`);
      return;
    }

    const input: InitiateRemoteMaintenanceInput = {
      customerId: contact.id,
      contactId: contact.id,
      customerName: contact.label,
      customerContactPhone: phone,
      equipmentCategory: this.initCategory,
      equipmentModel: this.initEquipmentModel.trim(),
      equipmentSerialNumber: this.initEquipmentSerial.trim(),
      preferredChannel: this.initChannel,
      faultCode: this.initFaultCode.trim() || undefined,
      reportedSymptoms: this.initSymptoms.trim(),
      severity: this.initSeverity,
    };

    this.initBusy.set(true);
    this.initError.set(null);
    this.service.initiateSession(input).subscribe({
      next: (created) => {
        this.initBusy.set(false);
        this.afterCreated(created);
        this.refreshStats();
      },
      error: (err) => {
        this.initBusy.set(false);
        this.initError.set(err?.error?.error?.message ?? 'The session could not be started.');
      },
    });
  }

  private afterCreated(created: RemoteMaintenanceSessionDto): void {
    this.sessions.update((list) => [created, ...list]);
    this.currentSession.set(created);
    this.selectedSessionId = created.id ?? '';
    this.applyFilters();
    this.showInitiateModal.set(false);
    this.activeTab.set('Live console');
    this.toasts.success(`Session ${created.sessionCode} started.`);
  }

  applyFilters(): void {
    let list = [...this.sessions()];
    if (this.filterChannel !== null)
      list = list.filter((s) => s.preferredChannel === this.filterChannel);
    if (this.filterStatus !== null) list = list.filter((s) => s.status === this.filterStatus);
    this.filteredSessions.set(list);
  }

  confidenceTone(percent: number | null | undefined): MeterTone {
    const p = percent ?? 0;
    return p >= 85 ? 'good' : p >= 65 ? 'amber' : 'bad';
  }

  actionText(action: string): string {
    return actionLabel(action);
  }

  round(value: number): number {
    return Math.round(value * 10) / 10;
  }

  formatRupeesCompact(val: number): string {
    return inrCompact(val);
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDateTime(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
  }

  getStatusTone(status: MaintenanceSessionStatus): ChipTone {
    return STATUS_TONES[status] ?? 'neutral';
  }

  getStatusLabel(status: MaintenanceSessionStatus): string {
    return STATUS_LABELS[status] ?? 'Started';
  }

  getSeverityTone(severity: MaintenanceSeverity): ChipTone {
    return SEVERITY_TONES[severity] ?? 'neutral';
  }

  getSeverityLabel(severity: MaintenanceSeverity): string {
    return SEVERITY_LABELS[severity] ?? 'Medium';
  }
}
