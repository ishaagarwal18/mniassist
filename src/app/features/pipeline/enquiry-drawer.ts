import { ArEnquiryMovePipeline } from './enquiry-move-pipeline';
import {
  CompetitorBrandDto,
  CompetitorBrandService,
} from '../../proxy/projects/competitor-brand.service';
import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { grantedPolicy } from '../../core/auth/permission';
import { EnquiryStage, LeadSource, LostReasonCategory } from '../../proxy/pipeline';
import { EnquiryDetail, PipelineStore } from '../../core/services/pipeline.service';
import { inrCompact } from '../../core/util/format';
import { ArButton, ArChip, ArDialog, ArSelect, ChipTone } from '../../ui';
import { ArEnquiryActivities } from '../activities/enquiry-activities';
import { ArEnquiryCalls } from '../calls/enquiry-calls';
import { ArEnquiryTickets } from '../helpdesk/enquiry-tickets';
import { ArEnquiryNetwork } from '../network/enquiry-network';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { PROFILE_FIELDS, ProfileField, profileFilled, profileInput } from './enquiry-profile';
import {
  CustomFieldDefinitionDto,
  CustomFieldEntity,
  CustomFieldService,
} from '../../proxy/contacts';
import { ArCustomFieldInputs } from '../contacts/custom-field-inputs';
import {
  customFieldAttributes,
  customFieldProblems,
  customFieldValuesOf,
  showCustomValue,
  sortFields,
} from '../contacts/custom-field-values';
import { AccountMasterDataService } from '../../core/services/account-master-data.service';

/**
 * Premium Enquiry Details Workspace drawer (slide-over).
 * Provides a high-fidelity enterprise CRM panel with sticky header and navigation,
 * contextual stage recommendation, 4 summary fact cards, circular score dial,
 * structured RFQ specs grid, quotation tracker, notes, and activity timeline.
 */
@Component({
  selector: 'ar-enquiry-drawer',
  imports: [
    ArButton,
    ArChip,
    ArDialog,
    ArEnquiryActivities,
    ArEnquiryCalls,
    ArEnquiryTickets,
    ArEnquiryNetwork,
    ArEnquiryMovePipeline,
    ArCustomFieldInputs,
    RouterLink,
    ArSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim" (click)="close.emit()" aria-hidden="true"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Enquiry detail">
      @if (detail(); as d) {
        <header class="dh">
          <!-- Top utility bar -->
          <div class="dh__top">
            <div class="dh__badges">
              <span class="ref-pill ar-mono">#{{ d.reference }}</span>
              <span class="stage-pill">{{ d.stageName ?? label(d.stage) }}</span>
              @if (d.band) {
                <span
                  class="temp-pill"
                  [class.temp-pill--hot]="d.band === 'hot'"
                  [class.temp-pill--warm]="d.band === 'warm'"
                  [class.temp-pill--cold]="d.band === 'cold'"
                >
                  <span class="temp-pill__dot"></span>
                  {{ d.band === 'hot' ? '🔥 Hot' : d.band === 'warm' ? '⚡ Warm' : '❄️ Cold' }}
                  @if (d.score != null) {
                    <span class="temp-pill__score">{{ d.score }}/100</span>
                  }
                </span>
              }
            </div>

            <button
              type="button"
              class="dh__x"
              aria-label="Close drawer"
              title="Close (Esc)"
              (click)="close.emit()"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Main Title & Customer Meta Row -->
          <div class="dh__main">
            <div class="dh__avatar" aria-hidden="true">
              {{ getInitials(d.contact || d.company || d.title) }}
            </div>
            <div class="dh__info">
              <h2 class="dh__title">{{ d.title }}</h2>
              <div class="dh__meta">
                <span class="dh__contact">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {{ d.contact }}
                </span>
                @if (d.company) {
                  <span class="dh__dot">·</span>
                  <span class="dh__co">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                      <path d="M9 22v-4h6v4"></path>
                      <path d="M8 6h.01"></path>
                      <path d="M16 6h.01"></path>
                      <path d="M8 10h.01"></path>
                      <path d="M16 10h.01"></path>
                      <path d="M8 14h.01"></path>
                      <path d="M16 14h.01"></path>
                    </svg>
                    {{ d.company }}
                  </span>
                }
                @if (d.renewalOf; as r) {
                  <span class="dh__dot">·</span>
                  <a class="dh__renewal" routerLink="/installed-base" title="Open the installed base">
                    <span class="renewal-tag">AMC Renewal</span>
                    <span>{{ r.description }}{{ r.serial ? ' (' + r.serial + ')' : '' }}</span>
                  </a>
                }
              </div>
            </div>
          </div>

          <!-- Quick Action Bar -->
          <div class="dh__actions">
            @if (canUpdate()) {
              <button ar-button type="button" variant="ghost" class="dh__act-btn" (click)="openEdit(d)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit details
              </button>
            }
            @if (canSpa()) {
              <a
                ar-button
                variant="ghost"
                class="dh__act-btn"
                routerLink="/oem/registrations/new"
                [queryParams]="{ enquiry: d.id }"
                title="Register this deal with OEM for price protection"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Register deal
              </a>
              <a
                ar-button
                variant="ghost"
                class="dh__act-btn"
                routerLink="/oem/spa/new"
                [queryParams]="{ enquiry: d.id }"
                title="Request OEM Special Price Agreement (SPA)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Request special price
              </a>
            }
            @if (canDelete()) {
              <button
                ar-button
                type="button"
                variant="quiet"
                class="dh__del-btn"
                title="Permanently remove enquiry"
                (click)="deleteEnquiry(d)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
              </button>
            }
          </div>

          <!-- 4 Summary KPI Fact Cards -->
          <div class="summary-cards">
            <div class="summary-card summary-card--stage">
              <div class="summary-card__icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div class="summary-card__body">
                <span class="summary-card__k">CURRENT STAGE</span>
                <span class="summary-card__v">{{ d.stageName ?? label(d.stage) }}</span>
              </div>
            </div>

            <div class="summary-card summary-card--value">
              <div class="summary-card__icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div class="summary-card__body">
                <span class="summary-card__k">EXPECTED VALUE</span>
                <span class="summary-card__v summary-card__v--val ar-mono">{{ value(d.valueInPaise) }}</span>
              </div>
            </div>

            <div class="summary-card summary-card--time">
              <div class="summary-card__icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div class="summary-card__body">
                <span class="summary-card__k">TIME IN STAGE</span>
                <span class="summary-card__v">{{ d.daysInStage }} {{ d.daysInStage === 1 ? 'day' : 'days' }}</span>
              </div>
            </div>

            <div class="summary-card summary-card--owner">
              <div class="summary-card__icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div class="summary-card__body">
                <span class="summary-card__k">OWNER</span>
                <span class="summary-card__v">{{ d.owner ?? 'Unassigned' }}</span>
              </div>
            </div>
          </div>

          <!-- Sticky Segmented Navigation Tabs -->
          <nav class="tabs-nav" role="tablist" aria-label="Enquiry sections">
            @for (t of tabs; track t.key) {
              <button
                type="button"
                role="tab"
                class="tab-btn"
                [class.tab-btn--active]="tab() === t.key"
                [attr.aria-selected]="tab() === t.key"
                (click)="tab.set(t.key)"
              >
                {{ t.label }}
                @if (t.key === 'overview' && d.quotations.length) {
                  <span class="tab-badge">{{ d.quotations.length }}</span>
                }
                @if (t.key === 'activity' && d.timeline.length) {
                  <span class="tab-badge">{{ d.timeline.length }}</span>
                }
              </button>
            }
          </nav>
        </header>

        <!-- Edit Enquiry Modal Dialog -->
        @if (editing()) {
          <ar-dialog title="Edit enquiry" (dismiss)="editing.set(false)">
            <label class="ar-field">
              <span class="ar-field__label">Title</span>
              <input
                required
                maxlength="256"
                class="ar-field__input"
                [value]="editTitle()"
                (input)="editTitle.set($any($event.target).value)"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label"
                >Requirement <span class="ar-field__opt">(optional)</span></span
              >
              <textarea
                class="ar-field__input"
                rows="3"
                [value]="editRequirement()"
                (input)="editRequirement.set($any($event.target).value)"
              ></textarea>
            </label>
            <label class="ar-field">
              <span class="ar-field__label"
                >Est. value (₹) <span class="ar-field__opt">(optional)</span></span
              >
              <input
                class="ar-field__input"
                inputmode="numeric"
                [value]="editValueRupees()"
                (input)="editValueRupees.set($any($event.target).value)"
              />
            </label>
            <h4 class="rfq__h">RFQ details</h4>
            <div class="rfq__edit-grid">
              @for (f of profileFields; track f.key) {
                <label class="ar-field">
                  <span class="ar-field__label">{{ f.label }}</span>
                  @if (f.kind === 'select') {
                    <select
                      arNative
                      class="ar-field__input"
                      [value]="profileValue(f.key)"
                      (change)="setProfile(f.key, $any($event.target).value)"
                    >
                      <option value="">—</option>
                      @for (o of optionsOf(f); track o) {
                        <option [value]="o">{{ o }}</option>
                      }
                    </select>
                  } @else {
                    <input
                      class="ar-field__input"
                      maxlength="256"
                      [attr.inputmode]="f.kind === 'number' ? 'numeric' : null"
                      [attr.list]="f.suggestions ? 'rfq-' + f.key : null"
                      [placeholder]="f.placeholder ?? ''"
                      [value]="profileValue(f.key)"
                      (input)="setProfile(f.key, $any($event.target).value)"
                    />
                    @if (f.suggestions) {
                      <datalist [id]="'rfq-' + f.key">
                        @for (s of f.suggestions; track s) {
                          <option [value]="s"></option>
                        }
                      </datalist>
                    }
                  }
                </label>
              }
              <label class="ar-field">
                <span class="ar-field__label">Expected order date</span>
                <input
                  arNative
                  type="date"
                  class="ar-field__input"
                  [value]="editOrderDate()"
                  (change)="editOrderDate.set($any($event.target).value)"
                />
              </label>
              <ar-custom-field-inputs
                idPrefix="enq-cf"
                [fields]="customFields()"
                [values]="editCustom()"
                [problems]="customProblems()"
                (valueChange)="setCustom($event.key, $event.value)"
              />
            </div>
            <div dialogActions>
              <button ar-button type="button" variant="ghost" (click)="editing.set(false)">
                Cancel
              </button>
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy() || !editTitle().trim()"
                (click)="saveEdit(d)"
              >
                {{ busy() ? 'Saving…' : 'Save changes' }}
              </button>
            </div>
          </ar-dialog>
        }

        <!-- Independently Scrollable Drawer Body -->
        <div class="dbody ar-scroll">
          <!-- Next Action Recommendation Card -->
          @if (d.lostReason) {
            <div class="next-action-card next-action-card--lost">
              <div class="next-action-card__badge-row">
                <span class="lost-badge">CLOSED LOST</span>
              </div>
              <h3 class="next-action-card__title">This enquiry was marked as lost</h3>
              <p class="next-action-card__desc">{{ d.lostReason }}</p>
            </div>
          } @else if (next(d); as n) {
            <div class="next-action-card">
              <div class="next-action-card__badge-row">
                <span class="rec-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  RECOMMENDED NEXT ACTION
                </span>
                <span class="target-stage-pill">Target: {{ n.label }}</span>
              </div>

              <h3 class="next-action-card__title">{{ nextActionTitle(d, n.label) }}</h3>
              <p class="next-action-card__desc">{{ nextActionDesc(d, n.label) }}</p>

              <div class="next-action-card__buttons">
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  class="btn-advance"
                  [disabled]="busy()"
                  (click)="advance(d, n.stageId)"
                >
                  Move to {{ n.label }} →
                </button>
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  class="btn-loss"
                  [disabled]="busy()"
                  (click)="toggleLosing()"
                >
                  {{ losing() ? 'Cancel' : 'Mark as lost' }}
                </button>
              </div>

              @if (losing()) {
                <div class="lostbox">
                  <div class="lostbox__header">
                    <span class="lostbox__title">Record Reason for Loss</span>
                    <span class="lostbox__sub">Helps pipeline analytics understand win/loss rates.</span>
                  </div>
                  <label class="ar-field">
                    <span class="ar-field__label">Why was it lost?</span>
                    <select
                      class="ar-field__input"
                      [value]="lostCat()"
                      (change)="lostCat.set(+$any($event.target).value)"
                    >
                      @for (o of lostCategories; track o.value) {
                        <option [value]="o.value">{{ o.label }}</option>
                      }
                    </select>
                  </label>
                  @if (lostCat() === LostCategory.LostToCompetitor && brands().length) {
                    <label class="ar-field">
                      <span class="ar-field__label"
                        >Which competitor brand won? <span class="ar-field__opt">(optional)</span></span
                      >
                      <select
                        class="ar-field__input"
                        (change)="lostBrand.set($any($event.target).value)"
                      >
                        <option value="">Not known</option>
                        @for (b of brands(); track b.id) {
                          <option [value]="b.id" translate="no">{{ b.name }}</option>
                        }
                      </select>
                    </label>
                  }
                  <label class="ar-field">
                    <span class="ar-field__label">What happened?</span>
                    <textarea
                      class="note"
                      rows="2"
                      placeholder="Add specific context on why the opportunity did not convert…"
                      [value]="lostNote()"
                      (input)="lostNote.set($any($event.target).value)"
                    ></textarea>
                  </label>
                  <button
                    ar-button
                    type="button"
                    variant="danger"
                    [disabled]="busy() || !lostNote().trim()"
                    (click)="confirmLost(d)"
                  >
                    Confirm lost
                  </button>
                </div>
              }
            </div>
          }

          <!-- Move to Pipeline Section -->
          <div class="pipeline-move-card">
            <span class="pipeline-move-card__label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              Cross-Pipeline Transfer
            </span>
            <ar-enquiry-move-pipeline
              class="move-pipeline-ctrl"
              [enquiryId]="d.id"
              [pipelineId]="d.pipelineId"
              (moved)="changed.emit()"
            />
          </div>

          <!-- Tab Content Views -->
          @switch (tab()) {
            @case ('overview') {
              <!-- 1. Customer Requirements Section -->
              <section class="sec-card">
                <div class="sec-card__header">
                  <div class="sec-card__title-wrap">
                    <div class="sec-card__icon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                    </div>
                    <h3 class="sec-card__title">Customer Requirements</h3>
                  </div>
                  @if (canUpdate()) {
                    <button type="button" class="action-link" (click)="openEdit(d)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit requirement
                    </button>
                  }
                </div>

                @if (d.requirement) {
                  <div class="req-quote">
                    <p class="req-text">{{ d.requirement }}</p>
                  </div>
                } @else {
                  <div class="empty-state">
                    <div class="empty-state__icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    </div>
                    <p class="empty-state__msg">No detailed technical requirements recorded yet.</p>
                    @if (canUpdate()) {
                      <button ar-button type="button" variant="ghost" class="empty-state__btn" (click)="openEdit(d)">
                        + Add Requirements
                      </button>
                    }
                  </div>
                }
              </section>

              <!-- 2. Win Probability / Lead Scoring Section -->
              @if (d.score != null) {
                <section class="sec-card score-panel">
                  <div class="sec-card__header">
                    <div class="sec-card__title-wrap">
                      <div class="sec-card__icon sec-card__icon--score" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <h3 class="sec-card__title">Win Probability & Lead Scoring</h3>
                    </div>
                    <span
                      class="score-status-badge"
                      [class.score-status-badge--hot]="d.band === 'hot'"
                      [class.score-status-badge--warm]="d.band === 'warm'"
                      [class.score-status-badge--cold]="d.band === 'cold'"
                    >
                      {{ d.band === 'hot' ? '🔥 High Conversion Likelihood' : d.band === 'warm' ? '⚡ Moderate Win Rate' : '❄️ Low Closing Probability' }}
                    </span>
                  </div>

                  <!-- Score Dial & Hero Metrics -->
                  <div class="score-hero">
                    <div class="score-hero__dial">
                      <svg class="score-dial" viewBox="0 0 88 88" width="88" height="88">
                        <circle
                          class="score-dial__bg"
                          cx="44"
                          cy="44"
                          r="36"
                          fill="none"
                          stroke="#E2E8F0"
                          stroke-width="7"
                        />
                        <circle
                          class="score-dial__fill"
                          cx="44"
                          cy="44"
                          r="36"
                          fill="none"
                          [attr.stroke]="scoreColor(d.band)"
                          stroke-width="7"
                          stroke-linecap="round"
                          stroke-dasharray="226.19"
                          [attr.stroke-dashoffset]="scoreDashOffset(d.score)"
                          transform="rotate(-90 44 44)"
                        />
                        <text x="44" y="42" text-anchor="middle" class="score-dial__val">{{ d.score }}</text>
                        <text x="44" y="56" text-anchor="middle" class="score-dial__denom">/100</text>
                      </svg>
                    </div>

                    <div class="score-hero__summary">
                      <div class="score-hero__label">PREDICTIVE CONVERSION SCORE</div>
                      <p class="score-hero__desc">
                        Points are dynamically calculated from RFQ completeness, account verification, engagement velocity, and pricing fit.
                      </p>
                      <div class="score-hero__legend">
                        <span class="legend-item"><span class="legend-dot legend-dot--hot"></span> Hot (≥75)</span>
                        <span class="legend-item"><span class="legend-dot legend-dot--warm"></span> Warm (40–74)</span>
                        <span class="legend-item"><span class="legend-dot legend-dot--cold"></span> Cold (&lt;40)</span>
                      </div>
                    </div>
                  </div>

                  <!-- Individual Scoring Factors Breakdown -->
                  <div class="score-factors">
                    <div class="score-factors__head">Factor Breakdown & Attribution</div>
                    <ul class="score-factors__list">
                      @for (f of d.scoreFactors; track f.key) {
                        <li class="score-factor-row">
                          <div class="score-factor-row__main">
                            <span class="score-factor-row__key">{{ f.key }}</span>
                            <span class="score-factor-row__note">{{ f.note }}</span>
                          </div>
                          @if (f.max > 0) {
                            <div class="score-factor-row__bar">
                              <span [style.width.%]="factorPercent(f.points, f.max)" [class.score-bar-neg]="f.points < 0"></span>
                            </div>
                          }
                          <div class="score-factor-row__pts ar-mono" [class.pts-neg]="f.points < 0">
                            {{ f.points > 0 ? '+' : '' }}{{ f.points }}{{ f.max ? ' / ' + f.max : '' }}
                          </div>
                        </li>
                      }
                    </ul>
                  </div>
                </section>
              }

              <!-- 3. RFQ Details Section -->
              <section class="sec-card">
                <div class="sec-card__header">
                  <div class="sec-card__title-wrap">
                    <div class="sec-card__icon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                    </div>
                    <h3 class="sec-card__title">RFQ Specifications</h3>
                    <span class="rfq-badge">{{ filled(d) }} of 9 filled ({{ rfqPercent(d) }}%)</span>
                  </div>
                  @if (canUpdate()) {
                    <button type="button" class="action-link" (click)="openEdit(d)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit RFQ
                    </button>
                  }
                </div>

                <!-- RFQ Completion Progress Bar -->
                <div class="rfq-progress-bar" aria-hidden="true">
                  <span class="rfq-progress-fill" [style.width.%]="rfqPercent(d)"></span>
                </div>

                <!-- 9 Fields Structured Grid -->
                <dl class="rfq-grid">
                  @for (f of profileFields; track f.key) {
                    <div class="rfq-grid__item">
                      <dt class="rfq-grid__label">{{ f.label }}</dt>
                      <dd class="rfq-grid__val" [class.rfq-grid__val--missing]="!d.attributes?.[f.key]">
                        @if (d.attributes?.[f.key]) {
                          {{ d.attributes?.[f.key] }}
                        } @else {
                          <span class="missing-tag">Not specified</span>
                        }
                      </dd>
                    </div>
                  }
                  <div class="rfq-grid__item">
                    <dt class="rfq-grid__label">Expected Order Date</dt>
                    <dd class="rfq-grid__val" [class.rfq-grid__val--missing]="!d.expectedCloseDate">
                      @if (d.expectedCloseDate) {
                        {{ day(d.expectedCloseDate) }}
                      } @else {
                        <span class="missing-tag">Not specified</span>
                      }
                    </dd>
                  </div>
                </dl>
              </section>

              <!-- Optional Custom Workspace Fields -->
              @if (customFields().length) {
                <section class="sec-card">
                  <div class="sec-card__header">
                    <div class="sec-card__title-wrap">
                      <div class="sec-card__icon" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="4 7 4 4 20 4 20 7"></polyline>
                          <line x1="9" y1="20" x2="15" y2="20"></line>
                          <line x1="12" y1="4" x2="12" y2="20"></line>
                        </svg>
                      </div>
                      <h3 class="sec-card__title">Additional Custom Fields</h3>
                    </div>
                  </div>
                  <dl class="rfq-grid">
                    @for (f of customFields(); track f.id) {
                      <div class="rfq-grid__item">
                        <dt class="rfq-grid__label">{{ f.label }}</dt>
                        <dd class="rfq-grid__val">{{ showCustom(f, attributeOf(d, f.key)) }}</dd>
                      </div>
                    }
                  </dl>
                </section>
              }

              <!-- 4. Quotations Sent Section -->
              <section class="sec-card">
                <div class="sec-card__header">
                  <div class="sec-card__title-wrap">
                    <div class="sec-card__icon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                      </svg>
                    </div>
                    <h3 class="sec-card__title">Quotations Sent</h3>
                    @if (d.quotations.length) {
                      <span class="count-pill">{{ d.quotations.length }}</span>
                    }
                  </div>
                  @if (canUpdate()) {
                    <a
                      ar-button
                      variant="ghost"
                      class="action-link"
                      routerLink="/quotations/new"
                      [queryParams]="{ enquiry: d.id }"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      New quotation
                    </a>
                  }
                </div>

                <div class="quotes-list">
                  @for (q of d.quotations; track q.id) {
                    <div class="quote-card">
                      <div class="quote-card__left">
                        <div class="quote-card__icon" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                        </div>
                        <div>
                          <div class="quote-card__ref-row">
                            <span class="quote-card__ref ar-mono">{{ q.reference }}</span>
                            <span class="rev-pill">Rev {{ q.revision }}</span>
                            <ar-chip [tone]="quoteTone(q.state)">{{ q.state }}</ar-chip>
                          </div>
                        </div>
                      </div>

                      <div class="quote-card__right">
                        <span class="quote-card__amt ar-mono">{{ value(q.totalInPaise) }}</span>
                        <a
                          ar-button
                          variant="ghost"
                          class="quote-card__view-btn"
                          [routerLink]="['/quotations', q.id, 'edit']"
                          title="Open quotation details"
                        >
                          View →
                        </a>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <p class="empty-state__msg">No formal quotation generated for this enquiry yet.</p>
                      @if (canUpdate()) {
                        <a
                          ar-button
                          variant="ghost"
                          class="empty-state__btn"
                          routerLink="/quotations/new"
                          [queryParams]="{ enquiry: d.id }"
                        >
                          + Create Quotation
                        </a>
                      }
                    </div>
                  }
                </div>
              </section>
            }

            @case ('activity') {
              <!-- Add Note Section -->
              <section class="sec-card">
                <div class="sec-card__header">
                  <div class="sec-card__title-wrap">
                    <div class="sec-card__icon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </div>
                    <h3 class="sec-card__title">Add Internal Note</h3>
                  </div>
                </div>
                <div class="note-box">
                  <textarea
                    class="note-textarea"
                    rows="3"
                    placeholder="Record conversation summary, buyer timeline, or key technical dependencies… (Visible to your team)"
                    [value]="noteText()"
                    (input)="noteText.set($any($event.target).value)"
                  ></textarea>
                  <div class="note-box__footer">
                    <span class="note-hint">Enter keeps formatting. Notes are visible across your team.</span>
                    <button
                      ar-button
                      type="button"
                      variant="primary"
                      [disabled]="busy() || !noteText().trim()"
                      (click)="saveNote(d)"
                    >
                      Save note
                    </button>
                  </div>
                </div>
              </section>

              <!-- Activity Log Subcomponent -->
              <section class="sec-card">
                <ar-enquiry-activities [enquiryId]="d.id" />
              </section>

              <!-- Historical Event Timeline -->
              <section class="sec-card">
                <div class="sec-card__header">
                  <div class="sec-card__title-wrap">
                    <div class="sec-card__icon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 14 14"></polyline>
                      </svg>
                    </div>
                    <h3 class="sec-card__title">Enquiry History</h3>
                  </div>
                </div>

                <ol class="timeline">
                  @for (e of d.timeline; track $index) {
                    <li class="timeline__item">
                      <span class="timeline__node" aria-hidden="true"></span>
                      <div class="timeline__card">
                        <div class="timeline__meta">
                          <strong class="timeline__kind">{{ e.kind }}</strong>
                          @if (e.by) {
                            <span class="timeline__by">by {{ e.by }}</span>
                          }
                          <span class="timeline__at">{{ when(e.at) }}</span>
                        </div>
                        @if (e.summary) {
                          <p class="timeline__summary">{{ e.summary }}</p>
                        }
                      </div>
                    </li>
                  } @empty {
                    <li class="empty-state">
                      <p class="empty-state__msg">No timeline events recorded on this enquiry yet.</p>
                    </li>
                  }
                </ol>
              </section>
            }

            @case ('contact') {
              <section class="sec-card">
                <ar-enquiry-calls
                  [enquiryId]="d.id"
                  [contactId]="d.contactId"
                  [contactName]="d.contact"
                />
              </section>
              <section class="sec-card">
                <ar-enquiry-tickets
                  [enquiryId]="d.id"
                  [contactId]="d.contactId"
                  [contactName]="d.contact"
                />
              </section>
            }

            @case ('partners') {
              <ar-enquiry-network
                class="sec-card"
                [enquiryId]="d.id"
                [open]="d.stage !== 'won' && d.stage !== 'lost'"
              />
            }
          }
        </div>
      } @else {
        <div class="drawer-loading">
          <div class="loading-spinner"></div>
          <p>Loading enquiry details…</p>
        </div>
      }
    </aside>
  `,
  styles: `
    :host {
      --primary: #2563EB;
      --primary-dark: #1D4ED8;
      --navy: #101B30;
      --background: #F5F7FC;
      --surface: #FFFFFF;
      --soft-blue: #EFF6FF;
      --lavender: #F5F3FF;
      --teal: #0D9488;
      --orange: #F59E0B;
      --text-primary: #172033;
      --text-secondary: #64748B;
      --border: #E6EAF2;

      position: fixed;
      inset: 0;
      z-index: 960;
      display: block;
      font-family: var(--ar-font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    }

    /* Scrim Backdrop */
    .scrim {
      position: absolute;
      inset: 0;
      background: rgba(16, 27, 48, 0.45);
      backdrop-filter: blur(2px);
      animation: fadeInScrim 0.22s ease-out;
    }

    @keyframes fadeInScrim {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Drawer Shell */
    .drawer {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      width: min(820px, 92vw);
      max-width: 100vw;
      background: #F8FAFC;
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      box-shadow: -16px 0 48px rgba(16, 27, 48, 0.16);
      animation: slideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    /* Sticky Drawer Header */
    .dh {
      flex-shrink: 0;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px 0;
      box-shadow: 0 2px 8px rgba(16, 27, 48, 0.03);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .dh__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .dh__badges {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .ref-pill {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--primary);
      background: var(--soft-blue);
      border: 1px solid #BFDBFE;
      padding: 2.5px 8px;
      border-radius: 6px;
      letter-spacing: 0.02em;
    }

    .stage-pill {
      font-size: 11.5px;
      font-weight: 600;
      color: #334155;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      padding: 2.5px 8.5px;
      border-radius: 6px;
    }

    .temp-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      font-weight: 600;
      padding: 2.5px 8.5px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
    }

    .temp-pill__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .temp-pill--hot {
      background: #ECFDF5;
      border-color: #A7F3D0;
      color: #065F46;
    }

    .temp-pill--warm {
      background: #FFFBEB;
      border-color: #FDE68A;
      color: #92400E;
    }

    .temp-pill--cold {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #1E40AF;
    }

    .temp-pill__score {
      opacity: 0.75;
      font-weight: 500;
      font-size: 10.5px;
    }

    .dh__x {
      background: transparent;
      border: 1px solid transparent;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #F1F5F9;
        border-color: #E2E8F0;
        color: var(--navy);
      }
    }

    /* Header Main Info */
    .dh__main {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 14px;
    }

    .dh__avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 3px 8px rgba(37, 99, 235, 0.25);
    }

    .dh__info {
      flex: 1;
      min-width: 0;
    }

    .dh__title {
      margin: 0 0 5px;
      font-size: 19px;
      font-weight: 700;
      color: var(--navy);
      line-height: 1.3;
      word-break: break-word;
    }

    .dh__meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .dh__contact,
    .dh__co {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
      color: #334155;
    }

    .dh__dot {
      color: #94A3B8;
    }

    .dh__renewal {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 12px;

      &:hover {
        color: var(--primary);
      }
    }

    .renewal-tag {
      background: #CCFBF1;
      color: #0F766E;
      font-weight: 600;
      font-size: 10.5px;
      padding: 1px 6px;
      border-radius: 4px;
    }

    /* Actions Bar */
    .dh__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .dh__act-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      height: 32px;
      padding: 0 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: #334155;
      border-radius: 7px;
      transition: all 0.15s ease;

      &:hover {
        background: #F8FAFC;
        border-color: #CBD5E1;
        color: var(--navy);
      }
    }

    .dh__del-btn {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12.5px;
      color: #DC2626;
      border: 1px solid transparent;
      padding: 4px 8px;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;

      &:hover {
        background: #FEE2E2;
        border-color: #FECACA;
      }
    }

    /* 4 Summary Fact Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .summary-card {
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.15s ease;

      &:hover {
        background: #FFFFFF;
        box-shadow: 0 2px 6px rgba(16, 27, 48, 0.05);
      }
    }

    .summary-card__icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid var(--border);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .summary-card--stage .summary-card__icon { color: var(--primary); }
    .summary-card--value .summary-card__icon { color: #059669; }
    .summary-card--time .summary-card__icon { color: #D97706; }
    .summary-card--owner .summary-card__icon { color: #7C3AED; }

    .summary-card__body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .summary-card__k {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .summary-card__v {
      font-size: 13px;
      font-weight: 700;
      color: var(--navy);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .summary-card__v--val {
      font-size: 13.5px;
      color: #059669;
    }

    /* Segmented Navigation Tabs */
    .tabs-nav {
      display: flex;
      align-items: center;
      gap: 3px;
      background: #F1F5F9;
      padding: 4px;
      border-radius: 9px;
      margin-bottom: 12px;
    }

    .tab-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 12px;
      border: none;
      background: transparent;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;

      &:hover {
        color: var(--navy);
      }
    }

    .tab-btn--active {
      background: #FFFFFF;
      color: var(--primary);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(16, 27, 48, 0.08);
    }

    .tab-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: #E2E8F0;
      color: #475569;
    }

    .tab-btn--active .tab-badge {
      background: var(--soft-blue);
      color: var(--primary);
    }

    /* Scrollable Drawer Body */
    .dbody {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 20px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Next Action Recommendation Card */
    .next-action-card {
      background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
      border: 1px solid #DBEAFE;
      border-left: 4px solid var(--primary);
      border-radius: 12px;
      padding: 16px 18px;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.06);
    }

    .next-action-card--lost {
      background: #FEF2F2;
      border-color: #FECACA;
      border-left: 4px solid #EF4444;
    }

    .next-action-card__badge-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }

    .rec-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--primary);
    }

    .lost-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #DC2626;
    }

    .target-stage-pill {
      font-size: 11.5px;
      font-weight: 600;
      color: #475569;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      padding: 2px 7px;
      border-radius: 5px;
    }

    .next-action-card__title {
      margin: 0 0 4px;
      font-size: 15px;
      font-weight: 700;
      color: var(--navy);
    }

    .next-action-card__desc {
      margin: 0 0 14px;
      font-size: 13px;
      line-height: 1.5;
      color: #475569;
    }

    .next-action-card__buttons {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-advance {
      font-weight: 600;
      font-size: 13px;
      padding: 6px 16px;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
    }

    .btn-loss {
      font-size: 13px;
      color: #64748B;

      &:hover {
        color: #DC2626;
      }
    }

    .lostbox {
      margin-top: 14px;
      padding: 14px;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .lostbox__title {
      font-size: 13px;
      font-weight: 700;
      color: #1E293B;
      display: block;
    }

    .lostbox__sub {
      font-size: 12px;
      color: #64748B;
    }

    /* Pipeline Move Card */
    .pipeline-move-card {
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
    }

    .pipeline-move-card__label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
    }

    .move-pipeline-ctrl {
      flex: 1;
      max-width: 360px;
    }

    /* Generic Modern Card Section */
    .sec-card {
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(16, 27, 48, 0.03);
    }

    .sec-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 14px;
    }

    .sec-card__title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sec-card__icon {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: #EFF6FF;
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .sec-card__icon--score {
      background: #ECFDF5;
      color: #059669;
    }

    .sec-card__title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: var(--navy);
      letter-spacing: -0.01em;
    }

    .action-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      color: var(--primary);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      padding: 4px 6px;
      border-radius: 5px;
      transition: all 0.12s ease;

      &:hover {
        background: #EFF6FF;
      }
    }

    /* Requirements Quote Body */
    .req-quote {
      border-left: 3px solid var(--primary);
      background: #F8FAFC;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
    }

    .req-text {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.6;
      color: #1E293B;
      white-space: pre-wrap;
    }

    /* Empty States */
    .empty-state {
      text-align: center;
      padding: 24px 16px;
      background: #F8FAFC;
      border-radius: 9px;
      border: 1px dashed #CBD5E1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .empty-state__icon {
      color: #94A3B8;
    }

    .empty-state__msg {
      margin: 0;
      font-size: 13px;
      color: #64748B;
    }

    .empty-state__btn {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--primary);
    }

    /* Win Probability & Scoring Panel */
    .score-panel {
      border-color: #D1FAE5;
      background: linear-gradient(180deg, #FFFFFF 0%, #F9FDFB 100%);
    }

    .score-status-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 6px;
    }

    .score-status-badge--hot {
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }

    .score-status-badge--warm {
      background: #FFFBEB;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .score-status-badge--cold {
      background: #EFF6FF;
      color: #1E40AF;
      border: 1px solid #BFDBFE;
    }

    .score-hero {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 14px 16px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      margin-bottom: 16px;
    }

    .score-dial {
      display: block;
      flex-shrink: 0;
    }

    .score-dial__val {
      font-size: 20px;
      font-weight: 800;
      fill: var(--navy);
      font-family: var(--ar-font-mono, monospace);
    }

    .score-dial__denom {
      font-size: 10px;
      font-weight: 600;
      fill: #94A3B8;
    }

    .score-hero__summary {
      flex: 1;
      min-width: 0;
    }

    .score-hero__label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #059669;
      margin-bottom: 3px;
    }

    .score-hero__desc {
      margin: 0 0 8px;
      font-size: 12.5px;
      line-height: 1.45;
      color: #475569;
    }

    .score-hero__legend {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: #64748B;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .legend-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .legend-dot--hot { background: #10B981; }
    .legend-dot--warm { background: #F59E0B; }
    .legend-dot--cold { background: #3B82F6; }

    .score-factors__head {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #64748B;
      margin-bottom: 8px;
    }

    .score-factors__list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .score-factor-row {
      display: grid;
      grid-template-columns: 1fr 140px auto;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #FFFFFF;
      border: 1px solid #F1F5F9;
      border-radius: 8px;
      font-size: 12.5px;
    }

    .score-factor-row__main {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .score-factor-row__key {
      font-weight: 600;
      color: #1E293B;
      text-transform: capitalize;
    }

    .score-factor-row__note {
      font-size: 11.5px;
      color: #64748B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .score-factor-row__bar {
      height: 5px;
      background: #E2E8F0;
      border-radius: 999px;
      overflow: hidden;

      span {
        display: block;
        height: 100%;
        background: #10B981;
        border-radius: 999px;
        transition: width 0.3s ease;
      }

      .score-bar-neg {
        background: #EF4444;
      }
    }

    .score-factor-row__pts {
      font-weight: 700;
      font-size: 12px;
      color: #059669;
      text-align: right;
      white-space: nowrap;
    }

    .pts-neg {
      color: #DC2626;
    }

    /* RFQ Specifications Section */
    .rfq-badge {
      font-size: 11.5px;
      font-weight: 600;
      color: #0F766E;
      background: #CCFBF1;
      padding: 2.5px 8px;
      border-radius: 999px;
    }

    .rfq-progress-bar {
      height: 6px;
      background: #E2E8F0;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .rfq-progress-fill {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #0D9488 0%, #10B981 100%);
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .rfq-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 0;
    }

    .rfq-grid__item {
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .rfq-grid__label {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .rfq-grid__val {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--navy);
      word-break: break-word;
    }

    .rfq-grid__val--missing {
      font-weight: 400;
    }

    .missing-tag {
      font-size: 11.5px;
      font-style: italic;
      color: #94A3B8;
    }

    /* Quotations Sent */
    .count-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: #EFF6FF;
      color: var(--primary);
    }

    .quotes-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .quote-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-radius: 9px;
      transition: all 0.15s ease;

      &:hover {
        background: #FFFFFF;
        box-shadow: 0 2px 6px rgba(16, 27, 48, 0.05);
      }
    }

    .quote-card__left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .quote-card__icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #EFF6FF;
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .quote-card__ref-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .quote-card__ref {
      font-size: 13px;
      font-weight: 700;
      color: var(--navy);
    }

    .rev-pill {
      font-size: 11px;
      font-weight: 600;
      background: #E2E8F0;
      color: #475569;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .quote-card__right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .quote-card__amt {
      font-size: 13.5px;
      font-weight: 700;
      color: #059669;
    }

    .quote-card__view-btn {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 8px;
    }

    /* Notes & Activity */
    .note-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .note-textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.5;
      color: var(--navy);
      background: #F8FAFC;
      resize: vertical;
      box-sizing: border-box;
      outline: none;
      transition: all 0.15s ease;

      &:focus {
        background: #FFFFFF;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }
    }

    .note-box__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .note-hint {
      font-size: 11.5px;
      color: #64748B;
    }

    /* History Timeline */
    .timeline {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        top: 10px;
        bottom: 10px;
        left: 6px;
        width: 2px;
        background: #E2E8F0;
      }
    }

    .timeline__item {
      display: flex;
      gap: 14px;
      position: relative;
    }

    .timeline__node {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 3px solid var(--primary);
      flex-shrink: 0;
      margin-top: 3px;
      z-index: 1;
    }

    .timeline__card {
      flex: 1;
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
    }

    .timeline__meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }

    .timeline__kind {
      color: var(--navy);
    }

    .timeline__by {
      color: #64748B;
    }

    .timeline__at {
      margin-left: auto;
      font-size: 11px;
      color: #94A3B8;
    }

    .timeline__summary {
      margin: 4px 0 0;
      font-size: 12.5px;
      line-height: 1.45;
      color: #475569;
    }

    /* RFQ Edit Grid inside Dialog */
    .rfq__h {
      margin: 16px 0 8px;
      font-size: 13px;
      font-weight: 700;
      color: var(--navy);
    }

    .rfq__edit-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 12px;
    }

    /* Drawer Loading State */
    .drawer-loading {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #64748B;
      font-size: 13.5px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #E2E8F0;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive Breakpoints */
    @media (max-width: 768px) {
      .drawer {
        width: 100vw;
      }
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }
      .rfq-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .score-factor-row {
        grid-template-columns: 1fr auto;
      }
      .score-factor-row__bar {
        display: none;
      }
    }

    @media (max-width: 540px) {
      .dh {
        padding: 14px 16px 0;
      }
      .dbody {
        padding: 14px 16px 24px;
      }
      .summary-cards {
        grid-template-columns: 1fr;
      }
      .rfq-grid {
        grid-template-columns: 1fr;
      }
      .score-hero {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .scrim,
      .drawer,
      .rfq-progress-fill,
      .loading-spinner {
        animation: none !important;
        transition: none !important;
      }
    }
  `,
})
export class ArEnquiryDrawer {
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(PipelineStore);

  readonly enquiryId = input.required<string>();
  readonly close = output<void>();
  readonly changed = output<void>();

  protected readonly canUpdate = grantedPolicy('AutoReach.Pipeline.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Pipeline.Delete', this.permissions);
  protected readonly canSpa = grantedPolicy('AutoReach.Spa.Create', this.permissions);

  /** Segmented navigation tabs */
  protected readonly tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'activity', label: 'Notes & history' },
    { key: 'contact', label: 'Calls & tickets' },
    { key: 'partners', label: 'Partners' },
  ] as const;
  protected readonly tab = signal<'overview' | 'activity' | 'contact' | 'partners'>('overview');

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.editing()) this.close.emit();
  }

  protected readonly detail = signal<EnquiryDetail | null>(null);
  protected readonly busy = signal(false);
  protected readonly noteText = signal('');

  protected readonly editing = signal(false);
  protected readonly editTitle = signal('');
  protected readonly editRequirement = signal('');
  protected readonly editValueRupees = signal('');
  protected readonly editProfile = signal<Record<string, string>>({});

  /** A key the enquiry has no value for yet reads as blank. */
  protected profileValue(key: string): string {
    return (this.editProfile() as Partial<Record<string, string>>)[key] ?? '';
  }
  protected readonly editOrderDate = signal('');
  protected readonly profileFields = PROFILE_FIELDS;
  private readonly masterData = inject(AccountMasterDataService);

  /** A select's options: its own fixed ones, or the database list it names. */
  protected optionsOf(f: ProfileField): readonly string[] {
    return f.optionsFrom === 'industries' ? this.masterData.industries() : (f.options ?? []);
  }

  protected filled(d: EnquiryDetail): number {
    return profileFilled(d.attributes, d.expectedCloseDate);
  }

  protected rfqPercent(d: EnquiryDetail): number {
    return Math.round((this.filled(d) / 9) * 100);
  }

  protected setProfile(key: string, value: string): void {
    this.editProfile.update((p) => ({ ...p, [key]: value }));
  }

  protected readonly losing = signal(false);
  protected readonly lostCat = signal<LostReasonCategory>(LostReasonCategory.LostToCompetitor);
  protected readonly LostCategory = LostReasonCategory;
  protected readonly lostBrand = signal('');
  protected readonly brands = signal<CompetitorBrandDto[]>([]);
  private readonly brandsApi = inject(CompetitorBrandService);

  /** The workspace's enquiry fields from Settings → Custom fields, in their set order. */
  protected readonly customFields = signal<CustomFieldDefinitionDto[]>([]);
  protected readonly editCustom = signal<Record<string, string>>({});
  private readonly triedEditSave = signal(false);
  protected readonly customProblems = computed(() =>
    this.triedEditSave() ? customFieldProblems(this.customFields(), this.editCustom()) : {},
  );
  protected readonly showCustom = showCustomValue;

  protected attributeOf(d: EnquiryDetail, key: string | undefined): string | undefined {
    if (!key) return undefined;
    const wanted = key.toLowerCase();
    return Object.entries(d.attributes ?? {}).find(([k]) => k.toLowerCase() === wanted)?.[1];
  }

  protected setCustom(key: string, value: string): void {
    this.editCustom.update((v) => ({ ...v, [key]: value }));
  }

  private readonly customFieldsLoad = inject(CustomFieldService)
    .getFor(CustomFieldEntity.Enquiry, { skipHandleError: true })
    .subscribe({
      next: (r) => this.customFields.set(sortFields(r.items ?? [])),
      error: () => this.customFields.set([]),
    });

  protected readonly lostNote = signal('');
  protected readonly lostCategories: { value: LostReasonCategory; label: string }[] = [
    { value: LostReasonCategory.PriceTooHigh, label: 'Price too high' },
    { value: LostReasonCategory.LostToCompetitor, label: 'Lost to competitor' },
    { value: LostReasonCategory.ProjectCancelledOrDeferred, label: 'Project cancelled / deferred' },
    { value: LostReasonCategory.NoBudget, label: 'No budget' },
    { value: LostReasonCategory.TimelineTooLong, label: 'Timeline too long' },
    { value: LostReasonCategory.TechnicalFit, label: 'Technical fit' },
    { value: LostReasonCategory.NoResponse, label: 'No response' },
    { value: LostReasonCategory.AnotherBidderWon, label: 'Another bidder won the project' },
    { value: LostReasonCategory.Other, label: 'Other' },
  ];

  protected next(d: EnquiryDetail): { stageId: string; label: string } | undefined {
    return this.store.nextStageOf(d.pipelineId, d.stageId, d.stage);
  }

  constructor() {
    effect(() => {
      const id = this.enquiryId();
      this.detail.set(null);
      this.noteText.set('');
      this.tab.set('overview');
      this.losing.set(false);
      this.store.loadEnquiry(id).then((d) => this.detail.set(d));
    });
  }

  /** Contact / Company initials avatar */
  protected getInitials(name?: string): string {
    if (!name) return '—';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** Lead score gauge calculation */
  protected scorePercent(score?: number): number {
    return Math.max(0, Math.min(100, score ?? 0));
  }

  protected scoreDashOffset(score?: number): number {
    const c = 226.19; // 2 * pi * 36
    const pct = this.scorePercent(score);
    return c - (c * pct) / 100;
  }

  protected scoreColor(band?: string): string {
    if (band === 'hot') return '#10B981';
    if (band === 'warm') return '#F59E0B';
    return '#3B82F6';
  }

  protected factorPercent(points: number, max?: number): number {
    if (!max || max <= 0) return points > 0 ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((points / max) * 100)));
  }

  /** Contextual recommendation helper methods */
  protected nextActionTitle(d: EnquiryDetail, nextLabel: string): string {
    const s = (d.stageName ?? d.stage ?? '').toLowerCase();
    if (s.includes('qualif')) return 'Advance Qualified Lead';
    if (s.includes('new')) return 'Qualify & Review Specifications';
    if (s.includes('quot')) return 'Submit Quotation for Review';
    if (s.includes('negot')) return 'Finalize Deal Terms & Negotiation';
    if (s.includes('visit') || s.includes('site')) return 'Coordinate Site Inspection';
    return `Advance to ${nextLabel}`;
  }

  protected nextActionDesc(d: EnquiryDetail, nextLabel: string): string {
    const s = (d.stageName ?? d.stage ?? '').toLowerCase();
    if (s.includes('qualif')) return `Review client budget and technical fit, then transition this opportunity to ${nextLabel}.`;
    if (s.includes('new')) return `Verify RFQ details and customer contact information, then move to ${nextLabel}.`;
    if (s.includes('quot')) return `Prepare the quotation or commercial proposal and transition to ${nextLabel}.`;
    if (s.includes('negot')) return `Address pricing discussions, finalize agreement terms and move to ${nextLabel}.`;
    if (s.includes('visit') || s.includes('site')) return `Complete customer site inspection and advance to ${nextLabel}.`;
    return `When requirements for this stage are satisfied, move this deal forward to ${nextLabel}.`;
  }

  protected quoteTone(state?: string): ChipTone {
    const s = (state ?? '').toLowerCase();
    if (s.includes('won') || s.includes('accept')) return 'good';
    if (s.includes('sent') || s.includes('issue')) return 'teal';
    if (s.includes('draft')) return 'neutral';
    if (s.includes('reject') || s.includes('lost')) return 'bad';
    return 'neutral';
  }

  protected label(stage: string): string {
    return stage.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }

  protected value(paise?: number): string {
    return paise == null ? '—' : inrCompact(paise / 100);
  }

  protected when(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  protected async advance(d: EnquiryDetail, stageId: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.moveEnquiryToStage(d.id, stageId);
      this.changed.emit();
      this.detail.set(await this.store.loadEnquiry(d.id));
    } finally {
      this.busy.set(false);
    }
  }

  protected toggleLosing(): void {
    this.losing.set(!this.losing());
    if (this.losing() && !this.brands().length) {
      this.brandsApi
        .getActive()
        .subscribe({ next: (b) => this.brands.set(b), error: () => undefined });
    }
  }

  protected async confirmLost(d: EnquiryDetail): Promise<void> {
    const reason = this.lostNote().trim();
    if (!reason) return;
    this.busy.set(true);
    try {
      await this.store.moveEnquiry(
        d.id,
        EnquiryStage.Lost,
        reason,
        this.lostCat(),
        this.lostCat() === LostReasonCategory.LostToCompetitor ? this.lostBrand() || null : null,
      );
      this.changed.emit();
      this.close.emit();
    } finally {
      this.busy.set(false);
      this.losing.set(false);
    }
  }

  protected async saveNote(d: EnquiryDetail): Promise<void> {
    const note = this.noteText().trim();
    if (!note) return;
    this.busy.set(true);
    try {
      await this.store.addEnquiryNote(d.id, note);
      this.noteText.set('');
      this.detail.set(await this.store.loadEnquiry(d.id));
    } finally {
      this.busy.set(false);
    }
  }

  protected day(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected openEdit(d: EnquiryDetail): void {
    this.editTitle.set(d.title);
    this.editRequirement.set(d.requirement ?? '');
    this.editValueRupees.set(d.valueInPaise ? String(d.valueInPaise / 100) : '');
    this.editProfile.set({ ...(d.attributes ?? {}) });
    this.editCustom.set(customFieldValuesOf(this.customFields(), d.attributes));
    this.triedEditSave.set(false);
    this.editOrderDate.set(d.expectedCloseDate ? d.expectedCloseDate.slice(0, 10) : '');
    this.editing.set(true);
  }

  protected async saveEdit(d: EnquiryDetail): Promise<void> {
    if (!this.editTitle().trim()) {
      this.toasts.warning('Title is required.', 'Edit enquiry');
      return;
    }
    const rupees = Number(this.editValueRupees().replace(/[^\d.]/g, ''));
    const profile = profileInput(this.editProfile());
    if (typeof profile === 'string') {
      this.toasts.warning(profile, 'Edit enquiry');
      return;
    }
    this.triedEditSave.set(true);
    const customProblem = Object.values(
      customFieldProblems(this.customFields(), this.editCustom()),
    )[0];
    if (customProblem) {
      this.toasts.warning(customProblem, 'Edit enquiry');
      return;
    }
    this.busy.set(true);
    try {
      await this.store.updateEnquiry(d.id, {
        contactId: d.contactId,
        pipelineId: d.pipelineId,
        source: LeadSource.Manual,
        sourceRef: d.sourceRef ?? null,
        ownerUserId: d.ownerUserId ?? null,
        title: this.editTitle().trim(),
        requirement: this.editRequirement().trim() || undefined,
        estimatedValueInPaise: rupees > 0 ? Math.round(rupees * 100) : undefined,
        expectedCloseDate: this.editOrderDate() ? `${this.editOrderDate()}T00:00:00Z` : null,
        attributes: {
          ...customFieldAttributes(this.customFields(), this.editCustom()),
          ...profile,
        },
      });
      this.editing.set(false);
      this.toasts.success('Enquiry updated.');
      this.changed.emit();
      this.detail.set(await this.store.loadEnquiry(d.id));
    } catch {
      this.toasts.error('Could not update enquiry.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async deleteEnquiry(d: EnquiryDetail): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'enquiry',
        d.reference,
        'This will permanently delete this enquiry and all linked activities.',
      ))
    ) {
      return;
    }
    this.busy.set(true);
    try {
      await this.store.deleteEnquiry(d.id);
      this.toasts.success(`${d.reference} deleted.`);
      this.changed.emit();
      this.close.emit();
    } catch {
      this.toasts.error(`Could not delete ${d.reference}.`);
    } finally {
      this.busy.set(false);
    }
  }
}
