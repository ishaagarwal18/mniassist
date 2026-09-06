import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { EnquiryStage } from '../../proxy/pipeline';
import { EnquiryDetail, PipelineStore, Stage } from '../../core/services/pipeline.service';
import { inrCompact } from '../../core/util/format';
import { ArButton, ArChip } from '../../ui';

const NEXT: Partial<Record<Stage, { stage: EnquiryStage; label: string }>> = {
  new: { stage: EnquiryStage.Qualified, label: 'Qualified' },
  qualified: { stage: EnquiryStage.SiteVisit, label: 'Site visit' },
  siteVisit: { stage: EnquiryStage.Quoted, label: 'Quoted' },
  quoted: { stage: EnquiryStage.Negotiation, label: 'Negotiation' },
  negotiation: { stage: EnquiryStage.Won, label: 'Won' },
};

/**
 * The enquiry card, opened. A slide-over rather than a route because the board is
 * the context — you triage several cards in a sitting, and losing the columns to a
 * full-page view each time breaks that rhythm. Shows the requirement in full, the
 * linked quotations, and the timeline; advancing a stage and adding a note happen
 * here so the board stays a summary.
 */
@Component({
  selector: 'ar-enquiry-drawer',
  imports: [ArButton, ArChip],
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
          </div>
          <button type="button" class="dh__x" aria-label="Close" (click)="close.emit()">×</button>
        </header>

        <div class="dbody ar-scroll">
          <div class="facts">
            <div>
              <span class="facts__k">Stage</span
              ><ar-chip tone="neutral">{{ label(d.stage) }}</ar-chip>
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

          @if (d.lostReason) {
            <p class="lost">Lost — {{ d.lostReason }}</p>
          }

          <section class="sec">
            <h3 class="sec__t">Requirement</h3>
            <p class="req">{{ d.requirement ?? 'Nothing recorded yet.' }}</p>
          </section>

          @if (next(d.stage); as n) {
            <div class="advance">
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy()"
                (click)="advance(d, n.stage)"
              >
                Advance to {{ n.label }}
              </button>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="markLost(d)"
              >
                Mark lost
              </button>
            </div>
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
    .dh__contact {
      margin: 3px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
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
      background: var(--ar-amber-500);
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
  private readonly store = inject(PipelineStore);

  readonly enquiryId = input.required<string>();
  readonly close = output<void>();
  readonly changed = output<void>();

  protected readonly detail = signal<EnquiryDetail | null>(null);
  protected readonly busy = signal(false);
  protected readonly noteText = signal('');

  protected next(stage: Stage): { stage: EnquiryStage; label: string } | undefined {
    return NEXT[stage];
  }

  constructor() {
    effect(() => {
      const id = this.enquiryId();
      this.detail.set(null);
      this.noteText.set('');
      this.store.loadEnquiry(id).then((d) => this.detail.set(d));
    });
  }

  protected label(stage: Stage): string {
    return stage.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }

  protected value(paise?: number): string {
    return paise == null ? '—' : inrCompact(paise / 100);
  }

  protected when(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  protected async advance(d: EnquiryDetail, stage: EnquiryStage): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.moveEnquiry(d.id, stage);
      this.changed.emit();
      this.detail.set(await this.store.loadEnquiry(d.id));
    } finally {
      this.busy.set(false);
    }
  }

  protected async markLost(d: EnquiryDetail): Promise<void> {
    const reason = window.prompt('Why was this lost? (recorded on the enquiry)')?.trim();
    if (!reason) return;
    this.busy.set(true);
    try {
      await this.store.moveEnquiry(d.id, EnquiryStage.Lost, reason);
      this.changed.emit();
      this.close.emit();
    } finally {
      this.busy.set(false);
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
}
