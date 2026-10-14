import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { inr, inrCompact } from '../../../core/util/format';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  DiagnosticTurnType,
  EquipmentCategory,
  equipmentCategoryOptions,
  InitiateRemoteMaintenanceInput,
  MaintenanceChannel,
  maintenanceChannelOptions,
  MaintenanceDiagnosticTurnDto,
  MaintenanceSessionStatus,
  MaintenanceSeverity,
  maintenanceSeverityOptions,
  RemoteMaintenanceService,
  RemoteMaintenanceSessionDto,
  RemoteMaintenanceStatsDto,
} from '../../../proxy/maintenance';
import { ArButton, ArCard, ArChip, ArDialog, ArIcon, ChipTone } from '../../../ui';

const STATUS_TONES: Record<MaintenanceSessionStatus, ChipTone> = {
  [MaintenanceSessionStatus.Initiated]: 'neutral',
  [MaintenanceSessionStatus.Diagnosing]: 'amber',
  [MaintenanceSessionStatus.RemediationProvided]: 'teal',
  [MaintenanceSessionStatus.ResolvedRemotely]: 'good',
  [MaintenanceSessionStatus.EscalatedToFieldTicket]: 'bad',
  [MaintenanceSessionStatus.Cancelled]: 'neutral',
};

const STATUS_LABELS: Record<MaintenanceSessionStatus, string> = {
  [MaintenanceSessionStatus.Initiated]: 'Initiated',
  [MaintenanceSessionStatus.Diagnosing]: 'Diagnosing',
  [MaintenanceSessionStatus.RemediationProvided]: 'Remediation Ready',
  [MaintenanceSessionStatus.ResolvedRemotely]: 'Resolved Remotely',
  [MaintenanceSessionStatus.EscalatedToFieldTicket]: 'Escalated to Field',
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
  [MaintenanceSeverity.CriticalEmergency]: 'Critical / Emergency',
};

const MOCK_TURNS_WHATSAPP: MaintenanceDiagnosticTurnDto[] = [
  {
    id: 't-1',
    sessionId: 's-1',
    turnNumber: 1,
    turnType: DiagnosticTurnType.UserPrompt,
    channel: MaintenanceChannel.WhatsApp,
    inputOrPrompt:
      'Line 2 Extruder drive tripped with error F0002. Motor stopped abruptly during batch run. Smells warm.',
    aiResponseOrGuidance:
      'Fault telemetry logged. Commencing autonomous diagnostic inference on Siemens Sinamics G120 (S/N: SN-G120-88412).',
    actionTaken: 'SessionInitiated',
    createdAtUtc: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
  {
    id: 't-2',
    sessionId: 's-1',
    turnNumber: 2,
    turnType: DiagnosticTurnType.RemediationGuidance,
    channel: MaintenanceChannel.WhatsApp,
    inputOrPrompt: 'Autonomous diagnostic inference complete. Transmitting WhatsApp action guide.',
    aiResponseOrGuidance:
      "🤖 *AutoReach AI Remote Maintenance Assistant*\n━━━━━━━━━━━━━━━━━━━━━\n📍 *Equipment:* Siemens Sinamics G120 (S/N: SN-G120-88412)\n⚠️ *Identified Fault:* F0002 (IGBT Phase Overcurrent)\n🔍 *Root Cause (94.5% match):*\nPhase overcurrent triggered by steep acceleration or motor winding degradation.\n\n🛠️ *Step-by-Step Remediation Guide:*\n*1.* Isolate 415V 3-phase supply and wait for DC bus discharge (<24V).\n*2.* Disconnect motor leads (U,V,W) and test insulation using 500V Megger (>10 MΩ).\n*3.* Inspect mechanical gearbox for rotor binding or bearing freeze.\n*4.* Increase acceleration ramp time parameter P1120 from 2.0s to 5.0s.\n\n📦 *Recommended Spare (In Stock):*\n• 6SL3210-1KE21-3AF1 (Siemens G120 Power Module)\n\n⏱️ *Estimated Downtime:* ~35 mins\n━━━━━━━━━━━━━━━━━━━━━\n👉 *Reply:* 'FIXED' if resolved | 'STEP [N]' for guidance | 'ESCALATE' for field engineer.",
    actionTaken: 'InitialGuidanceSent',
    createdAtUtc: new Date(Date.now() - 40 * 60_000).toISOString(),
  },
  {
    id: 't-3',
    sessionId: 's-1',
    turnNumber: 3,
    turnType: DiagnosticTurnType.UserPrompt,
    channel: MaintenanceChannel.WhatsApp,
    inputOrPrompt:
      'Checked motor leads with Megger: insulation resistance is 28 Mega-Ohms. Motor spins freely by hand.',
    aiResponseOrGuidance:
      'Telemetry reading verified: 28 MΩ is healthy (>10 MΩ threshold) and no mechanical jamming exists. Root cause is confirmed as acceleration overload (P1120) under cold batch viscosity.\n\nPlease navigate to BOP-2 keypad: Set Parameter P1120 = 5.5s and enable Flying Start (P1200 = 1). Then restart line at 25% speed.',
    actionTaken: 'FollowUpGuidance',
    createdAtUtc: new Date(Date.now() - 25 * 60_000).toISOString(),
  },
  {
    id: 't-4',
    sessionId: 's-1',
    turnNumber: 4,
    turnType: DiagnosticTurnType.UserPrompt,
    channel: MaintenanceChannel.WhatsApp,
    inputOrPrompt:
      'Set P1120 to 5.5s and started at 25% speed. Extruder is running smooth now! Current is 14.2A.',
    aiResponseOrGuidance:
      'Great news! Current of 14.2A is well below 18.0A rated capacity. Fault F0002 cleared. Machine marked operational. No on-site visit is needed! Thank you for using MNI 24/7 AI Remote Support! 🚀',
    actionTaken: 'CustomerConfirmedResolution',
    createdAtUtc: new Date(Date.now() - 10 * 60_000).toISOString(),
  },
];

const MOCK_TURNS_IVR: MaintenanceDiagnosticTurnDto[] = [
  {
    id: 't-11',
    sessionId: 's-2',
    turnNumber: 1,
    turnType: DiagnosticTurnType.UserPrompt,
    channel: MaintenanceChannel.IvrPhone,
    inputOrPrompt:
      '[Inbound Voice Call] Plant Technician called +91 80 6912 4000 regarding ABB ACS880 Drive.',
    aiResponseOrGuidance:
      '[IVR Automated Voice Script]\n"Welcome to MNI Industrial Automation 24/7 AI Remote Diagnostics. For your ABB ACS880 Drive, we have identified fault Over-Temperature (F0004) with root cause: Heatsink thermal limit breached (>85°C).\n\nPlease select an option:\nPress 1 to hear step-by-step heatsink and cooling fan check instructions.\nPress 2 to listen to parameter reset guidance.\nPress 9 if the fault is cleared and the machine is running.\nPress 0 to transfer directly to an on-call senior field service engineer."',
    actionTaken: 'IvrWelcomeMenu',
    createdAtUtc: new Date(Date.now() - 30 * 60_000).toISOString(),
  },
  {
    id: 't-12',
    sessionId: 's-2',
    turnNumber: 2,
    turnType: DiagnosticTurnType.IvrMenuChoice,
    channel: MaintenanceChannel.IvrPhone,
    inputOrPrompt: '1',
    aiResponseOrGuidance:
      'IVR Spoken: Step 1 active. Ensure control cabinet cooling fan is rotating. Inspect external heatsink filter for lint or dust blockage. Use dry compressed air below 2 bar to clear fins. Press 9 when complete, or 0 for an engineer.',
    actionTaken: 'IVR_Step1_Selected',
    createdAtUtc: new Date(Date.now() - 22 * 60_000).toISOString(),
  },
  {
    id: 't-13',
    sessionId: 's-2',
    turnNumber: 3,
    turnType: DiagnosticTurnType.IvrMenuChoice,
    channel: MaintenanceChannel.IvrPhone,
    inputOrPrompt: '9',
    aiResponseOrGuidance:
      'IVR Spoken: Excellent! Verification acknowledged. Fan was clogged and has been cleared. Heatsink temperature dropped to 48°C. Session logged as resolved. Have a productive shift!',
    actionTaken: 'IVR_Verified',
    createdAtUtc: new Date(Date.now() - 15 * 60_000).toISOString(),
  },
];

const MOCK_SESSIONS: RemoteMaintenanceSessionDto[] = [
  {
    id: 's-1',
    sessionCode: 'RMS-2026-0041',
    customerId: 'c-101',
    customerName: 'Tata Motors Powertrain Division (Pune)',
    customerContactPhone: '+91 98220 54321',
    equipmentCategory: EquipmentCategory.VfdAndDrive,
    equipmentModel: 'Siemens Sinamics G120 (7.5 kW)',
    equipmentSerialNumber: 'SN-G120-88412',
    preferredChannel: MaintenanceChannel.WhatsApp,
    status: MaintenanceSessionStatus.ResolvedRemotely,
    severity: MaintenanceSeverity.High,
    faultCode: 'F0002',
    reportedSymptoms:
      'Extruder motor stopped abruptly with IGBT overcurrent trip during batch run.',
    telemetrySnapshotJson: JSON.stringify({ temp_c: 62, bus_voltage: 580, motor_current: 24.5 }),
    rootCauseDiagnosis:
      'IGBT phase overcurrent trigger caused by steep acceleration ramp (parameter P1120) under high polymer batch viscosity.',
    confidencePercent: 94.5,
    remediationStepsJson: JSON.stringify([
      'Isolate 415V supply and verify DC bus discharge (<24V).',
      'Perform 500V Megger insulation test on motor leads (>10 MΩ).',
      'Increase acceleration ramp time parameter P1120 from 2.0s to 5.5s.',
      'Enable Flying Start (P1200=1) to prevent shock starting.',
    ]),
    recommendedSparePartsJson: JSON.stringify([
      '6SL3210-1KE21-3AF1 (Siemens G120 Power Module 7.5kW)',
      '3AUA0000058186 (ABB ACS880 Cooling Fan Kit)',
    ]),
    estimatedDowntimeMinutes: 35,
    resolvedRemotely: true,
    resolutionNotes:
      'Customer confirmed line operational after P1120 acceleration ramp adjustment via WhatsApp.',
    fieldVisitRequired: false,
    diagnosticTurns: MOCK_TURNS_WHATSAPP,
    creationTime: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
  {
    id: 's-2',
    sessionCode: 'RMS-2026-0042',
    customerId: 'c-102',
    customerName: 'JSW Steel Rolling Mill (Vijayanagar)',
    customerContactPhone: '+91 94480 12345',
    equipmentCategory: EquipmentCategory.VfdAndDrive,
    equipmentModel: 'ABB ACS880 Heavy Industrial Drive (45 kW)',
    equipmentSerialNumber: 'SN-ACS880-9921',
    preferredChannel: MaintenanceChannel.IvrPhone,
    status: MaintenanceSessionStatus.ResolvedRemotely,
    severity: MaintenanceSeverity.Medium,
    faultCode: 'F0004',
    reportedSymptoms: 'Heatsink over-temperature alarm sounded on rolling stand drive.',
    telemetrySnapshotJson: JSON.stringify({ temp_c: 84, bus_voltage: 565, fan_rpm: 1200 }),
    rootCauseDiagnosis:
      'Inverter heatsink over-temperature limit breached (>85°C) due to clogged cabinet air filter mesh.',
    confidencePercent: 92.0,
    remediationStepsJson: JSON.stringify([
      'Inspect cabinet cooling fan rotation and air filter mesh.',
      'Clear dust accumulated on heat exchanger fins with compressed air.',
      'Verify panel AC ambient temperature is below 40°C.',
    ]),
    recommendedSparePartsJson: JSON.stringify([
      'R2E190-AO26-05 (Ebm-Papst Inverter Cooling Fan 230V)',
    ]),
    estimatedDowntimeMinutes: 20,
    resolvedRemotely: true,
    resolutionNotes: 'Resolved over IVR phone menu: technician cleared clogged cabinet fan filter.',
    fieldVisitRequired: false,
    diagnosticTurns: MOCK_TURNS_IVR,
    creationTime: new Date(Date.now() - 30 * 60_000).toISOString(),
  },
  {
    id: 's-3',
    sessionCode: 'RMS-2026-0043',
    customerId: 'c-103',
    customerName: 'Thermax Boilers & Heating (Chinchwad)',
    customerContactPhone: '+91 97650 99881',
    equipmentCategory: EquipmentCategory.PlcAndController,
    equipmentModel: 'Siemens SIMATIC S7-1500 Controller',
    equipmentSerialNumber: 'SN-S71500-4412',
    preferredChannel: MaintenanceChannel.WhatsApp,
    status: MaintenanceSessionStatus.Diagnosing,
    severity: MaintenanceSeverity.High,
    faultCode: 'ERR_PROFINET_TIMEOUT',
    reportedSymptoms:
      'Flashing red BF (Bus Fault) LED on remote ET200SP IO island. Deaerator pump stopped.',
    telemetrySnapshotJson: JSON.stringify({
      temp_c: 38,
      bus_voltage: 24.1,
      ping_loss_percent: 100,
    }),
    rootCauseDiagnosis:
      'Profinet IO fieldbus cycle communication timeout between central CPU 1515 and distributed IO rack.',
    confidencePercent: 89.5,
    remediationStepsJson: JSON.stringify([
      'Inspect green RJ45 Profinet cable and shielded grounding clamp.',
      'Check link LED on unmanaged switch port 4.',
      'Verify 24V DC auxiliary power supply on remote rack terminal X1.',
    ]),
    recommendedSparePartsJson: JSON.stringify([
      '6GK1901-1BB10-2AA0 (FastConnect RJ45 Plug)',
      '6XV1840-2AH10 (Profinet Type A 4-core Cable)',
    ]),
    estimatedDowntimeMinutes: 25,
    resolvedRemotely: false,
    fieldVisitRequired: false,
    diagnosticTurns: [
      {
        id: 't-21',
        sessionId: 's-3',
        turnNumber: 1,
        turnType: DiagnosticTurnType.UserPrompt,
        channel: MaintenanceChannel.WhatsApp,
        inputOrPrompt: 'Red BF LED flashing on Siemens S7-1500 rack. Remote IO lost.',
        aiResponseOrGuidance:
          'Profinet bus fault diagnosed. Check link LED on Ethernet port and measure 24V supply on terminal X1.',
        actionTaken: 'SessionInitiated',
        createdAtUtc: new Date(Date.now() - 8 * 60_000).toISOString(),
      },
    ],
    creationTime: new Date(Date.now() - 8 * 60_000).toISOString(),
  },
];

const MOCK_STATS: RemoteMaintenanceStatsDto = {
  totalSessions: 38,
  resolvedRemotelyCount: 29,
  remoteResolutionRatePercent: 76.3,
  escalatedToFieldCount: 9,
  fieldDeflectionRatePercent: 76.3,
  whatsAppSessionCount: 24,
  ivrSessionCount: 14,
  averageResolutionTimeMinutes: 26.5,
  estimatedCostSavingsInPaise: 435_000_00,
  estimatedCostSavingsInRupees: 435_000,
};

@Component({
  selector: 'ar-remote-maintenance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArCard, ArChip, ArDialog, ArIcon],
  template: `
    <div class="remote-maint-page">
      <ar-topbar
        title="AI Remote Maintenance & Diagnostics"
        subtitle="24/7 autonomous equipment diagnostics and remediation guidance over WhatsApp & IVR voice"
      >
        <div class="topbar-actions">
          <button
            type="button"
            ar-button
            variant="ai"
            icon="sparkle"
            (click)="showInitiateModal.set(true)"
          >
            New Diagnostic Session
          </button>
          <button type="button" ar-button variant="ghost" icon="refresh" (click)="loadData()">
            Refresh
          </button>
        </div>
      </ar-topbar>

      <!-- Executive KPIs -->
      <section class="kpi-grid">
        <ar-card class="kpi-card">
          <div class="kpi-label">Remote Resolution Rate</div>
          <div class="kpi-value text-good">{{ stats()?.remoteResolutionRatePercent ?? 76.3 }}%</div>
          <div class="kpi-subtext">
            <span
              >{{ stats()?.resolvedRemotelyCount ?? 29 }} of
              {{ stats()?.totalSessions ?? 38 }} sessions</span
            >
            <ar-chip tone="good">Resolved Remotely</ar-chip>
          </div>
        </ar-card>

        <ar-card class="kpi-card">
          <div class="kpi-label">Field Deflection Savings</div>
          <div class="kpi-value text-accent">
            {{ formatRupeesCompact(stats()?.estimatedCostSavingsInRupees ?? 435000) }}
          </div>
          <div class="kpi-subtext">
            <span>Travel & logistics saved</span>
            <span class="pill-badge positive">₹15K / trip</span>
          </div>
        </ar-card>

        <ar-card class="kpi-card">
          <div class="kpi-label">Channel Distribution</div>
          <div class="kpi-value channel-split-val">
            <span class="wa-part">{{ stats()?.whatsAppSessionCount ?? 24 }} WA</span>
            <span class="ivr-part">/ {{ stats()?.ivrSessionCount ?? 14 }} IVR</span>
          </div>
          <div class="kpi-subtext">
            <span>User Choice: 63% WhatsApp · 37% IVR</span>
            <ar-chip tone="teal">Dual Channel</ar-chip>
          </div>
        </ar-card>

        <ar-card class="kpi-card">
          <div class="kpi-label">Avg Remediation Time</div>
          <div class="kpi-value">{{ stats()?.averageResolutionTimeMinutes ?? 26.5 }}m</div>
          <div class="kpi-subtext">
            <span>Downtime reduced by 72%</span>
            <ar-chip tone="neutral">High Velocity</ar-chip>
          </div>
        </ar-card>
      </section>

      <!-- View Switcher Tabs -->
      <div class="tab-bar">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'console'"
          (click)="activeTab.set('console')"
        >
          <ar-icon name="sparkle"></ar-icon>
          Live Diagnostic Console
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'sessions'"
          (click)="activeTab.set('sessions')"
        >
          <ar-icon name="document"></ar-icon>
          All Sessions History ({{ sessions().length }})
        </button>
      </div>

      <!-- Tab 1: Live Diagnostic Console -->
      @if (activeTab() === 'console') {
        <div class="console-layout">
          <!-- Session Selector Strip & Active Channel Picker -->
          <div class="session-bar">
            <div class="session-picker">
              <label>Active Session:</label>
              <select [(ngModel)]="selectedSessionId" (change)="onSessionSelected()">
                @for (s of sessions(); track s.id) {
                  <option [value]="s.id">
                    {{ s.sessionCode }} · {{ s.customerName }} · {{ s.equipmentModel }}
                  </option>
                }
              </select>
            </div>

            <!-- User Channel Toggle (WhatsApp vs IVR) -->
            <div class="channel-toggle-box">
              <span class="toggle-label">Active Channel:</span>
              <div class="toggle-buttons">
                <button
                  type="button"
                  class="ch-btn"
                  [class.selected]="
                    currentSession()?.preferredChannel === MaintenanceChannel.WhatsApp
                  "
                  (click)="switchChannel(MaintenanceChannel.WhatsApp)"
                >
                  <ar-icon name="send"></ar-icon>
                  WhatsApp
                </button>
                <button
                  type="button"
                  class="ch-btn"
                  [class.selected]="
                    currentSession()?.preferredChannel === MaintenanceChannel.IvrPhone
                  "
                  (click)="switchChannel(MaintenanceChannel.IvrPhone)"
                >
                  <ar-icon name="tower"></ar-icon>
                  IVR Phone
                </button>
              </div>
            </div>

            <div class="session-status-badge">
              <ar-chip [tone]="getStatusTone(currentSession()?.status ?? 0)">
                {{ getStatusLabel(currentSession()?.status ?? 0) }}
              </ar-chip>
            </div>
          </div>

          <!-- 3-Column Diagnostic Workspace -->
          <div class="diagnostic-grid">
            <!-- Left Deck: Equipment & Telemetry Telemetry -->
            <ar-card class="deck-card">
              <div class="deck-header">
                <h3>Equipment & Telemetry</h3>
                <ar-chip [tone]="getSeverityTone(currentSession()?.severity ?? 0)">
                  {{ getSeverityLabel(currentSession()?.severity ?? 0) }}
                </ar-chip>
              </div>

              <div class="equipment-meta">
                <div class="meta-row">
                  <span class="lbl">Customer:</span>
                  <span class="val font-semibold">{{ currentSession()?.customerName }}</span>
                </div>
                <div class="meta-row">
                  <span class="lbl">Phone:</span>
                  <span class="val font-mono">{{ currentSession()?.customerContactPhone }}</span>
                </div>
                <div class="meta-row">
                  <span class="lbl">Model:</span>
                  <span class="val font-semibold">{{ currentSession()?.equipmentModel }}</span>
                </div>
                <div class="meta-row">
                  <span class="lbl">Serial No:</span>
                  <span class="val font-mono">{{ currentSession()?.equipmentSerialNumber }}</span>
                </div>
                <div class="meta-row">
                  <span class="lbl">Fault Code:</span>
                  <span class="val fault-code-pill">{{
                    currentSession()?.faultCode ?? 'General Breakdown'
                  }}</span>
                </div>
              </div>

              <!-- Live Sensor Gauges -->
              <div class="sensor-readings">
                <h4>Machine Sensor Telemetry</h4>
                <div class="sensors-grid">
                  <div class="sensor-box">
                    <span class="sensor-lbl">Heatsink Temp</span>
                    <span class="sensor-val" [class.val-hot]="getTelemetry().temp_c > 75">
                      {{ getTelemetry().temp_c }}°C
                    </span>
                    <span class="sensor-lim">Max: 85°C</span>
                  </div>
                  <div class="sensor-box">
                    <span class="sensor-lbl">DC Bus Voltage</span>
                    <span class="sensor-val">{{ getTelemetry().bus_voltage }}V</span>
                    <span class="sensor-lim">Nominal: 560V</span>
                  </div>
                  <div class="sensor-box">
                    <span class="sensor-lbl">Motor Current</span>
                    <span
                      class="sensor-val"
                      [class.val-warn]="(getTelemetry().motor_current ?? 0) > 18"
                    >
                      {{ getTelemetry().motor_current ?? 14.2 }}A
                    </span>
                    <span class="sensor-lim">Rated: 18.0A</span>
                  </div>
                  <div class="sensor-box">
                    <span class="sensor-lbl">Est. Downtime</span>
                    <span class="sensor-val text-accent"
                      >~{{ currentSession()?.estimatedDowntimeMinutes ?? 30 }}m</span
                    >
                    <span class="sensor-lim">Without visit</span>
                  </div>
                </div>
              </div>

              <div class="symptom-notes">
                <h4>Reported Symptoms</h4>
                <p>{{ currentSession()?.reportedSymptoms }}</p>
              </div>
            </ar-card>

            <!-- Center Deck: Interactive Channel Stream (WhatsApp / IVR) -->
            <ar-card class="stream-card">
              <div class="stream-header">
                @if (currentSession()?.preferredChannel === MaintenanceChannel.WhatsApp) {
                  <div class="channel-title wa-title">
                    <ar-icon name="send"></ar-icon>
                    <span>WhatsApp Diagnostic Conversation</span>
                  </div>
                  <span class="stream-channel-sub">Live 2-way industrial support</span>
                } @else {
                  <div class="channel-title ivr-title">
                    <ar-icon name="tower"></ar-icon>
                    <span>IVR Automated Voice Interaction</span>
                  </div>
                  <span class="stream-channel-sub">Exotel synthesized phone flow</span>
                }
              </div>

              <!-- Conversation Turns / Transcript Bubble List -->
              <div class="turns-container">
                @for (t of currentSession()?.diagnosticTurns ?? []; track t.id) {
                  <div
                    class="turn-bubble"
                    [class.user-turn]="
                      t.turnType === DiagnosticTurnType.UserPrompt ||
                      t.turnType === DiagnosticTurnType.IvrMenuChoice
                    "
                    [class.ai-turn]="
                      t.turnType === DiagnosticTurnType.RemediationGuidance ||
                      t.turnType === DiagnosticTurnType.AiDiagnosis
                    "
                    [class.ivr-bubble]="t.channel === MaintenanceChannel.IvrPhone"
                  >
                    <div class="turn-meta">
                      <span class="turn-sender">
                        {{
                          t.turnType === DiagnosticTurnType.UserPrompt ||
                          t.turnType === DiagnosticTurnType.IvrMenuChoice
                            ? 'Technician / Caller'
                            : 'AutoReach AI Support'
                        }}
                      </span>
                      <span class="turn-time">{{ formatTime(t.createdAtUtc) }}</span>
                    </div>

                    @if (t.turnType === DiagnosticTurnType.IvrMenuChoice) {
                      <div class="dtmf-chip">
                        <span>Pressed Key:</span> <strong>[{{ t.inputOrPrompt }}]</strong>
                      </div>
                    } @else {
                      <div class="turn-text">{{ t.inputOrPrompt }}</div>
                    }

                    <div class="turn-response">
                      <pre class="formatted-ai-response">{{ t.aiResponseOrGuidance }}</pre>
                    </div>

                    @if (t.actionTaken) {
                      <div class="action-tag">Action: {{ t.actionTaken }}</div>
                    }
                  </div>
                }
              </div>

              <!-- Channel Interaction Input Box -->
              <div class="interaction-input-box">
                @if (currentSession()?.preferredChannel === MaintenanceChannel.WhatsApp) {
                  <div class="wa-input-row">
                    <input
                      type="text"
                      [(ngModel)]="waMessageInput"
                      placeholder="Type technician reply (e.g. 'Insulation is 25 MΩ', 'FIXED', 'ESCALATE')..."
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
                  <div class="quick-chips">
                    <button
                      type="button"
                      class="quick-chip"
                      (click)="quickReply('Insulation measured 25 MΩ. Healthy.')"
                    >
                      Quick: Insulation Healthy
                    </button>
                    <button
                      type="button"
                      class="quick-chip"
                      (click)="quickReply('FIXED: Machine running normal.')"
                    >
                      Quick: Fixed &amp; Running
                    </button>
                    <button
                      type="button"
                      class="quick-chip"
                      (click)="quickReply('ESCALATE: Motor windings burnt.')"
                    >
                      Quick: Burnt / Escalate
                    </button>
                  </div>
                } @else {
                  <!-- IVR Dialpad Interaction -->
                  <div class="ivr-keypad-panel">
                    <span class="keypad-title">Simulate DTMF Keypress:</span>
                    <div class="keypad-grid">
                      <button type="button" class="key-btn" (click)="sendIvrDigit('1')">
                        1: Steps
                      </button>
                      <button type="button" class="key-btn" (click)="sendIvrDigit('2')">
                        2: Reset
                      </button>
                      <button type="button" class="key-btn" (click)="sendIvrDigit('9')">
                        9: Resolved
                      </button>
                      <button type="button" class="key-btn key-esc" (click)="sendIvrDigit('0')">
                        0: Engineer
                      </button>
                    </div>
                  </div>
                }
              </div>
            </ar-card>

            <!-- Right Deck: AI Diagnostics & Resolution Deck -->
            <ar-card class="deck-card">
              <div class="deck-header">
                <h3>AI Root Cause &amp; Plan</h3>
                <div class="confidence-badge">
                  <span class="conf-num"
                    >{{ currentSession()?.confidencePercent?.toFixed(1) }}%</span
                  >
                  <span class="conf-lbl">confidence</span>
                </div>
              </div>

              <!-- Root Cause Explanation -->
              <div class="diagnosis-box">
                <h4>Diagnosis</h4>
                <p>{{ currentSession()?.rootCauseDiagnosis }}</p>
              </div>

              <!-- Remediation Checklist -->
              <div class="remediation-box">
                <h4>Remediation Steps</h4>
                <ol class="steps-list">
                  @for (step of parsedRemediationSteps(); track $index) {
                    <li>{{ step }}</li>
                  }
                </ol>
              </div>

              <!-- Recommended Spare Parts -->
              <div class="spares-box">
                <h4>Recommended OEM Spares</h4>
                <ul class="spares-list">
                  @for (spare of parsedSpareParts(); track $index) {
                    <li>
                      <ar-icon name="machine"></ar-icon>
                      <span>{{ spare }}</span>
                    </li>
                  }
                </ul>
              </div>

              <!-- Action Controls -->
              <div class="resolution-actions">
                <button
                  type="button"
                  ar-button
                  variant="primary"
                  [disabled]="
                    currentSession()?.status === MaintenanceSessionStatus.ResolvedRemotely
                  "
                  (click)="markResolvedRemotely()"
                >
                  Mark Resolved Remotely
                </button>
                <button
                  type="button"
                  ar-button
                  variant="danger"
                  [disabled]="
                    currentSession()?.status === MaintenanceSessionStatus.EscalatedToFieldTicket
                  "
                  (click)="openEscalateModal()"
                >
                  Escalate to Field Visit
                </button>
              </div>
            </ar-card>
          </div>
        </div>
      }

      <!-- Tab 2: Sessions History Table -->
      @if (activeTab() === 'sessions') {
        <ar-card class="history-card">
          <div class="history-toolbar">
            <div class="filter-group">
              <label>Channel:</label>
              <select [(ngModel)]="filterChannel" (change)="applyFilters()">
                <option [ngValue]="null">All Channels</option>
                <option [ngValue]="MaintenanceChannel.WhatsApp">WhatsApp</option>
                <option [ngValue]="MaintenanceChannel.IvrPhone">IVR Phone</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Status:</label>
              <select [(ngModel)]="filterStatus" (change)="applyFilters()">
                <option [ngValue]="null">All Statuses</option>
                <option [ngValue]="MaintenanceSessionStatus.ResolvedRemotely">
                  Resolved Remotely
                </option>
                <option [ngValue]="MaintenanceSessionStatus.Diagnosing">Diagnosing</option>
                <option [ngValue]="MaintenanceSessionStatus.EscalatedToFieldTicket">
                  Escalated to Field
                </option>
              </select>
            </div>
            <div class="record-counter">
              Showing {{ filteredSessions().length }} of {{ sessions().length }} sessions
            </div>
          </div>

          <div class="table-responsive">
            <table class="session-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Customer</th>
                  <th>Equipment Model</th>
                  <th>Fault Code</th>
                  <th>Channel</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (s of filteredSessions(); track s.id) {
                  <tr>
                    <td class="font-mono font-semibold">{{ s.sessionCode }}</td>
                    <td>{{ s.customerName }}</td>
                    <td class="font-semibold">{{ s.equipmentModel }}</td>
                    <td>
                      <span class="fault-code-pill">{{ s.faultCode ?? 'General' }}</span>
                    </td>
                    <td>
                      <ar-chip
                        [tone]="
                          s.preferredChannel === MaintenanceChannel.WhatsApp ? 'good' : 'teal'
                        "
                      >
                        {{
                          s.preferredChannel === MaintenanceChannel.WhatsApp
                            ? 'WhatsApp'
                            : 'IVR Phone'
                        }}
                      </ar-chip>
                    </td>
                    <td>
                      <ar-chip [tone]="getSeverityTone(s.severity)">
                        {{ getSeverityLabel(s.severity) }}
                      </ar-chip>
                    </td>
                    <td>
                      <ar-chip [tone]="getStatusTone(s.status)">
                        {{ getStatusLabel(s.status) }}
                      </ar-chip>
                    </td>
                    <td>{{ s.confidencePercent.toFixed(1) }}%</td>
                    <td class="text-right">
                      <button type="button" ar-button variant="ghost" (click)="viewInConsole(s)">
                        Inspect
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </ar-card>
      }

      <!-- Modal: Initiate Diagnostic Session -->
      @if (showInitiateModal()) {
        <ar-dialog
          title="Initiate AI Remote Diagnostic Session"
          (dismiss)="showInitiateModal.set(false)"
        >
          <div class="dialog-form">
            <div class="form-row">
              <label>Customer Name *</label>
              <input
                type="text"
                [(ngModel)]="initCustomerName"
                class="form-input"
                placeholder="e.g. Tata Motors Powertrain"
              />
            </div>
            <div class="form-row">
              <label>Technician / Contact Phone *</label>
              <input
                type="text"
                [(ngModel)]="initCustomerPhone"
                class="form-input"
                placeholder="e.g. +91 98220 54321"
              />
            </div>
            <div class="form-row">
              <label>Equipment Model *</label>
              <input
                type="text"
                [(ngModel)]="initEquipmentModel"
                class="form-input"
                placeholder="e.g. Siemens Sinamics G120 (7.5 kW)"
              />
            </div>
            <div class="form-row">
              <label>Equipment Serial Number *</label>
              <input
                type="text"
                [(ngModel)]="initEquipmentSerial"
                class="form-input"
                placeholder="e.g. SN-G120-88412"
              />
            </div>
            <div class="form-row">
              <label>Equipment Category</label>
              <select [(ngModel)]="initCategory" class="form-input">
                @for (opt of equipmentCategoryOptions; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            <div class="form-row">
              <label>Preferred Interaction Channel *</label>
              <select [(ngModel)]="initChannel" class="form-input font-semibold">
                @for (ch of maintenanceChannelOptions; track ch.value) {
                  <option [ngValue]="ch.value">{{ ch.label }}</option>
                }
              </select>
            </div>
            <div class="form-row">
              <label>Fault Code (from display/HMI)</label>
              <input
                type="text"
                [(ngModel)]="initFaultCode"
                class="form-input"
                placeholder="e.g. F0002, F0004, ERR_PROFINET_TIMEOUT"
              />
            </div>
            <div class="form-row">
              <label>Reported Symptoms &amp; Fault Description *</label>
              <textarea
                [(ngModel)]="initSymptoms"
                rows="3"
                class="form-input"
                placeholder="Describe symptoms, noise, odors, or tripping sequence..."
              ></textarea>
            </div>
            <div class="form-row">
              <label>Severity Level</label>
              <select [(ngModel)]="initSeverity" class="form-input">
                @for (sev of maintenanceSeverityOptions; track sev.value) {
                  <option [ngValue]="sev.value">{{ sev.label }}</option>
                }
              </select>
            </div>
          </div>
          <div dialogActions class="dialog-actions">
            <button type="button" ar-button variant="ghost" (click)="showInitiateModal.set(false)">
              Cancel
            </button>
            <button
              type="button"
              ar-button
              variant="ai"
              icon="sparkle"
              [disabled]="!initCustomerName.trim() || !initEquipmentModel.trim()"
              (click)="onInitiateSubmit()"
            >
              Start Diagnostic Session
            </button>
          </div>
        </ar-dialog>
      }

      <!-- Modal: Escalate to Field Ticket -->
      @if (showEscalateModal()) {
        <ar-dialog title="Escalate to On-Site Field Visit" (dismiss)="showEscalateModal.set(false)">
          <div class="dialog-form">
            <p class="dialog-alert">
              Remote diagnostics could not resolve this fault. An emergency Field Service Ticket
              will be dispatched with full diagnostic history.
            </p>
            <div class="form-row">
              <label>Escalation Reason *</label>
              <textarea
                [(ngModel)]="escalateReason"
                rows="3"
                class="form-input"
                placeholder="Specify why remote support was exhausted..."
              ></textarea>
            </div>
            <div class="form-row">
              <label>Assigned Field Service Engineer</label>
              <input
                type="text"
                [(ngModel)]="escalateEngineer"
                class="form-input"
                placeholder="e.g. Mahesh Joshi (Senior Drive Specialist)"
              />
            </div>
          </div>
          <div dialogActions class="dialog-actions">
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
              Confirm Escalation
            </button>
          </div>
        </ar-dialog>
      }
    </div>
  `,
  styles: [
    `
      .remote-maint-page {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding: 1.5rem;
        max-width: 1480px;
        margin: 0 auto;
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      /* KPI Grid */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }

      .kpi-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .kpi-label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--color-text-muted, #64748b);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .kpi-value {
        font-size: 1.875rem;
        font-weight: 700;
        line-height: 1.1;
      }

      .channel-split-val {
        font-size: 1.625rem;
      }

      .wa-part {
        color: #059669;
      }

      .ivr-part {
        color: #2563eb;
      }

      .kpi-subtext {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.75rem;
        color: var(--color-text-muted, #64748b);
        margin-top: 0.25rem;
      }

      .pill-badge {
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-weight: 600;
      }

      .pill-badge.positive {
        color: #059669;
        background: #ecfdf5;
      }

      .text-good {
        color: #10b981;
      }
      .text-accent {
        color: #3b82f6;
      }
      .text-warn {
        color: #f59e0b;
      }
      .text-muted {
        color: #94a3b8;
      }
      .font-semibold {
        font-weight: 600;
      }
      .font-mono {
        font-family: monospace;
      }
      .text-right {
        text-align: right;
      }

      /* Tab Bar */
      .tab-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        padding-bottom: 0.25rem;
      }

      .tab-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        border: none;
        background: none;
        color: var(--color-text-muted, #64748b);
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.15s ease-in-out;
      }

      .tab-btn:hover {
        color: var(--color-text-primary, #0f172a);
        background: var(--color-bg-hover, #f8fafc);
      }

      .tab-btn.active {
        color: #2563eb;
        background: #eff6ff;
        font-weight: 600;
      }

      /* Console Layout */
      .console-layout {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .session-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.875rem 1.25rem;
        background: #ffffff;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
      }

      .session-picker {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        font-size: 0.875rem;
      }

      .session-picker select {
        padding: 0.375rem 0.75rem;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        font-weight: 500;
        min-width: 320px;
      }

      .channel-toggle-box {
        display: flex;
        align-items: center;
        gap: 0.625rem;
      }

      .toggle-label {
        font-size: 0.8125rem;
        color: #64748b;
        font-weight: 600;
      }

      .toggle-buttons {
        display: flex;
        background: #f1f5f9;
        border-radius: 6px;
        padding: 2px;
      }

      .ch-btn {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.875rem;
        font-size: 0.8125rem;
        font-weight: 600;
        border: none;
        background: none;
        border-radius: 4px;
        cursor: pointer;
        color: #64748b;
        transition: all 0.15s ease;
      }

      .ch-btn.selected {
        background: #ffffff;
        color: #0f172a;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      /* Diagnostic 3-Column Grid */
      .diagnostic-grid {
        display: grid;
        grid-template-columns: 320px 1fr 340px;
        gap: 1.25rem;
        align-items: start;
      }

      @media (max-width: 1200px) {
        .diagnostic-grid {
          grid-template-columns: 1fr;
        }
      }

      .deck-card,
      .stream-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .deck-header,
      .stream-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 0.75rem;
      }

      .deck-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .equipment-meta {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.8125rem;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .meta-row .lbl {
        color: #64748b;
      }

      .fault-code-pill {
        display: inline-block;
        padding: 0.125rem 0.5rem;
        background: #fef2f2;
        color: #b91c1c;
        font-weight: 700;
        border-radius: 4px;
        font-size: 0.75rem;
      }

      /* Telemetry Sensors */
      .sensor-readings h4,
      .symptom-notes h4,
      .diagnosis-box h4,
      .remediation-box h4,
      .spares-box h4 {
        margin: 0 0 0.5rem;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .sensors-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }

      .sensor-box {
        padding: 0.625rem;
        background: #f8fafc;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        border: 1px solid #edf2f7;
      }

      .sensor-lbl {
        font-size: 0.6875rem;
        color: #64748b;
      }

      .sensor-val {
        font-size: 1.125rem;
        font-weight: 700;
        color: #0f172a;
      }

      .sensor-val.val-hot {
        color: #dc2626;
      }
      .sensor-val.val-warn {
        color: #d97706;
      }

      .sensor-lim {
        font-size: 0.6875rem;
        color: #94a3b8;
      }

      .symptom-notes p,
      .diagnosis-box p {
        margin: 0;
        font-size: 0.8125rem;
        line-height: 1.45;
        color: #334155;
      }

      /* Stream Center Column */
      .stream-card {
        min-height: 540px;
      }

      .channel-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        font-size: 0.9375rem;
      }

      .wa-title {
        color: #059669;
      }
      .ivr-title {
        color: #2563eb;
      }

      .stream-channel-sub {
        font-size: 0.75rem;
        color: #64748b;
      }

      .turns-container {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        max-height: 400px;
        overflow-y: auto;
        padding: 0.5rem;
        background: #f8fafc;
        border-radius: 8px;
      }

      .turn-bubble {
        padding: 0.875rem;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        font-size: 0.8125rem;
        border: 1px solid #e2e8f0;
        background: #ffffff;
      }

      .turn-bubble.user-turn {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }

      .turn-bubble.ivr-bubble {
        background: #f0f9ff;
        border-color: #bae6fd;
      }

      .turn-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.6875rem;
        color: #64748b;
      }

      .turn-sender {
        font-weight: 600;
      }

      .formatted-ai-response {
        margin: 0;
        font-family: inherit;
        white-space: pre-wrap;
        font-size: 0.8125rem;
        line-height: 1.45;
        color: #1e293b;
      }

      .dtmf-chip {
        background: #e0f2fe;
        color: #0369a1;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
      }

      .action-tag {
        font-size: 0.6875rem;
        color: #059669;
        font-weight: 600;
        align-self: flex-end;
      }

      /* Interaction Input Box */
      .interaction-input-box {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: auto;
      }

      .wa-input-row {
        display: flex;
        gap: 0.5rem;
      }

      .wa-input-row input {
        flex: 1;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        font-size: 0.8125rem;
      }

      .quick-chips {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .quick-chip {
        background: #e2e8f0;
        border: none;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.6875rem;
        cursor: pointer;
        color: #334155;
        font-weight: 500;
      }

      .quick-chip:hover {
        background: #cbd5e1;
      }

      .ivr-keypad-panel {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .keypad-title {
        font-size: 0.75rem;
        font-weight: 600;
        color: #475569;
      }

      .keypad-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.5rem;
      }

      .key-btn {
        padding: 0.5rem 0.25rem;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        transition: all 0.1s ease;
      }

      .key-btn:hover {
        background: #eff6ff;
        border-color: #3b82f6;
        color: #1d4ed8;
      }

      .key-esc {
        color: #b91c1c;
      }

      /* Right Deck: AI Plan & Remediation */
      .confidence-badge {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .conf-num {
        font-weight: 700;
        font-size: 1.125rem;
        color: #059669;
        line-height: 1;
      }

      .conf-lbl {
        font-size: 0.625rem;
        color: #64748b;
        text-transform: uppercase;
      }

      .diagnosis-box {
        background: #f8fafc;
        padding: 0.75rem;
        border-radius: 6px;
        border-left: 3px solid #3b82f6;
      }

      .steps-list {
        margin: 0;
        padding-left: 1.25rem;
        font-size: 0.8125rem;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        line-height: 1.4;
        color: #334155;
      }

      .spares-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        font-size: 0.75rem;
      }

      .spares-list li {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.5rem;
        background: #f1f5f9;
        border-radius: 4px;
        font-weight: 500;
        color: #1e293b;
      }

      .resolution-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: auto;
        padding-top: 0.75rem;
        border-top: 1px solid #f1f5f9;
      }

      /* History Table */
      .history-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .history-toolbar {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
      }

      .filter-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
      }

      .filter-group select {
        padding: 0.375rem 0.75rem;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        font-size: 0.875rem;
      }

      .record-counter {
        margin-left: auto;
        font-size: 0.8125rem;
        color: #64748b;
      }

      .table-responsive {
        overflow-x: auto;
      }

      .session-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }

      .session-table th {
        padding: 0.75rem 0.875rem;
        background: #f8fafc;
        border-bottom: 2px solid #e2e8f0;
        color: #475569;
        font-weight: 600;
        text-align: left;
      }

      .session-table td {
        padding: 0.75rem 0.875rem;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }

      /* Dialog styling */
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        padding: 0.5rem 0;
      }

      .dialog-alert {
        padding: 0.75rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #991b1b;
        font-size: 0.8125rem;
        margin: 0;
      }

      .form-row {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .form-row label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #334155;
      }

      .form-input {
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        font-size: 0.875rem;
        width: 100%;
        box-sizing: border-box;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1rem;
        padding-top: 0.875rem;
        border-top: 1px solid #e2e8f0;
      }
    `,
  ],
})
export class ArRemoteMaintenance implements OnInit {
  private service = inject(RemoteMaintenanceService);
  private toasts = inject(ToastService);

  readonly MaintenanceChannel = MaintenanceChannel;
  readonly MaintenanceSessionStatus = MaintenanceSessionStatus;
  readonly DiagnosticTurnType = DiagnosticTurnType;
  readonly equipmentCategoryOptions = equipmentCategoryOptions;
  readonly maintenanceChannelOptions = maintenanceChannelOptions;
  readonly maintenanceSeverityOptions = maintenanceSeverityOptions;

  activeTab = signal<'console' | 'sessions'>('console');
  isLoading = signal(false);

  sessions = signal<RemoteMaintenanceSessionDto[]>(MOCK_SESSIONS);
  currentSession = signal<RemoteMaintenanceSessionDto | null>(MOCK_SESSIONS[0]);
  stats = signal<RemoteMaintenanceStatsDto | null>(MOCK_STATS);

  selectedSessionId = MOCK_SESSIONS[0].id;
  waMessageInput = '';

  // Filters for Tab 2
  filterChannel: MaintenanceChannel | null = null;
  filterStatus: MaintenanceSessionStatus | null = null;
  filteredSessions = signal<RemoteMaintenanceSessionDto[]>(MOCK_SESSIONS);

  // Modals
  showInitiateModal = signal(false);
  showEscalateModal = signal(false);

  // Initiate form
  initCustomerName = '';
  initCustomerPhone = '';
  initEquipmentModel = '';
  initEquipmentSerial = '';
  initCategory = EquipmentCategory.VfdAndDrive;
  initChannel = MaintenanceChannel.WhatsApp;
  initFaultCode = '';
  initSymptoms = '';
  initSeverity = MaintenanceSeverity.Medium;

  // Escalate form
  escalateReason = '';
  escalateEngineer = 'Mahesh Joshi (Senior Drive Specialist)';

  parsedRemediationSteps = computed(() => {
    const raw = this.currentSession()?.remediationStepsJson;
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [raw];
    }
  });

  parsedSpareParts = computed(() => {
    const raw = this.currentSession()?.recommendedSparePartsJson;
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [raw];
    }
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    if (environment.useMockData) {
      this.sessions.set(MOCK_SESSIONS);
      this.currentSession.set(MOCK_SESSIONS[0]);
      this.selectedSessionId = MOCK_SESSIONS[0].id;
      this.stats.set(MOCK_STATS);
      this.applyFilters();
      return;
    }

    this.isLoading.set(true);
    this.service.getList({ maxResultCount: 50 }).subscribe({
      next: (res) => {
        if (res.items && res.items.length > 0) {
          this.sessions.set(res.items);
          this.currentSession.set(res.items[0]);
          this.selectedSessionId = res.items[0].id;
          this.applyFilters();
        } else {
          this.sessions.set(MOCK_SESSIONS);
          this.currentSession.set(MOCK_SESSIONS[0]);
          this.selectedSessionId = MOCK_SESSIONS[0].id;
          this.applyFilters();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.sessions.set(MOCK_SESSIONS);
        this.currentSession.set(MOCK_SESSIONS[0]);
        this.selectedSessionId = MOCK_SESSIONS[0].id;
        this.applyFilters();
        this.isLoading.set(false);
      },
    });

    this.service.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set(MOCK_STATS),
    });
  }

  onSessionSelected(): void {
    const found = this.sessions().find((s) => s.id === this.selectedSessionId);
    if (found) {
      this.currentSession.set(found);
    }
  }

  viewInConsole(session: RemoteMaintenanceSessionDto): void {
    this.currentSession.set(session);
    this.selectedSessionId = session.id;
    this.activeTab.set('console');
  }

  switchChannel(newChannel: MaintenanceChannel): void {
    const cur = this.currentSession();
    if (!cur || !cur.id) return;
    const sessionId = cur.id;

    if (environment.useMockData) {
      const updated: RemoteMaintenanceSessionDto = {
        ...cur,
        preferredChannel: newChannel,
      };
      this.currentSession.set(updated);
      this.sessions.update((list) => list.map((s) => (s.id === sessionId ? updated : s)));
      this.toasts.info(
        `Support channel switched to ${newChannel === MaintenanceChannel.WhatsApp ? 'WhatsApp' : 'IVR Phone'}.`,
      );
      return;
    }

    this.service.switchChannel({ sessionId, newChannel }).subscribe({
      next: (res) => {
        this.currentSession.set(res);
        this.toasts.info('Channel switched.');
      },
      error: (err) => this.toasts.error(err?.message ?? 'Failed to switch channel.'),
    });
  }

  sendWhatsAppTurn(): void {
    const text = this.waMessageInput.trim();
    if (!text) return;

    const cur = this.currentSession();
    if (!cur || !cur.id) return;
    const sessionId = cur.id;

    if (environment.useMockData) {
      const turnNum = cur.diagnosticTurns.length + 1;
      let reply = `Received: "${text}". Sensor telemetry is within expected range. Next step: please verify 24V supply on terminal block X12.`;
      let resolved = cur.resolvedRemotely;
      let status = cur.status;

      if (text.toLowerCase().includes('fixed') || text.toLowerCase().includes('running')) {
        reply =
          'Great news! Extruder running at normal current. Fault cleared and machine operational. Session resolved remotely! 🚀';
        resolved = true;
        status = MaintenanceSessionStatus.ResolvedRemotely;
      }

      const newTurn: MaintenanceDiagnosticTurnDto = {
        id: 't-' + Date.now(),
        sessionId: sessionId,
        turnNumber: turnNum,
        turnType: DiagnosticTurnType.UserPrompt,
        channel: MaintenanceChannel.WhatsApp,
        inputOrPrompt: text,
        aiResponseOrGuidance: reply,
        actionTaken: resolved ? 'CustomerConfirmedResolution' : 'StepFollowup',
        createdAtUtc: new Date().toISOString(),
      };

      const updated: RemoteMaintenanceSessionDto = {
        ...cur,
        resolvedRemotely: resolved,
        status: status,
        diagnosticTurns: [...cur.diagnosticTurns, newTurn],
      };

      this.currentSession.set(updated);
      this.sessions.update((list) => list.map((s) => (s.id === sessionId ? updated : s)));
      this.waMessageInput = '';
      this.toasts.success('WhatsApp reply transmitted.');
      return;
    }

    this.service
      .sendChannelTurn({
        sessionId: sessionId,
        turnType: DiagnosticTurnType.UserPrompt,
        channel: MaintenanceChannel.WhatsApp,
        inputOrPrompt: text,
      })
      .subscribe({
        next: (res) => {
          this.currentSession.set(res);
          this.waMessageInput = '';
          this.toasts.success('WhatsApp reply processed.');
        },
        error: (err) => this.toasts.error(err?.message ?? 'Failed to send WhatsApp turn.'),
      });
  }

  sendIvrDigit(digit: string): void {
    const cur = this.currentSession();
    if (!cur || !cur.id) return;
    const sessionId = cur.id;

    if (environment.useMockData) {
      const turnNum = cur.diagnosticTurns.length + 1;
      let spoken = `IVR Spoken: Key '${digit}' processed.`;
      let status = cur.status;

      if (digit === '1')
        spoken =
          'IVR Spoken: Step 1 active. Ensure motor power is isolated. Check resistance across U-V-W phases. Press 9 when complete, or 0 for an engineer.';
      if (digit === '2')
        spoken =
          'IVR Spoken: Step 2 active. To reset parameter fault, hold Stop/Reset button for 3 seconds until fault LED clears. Press 9 if successful, or 0 to escalate.';
      if (digit === '9') {
        spoken =
          'IVR Spoken: Excellent! Verification acknowledged. Session logged as resolved. Have a productive shift!';
        status = MaintenanceSessionStatus.ResolvedRemotely;
      }
      if (digit === '0')
        spoken =
          'IVR Spoken: Connecting you now to our on-call senior industrial automation field engineer. Please hold...';

      const newTurn: MaintenanceDiagnosticTurnDto = {
        id: 't-' + Date.now(),
        sessionId: sessionId,
        turnNumber: turnNum,
        turnType: DiagnosticTurnType.IvrMenuChoice,
        channel: MaintenanceChannel.IvrPhone,
        inputOrPrompt: digit,
        aiResponseOrGuidance: spoken,
        actionTaken: 'IVR_Key_' + digit,
        createdAtUtc: new Date().toISOString(),
      };

      const updated: RemoteMaintenanceSessionDto = {
        ...cur,
        status: status,
        diagnosticTurns: [...cur.diagnosticTurns, newTurn],
      };

      this.currentSession.set(updated);
      this.sessions.update((list) => list.map((s) => (s.id === sessionId ? updated : s)));
      this.toasts.info(`IVR DTMF digit [${digit}] simulated.`);
      return;
    }

    this.service
      .sendChannelTurn({
        sessionId: sessionId,
        turnType: DiagnosticTurnType.IvrMenuChoice,
        channel: MaintenanceChannel.IvrPhone,
        inputOrPrompt: digit,
      })
      .subscribe({
        next: (res) => {
          this.currentSession.set(res);
          this.toasts.info(`IVR digit [${digit}] processed.`);
        },
        error: (err) => this.toasts.error(err?.message ?? 'Failed to process IVR digit.'),
      });
  }

  quickReply(text: string): void {
    this.waMessageInput = text;
    this.sendWhatsAppTurn();
  }

  markResolvedRemotely(): void {
    const cur = this.currentSession();
    if (!cur || !cur.id) return;
    const sessionId = cur.id;

    if (environment.useMockData) {
      const updated: RemoteMaintenanceSessionDto = {
        ...cur,
        status: MaintenanceSessionStatus.ResolvedRemotely,
        resolvedRemotely: true,
        resolutionNotes: 'Operator verified equipment operating normally after remote remediation.',
      };
      this.currentSession.set(updated);
      this.sessions.update((list) => list.map((s) => (s.id === sessionId ? updated : s)));
      this.toasts.success('Session resolved remotely without field dispatch! 🎉');
      return;
    }

    this.service
      .resolveRemotely({
        sessionId: sessionId,
        resolutionNotes: 'Operator verified equipment operating normally after remote remediation.',
      })
      .subscribe({
        next: (res) => {
          this.currentSession.set(res);
          this.toasts.success('Session resolved remotely.');
        },
        error: (err) => this.toasts.error(err?.message ?? 'Failed to resolve session.'),
      });
  }

  openEscalateModal(): void {
    this.escalateReason = `Hardware fault persists on ${this.currentSession()?.equipmentModel}. Requires physical component replacement and on-site testing.`;
    this.showEscalateModal.set(true);
  }

  confirmEscalateToField(): void {
    const cur = this.currentSession();
    if (!cur || !cur.id) return;
    const sessionId = cur.id;

    if (environment.useMockData) {
      const updated: RemoteMaintenanceSessionDto = {
        ...cur,
        status: MaintenanceSessionStatus.EscalatedToFieldTicket,
        fieldVisitRequired: true,
        resolutionNotes: `Escalated to field service ticket: ${this.escalateReason}`,
      };
      this.currentSession.set(updated);
      this.sessions.update((list) => list.map((s) => (s.id === sessionId ? updated : s)));
      this.showEscalateModal.set(false);
      this.toasts.info('Escalated to Field Service Ticket! Engineer notified.');
      return;
    }

    this.service
      .escalateToFieldTicket({
        sessionId: sessionId,
        reason: this.escalateReason,
        assignedFieldEngineer: this.escalateEngineer,
      })
      .subscribe({
        next: (res) => {
          this.currentSession.set(res);
          this.showEscalateModal.set(false);
          this.toasts.info('Escalated to Field Service Ticket.');
        },
        error: (err) => this.toasts.error(err?.message ?? 'Failed to escalate session.'),
      });
  }

  onInitiateSubmit(): void {
    if (!this.initCustomerName.trim() || !this.initEquipmentModel.trim()) return;

    const input: InitiateRemoteMaintenanceInput = {
      customerId: 'c-' + Date.now(),
      customerName: this.initCustomerName,
      customerContactPhone: this.initCustomerPhone || '+91 98000 00000',
      equipmentCategory: this.initCategory,
      equipmentModel: this.initEquipmentModel,
      equipmentSerialNumber:
        this.initEquipmentSerial || 'SN-AUTO-' + Date.now().toString().slice(-4),
      preferredChannel: this.initChannel,
      faultCode: this.initFaultCode || undefined,
      reportedSymptoms: this.initSymptoms || 'Equipment stopped during operation.',
      severity: this.initSeverity,
    };

    if (environment.useMockData) {
      const newSession: RemoteMaintenanceSessionDto = {
        id: 's-' + Date.now(),
        sessionCode: 'RMS-2026-' + (this.sessions().length + 1).toString().padStart(4, '0'),
        customerId: input.customerId,
        customerName: input.customerName,
        customerContactPhone: input.customerContactPhone,
        equipmentCategory: input.equipmentCategory,
        equipmentModel: input.equipmentModel,
        equipmentSerialNumber: input.equipmentSerialNumber,
        preferredChannel: input.preferredChannel,
        status: MaintenanceSessionStatus.RemediationProvided,
        severity: input.severity,
        faultCode: input.faultCode,
        reportedSymptoms: input.reportedSymptoms,
        rootCauseDiagnosis: `Fault telemetry matched against ${input.equipmentModel} technical guide. Primary cause: parameter deviation or thermal threshold trip.`,
        confidencePercent: 91.5,
        remediationStepsJson: JSON.stringify([
          'Inspect incoming voltage balance across phases.',
          'Verify control wiring on terminal blocks.',
          'Check parameter settings on control panel.',
        ]),
        recommendedSparePartsJson: JSON.stringify([
          'Standard OEM Service Pack for ' + input.equipmentModel,
        ]),
        estimatedDowntimeMinutes: 30,
        resolvedRemotely: false,
        fieldVisitRequired: false,
        diagnosticTurns: [
          {
            id: 't-' + Date.now(),
            sessionId: 's-' + Date.now(),
            turnNumber: 1,
            turnType: DiagnosticTurnType.UserPrompt,
            channel: input.preferredChannel,
            inputOrPrompt: input.reportedSymptoms,
            aiResponseOrGuidance:
              input.preferredChannel === MaintenanceChannel.WhatsApp
                ? `🤖 AutoReach AI Support initialized for ${input.equipmentModel}. Root cause identified with 91.5% confidence. Please review the checklist steps.`
                : `IVR Spoken: Welcome to MNI 24/7 Diagnostics for ${input.equipmentModel}. Press 1 for checklist steps, 0 for engineer.`,
            actionTaken: 'SessionInitiated',
            createdAtUtc: new Date().toISOString(),
          },
        ],
        creationTime: new Date().toISOString(),
      };

      this.sessions.update((list) => [newSession, ...list]);
      this.currentSession.set(newSession);
      this.selectedSessionId = newSession.id;
      this.showInitiateModal.set(false);
      this.applyFilters();
      this.toasts.success(
        `Remote diagnostic session ${newSession.sessionCode} initiated via ${input.preferredChannel === MaintenanceChannel.WhatsApp ? 'WhatsApp' : 'IVR'}!`,
      );
      return;
    }

    this.service.initiateSession(input).subscribe({
      next: (created) => {
        this.sessions.update((list) => [created, ...list]);
        this.currentSession.set(created);
        this.selectedSessionId = created.id;
        this.showInitiateModal.set(false);
        this.applyFilters();
        this.toasts.success(`Session ${created.sessionCode} started.`);
      },
      error: (err) => this.toasts.error(err?.message ?? 'Failed to initiate session.'),
    });
  }

  applyFilters(): void {
    let list = [...this.sessions()];

    if (this.filterChannel !== null) {
      list = list.filter((s) => s.preferredChannel === this.filterChannel);
    }

    if (this.filterStatus !== null) {
      list = list.filter((s) => s.status === this.filterStatus);
    }

    this.filteredSessions.set(list);
  }

  getTelemetry(): {
    temp_c: number;
    bus_voltage: number;
    motor_current?: number;
    fan_rpm?: number;
  } {
    const raw = this.currentSession()?.telemetrySnapshotJson;
    if (!raw) return { temp_c: 65, bus_voltage: 560, motor_current: 14.2 };
    try {
      return JSON.parse(raw);
    } catch {
      return { temp_c: 65, bus_voltage: 560, motor_current: 14.2 };
    }
  }

  formatRupeesCompact(val: number): string {
    return inrCompact(val);
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  getStatusTone(status: MaintenanceSessionStatus): ChipTone {
    return STATUS_TONES[status] ?? 'neutral';
  }

  getStatusLabel(status: MaintenanceSessionStatus): string {
    return STATUS_LABELS[status] ?? 'Initiated';
  }

  getSeverityTone(severity: MaintenanceSeverity): ChipTone {
    return SEVERITY_TONES[severity] ?? 'neutral';
  }

  getSeverityLabel(severity: MaintenanceSeverity): string {
    return SEVERITY_LABELS[severity] ?? 'Medium';
  }
}
