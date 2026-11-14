import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { CurrentUserService } from '../../core/services/current-user.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  CustomDomainStatus,
  ResellerBillingModel,
  ResellerPartnerStatus,
  ResellerPayoutStatus,
  ResellerTier,
} from '../../proxy/resellers/reseller-enums';
import type {
  ResellerClientTenantDto,
  ResellerCommissionDto,
  ResellerDashboardDto,
  ResellerPartnerDto,
  ResellerPayoutDto,
  ResellerWhiteLabelProfileDto,
} from '../../proxy/resellers/reseller.models';
import { ResellerService } from '../../proxy/resellers/reseller.service';
import { ArBanner, ArButton, ArCard, ArChip, ArDialog, ArStatTile, ArTabs } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import {
  BILLING_MODEL_LABEL,
  DOMAIN_STATUS,
  PARTNER_STATUS,
  PAYOUT_STATUS,
  TIER_LABEL,
  formatBps,
  formatPaise,
  isHexColour,
  isValidDomain,
  percentToBps,
  registrationProblem,
  rupeesToPaise,
} from './reseller-logic';

const TABS = [
  'Overview',
  'Branding & domain',
  'Client workspaces',
  'Commissions',
  'Payouts',
] as const;
type Tab = (typeof TABS)[number];
const PAGE = { maxResultCount: 200 };

/**
 * The white-label reseller programme. The host sees every partner and approves partners, tiers and payouts; a workspace
 * registers as a partner and then runs its own branding, client workspaces, commissions and payout requests.
 */
@Component({
  selector: 'ar-resellers',
  standalone: true,
  imports: [
    ArTopbar,
    ArCard,
    ArButton,
    ArBanner,
    ArChip,
    ArDialog,
    ArStatTile,
    ArTabs,
    ArGrid,
    GridModule,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isPage) {
      <ar-topbar [title]="pageTitle()">
        <button ar-button type="button" variant="ghost" (click)="close()">
          Back to Reseller programme
        </button>
      </ar-topbar>
      <div class="ar-form-page ar-scroll">
        <ng-container *ngTemplateOutlet="formsTpl" />
      </div>
    } @else {
      <ar-topbar
        title="Reseller programme"
        [subtitle]="subtitle()"
        help="Agencies and distributors who sell AutoReach under their own brand: their branding and domain, the client workspaces they manage, the commission they earn and the payouts they request."
      >
        @if (hostView()) {
          <button ar-button type="button" variant="primary" icon="plus" (click)="goRegister()">
            Add partner
          </button>
        }
      </ar-topbar>

      <div class="page ar-scroll">
        <div class="page__col">
          @if (error(); as e) {
            <ar-banner tone="bad">{{ e }}</ar-banner>
          }

          @if (hostView()) {
            <ar-card heading="Partners">
              @if (partners().length === 0) {
                <p class="empty">
                  No partners yet. Workspaces register from their own Reseller programme page, or
                  add one here.
                </p>
              } @else {
                <ejs-grid
                  arGrid="reseller-partners"
                  [dataSource]="partners()"
                  aria-label="Partners"
                >
                  <e-columns>
                    <e-column field="companyName" headerText="Partner" width="220">
                      <ng-template #template let-p>
                        <strong>{{ p.companyName }}</strong>
                        <span class="sub ar-mono">{{ p.partnerCode }}</span>
                      </ng-template>
                    </e-column>
                    <e-column field="status" headerText="Status" width="140">
                      <ng-template #template let-p>
                        <ar-chip [tone]="partnerStatus(p.status).tone">{{
                          partnerStatus(p.status).label
                        }}</ar-chip>
                      </ng-template>
                    </e-column>
                    <e-column field="tier" headerText="Tier" width="130">
                      <ng-template #template let-p>
                        {{ tierLabel(p.tier) }}
                      </ng-template>
                    </e-column>
                    <e-column
                      field="commissionRateBps"
                      headerText="Commission"
                      textAlign="Right"
                      width="130"
                    >
                      <ng-template #template let-p>
                        {{ bps(p.commissionRateBps) }}
                      </ng-template>
                    </e-column>
                    <e-column
                      field="accruedCommissionPaise"
                      headerText="Accrued"
                      textAlign="Right"
                      width="140"
                    >
                      <ng-template #template let-p>
                        {{ money(p.accruedCommissionPaise) }}
                      </ng-template>
                    </e-column>
                    <e-column headerText="" width="90">
                      <ng-template #template let-p>
                        <button type="button" class="link" (click)="select(p.id)">Open</button>
                      </ng-template>
                    </e-column>
                  </e-columns>
                </ejs-grid>
              }
            </ar-card>
          } @else if (loaded() && !partner()) {
            <ar-card heading="Become a reseller partner">
              <p class="lead">
                Sell AutoReach to your own clients under your brand. You register once; the platform
                team reviews and approves you, then you can set up your branding and domain, add
                client workspaces and earn commission on what they pay.
              </p>
              @if (canRegister()) {
                <button ar-button type="button" variant="primary" (click)="register()">
                  Register as a partner
                </button>
              } @else {
                <p class="empty">
                  Ask a workspace owner to register; it needs the Reseller programme permission.
                </p>
              }
            </ar-card>
          }

          @if (partner(); as p) {
            <ar-card [heading]="p.companyName">
              <div class="head-row">
                <ar-chip [tone]="partnerStatus(p.status).tone">{{
                  partnerStatus(p.status).label
                }}</ar-chip>
                <span class="ar-mono sub">{{ p.partnerCode }}</span>
                <span class="spacer"></span>
                @if (hostView()) {
                  @if (p.status === S.PendingApproval) {
                    <button ar-button type="button" variant="primary" (click)="approve(p)">
                      Approve
                    </button>
                  }
                  @if (p.status === S.Active) {
                    <button ar-button type="button" variant="ghost" (click)="suspend(p)">
                      Suspend
                    </button>
                  }
                  @if (p.status === S.Suspended) {
                    <button ar-button type="button" variant="ghost" (click)="reactivate(p)">
                      Reactivate
                    </button>
                  }
                  <button ar-button type="button" variant="ghost" (click)="goChangeTier(p)">
                    Change tier
                  </button>
                }
              </div>
              @if (p.status === S.PendingApproval && !hostView()) {
                <ar-banner tone="warn"
                  >Your registration is waiting for the platform team to approve it. Clients and
                  payouts open once it's approved.</ar-banner
                >
              }
              @if (p.status === S.Suspended) {
                <ar-banner tone="bad"
                  >This partner is suspended: no new clients or payouts until it's
                  reactivated.</ar-banner
                >
              }

              <ar-tabs [tabs]="tabs" [(active)]="tab" />

              @switch (tab()) {
                @case ('Overview') {
                  @if (dashboard(); as d) {
                    <div class="tiles">
                      <ar-stat-tile
                        label="Active clients"
                        [value]="d.activeClientsCount + ' of ' + d.maxManagedTenants"
                      />
                      <ar-stat-tile
                        label="Commission to pay out"
                        [value]="money(d.accruedCommissionPaise)"
                      />
                      <ar-stat-tile
                        label="Paid out to date"
                        [value]="money(d.lifetimePaidOutPaise)"
                      />
                      <ar-stat-tile label="Tier" [value]="tierLabel(d.tier)" />
                    </div>
                  }
                  <dl class="facts">
                    <div>
                      <dt>Billing model</dt>
                      <dd>{{ billingLabel(p.billingModel) }}</dd>
                    </div>
                    <div>
                      <dt>Commission rate</dt>
                      <dd>{{ bps(p.commissionRateBps) }}</dd>
                    </div>
                    <div>
                      <dt>Wholesale discount</dt>
                      <dd>{{ bps(p.wholesaleDiscountBps) }}</dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>{{ p.contactName }} · {{ p.contactEmail }} · {{ p.contactPhone }}</dd>
                    </div>
                    <div>
                      <dt>Website</dt>
                      <dd>{{ p.websiteUrl || '—' }}</dd>
                    </div>
                    <div>
                      <dt>GSTIN / tax ID</dt>
                      <dd class="ar-mono">{{ p.taxId || '—' }}</dd>
                    </div>
                  </dl>
                  <div class="row-actions">
                    <button ar-button type="button" variant="ghost" (click)="goEditDetails(p)">
                      Edit contact details
                    </button>
                  </div>
                }

                @case ('Branding & domain') {
                  @if (profile(); as b) {
                    <div class="brand">
                      <span class="swatch" [style.background]="b.primaryColorHex"></span>
                      <span class="swatch" [style.background]="b.secondaryColorHex"></span>
                      <strong>{{ b.brandName }}</strong>
                      <span class="sub">{{
                        b.hidePlatformBranding
                          ? 'AutoReach branding hidden'
                          : 'Shows "Powered by AutoReach"'
                      }}</span>
                    </div>
                    <dl class="facts">
                      <div>
                        <dt>Support email</dt>
                        <dd>{{ b.supportEmail || '—' }}</dd>
                      </div>
                      <div>
                        <dt>Help desk</dt>
                        <dd>{{ b.helpDeskUrl || '—' }}</dd>
                      </div>
                      <div>
                        <dt>Email sender</dt>
                        <dd>
                          {{ b.emailSenderName || '—' }}
                          {{ b.emailSenderAddress ? '<' + b.emailSenderAddress + '>' : '' }}
                        </dd>
                      </div>
                      <div>
                        <dt>Logo (light / dark)</dt>
                        <dd>{{ b.logoUrlLight || '—' }} / {{ b.logoUrlDark || '—' }}</dd>
                      </div>
                    </dl>
                    @if (canBrand()) {
                      <div class="row-actions">
                        <button ar-button type="button" variant="ghost" (click)="goEditBranding(b)">
                          Edit branding
                        </button>
                      </div>
                    }

                    <h3 class="h3">Custom domain</h3>
                    @if (b.customDomain) {
                      <p>
                        <strong class="ar-mono">{{ b.customDomain }}</strong>
                        <ar-chip [tone]="domainStatus(b.domainStatus).tone">{{
                          domainStatus(b.domainStatus).label
                        }}</ar-chip>
                      </p>
                      @if (b.domainStatus !== D.Active || b.sslCertificateThumbprint?.length === 32) {
                        <p class="sub">
                          Add a CNAME record pointing
                          <span class="ar-mono">{{ b.customDomain }}</span> at
                          <span class="ar-mono">{{ b.dnsVerificationTarget }}</span
                          >, and a TXT record at _autoreach-verify.{{ b.customDomain }} with
                          <span class="ar-mono">{{ b.domainVerificationToken }}</span
                          >.
                        </p>
                      }
                    } @else {
                      <p class="empty">
                        No custom domain yet; clients use the standard AutoReach address.
                      </p>
                    }
                    <div class="row-actions">
                      @if (canBrand()) {
                        <button ar-button type="button" variant="ghost" (click)="setDomain(b)">
                          {{ b.customDomain ? 'Change domain' : 'Set up a domain' }}
                        </button>
                      }
                      @if (hostView() && b.customDomain) {
                        <button
                          ar-button
                          type="button"
                          variant="primary"
                          (click)="verifyDomain()"
                        >
                          Check domain
                        </button>
                      }
                    </div>
                  }
                }

                @case ('Client workspaces') {
                  @if (canClients() && p.status === S.Active) {
                    <div class="row-actions">
                      <button
                        ar-button
                        type="button"
                        variant="primary"
                        icon="plus"
                        (click)="goAddClient(p)"
                      >
                        Add client workspace
                      </button>
                    </div>
                  }
                  @if (clients().length === 0) {
                    <p class="empty">No client workspaces yet.</p>
                  } @else {
                    <ejs-grid
                      arGrid="reseller-clients"
                      [dataSource]="clients()"
                      aria-label="Client workspaces"
                    >
                      <e-columns>
                        <e-column field="clientTenantName" headerText="Client" width="200" />
                        <e-column headerText="Plan" width="180">
                          <ng-template #template let-c>
                            {{ c.subscribedPlanCode }} · {{ c.billingCycle }}
                          </ng-template>
                        </e-column>
                        <e-column
                          field="wholesaleRatePaise"
                          headerText="Wholesale / month"
                          textAlign="Right"
                          width="160"
                        >
                          <ng-template #template let-c>
                            {{ money(c.wholesaleRatePaise) }}
                          </ng-template>
                        </e-column>
                        <e-column
                          field="commissionRateBps"
                          headerText="Commission"
                          textAlign="Right"
                          width="130"
                        >
                          <ng-template #template let-c>
                            {{ bps(c.commissionRateBps) }}
                          </ng-template>
                        </e-column>
                        <e-column field="isActive" headerText="Status" width="130">
                          <ng-template #template let-c>
                            <ar-chip [tone]="c.isActive ? 'good' : 'neutral'">{{
                              c.isActive ? 'Active' : 'Inactive'
                            }}</ar-chip>
                          </ng-template>
                        </e-column>
                        <e-column headerText="" width="180">
                          <ng-template #template let-c>
                            @if (canClients()) {
                              <div class="act">
                                <button type="button" class="link" (click)="changePlan(p, c)">
                                  Change plan
                                </button>
                                @if (c.isActive) {
                                  <button
                                    type="button"
                                    class="link link--danger"
                                    (click)="deactivateClient(p, c)"
                                  >
                                    Deactivate
                                  </button>
                                } @else {
                                  <button
                                    type="button"
                                    class="link"
                                    (click)="reactivateClient(p, c)"
                                  >
                                    Reactivate
                                  </button>
                                }
                              </div>
                            }
                          </ng-template>
                        </e-column>
                      </e-columns>
                    </ejs-grid>
                  }
                }

                @case ('Commissions') {
                  @if (hostView() && canProcessPayouts()) {
                    <div class="row-actions">
                      <button
                        ar-button
                        type="button"
                        variant="primary"
                        icon="plus"
                        (click)="recordCommission(p)"
                      >
                        Record commission
                      </button>
                    </div>
                  }
                  @if (commissions().length === 0) {
                    <p class="empty">No commission earned yet.</p>
                  } @else {
                    <ejs-grid
                      arGrid="reseller-commissions"
                      [dataSource]="commissions()"
                      aria-label="Commissions"
                    >
                      <e-columns>
                        <e-column field="invoiceReference" headerText="Invoice" width="150">
                          <ng-template #template let-c>
                            <span class="ar-mono">{{ c.invoiceReference }}</span>
                          </ng-template>
                        </e-column>
                        <e-column headerText="Client" width="180">
                          <ng-template #template let-c>
                            {{ clientName(c.clientTenantId) }}
                          </ng-template>
                        </e-column>
                        <e-column
                          field="grossAmountPaise"
                          headerText="Invoice amount"
                          textAlign="Right"
                          width="140"
                        >
                          <ng-template #template let-c>
                            {{ money(c.grossAmountPaise) }}
                          </ng-template>
                        </e-column>
                        <e-column
                          field="commissionBasisPoints"
                          headerText="Rate"
                          textAlign="Right"
                          width="110"
                        >
                          <ng-template #template let-c>
                            {{ bps(c.commissionBasisPoints) }}
                          </ng-template>
                        </e-column>
                        <e-column
                          field="earnedCommissionPaise"
                          headerText="Earned"
                          textAlign="Right"
                          width="140"
                        >
                          <ng-template #template let-c>
                            {{ money(c.earnedCommissionPaise) }}
                          </ng-template>
                        </e-column>
                        <e-column field="occurredAtUtc" headerText="Date" width="130">
                          <ng-template #template let-c>
                            {{ date(c.occurredAtUtc) }}
                          </ng-template>
                        </e-column>
                      </e-columns>
                    </ejs-grid>
                  }
                }

                @case ('Payouts') {
                  @if (!hostView() && canFinancials() && p.status === S.Active) {
                    <div class="row-actions">
                      <button
                        ar-button
                        type="button"
                        variant="primary"
                        [disabled]="p.accruedCommissionPaise <= 0"
                        (click)="requestPayout(p)"
                      >
                        Request payout
                      </button>
                      <span class="sub">{{ money(p.accruedCommissionPaise) }} available</span>
                    </div>
                  }
                  @if (payouts().length === 0) {
                    <p class="empty">No payouts yet.</p>
                  } @else {
                    <ejs-grid
                      arGrid="reseller-payouts"
                      [dataSource]="payouts()"
                      aria-label="Payouts"
                    >
                      <e-columns>
                        <e-column field="payoutNumber" headerText="Payout" width="150">
                          <ng-template #template let-o>
                            <span class="ar-mono">{{ o.payoutNumber }}</span>
                          </ng-template>
                        </e-column>
                        <e-column
                          field="amountPaise"
                          headerText="Amount"
                          textAlign="Right"
                          width="140"
                        >
                          <ng-template #template let-o>
                            {{ money(o.amountPaise) }}
                          </ng-template>
                        </e-column>
                        <e-column field="status" headerText="Status" width="140">
                          <ng-template #template let-o>
                            <ar-chip [tone]="payoutStatus(o.status).tone">{{
                              payoutStatus(o.status).label
                            }}</ar-chip>
                          </ng-template>
                        </e-column>
                        <e-column field="requestedAtUtc" headerText="Requested" width="130">
                          <ng-template #template let-o>
                            {{ date(o.requestedAtUtc) }}
                          </ng-template>
                        </e-column>
                        <e-column headerText="Reference / reason" width="200">
                          <ng-template #template let-o>
                            {{ o.paymentReference || o.rejectionReason || '—' }}
                          </ng-template>
                        </e-column>
                        <e-column headerText="" width="200">
                          <ng-template #template let-o>
                            @if (hostView() && canProcessPayouts()) {
                              <div class="act">
                                @if (o.status === P.Requested) {
                                  <button type="button" class="link" (click)="approvePayout(o)">
                                    Approve
                                  </button>
                                }
                                @if (o.status === P.Requested || o.status === P.Approved) {
                                  <button type="button" class="link" (click)="settlePayout(o)">
                                    Mark paid
                                  </button>
                                  <button
                                    type="button"
                                    class="link link--danger"
                                    (click)="rejectPayout(o)"
                                  >
                                    Reject
                                  </button>
                                }
                              </div>
                            }
                          </ng-template>
                        </e-column>
                      </e-columns>
                    </ejs-grid>
                  }
                }
              }
            </ar-card>
          }
        </div>
      </div>
    }

    <ng-template #formsTpl>
      @if (registerOpen()) {
        <ar-dialog
          [title]="hostView() ? 'Add a partner' : 'Register as a reseller partner'"
          (dismiss)="close()"
        >
          <label class="ar-field">
            <span class="ar-field__label">Partner code</span>
            <input
              class="ar-field__input"
              placeholder="e.g. CLOUDREACH"
              [value]="registerDraft().partnerCode"
              (input)="patchRegisterDraft({ partnerCode: $any($event.target).value })"
            />
            <span class="ar-field__hint"
              >Letters, numbers or hyphens; shown on invoices and payouts.</span
            >
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Company name</span>
            <input
              class="ar-field__input"
              [value]="registerDraft().companyName"
              (input)="patchRegisterDraft({ companyName: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Contact name</span>
            <input
              class="ar-field__input"
              [value]="registerDraft().contactName"
              (input)="patchRegisterDraft({ contactName: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Contact email</span>
            <input
              type="email"
              class="ar-field__input"
              [value]="registerDraft().contactEmail"
              (input)="patchRegisterDraft({ contactEmail: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Contact phone</span>
            <input
              type="tel"
              class="ar-field__input"
              [value]="registerDraft().contactPhone"
              (input)="patchRegisterDraft({ contactPhone: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label"
              >Website <span class="ar-field__opt">(optional)</span></span
            >
            <input
              type="url"
              class="ar-field__input"
              [value]="registerDraft().websiteUrl"
              (input)="patchRegisterDraft({ websiteUrl: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label"
              >GSTIN or tax ID <span class="ar-field__opt">(optional)</span></span
            >
            <input
              class="ar-field__input"
              [value]="registerDraft().taxId"
              (input)="patchRegisterDraft({ taxId: $any($event.target).value })"
            />
          </label>
          <div dialogActions>
            <button ar-button variant="ghost" (click)="close()">Cancel</button>
            <button ar-button variant="primary" (click)="saveRegister()">
              {{ hostView() ? 'Add partner' : 'Register' }}
            </button>
          </div>
        </ar-dialog>
      }

      @if (editDetailsOpen() && editingPartner(); as p) {
        <ar-dialog title="Edit contact details" (dismiss)="close()">
          <label class="ar-field">
            <span class="ar-field__label">Company name</span>
            <input
              class="ar-field__input"
              [value]="editDraft().companyName"
              (input)="patchEditDraft({ companyName: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Contact name</span>
            <input
              class="ar-field__input"
              [value]="editDraft().contactName"
              (input)="patchEditDraft({ contactName: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Contact email</span>
            <input
              type="email"
              class="ar-field__input"
              [value]="editDraft().contactEmail"
              (input)="patchEditDraft({ contactEmail: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Contact phone</span>
            <input
              type="tel"
              class="ar-field__input"
              [value]="editDraft().contactPhone"
              (input)="patchEditDraft({ contactPhone: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Website</span>
            <input
              type="url"
              class="ar-field__input"
              [value]="editDraft().websiteUrl"
              (input)="patchEditDraft({ websiteUrl: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">GSTIN or tax ID</span>
            <input
              class="ar-field__input"
              [value]="editDraft().taxId"
              (input)="patchEditDraft({ taxId: $any($event.target).value })"
            />
          </label>
          <div dialogActions>
            <button ar-button variant="ghost" (click)="close()">Cancel</button>
            <button ar-button variant="primary" (click)="saveEditDetails()">Save</button>
          </div>
        </ar-dialog>
      }

      @if (tierOpen() && editingPartner(); as p) {
        <ar-dialog [title]="'Tier for ' + p.companyName" (dismiss)="close()">
          <label class="ar-field">
            <span class="ar-field__label">Tier</span>
            <select
              class="ar-field__input"
              [value]="tierDraft().tier"
              (change)="patchTierDraft({ tier: +$any($event.target).value })"
            >
              @for (t of tiers; track t) {
                <option [value]="t">{{ tierLabel(t) }}</option>
              }
            </select>
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Billing model</span>
            <select
              class="ar-field__input"
              [value]="tierDraft().billingModel"
              (change)="patchTierDraft({ billingModel: +$any($event.target).value })"
            >
              @for (m of models; track m) {
                <option [value]="m">{{ billingLabel(m) }}</option>
              }
            </select>
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Commission rate (%)</span>
            <input
              class="ar-field__input"
              placeholder="0"
              [value]="tierDraft().commissionRatePercent"
              (input)="patchTierDraft({ commissionRatePercent: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Wholesale discount (%)</span>
            <input
              class="ar-field__input"
              placeholder="0"
              [value]="tierDraft().wholesaleDiscountPercent"
              (input)="patchTierDraft({ wholesaleDiscountPercent: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Most client workspaces</span>
            <input
              type="number"
              class="ar-field__input"
              [value]="tierDraft().maxManagedTenants"
              (input)="patchTierDraft({ maxManagedTenants: +$any($event.target).value })"
            />
          </label>
          <div dialogActions>
            <button ar-button variant="ghost" (click)="close()">Cancel</button>
            <button ar-button variant="primary" (click)="saveTier()">Save tier</button>
          </div>
        </ar-dialog>
      }

      @if (brandingOpen()) {
        <ar-dialog title="Branding & white-label" (dismiss)="close()">
          <label class="ar-field">
            <span class="ar-field__label">Brand name</span>
            <input
              class="ar-field__input"
              [value]="brandingDraft().brandName"
              (input)="patchBrandingDraft({ brandName: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Primary colour (Hex e.g. #1769FF)</span>
            <input
              class="ar-field__input"
              [value]="brandingDraft().primaryColorHex"
              (input)="patchBrandingDraft({ primaryColorHex: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Secondary colour</span>
            <input
              class="ar-field__input"
              [value]="brandingDraft().secondaryColorHex"
              (input)="patchBrandingDraft({ secondaryColorHex: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Logo URL (light backgrounds)</span>
            <input
              type="url"
              class="ar-field__input"
              [value]="brandingDraft().logoUrlLight"
              (input)="patchBrandingDraft({ logoUrlLight: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Logo URL (dark backgrounds)</span>
            <input
              type="url"
              class="ar-field__input"
              [value]="brandingDraft().logoUrlDark"
              (input)="patchBrandingDraft({ logoUrlDark: $any($event.target).value })"
            />
          </label>
          <div dialogActions>
            <button ar-button variant="ghost" (click)="close()">Cancel</button>
            <button ar-button variant="primary" (click)="saveBranding()">Save branding</button>
          </div>
        </ar-dialog>
      }

      @if (addClientOpen() && editingPartner(); as p) {
        <ar-dialog title="Add a client workspace" (dismiss)="close()">
          <label class="ar-field">
            <span class="ar-field__label">Client name</span>
            <input
              class="ar-field__input"
              [value]="clientDraft().name"
              (input)="patchClientDraft({ name: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Plan</span>
            <input
              class="ar-field__input"
              [value]="clientDraft().plan"
              (input)="patchClientDraft({ plan: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Billing cycle</span>
            <select
              class="ar-field__input"
              [value]="clientDraft().billingCycle"
              (change)="patchClientDraft({ billingCycle: $any($event.target).value })"
            >
              <option value="Monthly">Monthly</option>
              <option value="Annual">Annual</option>
            </select>
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Wholesale rate per month (₹)</span>
            <input
              type="number"
              class="ar-field__input"
              [value]="clientDraft().wholesaleRupees"
              (input)="patchClientDraft({ wholesaleRupees: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Your price to the client per month (₹, optional)</span>
            <input
              type="number"
              class="ar-field__input"
              [value]="clientDraft().clientPriceRupees"
              (input)="patchClientDraft({ clientPriceRupees: $any($event.target).value })"
            />
          </label>
          <div dialogActions>
            <button ar-button variant="ghost" (click)="close()">Cancel</button>
            <button ar-button variant="primary" (click)="saveClient()">Add client</button>
          </div>
        </ar-dialog>
      }
    </ng-template>
  `,
  styles: `
    .page {
      padding: 20px;
    }
    .page__col {
      max-width: 1040px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .tbl-wrap {
      overflow-x: auto;
    }
    .tbl-wrap .ar-table {
      box-shadow: none;
    }
    tr.sel td {
      background: var(--ar-bg-50);
    }
    .sub {
      display: inline-block;
      margin-left: 8px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    td .sub {
      display: block;
      margin-left: 0;
    }
    .act {
      text-align: right;
      white-space: nowrap;
    }
    .link {
      border: 0;
      background: none;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
      margin-left: 12px;
    }
    .link--danger {
      color: var(--ar-red-600);
    }
    .empty {
      color: var(--ar-ink-400);
      margin: 12px 0;
    }
    .lead {
      max-width: 62ch;
      color: var(--ar-ink-500);
      margin: 0 0 14px;
    }
    .head-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .spacer {
      flex: 1;
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin: 14px 0;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 10px 20px;
      margin: 14px 0;
    }
    .facts dt {
      font: 600 10.5px var(--ar-font-sans);
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--ar-ink-400);
    }
    .facts dd {
      margin: 2px 0 0;
      color: var(--ar-ink-700);
      overflow-wrap: anywhere;
    }
    .row-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 12px 0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
    }
    .swatch {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1px solid var(--ar-line-200);
    }
    .h3 {
      font: 600 14px var(--ar-font-sans);
      margin: 20px 0 6px;
    }
  `,
})
export class ArResellers {
  private readonly api = inject(ResellerService);
  private readonly permissions = inject(PermissionService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly tiers = [
    ResellerTier.Registered,
    ResellerTier.Silver,
    ResellerTier.Gold,
    ResellerTier.Platinum,
    ResellerTier.Enterprise,
  ];
  protected readonly models = [
    ResellerBillingModel.RevenueShareCommission,
    ResellerBillingModel.WholesaleMarkup,
    ResellerBillingModel.Hybrid,
  ];

  protected readonly registerOpen = signal(false);
  protected readonly editDetailsOpen = signal(false);
  protected readonly tierOpen = signal(false);
  protected readonly brandingOpen = signal(false);
  protected readonly addClientOpen = signal(false);
  protected readonly editingPartner = signal<ResellerPartnerDto | null>(null);

  protected readonly registerDraft = signal({
    partnerCode: '',
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    taxId: '',
  });

  protected readonly editDraft = signal({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    taxId: '',
  });

  protected readonly tierDraft = signal({
    tier: ResellerTier.Registered,
    billingModel: ResellerBillingModel.RevenueShareCommission,
    commissionRatePercent: '',
    wholesaleDiscountPercent: '',
    maxManagedTenants: 10,
  });

  protected readonly brandingDraft = signal({
    brandName: '',
    primaryColorHex: '#1769FF',
    secondaryColorHex: '#0D2D6C',
    logoUrlLight: '',
    logoUrlDark: '',
  });

  protected readonly clientDraft = signal({
    name: '',
    plan: 'Professional',
    billingCycle: 'Monthly',
    wholesaleRupees: '15000',
    clientPriceRupees: '25000',
    commissionPercent: '',
    notes: '',
  });

  protected readonly pageTitle = computed(() => {
    switch (this.mode) {
      case 'register':
        return this.hostView() ? 'Add a partner' : 'Register as a reseller partner';
      case 'edit':
        return 'Edit contact details';
      case 'tier':
        return 'Partner tier & commission';
      case 'branding':
        return 'White-label branding';
      case 'add-client':
        return 'Add client workspace';
      default:
        return 'Reseller programme';
    }
  });

  protected readonly tabs = TABS as unknown as readonly string[];
  protected readonly S = ResellerPartnerStatus;
  protected readonly P = ResellerPayoutStatus;
  protected readonly D = CustomDomainStatus;

  protected readonly canManagePartners = grantedPolicy(
    'AutoReach.Resellers.ManagePartners',
    this.permissions,
  );
  protected readonly canBrand = grantedPolicy(
    'AutoReach.Resellers.ManageBranding',
    this.permissions,
  );
  protected readonly canClients = grantedPolicy(
    'AutoReach.Resellers.ManageClients',
    this.permissions,
  );
  protected readonly canFinancials = grantedPolicy(
    'AutoReach.Resellers.ViewFinancials',
    this.permissions,
  );
  protected readonly canProcessPayouts = grantedPolicy(
    'AutoReach.Resellers.ProcessPayouts',
    this.permissions,
  );
  protected readonly canRegister = grantedPolicy('AutoReach.Resellers', this.permissions);

  /** The platform team's view: every partner. A workspace only ever sees its own partner record. */
  protected readonly hostView = computed(
    () => this.currentUser.isHost() && this.canManagePartners(),
  );

  protected readonly tab = signal<string>('Overview');
  protected readonly partners = signal<ResellerPartnerDto[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly partner = signal<ResellerPartnerDto | null>(null);
  protected readonly dashboard = signal<ResellerDashboardDto | null>(null);
  protected readonly profile = signal<ResellerWhiteLabelProfileDto | null>(null);
  protected readonly clients = signal<ResellerClientTenantDto[]>([]);
  protected readonly commissions = signal<ResellerCommissionDto[]>([]);
  protected readonly payouts = signal<ResellerPayoutDto[]>([]);
  protected readonly loaded = signal(false);
  private readonly partnerId = computed(() => this.partner()?.id ?? null);
  protected readonly error = signal<string | null>(null);

  protected readonly subtitle = computed(() => {
    if (this.hostView()) {
      const n = this.partners().length;
      return `${n} partner${n === 1 ? '' : 's'}`;
    }
    return this.partner()?.companyName ?? 'White-label partners';
  });

  constructor() {
    // Permissions decide which view this is and may arrive after the page; reload when they do.
    effect(() => {
      const host = this.hostView();
      untracked(() => void (host ? this.loadPartners() : this.loadCurrent()));
    });
    // Each tab loads its own data when it's opened, or when a different partner is shown.
    effect(() => {
      const t = this.tab() as Tab;
      const id = this.partnerId();
      if (id) untracked(() => void this.loadTab(id, t));
    });
  }

  // ---- loading ----

  private async loadPartners(): Promise<void> {
    await this.run(async () => {
      const page = await firstValueFrom(this.api.getPartners(PAGE));
      this.partners.set(page.items ?? []);
      const keep = this.selectedId();
      if (keep) await this.loadPartner(keep);
      this.checkRouteParam();
    });
    this.loaded.set(true);
  }

  private async loadCurrent(): Promise<void> {
    await this.run(async () => {
      const p = await firstValueFrom(this.api.getCurrentPartner());
      this.partner.set(p ?? null);
      this.selectedId.set(p?.id ?? null);
      this.checkRouteParam();
    });
    this.loaded.set(true);
  }

  private async loadPartner(id: string): Promise<void> {
    const p = await firstValueFrom(this.api.getPartner(id));
    this.partner.set(p);
  }

  private async loadTab(partnerId: string, tab: Tab): Promise<void> {
    await this.run(async () => {
      switch (tab) {
        case 'Overview':
          this.dashboard.set(await firstValueFrom(this.api.getDashboard(partnerId)));
          break;
        case 'Branding & domain':
          this.profile.set(await firstValueFrom(this.api.getWhiteLabelProfile(partnerId)));
          break;
        case 'Client workspaces':
          this.clients.set(
            (await firstValueFrom(this.api.getClientTenants(partnerId, PAGE))).items ?? [],
          );
          break;
        case 'Commissions':
          if (this.clients().length === 0) {
            this.clients.set(
              (await firstValueFrom(this.api.getClientTenants(partnerId, PAGE))).items ?? [],
            );
          }
          this.commissions.set(
            (await firstValueFrom(this.api.getCommissions(partnerId, PAGE))).items ?? [],
          );
          break;
        case 'Payouts':
          this.payouts.set(
            (await firstValueFrom(this.api.getPayouts(partnerId, PAGE))).items ?? [],
          );
          break;
      }
    });
  }

  private async refresh(): Promise<void> {
    const p = this.partner();
    if (this.hostView()) {
      await this.loadPartners();
    } else if (p) {
      await this.loadPartner(p.id);
    } else {
      await this.loadCurrent();
    }
    // Same partner: the tab effect doesn't fire again, so reload the open tab here.
    const now = this.partner();
    if (now && now.id === p?.id) await this.loadTab(now.id, this.tab() as Tab);
  }

  /** Runs an API call, turning a failure into the page's error banner. Returns false when it failed. */
  private async run(work: () => Promise<void>): Promise<boolean> {
    try {
      this.error.set(null);
      await work();
      return true;
    } catch (e) {
      this.error.set(readApiError(e, 'That didn’t work. Try again in a moment.'));
      return false;
    }
  }

  private async act(work: () => Promise<unknown>, done: string): Promise<void> {
    if (await this.run(async () => void (await work()))) {
      this.toasts.success(done);
      await this.refresh();
    }
  }

  protected select(id: string): void {
    this.selectedId.set(id);
    this.tab.set('Overview');
    void this.run(() => this.loadPartner(id));
  }

  protected patchRegisterDraft(patch: Partial<ReturnType<typeof this.registerDraft>>): void {
    this.registerDraft.update((d) => ({ ...d, ...patch }));
  }
  protected patchEditDraft(patch: Partial<ReturnType<typeof this.editDraft>>): void {
    this.editDraft.update((d) => ({ ...d, ...patch }));
  }
  protected patchTierDraft(patch: Partial<ReturnType<typeof this.tierDraft>>): void {
    this.tierDraft.update((d) => ({ ...d, ...patch }));
  }
  protected patchBrandingDraft(patch: Partial<ReturnType<typeof this.brandingDraft>>): void {
    this.brandingDraft.update((d) => ({ ...d, ...patch }));
  }
  protected patchClientDraft(patch: Partial<ReturnType<typeof this.clientDraft>>): void {
    this.clientDraft.update((d) => ({ ...d, ...patch }));
  }

  private checkRouteParam(): void {
    if (this.mode === 'register') {
      this.registerOpen.set(true);
    } else if (this.mode === 'edit') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const p = this.partners().find((x) => x.id === id) || this.partner();
      if (p) this.goEditDetails(p);
    } else if (this.mode === 'tier') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const p = this.partners().find((x) => x.id === id) || this.partner();
      if (p) this.goChangeTier(p);
    } else if (this.mode === 'branding') {
      const b = this.profile();
      if (b) this.goEditBranding(b);
    } else if (this.mode === 'add-client') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const p = this.partners().find((x) => x.id === id) || this.partner();
      if (p) this.goAddClient(p);
    }
  }

  protected goRegister(): void {
    this.registerDraft.set({
      partnerCode: '',
      companyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      websiteUrl: '',
      taxId: '',
    });
    this.registerOpen.set(true);
    if (this.router) void this.router.navigate(['/resellers/register']);
  }

  protected goEditDetails(p: ResellerPartnerDto): void {
    this.editingPartner.set(p);
    this.editDraft.set({
      companyName: p.companyName,
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      contactPhone: p.contactPhone,
      websiteUrl: p.websiteUrl ?? '',
      taxId: p.taxId ?? '',
    });
    this.editDetailsOpen.set(true);
    if (this.router && p.id) void this.router.navigate(['/resellers', p.id, 'edit']);
  }

  protected goChangeTier(p: ResellerPartnerDto): void {
    this.editingPartner.set(p);
    this.tierDraft.set({
      tier: p.tier,
      billingModel: p.billingModel,
      commissionRatePercent: formatBps(p.commissionRateBps),
      wholesaleDiscountPercent: formatBps(p.wholesaleDiscountBps),
      maxManagedTenants: p.maxManagedTenants || 10,
    });
    this.tierOpen.set(true);
    if (this.router && p.id) void this.router.navigate(['/resellers', p.id, 'tier']);
  }

  protected goEditBranding(b: ResellerWhiteLabelProfileDto): void {
    this.brandingDraft.set({
      brandName: b.brandName,
      primaryColorHex: b.primaryColorHex || '#1769FF',
      secondaryColorHex: b.secondaryColorHex || '#0D2D6C',
      logoUrlLight: b.logoUrlLight ?? '',
      logoUrlDark: b.logoUrlDark ?? '',
    });
    this.brandingOpen.set(true);
    const pid = b.partnerId || this.partner()?.id;
    if (this.router && pid) void this.router.navigate(['/resellers', pid, 'branding']);
  }

  protected goAddClient(p: ResellerPartnerDto): void {
    this.editingPartner.set(p);
    this.clientDraft.set({
      name: '',
      plan: 'Professional',
      billingCycle: 'Monthly',
      wholesaleRupees: '15000',
      clientPriceRupees: '25000',
      commissionPercent: formatBps(p.commissionRateBps),
      notes: '',
    });
    this.addClientOpen.set(true);
    if (this.router && p.id) void this.router.navigate(['/resellers', p.id, 'clients', 'new']);
  }

  protected close(): void {
    this.registerOpen.set(false);
    this.editDetailsOpen.set(false);
    this.tierOpen.set(false);
    this.brandingOpen.set(false);
    this.addClientOpen.set(false);
    this.editingPartner.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/resellers']);
    }
  }

  protected async saveRegister(): Promise<void> {
    const v = this.registerDraft();
    const input = {
      partnerCode: v.partnerCode.trim(),
      companyName: v.companyName.trim(),
      contactName: v.contactName.trim(),
      contactEmail: v.contactEmail.trim(),
      contactPhone: v.contactPhone.trim(),
      websiteUrl: v.websiteUrl.trim() || undefined,
      taxId: v.taxId.trim() || undefined,
    };
    const prob = registrationProblem(input);
    if (prob) {
      this.toasts.warning(prob);
      return;
    }
    await this.act(
      async () => {
        const p = await firstValueFrom(this.api.registerPartner(input as Required<typeof input>));
        this.selectedId.set(p.id);
        this.close();
      },
      this.hostView() ? 'Partner added.' : 'Registration sent for approval.',
    );
  }

  protected async saveEditDetails(): Promise<void> {
    const p = this.editingPartner();
    if (!p) return;
    const v = this.editDraft();
    await this.act(async () => {
      await firstValueFrom(
        this.api.updatePartner(p.id, {
          companyName: v.companyName.trim(),
          contactName: v.contactName.trim(),
          contactEmail: v.contactEmail.trim(),
          contactPhone: v.contactPhone.trim(),
          websiteUrl: v.websiteUrl.trim() || undefined,
          taxId: v.taxId.trim() || undefined,
        }),
      );
      this.close();
    }, 'Contact details saved.');
  }

  protected async saveTier(): Promise<void> {
    const p = this.editingPartner();
    if (!p) return;
    const v = this.tierDraft();
    const commission = v.commissionRatePercent.trim()
      ? percentToBps(v.commissionRatePercent)
      : undefined;
    const discount = v.wholesaleDiscountPercent.trim()
      ? percentToBps(v.wholesaleDiscountPercent)
      : undefined;
    if (commission === null || discount === null) {
      this.toasts.warning('Enter rates as a percentage between 0 and 100.');
      return;
    }
    await this.act(async () => {
      await firstValueFrom(
        this.api.updateTier(p.id, {
          tier: v.tier,
          billingModel: v.billingModel,
          commissionRateBps: commission,
          wholesaleDiscountBps: discount,
          maxManagedTenants: v.maxManagedTenants || undefined,
        }),
      );
      this.close();
    }, 'Tier saved.');
  }

  protected async saveBranding(): Promise<void> {
    const pid = this.editingPartner()?.id || this.profile()?.partnerId || this.partner()?.id;
    if (!pid) return;
    const v = this.brandingDraft();
    if (!isHexColour(v.primaryColorHex) || !isHexColour(v.secondaryColorHex)) {
      this.toasts.warning('Enter colours as a six-digit hex, e.g. #1769FF.');
      return;
    }
    await this.act(async () => {
      await firstValueFrom(
        this.api.updateWhiteLabelBranding(pid, {
          brandName: v.brandName.trim(),
          primaryColorHex: v.primaryColorHex.trim(),
          secondaryColorHex: v.secondaryColorHex.trim(),
          logoUrlLight: v.logoUrlLight.trim() || undefined,
          logoUrlDark: v.logoUrlDark.trim() || undefined,
          hidePlatformBranding: false,
        }),
      );
      this.close();
    }, 'Branding saved.');
  }

  protected async saveClient(): Promise<void> {
    const p = this.editingPartner();
    if (!p) return;
    const v = this.clientDraft();
    const wholesale = rupeesToPaise(v.wholesaleRupees);
    const price = v.clientPriceRupees.trim() ? rupeesToPaise(v.clientPriceRupees) : undefined;
    const commission = v.commissionPercent.trim() ? percentToBps(v.commissionPercent) : undefined;
    if (wholesale === null || price === null || commission === null) {
      this.toasts.warning(
        'Enter amounts in rupees and the rate as a percentage between 0 and 100.',
      );
      return;
    }
    await this.act(async () => {
      await firstValueFrom(
        this.api.provisionClientTenant(p.id, {
          clientTenantName: v.name.trim(),
          subscribedPlanCode: v.plan.trim(),
          billingCycle: v.billingCycle || 'Monthly',
          wholesaleRatePaise: wholesale,
          customMonthlyPricePaise: price ?? undefined,
          customCommissionRateBps: commission ?? undefined,
          notes: v.notes.trim() || undefined,
        }),
      );
      this.close();
    }, 'Client workspace added.');
  }

  // ---- partners ----

  protected async register(): Promise<void> {
    const v = await this.dialogs.prompt({
      title: this.hostView() ? 'Add a partner' : 'Register as a reseller partner',
      message: this.hostView()
        ? 'The partner starts awaiting approval, like one that registers itself.'
        : 'The platform team reviews your registration before you can add clients.',
      fields: [
        {
          key: 'partnerCode',
          label: 'Partner code',
          placeholder: 'e.g. CLOUDREACH',
          required: true,
          maxLength: 64,
          hint: 'Letters, numbers or hyphens; shown on invoices and payouts.',
        },
        { key: 'companyName', label: 'Company name', required: true, maxLength: 128 },
        { key: 'contactName', label: 'Contact name', required: true, maxLength: 128 },
        {
          key: 'contactEmail',
          label: 'Contact email',
          type: 'email',
          required: true,
          maxLength: 256,
        },
        { key: 'contactPhone', label: 'Contact phone', type: 'tel', required: true, maxLength: 32 },
        { key: 'websiteUrl', label: 'Website', type: 'url', maxLength: 256 },
        { key: 'taxId', label: 'GSTIN or tax ID', maxLength: 64 },
      ],
      confirmText: this.hostView() ? 'Add partner' : 'Register',
    });
    if (!v) return;
    const input = {
      partnerCode: v['partnerCode']?.trim(),
      companyName: v['companyName']?.trim(),
      contactName: v['contactName']?.trim(),
      contactEmail: v['contactEmail']?.trim(),
      contactPhone: v['contactPhone']?.trim(),
      websiteUrl: v['websiteUrl']?.trim() || undefined,
      taxId: v['taxId']?.trim() || undefined,
    };
    const problem = registrationProblem(input);
    if (problem) {
      this.toasts.warning(problem);
      return;
    }
    await this.act(
      async () => {
        const p = await firstValueFrom(this.api.registerPartner(input as Required<typeof input>));
        this.selectedId.set(p.id);
      },
      this.hostView() ? 'Partner added.' : 'Registration sent for approval.',
    );
  }

  protected async editDetails(p: ResellerPartnerDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: 'Edit contact details',
      fields: [
        {
          key: 'companyName',
          label: 'Company name',
          value: p.companyName,
          required: true,
          maxLength: 128,
        },
        {
          key: 'contactName',
          label: 'Contact name',
          value: p.contactName,
          required: true,
          maxLength: 128,
        },
        {
          key: 'contactEmail',
          label: 'Contact email',
          value: p.contactEmail,
          type: 'email',
          required: true,
          maxLength: 256,
        },
        {
          key: 'contactPhone',
          label: 'Contact phone',
          value: p.contactPhone,
          type: 'tel',
          required: true,
          maxLength: 32,
        },
        {
          key: 'websiteUrl',
          label: 'Website',
          value: p.websiteUrl ?? '',
          type: 'url',
          maxLength: 256,
        },
        { key: 'taxId', label: 'GSTIN or tax ID', value: p.taxId ?? '', maxLength: 64 },
      ],
      confirmText: 'Save',
    });
    if (!v) return;
    await this.act(
      () =>
        firstValueFrom(
          this.api.updatePartner(p.id, {
            companyName: v['companyName'].trim(),
            contactName: v['contactName'].trim(),
            contactEmail: v['contactEmail'].trim(),
            contactPhone: v['contactPhone'].trim(),
            websiteUrl: v['websiteUrl']?.trim() || undefined,
            taxId: v['taxId']?.trim() || undefined,
          }),
        ),
      'Details saved.',
    );
  }

  protected async approve(p: ResellerPartnerDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: `Approve ${p.companyName}`,
      message: 'They can then add client workspaces, earn commission and request payouts.',
      fields: [{ key: 'notes', label: 'Note for the record', multiline: true, maxLength: 1000 }],
      confirmText: 'Approve',
    });
    if (!v) return;
    await this.act(
      () => firstValueFrom(this.api.approvePartner(p.id, v['notes']?.trim() || undefined)),
      'Partner approved.',
    );
  }

  protected async suspend(p: ResellerPartnerDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: `Suspend ${p.companyName}`,
      message:
        'They can’t add clients or request payouts until reactivated. Existing clients keep working.',
      fields: [
        { key: 'reason', label: 'Reason', required: true, multiline: true, maxLength: 1000 },
      ],
      confirmText: 'Suspend',
    });
    if (!v) return;
    await this.act(
      () => firstValueFrom(this.api.suspendPartner(p.id, v['reason'].trim())),
      'Partner suspended.',
    );
  }

  protected async reactivate(p: ResellerPartnerDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Reactivate ${p.companyName}?`,
      confirmText: 'Reactivate',
      tone: 'primary',
    });
    if (!ok) return;
    await this.act(() => firstValueFrom(this.api.reactivatePartner(p.id)), 'Partner reactivated.');
  }

  protected async changeTier(p: ResellerPartnerDto): Promise<void> {
    const tiers = [
      ResellerTier.Registered,
      ResellerTier.Silver,
      ResellerTier.Gold,
      ResellerTier.Platinum,
      ResellerTier.Enterprise,
    ];
    const models = [
      ResellerBillingModel.RevenueShareCommission,
      ResellerBillingModel.WholesaleMarkup,
      ResellerBillingModel.Hybrid,
    ];
    const v = await this.dialogs.prompt({
      title: `Tier for ${p.companyName}`,
      message: 'Leave the rates blank to use the tier’s standard rates.',
      fields: [
        {
          key: 'tier',
          label: 'Tier',
          value: String(p.tier),
          options: tiers.map((t) => ({ value: String(t), label: TIER_LABEL[t] })),
        },
        {
          key: 'model',
          label: 'Billing model',
          value: String(p.billingModel),
          options: models.map((m) => ({ value: String(m), label: BILLING_MODEL_LABEL[m] })),
        },
        {
          key: 'commission',
          label: 'Commission rate (%)',
          placeholder: formatBps(p.commissionRateBps),
        },
        {
          key: 'discount',
          label: 'Wholesale discount (%)',
          placeholder: formatBps(p.wholesaleDiscountBps),
        },
        {
          key: 'max',
          label: 'Most client workspaces',
          type: 'number',
          value: String(p.maxManagedTenants),
          min: 1,
          max: 10000,
        },
      ],
      confirmText: 'Save tier',
    });
    if (!v) return;
    const commission = v['commission']?.trim() ? percentToBps(v['commission']) : undefined;
    const discount = v['discount']?.trim() ? percentToBps(v['discount']) : undefined;
    if (commission === null || discount === null) {
      this.toasts.warning('Enter rates as a percentage between 0 and 100.');
      return;
    }
    await this.act(
      () =>
        firstValueFrom(
          this.api.updateTier(p.id, {
            tier: Number(v['tier']) as ResellerTier,
            billingModel: Number(v['model']) as ResellerBillingModel,
            commissionRateBps: commission,
            wholesaleDiscountBps: discount,
            maxManagedTenants: v['max'] ? Number(v['max']) : undefined,
          }),
        ),
      'Tier saved.',
    );
  }

  // ---- branding and domain ----

  protected async editBranding(b: ResellerWhiteLabelProfileDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: 'Branding',
      message: 'How the product looks to your clients on your domain.',
      fields: [
        {
          key: 'brandName',
          label: 'Brand name',
          value: b.brandName,
          required: true,
          maxLength: 128,
        },
        {
          key: 'primary',
          label: 'Primary colour',
          value: b.primaryColorHex,
          required: true,
          hint: 'Six-digit hex, e.g. #1769FF',
        },
        { key: 'secondary', label: 'Secondary colour', value: b.secondaryColorHex, required: true },
        {
          key: 'logoLight',
          label: 'Logo URL (light backgrounds)',
          value: b.logoUrlLight ?? '',
          type: 'url',
          maxLength: 512,
        },
        {
          key: 'logoDark',
          label: 'Logo URL (dark backgrounds)',
          value: b.logoUrlDark ?? '',
          type: 'url',
          maxLength: 512,
        },
        {
          key: 'favicon',
          label: 'Favicon URL',
          value: b.faviconUrl ?? '',
          type: 'url',
          maxLength: 512,
        },
        {
          key: 'supportEmail',
          label: 'Support email',
          value: b.supportEmail ?? '',
          type: 'email',
          maxLength: 256,
        },
        {
          key: 'helpDesk',
          label: 'Help desk URL',
          value: b.helpDeskUrl ?? '',
          type: 'url',
          maxLength: 512,
        },
        { key: 'terms', label: 'Terms URL', value: b.termsUrl ?? '', type: 'url', maxLength: 512 },
        {
          key: 'privacy',
          label: 'Privacy policy URL',
          value: b.privacyPolicyUrl ?? '',
          type: 'url',
          maxLength: 512,
        },
        {
          key: 'senderName',
          label: 'Email sender name',
          value: b.emailSenderName ?? '',
          maxLength: 128,
        },
        {
          key: 'senderAddress',
          label: 'Email sender address',
          value: b.emailSenderAddress ?? '',
          type: 'email',
          maxLength: 256,
        },
        {
          key: 'hide',
          label: 'AutoReach branding',
          value: b.hidePlatformBranding ? 'hide' : 'show',
          options: [
            { value: 'hide', label: 'Hide it' },
            { value: 'show', label: 'Show "Powered by AutoReach"' },
          ],
        },
      ],
      confirmText: 'Save branding',
    });
    if (!v) return;
    if (!isHexColour(v['primary']) || !isHexColour(v['secondary'])) {
      this.toasts.warning('Enter both colours as six-digit hex, e.g. #1769FF.');
      return;
    }
    const blank = (s: string | undefined) => s?.trim() || undefined;
    await this.act(
      () =>
        firstValueFrom(
          this.api.updateWhiteLabelBranding(b.partnerId, {
            brandName: v['brandName'].trim(),
            primaryColorHex: v['primary'].trim(),
            secondaryColorHex: v['secondary'].trim(),
            logoUrlLight: blank(v['logoLight']),
            logoUrlDark: blank(v['logoDark']),
            faviconUrl: blank(v['favicon']),
            supportEmail: blank(v['supportEmail']),
            helpDeskUrl: blank(v['helpDesk']),
            termsUrl: blank(v['terms']),
            privacyPolicyUrl: blank(v['privacy']),
            emailSenderName: blank(v['senderName']),
            emailSenderAddress: blank(v['senderAddress']),
            hidePlatformBranding: v['hide'] === 'hide',
            // Custom CSS is kept as it is; this form doesn't edit it.
            customCss: b.customCss,
          }),
        ),
      'Branding saved.',
    );
  }

  protected async setDomain(b: ResellerWhiteLabelProfileDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: 'Custom domain',
      message:
        'The address your clients sign in at, e.g. portal.yourcompany.com. You’ll get two DNS records to add.',
      fields: [
        {
          key: 'domain',
          label: 'Domain',
          value: b.customDomain ?? '',
          required: true,
          maxLength: 256,
        },
      ],
      confirmText: 'Save domain',
    });
    if (!v) return;
    if (!isValidDomain(v['domain'])) {
      this.toasts.warning(
        'Enter just the domain, e.g. portal.yourcompany.com, without https:// or a path.',
      );
      return;
    }
    await this.act(
      () =>
        firstValueFrom(
          this.api.configureCustomDomain(b.partnerId, { customDomain: v['domain'].trim() }),
        ),
      'Domain saved. Add the DNS records shown.',
    );
  }

  protected async verifyDomain(): Promise<void> {
    const b = this.profile();
    if (!b) return;
    await this.act(
      () => firstValueFrom(this.api.verifyCustomDomain(b.partnerId, {})),
      'Domain check completed. See the domain status for the result.',
    );
  }

  // ---- clients ----

  protected async addClient(p: ResellerPartnerDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: 'Add a client workspace',
      message:
        'Records the client under this partner for billing and commission. It doesn’t create the workspace itself.',
      fields: [
        { key: 'name', label: 'Client name', required: true, maxLength: 128 },
        { key: 'plan', label: 'Plan', value: 'Professional', required: true, maxLength: 64 },
        {
          key: 'cycle',
          label: 'Billing cycle',
          value: 'Monthly',
          options: [
            { value: 'Monthly', label: 'Monthly' },
            { value: 'Annual', label: 'Annual' },
          ],
        },
        { key: 'wholesale', label: 'Wholesale rate per month (₹)', required: true },
        { key: 'price', label: 'Your price to the client per month (₹)', hint: 'Optional' },
        {
          key: 'commission',
          label: 'Commission rate (%)',
          placeholder: formatBps(p.commissionRateBps),
          hint: 'Blank uses the partner’s rate',
        },
        { key: 'notes', label: 'Notes', multiline: true, maxLength: 1000 },
      ],
      confirmText: 'Add client',
    });
    if (!v) return;
    const wholesale = rupeesToPaise(v['wholesale']);
    const price = v['price']?.trim() ? rupeesToPaise(v['price']) : undefined;
    const commission = v['commission']?.trim() ? percentToBps(v['commission']) : undefined;
    if (wholesale === null || price === null || commission === null) {
      this.toasts.warning(
        'Enter amounts in rupees and the rate as a percentage between 0 and 100.',
      );
      return;
    }
    await this.act(
      () =>
        firstValueFrom(
          this.api.provisionClientTenant(p.id, {
            clientTenantName: v['name'].trim(),
            subscribedPlanCode: v['plan'].trim(),
            billingCycle: v['cycle'] || 'Monthly',
            wholesaleRatePaise: wholesale,
            customMonthlyPricePaise: price ?? undefined,
            customCommissionRateBps: commission ?? undefined,
            notes: v['notes']?.trim() || undefined,
          }),
        ),
      'Client added.',
    );
  }

  protected async changePlan(p: ResellerPartnerDto, c: ResellerClientTenantDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: `Plan for ${c.clientTenantName}`,
      fields: [
        { key: 'plan', label: 'Plan', value: c.subscribedPlanCode, required: true, maxLength: 64 },
        {
          key: 'cycle',
          label: 'Billing cycle',
          value: c.billingCycle,
          options: [
            { value: 'Monthly', label: 'Monthly' },
            { value: 'Annual', label: 'Annual' },
          ],
        },
        {
          key: 'wholesale',
          label: 'Wholesale rate per month (₹)',
          value: String(c.wholesaleRatePaise / 100),
          required: true,
        },
        {
          key: 'price',
          label: 'Your price to the client per month (₹)',
          value: c.customMonthlyPricePaise ? String(c.customMonthlyPricePaise / 100) : '',
        },
        {
          key: 'commission',
          label: 'Commission rate (%)',
          value: String(c.commissionRateBps / 100),
        },
      ],
      confirmText: 'Save plan',
    });
    if (!v) return;
    const wholesale = rupeesToPaise(v['wholesale']);
    const price = v['price']?.trim() ? rupeesToPaise(v['price']) : undefined;
    const commission = v['commission']?.trim() ? percentToBps(v['commission']) : undefined;
    if (wholesale === null || price === null || commission === null) {
      this.toasts.warning(
        'Enter amounts in rupees and the rate as a percentage between 0 and 100.',
      );
      return;
    }
    await this.act(
      () =>
        firstValueFrom(
          this.api.updateClientTenantPlan(p.id, c.clientTenantId, {
            subscribedPlanCode: v['plan'].trim(),
            billingCycle: v['cycle'] || 'Monthly',
            wholesaleRatePaise: wholesale,
            customMonthlyPricePaise: price ?? undefined,
            customCommissionRateBps: commission ?? undefined,
          }),
        ),
      'Plan saved.',
    );
  }

  protected async deactivateClient(
    p: ResellerPartnerDto,
    c: ResellerClientTenantDto,
  ): Promise<void> {
    const v = await this.dialogs.prompt({
      title: `Deactivate ${c.clientTenantName}?`,
      message:
        'It stops counting towards this partner’s client limit and earns no further commission.',
      fields: [{ key: 'reason', label: 'Reason', multiline: true, maxLength: 1000 }],
      confirmText: 'Deactivate',
    });
    if (!v) return;
    await this.act(
      () =>
        firstValueFrom(
          this.api.deactivateClientTenant(p.id, c.clientTenantId, v['reason']?.trim() || undefined),
        ),
      'Client deactivated.',
    );
  }

  protected async reactivateClient(
    p: ResellerPartnerDto,
    c: ResellerClientTenantDto,
  ): Promise<void> {
    await this.act(
      () => firstValueFrom(this.api.reactivateClientTenant(p.id, c.clientTenantId)),
      'Client reactivated.',
    );
  }

  // ---- commissions and payouts ----

  protected async recordCommission(p: ResellerPartnerDto): Promise<void> {
    if (this.clients().length === 0) {
      this.toasts.warning('This partner has no client workspaces to record commission against.');
      return;
    }
    const v = await this.dialogs.prompt({
      title: `Record commission for ${p.companyName}`,
      message: `Credited at the partner’s rate of ${formatBps(p.commissionRateBps)}.`,
      fields: [
        {
          key: 'client',
          label: 'Client',
          required: true,
          options: this.clients().map((c) => ({
            value: c.clientTenantId,
            label: c.clientTenantName,
          })),
        },
        { key: 'invoice', label: 'Invoice number', required: true, maxLength: 64 },
        { key: 'amount', label: 'Invoice amount (₹)', required: true },
        { key: 'description', label: 'Description', required: true, maxLength: 512 },
      ],
      confirmText: 'Record',
    });
    if (!v) return;
    const amount = rupeesToPaise(v['amount']);
    if (amount === null) {
      this.toasts.warning('Enter the invoice amount in rupees.');
      return;
    }
    await this.act(
      () =>
        firstValueFrom(
          this.api.recordCommission(p.id, {
            clientTenantId: v['client'],
            invoiceReference: v['invoice'].trim(),
            grossAmountPaise: amount,
            description: v['description'].trim(),
          }),
        ),
      'Commission recorded.',
    );
  }

  protected async requestPayout(p: ResellerPartnerDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: 'Request a payout',
      message: `${formatPaise(p.accruedCommissionPaise)} is available. The platform team approves and pays it to your bank account on file.`,
      fields: [
        {
          key: 'amount',
          label: 'Amount (₹)',
          value: String(p.accruedCommissionPaise / 100),
          required: true,
        },
      ],
      confirmText: 'Request payout',
    });
    if (!v) return;
    const amount = rupeesToPaise(v['amount']);
    if (amount === null || amount > p.accruedCommissionPaise) {
      this.toasts.warning(`Enter an amount up to ${formatPaise(p.accruedCommissionPaise)}.`);
      return;
    }
    await this.act(
      () => firstValueFrom(this.api.requestPayout(p.id, { amountPaise: amount })),
      'Payout requested.',
    );
  }

  protected async approvePayout(o: ResellerPayoutDto): Promise<void> {
    await this.act(() => firstValueFrom(this.api.approvePayout(o.id)), 'Payout approved.');
  }

  protected async settlePayout(o: ResellerPayoutDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: `Mark ${o.payoutNumber} as paid`,
      message: `${formatPaise(o.amountPaise)} — enter the bank transfer reference once the money has gone.`,
      fields: [{ key: 'ref', label: 'Payment reference (UTR)', required: true, maxLength: 128 }],
      confirmText: 'Mark paid',
    });
    if (!v) return;
    await this.act(
      () => firstValueFrom(this.api.settlePayout(o.id, { paymentReference: v['ref'].trim() })),
      'Payout marked as paid.',
    );
  }

  protected async rejectPayout(o: ResellerPayoutDto): Promise<void> {
    const v = await this.dialogs.prompt({
      title: `Reject ${o.payoutNumber}`,
      message: 'The amount goes back to the partner’s commission balance.',
      fields: [
        { key: 'reason', label: 'Reason', required: true, multiline: true, maxLength: 1000 },
      ],
      confirmText: 'Reject',
    });
    if (!v) return;
    await this.act(
      () => firstValueFrom(this.api.rejectPayout(o.id, { reason: v['reason'].trim() })),
      'Payout rejected.',
    );
  }

  // ---- display helpers ----

  protected money = formatPaise;
  protected bps = formatBps;
  protected partnerStatus = (s: ResellerPartnerStatus) =>
    PARTNER_STATUS[s] ?? PARTNER_STATUS[ResellerPartnerStatus.PendingApproval];
  protected payoutStatus = (s: ResellerPayoutStatus) =>
    PAYOUT_STATUS[s] ?? PAYOUT_STATUS[ResellerPayoutStatus.Requested];
  protected domainStatus = (s: CustomDomainStatus) =>
    DOMAIN_STATUS[s] ?? DOMAIN_STATUS[CustomDomainStatus.PendingVerification];
  protected tierLabel = (t: ResellerTier) => TIER_LABEL[t] ?? String(t);
  protected billingLabel = (m: ResellerBillingModel) => BILLING_MODEL_LABEL[m] ?? String(m);
  protected clientName = (id: string) =>
    this.clients().find((c) => c.clientTenantId === id)?.clientTenantName ?? '—';
  protected date = (iso: string | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';
}
