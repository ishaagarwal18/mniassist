import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import {
  DealerNetworkService,
  NetworkMembershipDto,
  NetworkOfferDto,
  NetworkTranscriptLineDto,
} from '../../proxy/network/dealer-network.service';
import {
  DealerLinkDto,
  NetworkLeadDetailDto,
  NetworkLeadDto,
  NetworkLeadState,
  NetworkService,
  NetworkSettingsDto,
  TerritoryDto,
} from '../../proxy/network/network.service';
import { ArButton, ArChip, ArDialog, ArTabs } from '../../ui';
import type { ChipTone } from '../../ui/chip';
import {
  describeTerritory,
  LEAD_STATE_LABEL,
  leadTone,
  parseList,
  parsePins,
  place,
  timeLeft,
  title,
} from './network-logic';
import { ArRouteLeadDialog, problem } from './route-lead-dialog';
import { ConfirmService } from '../../core/ui/confirm.service';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';

const TAB_LEADS = 'Routed leads';
const TAB_DEALERS = 'Dealers';
const TAB_INCOMING = 'Leads for us';

interface TerritoryDraft {
  states: string;
  cities: string;
  pins: string;
  lines: string;
}

const toDraft = (t?: TerritoryDto): TerritoryDraft => ({
  states: (t?.states ?? []).map(title).join(', '),
  cities: (t?.cities ?? []).map(title).join(', '),
  pins: (t?.pinPrefixes ?? []).join(', '),
  lines: (t?.productLines ?? []).map(title).join(', '),
});

/**
 * S3, lead routing between an OEM and its dealers. The OEM invites dealers, gives each a territory (states, cities, PIN prefixes,
 * optionally product lines) and routes enquiries to whoever covers the customer; it then sees the dealer's stage, quotations and
 * activity on each lead. The same page is the dealer's side: join an OEM's network with its code, and accept or decline leads.
 */
@Component({
  selector: 'ar-network',
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArTabs,
    ArRouteLeadDialog,
    RouterLink,
    ArGrid,
    GridModule,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isPage) {
      <ar-topbar
        help="Your dealer network: the dealers you invite, their territories, and the enquiries routed to them and how each ended."
        [title]="pageTitle()">
        <button ar-button type="button" variant="ghost" (click)="close()">
          Back to Dealer network
        </button>
      </ar-topbar>
      <div class="ar-form-page ar-scroll">
        <ng-container *ngTemplateOutlet="formsTpl" />
      </div>
    } @else {
      <ar-topbar
        title="Dealer network"
        [subtitle]="subtitle()"
        help="For OEMs and their dealers. As the OEM: invite your dealers, give each a territory, and route enquiries to whoever covers the customer; you then see the dealer's stage, quotes and activity on every lead. As a dealer: enter the OEM's invite code, then accept or decline the leads it sends you."
      >
        @if (canManage() && runsNetwork() && tab() !== incomingTab) {
          <button ar-button type="button" variant="ghost" icon="settings" (click)="goSettings()">
            Settings
          </button>
          <button ar-button type="button" variant="primary" icon="plus" (click)="goInvite()">
            Invite a dealer
          </button>
        }
      </ar-topbar>

      <div class="nw">
        <ar-tabs [tabs]="tabs()" [(active)]="tab" />

        <div class="nw__body ar-scroll">
          @if (error(); as e) {
            <p class="nw__err" role="alert">{{ e }}</p>
          }
          @if (notice(); as n) {
            <p class="nw__ok" role="status">{{ n }}</p>
          }

          @switch (tab()) {
            @case (leadsTab) {
              <div class="filters" role="group" aria-label="Filter leads">
                @for (f of leadFilters; track f.label) {
                  <button
                    type="button"
                    class="filters__f"
                    [attr.aria-pressed]="leadFilter() === f.value"
                    (click)="leadFilter.set(f.value)"
                  >
                    {{ f.label }} <span class="ar-mono">{{ countLeads(f.value) }}</span>
                  </button>
                }
              </div>
              @if (visibleLeads().length === 0) {
                <p class="nw__hint">
                  @if (leads().length === 0) {
                    No leads routed yet. Open an enquiry on the board and choose “Route to a
                    dealer”.
                  } @else {
                    Nothing here.
                  }
                </p>
              }
              <ul class="list">
                @for (l of visibleLeads(); track l.id) {
                  <li>
                    <button type="button" class="lead" (click)="goLead(l)">
                      <span class="lead__main">
                        <span class="ar-mono lead__ref">{{ l.oemEnquiryReference }}</span>
                        <b>{{ l.title || 'Enquiry' }}</b>
                        <span class="lead__meta"
                          >{{ where(l) }}{{ l.productLine ? ' · ' + l.productLine : '' }}
                          @if (l.estimatedValueInPaise) {
                            · est. {{ money(l.estimatedValueInPaise) }}
                          }
                        </span>
                        @if (l.note && l.state === 'Unrouted') {
                          <span class="lead__note" translate="no">{{ l.note }}</span>
                        }
                      </span>
                      <span class="lead__side">
                        <ar-chip [tone]="tone(l.state)" [dot]="true">{{
                          stateLabel(l.state)
                        }}</ar-chip>
                        @if (l.dealerName) {
                          <span class="lead__dealer">{{ l.dealerName }}</span>
                        }
                        @if (l.state === 'Offered') {
                          <small>{{ left(l.answerByUtc) }}</small>
                        } @else if (l.dealerStage && l.state === 'Accepted') {
                          <small
                            >{{ l.dealerStage
                            }}{{
                              l.quotedInPaise ? ' · quoted ' + money(l.quotedInPaise) : ''
                            }}</small
                          >
                        }
                      </span>
                    </button>
                  </li>
                }
              </ul>
            }

            @case (dealersTab) {
              @if (dealers().length === 0) {
                <p class="nw__hint">
                  No dealers yet. Invite one: they get a code to enter in their own MNI Assist
                  workspace, and from then on you can send them leads in their territory.
                </p>
              }
              <ul class="list">
                @for (d of dealers(); track d.id) {
                  <li class="dealer" [class.dealer--ended]="d.state === 'Ended'">
                    <div class="dealer__head">
                      <b>{{ d.dealerName }}</b>
                      <ar-chip [tone]="linkTone(d.state)">{{ d.state }}</ar-chip>
                      <span class="dealer__counts ar-mono"
                        >{{ d.openLeads }} open · {{ d.wonLeads }} won ·
                        {{ d.lostLeads }} lost</span
                      >
                    </div>
                    <p class="dealer__terr">{{ territory(d.territory) }}</p>
                    @if (d.inviteCode) {
                      <p class="dealer__code">
                        Invite code <span class="ar-mono">{{ d.inviteCode }}</span>
                        <small>· valid until {{ date(d.inviteExpiresAtUtc) }}</small>
                      </p>
                    }
                    @if (canManage() && d.state !== 'Ended') {
                      <div class="dealer__acts">
                        @if (d.inviteCode) {
                          <button ar-button type="button" variant="ghost" (click)="copyCode(d)">
                            Copy code
                          </button>
                          <button
                            ar-button
                            type="button"
                            variant="ghost"
                            [disabled]="busy() === d.id"
                            (click)="linkAction(d, 'renew')"
                          >
                            New code
                          </button>
                        }
                        <button ar-button type="button" variant="ghost" (click)="goTerritory(d)">
                          Edit territory
                        </button>
                        @if (d.state === 'Active') {
                          <button
                            ar-button
                            type="button"
                            variant="ghost"
                            [disabled]="busy() === d.id"
                            (click)="linkAction(d, 'suspend')"
                          >
                            Pause new leads
                          </button>
                        } @else if (d.state === 'Suspended') {
                          <button
                            ar-button
                            type="button"
                            variant="ghost"
                            [disabled]="busy() === d.id"
                            (click)="linkAction(d, 'resume')"
                          >
                            Resume
                          </button>
                        }
                        <button
                          ar-button
                          type="button"
                          variant="ghost"
                          [disabled]="busy() === d.id"
                          (click)="linkAction(d, 'end')"
                        >
                          End link
                        </button>
                      </div>
                    }
                  </li>
                }
              </ul>
            }

            @case (incomingTab) {
              @if (!runsNetwork()) {
                <p class="nw__hint">
                  Joining an OEM's dealer network and receiving its leads is free on every plan.
                  Running your own dealer network (inviting dealers and routing leads to them) is
                  part of Enterprise.
                </p>
              }
              @if (canManage()) {
                <form class="join" (submit)="$event.preventDefault(); join()">
                  <label class="ar-field" for="nw-code">
                    <span class="ar-field__label">Join an OEM's network with its invite code</span>
                    <input
                      id="nw-code"
                      class="ar-field__input ar-mono"
                      autocomplete="off"
                      placeholder="K7PX3MRT2A"
                      [value]="code()"
                      (input)="code.set($any($event.target).value)"
                    />
                  </label>
                  <button
                    ar-button
                    type="submit"
                    variant="primary"
                    [disabled]="!code().trim() || busy() === 'join'"
                  >
                    {{ busy() === 'join' ? 'Joining…' : 'Join' }}
                  </button>
                </form>
              }
              @if (memberships().length) {
                <section class="members" aria-label="Networks you belong to">
                  @for (m of memberships(); track m.id) {
                    <div class="members__m">
                      <b>{{ m.oemName }}</b>
                      <ar-chip [tone]="linkTone(m.state)">{{ m.state }}</ar-chip>
                      <span class="members__t">Your territory: {{ territory(m.territory) }}</span>
                      @if (canManage() && m.state !== 'Ended') {
                        <button
                          ar-button
                          type="button"
                          variant="ghost"
                          [disabled]="busy() === m.id"
                          (click)="leave(m)"
                        >
                          Leave
                        </button>
                      }
                    </div>
                  }
                </section>
              }
              @if (offers().length === 0) {
                <p class="nw__hint">
                  No leads offered to you right now. When an OEM you work with sends one, it shows
                  here and in your notifications.
                </p>
              }
              <ul class="list">
                @for (o of offers(); track o.id) {
                  <li class="offer">
                    <div class="offer__head">
                      <b>{{ o.title || 'Enquiry' }}</b>
                      <ar-chip
                        [tone]="o.state === 'Offered' ? 'warn' : tone(o.state)"
                        [dot]="true"
                        >{{ o.state === 'Offered' ? left(o.answerByUtc) : o.state }}</ar-chip
                      >
                    </div>
                    <p class="offer__meta">
                      From {{ o.oemName }} · {{ where(o)
                      }}{{ o.productLine ? ' · ' + o.productLine : '' }}
                      @if (o.estimatedValueInPaise) {
                        · est. {{ money(o.estimatedValueInPaise) }}
                      }
                    </p>
                    @if (o.requirement) {
                      <p class="offer__req">{{ o.requirement }}</p>
                    }
                    @if (o.state === 'Offered') {
                      <p class="offer__consent">
                        The customer's name and number are shared once you accept.
                        <small>{{ o.consentNote }}</small>
                      </p>
                      <div class="offer__acts">
                        <button
                          ar-button
                          type="button"
                          variant="ghost"
                          [disabled]="busy() === o.id"
                          (click)="decline(o)"
                        >
                          Decline
                        </button>
                        <button
                          ar-button
                          type="button"
                          variant="primary"
                          [disabled]="busy() === o.id"
                          (click)="accept(o)"
                        >
                          {{ busy() === o.id ? 'Accepting…' : 'Accept lead' }}
                        </button>
                      </div>
                    } @else if (o.dealerEnquiryId) {
                      <div class="offer__acts">
                        @if (o.hasConversation) {
                          <button
                            ar-button
                            type="button"
                            variant="ghost"
                            [disabled]="busy() === o.id"
                            (click)="goConversation(o)"
                          >
                            Conversation
                          </button>
                        }
                        @if (o.state === 'Accepted') {
                          <button
                            ar-button
                            type="button"
                            variant="ghost"
                            [disabled]="busy() === o.id"
                            (click)="handBack(o)"
                          >
                            Hand back
                          </button>
                        }
                        <a
                          class="offer__link"
                          routerLink="/enquiries"
                          [queryParams]="{ open: o.dealerEnquiryId }"
                          >Open the enquiry →</a
                        >
                      </div>
                    }
                  </li>
                }
              </ul>
            }
          }
        </div>
      </div>
    }

    <ng-template #formsTpl>
      @if (inviteOpen()) {
        <ar-dialog
          [title]="editing() ? 'Territory · ' + editing()!.dealerName : 'Invite a dealer'"
          (dismiss)="close()"
        >
          @if (created(); as c) {
            <p class="nw__hint">
              Send <b>{{ c.dealerName }}</b> this code. They enter it under Dealer network → Leads
              for us in their own MNI Assist workspace. It works once, for 14 days.
            </p>
            <p class="bigcode ar-mono">{{ c.inviteCode }}</p>
          } @else {
            @if (!editing()) {
              <label class="ar-field" for="nw-name">
                <span class="ar-field__label">Dealer's name</span>
                <input
                  required
                  maxlength="128"
                  id="nw-name"
                  class="ar-field__input"
                  placeholder="Pune Automation Pvt Ltd"
                  [value]="dealerName()"
                  (input)="dealerName.set($any($event.target).value)"
                />
              </label>
            }
            <p class="nw__hint">
              The most specific match wins: a PIN prefix beats a city, a city beats a state. Dealers
              matching equally take turns. Separate entries with commas.
            </p>
            <label class="ar-field" for="nw-pins">
              <span class="ar-field__label"
                >PIN code prefixes <span class="ar-field__opt">(e.g. 4110, 41102)</span></span
              >
              <input
                id="nw-pins"
                class="ar-field__input ar-mono"
                inputmode="numeric"
                [value]="terr().pins"
                (input)="setTerr('pins', $any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="nw-cities">
              <span class="ar-field__label"
                >Cities <span class="ar-field__opt">optional</span></span
              >
              <input
                id="nw-cities"
                class="ar-field__input"
                placeholder="Pune, Pimpri-Chinchwad"
                [value]="terr().cities"
                (input)="setTerr('cities', $any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="nw-states">
              <span class="ar-field__label"
                >States <span class="ar-field__opt">optional</span></span
              >
              <input
                id="nw-states"
                class="ar-field__input"
                placeholder="Maharashtra"
                [value]="terr().states"
                (input)="setTerr('states', $any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="nw-lines">
              <span class="ar-field__label"
                >Product lines
                <span class="ar-field__opt"
                  >(optional; blank = everything. Matched with the enquiry's “product_line”)</span
                ></span
              >
              <input
                id="nw-lines"
                class="ar-field__input"
                placeholder="Drives, Soft starters"
                [value]="terr().lines"
                (input)="setTerr('lines', $any($event.target).value)"
              />
            </label>
          }
          @if (dialogError(); as e) {
            <p class="nw__err" role="alert">{{ e }}</p>
          }
          <div dialogActions>
            @if (created()) {
              <button ar-button type="button" variant="ghost" (click)="copyCode(created()!)">
                Copy code
              </button>
              <button ar-button type="button" variant="primary" (click)="close()">Done</button>
            } @else {
              <button ar-button type="button" variant="ghost" (click)="close()">Cancel</button>
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy() === 'invite'"
                (click)="saveDealer()"
              >
                {{ editing() ? 'Save territory' : 'Create invite' }}
              </button>
            }
          </div>
        </ar-dialog>
      }

      @if (conversation(); as c) {
        <ar-dialog [title]="'Conversation with ' + c.offer.oemName" (dismiss)="close()">
          <p class="nw__hint">
            {{ c.offer.oemName }}'s WhatsApp conversation with the customer before the lead came to
            you ({{ c.offer.oemEnquiryReference }}). A copy: reply from your own inbox.
          </p>
          <ol class="chat" aria-label="Messages">
            @for (m of c.lines; track $index) {
              <li class="chat__m" [class.chat__m--them]="!m.fromCustomer">
                <small
                  >{{ m.fromCustomer ? 'Customer' : c.offer.oemName }} · {{ date(m.atUtc) }}</small
                >
                <span translate="no">{{ m.text }}</span>
              </li>
            } @empty {
              <li class="nw__hint">No messages were shared.</li>
            }
          </ol>
        </ar-dialog>
      }

      @if (settingsOpen()) {
        <ar-dialog title="Network settings" (dismiss)="close()">
          <label class="check" for="nw-reroute">
            <input
              id="nw-reroute"
              type="checkbox"
              [checked]="settings().rerouteAutomatically"
              (change)="patchSettings({ rerouteAutomatically: $any($event.target).checked })"
            />
            <span
              >When a dealer declines or doesn't answer in time, offer the lead to the next match
              <small>Off: it comes back to your queue for you to decide.</small></span
            >
          </label>
          <label class="ar-field" for="nw-hours">
            <span class="ar-field__label">Hours a dealer has to accept (1–168)</span>
            <input
              required
              id="nw-hours"
              class="ar-field__input"
              inputmode="numeric"
              [value]="settings().answerWithinHours"
              (input)="patchSettings({ answerWithinHours: +$any($event.target).value })"
            />
          </label>
          <label class="ar-field" for="nw-consent">
            <span class="ar-field__label"
              >Consent wording: how your customers learn a dealer may contact them
              <span class="ar-field__opt"
                >(your team confirms it before routing; recorded on every lead and shown to the
                dealer; leave blank for the standard wording)</span
              ></span
            >
            <textarea
              id="nw-consent"
              class="ar-field__input"
              rows="3"
              maxlength="512"
              [value]="settings().consentNote ?? ''"
              (input)="patchSettings({ consentNote: $any($event.target).value })"
            ></textarea>
          </label>
          <label class="check" for="nw-share">
            <input
              id="nw-share"
              type="checkbox"
              [checked]="!!settings().shareConversation"
              (change)="patchSettings({ shareConversation: $any($event.target).checked })"
            />
            <span
              >Give the dealer who accepts the customer's WhatsApp conversation with you
              <small
                >The last 100 messages, as a read-only copy; photos and documents are named, not
                sent. Only switch this on if your consent wording tells customers their conversation
                may be shared with the dealer.</small
              ></span
            >
          </label>
          @if (dialogError(); as e) {
            <p class="nw__err" role="alert">{{ e }}</p>
          }
          <div dialogActions>
            <button ar-button type="button" variant="ghost" (click)="close()">Cancel</button>
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy() === 'settings'"
              (click)="saveSettings()"
            >
              Save
            </button>
          </div>
        </ar-dialog>
      }

      @if (lead(); as d) {
        <ar-dialog
          [title]="d.oemEnquiryReference + ' · ' + stateLabel(d.state)"
          (dismiss)="close()"
        >
          <p class="nw__hint">
            <b>{{ d.title || 'Enquiry' }}</b> · {{ where(d)
            }}{{ d.productLine ? ' · ' + d.productLine : '' }}
            @if (d.dealerName) {
              · {{ d.dealerName }}
            }
          </p>
          @if (d.note) {
            <p class="nw__hint">{{ d.note }}</p>
          }
          @if (d.skippedDealers.length) {
            <p class="nw__hint">Won't be offered again to: {{ d.skippedDealers.join(', ') }}</p>
          }
          @if (d.snapshot; as s) {
            <div class="snap">
              <div class="snap__facts">
                <span
                  ><small>Dealer's ref.</small
                  ><b class="ar-mono">{{ s.dealerEnquiryReference }}</b></span
                >
                <span
                  ><small>Stage</small><b>{{ s.stage }}</b></span
                >
                <span
                  ><small>Owner</small><b>{{ s.ownerName || 'Unassigned' }}</b></span
                >
                <span
                  ><small>First response</small
                  ><b>{{
                    s.firstResponseMinutes == null ? '—' : minutes(s.firstResponseMinutes)
                  }}</b></span
                >
              </div>
              @if (s.lostReason) {
                <p class="nw__err">Lost: {{ s.lostReason }}</p>
              }
              @for (q of s.quotations; track q.reference) {
                <section class="quote">
                  <h3>
                    <span class="ar-mono">{{ q.reference }}</span> · {{ q.state }} ·
                    {{ money(q.subtotalInPaise + q.taxInPaise) }}
                    @if (q.issuedAtUtc) {
                      <small>sent {{ date(q.issuedAtUtc) }}</small>
                    }
                  </h3>
                  <div class="quote__wrap">
                    <ejs-grid
                      arGrid="network-quote-lines"
                      [dataSource]="q.lines"
                      aria-label="Quote items"
                    >
                      <e-columns>
                        <e-column field="partNumber" headerText="Part" width="150">
                          <ng-template #template let-ln>
                            <span class="ar-mono">{{ ln.partNumber || '—' }}</span>
                          </ng-template>
                        </e-column>
                        <e-column
                          field="description"
                          headerText="Description"
                          width="220"
                        ></e-column>
                        <e-column headerText="Qty" width="110" [textAlign]="'Right'">
                          <ng-template #template let-ln>
                            {{ ln.quantity }} {{ ln.unit }}
                          </ng-template>
                        </e-column>
                        <e-column
                          field="unitPriceInPaise"
                          headerText="Unit price"
                          width="130"
                          [textAlign]="'Right'"
                        >
                          <ng-template #template let-ln>
                            {{ money(ln.unitPriceInPaise) }}
                          </ng-template>
                        </e-column>
                        <e-column headerText="Disc." width="100" [textAlign]="'Right'">
                          <ng-template #template let-ln>
                            {{ ln.discountBasisPoints ? ln.discountBasisPoints / 100 + '%' : '—' }}
                          </ng-template>
                        </e-column>
                      </e-columns>
                    </ejs-grid>
                  </div>
                </section>
              }
              @if (s.activity.length) {
                <ol class="act">
                  @for (e of s.activity; track $index) {
                    <li>
                      <small>{{ date(e.atUtc) }}</small> {{ e.summary || e.kind }}
                    </li>
                  }
                </ol>
              }
              <p class="nw__hint">Updated {{ date(d.snapshotAtUtc) }}; refreshed hourly.</p>
            </div>
          } @else if (d.state === 'Offered') {
            <p class="nw__hint">
              Waiting for {{ d.dealerName }} to accept · {{ left(d.answerByUtc) }}.
            </p>
          }
          <p class="nw__hint">
            <small>Consent: {{ d.consentNote }}</small>
          </p>
          @if (dialogError(); as e) {
            <p class="nw__err" role="alert">{{ e }}</p>
          }
          <div dialogActions>
            @if (canRoute()) {
              @if (d.state === 'Accepted' || d.state === 'Won' || d.state === 'Lost') {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  icon="refresh"
                  [disabled]="busy() === d.id"
                  (click)="refresh(d)"
                >
                  Refresh now
                </button>
              }
              @if (d.state === 'Offered' || d.state === 'Accepted') {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy() === d.id"
                  (click)="recall(d)"
                >
                  Take back
                </button>
              }
              @if (d.state === 'Unrouted') {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy() === d.id"
                  (click)="closeLead(d)"
                >
                  Close without a dealer
                </button>
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  (click)="routing.set(d.oemEnquiryId); lead.set(null)"
                >
                  Route again
                </button>
              }
            }
          </div>
        </ar-dialog>
      }

      @if (routing(); as enquiryId) {
        <ar-route-lead-dialog [enquiryId]="enquiryId" (closed)="routed($event); close()" />
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .nw {
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
      padding: 8px 20px 0;
    }
    .nw__body {
      padding: 14px 0 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
    }
    .nw__hint {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 75ch;
    }
    .nw__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .nw__ok {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-good-600, #067647);
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .filters__f {
      border: 1px solid var(--ar-line-200);
      background: var(--ar-white);
      border-radius: 999px;
      padding: 4px 10px;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700, #344054);
      cursor: pointer;
    }
    .filters__f[aria-pressed='true'] {
      background: var(--ar-inverse-bg);
      border-color: var(--ar-inverse-bg);
      color: var(--ar-inverse-fg);
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .lead {
      width: 100%;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      text-align: left;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 10px 14px;
      font: 400 13px var(--ar-font-sans);
      color: inherit;
      cursor: pointer;
    }
    .lead:hover {
      border-color: var(--ar-ink-300, #98a2b3);
    }
    .lead:focus-visible,
    .filters__f:focus-visible {
      outline: 2px solid var(--ar-teal-600, #0d9488);
      outline-offset: 2px;
    }
    .lead__main {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1 1 260px;
    }
    .lead__ref {
      font-size: 11.5px;
      color: var(--ar-ink-500);
    }
    .lead__meta,
    .lead__note {
      font-size: 12px;
      color: var(--ar-ink-500);
    }
    .lead__note {
      color: var(--ar-amber-700, #b54708);
    }
    .lead__side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
      font-size: 12px;
    }
    .lead__side small {
      color: var(--ar-ink-500);
    }
    .lead__dealer {
      font-weight: 500;
    }
    .dealer,
    .offer {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font: 400 13px var(--ar-font-sans);
    }
    .dealer--ended {
      opacity: 0.6;
    }
    .chat {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 60vh;
      overflow: auto;
    }
    .chat__m {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 85%;
      padding: 6px 10px;
      border-radius: 10px;
      background: var(--ar-bg-100);
      font: 400 13px/1.45 var(--ar-font-sans);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .chat__m--them {
      align-self: flex-end;
      background: var(--ar-teal-50, #e6f6f4);
    }
    .chat__m small {
      color: var(--ar-ink-500);
      font-size: 11px;
    }
    .dealer__head,
    .offer__head {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .dealer__counts {
      margin-left: auto;
      font-size: 12px;
      color: var(--ar-ink-500);
    }
    .dealer__terr,
    .dealer__code,
    .offer__meta,
    .offer__req,
    .offer__consent {
      margin: 0;
      color: var(--ar-ink-600, #475467);
      font-size: 12.5px;
    }
    .offer__consent small {
      display: block;
      color: var(--ar-ink-500);
    }
    .dealer__code small {
      color: var(--ar-ink-500);
    }
    .dealer__acts,
    .offer__acts {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .offer__acts {
      justify-content: flex-end;
    }
    .offer__link {
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
    }
    .join {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-wrap: wrap;
    }
    .join .ar-field {
      flex: 1 1 240px;
      max-width: 360px;
    }
    .members {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .members__m {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      font: 400 13px var(--ar-font-sans);
    }
    .members__t {
      color: var(--ar-ink-500);
      font-size: 12.5px;
      flex: 1;
    }
    .bigcode {
      margin: 8px 0;
      font-size: 26px;
      letter-spacing: 0.12em;
      text-align: center;
    }
    .check {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font: 400 13px/1.45 var(--ar-font-sans);
    }
    .check small {
      display: block;
      color: var(--ar-ink-500);
    }
    .check input {
      margin-top: 3px;
    }
    .snap {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .snap__facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      font: 400 13px var(--ar-font-sans);
    }
    .snap__facts span {
      display: flex;
      flex-direction: column;
    }
    .snap__facts small {
      color: var(--ar-ink-500);
      font-size: 11.5px;
    }
    .quote h3 {
      margin: 0 0 4px;
      font: 600 13px var(--ar-font-sans);
    }
    .quote h3 small {
      font-weight: 400;
      color: var(--ar-ink-500);
    }
    .quote__wrap {
      overflow-x: auto;
    }
    .quote table {
      width: 100%;
      border-collapse: collapse;
      font: 400 12.5px var(--ar-font-sans);
    }
    .quote th,
    .quote td {
      padding: 4px 6px;
      border-bottom: 1px solid var(--ar-line-100, #eef0f2);
      text-align: left;
      vertical-align: top;
    }
    .quote th {
      font-weight: 600;
      color: var(--ar-ink-500);
    }
    .quote .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .act {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 180px;
      overflow: auto;
      font: 400 12.5px/1.5 var(--ar-font-sans);
    }
    .act small {
      color: var(--ar-ink-500);
      margin-right: 6px;
    }
    @media (max-width: 560px) {
      .nw {
        padding-inline: 12px;
      }
      .lead__side {
        align-items: flex-start;
      }
    }
  `,
})
export class ArNetwork {
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(NetworkService);
  private readonly dealerApi = inject(DealerNetworkService);
  private readonly permissions = inject(PermissionService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly canManage = grantedPolicy('AutoReach.Network.Manage', this.permissions);
  protected readonly canRoute = grantedPolicy('AutoReach.Network.Route', this.permissions);

  protected readonly leadsTab = TAB_LEADS;
  protected readonly dealersTab = TAB_DEALERS;
  protected readonly incomingTab = TAB_INCOMING;
  /**
   * Whether this workspace can run its own network (Enterprise, or the add-on). Until the answer arrives, assume it can: the server
   * checks anyway. A workspace that can't sees only the dealer side, which is free on every plan.
   */
  protected readonly runsNetwork = signal(true);
  protected readonly tabs = computed(() =>
    this.runsNetwork() ? [TAB_LEADS, TAB_DEALERS, TAB_INCOMING] : [TAB_INCOMING],
  );
  protected readonly tab = signal<string>(
    this.route?.snapshot?.data?.['tab'] === 'incoming' ? TAB_INCOMING : TAB_LEADS,
  );

  protected readonly pageTitle = computed(() => {
    switch (this.mode) {
      case 'invite':
        return 'Invite a dealer';
      case 'territory':
        return this.editing() ? `Territory · ${this.editing()!.dealerName}` : 'Dealer territory';
      case 'settings':
        return 'Network settings';
      case 'lead':
        return this.lead()
          ? `${this.lead()!.oemEnquiryReference} · ${this.stateLabel(this.lead()!.state)}`
          : 'Lead details';
      case 'conversation':
        return this.conversation()
          ? `Conversation with ${this.conversation()!.offer.oemName}`
          : 'Customer conversation';
      default:
        return 'Dealer network';
    }
  });

  protected readonly dealers = signal<DealerLinkDto[]>([]);
  protected readonly leads = signal<NetworkLeadDto[]>([]);
  protected readonly memberships = signal<NetworkMembershipDto[]>([]);
  protected readonly offers = signal<NetworkOfferDto[]>([]);
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly dialogError = signal<string | null>(null);

  protected readonly leadFilters: { label: string; value: NetworkLeadState | null }[] = [
    { label: 'All', value: null },
    { label: 'Your queue', value: 'Unrouted' },
    { label: 'Waiting', value: 'Offered' },
    { label: 'With dealers', value: 'Accepted' },
    { label: 'Won', value: 'Won' },
    { label: 'Lost', value: 'Lost' },
  ];
  protected readonly leadFilter = signal<NetworkLeadState | null>(null);
  protected readonly visibleLeads = computed(() => {
    const f = this.leadFilter();
    return f ? this.leads().filter((l) => l.state === f) : this.leads();
  });

  protected readonly subtitle = computed(() => {
    if (this.tab() === TAB_INCOMING) {
      const waiting = this.offers().filter((o) => o.state === 'Offered').length;
      return `${waiting} lead${waiting === 1 ? '' : 's'} waiting for your answer`;
    }
    const active = this.dealers().filter((d) => d.state === 'Active').length;
    const queue = this.leads().filter((l) => l.state === 'Unrouted').length;
    return `${active} active dealer${active === 1 ? '' : 's'} · ${queue} in your queue`;
  });

  // Dialog state.
  protected readonly inviteOpen = signal(false);
  protected readonly editing = signal<DealerLinkDto | null>(null);
  protected readonly created = signal<DealerLinkDto | null>(null);
  protected readonly dealerName = signal('');
  protected readonly terr = signal<TerritoryDraft>(toDraft());
  protected readonly settingsOpen = signal(false);
  protected readonly settings = signal<NetworkSettingsDto>({
    rerouteAutomatically: true,
    answerWithinHours: 24,
  });
  protected readonly lead = signal<NetworkLeadDetailDto | null>(null);
  protected readonly routing = signal<string | null>(null);
  protected readonly code = signal('');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.error.set(null);

    // Each side loads on its own: a dealer's workspace has no dealers of its own, and an OEM's may never have joined anyone.
    const settle = <T>(p: Promise<T>, set: (v: T) => void) =>
      p
        .then(set)
        .catch((e: unknown) =>
          this.error.set(problem(e, 'Part of the network could not be loaded.')),
        );
    await Promise.all([
      settle(firstValueFrom(this.api.getSettings()), (v) => {
        this.runsNetwork.set(v.canRunNetwork !== false);
        if (v.canRunNetwork === false) this.tab.set(TAB_INCOMING);
      }),
      settle(firstValueFrom(this.api.getDealers()), (v) => this.dealers.set(v)),
      settle(firstValueFrom(this.api.getLeads()), (v) => this.leads.set(v)),
      settle(firstValueFrom(this.dealerApi.getMemberships()), (v) => this.memberships.set(v)),
      settle(firstValueFrom(this.dealerApi.getOffers()), (v) => this.offers.set(v)),
    ]);
    this.checkRouteParam();
  }

  private checkRouteParam(): void {
    if (this.mode === 'invite') {
      this.openInvite();
    } else if (this.mode === 'territory') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const d = this.dealers().find((x) => x.id === id);
      if (d) this.openTerritory(d);
      else this.openInvite();
    } else if (this.mode === 'settings') {
      void this.openSettings();
    } else if (this.mode === 'lead') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const l = this.leads().find((x) => x.id === id);
      if (l) void this.openLead(l);
    } else if (this.mode === 'conversation') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const o = this.offers().find((x) => x.id === id);
      if (o) void this.openConversation(o);
    }
  }

  protected goInvite(): void {
    if (this.router) void this.router.navigate(['/network/invite']);
    else this.openInvite();
  }

  protected goTerritory(d: DealerLinkDto): void {
    if (this.router && d.id) void this.router.navigate(['/network/dealers', d.id, 'edit']);
    else this.openTerritory(d);
  }

  protected goSettings(): void {
    if (this.router) void this.router.navigate(['/network/settings']);
    else void this.openSettings();
  }

  protected goLead(l: NetworkLeadDto): void {
    if (this.router && l.id) void this.router.navigate(['/network/leads', l.id]);
    else void this.openLead(l);
  }

  protected goConversation(o: NetworkOfferDto): void {
    if (this.router && o.id) void this.router.navigate(['/network/offers', o.id, 'conversation']);
    else void this.openConversation(o);
  }

  protected close(): void {
    this.inviteOpen.set(false);
    this.settingsOpen.set(false);
    this.lead.set(null);
    this.conversation.set(null);
    this.routing.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/network']);
    }
  }

  protected countLeads(state: NetworkLeadState | null): number {
    return state ? this.leads().filter((l) => l.state === state).length : this.leads().length;
  }

  protected tone(state: string): ChipTone {
    return leadTone(state);
  }

  protected linkTone(state: string): ChipTone {
    return state === 'Active'
      ? 'good'
      : state === 'Invited'
        ? 'amber'
        : state === 'Suspended'
          ? 'warn'
          : 'neutral';
  }

  protected stateLabel(state: NetworkLeadState): string {
    return LEAD_STATE_LABEL[state] ?? state;
  }

  protected where(l: {
    customerPin?: string | null;
    customerCity?: string | null;
    customerState?: string | null;
  }): string {
    return place(l.customerPin, l.customerCity, l.customerState);
  }

  protected territory(t: TerritoryDto): string {
    return describeTerritory(t);
  }

  protected left(iso?: string | null): string {
    return timeLeft(iso);
  }

  protected money(paise: number): string {
    return inr(paise);
  }

  protected minutes(m: number): string {
    return m < 60
      ? `${m} min`
      : m < 2880
        ? `${Math.round(m / 60)} h`
        : `${Math.round(m / 1440)} days`;
  }

  protected date(iso?: string | null): string {
    return iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
  }

  // ---- Dealers ---------------------------------------------------------------------------------------------------------------

  protected openInvite(): void {
    this.editing.set(null);
    this.created.set(null);
    this.dealerName.set('');
    this.terr.set(toDraft());
    this.dialogError.set(null);
    this.inviteOpen.set(true);
  }

  protected openTerritory(d: DealerLinkDto): void {
    this.editing.set(d);
    this.created.set(null);
    this.terr.set(toDraft(d.territory));
    this.dialogError.set(null);
    this.inviteOpen.set(true);
  }

  protected setTerr(key: keyof TerritoryDraft, value: string): void {
    this.terr.update((t) => ({ ...t, [key]: value }));
  }

  protected async saveDealer(): Promise<void> {
    const t = this.terr();
    const { pins, bad } = parsePins(t.pins);
    if (bad.length) {
      this.dialogError.set(`PIN prefixes are 1 to 6 digits: check ${bad.join(', ')}.`);
      return;
    }
    const territory: TerritoryDto = {
      states: parseList(t.states),
      cities: parseList(t.cities),
      pinPrefixes: pins,
      productLines: parseList(t.lines),
    };
    const editing = this.editing();
    if (!editing && !this.dealerName().trim()) {
      this.dialogError.set("Enter the dealer's name.");
      return;
    }
    this.busy.set('invite');
    this.dialogError.set(null);
    try {
      if (editing) {
        const saved = await firstValueFrom(this.api.updateTerritory(editing.id, territory));
        this.dealers.update((list) => list.map((d) => (d.id === saved.id ? saved : d)));
        this.inviteOpen.set(false);
        this.notice.set(`${saved.dealerName}'s territory saved.`);
      } else {
        const made = await firstValueFrom(
          this.api.invite({ dealerName: this.dealerName().trim(), territory }),
        );
        this.dealers.update((list) => [made, ...list]);
        this.created.set(made);
        this.tab.set(TAB_DEALERS);
      }
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'That could not be saved.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async copyCode(d: DealerLinkDto): Promise<void> {
    try {
      await navigator.clipboard.writeText(d.inviteCode ?? '');
      this.notice.set(`Code for ${d.dealerName} copied.`);
    } catch {
      this.error.set('Copying was blocked by the browser. Select the code and copy it.');
    }
  }

  protected async linkAction(
    d: DealerLinkDto,
    action: 'renew' | 'suspend' | 'resume' | 'end',
  ): Promise<void> {
    if (
      action === 'end' &&
      !(await this.dialogs.confirm({
        title: `End the link with ${d.dealerName}?`,
        message: 'Leads waiting for them come back to you; leads they accepted stay with them.',
        confirmText: 'End link',
        tone: 'danger',
      }))
    )
      return;
    this.busy.set(d.id);
    this.error.set(null);
    try {
      const call = {
        renew: this.api.renewInvite,
        suspend: this.api.suspend,
        resume: this.api.resume,
        end: this.api.end,
      }[action];
      const next = await firstValueFrom(call(d.id));
      this.dealers.update((list) => list.map((x) => (x.id === d.id ? next : x)));
      if (action === 'end') this.leads.set(await firstValueFrom(this.api.getLeads()));
    } catch (e: unknown) {
      this.error.set(problem(e, 'That did not work. Try again.'));
    } finally {
      this.busy.set(null);
    }
  }

  // ---- Settings --------------------------------------------------------------------------------------------------------------

  protected async openSettings(): Promise<void> {
    this.dialogError.set(null);
    this.settingsOpen.set(true);

    try {
      this.settings.set(await firstValueFrom(this.api.getSettings()));
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'Could not load the settings.'));
    }
  }

  protected patchSettings(patch: Partial<NetworkSettingsDto>): void {
    this.settings.update((s) => ({ ...s, ...patch }));
  }

  protected async saveSettings(): Promise<void> {
    const s = this.settings();
    if (
      !Number.isInteger(s.answerWithinHours) ||
      s.answerWithinHours < 1 ||
      s.answerWithinHours > 168
    ) {
      this.dialogError.set('Give dealers 1 to 168 hours to accept.');
      return;
    }
    this.busy.set('settings');
    try {
      this.settings.set(await firstValueFrom(this.api.updateSettings(s)));
      this.settingsOpen.set(false);
      this.notice.set('Network settings saved.');
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'The settings could not be saved.'));
    } finally {
      this.busy.set(null);
    }
  }

  // ---- Leads (OEM) -----------------------------------------------------------------------------------------------------------

  protected async openLead(l: NetworkLeadDto): Promise<void> {
    this.dialogError.set(null);

    try {
      this.lead.set(await firstValueFrom(this.api.getLead(l.id)));
    } catch (e: unknown) {
      this.error.set(problem(e, 'Could not open the lead.'));
    }
  }

  private async leadAction(d: NetworkLeadDetailDto, work: () => Promise<unknown>): Promise<void> {
    this.busy.set(d.id);
    this.dialogError.set(null);
    try {
      await work();

      this.leads.set(await firstValueFrom(this.api.getLeads()));
      const fresh = this.leads().find((x) => x.id === d.id);
      if (fresh) this.lead.set(await firstValueFrom(this.api.getLead(d.id)));
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'That did not work. Try again.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected refresh(d: NetworkLeadDetailDto): Promise<void> {
    return this.leadAction(d, async () => {
      this.lead.set(await firstValueFrom(this.api.refresh(d.id)));
    });
  }

  protected async recall(d: NetworkLeadDetailDto): Promise<void> {
    const answer = await this.dialogs.prompt({
      title: `Take ${d.oemEnquiryReference} back?`,
      message: `${d.dealerName} loses the lead, and you can route it again.`,
      fields: [{ key: 'reason', label: 'Reason', maxLength: 500 }],
      confirmText: 'Take back',
    });
    if (!answer) return;
    const reason = answer['reason'];
    return this.leadAction(d, () => firstValueFrom(this.api.recall(d.id, { reason })));
  }

  protected async closeLead(d: NetworkLeadDetailDto): Promise<void> {
    const answer = await this.dialogs.prompt({
      title: 'Close this lead without a dealer?',
      fields: [{ key: 'reason', label: 'Reason', maxLength: 500 }],
      confirmText: 'Close lead',
    });
    if (!answer) return;
    const reason = answer['reason'];
    return this.leadAction(d, async () => {
      await firstValueFrom(this.api.close(d.id, { reason }));
      this.lead.set(null);
    });
  }

  protected async routed(result: NetworkLeadDto | null): Promise<void> {
    this.routing.set(null);
    if (!result) return;
    this.notice.set(
      result.state === 'Offered'
        ? `${result.oemEnquiryReference} offered to ${result.dealerName}.`
        : `${result.oemEnquiryReference} is in your queue: no dealer covers it yet.`,
    );
    this.leads.set(await firstValueFrom(this.api.getLeads()));
  }

  // ---- The dealer's side -----------------------------------------------------------------------------------------------------

  protected async join(): Promise<void> {
    this.busy.set('join');
    this.error.set(null);
    try {
      const m = await firstValueFrom(this.dealerApi.join(this.code().trim()));
      this.memberships.update((list) => [m, ...list]);
      this.code.set('');
      this.notice.set(`You're in ${m.oemName}'s network. Leads they send you show here.`);
    } catch (e: unknown) {
      this.error.set(problem(e, 'That code did not work.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async leave(m: NetworkMembershipDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Leave ${m.oemName}'s network?`,
        message: 'Leads you already accepted stay here; they stop seeing updates.',
        confirmText: 'Leave network',
        tone: 'danger',
      }))
    )
      return;
    this.busy.set(m.id);
    try {
      const next = await firstValueFrom(this.dealerApi.leave(m.id));
      this.memberships.update((list) => list.map((x) => (x.id === m.id ? next : x)));

      this.offers.set(await firstValueFrom(this.dealerApi.getOffers()));
    } catch (e: unknown) {
      this.error.set(problem(e, 'That did not work. Try again.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async accept(o: NetworkOfferDto): Promise<void> {
    this.busy.set(o.id);
    this.error.set(null);
    try {
      const done = await firstValueFrom(this.dealerApi.accept(o.id));
      this.offers.update((list) => list.map((x) => (x.id === o.id ? done : x)));
      this.notice.set('Accepted. The customer and the enquiry are in your pipeline now.');
    } catch (e: unknown) {
      this.error.set(problem(e, 'The lead could not be accepted.'));

      this.offers.set(await firstValueFrom(this.dealerApi.getOffers()));
    } finally {
      this.busy.set(null);
    }
  }

  /** The OEM's WhatsApp conversation with the customer, when the OEM shared it. */
  protected readonly conversation = signal<{
    offer: NetworkOfferDto;
    lines: NetworkTranscriptLineDto[];
  } | null>(null);

  protected async openConversation(o: NetworkOfferDto): Promise<void> {
    this.busy.set(o.id);
    this.error.set(null);
    try {
      const lines = await firstValueFrom(this.dealerApi.getConversation(o.id));
      this.conversation.set({ offer: o, lines });
    } catch (e: unknown) {
      this.error.set(problem(e, 'The conversation could not be loaded.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async decline(o: NetworkOfferDto): Promise<void> {
    const answer = await this.dialogs.prompt({
      title: `Decline this lead from ${o.oemName}?`,
      message: 'It goes back to them to offer elsewhere.',
      fields: [{ key: 'reason', label: 'Tell them why', multiline: true, maxLength: 500 }],
      confirmText: 'Decline',
    });
    if (!answer) return;
    const reason = answer['reason'];
    this.busy.set(o.id);
    try {
      await firstValueFrom(this.dealerApi.decline(o.id, { reason }));
      this.offers.update((list) => list.filter((x) => x.id !== o.id));
      this.notice.set('Declined. It goes back to the OEM.');
    } catch (e: unknown) {
      this.error.set(problem(e, 'That did not work. Try again.'));
    } finally {
      this.busy.set(null);
    }
  }

  /** Gives back an accepted lead: our enquiry closes as lost, and the OEM gets the lead back (or its next dealer does). */
  protected async handBack(o: NetworkOfferDto): Promise<void> {
    const answer = await this.dialogs.prompt({
      title: `Hand this lead back to ${o.oemName}?`,
      message: `Your enquiry for it closes as lost, and ${o.oemName} won't offer it to you again.`,
      fields: [
        { key: 'reason', label: 'Tell them why', multiline: true, required: true, maxLength: 500 },
      ],
      confirmText: 'Hand back',
    });
    if (!answer) return;
    const reason = answer['reason'];
    this.busy.set(o.id);
    this.error.set(null);
    try {
      await firstValueFrom(this.dealerApi.handBack(o.id, { reason }));
      this.offers.update((list) => list.filter((x) => x.id !== o.id));
      this.notice.set(`Handed back to ${o.oemName}. Your enquiry for it is closed as lost.`);
    } catch (e: unknown) {
      this.error.set(problem(e, 'The lead could not be handed back.'));
    } finally {
      this.busy.set(null);
    }
  }
}
