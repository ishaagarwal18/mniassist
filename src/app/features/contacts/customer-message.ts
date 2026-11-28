import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ChannelService } from '../../core/services/channel.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { pathOf } from '../../layout/cockpit-origin.logic';
import { ArTopbar } from '../../layout/topbar';
import { ContactService } from '../../proxy/contacts/contact.service';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { TemplateService } from '../../proxy/messaging/template.service';
import {
  CustomerCommunicationService,
  CustomerDocumentInput,
} from '../../proxy/sales/customer-communication.service';
import { DeliveryChallanService } from '../../proxy/sales/delivery-challan.service';
import { SalesInvoiceService } from '../../proxy/sales/sales-invoice.service';
import { SalesOrderService } from '../../proxy/sales/sales-order.service';
import { SmsChannelService, SmsTemplateStatus } from '../../proxy/sms/sms-channel.service';
import { ArAvatar } from '../../ui/avatar';
import { ArButton } from '../../ui/button';
import { ArIcon } from '../../ui/icon';

/** One of the customer's sales documents, as the picker shows it. */
type DocumentChoice = CustomerDocumentInput & {
  key: string;
  /** "Invoice", "Payment receipt", … */
  type: string;
  number: string;
  date: string;
  amountInPaise?: number;
  /** Set when a colleague on the same account is the buyer. */
  buyer?: string;
};

const DOC_ORDER = ['Invoice', 'Payment receipt', 'Sales order', 'Delivery challan'];
type MessageTemplate = { id: string; name: string; text: string; variables: string[] };

/**
 * Message one customer (/contacts/:id/message): WhatsApp from one of the workspace's numbers, email or SMS, with an approved
 * template or free text, and optionally one of their own sales documents as a secure link. Opened from Customer 360, whose
 * breadcrumb it keeps ("Customer 360 · <name> › Message customer") and where it returns once sent. Sent through the platform,
 * so it is logged in the inbox and the customer's timeline and respects their consent.
 */
@Component({
  selector: 'ar-customer-message',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, ArTopbar, ArButton, ArIcon, ArAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Message customer"
      [subtitle]="name()"
      help="Sends from your workspace's WhatsApp number, email or SMS, so the message is logged in the inbox and on the customer's timeline. Outside WhatsApp's 24-hour window only an approved template can be sent."
    />

    <div class="msg ar-scroll">
      @if (loading()) {
        <p class="msg__state" role="status">Loading…</p>
      } @else if (!contactId()) {
        <p class="msg__state msg__state--error" role="alert">This customer could not be found.</p>
      } @else {
        <form class="msg__layout" (submit)="$event.preventDefault(); send()">
          <!-- Compose -->
          <section class="msg__card msg__compose" aria-label="Compose message">
            <p class="msg__to">
              <span class="msg__to-label">To</span>
              <strong translate="no">{{ name() }}</strong>
              <span class="msg__to-line" translate="no">{{ recipientLine() }}</span>
            </p>

            @if (error()) {
              <p class="msg__error" role="alert">
                <ar-icon name="alert" [size]="16" />
                <span>{{ error() }}</span>
              </p>
            }

            <div class="msg__group">
              <span class="ar-field__label" id="msg-via">Send via</span>
              <div class="msg__seg" role="radiogroup" aria-labelledby="msg-via">
                <button
                  type="button"
                  role="radio"
                  class="msg__seg-btn"
                  [class.msg__seg-btn--on]="channel === 0"
                  [attr.aria-checked]="channel === 0"
                  [disabled]="busy()"
                  (click)="setChannel(0)"
                >
                  <ar-icon name="inbox" [size]="16" /><span>WhatsApp</span>
                </button>
                @if (canChannels()) {
                  <button
                    type="button"
                    role="radio"
                    class="msg__seg-btn"
                    [class.msg__seg-btn--on]="channel === 1"
                    [attr.aria-checked]="channel === 1"
                    [disabled]="busy()"
                    (click)="setChannel(1)"
                  >
                    <ar-icon name="mail" [size]="16" /><span>Email</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    class="msg__seg-btn"
                    [class.msg__seg-btn--on]="channel === 2"
                    [attr.aria-checked]="channel === 2"
                    [disabled]="busy()"
                    (click)="setChannel(2)"
                  >
                    <ar-icon name="channel" [size]="16" /><span>SMS</span>
                  </button>
                }
              </div>
            </div>

            <div class="msg__grid">
              @if (channel === 0) {
                <label class="ar-field"
                  ><span class="ar-field__label">WhatsApp number</span>
                  <select
                    class="ar-field__input"
                    name="channelId"
                    [ngModel]="channelId"
                    (ngModelChange)="chooseChannel($event)"
                    [disabled]="busy()"
                  >
                    @for (c of channels(); track c.id) {
                      <option [value]="c.id" translate="no">
                        {{ c.displayName }} · {{ c.displayPhone }}
                      </option>
                    }
                  </select>
                </label>
              }
              @if (channel !== 1) {
                <label class="ar-field"
                  ><span class="ar-field__label">Approved template</span>
                  <select
                    class="ar-field__input"
                    name="templateId"
                    [ngModel]="templateId"
                    (ngModelChange)="chooseTemplate($event)"
                    [disabled]="busy() || templatesLoading()"
                  >
                    @if (channel === 0) {
                      <option value="">Free text (open WhatsApp conversation only)</option>
                    } @else {
                      <option value="">Choose an approved SMS template</option>
                    }
                    @for (t of templates(); track t.id) {
                      <option [value]="t.id" translate="no">{{ t.name }}</option>
                    }
                  </select>
                </label>
              }
              @if (channel === 1) {
                <label class="ar-field msg__wide"
                  ><span class="ar-field__label">Subject</span
                  ><input
                    class="ar-field__input"
                    name="subject"
                    maxlength="998"
                    [(ngModel)]="subject"
                    [disabled]="busy()"
                    translate="no"
                /></label>
              }
            </div>

            @if (channel !== 1 && selectedTemplate(); as t) {
              <div class="msg__tpl">
                <p class="msg__preview" translate="no">{{ t.text }}</p>
                @if (t.variables.length) {
                  <div class="msg__vars">
                    @for (key of t.variables; track key) {
                      <label class="ar-field"
                        ><span class="ar-field__label"
                          >Variable <span translate="no">{{ key }}</span></span
                        >
                        <input
                          class="ar-field__input"
                          [name]="'var-' + key"
                          [(ngModel)]="variables[key]"
                          [disabled]="busy() || (!!docKey() && documentVariable === key)"
                          translate="no"
                        />
                      </label>
                    }
                  </div>
                }
              </div>
            }

            @if (channel === 1 || (channel === 0 && !templateId)) {
              <label class="ar-field"
                ><span class="ar-field__label msg__label-row"
                  >Message
                  <span class="ar-field__opt" aria-hidden="true">{{ text.length }} / 4096</span></span
                ><textarea
                  class="ar-field__input msg__text"
                  name="text"
                  rows="6"
                  maxlength="4096"
                  [(ngModel)]="text"
                  [disabled]="busy()"
                  translate="no"
                ></textarea>
              </label>
            }

            <div class="msg__actions">
              <span class="msg__spacer"></span>
              <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="back()">
                Cancel
              </button>
              <button
                ar-button
                type="submit"
                variant="primary"
                icon="send"
                [disabled]="busy() || documentsLoading() || templatesLoading() || !canReply()"
              >
                {{ busy() ? 'Sending…' : 'Send message' }}
              </button>
            </div>
          </section>

          <!-- Side: who it goes to, what it will look like, what goes with it -->
          <aside class="msg__side" aria-label="Recipient, preview and attachment">
            <section class="msg__card msg__recipient">
              <ar-avatar [name]="name()" [size]="44" tone="teal" />
              <div class="msg__recipient-text">
                <strong class="msg__recipient-name" translate="no">{{ name() }}</strong>
                <span class="msg__recipient-line" translate="no">{{ recipientLine() }}</span>
              </div>
              <span class="msg__badge">{{ channelName() }}</span>
            </section>

            <section class="msg__card msg__previewcard" aria-label="Message preview">
              <h2 class="msg__h">Preview</h2>
              <div class="msg__bubble">
                @if (channel === 1 && subject.trim()) {
                  <strong class="msg__bubble-subject" translate="no">{{ subject }}</strong>
                }
                @if (previewText(); as p) {
                  <p class="msg__bubble-text" translate="no">{{ p }}</p>
                } @else {
                  <p class="msg__bubble-empty">
                    {{
                      channel !== 1 && templateId
                        ? 'The template text appears here.'
                        : 'Your message appears here as you type.'
                    }}
                  </p>
                }
                @if (selectedDoc(); as d) {
                  <span class="msg__bubble-doc">
                    <ar-icon name="attach" [size]="14" /><span translate="no">{{ d.number }}</span>
                  </span>
                }
              </div>
            </section>

            @if (channel !== 2) {
              <!-- Attach one sales document (not on SMS) -->
              <section class="msg__card">
                <fieldset class="docs" [disabled]="busy()">
                  <legend class="msg__h">
                    Attach a sales document <span class="ar-field__opt">optional</span>
                  </legend>
                  @if (selectedDoc(); as d) {
                    <div class="docs__chosen">
                      <span class="docs__type">{{ d.type }}</span>
                      <strong translate="no">{{ d.number }}</strong>
                      <span class="docs__meta">{{ d.date | date: 'dd MMM yyyy' }}</span>
                      @if (d.amountInPaise != null) {
                        <span class="docs__meta">₹{{ d.amountInPaise / 100 | number: '1.2-2' }}</span>
                      }
                      <span class="msg__spacer"></span>
                      <button ar-button type="button" variant="ghost" (click)="previewDocument()">
                        Preview
                      </button>
                      <button ar-button type="button" variant="ghost" (click)="docKey.set('')">
                        Remove
                      </button>
                    </div>
                    <p class="docs__how">{{ deliveryHint() }}</p>
                    @if (channel === 0 && templateId) {
                      <label class="ar-field"
                        ><span class="ar-field__label">Put the document link in</span>
                        <select
                          class="ar-field__input"
                          name="documentVariable"
                          [(ngModel)]="documentVariable"
                        >
                          <option value="">Choose a template variable</option>
                          @for (key of selectedTemplate()?.variables ?? []; track key) {
                            <option [value]="key" translate="no">Variable {{ key }}</option>
                          }
                        </select>
                      </label>
                    }
                  } @else if (documentsLoading()) {
                    <p class="docs__empty">Loading documents…</p>
                  } @else if (documents().length === 0) {
                    <p class="docs__empty">
                      No orders, challans, invoices or payment receipts for
                      <strong translate="no">{{ documentsOwner() }}</strong> yet.
                      @if (accountId()) {
                        <a [routerLink]="['/contacts/accounts', accountId(), '360']"
                          >Raise one on the account</a
                        >.
                      } @else {
                        They are raised on a company account:
                        <a [routerLink]="['/contacts', contactId(), 'edit']"
                          >link this contact to one</a
                        >.
                      }
                    </p>
                  } @else {
                    <input
                      class="ar-field__input"
                      type="search"
                      name="docQuery"
                      placeholder="Search by number"
                      aria-label="Search sales documents by number"
                      [ngModel]="docQuery()"
                      (ngModelChange)="docQuery.set($event)"
                    />
                    <div class="docs__list" aria-label="Sales documents">
                      @for (group of docGroups(); track group.type) {
                        <p class="docs__group">{{ group.type }}s</p>
                        @for (d of group.items; track d.key) {
                          <button type="button" class="docs__row" (click)="pickDocument(d.key)">
                            <strong translate="no">{{ d.number }}</strong>
                            <span class="docs__meta">{{ d.date | date: 'dd MMM yyyy' }}</span>
                            @if (d.amountInPaise != null) {
                              <span class="docs__meta"
                                >₹{{ d.amountInPaise / 100 | number: '1.2-2' }}</span
                              >
                            }
                            @if (d.buyer) {
                              <span class="docs__meta" translate="no">· {{ d.buyer }}</span>
                            }
                          </button>
                        }
                      } @empty {
                        <p class="docs__empty">Nothing matches “{{ docQuery() }}”.</p>
                      }
                    </div>
                  }
                </fieldset>
              </section>
            }
          </aside>
        </form>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    /* The page uses the whole width; the side column keeps a readable width and grows on big screens. */
    .msg {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 24px clamp(14px, 2.2vw, 40px) 40px;
      box-sizing: border-box;
    }
    .msg__state {
      margin: 0;
      color: var(--ar-ink-500);
    }
    .msg__state--error {
      color: var(--ar-red-600);
    }
    .msg__layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) clamp(320px, 28vw, 460px);
      gap: 20px;
      align-items: start;
      width: 100%;
    }
    .msg__side {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
      position: sticky;
      top: 0;
    }

    /* Cards keep a clear edge on every screen size and in both themes. */
    .msg__card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px 24px;
      background: var(--ar-white);
      background-image: var(--ar-card-sheen);
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      min-width: 0;
    }
    .msg__card p {
      margin: 0;
    }
    .msg__h {
      margin: 0;
      padding: 0;
      font: 700 11px var(--ar-font-sans);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ar-ink-500);
    }

    /* To */
    .msg__to {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      align-items: baseline;
      font-size: 14px;
      color: var(--ar-ink-700);
    }
    .msg__to-label {
      font: 700 11px var(--ar-font-sans);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ar-ink-500);
    }
    .msg__to-line {
      color: var(--ar-ink-500);
    }

    .msg__error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: var(--ar-radius-inset);
      background: var(--ar-red-100);
      border: 1px solid var(--ar-red-200);
      color: var(--ar-red-600);
      font-weight: 500;
    }

    /* Channel switch */
    .msg__group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .msg__seg {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 4px;
      width: fit-content;
      max-width: 100%;
      background: var(--ar-bg-100);
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-card);
    }
    .msg__seg-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      padding: 0 16px;
      border: 1px solid transparent;
      border-radius: var(--ar-radius-control);
      background: transparent;
      color: var(--ar-ink-700);
      font: 600 13px var(--ar-font-sans);
      cursor: pointer;
      transition:
        background var(--ar-ease),
        color var(--ar-ease);
    }
    .msg__seg-btn:hover:not(:disabled):not(.msg__seg-btn--on) {
      background: var(--ar-white);
    }
    .msg__seg-btn--on {
      background: var(--ar-primary);
      color: #fff;
      box-shadow: var(--ar-glow-primary);
    }
    .msg__seg-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Fields: as many columns as fit, never narrower than 260px. */
    .msg__grid,
    .msg__vars {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .msg__grid:empty {
      display: none;
    }
    .msg__wide {
      grid-column: 1 / -1;
    }
    .msg .ar-field__label {
      font-size: 12px;
    }
    .msg .ar-field__input {
      height: 40px;
      font-size: 14px;
    }
    .msg textarea.ar-field__input {
      height: auto;
      min-height: clamp(150px, 26vh, 320px);
      padding: 10px 12px;
      line-height: 1.5;
    }
    .msg__label-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .msg__tpl {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .msg__preview {
      white-space: pre-wrap;
      padding: 12px 14px;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-inset);
      color: var(--ar-ink-700);
    }

    /* Actions stay in reach on a long page and on a phone. */
    .msg__actions {
      position: sticky;
      bottom: 0;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin: 4px -24px -20px;
      padding: 14px 24px;
      background: var(--ar-white);
      border-top: 1px solid var(--ar-line-200);
      border-radius: 0 0 var(--ar-radius-card) var(--ar-radius-card);
    }
    .msg__spacer {
      flex: 1;
    }

    /* Recipient */
    .msg__recipient {
      flex-direction: row;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
    }
    .msg__recipient-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    .msg__recipient-name {
      font-size: 15px;
      color: var(--ar-ink-900);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .msg__recipient-line {
      font-size: 13px;
      color: var(--ar-ink-500);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .msg__badge {
      flex: none;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--ar-blue-100);
      border: 1px solid var(--ar-blue-200);
      color: var(--ar-blue-700);
      font: 600 11.5px var(--ar-font-sans);
    }

    /* Preview */
    .msg__bubble {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 14px;
      background: var(--ar-blue-100);
      border: 1px solid var(--ar-blue-200);
      border-radius: 4px var(--ar-radius-card) var(--ar-radius-card) var(--ar-radius-card);
      color: var(--ar-ink-900);
      min-height: 64px;
    }
    .msg__bubble-text {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 13.5px;
      line-height: 1.5;
    }
    .msg__bubble-empty {
      font-size: 13px;
      color: var(--ar-ink-500);
    }
    .msg__bubble-subject {
      font-size: 13.5px;
    }
    .msg__bubble-doc {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      align-self: flex-start;
      padding: 3px 9px;
      border-radius: var(--ar-radius-chip);
      background: var(--ar-white);
      border: 1px solid var(--ar-line-300);
      font-size: 12px;
      color: var(--ar-ink-700);
    }

    /* Documents */
    .docs {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .docs__chosen {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border: 1px solid var(--ar-blue-600);
      border-radius: var(--ar-radius-inset);
      background: var(--ar-blue-100);
    }
    .docs__type,
    .docs__group {
      font: 700 11px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .docs__group {
      margin: 8px 0 0;
    }
    .docs__meta {
      font-size: 12.5px;
      color: var(--ar-ink-500);
    }
    .docs__how,
    .docs__empty {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--ar-ink-500);
    }
    .docs__list {
      max-height: clamp(14rem, 36vh, 26rem);
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-inset);
      background: var(--ar-bg-50);
      padding: 4px 8px 8px;
    }
    .docs__row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      align-items: baseline;
      padding: 8px 10px;
      border: 0;
      border-radius: var(--ar-radius-chip);
      background: none;
      text-align: left;
      cursor: pointer;
      font: inherit;
      color: var(--ar-ink-900);
    }
    .docs__row:hover,
    .docs__row:focus-visible {
      background: var(--ar-blue-100);
      outline: none;
    }
    .docs__row:focus-visible {
      box-shadow: var(--ar-focus-ring);
    }

    /* Laptops and tablets: one column, the compose card first, then the side cards in two columns. */
    @media (max-width: 1100px) {
      .msg__layout {
        grid-template-columns: minmax(0, 1fr);
      }
      .msg__side {
        position: static;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: start;
      }
      .msg__recipient {
        display: none;
      }
    }

    /* Phones */
    @media (max-width: 700px) {
      .msg {
        padding: 14px 12px 28px;
      }
      .msg__side {
        grid-template-columns: minmax(0, 1fr);
      }
      .msg__card {
        padding: 16px;
      }
      .msg__actions {
        margin: 4px -16px -16px;
        padding: 12px 16px;
      }
      .msg__actions > :not(.msg__spacer) {
        flex: 1;
      }
      .msg__seg {
        width: 100%;
      }
      .msg__seg-btn {
        flex: 1;
        justify-content: center;
        padding: 0 10px;
      }
      .msg__grid,
      .msg__vars {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    /* Large and extra-large monitors */
    @media (min-width: 1600px) {
      .msg {
        padding-top: 28px;
      }
      .msg__layout {
        gap: 24px;
      }
      .msg__card {
        padding: 24px 28px;
      }
      .msg__actions {
        margin: 4px -28px -24px;
        padding: 16px 28px;
      }
      .msg .ar-field__input {
        height: 42px;
        font-size: 14.5px;
      }
      .msg__to {
        font-size: 15px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .msg__seg-btn {
        transition: none;
      }
    }
    @media (forced-colors: active) {
      .msg__card,
      .msg__seg,
      .msg__bubble {
        border: 1px solid CanvasText;
      }
      .msg__seg-btn--on {
        outline: 2px solid Highlight;
      }
    }
  `,
})
export class ArCustomerMessage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly cockpitOrigin = inject(CockpitOriginService);
  private readonly permissions = inject(PermissionService);
  private readonly contacts = inject(ContactService);
  private readonly accounts = inject(CustomerAccountService);
  private readonly communication = inject(CustomerCommunicationService);
  private readonly orderApi = inject(SalesOrderService);
  private readonly challanApi = inject(DeliveryChallanService);
  private readonly invoiceApi = inject(SalesInvoiceService);
  private readonly smsApi = inject(SmsChannelService);
  private readonly templateApi = inject(TemplateService);

  protected readonly canReply = grantedPolicy('AutoReach.Inbox.Reply', this.permissions);
  protected readonly canChannels = grantedPolicy('AutoReach.Channels', this.permissions);
  private readonly canReadOrders = grantedPolicy('AutoReach.SalesOrders', this.permissions);
  private readonly canReadChallans = grantedPolicy('AutoReach.DeliveryChallans', this.permissions);
  private readonly canReadInvoices = grantedPolicy('AutoReach.SalesInvoices', this.permissions);
  protected readonly channels = inject(ChannelService).channels;

  protected readonly contactId = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly documentsLoading = signal(false);
  protected readonly templatesLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly documents = signal<DocumentChoice[]>([]);
  protected readonly accountId = signal<string | null>(null);
  private readonly accountName = signal<string | null>(null);
  /** The chosen document's key ("i:<id>", "p:<payment id>", …), or ''. */
  protected readonly docKey = signal('');
  protected readonly docQuery = signal('');
  protected readonly selectedDoc = computed(
    () => this.documents().find((d) => d.key === this.docKey()) ?? null,
  );
  /** Whose documents are listed: the company's when the contact is on an account. */
  protected readonly documentsOwner = computed(() => this.accountName() || this.name());
  protected readonly docGroups = computed(() => {
    const q = this.docQuery().trim().toLowerCase();
    const shown = this.documents().filter((d) => !q || d.number.toLowerCase().includes(q));
    return DOC_ORDER.map((type) => ({ type, items: shown.filter((d) => d.type === type) })).filter(
      (g) => g.items.length > 0,
    );
  });
  /** A document the link asked for (?document=i:<id>), chosen once the list has loaded. */
  private requestedDoc = inject(ActivatedRoute).snapshot.queryParamMap.get('document');
  protected readonly templates = signal<MessageTemplate[]>([]);
  protected readonly selectedTemplate = signal<MessageTemplate | null>(null);

  protected channel = 0;
  protected channelId = '';
  protected templateId = '';
  protected documentVariable = '';
  protected subject = '';
  protected text = '';
  protected variables: Record<string, string> = {};
  private templateSequence = 0;

  /** How the chosen document reaches the customer on the channel picked. */
  protected deliveryHint(): string {
    if (this.channel === 1) return 'Attached to the email as a PDF.';
    if (this.templateId)
      return "Sent as a secure link in one of the template's variables; the link expires in 24 hours.";
    return 'Sent as a PDF in the WhatsApp chat. Free messages only reach a customer who wrote to you in the last 24 hours; outside that window, pick an approved template.';
  }

  /** Who the message goes to, on the channel picked: the email address, or the phone number. */
  protected recipientLine(): string {
    return this.channel === 1 ? this.email() || 'no email address' : this.phone();
  }

  protected channelName(): string {
    return ['WhatsApp', 'Email', 'SMS'][this.channel] ?? 'Message';
  }

  /** What the customer will read: the template with the typed values in place, or the free text. */
  protected previewText(): string {
    const t = this.selectedTemplate();
    if (this.channel !== 1 && t) {
      return t.text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) =>
        key === this.documentVariable && this.selectedDoc()
          ? '[document link]'
          : (this.variables[key] ?? '').trim() || whole,
      );
    }
    return this.text.trim();
  }

  protected pickDocument(key: string): void {
    this.docKey.set(key);
    this.documentVariable = '';
  }

  /** Where Cancel and a sent message return: the Customer 360 this was opened from, or the contact's own. */
  private readonly returnUrl = computed(() => {
    const origin = this.cockpitOrigin.origin();
    const here = pathOf(this.router.url);
    return origin && origin.targetPath === here
      ? origin.cockpitUrl
      : `/contacts/${this.route.snapshot.paramMap.get('id')}/360`;
  });

  constructor() {
    void this.load(this.route.snapshot.paramMap.get('id'));
    // The workspace's numbers may arrive after the page: pick the first then, and its templates.
    effect(() => {
      const first = this.channels()[0]?.id;
      if (first && !this.channelId && this.contactId()) this.chooseChannel(first);
    });
  }

  private async load(id: string | null): Promise<void> {
    if (!id) {
      this.loading.set(false);
      return;
    }
    try {
      const contact = await firstValueFrom(this.contacts.get(id));
      this.contactId.set(id);
      this.name.set(contact.displayName || contact.companyName || contact.waId || 'Customer');
      this.phone.set(contact.waId ? '+' + contact.waId : '');
      this.email.set(contact.emailAddress ?? '');
      this.accountId.set(contact.accountId ?? null);
      if (contact.accountId) {
        this.accounts
          .get(contact.accountId)
          .subscribe({ next: (a) => this.accountName.set(a.name ?? null), error: () => undefined });
      }
      this.channelId = this.channels()[0]?.id ?? '';
      void this.loadTemplates();
      void this.loadDocuments(id, contact.accountId ?? null);
    } catch (e) {
      this.error.set(readApiError(e, 'This customer could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected back(): void {
    void this.router.navigateByUrl(this.returnUrl());
  }

  protected setChannel(value: number): void {
    this.channel = value;
    // SMS carries no document.
    if (value === 2) this.docKey.set('');
    void this.loadTemplates();
  }

  protected chooseChannel(value: string): void {
    this.channelId = value;
    void this.loadTemplates();
  }

  protected chooseTemplate(value: string): void {
    this.templateId = value;
    this.documentVariable = '';
    this.selectedTemplate.set(this.templates().find((t) => t.id === value) ?? null);
    this.variables = Object.fromEntries(
      (this.selectedTemplate()?.variables ?? []).map((k) => [k, '']),
    );
  }

  private async loadTemplates(): Promise<void> {
    const sequence = ++this.templateSequence;
    this.chooseTemplate('');
    this.templates.set([]);
    this.templatesLoading.set(false);
    if (this.channel === 1 || (this.channel === 0 && !this.channelId)) return;
    this.templatesLoading.set(true);
    try {
      const list: MessageTemplate[] =
        this.channel === 2
          ? (await firstValueFrom(this.smsApi.getTemplates()))
            .filter((t) => t.status === SmsTemplateStatus.Approved)
            .map((t) => ({ id: t.id, name: t.name, text: t.content, variables: t.variableNames }))
          : ((
            await firstValueFrom(
              this.templateApi.getList({
                channelId: this.channelId,
                status: TemplateStatus.Approved,
                maxResultCount: 200,
              }),
            )
          ).items?.map((t) => ({
            id: t.id!,
            name: t.name ?? '',
            text: t.components?.map((c) => c.text ?? '').join('\n') ?? '',
            variables: Array.from(
              { length: t.components?.find((c) => c.kind === 1)?.variableCount ?? 0 },
              (_, i) => String(i + 1),
            ),
          })) ?? []);
      if (sequence === this.templateSequence) this.templates.set(list);
    } catch (e) {
      if (sequence === this.templateSequence)
        this.error.set(readApiError(e, 'Templates could not be loaded.'));
    } finally {
      if (sequence === this.templateSequence) this.templatesLoading.set(false);
    }
  }

  /**
   * The orders, challans, invoices and payment receipts that can go with the message: the company's when the contact is on an
   * account (any colleague's, as the API allows), otherwise the contact's own. Newest first.
   */
  private async loadDocuments(contactId: string, accountId: string | null): Promise<void> {
    this.documentsLoading.set(true);
    try {
      const filter = accountId
        ? { customerAccountId: accountId, maxResultCount: 1000 }
        : { customerId: contactId, maxResultCount: 1000 };
      const [orders, challans, invoices] = await Promise.all([
        this.canReadOrders() ? firstValueFrom(this.orderApi.getList(filter)) : null,
        this.canReadChallans() ? firstValueFrom(this.challanApi.getList(filter)) : null,
        this.canReadInvoices() ? firstValueFrom(this.invoiceApi.getList(filter)) : null,
      ]);
      const buyer = (customerId: string, customerName: string) =>
        customerId === contactId ? undefined : customerName;
      const list: DocumentChoice[] = [
        ...(invoices?.items ?? []).flatMap((i) => [
          {
            kind: 2,
            recordId: i.id!,
            key: 'i:' + i.id,
            type: 'Invoice',
            number: i.invoiceNumber,
            date: i.issueDateUtc,
            amountInPaise: i.grandTotalInPaise,
            buyer: buyer(i.customerId, i.customerName),
          },
          ...i.payments.map((p) => ({
            kind: 3,
            recordId: i.id!,
            paymentId: p.id!,
            key: 'p:' + p.id,
            type: 'Payment receipt',
            number: `${i.invoiceNumber} · ${p.referenceNumber || 'receipt'}`,
            date: p.paymentDateUtc,
            amountInPaise: p.amountInPaise,
            buyer: buyer(i.customerId, i.customerName),
          })),
        ]),
        ...(orders?.items ?? []).map((o) => ({
          kind: 0,
          recordId: o.id!,
          key: 'o:' + o.id,
          type: 'Sales order',
          number: o.orderNumber,
          date: o.orderDateUtc,
          amountInPaise: o.grandTotalInPaise,
          buyer: buyer(o.customerId, o.customerName),
        })),
        ...(challans?.items ?? []).map((c) => ({
          kind: 1,
          recordId: c.id!,
          key: 'c:' + c.id,
          type: 'Delivery challan',
          number: c.challanNumber,
          date: c.challanDateUtc,
          buyer: buyer(c.customerId, c.customerName),
        })),
      ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
      this.documents.set(list);
      if (this.requestedDoc && list.some((d) => d.key === this.requestedDoc)) {
        this.docKey.set(this.requestedDoc);
      }
      this.requestedDoc = null;
    } catch (e) {
      this.error.set(readApiError(e, 'Customer documents could not be loaded.'));
    } finally {
      this.documentsLoading.set(false);
    }
  }

  /** What the API takes for a document: its kind and record, nothing the picker shows. */
  private toInput(d: DocumentChoice | null): CustomerDocumentInput | undefined {
    return d ? { kind: d.kind, recordId: d.recordId, paymentId: d.paymentId } : undefined;
  }

  protected async previewDocument(): Promise<void> {
    const chosen = this.selectedDoc();
    const document = this.toInput(chosen);
    const contactId = this.contactId();
    if (!chosen || !document || !contactId || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const blob = await firstValueFrom(this.communication.getDocument(contactId, document));
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = chosen.number.replace(/[^\p{L}\p{N}_.-]/gu, '_') + '.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.error.set(readApiError(e, 'The document could not be loaded.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async send(): Promise<void> {
    const contactId = this.contactId();
    if (!contactId || this.busy()) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      const document = this.channel === 2 ? undefined : this.toInput(this.selectedDoc());
      if (
        (this.channel === 1 && (!this.subject.trim() || !this.text.trim() || !this.email())) ||
        (this.channel === 0 &&
          (!this.channelId || (!this.templateId && !this.text.trim() && !document))) ||
        (this.channel === 2 && !this.templateId)
      )
        throw new Error('Complete the message details before sending.');
      if (document && this.templateId && !this.documentVariable)
        throw new Error('Choose the template variable for the document link.');
      const variables = { ...this.variables };
      if (document && this.documentVariable) variables[this.documentVariable] = 'document-link';
      if (Object.values(variables).some((v) => !v.trim()))
        throw new Error('Fill every template variable before sending.');
      await firstValueFrom(
        this.communication.send({
          contactId,
          channel: this.channel,
          channelId: this.channel === 0 ? this.channelId : undefined,
          templateId: this.channel !== 1 ? this.templateId || undefined : undefined,
          subject: this.subject,
          text: this.text,
          variables,
          document,
          documentVariable: this.documentVariable || undefined,
        }),
      );
      this.toasts.success(
        this.channel === 0
          ? 'Message queued. Check the inbox for delivery status.'
          : 'Message sent.',
        'Message customer',
      );
      this.back();
    } catch (e) {
      this.error.set(readApiError(e, 'The message could not be sent.'));
    } finally {
      this.busy.set(false);
    }
  }
}
