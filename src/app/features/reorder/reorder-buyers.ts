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
import { firstValueFrom } from 'rxjs';
import { AccountStore } from '../../core/services/account.store';
import {
  CustomerCreditDto,
  ReorderBuyerDto,
  ReorderBuyerRole,
  ReorderPortalService,
} from '../../proxy/reorder/reorder-portal.service';
import { ArButton, ArIcon } from '../../ui';
import { parseDays, parseRupees, rupees } from './reorder-logic';

/** The credit form as typed: rupees and days stay text until saved. */
interface CreditForm {
  limit: string;
  terms: string;
  overdue: string;
  onHold: boolean;
  reason: string;
}

/**
 * Enterprise Cockpit for managing customer company buyers, ordering permissions,
 * and commercial credit & payment terms.
 */
@Component({
  selector: 'ar-reorder-buyers',
  imports: [ArButton, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      animation: bcFadeIn 0.25s ease-out;
    }

    @keyframes bcFadeIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .bc-shell {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Enterprise Cards */
    .bc-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .bc-card:hover {
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
    }

    .bc-card__header {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
    }

    .bc-card__icon-box {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #eff6ff;
      color: #2563eb;
    }

    .bc-card__icon-box--buyers {
      background: #f0fdfa;
      color: #0d9488;
    }

    .bc-card__icon-box--credit {
      background: #f5f3ff;
      color: #8b5cf6;
    }

    .bc-card__titles {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .bc-card__title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .bc-card__desc {
      margin: 0;
      font-size: 0.82rem;
      color: #64748b;
      line-height: 1.45;
    }

    /* Form Fields & Controls */
    .bc-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .bc-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #0f172a;
    }

    .bc-subtext {
      font-size: 0.75rem;
      color: #64748b;
    }

    .bc-select,
    .bc-input {
      height: 40px;
      padding: 0 0.85rem;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font-size: 0.875rem;
      font-family: inherit;
      transition: all 0.15s ease;
      width: 100%;
      outline: none;
    }

    .bc-select:focus,
    .bc-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .bc-select:hover:not(:focus),
    .bc-input:hover:not(:focus) {
      border-color: #94a3b8;
    }

    /* Company Selection Pill */
    .bc-selected-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      font-size: 0.82rem;
      color: #1e40af;
      flex-wrap: wrap;
    }

    .bc-selected-banner strong {
      color: #1e3a8a;
    }

    .bc-badge-count {
      margin-left: auto;
      font-size: 0.75rem;
      font-weight: 600;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 2px 8px;
      border-radius: 12px;
    }

    /* Buyers List */
    .bc-buyers-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .bc-buyer-card {
      display: grid;
      grid-template-columns: minmax(220px, 1.5fr) minmax(180px, 1fr) minmax(140px, 0.8fr) auto;
      gap: 1rem;
      align-items: center;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      transition: all 0.15s ease;
    }

    .bc-buyer-card:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .bc-buyer-who {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .bc-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
    }

    .bc-buyer-meta {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .bc-buyer-name {
      font-weight: 600;
      color: #0f172a;
      font-size: 0.9rem;
      line-height: 1.2;
    }

    .bc-buyer-phone {
      font-size: 0.78rem;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-family: var(--ar-font-mono, monospace);
    }

    .bc-buyer-pwd {
      font-size: 0.72rem;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 2px;
    }

    .bc-btn-remove-pwd {
      background: transparent;
      border: none;
      color: #dc2626;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .bc-btn-remove-pwd:hover {
      text-decoration: underline;
    }

    .bc-role-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .bc-role-hint {
      font-size: 0.72rem;
      color: #64748b;
    }

    /* KPI Snapshot Strip */
    .bc-kpi-ribbon {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.85rem 1rem;
    }

    .bc-kpi-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .bc-kpi-lbl {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }

    .bc-kpi-val {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      font-family: var(--ar-font-mono, monospace);
    }

    .bc-kpi-val--warn {
      color: #d97706;
    }

    .bc-kpi-val--bad {
      color: #dc2626;
    }

    /* 3-Column Responsive Grid */
    .bc-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }

    @media (max-width: 820px) {
      .bc-grid-3 {
        grid-template-columns: 1fr;
      }
      .bc-buyer-card {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
    }

    /* Modern Toggle Control */
    .bc-toggle-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.15rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.2s ease;
    }

    .bc-toggle-box--active {
      background: #fffbeb;
      border-color: #fde68a;
    }

    .bc-toggle-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
    }

    /* Custom Switch */
    .bc-switch {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .bc-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .bc-switch__slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: 0.25s;
      border-radius: 24px;
    }

    .bc-switch__slider:before {
      position: absolute;
      content: '';
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.25s;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .bc-switch input:checked + .bc-switch__slider {
      background-color: #f59e0b;
    }

    .bc-switch input:checked + .bc-switch__slider:before {
      transform: translateX(20px);
    }

    .bc-toggle-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .bc-toggle-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0f172a;
    }

    .bc-toggle-desc {
      font-size: 0.78rem;
      color: #64748b;
    }

    .bc-toggle-box--active .bc-toggle-desc {
      color: #b45309;
    }

    /* Informational Callout Card */
    .bc-info-card {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      padding: 1rem 1.25rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      font-size: 0.82rem;
      color: #1e40af;
      line-height: 1.5;
    }

    .bc-info-card__icon {
      color: #2563eb;
      margin-top: 2px;
      flex-shrink: 0;
    }

    /* Alerts */
    .bc-alert-warn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      color: #92400e;
      font-size: 0.8125rem;
    }

    .bc-alert-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 0.85rem;
    }

    /* Action Footer */
    .bc-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      gap: 1rem;
      flex-wrap: wrap;
    }

    .bc-footer-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .bc-saved-pill {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #059669;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #ecfdf5;
      padding: 4px 10px;
      border-radius: 12px;
    }

    /* Empty States */
    .bc-state-empty,
    .bc-state-loading {
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.85rem;
    }

    @keyframes bcSpin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .bc-spin {
      animation: bcSpin 1s linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      :host,
      .bc-card,
      .bc-buyer-card,
      .bc-switch__slider,
      .bc-switch__slider:before {
        animation: none !important;
        transition: none !important;
      }
    }
  `,
  template: `
    <div class="bc-shell">
      <!-- 1. Company Selection Card -->
      <section class="bc-card">
        <div class="bc-card__header">
          <div class="bc-card__icon-box">
            <ar-icon name="accounts" [size]="18" />
          </div>
          <div class="bc-card__titles">
            <h2 class="bc-card__title">Customer Company</h2>
            <p class="bc-card__desc">
              Everyone at the same account shares access to the company's equipment, re-order
              catalog and requests.
            </p>
          </div>
        </div>

        <div class="bc-field">
          <label class="bc-label" for="rb-account">Company Account *</label>
          <select
            required
            id="rb-account"
            class="bc-select"
            [value]="accountId()"
            (change)="choose($any($event.target).value)"
          >
            <option value="">Choose a company account…</option>
            @for (row of accounts.rows(); track row.account.id) {
              <option [value]="row.account.id" [selected]="row.account.id === accountId()">
                {{ ' '.repeat(row.depth - 1) }}{{ row.account.name }}
              </option>
            }
          </select>
        </div>

        @if (selectedAccount(); as acc) {
          <div class="bc-selected-banner">
            <ar-icon name="accounts" [size]="15" />
            <span>Selected account: <strong>{{ acc.name }}</strong></span>
            @if (acc.city) {
              <span>· {{ acc.city }}{{ acc.state ? ', ' + acc.state : '' }}</span>
            }
            @if (acc.industry) {
              <span>· {{ acc.industry }}</span>
            }
            <span class="bc-badge-count">
              {{ buyers().length }} buyer contact{{ buyers().length === 1 ? '' : 's' }}
            </span>
          </div>
        }
      </section>

      <!-- 2. Buyer Contact Management Card -->
      <section class="bc-card">
        <div class="bc-card__header">
          <div class="bc-card__icon-box bc-card__icon-box--buyers">
            <ar-icon name="contacts" [size]="18" />
          </div>
          <div class="bc-card__titles">
            <h2 class="bc-card__title">Buyer Contact Management</h2>
            <p class="bc-card__desc">
              Configure portal access, ordering roles and purchasing approval thresholds for each
              contact.
            </p>
          </div>
        </div>

        @if (loading()) {
          <div class="bc-state-loading">
            <ar-icon name="refresh" [size]="22" class="bc-spin text-primary" />
            <span>Loading company buyers and permissions…</span>
          </div>
        } @else if (!accountId()) {
          <div class="bc-state-empty">
            <ar-icon name="accounts" [size]="28" />
            <p>Select a customer company above to view and manage its authorized buyers.</p>
          </div>
        } @else if (buyers().length === 0) {
          <div class="bc-state-empty">
            <ar-icon name="contacts" [size]="28" />
            <p>
              No contacts registered under this account yet. Contacts added to this company will
              appear here.
            </p>
          </div>
        } @else {
          <div class="bc-buyers-list">
            @for (b of buyers(); track b.contactId) {
              <div class="bc-buyer-card">
                <!-- Buyer Identification -->
                <div class="bc-buyer-who">
                  <div class="bc-avatar" aria-hidden="true">
                    {{ getInitials(b.name) }}
                  </div>
                  <div class="bc-buyer-meta">
                    <span class="bc-buyer-name" translate="no">{{ b.name }}</span>
                    @if (b.waId) {
                      <span class="bc-buyer-phone">
                        <ar-icon name="phone" [size]="11" /> +{{ b.waId }}
                      </span>
                    }
                    @if (b.hasPassword) {
                      <span class="bc-buyer-pwd">
                        Signs in with password ·
                        <button
                          type="button"
                          class="bc-btn-remove-pwd"
                          (click)="clearPassword(b)"
                          title="Remove portal password"
                        >
                          <ar-icon name="trash" [size]="11" /> Remove
                        </button>
                      </span>
                    }
                  </div>
                </div>

                <!-- Buyer Role -->
                <div class="bc-role-wrap">
                  <label class="bc-label" [for]="'rb-role-' + b.contactId">Buyer Role *</label>
                  <select
                    required
                    class="bc-select"
                    [id]="'rb-role-' + b.contactId"
                    [value]="b.role"
                    (change)="edit(b.contactId, { role: $any($event.target).value })"
                  >
                    <option value="Orders">Orders directly</option>
                    <option value="NeedsApproval">Needs approval</option>
                    <option value="Approver">Approver</option>
                  </select>
                  <span class="bc-role-hint">
                    @if (b.role === 'Orders') {
                      Can place re-orders directly.
                    } @else if (b.role === 'NeedsApproval') {
                      Requires manager approval before order.
                    } @else {
                      Authorizes orders for the company.
                    }
                  </span>
                </div>

                <!-- Approval Threshold (Conditional) -->
                <div>
                  @if (b.role === 'NeedsApproval') {
                    <label class="bc-label" [for]="'rb-limit-' + b.contactId">
                      Approval Above ₹ <span class="bc-subtext">(blank: always)</span>
                    </label>
                    <input
                      class="bc-input"
                      inputmode="numeric"
                      placeholder="e.g. 25000"
                      [id]="'rb-limit-' + b.contactId"
                      [value]="b.approvalAboveInPaise ? b.approvalAboveInPaise / 100 : ''"
                      (change)="edit(b.contactId, { limit: $any($event.target).value })"
                    />
                  }
                </div>

                <!-- Save Action -->
                <div>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="saving() === b.contactId"
                    (click)="save(b)"
                  >
                    @if (saving() === b.contactId) {
                      <ar-icon name="refresh" [size]="13" class="bc-spin" /> Saving…
                    } @else if (saved() === b.contactId) {
                      <ar-icon name="check" [size]="13" /> Saved
                    } @else {
                      Save
                    }
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- 3. Credit & Payment Terms Card -->
      @if (credit(); as c) {
        <section class="bc-card">
          <div class="bc-card__header">
            <div class="bc-card__icon-box bc-card__icon-box--credit">
              <ar-icon name="billing" [size]="18" />
            </div>
            <div class="bc-card__titles">
              <h2 class="bc-card__title">Credit & Payment Terms</h2>
              <p class="bc-card__desc">
                Configure commercial credit ceilings, invoicing payment days and automatic review
                triggers.
              </p>
            </div>
          </div>

          <!-- Commercial KPI Snapshot Ribbon -->
          <div class="bc-kpi-ribbon">
            <div class="bc-kpi-item">
              <span class="bc-kpi-lbl">Current Outstanding (ERP)</span>
              <span class="bc-kpi-val" [class.bc-kpi-val--warn]="c.owedInPaise > 0">
                {{ money(c.owedInPaise) }}
              </span>
            </div>
            <div class="bc-kpi-item">
              <span class="bc-kpi-lbl">Active on Order</span>
              <span class="bc-kpi-val">{{ money(c.onOrderInPaise) }}</span>
            </div>
            @if (c.availableInPaise != null) {
              <div class="bc-kpi-item">
                <span class="bc-kpi-lbl">Available Credit</span>
                <span class="bc-kpi-val text-primary">{{ money(c.availableInPaise) }}</span>
              </div>
            }
            @if (c.overdueDays > 0) {
              <div class="bc-kpi-item">
                <span class="bc-kpi-lbl">Oldest Overdue</span>
                <span class="bc-kpi-val bc-kpi-val--bad">{{ c.overdueDays }} days</span>
              </div>
            }
          </div>

          <!-- Problems / Warning alerts from ERP -->
          @for (p of c.problems; track p) {
            <div class="bc-alert-warn">
              <ar-icon name="alert" [size]="15" />
              <span>{{ p }}</span>
            </div>
          }

          <!-- 3-Column Responsive Inputs -->
          <div class="bc-grid-3">
            <div class="bc-field">
              <label class="bc-label" for="rb-limit">Credit Limit (₹)</label>
              <input
                id="rb-limit"
                class="bc-input"
                inputmode="numeric"
                placeholder="e.g. 500000 (blank: none)"
                [value]="creditForm().limit"
                (input)="patchCredit({ limit: $any($event.target).value })"
              />
              <span class="bc-subtext">Maximum permissible credit before review.</span>
            </div>

            <div class="bc-field">
              <label class="bc-label" for="rb-terms">Payment Terms (Days)</label>
              <input
                id="rb-terms"
                class="bc-input"
                inputmode="numeric"
                placeholder="e.g. 30 (blank: advance)"
                [value]="creditForm().terms"
                (input)="patchCredit({ terms: $any($event.target).value })"
              />
              <span class="bc-subtext">Credit days granted per invoice (blank for advance).</span>
            </div>

            <div class="bc-field">
              <label class="bc-label" for="rb-overdue">Flag Orders When Overdue By (Days)</label>
              <input
                id="rb-overdue"
                class="bc-input"
                inputmode="numeric"
                placeholder="e.g. 15 (blank: never)"
                [value]="creditForm().overdue"
                (input)="patchCredit({ overdue: $any($event.target).value })"
              />
              <span class="bc-subtext">Days past due date before orders require review.</span>
            </div>
          </div>

          <!-- Order Approval Toggle Control -->
          <div class="bc-toggle-box" [class.bc-toggle-box--active]="creditForm().onHold">
            <label class="bc-toggle-header" for="rb-hold">
              <div class="bc-switch">
                <input
                  id="rb-hold"
                  type="checkbox"
                  [checked]="creditForm().onHold"
                  (change)="patchCredit({ onHold: $any($event.target).checked })"
                />
                <span class="bc-switch__slider"></span>
              </div>
              <div class="bc-toggle-text">
                <span class="bc-toggle-title">Require manual order review</span>
                <span class="bc-toggle-desc">
                  Flag every new order from this customer company for review before processing.
                </span>
              </div>
            </label>

            @if (creditForm().onHold) {
              <div class="bc-field">
                <label class="bc-label" for="rb-hold-reason">
                  Review Reason <span class="bc-subtext">(internal staff only, optional)</span>
                </label>
                <input
                  id="rb-hold-reason"
                  class="bc-input"
                  maxlength="256"
                  placeholder="e.g. Payment overdue investigation or credit review pending"
                  [value]="creditForm().reason"
                  (input)="patchCredit({ reason: $any($event.target).value })"
                />
              </div>
            }
          </div>

          <!-- Informational Callout -->
          <div class="bc-info-card">
            <ar-icon name="help" [size]="18" class="bc-info-card__icon" />
            <div>
              <strong>How credit policies are enforced:</strong> Orders placed outside these
              configured terms still reach your workspace, flagged with the specific reason. The
              customer is politely informed that your team will follow up. Orders paid up front or
              via advance payment are never held.
            </div>
          </div>
        </section>
      }

      <!-- Error feedback -->
      @if (error(); as e) {
        <div class="bc-alert-error" role="alert">
          <ar-icon name="alert" [size]="16" />
          <span>{{ e }}</span>
        </div>
      }

      <!-- 4. Action Footer -->
      <footer class="bc-footer">
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">
          Cancel
        </button>

        <div class="bc-footer-right">
          @if (creditSaved()) {
            <span class="bc-saved-pill">
              <ar-icon name="check" [size]="14" /> Terms saved successfully
            </span>
          }
          @if (credit()) {
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="savingCredit()"
              (click)="saveCredit()"
            >
              @if (savingCredit()) {
                <ar-icon name="refresh" [size]="14" class="bc-spin" /> Saving terms…
              } @else {
                Save terms
              }
            </button>
          }
          <button ar-button type="button" variant="ghost" (click)="closed.emit()">
            Done
          </button>
        </div>
      </footer>
    </div>
  `,
})
export class ArReorderBuyers implements OnInit {
  private readonly api = inject(ReorderPortalService);
  protected readonly accounts = inject(AccountStore);

  readonly closed = output<void>();
  /** Opens on this company when given (from its row on the Accounts screen). */
  readonly initialAccountId = input<string | null>(null);

  protected readonly accountId = signal('');

  protected readonly selectedAccount = computed(() => {
    const id = this.accountId();
    if (!id) return null;
    return this.accounts.rows().find((r) => r.account.id === id)?.account ?? null;
  });

  ngOnInit(): void {
    const id = this.initialAccountId();
    if (id) void this.choose(id);
  }

  protected readonly buyers = signal<ReorderBuyerDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  private readonly limits = new Map<string, string>();

  protected readonly credit = signal<CustomerCreditDto | null>(null);
  protected readonly creditForm = signal<CreditForm>({
    limit: '',
    terms: '',
    overdue: '',
    onHold: false,
    reason: '',
  });
  protected readonly savingCredit = signal(false);
  protected readonly creditSaved = signal(false);

  protected getInitials(name: string): string {
    if (!name) return 'B';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  protected money(paise: number): string {
    return rupees(paise);
  }

  protected patchCredit(p: Partial<CreditForm>): void {
    this.creditForm.update((f) => ({ ...f, ...p }));
    this.creditSaved.set(false);
  }

  private showCredit(c: CustomerCreditDto): void {
    this.credit.set(c);
    this.creditForm.set({
      limit: c.creditLimitInPaise != null ? String(c.creditLimitInPaise / 100) : '',
      terms: c.paymentTermsDays != null ? String(c.paymentTermsDays) : '',
      overdue: c.holdWhenOverdueDays != null ? String(c.holdWhenOverdueDays) : '',
      onHold: c.onHold,
      reason: c.holdReason ?? '',
    });
  }

  protected async saveCredit(): Promise<void> {
    const f = this.creditForm();
    const limit = parseRupees(f.limit);
    const terms = parseDays(f.terms);
    const overdue = parseDays(f.overdue);
    if (limit === undefined || terms === undefined || overdue === undefined) {
      this.error.set(
        'Enter the limit in rupees and the days as whole numbers up to 365, or leave them blank.',
      );
      return;
    }
    this.error.set(null);
    this.savingCredit.set(true);
    try {
      const input = {
        customerId: this.accountId(),
        creditLimitInPaise: limit,
        paymentTermsDays: terms,
        holdWhenOverdueDays: overdue,
        onHold: f.onHold,
        holdReason: f.onHold ? f.reason.trim() || null : null,
      };
      this.showCredit(await firstValueFrom(this.api.setCredit(input)));
      this.creditSaved.set(true);
    } catch {
      this.error.set("The terms couldn't be saved.");
    } finally {
      this.savingCredit.set(false);
    }
  }

  /** Removes a buyer's portal password: they use a link, or set a new one with a WhatsApp code. */
  protected async clearPassword(b: ReorderBuyerDto): Promise<void> {
    this.error.set(null);
    try {
      await firstValueFrom(this.api.clearPassword(b.contactId));
      this.buyers.update((list) =>
        list.map((x) => (x.contactId === b.contactId ? { ...x, hasPassword: false } : x)),
      );
    } catch {
      this.error.set(`${b.name}'s password couldn't be removed.`);
    }
  }

  protected async choose(accountId: string): Promise<void> {
    this.accountId.set(accountId);
    this.buyers.set([]);
    this.credit.set(null);
    this.error.set(null);
    if (!accountId) return;
    this.loading.set(true);
    try {
      const [buyers, credit] = await Promise.all([
        firstValueFrom(this.api.getBuyers(accountId)),
        firstValueFrom(this.api.getCredit(accountId)),
      ]);
      this.buyers.set(buyers);
      this.showCredit(credit);
    } catch {
      this.error.set("The company's buyers couldn't be loaded.");
    } finally {
      this.loading.set(false);
    }
  }

  protected edit(contactId: string, change: { role?: ReorderBuyerRole; limit?: string }): void {
    if (change.limit !== undefined) this.limits.set(contactId, change.limit);
    if (change.role) {
      this.buyers.update((list) =>
        list.map((b) => (b.contactId === contactId ? { ...b, role: change.role! } : b)),
      );
    }
    this.saved.set(null);
  }

  protected async save(b: ReorderBuyerDto): Promise<void> {
    this.error.set(null);
    const typed = this.limits.get(b.contactId);
    const limit = typed === undefined ? (b.approvalAboveInPaise ?? null) : parseRupees(typed);
    if (limit === undefined) {
      this.error.set('Enter the amount in rupees, e.g. 25000, or leave it blank.');
      return;
    }
    this.saving.set(b.contactId);
    try {
      const updated = await firstValueFrom(
        this.api.setBuyer({
          contactId: b.contactId,
          role: b.role,
          approvalAboveInPaise: limit,
        }),
      );
      this.buyers.update((list) => list.map((x) => (x.contactId === b.contactId ? updated : x)));
      this.limits.delete(b.contactId);
      this.saved.set(b.contactId);
    } catch {
      this.error.set(`${b.name}'s role couldn't be saved.`);
    } finally {
      this.saving.set(null);
    }
  }
}
