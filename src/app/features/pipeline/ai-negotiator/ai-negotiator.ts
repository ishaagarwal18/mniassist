import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { inr } from '../../../core/util/format';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  CustomerPersona,
  NegotiationAction,
  NegotiationSessionStatus,
  NegotiationStrategy,
  negotiationStrategyOptions,
  OfferSender,
  NegotiationPolicyDto,
  NegotiationSessionDto,
  NegotiationAgentService,
  CreateUpdateNegotiationPolicyDto,
  NegotiationOfferDto,
  SimulateNegotiationResultDto,
} from '../../../proxy/pipeline';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

const STATUS_TONES: Record<NegotiationSessionStatus, ChipTone> = {
  [NegotiationSessionStatus.Negotiating]: 'amber',
  [NegotiationSessionStatus.Agreed]: 'good',
  [NegotiationSessionStatus.EscalatedToHuman]: 'bad',
  [NegotiationSessionStatus.WalkedAway]: 'neutral',
  [NegotiationSessionStatus.Expired]: 'warn',
};

const STATUS_LABELS: Record<NegotiationSessionStatus, string> = {
  [NegotiationSessionStatus.Negotiating]: 'Negotiating',
  [NegotiationSessionStatus.Agreed]: 'Agreed & Won',
  [NegotiationSessionStatus.EscalatedToHuman]: 'Escalated to Human',
  [NegotiationSessionStatus.WalkedAway]: 'Walked Away',
  [NegotiationSessionStatus.Expired]: 'Expired',
};

const ACTION_LABELS: Record<NegotiationAction, string> = {
  [NegotiationAction.InitialQuote]: 'Initial Quote Sent',
  [NegotiationAction.CounterOffer]: 'Counter-Offer Made',
  [NegotiationAction.AcceptOffer]: 'Offer Accepted',
  [NegotiationAction.RejectAndWalkAway]: 'Rejected / Walked Away',
  [NegotiationAction.EscalateToHuman]: 'Escalated to Sales Manager',
};

const MOCK_POLICY: NegotiationPolicyDto = {
  id: 'pol-1',
  name: 'Standard Industrial Guardrail',
  isActive: true,
  targetMarginPercent: 25.0,
  floorMarginPercent: 15.0,
  maxDiscountPercent: 10.0,
  maxRounds: 4,
  strategy: NegotiationStrategy.ConcessionCurve,
  concessionStepPercent: 2.5,
  allowPaymentTermTradeoffs: true,
  allowVolumeCommitmentTradeoffs: true,
  minVolumeIncreasePercent: 20.0,
  autoApprovalLimitInPaise: 500_000_00,
  autoApprovalLimitInRupees: 500_000,
  systemPromptGuidance:
    'You are an authorized industrial engineering sales agent. Be polite, firm on floor margins, emphasize genuine OEM warranty, on-site testing, and prompt dispatch. Trade discounts for 100% advance or volume.',
};

const MOCK_SESSIONS: NegotiationSessionDto[] = [
  {
    id: 'ses-1',
    sessionCode: 'NEG-2026-0041',
    quotationId: 'q-101',
    quotationReference: 'QT-2026-0812',
    contactId: 'c-1',
    contactName: 'Rajesh Sharma (Apex Steel)',
    contactPhone: '+91 98201 11223',
    enquiryId: 'enq-1',
    policyId: 'pol-1',
    status: NegotiationSessionStatus.Agreed,
    originalAmountInPaise: 480_000_00,
    originalAmountInRupees: 480_000,
    originalMarginPercent: 28.0,
    estimatedCostInPaise: 345_600_00,
    estimatedCostInRupees: 345_600,
    currentAmountInPaise: 451_200_00,
    currentAmountInRupees: 451_200,
    currentMarginPercent: 23.4,
    currentDiscountPercent: 6.0,
    roundCount: 2,
    paymentTerms: '100% Advance',
    volumeUnits: 1,
    summaryNotes:
      'Agreement reached at ₹4,51,200 (6.0% discount, 23.4% margin). Terms: 100% Advance.',
    completedAtUtc: new Date(Date.now() - 2 * 3600_000).toISOString(),
    offers: [
      {
        id: 'off-1',
        sessionId: 'ses-1',
        roundNumber: 1,
        sender: OfferSender.Customer,
        offeredAmountInPaise: 422_400_00,
        offeredAmountInRupees: 422_400,
        discountPercent: 12.0,
        marginPercent: 18.2,
        proposedPaymentTerms: 'Net 30',
        messageContent:
          'We have budget constraint of ₹4.2 Lakhs. Can you do 12% discount so we can close today?',
        actionTaken: NegotiationAction.CounterOffer,
        createdAtUtc: new Date(Date.now() - 3 * 3600_000).toISOString(),
      },
      {
        id: 'off-2',
        sessionId: 'ses-1',
        roundNumber: 2,
        sender: OfferSender.AiAgent,
        offeredAmountInPaise: 451_200_00,
        offeredAmountInRupees: 451_200,
        discountPercent: 6.0,
        marginPercent: 23.4,
        proposedPaymentTerms: '100% Advance',
        messageContent:
          'Thank you Mr. Sharma. To support your timeline while maintaining full Siemens 1-year warranty and on-site testing, we can offer a special rate of ₹4,51,200 (6% discount) if payment terms are 100% Advance before dispatch. Can we issue the revised proforma?',
        aiReasoning:
          'Customer requested 12% discount exceeding 10% max limit. Applied PaymentTermTradeoff: granted 6% discount in exchange for 100% advance payment. Margin remains strong at 23.4% (> 15% floor).',
        actionTaken: NegotiationAction.AcceptOffer,
        createdAtUtc: new Date(Date.now() - 2 * 3600_000).toISOString(),
      },
    ],
  },
  {
    id: 'ses-2',
    sessionCode: 'NEG-2026-0042',
    quotationId: 'q-102',
    quotationReference: 'QT-2026-0819',
    contactId: 'c-2',
    contactName: 'Vikram Mehta (Kalyani Forge)',
    contactPhone: '+91 98402 33445',
    enquiryId: 'enq-2',
    policyId: 'pol-1',
    status: NegotiationSessionStatus.Negotiating,
    originalAmountInPaise: 620_000_00,
    originalAmountInRupees: 620_000,
    originalMarginPercent: 26.5,
    estimatedCostInPaise: 455_700_00,
    estimatedCostInRupees: 455_700,
    currentAmountInPaise: 589_000_00,
    currentAmountInRupees: 589_000,
    currentMarginPercent: 22.6,
    currentDiscountPercent: 5.0,
    roundCount: 1,
    paymentTerms: '50% Adv / 50% Dispatch',
    volumeUnits: 1,
    summaryNotes: 'Round 1 counter-offer sent. Waiting for customer response.',
    offers: [
      {
        id: 'off-3',
        sessionId: 'ses-2',
        roundNumber: 1,
        sender: OfferSender.Customer,
        offeredAmountInPaise: 527_000_00,
        offeredAmountInRupees: 527_000,
        discountPercent: 15.0,
        marginPercent: 13.5,
        messageContent:
          'Competitor is offering same Schneider Altivar 630 drive at ₹5.25 Lakh. Match this price.',
        actionTaken: NegotiationAction.CounterOffer,
        createdAtUtc: new Date(Date.now() - 1 * 3600_000).toISOString(),
      },
      {
        id: 'off-4',
        sessionId: 'ses-2',
        roundNumber: 2,
        sender: OfferSender.AiAgent,
        offeredAmountInPaise: 589_000_00,
        offeredAmountInRupees: 589_000,
        discountPercent: 5.0,
        marginPercent: 22.6,
        proposedPaymentTerms: '50% Adv / 50% Dispatch',
        messageContent:
          'Dear Vikram ji, our quotation includes genuine Schneider Electric certified drive with pre-configured PID logic, IP54 enclosure, and immediate dispatch from our Pune warehouse. While ₹5.25L is below our factory landed cost, we can extend a 5% project concession at ₹5,89,000.',
        aiReasoning:
          'Customer demanded ₹5.27L (15% discount), which would breach floor margin (13.5% vs 15.0% floor). Enforced floor protection guardrail; countered with 5% concession preserving 22.6% margin.',
        actionTaken: NegotiationAction.CounterOffer,
        createdAtUtc: new Date(Date.now() - 30 * 60_000).toISOString(),
      },
    ],
  },
  {
    id: 'ses-3',
    sessionCode: 'NEG-2026-0043',
    quotationId: 'q-103',
    quotationReference: 'QT-2026-0824',
    contactId: 'c-3',
    contactName: 'Amitabh Sen (Bhilai Heavy Fab)',
    contactPhone: '+91 97110 55667',
    enquiryId: 'enq-3',
    policyId: 'pol-1',
    status: NegotiationSessionStatus.EscalatedToHuman,
    originalAmountInPaise: 1250_000_00,
    originalAmountInRupees: 1250_000,
    originalMarginPercent: 25.0,
    estimatedCostInPaise: 937_500_00,
    estimatedCostInRupees: 937_500,
    currentAmountInPaise: 1125_000_00,
    currentAmountInRupees: 1125_000,
    currentMarginPercent: 16.7,
    currentDiscountPercent: 10.0,
    roundCount: 3,
    paymentTerms: 'Net 45',
    volumeUnits: 2,
    summaryNotes:
      'Escalated to Sales Director: Deal value ₹11.25L exceeds auto-approval threshold of ₹5L.',
    escalationReason:
      'High-value deal (₹11.25L) with 10% discount demand on 2 units requires executive authorization.',
    offers: [
      {
        id: 'off-5',
        sessionId: 'ses-3',
        roundNumber: 1,
        sender: OfferSender.Customer,
        offeredAmountInPaise: 1125_000_00,
        offeredAmountInRupees: 1125_000,
        discountPercent: 10.0,
        marginPercent: 16.7,
        proposedPaymentTerms: 'Net 45',
        proposedQuantity: 2,
        messageContent:
          'We are ordering 2 automated welding positioners. Need 10% discount and 45 days credit.',
        actionTaken: NegotiationAction.CounterOffer,
        createdAtUtc: new Date(Date.now() - 4 * 3600_000).toISOString(),
      },
      {
        id: 'off-6',
        sessionId: 'ses-3',
        roundNumber: 2,
        sender: OfferSender.AiAgent,
        offeredAmountInPaise: 1125_000_00,
        offeredAmountInRupees: 1125_000,
        discountPercent: 10.0,
        marginPercent: 16.7,
        messageContent:
          'Thank you Mr. Sen. Your proposal for 2 units at ₹11,25,000 has been reviewed favorably. Because the transaction value exceeds standard automated thresholds, our Senior Director of Sales has taken this up for expedited final approval.',
        aiReasoning:
          'Proposed discount is 10% and margin is 16.7% (> 15% floor). However, deal value (₹11,25,000) exceeds AutoApprovalLimit (₹5,00,000) and payment terms requested are Net 45. Escalating to human manager for sign-off.',
        actionTaken: NegotiationAction.EscalateToHuman,
        createdAtUtc: new Date(Date.now() - 3 * 3600_000).toISOString(),
      },
    ],
  },
  {
    id: 'ses-4',
    sessionCode: 'NEG-2026-0044',
    quotationId: 'q-104',
    quotationReference: 'QT-2026-0830',
    contactId: 'c-4',
    contactName: 'Pradeep Joshi (Gujarat Extrusions)',
    contactPhone: '+91 99099 88776',
    enquiryId: 'enq-4',
    policyId: 'pol-1',
    status: NegotiationSessionStatus.WalkedAway,
    originalAmountInPaise: 350_000_00,
    originalAmountInRupees: 350_000,
    originalMarginPercent: 24.0,
    estimatedCostInPaise: 266_000_00,
    estimatedCostInRupees: 266_000,
    currentAmountInPaise: 315_000_00,
    currentAmountInRupees: 315_000,
    currentMarginPercent: 15.5,
    currentDiscountPercent: 10.0,
    roundCount: 4,
    paymentTerms: 'Net 30',
    volumeUnits: 1,
    summaryNotes: 'AI walked away: Customer insisted on 25% discount which breaches floor margin.',
    completedAtUtc: new Date(Date.now() - 12 * 3600_000).toISOString(),
    offers: [
      {
        id: 'off-7',
        sessionId: 'ses-4',
        roundNumber: 1,
        sender: OfferSender.Customer,
        offeredAmountInPaise: 262_500_00,
        offeredAmountInRupees: 262_500,
        discountPercent: 25.0,
        marginPercent: -1.3,
        messageContent: 'Give 25% flat discount or we cannot buy.',
        actionTaken: NegotiationAction.CounterOffer,
        createdAtUtc: new Date(Date.now() - 14 * 3600_000).toISOString(),
      },
      {
        id: 'off-8',
        sessionId: 'ses-4',
        roundNumber: 2,
        sender: OfferSender.AiAgent,
        offeredAmountInPaise: 315_000_00,
        offeredAmountInRupees: 315_000,
        discountPercent: 10.0,
        marginPercent: 15.5,
        messageContent:
          'Thank you Mr. Joshi. We have thoroughly assessed direct OEM pricing. ₹2,62,500 falls below our manufacturing cost basis. Our best and final commercial offer is ₹3,15,000 with complete manufacturer test certificate.',
        aiReasoning:
          'Customer 25% demand creates negative margin (-1.3%). Final BAFO issued at floor margin (15.5%).',
        actionTaken: NegotiationAction.RejectAndWalkAway,
        createdAtUtc: new Date(Date.now() - 12 * 3600_000).toISOString(),
      },
    ],
  },
];

@Component({
  selector: 'ar-ai-negotiator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Autonomous AI Negotiator"
      subtitle="Autonomous algorithmic quoting, margin guardrails, and customer WhatsApp counter-offer engine"
    >
      <div actions class="header-actions">
        <button
          ar-button
          [variant]="activeTab() === 'sessions' ? 'primary' : 'ghost'"
          (click)="activeTab.set('sessions')"
        >
          Live Sessions ({{ sessions().length }})
        </button>
        <button
          ar-button
          [variant]="activeTab() === 'guardrails' ? 'primary' : 'ghost'"
          (click)="activeTab.set('guardrails')"
        >
          Policy Guardrails
        </button>
        <button
          ar-button
          [variant]="activeTab() === 'simulator' ? 'primary' : 'ghost'"
          (click)="activeTab.set('simulator')"
        >
          AI Simulator
        </button>
        <button ar-button variant="ghost" (click)="loadData()">Refresh</button>
      </div>
    </ar-topbar>

    <div class="negotiator-container">
      <!-- KPI Metric Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Active Negotiations</div>
          <div class="kpi-value tabular-nums">{{ activeSessionsCount() }}</div>
          <div class="kpi-sub">{{ totalSessionsCount() }} total sessions registered</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Win / Agreed Rate</div>
          <div class="kpi-value text-good tabular-nums">{{ winRatePercent() }}%</div>
          <div class="kpi-sub">{{ agreedSessionsCount() }} deals closed autonomously</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Avg Margin Preserved</div>
          <div class="kpi-value text-primary tabular-nums">{{ avgMarginPreserved() }}%</div>
          <div class="kpi-sub">Floor limit: {{ policy().floorMarginPercent }}%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Escalated to Human</div>
          <div class="kpi-value text-amber tabular-nums">{{ escalatedSessionsCount() }}</div>
          <div class="kpi-sub">Requires sales manager sign-off</div>
        </div>
      </div>

      <!-- TAB 1: LIVE SESSIONS COCKPIT -->
      @if (activeTab() === 'sessions') {
        <div class="cockpit-split">
          <!-- Left: Sessions List -->
          <div class="sessions-sidebar">
            <div class="sidebar-search">
              <input
                type="text"
                class="form-control"
                placeholder="Search quote ref, customer, phone..."
                [ngModel]="searchFilter()"
                (ngModelChange)="searchFilter.set($event)"
              />
            </div>

            <div class="filter-chips">
              <button
                class="filter-chip"
                [class.active]="selectedStatusFilter() === null"
                (click)="selectedStatusFilter.set(null)"
              >
                All ({{ sessions().length }})
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedStatusFilter() === NegotiationSessionStatus.Negotiating"
                (click)="selectedStatusFilter.set(NegotiationSessionStatus.Negotiating)"
              >
                Negotiating
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedStatusFilter() === NegotiationSessionStatus.Agreed"
                (click)="selectedStatusFilter.set(NegotiationSessionStatus.Agreed)"
              >
                Agreed
              </button>
              <button
                class="filter-chip"
                [class.active]="
                  selectedStatusFilter() === NegotiationSessionStatus.EscalatedToHuman
                "
                (click)="selectedStatusFilter.set(NegotiationSessionStatus.EscalatedToHuman)"
              >
                Escalated
              </button>
            </div>

            <div class="session-list">
              @for (ses of filteredSessions(); track ses.id) {
                <div
                  class="session-item"
                  [class.selected]="selectedSession()?.id === ses.id"
                  (click)="selectSession(ses)"
                >
                  <div class="item-head">
                    <span class="session-code tabular-nums">{{ ses.sessionCode }}</span>
                    <ar-chip [tone]="statusTone(ses.status)">
                      {{ statusLabel(ses.status) }}
                    </ar-chip>
                  </div>
                  <div class="item-customer">{{ ses.contactName }}</div>
                  <div class="item-quote">Quote: {{ ses.quotationReference }}</div>
                  <div class="item-metrics">
                    <span class="metric-val tabular-nums">{{ formatInr(ses.currentAmountInPaise) }}</span>
                    <span class="metric-margin tabular-nums"
                      >Margin: {{ ses.currentMarginPercent | number: '1.1-1' }}%</span
                    >
                    <span class="metric-discount tabular-nums"
                      >{{ ses.currentDiscountPercent | number: '1.1-1' }}% disc</span
                    >
                  </div>
                </div>
              } @empty {
                <div class="empty-state">No negotiation sessions match the filter.</div>
              }
            </div>
          </div>

          <!-- Right: Selected Session Cockpit & Transcript -->
          @if (selectedSession(); as ses) {
            <div class="session-detail-panel">
              <!-- Session Header Banner -->
              <div class="detail-header">
                <div class="header-main">
                  <h2>{{ ses.sessionCode }} · {{ ses.quotationReference }}</h2>
                  <div class="customer-info">
                    <span class="customer-name font-semibold">{{ ses.contactName }}</span>
                    <span class="phone-chip font-mono">{{ ses.contactPhone }}</span>
                    @if (ses.contactId) {
                      <a
                        ar-button
                        variant="ghost"
                        [routerLink]="['/contacts', ses.contactId, '360']"
                        class="c360-btn"
                      >
                        Customer 360 &rarr;
                      </a>
                    }
                  </div>
                </div>
                <div class="header-status">
                  <ar-chip [tone]="statusTone(ses.status)">
                    {{ statusLabel(ses.status) }}
                  </ar-chip>
                  <span class="rounds-badge"
                    >Round {{ ses.roundCount }} of {{ policy().maxRounds }}</span
                  >
                </div>
              </div>

              <!-- Live Financial Safety Strip -->
              <div class="financial-meter-strip">
                <div class="meter-stat">
                  <div class="meter-stat-label">Original Quote</div>
                  <div class="meter-stat-value tabular-nums">{{ formatInr(ses.originalAmountInPaise) }}</div>
                  <div class="meter-stat-sub">Target Margin: {{ ses.originalMarginPercent }}%</div>
                </div>
                <div class="meter-stat">
                  <div class="meter-stat-label">Estimated Cost Basis</div>
                  <div class="meter-stat-value tabular-nums">{{ formatInr(ses.estimatedCostInPaise) }}</div>
                  <div class="meter-stat-sub">Direct factory BOM</div>
                </div>
                <div class="meter-stat">
                  <div class="meter-stat-label">Current Offer</div>
                  <div class="meter-stat-value text-primary tabular-nums">
                    {{ formatInr(ses.currentAmountInPaise) }}
                  </div>
                  <div class="meter-stat-sub">
                    {{ ses.currentDiscountPercent | number: '1.1-1' }}% Concession
                  </div>
                </div>
                <div class="meter-stat">
                  <div class="meter-stat-label">Effective Margin</div>
                  <div
                    class="meter-stat-value tabular-nums"
                    [class.text-good]="ses.currentMarginPercent >= policy().targetMarginPercent"
                    [class.text-amber]="
                      ses.currentMarginPercent < policy().targetMarginPercent &&
                      ses.currentMarginPercent >= policy().floorMarginPercent
                    "
                    [class.text-bad]="ses.currentMarginPercent < policy().floorMarginPercent"
                  >
                    {{ ses.currentMarginPercent | number: '1.1-1' }}%
                  </div>
                  <div class="meter-stat-sub">Floor: {{ policy().floorMarginPercent }}%</div>
                </div>
                <div class="meter-stat">
                  <div class="meter-stat-label">Payment Terms Lever</div>
                  <div class="meter-stat-value text-accent">{{ ses.paymentTerms }}</div>
                  <div class="meter-stat-sub">Qty: {{ ses.volumeUnits }} units</div>
                </div>
              </div>

              <!-- Margin Drift Progress Bar -->
              <div class="margin-drift-box">
                <div class="margin-drift-header">
                  <span>Margin Drift Guardrail:</span>
                  <span>
                    Floor ({{ policy().floorMarginPercent }}%) &rarr; Current ({{
                      ses.currentMarginPercent | number: '1.1-1'
                    }}%) &rarr; Target ({{ policy().targetMarginPercent }}%)
                  </span>
                </div>
                <div class="drift-bar-container">
                  <div
                    class="drift-bar-fill"
                    [style.width.%]="calcMarginWidth(ses.currentMarginPercent)"
                    [class.bar-good]="ses.currentMarginPercent >= policy().targetMarginPercent"
                    [class.bar-amber]="
                      ses.currentMarginPercent < policy().targetMarginPercent &&
                      ses.currentMarginPercent >= policy().floorMarginPercent
                    "
                    [class.bar-bad]="ses.currentMarginPercent < policy().floorMarginPercent"
                  ></div>
                  <div
                    class="floor-line"
                    [style.left.%]="calcMarginWidth(policy().floorMarginPercent)"
                    title="Floor Margin"
                  ></div>
                </div>
              </div>

              @if (ses.escalationReason) {
                <div class="alert-box alert-bad">
                  <strong>⚠️ Escalated for Human Sign-off:</strong> {{ ses.escalationReason }}
                </div>
              }

              <!-- Transcript Timeline -->
              <div class="transcript-section">
                <h3>Negotiation Dialogue & AI Reasoning</h3>
                <div class="chat-thread">
                  @for (turn of ses.offers; track turn.id) {
                    <div
                      class="chat-bubble-wrap"
                      [class.turn-customer]="turn.sender === OfferSender.Customer"
                      [class.turn-ai]="turn.sender === OfferSender.AiAgent"
                      [class.turn-human]="turn.sender === OfferSender.HumanSalesManager"
                    >
                      <div class="bubble-header">
                        <span class="sender-tag">
                          @if (turn.sender === OfferSender.Customer) {
                            👤 Customer Demand (Round {{ turn.roundNumber }})
                          } @else if (turn.sender === OfferSender.AiAgent) {
                            🤖 AutoReach AI Agent (Round {{ turn.roundNumber }})
                          } @else {
                            👔 Sales Manager Intervention
                          }
                        </span>
                        <span class="turn-meta tabular-nums">
                          Offered: {{ formatInr(turn.offeredAmountInPaise) }} (Margin:
                          {{ turn.marginPercent | number: '1.1-1' }}%)
                        </span>
                      </div>

                      <div class="bubble-body">
                        {{ turn.messageContent }}
                      </div>

                      @if (turn.aiReasoning) {
                        <div class="ai-rationale-box">
                          <div class="rationale-head">
                            🧠 Internal AI Strategy & Margin Evaluation:
                          </div>
                          <div class="rationale-text">{{ turn.aiReasoning }}</div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Quick Next Round Simulator / Test Input -->
              <div class="quick-turn-box">
                <h4>Simulate Next WhatsApp Turn:</h4>
                <div class="turn-input-row">
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Enter customer WhatsApp message (e.g. 'Can you do ₹4,40,000 with 100% advance?')"
                    [(ngModel)]="nextTurnMessage"
                  />
                  <button ar-button variant="primary" (click)="sendCustomerTurn(ses)">
                    Send Customer Turn
                  </button>
                </div>
              </div>

              <!-- Session Action Footer -->
              <div class="detail-actions">
                <button ar-button variant="ghost" (click)="openInterventionDialog(ses)">
                  Intervene as Sales Manager
                </button>
                <button ar-button variant="primary" (click)="applyToQuotation(ses)">
                  Apply to Quotation & Issue Revision
                </button>
              </div>
            </div>
          } @else {
            <div class="select-prompt">
              Select a negotiation session from the list to view its details.
            </div>
          }
        </div>
      }

      <!-- TAB 2: POLICY GUARDRAILS -->
      @if (activeTab() === 'guardrails') {
        <div class="policy-container">
          <div class="panel-card">
            <h2>Negotiation Guardrails & Algorithm Settings</h2>
            <p class="panel-subtitle">
              Configure the commercial boundaries and algorithmic levers within which the AI agent
              operates.
            </p>

            <div class="form-grid">
              <div class="form-group">
                <label for="polName">Policy Name</label>
                <input id="polName" type="text" class="form-control" [(ngModel)]="policyForm.name" />
              </div>

              <div class="form-group">
                <label for="polStrat">Negotiation Strategy Algorithm</label>
                <select id="polStrat" class="form-control" [(ngModel)]="policyForm.strategy">
                  @for (opt of strategyOptions; track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label for="polTarget">Target Margin (%)</label>
                <input
                  id="polTarget"
                  type="number"
                  step="0.5"
                  class="form-control"
                  [(ngModel)]="policyForm.targetMarginPercent"
                />
                <span class="field-hint">Desired baseline margin before negotiation</span>
              </div>

              <div class="form-group">
                <label for="polFloor">Floor Margin (%) [Walk-Away Limit]</label>
                <input
                  id="polFloor"
                  type="number"
                  step="0.5"
                  class="form-control"
                  [(ngModel)]="policyForm.floorMarginPercent"
                />
                <span class="field-hint">Strict minimum. AI will NEVER auto-accept below this</span>
              </div>

              <div class="form-group">
                <label for="polMaxDisc">Max Concession Discount (%)</label>
                <input
                  id="polMaxDisc"
                  type="number"
                  step="0.5"
                  class="form-control"
                  [(ngModel)]="policyForm.maxDiscountPercent"
                />
                <span class="field-hint">Max discount percentage allowed without escalation</span>
              </div>

              <div class="form-group">
                <label for="polRounds">Max Back-and-Forth Rounds</label>
                <input id="polRounds" type="number" class="form-control" [(ngModel)]="policyForm.maxRounds" />
                <span class="field-hint">Number of counter-offers before Best & Final Offer</span>
              </div>

              <div class="form-group">
                <label for="polStep">Concession Step Size (%)</label>
                <input
                  id="polStep"
                  type="number"
                  step="0.5"
                  class="form-control"
                  [(ngModel)]="policyForm.concessionStepPercent"
                />
                <span class="field-hint">Discount offered per round on concession curve</span>
              </div>

              <div class="form-group">
                <label for="polLimit">Auto-Approval Threshold (₹)</label>
                <input
                  id="polLimit"
                  type="number"
                  class="form-control"
                  [ngModel]="policyForm.autoApprovalLimitInPaise / 100"
                  (ngModelChange)="policyForm.autoApprovalLimitInPaise = $event * 100"
                />
                <span class="field-hint">Deals above this value trigger manager sign-off</span>
              </div>
            </div>

            <div class="toggles-grid">
              <label class="toggle-label">
                <input type="checkbox" [(ngModel)]="policyForm.allowPaymentTermTradeoffs" />
                <span
                  ><strong>Payment Term Levers:</strong> Allow trading discounts for 100% advance or
                  Net 7 payment terms</span
                >
              </label>

              <label class="toggle-label">
                <input type="checkbox" [(ngModel)]="policyForm.allowVolumeCommitmentTradeoffs" />
                <span
                  ><strong>Volume Tier Levers:</strong> Require +20% quantity commitment in exchange
                  for lower unit price</span
                >
              </label>
            </div>

            <div class="form-group full-width">
              <label for="polPrompt">System Prompt & Tone Guidance</label>
              <textarea
                id="polPrompt"
                class="form-control"
                rows="4"
                [(ngModel)]="policyForm.systemPromptGuidance"
                placeholder="Instructions given to the AI for conversational WhatsApp tone, OEM warranty emphasis, etc."
              ></textarea>
            </div>

            <div class="panel-footer">
              <button ar-button variant="primary" (click)="savePolicy()">Save Guardrails</button>
            </div>
          </div>
        </div>
      }

      <!-- TAB 3: AI SIMULATOR -->
      @if (activeTab() === 'simulator') {
        <div class="simulator-container">
          <div class="panel-card">
            <h2>Interactive AI Negotiation Sandbox</h2>
            <p class="panel-subtitle">
              Test how the autonomous agent handles counter-offers across different buyer personas
              and margin constraints without touching customer conversations.
            </p>

            <div class="sim-config-grid">
              <div class="form-group">
                <label for="simPersona">Buyer Persona</label>
                <select id="simPersona" class="form-control" [(ngModel)]="simPersona">
                  <option [value]="CustomerPersona.AggressiveProcurement">
                    Aggressive Procurement Officer (Claims competitor is 15% cheaper)
                  </option>
                  <option [value]="CustomerPersona.BudgetConstrained">
                    Budget-Constrained SME (Limited quarterly funds)
                  </option>
                  <option [value]="CustomerPersona.VolumeBuyer">
                    Volume Buyer (Wants tier-1 rate on pilot unit)
                  </option>
                  <option [value]="CustomerPersona.SpeedFocused">
                    Speed-Focused Buyer (Ready to pay 100% advance today)
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="simQuote">Initial Quotation Amount (₹)</label>
                <input id="simQuote" type="number" class="form-control" [(ngModel)]="simQuoteRupees" />
              </div>

              <div class="form-group">
                <label for="simCost">Estimated Factory Cost Basis (₹)</label>
                <input id="simCost" type="number" class="form-control" [(ngModel)]="simCostRupees" />
              </div>

              <div class="form-group">
                <label for="simDemand">Buyer Demand Discount (%)</label>
                <input
                  id="simDemand"
                  type="number"
                  step="1"
                  class="form-control"
                  [(ngModel)]="simDemandDiscount"
                />
              </div>
            </div>

            <div class="sim-actions">
              <button ar-button variant="primary" (click)="runSimulation()">
                Run AI Simulation
              </button>
            </div>

            @if (simResult(); as res) {
              <div class="sim-results">
                <div class="alert-box alert-info">
                  <strong>{{ res.simulationSummary }}</strong>
                </div>

                <div class="sim-metrics-strip">
                  <div class="meter-stat">
                    <div class="meter-stat-label">Final Agreed Price</div>
                    <div class="meter-stat-value text-primary tabular-nums">
                      {{ formatInr(res.finalAmountInPaise) }}
                    </div>
                  </div>
                  <div class="meter-stat">
                    <div class="meter-stat-label">Final Margin</div>
                    <div class="meter-stat-value text-good tabular-nums">
                      {{ res.finalMarginPercent | number: '1.1-1' }}%
                    </div>
                  </div>
                  <div class="meter-stat">
                    <div class="meter-stat-label">Total Discount Conceded</div>
                    <div class="meter-stat-value text-amber tabular-nums">
                      {{ res.finalDiscountPercent | number: '1.1-1' }}%
                    </div>
                  </div>
                  <div class="meter-stat">
                    <div class="meter-stat-label">Status</div>
                    <div class="meter-stat-value">
                      <ar-chip [tone]="statusTone(res.finalStatus)">{{
                        statusLabel(res.finalStatus)
                      }}</ar-chip>
                    </div>
                  </div>
                </div>

                <div class="chat-thread">
                  @for (turn of res.rounds; track turn.roundNumber) {
                    <div
                      class="chat-bubble-wrap"
                      [class.turn-customer]="turn.sender === OfferSender.Customer"
                      [class.turn-ai]="turn.sender === OfferSender.AiAgent"
                    >
                      <div class="bubble-header">
                        <span class="sender-tag">
                          {{ turn.sender === OfferSender.Customer ? '👤 Buyer' : '🤖 AI Agent' }}
                          (Round {{ turn.roundNumber }})
                        </span>
                        <span class="turn-meta tabular-nums">
                          Amount: {{ formatInr(turn.offeredAmountInPaise) }} · Margin:
                          {{ turn.marginPercent | number: '1.1-1' }}%
                        </span>
                      </div>
                      <div class="bubble-body">{{ turn.messageContent }}</div>
                      @if (turn.aiReasoning) {
                        <div class="ai-rationale-box">
                          <div class="rationale-head">Strategy Rationale:</div>
                          <div class="rationale-text">{{ turn.aiReasoning }}</div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Manager Intervention Dialog -->
    @if (interventionDialogVisible()) {
      <ar-dialog title="Manager Commercial Intervention" (dismiss)="closeInterventionDialog()">
        <div class="intervention-dialog-body">
          <p>
            You are overriding or concluding autonomous negotiation for
            <strong>{{ selectedSession()?.sessionCode }}</strong> (Quote:
            {{ selectedSession()?.quotationReference }}).
          </p>

          <div class="form-group">
            <label for="intAction">Intervention Action</label>
            <select id="intAction" class="form-control" [(ngModel)]="interventionForm.action">
              <option [value]="NegotiationAction.CounterOffer">
                Counter-Offer with Special Approved Rate
              </option>
              <option [value]="NegotiationAction.AcceptOffer">
                Approve &amp; Close Deal at Current Customer Offer
              </option>
              <option [value]="NegotiationAction.RejectAndWalkAway">
                Reject &amp; Walk Away (Cease Negotiation)
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="intAmt">Approved Amount (₹)</label>
            <input id="intAmt" type="number" class="form-control" [(ngModel)]="interventionFormRupees" />
          </div>

          <div class="form-group">
            <label for="intTerms">Approved Payment Terms</label>
            <input
              id="intTerms"
              type="text"
              class="form-control"
              [(ngModel)]="interventionForm.overridePaymentTerms"
            />
          </div>

          <div class="form-group">
            <label for="intNotes">Executive Notes / Rationale</label>
            <textarea
              id="intNotes"
              class="form-control"
              rows="3"
              [(ngModel)]="interventionForm.managerNotes"
              placeholder="e.g. Approved special 8% discount due to long-term relationship and 100% advance terms."
            ></textarea>
          </div>
        </div>

        <div actions class="dialog-actions">
          <button ar-button variant="ghost" (click)="closeInterventionDialog()">Cancel</button>
          <button ar-button variant="primary" (click)="submitIntervention()">
            Confirm &amp; Apply
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: [
    `
      .negotiator-container {
        padding: 1.5rem;
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .header-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }
      .kpi-card {
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        box-shadow: var(--ar-shadow-card);
        padding: 1.125rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        position: relative;
        overflow: hidden;
        transition: transform var(--ar-ease), box-shadow var(--ar-ease);
      }
      .kpi-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 24, 40, 0.08);
      }
      .kpi-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--ar-blue-500);
      }
      .kpi-label {
        font-size: 0.75rem;
        color: var(--ar-ink-400);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .kpi-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--ar-ink-900);
        line-height: 1.15;
      }
      .kpi-sub {
        font-size: 0.75rem;
        color: var(--ar-ink-500);
        margin-top: 0.25rem;
      }
      .tabular-nums {
        font-variant-numeric: tabular-nums;
      }
      .text-good {
        color: var(--ar-green-600);
      }
      .text-bad {
        color: var(--ar-red-600);
      }
      .text-amber {
        color: var(--ar-amber-600);
      }
      .text-primary {
        color: var(--ar-blue-600);
      }
      .text-accent {
        color: var(--ar-ai-700);
      }

      /* Cockpit Split */
      .cockpit-split {
        display: grid;
        grid-template-columns: 360px 1fr;
        gap: 1.25rem;
        align-items: start;
        min-height: 680px;
      }
      @media (max-width: 960px) {
        .cockpit-split {
          grid-template-columns: 1fr;
        }
      }
      .sessions-sidebar {
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        box-shadow: var(--ar-shadow-card);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        max-height: calc(100vh - 230px);
      }
      .sidebar-search {
        padding: 0.875rem;
        border-bottom: 1px solid var(--ar-line-200);
        background: var(--ar-bg-50);
      }
      .filter-chips {
        display: flex;
        gap: 0.375rem;
        padding: 0.625rem 0.875rem;
        border-bottom: 1px solid var(--ar-line-200);
        background: var(--ar-bg-50);
        overflow-x: auto;
      }
      .filter-chip {
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.25rem 0.625rem;
        border-radius: var(--ar-radius-chip);
        border: 1px solid var(--ar-line-300);
        background: var(--ar-white);
        color: var(--ar-ink-700);
        cursor: pointer;
        transition: all var(--ar-ease);
        white-space: nowrap;
      }
      .filter-chip:hover {
        background: var(--ar-bg-100);
      }
      .filter-chip.active {
        background: var(--ar-blue-100);
        color: var(--ar-blue-700);
        border-color: var(--ar-blue-200);
        font-weight: 600;
      }
      .session-list {
        flex: 1;
        overflow-y: auto;
      }
      .session-item {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--ar-line-200);
        cursor: pointer;
        transition: background var(--ar-ease), border-color var(--ar-ease);
      }
      .session-item:hover {
        background: var(--ar-bg-50);
      }
      .session-item.selected {
        background: var(--ar-blue-100);
        border-left: 3px solid var(--ar-blue-500);
      }
      .item-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
      }
      .session-code {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--ar-ink-900);
      }
      .item-customer {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--ar-ink-700);
      }
      .item-quote {
        font-size: 0.75rem;
        color: var(--ar-ink-400);
      }
      .item-metrics {
        display: flex;
        gap: 0.625rem;
        font-size: 0.8rem;
        margin-top: 0.375rem;
        align-items: center;
      }
      .metric-val {
        font-weight: 700;
        color: var(--ar-blue-600);
      }
      .metric-margin {
        color: var(--ar-green-600);
        font-weight: 500;
      }
      .metric-discount {
        color: var(--ar-amber-600);
        font-weight: 500;
      }

      /* Session Detail */
      .session-detail-panel {
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        box-shadow: var(--ar-shadow-card);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--ar-line-200);
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .header-main h2 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--ar-ink-900);
      }
      .customer-info {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        font-size: 0.85rem;
        color: var(--ar-ink-500);
        margin-top: 0.375rem;
        flex-wrap: wrap;
      }
      .customer-name {
        color: var(--ar-ink-900);
      }
      .phone-chip {
        font-size: 0.75rem;
        background: var(--ar-bg-100);
        color: var(--ar-ink-500);
        padding: 0.125rem 0.375rem;
        border-radius: var(--ar-radius-chip);
        border: 1px solid var(--ar-line-200);
      }
      .c360-btn {
        margin-left: 0.25rem;
        font-size: 0.8rem;
        text-decoration: none;
      }
      .header-status {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .rounds-badge {
        font-size: 0.75rem;
        font-weight: 600;
        background: var(--ar-bg-100);
        border: 1px solid var(--ar-line-200);
        padding: 0.25rem 0.5rem;
        border-radius: var(--ar-radius-chip);
        color: var(--ar-ink-700);
      }

      /* Financial Strip */
      .financial-meter-strip {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-inset);
        padding: 0.875rem 1rem;
        gap: 0.75rem;
      }
      .meter-stat-label {
        font-size: 0.72rem;
        color: var(--ar-ink-400);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .meter-stat-value {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--ar-ink-900);
        margin-top: 0.2rem;
      }
      .meter-stat-sub {
        font-size: 0.75rem;
        color: var(--ar-ink-500);
      }

      /* Margin Drift */
      .margin-drift-box {
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-inset);
        padding: 0.875rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .margin-drift-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--ar-ink-700);
      }
      .drift-bar-container {
        height: 10px;
        background: var(--ar-line-200);
        border-radius: 9999px;
        position: relative;
        overflow: hidden;
      }
      .drift-bar-fill {
        height: 100%;
        border-radius: 9999px;
        transition: width 0.3s ease;
      }
      .bar-good {
        background: var(--ar-green-500);
      }
      .bar-amber {
        background: var(--ar-amber-500);
      }
      .bar-bad {
        background: var(--ar-red-500);
      }
      .floor-line {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--ar-red-600);
        z-index: 2;
      }

      /* Chat Thread */
      .transcript-section h3 {
        font-size: 0.95rem;
        font-weight: 600;
        margin: 0 0 0.75rem 0;
        color: var(--ar-ink-900);
      }
      .chat-thread {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-height: 400px;
        overflow-y: auto;
        padding: 0.5rem 0.25rem;
      }
      .chat-bubble-wrap {
        border-radius: var(--ar-radius-card);
        padding: 0.875rem 1.125rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        max-width: 85%;
        border: 1px solid var(--ar-line-200);
        box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
      }
      .turn-customer {
        background: var(--ar-bg-100);
        border-left: 4px solid var(--ar-ink-400);
        align-self: flex-start;
      }
      .turn-ai {
        background: var(--ar-ai-100);
        border-left: 4px solid var(--ar-ai-500);
        align-self: flex-end;
      }
      .turn-human {
        background: var(--ar-blue-100);
        border-left: 4px solid var(--ar-blue-500);
        align-self: flex-end;
      }
      .bubble-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--ar-ink-500);
      }
      .bubble-body {
        font-size: 0.875rem;
        color: var(--ar-ink-900);
        line-height: 1.45;
      }
      .ai-rationale-box {
        margin-top: 0.4rem;
        background: rgba(255, 255, 255, 0.9);
        border: 1px dashed var(--ar-ai-500);
        border-radius: var(--ar-radius-chip);
        padding: 0.625rem 0.75rem;
      }
      .rationale-head {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--ar-ai-700);
        margin-bottom: 0.2rem;
      }
      .rationale-text {
        font-size: 0.8rem;
        color: var(--ar-ink-700);
        line-height: 1.4;
      }

      /* Quick Turn Box */
      .quick-turn-box {
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-inset);
        padding: 0.875rem 1rem;
      }
      .quick-turn-box h4 {
        margin: 0 0 0.5rem 0;
        font-size: 0.85rem;
        color: var(--ar-ink-700);
        font-weight: 600;
      }
      .turn-input-row {
        display: flex;
        gap: 0.5rem;
      }

      /* Action Footers */
      .detail-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        border-top: 1px solid var(--ar-line-200);
        padding-top: 1rem;
      }

      /* Policy & Panels */
      .panel-card {
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        box-shadow: var(--ar-shadow-card);
        padding: 1.75rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .panel-card h2 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--ar-ink-900);
      }
      .panel-subtitle {
        margin: -0.5rem 0 0 0;
        font-size: 0.85rem;
        color: var(--ar-ink-500);
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .form-group.full-width {
        grid-column: 1 / -1;
      }
      .form-group label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--ar-ink-700);
      }
      .field-hint {
        font-size: 0.75rem;
        color: var(--ar-ink-400);
      }
      .form-control {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--ar-line-300);
        border-radius: var(--ar-radius-control);
        font-size: 0.85rem;
        background: var(--ar-white);
        color: var(--ar-ink-900);
        font-family: inherit;
        box-sizing: border-box;
      }
      .form-control:focus {
        outline: none;
        border-color: var(--ar-blue-500);
        box-shadow: var(--ar-focus-ring);
      }
      .toggles-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .toggle-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: var(--ar-ink-700);
        cursor: pointer;
      }
      .panel-footer {
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid var(--ar-line-200);
        padding-top: 1rem;
      }

      /* Simulator */
      .sim-config-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }
      .sim-actions {
        display: flex;
        justify-content: flex-start;
      }
      .sim-results {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        border-top: 1px solid var(--ar-line-200);
        padding-top: 1.25rem;
      }
      .sim-metrics-strip {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-inset);
        padding: 0.875rem 1rem;
        gap: 0.75rem;
      }

      /* Alerts */
      .alert-box {
        padding: 0.75rem 1rem;
        border-radius: var(--ar-radius-inset);
        font-size: 0.85rem;
      }
      .alert-bad {
        background: var(--ar-red-100);
        color: var(--ar-red-600);
        border: 1px solid var(--ar-red-200);
      }
      .alert-info {
        background: var(--ar-green-100);
        color: var(--ar-green-600);
        border: 1px solid var(--ar-green-200);
      }

      /* Dialog */
      .intervention-dialog-body {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0.5rem 0;
      }
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
        border-top: 1px solid var(--ar-line-200);
        padding-top: 1rem;
      }
      .empty-state,
      .select-prompt {
        padding: 2.5rem;
        text-align: center;
        color: var(--ar-ink-400);
        font-size: 0.875rem;
        font-style: italic;
      }
    `,
  ],
})
export class ArAiNegotiator {
  private readonly agentService = inject(NegotiationAgentService);
  private readonly toasts = inject(ToastService);

  // Active Tab
  readonly activeTab = signal<'sessions' | 'guardrails' | 'simulator'>('sessions');

  // State Signals
  readonly sessions = signal<NegotiationSessionDto[]>(MOCK_SESSIONS);
  readonly selectedSession = signal<NegotiationSessionDto | null>(MOCK_SESSIONS[0] ?? null);
  readonly policy = signal<NegotiationPolicyDto>(MOCK_POLICY);
  readonly searchFilter = signal<string>('');
  readonly selectedStatusFilter = signal<NegotiationSessionStatus | null>(null);

  // Form Models
  policyForm: CreateUpdateNegotiationPolicyDto = {
    name: MOCK_POLICY.name,
    isActive: MOCK_POLICY.isActive,
    targetMarginPercent: MOCK_POLICY.targetMarginPercent,
    floorMarginPercent: MOCK_POLICY.floorMarginPercent,
    maxDiscountPercent: MOCK_POLICY.maxDiscountPercent,
    maxRounds: MOCK_POLICY.maxRounds,
    strategy: MOCK_POLICY.strategy,
    concessionStepPercent: MOCK_POLICY.concessionStepPercent,
    allowPaymentTermTradeoffs: MOCK_POLICY.allowPaymentTermTradeoffs,
    allowVolumeCommitmentTradeoffs: MOCK_POLICY.allowVolumeCommitmentTradeoffs,
    minVolumeIncreasePercent: MOCK_POLICY.minVolumeIncreasePercent,
    autoApprovalLimitInPaise: MOCK_POLICY.autoApprovalLimitInPaise,
    systemPromptGuidance: MOCK_POLICY.systemPromptGuidance,
  };

  // Next Turn Simulator
  nextTurnMessage = '';

  // Simulator Tab Models
  simPersona = CustomerPersona.AggressiveProcurement;
  simQuoteRupees = 500000;
  simCostRupees = 375000;
  simDemandDiscount = 14;
  readonly simResult = signal<SimulateNegotiationResultDto | null>(null);

  // Intervention Dialog
  readonly interventionDialogVisible = signal<boolean>(false);
  interventionFormRupees = 450000;
  interventionForm = {
    action: NegotiationAction.CounterOffer,
    overridePaymentTerms: '100% Advance',
    managerNotes: '',
  };

  // Enums for Template
  readonly NegotiationSessionStatus = NegotiationSessionStatus;
  readonly OfferSender = OfferSender;
  readonly NegotiationAction = NegotiationAction;
  readonly CustomerPersona = CustomerPersona;
  readonly strategyOptions = negotiationStrategyOptions;

  // Computed KPIs
  readonly totalSessionsCount = computed(() => this.sessions().length);
  readonly activeSessionsCount = computed(
    () => this.sessions().filter((s) => s.status === NegotiationSessionStatus.Negotiating).length,
  );
  readonly agreedSessionsCount = computed(
    () => this.sessions().filter((s) => s.status === NegotiationSessionStatus.Agreed).length,
  );
  readonly escalatedSessionsCount = computed(
    () =>
      this.sessions().filter((s) => s.status === NegotiationSessionStatus.EscalatedToHuman).length,
  );
  readonly winRatePercent = computed(() => {
    const total = this.sessions().length;
    if (total === 0) return 0;
    return Math.round((this.agreedSessionsCount() / total) * 100);
  });
  readonly avgMarginPreserved = computed(() => {
    const list = this.sessions();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, s) => acc + s.currentMarginPercent, 0);
    return (sum / list.length).toFixed(1);
  });

  // Filtered Sessions List
  readonly filteredSessions = computed(() => {
    let list = this.sessions();
    const status = this.selectedStatusFilter();
    if (status !== null) {
      list = list.filter((s) => s.status === status);
    }
    const q = this.searchFilter().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.sessionCode.toLowerCase().includes(q) ||
          s.quotationReference.toLowerCase().includes(q) ||
          s.contactName.toLowerCase().includes(q) ||
          s.contactPhone.includes(q),
      );
    }
    return list;
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    if (environment.useMockData) {
      return;
    }

    this.agentService.getActivePolicy().subscribe({
      next: (res) => {
        if (res) {
          this.policy.set(res);
          this.policyForm = {
            name: res.name,
            isActive: res.isActive,
            targetMarginPercent: res.targetMarginPercent,
            floorMarginPercent: res.floorMarginPercent,
            maxDiscountPercent: res.maxDiscountPercent,
            maxRounds: res.maxRounds,
            strategy: res.strategy,
            concessionStepPercent: res.concessionStepPercent,
            allowPaymentTermTradeoffs: res.allowPaymentTermTradeoffs,
            allowVolumeCommitmentTradeoffs: res.allowVolumeCommitmentTradeoffs,
            minVolumeIncreasePercent: res.minVolumeIncreasePercent,
            autoApprovalLimitInPaise: res.autoApprovalLimitInPaise,
            systemPromptGuidance: res.systemPromptGuidance,
          };
        }
      },
      error: () => {},
    });

    this.agentService.getSessions({ maxResultCount: 50, skipCount: 0 }).subscribe({
      next: (res) => {
        if (res && res.items && res.items.length > 0) {
          this.sessions.set(res.items);
          this.selectedSession.set(res.items[0] ?? null);
        }
      },
      error: () => {},
    });
  }

  selectSession(ses: NegotiationSessionDto): void {
    this.selectedSession.set(ses);
  }

  savePolicy(): void {
    if (environment.useMockData) {
      this.policy.set({
        ...this.policy(),
        ...this.policyForm,
      });
      this.toasts.success('Negotiation guardrails saved successfully.');
      return;
    }

    this.agentService.createOrUpdatePolicy(this.policyForm).subscribe({
      next: (saved) => {
        this.policy.set(saved);
        this.toasts.success('Negotiation guardrails saved successfully.');
      },
      error: (err) => {
        this.toasts.error(err.message || 'Error saving guardrails.');
      },
    });
  }

  sendCustomerTurn(session: NegotiationSessionDto): void {
    if (!this.nextTurnMessage.trim() || !session?.id) {
      return;
    }

    const msg = this.nextTurnMessage.trim();
    this.nextTurnMessage = '';

    if (environment.useMockData) {
      // Simulate turn locally
      const round = session.roundCount + 1;
      const proposedPaise = (session.originalAmountInPaise * 0.9) | 0;
      const custOffer: NegotiationOfferDto = {
        id: `mock-off-${Date.now()}`,
        sessionId: session.id ?? 'ses-sim',
        roundNumber: round,
        sender: OfferSender.Customer,
        offeredAmountInPaise: proposedPaise,
        offeredAmountInRupees: proposedPaise / 100,
        discountPercent: 10.0,
        marginPercent: 18.0,
        messageContent: msg,
        actionTaken: NegotiationAction.CounterOffer,
        createdAtUtc: new Date().toISOString(),
      };

      const aiOffer: NegotiationOfferDto = {
        id: `mock-off-${Date.now() + 1}`,
        sessionId: session.id ?? 'ses-sim',
        roundNumber: round + 1,
        sender: OfferSender.AiAgent,
        offeredAmountInPaise: (session.originalAmountInPaise * 0.94) | 0,
        offeredAmountInRupees: (session.originalAmountInPaise * 0.94) / 100,
        discountPercent: 6.0,
        marginPercent: 22.4,
        messageContent:
          'Thank you. We have recalculated factory dispatch costs. We can offer ₹' +
          ((session.originalAmountInPaise * 0.94) / 100).toLocaleString('en-IN') +
          ' provided dispatch is booked within 48 hours with 100% advance.',
        aiReasoning:
          'Applied ConcessionCurve: conceded 6% against 10% requested. Floor margin maintained at 22.4%.',
        actionTaken: NegotiationAction.CounterOffer,
        createdAtUtc: new Date().toISOString(),
      };

      const updated = {
        ...session,
        roundCount: round + 1,
        currentAmountInPaise: aiOffer.offeredAmountInPaise,
        currentAmountInRupees: aiOffer.offeredAmountInRupees,
        currentDiscountPercent: aiOffer.discountPercent,
        currentMarginPercent: aiOffer.marginPercent,
        offers: [...session.offers, custOffer, aiOffer],
      };

      this.updateSessionInList(updated);
      this.toasts.success('Simulated WhatsApp customer turn and AI counter-offer recorded.');
      return;
    }

    this.agentService
      .processChatNegotiation({
        sessionId: session.id,
        quotationId: session.quotationId,
        contactId: session.contactId,
        customerMessage: msg,
      })
      .subscribe({
        next: () => {
          this.loadData();
          this.toasts.success('Customer turn processed and AI reply generated.');
        },
        error: (err) => {
          this.toasts.error(err.message || 'Error processing turn.');
        },
      });
  }

  runSimulation(): void {
    const input = {
      quotationAmountInPaise: this.simQuoteRupees * 100,
      estimatedCostInPaise: this.simCostRupees * 100,
      persona: this.simPersona,
      initialCustomerDiscountDemandPercent: this.simDemandDiscount,
    };

    if (environment.useMockData) {
      const base = input.quotationAmountInPaise;
      const cost = input.estimatedCostInPaise;
      const concededPct = Math.min(this.simDemandDiscount * 0.55, this.policy().maxDiscountPercent);
      const agreedPaise = Math.round(base * (1 - concededPct / 100));
      const marginPct = Math.round(((agreedPaise - cost) / agreedPaise) * 1000) / 10;

      const rounds: NegotiationOfferDto[] = [
        {
          id: 'sim-1',
          sessionId: 'sim',
          roundNumber: 1,
          sender: OfferSender.Customer,
          offeredAmountInPaise: Math.round(base * (1 - this.simDemandDiscount / 100)),
          offeredAmountInRupees: Math.round((base * (1 - this.simDemandDiscount / 100)) / 100),
          discountPercent: this.simDemandDiscount,
          marginPercent:
            Math.round(
              ((Math.round(base * (1 - this.simDemandDiscount / 100)) - cost) /
                Math.round(base * (1 - this.simDemandDiscount / 100))) *
                1000,
            ) / 10,
          messageContent: `We have competing offers at ${this.simDemandDiscount}% lower. Can you match ₹${Math.round((base * (1 - this.simDemandDiscount / 100)) / 100).toLocaleString('en-IN')}?`,
          actionTaken: NegotiationAction.CounterOffer,
          createdAtUtc: new Date().toISOString(),
        },
        {
          id: 'sim-2',
          sessionId: 'sim',
          roundNumber: 2,
          sender: OfferSender.AiAgent,
          offeredAmountInPaise: agreedPaise,
          offeredAmountInRupees: agreedPaise / 100,
          discountPercent: concededPct,
          marginPercent: marginPct,
          messageContent: `Thank you for sharing your project budget. To maintain complete OEM manufacturer warranty and testing certificates, we can extend a special project rate of ₹${(agreedPaise / 100).toLocaleString('en-IN')} (${concededPct.toFixed(1)}% discount) with 100% Advance payment terms.`,
          aiReasoning: `Strategy ConcessionCurve applied. Evaluated margin ${marginPct}% against floor limit ${this.policy().floorMarginPercent}%. Countered with safe concession.`,
          actionTaken: NegotiationAction.CounterOffer,
          createdAtUtc: new Date().toISOString(),
        },
      ];

      this.simResult.set({
        rounds,
        finalStatus: NegotiationSessionStatus.Negotiating,
        finalAmountInPaise: agreedPaise,
        finalAmountInRupees: agreedPaise / 100,
        finalMarginPercent: marginPct,
        finalDiscountPercent: concededPct,
        simulationSummary: `AI successfully countered at ₹${(agreedPaise / 100).toLocaleString('en-IN')}, preserving ${marginPct}% margin above the ${this.policy().floorMarginPercent}% floor limit.`,
      });
      return;
    }

    this.agentService.simulateNegotiation(input).subscribe({
      next: (res) => {
        this.simResult.set(res);
      },
      error: (err) => {
        this.toasts.error(err.message || 'Error running simulation.');
      },
    });
  }

  applyToQuotation(session: NegotiationSessionDto): void {
    if (!session?.id) return;
    const sessionId = session.id;

    if (environment.useMockData) {
      this.toasts.success(
        `Quotation ${session.quotationReference} updated to Rev 2 with ${session.currentDiscountPercent}% discount applied!`,
      );
      return;
    }

    this.agentService.applyToQuotation(sessionId).subscribe({
      next: (quote) => {
        this.toasts.success(
          `Quotation ${quote.reference} updated to Revision ${quote.revisionNumber} successfully!`,
        );
      },
      error: (err) => {
        this.toasts.error(err.message || 'Error applying to quotation.');
      },
    });
  }

  openInterventionDialog(session: NegotiationSessionDto): void {
    this.interventionFormRupees = session.currentAmountInRupees;
    this.interventionForm.overridePaymentTerms = session.paymentTerms;
    this.interventionForm.managerNotes = '';
    this.interventionDialogVisible.set(true);
  }

  closeInterventionDialog(): void {
    this.interventionDialogVisible.set(false);
  }

  submitIntervention(): void {
    const session = this.selectedSession();
    if (!session?.id) return;
    const sessionId = session.id;

    const input = {
      sessionId,
      action: this.interventionForm.action,
      overrideAmountInPaise: this.interventionFormRupees * 100,
      overridePaymentTerms: this.interventionForm.overridePaymentTerms,
      managerNotes: this.interventionForm.managerNotes || 'Manager manual approval.',
    };

    if (environment.useMockData) {
      const updated: NegotiationSessionDto = {
        ...session,
        status:
          this.interventionForm.action === NegotiationAction.AcceptOffer
            ? NegotiationSessionStatus.Agreed
            : this.interventionForm.action === NegotiationAction.RejectAndWalkAway
              ? NegotiationSessionStatus.WalkedAway
              : NegotiationSessionStatus.Negotiating,
        currentAmountInPaise: input.overrideAmountInPaise,
        currentAmountInRupees: this.interventionFormRupees,
        paymentTerms: input.overridePaymentTerms,
        summaryNotes: `Manager Intervention: ${input.managerNotes}`,
      };
      this.updateSessionInList(updated);
      this.closeInterventionDialog();
      this.toasts.success('Manager intervention saved successfully.');
      return;
    }

    this.agentService.intervene(input).subscribe({
      next: (res) => {
        this.updateSessionInList(res);
        this.closeInterventionDialog();
        this.toasts.success('Manager intervention applied.');
      },
      error: (err) => {
        this.toasts.error(err.message || 'Error applying intervention.');
      },
    });
  }

  private updateSessionInList(updated: NegotiationSessionDto): void {
    const list = this.sessions().map((s) => (s.id === updated.id ? updated : s));
    this.sessions.set(list);
    if (this.selectedSession()?.id === updated.id) {
      this.selectedSession.set(updated);
    }
  }

  statusTone(status: NegotiationSessionStatus): ChipTone {
    return STATUS_TONES[status] ?? 'neutral';
  }

  statusLabel(status: NegotiationSessionStatus): string {
    return STATUS_LABELS[status] ?? 'Unknown';
  }

  actionLabel(action: NegotiationAction): string {
    return ACTION_LABELS[action] ?? 'Action';
  }

  calcMarginWidth(margin: number): number {
    return Math.max(5, Math.min(100, (margin / 40) * 100));
  }

  formatInr(paise: number): string {
    return inr(paise);
  }
}
