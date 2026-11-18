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
import { ArButton, ArChip, ArDialog, ArSelect } from '../../ui';
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
 * The enquiry card, opened. A slide-over rather than a route because the board is
 * the context — you triage several cards in a sitting, and losing the columns to a
 * full-page view each time breaks that rhythm. Shows the requirement in full, the
 * linked quotations, and the timeline; advancing a stage and adding a note happen
 * here so the board stays a summary.
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
    <div class="scrim" (click)="close.emit()"></div>
    <aside class="drawer" role="dialog" aria-label="Enquiry detail">
      @if (detail(); as d) {
        <header class="dh">
          <div class="dh__top">
            <span class="dh__ref ar-mono">Enquiry {{ d.reference }}</span>
            <button type="button" class="dh__x" aria-label="Close" title="Close (Esc)" (click)="close.emit()">×</button>
          </div>
          <div>
            <h2 class="dh__title">{{ d.title }}</h2>
            <p class="dh__contact">
              {{ d.contact }}
              @if (d.company) {
                <span class="dh__co"> · {{ d.company }}</span>
              }
            </p>
            @if (d.renewalOf; as r) {
              <a class="dh__renewal" routerLink="/installed-base" title="Open the installed base">
                <ar-chip tone="teal" [dot]="true">AMC renewal</ar-chip>
                <span
                  >of {{ r.description }}
                  @if (r.serial) {
                    <span class="ar-mono"> ({{ r.serial }})</span>
                  }
                  @if (r.site) {
                    · {{ r.site }}
                  }
                  @if (r.amcEndsOn) {
                    · ends {{ day(r.amcEndsOn) }}
                  }
                </span>
              </a>
            }
          </div>
          <div class="dh__ctrls">
            @if (canUpdate()) {
              <button ar-button type="button" variant="ghost" icon="edit" (click)="openEdit(d)">
                Edit details
              </button>
            }
            @if (canSpa()) {
              <a
                ar-button
                variant="ghost"
                routerLink="/oem/registrations/new"
                [queryParams]="{ enquiry: d.id }"
                title="Register this deal with the OEM to protect it"
                >Register deal</a
              >
              <a
                ar-button
                variant="ghost"
                routerLink="/oem/spa/new"
                [queryParams]="{ enquiry: d.id }"
                title="Ask the OEM for a special price for this deal"
                >Request special price</a
              >
            }
            @if (canDelete()) {
              <button
                ar-button
                type="button"
                variant="quiet"
                class="dh__del"
                (click)="deleteEnquiry(d)"
              >
                Delete
              </button>
            }
          </div>

          <!-- Key facts -->
          <div class="facts">
            <div>
              <span class="facts__k">Stage</span
              ><ar-chip tone="neutral">{{ d.stageName ?? label(d.stage) }}</ar-chip>
            </div>
            <div>
              <span class="facts__k">Expected value</span
              ><span class="facts__v ar-mono">{{ value(d.valueInPaise) }}</span>
            </div>
            <div>
              <span class="facts__k">Time in this stage</span
              ><span class="facts__v">{{ d.daysInStage }} {{ d.daysInStage === 1 ? 'day' : 'days' }}</span>
            </div>
            <div>
              <span class="facts__k">Owner</span
              ><span class="facts__v">{{ d.owner ?? 'Unassigned' }}</span>
            </div>
          </div>

          <nav class="tabs" role="tablist" aria-label="Enquiry sections">
            @for (t of tabs; track t.key) {
              <button
                type="button"
                role="tab"
                class="tab"
                [class.tab--on]="tab() === t.key"
                [attr.aria-selected]="tab() === t.key"
                (click)="tab.set(t.key)"
              >
                {{ t.label }}
                @if (t.key === 'overview' && d.quotations.length) {
                  <span class="tab__n">{{ d.quotations.length }}</span>
                }
                @if (t.key === 'activity' && d.timeline.length) {
                  <span class="tab__n">{{ d.timeline.length }}</span>
                }
              </button>
            }
          </nav>
        </header>

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
            <div class="rfq__grid">
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

        <div class="dbody ar-scroll">
          <!-- What to do next: always on top -->
          @if (d.lostReason) {
            <div class="nextbox nextbox--lost">
              <p class="nextbox__h">This enquiry was lost</p>
              <p class="nextbox__d">{{ d.lostReason }}</p>
            </div>
          } @else if (next(d); as n) {
            <div class="nextbox">
              <p class="nextbox__h">Next step</p>
              <p class="nextbox__d">
                When this stage is done, move the enquiry on to <strong>{{ n.label }}</strong>. If the
                customer will not buy, mark it lost so the reason is recorded.
              </p>
              <div class="advance">
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy()"
                  (click)="advance(d, n.stageId)"
                >
                  Move to {{ n.label }} →
                </button>
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy()"
                  (click)="toggleLosing()"
                >
                  {{ losing() ? 'Cancel' : 'Mark as lost' }}
                </button>
              </div>

              @if (losing()) {
                <div class="lostbox">
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
                        >Which brand won? <span class="ar-field__opt">optional</span></span
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
                      placeholder="A short note, kept on the enquiry"
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

          <ar-enquiry-move-pipeline
            class="move"
            [enquiryId]="d.id"
            [pipelineId]="d.pipelineId"
            (moved)="changed.emit()"
          />

          @switch (tab()) {
            @case ('overview') {
              <section class="sec">
                <h3 class="sec__t">What the customer needs</h3>
                @if (d.requirement) {
                  <p class="req">{{ d.requirement }}</p>
                } @else {
                  <p class="sec__empty">
                    Nothing written yet.
                    @if (canUpdate()) {
                      <button type="button" class="link" (click)="openEdit(d)">
                        Add the requirement
                      </button>
                    }
                  </p>
                }
              </section>

              @if (d.score != null) {
                <section class="sec score">
                  <h3 class="sec__t score__h">
                    How likely to win
                    <ar-chip
                      [tone]="d.band === 'hot' ? 'good' : d.band === 'warm' ? 'amber' : 'neutral'"
                      >{{ d.band === 'hot' ? 'Hot' : d.band === 'warm' ? 'Warm' : 'Cold' }} ·
                      {{ d.score }}/100</ar-chip
                    >
                  </h3>
                  <p class="sec__hint">
                    The score adds up the points below. Higher means more likely to close.
                  </p>
                  <ul class="score__list">
                    @for (f of d.scoreFactors; track f.key) {
                      <li>
                        <span class="score__k">{{ f.key }}</span>
                        <span class="score__note">{{ f.note }}</span>
                        <span class="score__pts ar-mono" [class.score__pts--neg]="f.points < 0"
                          >{{ f.points > 0 ? '+' : '' }}{{ f.points
                          }}{{ f.max ? ' / ' + f.max : '' }}</span
                        >
                      </li>
                    }
                  </ul>
                </section>
              }

              <section class="sec">
                <h3 class="sec__t">
                  RFQ details
                  <span class="rfq__count">{{ filled(d) }} of 9 filled</span>
                </h3>
                <div class="rfq__bar" aria-hidden="true">
                  <span [style.width.%]="(filled(d) / 9) * 100"></span>
                </div>
                <dl class="rfq">
                  @for (f of profileFields; track f.key) {
                    <div>
                      <dt>{{ f.label }}</dt>
                      <dd [class.dd--empty]="!d.attributes?.[f.key]">
                        {{ d.attributes?.[f.key] || 'Not given' }}
                      </dd>
                    </div>
                  }
                  <div>
                    <dt>Expected order date</dt>
                    <dd [class.dd--empty]="!d.expectedCloseDate">
                      {{ d.expectedCloseDate ? day(d.expectedCloseDate) : 'Not given' }}
                    </dd>
                  </div>
                </dl>
              </section>

              @if (customFields().length) {
                <section class="sec">
                  <h3 class="sec__t">More details</h3>
                  <dl class="rfq">
                    @for (f of customFields(); track f.id) {
                      <div>
                        <dt>{{ f.label }}</dt>
                        <dd>{{ showCustom(f, attributeOf(d, f.key)) }}</dd>
                      </div>
                    }
                  </dl>
                </section>
              }

              <section class="sec">
                <h3 class="sec__t">Quotations sent</h3>
                @for (q of d.quotations; track q.id) {
                  <div class="quote">
                    <span class="ar-mono">{{ q.reference }} · revision {{ q.revision }}</span>
                    <ar-chip tone="neutral">{{ q.state }}</ar-chip>
                    <span class="ar-mono quote__amt">{{ value(q.totalInPaise) }}</span>
                  </div>
                } @empty {
                  <p class="sec__empty">No quotation sent for this enquiry yet.</p>
                }
              </section>
            }

            @case ('activity') {
              <section class="sec">
                <h3 class="sec__t">Add a note</h3>
                <textarea
                  class="note"
                  rows="3"
                  placeholder="e.g. Spoke to the buyer, they need delivery by March. The team can see this."
                  [value]="noteText()"
                  (input)="noteText.set($any($event.target).value)"
                ></textarea>
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy() || !noteText().trim()"
                  (click)="saveNote(d)"
                >
                  Save note
                </button>
              </section>

              <section class="sec">
                <ar-enquiry-activities [enquiryId]="d.id" />
              </section>

              <section class="sec">
                <h3 class="sec__t">History</h3>
                <ol class="tl">
                  @for (e of d.timeline; track $index) {
                    <li class="tl__row">
                      <span class="tl__dot" aria-hidden="true"></span>
                      <div>
                        <p class="tl__head">
                          <strong>{{ e.kind }}</strong>
                          @if (e.by) {
                            <span class="tl__by">· {{ e.by }}</span>
                          }
                          <span class="tl__at">{{ when(e.at) }}</span>
                        </p>
                        @if (e.summary) {
                          <p class="tl__sum">{{ e.summary }}</p>
                        }
                      </div>
                    </li>
                  } @empty {
                    <li class="sec__empty">Nothing has happened on this enquiry yet.</li>
                  }
                </ol>
              </section>
            }

            @case ('contact') {
              <section class="sec">
                <ar-enquiry-calls
                  [enquiryId]="d.id"
                  [contactId]="d.contactId"
                  [contactName]="d.contact"
                />
              </section>
              <section class="sec">
                <ar-enquiry-tickets
                  [enquiryId]="d.id"
                  [contactId]="d.contactId"
                  [contactName]="d.contact"
                />
              </section>
            }

            @case ('partners') {
              <ar-enquiry-network
                class="sec"
                [enquiryId]="d.id"
                [open]="d.stage !== 'won' && d.stage !== 'lost'"
              />
            }
          }
        </div>
      } @else {
        <p class="loading">Loading…</p>
      }
    </aside>
  `,
  styles: `
    .rfq {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 8px 16px;
      margin: 0;
    }
    .rfq dt {
      font: 500 11px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .rfq dd {
      margin: 2px 0 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-800);
      overflow-wrap: anywhere;
    }
    .rfq__count {
      margin-left: 8px;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .rfq__h {
      margin: 14px 0 6px;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .rfq__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0 12px;
    }
    :host {
      position: fixed;
      inset: 0;
      /* Above the page header (900) and the right rail (920), so the top is not hidden. */
      z-index: 960;
      display: block;
    }
    .scrim {
      position: absolute;
      inset: 0;
      background: rgba(16, 20, 26, 0.34);
    }
    .drawer {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      width: min(620px, 96vw);
      background: var(--ar-white);
      border-left: 1px solid var(--ar-line-200);
      display: flex;
      flex-direction: column;
      box-shadow: -12px 0 40px rgba(16, 20, 26, 0.12);
    }
    .dh {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 20px 14px;
      border-bottom: 1px solid var(--ar-line-200);
    }
    .dh__ref {
      font-size: 11px;
      color: var(--ar-ink-400);
    }
    .dh__title {
      margin: 4px 0 0;
      font: 600 16px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .dh__renewal {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-decoration: none;
    }
    .dh__renewal:hover span {
      color: var(--ar-ink-900);
    }
    .dh__contact {
      margin: 3px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .dh__ctrls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dh__x {
      background: none;
      border: 0;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      color: var(--ar-ink-400);
    }
    .dbody {
      flex: 1;
      min-height: 0;
      padding: 16px 20px 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .score {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 14px;
    }
    .score__h {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font: 600 12px var(--ar-font-sans);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ar-ink-500);
    }
    .score__list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
    }
    .score__list li {
      display: grid;
      grid-template-columns: 96px 1fr auto;
      gap: 8px;
      padding: 5px 0;
      border-top: 1px solid var(--ar-line-200);
      font: 400 12px var(--ar-font-sans);
    }
    .score__k {
      font-weight: 500;
      color: var(--ar-ink-700);
    }
    .score__note {
      color: var(--ar-ink-400);
    }
    .score__pts {
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }
    .facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 14px;
    }
    .facts > div {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .facts__k {
      font: 500 10.5px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ar-ink-400);
    }

    .lost {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-warn-100);
      color: var(--ar-warn-600);
      font: 500 12px var(--ar-font-sans);
    }

    .sec__t {
      margin: 0 0 8px;
      font: 600 12px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .sec__empty {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .req {
      margin: 0;
      font: 400 13px/1.6 var(--ar-font-sans);
      color: var(--ar-ink-900);
      white-space: pre-wrap;
    }

    .advance {
      display: flex;
      gap: 8px;
    }
    .lostbox {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
    }
    .quote {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
      border-bottom: 1px solid var(--ar-line-200);
    }
    .quote__amt {
      margin-left: auto;
    }

    .note {
      width: 100%;
      resize: vertical;
      padding: 8px 10px;
      font: 400 13px var(--ar-font-sans);
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      margin-bottom: 8px;
    }

    .tl {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .tl__row {
      display: flex;
      gap: 10px;
    }
    .tl__dot {
      width: 8px;
      height: 8px;
      margin-top: 5px;
      border-radius: 50%;
      flex: none;
      background: var(--ar-blue-500);
    }
    .tl__head {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .tl__by {
      color: var(--ar-ink-500);
    }
    .tl__at {
      color: var(--ar-ink-400);
      margin-left: 6px;
    }
    .tl__sum {
      margin: 2px 0 0;
      font: 400 12px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    /* Sections keep their height and the body scrolls; without this they were squeezed and overlapped. */
    .dbody > *,
    .dh > * {
      flex-shrink: 0;
    }
    .dh {
      flex-shrink: 0;
    }
    .move {
      display: block;
    }

    /* Header layout */
    .dh {
      flex-direction: column;
      align-items: stretch;
      padding-bottom: 0;
    }
    .dh__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dh__title {
      font-size: 18px;
    }
    .dh__ctrls {
      flex-wrap: wrap;
      gap: 6px;
    }
    .dh__del {
      margin-left: auto;
      color: var(--ar-red-600);
    }
    .dh .facts {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      padding: 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-100);
    }
    .facts__v {
      font-weight: 600;
    }
    @media (max-width: 560px) {
      .dh .facts {
        grid-template-columns: 1fr 1fr;
      }
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 2px;
      margin: 4px -20px 0;
      padding: 0 14px;
      overflow-x: auto;
    }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 10px 9px;
      border: 0;
      border-bottom: 2px solid transparent;
      background: none;
      cursor: pointer;
      white-space: nowrap;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .tab:hover {
      color: var(--ar-ink-900);
    }
    .tab--on {
      color: var(--ar-blue-600, var(--ar-blue-500));
      border-bottom-color: var(--ar-blue-500);
      font-weight: 600;
    }
    .tab__n {
      padding: 0 6px;
      border-radius: 999px;
      background: var(--ar-bg-100);
      font-size: 11px;
      color: var(--ar-ink-500);
    }

    /* Next step */
    .nextbox {
      padding: 14px;
      border: 1px solid var(--ar-blue-500);
      border-left-width: 4px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-white);
    }
    .nextbox--lost {
      border-color: var(--ar-warn-600);
      background: var(--ar-warn-100);
    }
    .nextbox__h {
      margin: 0 0 2px;
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .nextbox__d {
      margin: 0 0 10px;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-600, var(--ar-ink-500));
    }
    .nextbox--lost .nextbox__d {
      margin: 0;
    }

    .sec__t {
      text-transform: none;
      letter-spacing: 0;
      font-size: 13.5px;
      color: var(--ar-ink-900);
    }
    .sec__hint {
      margin: -4px 0 8px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .score {
      margin-top: 0;
    }
    .score__pts--neg {
      color: var(--ar-red-600);
    }
    .rfq__bar {
      height: 4px;
      margin: -2px 0 12px;
      border-radius: 2px;
      background: var(--ar-line-200);
      overflow: hidden;
    }
    .rfq__bar span {
      display: block;
      height: 100%;
      background: var(--ar-teal-500, #2f9e8f);
    }
    .rfq dt {
      text-transform: none;
      letter-spacing: 0;
      font-size: 11.5px;
    }
    .dd--empty {
      color: var(--ar-ink-400) !important;
      font-style: italic;
    }
    .link {
      margin-left: 4px;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      font: inherit;
      color: var(--ar-blue-500);
      text-decoration: underline;
    }

    .loading {
      padding: 40px;
      text-align: center;
      color: var(--ar-ink-400);
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

  /** The drawer is split into tabs so one long scroll does not hide what matters. */
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
      // Custom fields are extra: the drawer still works without them.
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

  /** Opens the lost box; the competitor brands are fetched the first time it opens. */
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
      // What the dialog does not edit goes back as it was: an edit must not unassign the owner
      // or drop the ad reference.
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
