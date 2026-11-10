import {
  CompetitorBrandDto,
  CompetitorBrandService,
} from '../../proxy/projects/competitor-brand.service';
import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
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
    RouterLink,
    ArSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim" (click)="close.emit()"></div>
    <aside class="drawer" role="dialog" aria-label="Enquiry detail">
      @if (detail(); as d) {
        <header class="dh">
          <div>
            <span class="dh__ref ar-mono">{{ d.reference }}</span>
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
            @if (canSpa()) {
              <a
                ar-button
                variant="ghost"
                routerLink="/oem/registrations/new"
                [queryParams]="{ enquiry: d.id }"
                >Register deal</a
              >
              <a
                ar-button
                variant="ghost"
                routerLink="/oem/spa/new"
                [queryParams]="{ enquiry: d.id }"
                >Special price</a
              >
            }
            @if (canUpdate()) {
              <button ar-button type="button" variant="ghost" (click)="openEdit(d)">Edit</button>
            }
            @if (canDelete()) {
              <button ar-button type="button" variant="danger" (click)="deleteEnquiry(d)">
                Delete
              </button>
            }
            <button type="button" class="dh__x" aria-label="Close" (click)="close.emit()">×</button>
          </div>
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
          <div class="facts">
            <div>
              <span class="facts__k">Stage</span
              ><ar-chip tone="neutral">{{ d.stageName ?? label(d.stage) }}</ar-chip>
            </div>
            <div>
              <span class="facts__k">Value</span
              ><span class="ar-mono">{{ value(d.valueInPaise) }}</span>
            </div>
            <div>
              <span class="facts__k">In stage</span><span>{{ d.daysInStage }}d</span>
            </div>
            <div>
              <span class="facts__k">Owner</span><span>{{ d.owner ?? 'Unassigned' }}</span>
            </div>
          </div>

          @if (d.score != null) {
            <section class="score">
              <h3 class="score__h">
                Deal score
                <ar-chip
                  [tone]="d.band === 'hot' ? 'good' : d.band === 'warm' ? 'amber' : 'neutral'"
                  >{{ d.band === 'hot' ? 'Hot' : d.band === 'warm' ? 'Warm' : 'Cold' }} ·
                  {{ d.score }}/100</ar-chip
                >
              </h3>
              <ul class="score__list">
                @for (f of d.scoreFactors; track f.key) {
                  <li>
                    <span class="score__k">{{ f.key }}</span>
                    <span class="score__note">{{ f.note }}</span>
                    <span class="score__pts ar-mono"
                      >{{ f.points > 0 ? '+' : '' }}{{ f.points
                      }}{{ f.max ? ' / ' + f.max : '' }}</span
                    >
                  </li>
                }
              </ul>
            </section>
          }

          @if (d.lostReason) {
            <p class="lost">Lost — {{ d.lostReason }}</p>
          }

          <section class="sec">
            <h3 class="sec__t">
              RFQ details
              <span class="rfq__count">{{ filled(d) }} of 9</span>
            </h3>
            <dl class="rfq">
              @for (f of profileFields; track f.key) {
                <div>
                  <dt>{{ f.label }}</dt>
                  <dd>{{ d.attributes?.[f.key] || '—' }}</dd>
                </div>
              }
              <div>
                <dt>Expected order date</dt>
                <dd>{{ d.expectedCloseDate ? day(d.expectedCloseDate) : '—' }}</dd>
              </div>
            </dl>
          </section>

          <section class="sec">
            <h3 class="sec__t">Requirement</h3>
            <p class="req">{{ d.requirement ?? 'Nothing recorded yet.' }}</p>
          </section>

          @if (next(d); as n) {
            <div class="advance">
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy()"
                (click)="advance(d, n.stageId)"
              >
                Advance to {{ n.label }}
              </button>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="toggleLosing()"
              >
                Mark lost
              </button>
            </div>

            @if (losing()) {
              <div class="lostbox">
                <label class="ar-field">
                  <span class="ar-field__label">Reason category</span>
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
                <textarea
                  class="note"
                  rows="2"
                  placeholder="What happened? (recorded on the enquiry)"
                  [value]="lostNote()"
                  (input)="lostNote.set($any($event.target).value)"
                ></textarea>
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy() || !lostNote().trim()"
                  (click)="confirmLost(d)"
                >
                  Confirm lost
                </button>
              </div>
            }
          }

          <section class="sec">
            <h3 class="sec__t">Quotations</h3>
            @for (q of d.quotations; track q.id) {
              <div class="quote">
                <span class="ar-mono">{{ q.reference }} · r{{ q.revision }}</span>
                <ar-chip tone="neutral">{{ q.state }}</ar-chip>
                <span class="ar-mono quote__amt">{{ value(q.totalInPaise) }}</span>
              </div>
            } @empty {
              <p class="sec__empty">No quotation raised yet.</p>
            }
          </section>

          <section class="sec">
            <ar-enquiry-activities [enquiryId]="d.id" />
          </section>

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

          <ar-enquiry-network
            class="sec"
            [enquiryId]="d.id"
            [open]="d.stage !== 'won' && d.stage !== 'lost'"
          />

          <section class="sec">
            <h3 class="sec__t">Add a note</h3>
            <textarea
              class="note"
              rows="2"
              placeholder="Recorded on the timeline and visible to the team."
              [value]="noteText()"
              (input)="noteText.set($any($event.target).value)"
            ></textarea>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="busy() || !noteText().trim()"
              (click)="saveNote(d)"
            >
              Save note
            </button>
          </section>

          <section class="sec">
            <h3 class="sec__t">Timeline</h3>
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
              }
            </ol>
          </section>
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
      z-index: 40;
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
      width: min(460px, 92vw);
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
        attributes: profile,
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
