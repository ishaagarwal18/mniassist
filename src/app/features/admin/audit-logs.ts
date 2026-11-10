import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { GridModule, RecordClickEventArgs } from '@syncfusion/ej2-angular-grids';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import type { PagedResultDto } from '@abp/ng.core';
import { readApiError } from '../../core/util/api-error';
import { settled } from '../../core/util/resource';
import { AuditLogService } from '../../proxy/auditing/audit-log.service';
import { ReportExportService } from '../../proxy/reports/report-export.service';
import { ToastService } from '../../core/ui/toast.service';
import { EntityChangeType } from '../../proxy/auditing/entity-change-type.enum';
import { SecurityLogService } from '../../proxy/identity/security-log.service';
import type { SecurityLogDto } from '../../proxy/identity/models';
import {
  SECURITY_ACTIONS,
  browserSummary,
  securityActionLabel,
  securityActionTone,
} from './security-log.util';
import type {
  AuditLogDto,
  AuditLogListItemDto,
  AuditLogSummaryDto,
  EntityChangeDto,
} from '../../proxy/auditing/models';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArChip, ArDialog, ArStatTile, ArTabs } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { ArSelect } from '../../ui/select';
import {
  AUDIT_WINDOWS,
  AuditWindow,
  changeTypeLabel,
  changeTypeTone,
  durationLabel,
  pageLabel,
  prettyJson,
  propertyValue,
  shortTypeName,
  statusTone,
  windowRange,
} from './audit-log.util';

const PAGE_SIZE = 25;
const TABS = ['Requests', 'Changes', 'Sign-ins'] as const;
type Tab = (typeof TABS)[number];

interface RequestFilters {
  userName: string;
  url: string;
  httpMethod: string;
  httpStatusCode: string;
  errorsOnly: boolean;
  slowerThan: string;
}

interface ChangeFilters {
  entityTypeFullName: string;
  entityId: string;
  changeType: string;
}

const NO_REQUEST_FILTERS: RequestFilters = {
  userName: '',
  url: '',
  httpMethod: '',
  httpStatusCode: '',
  errorsOnly: false,
  slowerThan: '',
};

interface SignInFilters {
  userName: string;
  action: string;
  ip: string;
}

const NO_SIGN_IN_FILTERS: SignInFilters = { userName: '', action: '', ip: '' };

const NO_CHANGE_FILTERS: ChangeFilters = { entityTypeFullName: '', entityId: '', changeType: '' };

const NO_SUMMARY: AuditLogSummaryDto = {
  startTime: '',
  endTime: '',
  totalRequests: 0,
  failedRequests: 0,
  dailyAverageDuration: [],
};

interface Page<T> {
  totalCount: number;
  items: T[];
}
const page = <T>(totalCount: number, items: T[]): Page<T> => ({ totalCount, items });
/** ABP types both fields of a paged result as optional. */
const paged = <T>(r: PagedResultDto<T>): Page<T> => page(r.totalCount ?? 0, r.items ?? []);

const trimmed = (s: string) => s.trim() || undefined;
const numberOrUndefined = (s: string) => {
  const n = Number(s);
  return s.trim() && Number.isFinite(n) ? n : undefined;
};

/**
 * The audit log: every request ABP recorded in this workspace (or, on the host, the
 * host's own), and the field-level history of users, roles and workspaces. Read-only.
 * Filters apply when asked, not on each keystroke — every query is a scan of a large
 * table, and paging is done by the server for the same reason.
 */
@Component({
  selector: 'ar-admin-audit-logs',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    ArTopbar,
    ArBanner,
    ArButton,
    ArCard,
    ArChip,
    ArDialog,
    ArStatTile,
    ArTabs,
    ArGrid,
    ArSelect,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Audit log"
      [subtitle]="windowLabel()"
      help="Who did what, and when: every change request made in this workspace, with its result and timing, and the field-by-field history of users, roles and workspaces. Read-only. Passwords, API keys and other credentials are masked."
    >
      <select
        aria-label="Time window"
        [value]="window()"
        (change)="setWindow($any($event.target).value)"
      >
        @for (w of windows; track w.value) {
          <option [value]="w.value">{{ w.label }}</option>
        }
      </select>
      <button ar-button type="button" variant="ghost" icon="refresh" (click)="refresh()">
        Refresh
      </button>
      <button
        ar-button
        type="button"
        variant="ghost"
        icon="download"
        [disabled]="exporting()"
        title="The requests matching the filters as an Excel workbook, with the changes they made"
        (click)="exportExcel()"
      >
        {{ exporting() ? 'Exporting…' : 'Export to Excel' }}
      </button>
    </ar-topbar>

    <div class="al ar-scroll">
      @if (exportError(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      <div class="al__tiles">
        @for (t of tiles(); track t.label) {
          <ar-stat-tile [label]="t.label" [value]="t.value" [note]="t.note" [tone]="t.tone" />
        }
      </div>

      <ar-tabs [tabs]="tabs" [(active)]="tab" />

      @if (tab() === 'Requests') {
        <ar-card heading="Requests">
          <form class="al__filters" (submit)="$event.preventDefault(); applyRequests()">
            <label class="fld">
              <span class="fld__k">User</span>
              <input
                class="ar-field__input"
                maxlength="256"
                [value]="rDraft().userName"
                (input)="patchR({ userName: $any($event.target).value })"
              />
            </label>
            <label class="fld fld--wide">
              <span class="fld__k">URL contains</span>
              <input
                class="ar-field__input ar-mono"
                maxlength="256"
                placeholder="/api/auto-reach/campaign"
                [value]="rDraft().url"
                (input)="patchR({ url: $any($event.target).value })"
              />
            </label>
            <label class="fld">
              <span class="fld__k">Method</span>
              <select
                [value]="rDraft().httpMethod"
                (change)="patchR({ httpMethod: $any($event.target).value })"
              >
                <option value="">Any</option>
                @for (m of methods; track m) {
                  <option [value]="m">{{ m }}</option>
                }
              </select>
            </label>
            <label class="fld fld--narrow">
              <span class="fld__k">Status</span>
              <input
                class="ar-field__input"
                type="number"
                min="100"
                max="599"
                placeholder="500"
                [value]="rDraft().httpStatusCode"
                (input)="patchR({ httpStatusCode: $any($event.target).value })"
              />
            </label>
            <label class="fld fld--narrow">
              <span class="fld__k">Slower than (ms)</span>
              <input
                class="ar-field__input"
                type="number"
                min="0"
                [value]="rDraft().slowerThan"
                (input)="patchR({ slowerThan: $any($event.target).value })"
              />
            </label>
            <label class="chk">
              <input
                type="checkbox"
                [checked]="rDraft().errorsOnly"
                (change)="patchR({ errorsOnly: $any($event.target).checked })"
              />
              Errors only
            </label>
            <span class="al__filter-actions">
              <button ar-button type="submit" variant="primary" icon="search">Apply</button>
              <button ar-button type="button" variant="ghost" (click)="clearRequests()">
                Clear
              </button>
            </span>
          </form>

          <ejs-grid
            arGrid="audit-log"
            [arGridTools]="false"
            [dataSource]="requestRows()"
            aria-label="Recorded requests"
            (recordClick)="openRequest($event)"
          >
            <e-columns>
              <e-column field="time" headerText="Time" width="150">
                <ng-template #template let-r>
                  <span class="ar-mono">{{ r.log.executionTime | date: 'dd MMM, HH:mm:ss' }}</span>
                </ng-template>
              </e-column>
              <e-column field="user" headerText="User" width="150">
                <ng-template #template let-r>
                  {{ r.user }}
                  @if (r.log.impersonatorUserName) {
                    <ar-chip tone="amber">via {{ r.log.impersonatorUserName }}</ar-chip>
                  }
                </ng-template>
              </e-column>
              <e-column field="request" headerText="Request">
                <ng-template #template let-r>
                  <span class="al__req ar-mono">
                    <b>{{ r.log.httpMethod }}</b> {{ r.log.url }}
                  </span>
                </ng-template>
              </e-column>
              <e-column field="status" headerText="Result" width="110">
                <ng-template #template let-r>
                  <ar-chip [tone]="r.tone">{{ r.status }}</ar-chip>
                </ng-template>
              </e-column>
              <e-column field="duration" headerText="Took" width="90" textAlign="Right" />
              <e-column field="ip" headerText="IP address" width="120" />
            </e-columns>
            <ng-template #emptyRecordTemplate>No requests match.</ng-template>
          </ejs-grid>

          <div class="al__pager">
            <span>{{ requestPageLabel() }}</span>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="rPage() === 0"
              (click)="rPage.set(rPage() - 1)"
            >
              Previous
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="!requestHasNext()"
              (click)="rPage.set(rPage() + 1)"
            >
              Next
            </button>
          </div>
        </ar-card>
      } @else if (tab() === 'Changes') {
        <ar-card heading="Changes to users, roles and workspaces">
          <form class="al__filters" (submit)="$event.preventDefault(); applyChanges()">
            <label class="fld fld--wide">
              <span class="fld__k">Entity type</span>
              <input
                class="ar-field__input ar-mono"
                maxlength="256"
                placeholder="Volo.Abp.Identity.IdentityUser"
                [value]="cDraft().entityTypeFullName"
                (input)="patchC({ entityTypeFullName: $any($event.target).value })"
              />
            </label>
            <label class="fld fld--wide">
              <span class="fld__k">Entity ID</span>
              <input
                class="ar-field__input ar-mono"
                maxlength="128"
                [value]="cDraft().entityId"
                (input)="patchC({ entityId: $any($event.target).value })"
              />
            </label>
            <label class="fld">
              <span class="fld__k">Change</span>
              <select
                [value]="cDraft().changeType"
                (change)="patchC({ changeType: $any($event.target).value })"
              >
                <option value="">Any</option>
                <option [value]="ChangeType.Created">Created</option>
                <option [value]="ChangeType.Updated">Updated</option>
                <option [value]="ChangeType.Deleted">Deleted</option>
              </select>
            </label>
            <span class="al__filter-actions">
              <button ar-button type="submit" variant="primary" icon="search">Apply</button>
              <button ar-button type="button" variant="ghost" (click)="clearChanges()">
                Clear
              </button>
            </span>
          </form>

          <ejs-grid
            arGrid="entity-changes"
            [arGridTools]="false"
            [dataSource]="changeRows()"
            aria-label="Recorded changes"
            (recordClick)="openChange($event)"
          >
            <e-columns>
              <e-column field="time" headerText="Time" width="150">
                <ng-template #template let-r>
                  <span class="ar-mono">{{ r.change.changeTime | date: 'dd MMM, HH:mm:ss' }}</span>
                </ng-template>
              </e-column>
              <e-column field="kind" headerText="Change" width="110">
                <ng-template #template let-r>
                  <ar-chip [tone]="r.tone">{{ r.kind }}</ar-chip>
                </ng-template>
              </e-column>
              <e-column field="entity" headerText="Entity">
                <ng-template #template let-r>
                  <div>{{ r.entity }}</div>
                  <div class="al__sub ar-mono">{{ r.change.entityId }}</div>
                </ng-template>
              </e-column>
              <e-column field="user" headerText="By" width="140" />
              <e-column field="fields" headerText="Fields" width="80" textAlign="Right" />
            </e-columns>
            <ng-template #emptyRecordTemplate>
              No changes recorded. History is kept for users, roles and workspaces.
            </ng-template>
          </ejs-grid>

          <div class="al__pager">
            <span>{{ changePageLabel() }}</span>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="cPage() === 0"
              (click)="cPage.set(cPage() - 1)"
            >
              Previous
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="!changeHasNext()"
              (click)="cPage.set(cPage() + 1)"
            >
              Next
            </button>
          </div>
        </ar-card>
      } @else {
        <ar-card heading="Sign-ins and security changes">
          <form class="al__filters" (submit)="$event.preventDefault(); applySignIns()">
            <label class="fld">
              <span class="fld__k">User</span>
              <input
                class="ar-field__input"
                maxlength="256"
                [value]="sDraft().userName"
                (input)="patchS({ userName: $any($event.target).value })"
              />
            </label>
            <label class="fld">
              <span class="fld__k">What happened</span>
              <select
                [value]="sDraft().action"
                (change)="patchS({ action: $any($event.target).value })"
              >
                <option value="">Anything</option>
                @for (a of securityActions; track a.value) {
                  <option [value]="a.value">{{ a.label }}</option>
                }
              </select>
            </label>
            <label class="fld">
              <span class="fld__k">IP address</span>
              <input
                class="ar-field__input ar-mono"
                maxlength="64"
                [value]="sDraft().ip"
                (input)="patchS({ ip: $any($event.target).value })"
              />
            </label>
            <span class="al__filter-actions">
              <button ar-button type="submit" variant="primary" icon="search">Apply</button>
              <button ar-button type="button" variant="ghost" (click)="clearSignIns()">
                Clear
              </button>
            </span>
          </form>

          <ejs-grid
            arGrid="sign-ins"
            [arGridTools]="false"
            [dataSource]="signInRows()"
            aria-label="Sign-ins and security changes"
          >
            <e-columns>
              <e-column field="time" headerText="Time" width="150">
                <ng-template #template let-r>
                  <span class="ar-mono">{{ r.log.creationTime | date: 'dd MMM, HH:mm:ss' }}</span>
                </ng-template>
              </e-column>
              <e-column field="what" headerText="What happened" width="200">
                <ng-template #template let-r>
                  <ar-chip [tone]="r.tone">{{ r.what }}</ar-chip>
                </ng-template>
              </e-column>
              <e-column field="user" headerText="User" />
              <e-column field="ip" headerText="IP address" width="130" />
              <e-column field="browser" headerText="Browser" width="150" />
            </e-columns>
            <ng-template #emptyRecordTemplate>Nothing recorded in this window.</ng-template>
          </ejs-grid>

          <div class="al__pager">
            <span>{{ signInPageLabel() }}</span>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="sPage() === 0"
              (click)="sPage.set(sPage() - 1)"
            >
              Previous
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="!signInHasNext()"
              (click)="sPage.set(sPage() + 1)"
            >
              Next
            </button>
          </div>
        </ar-card>
      }
    </div>

    @if (detailOpen()) {
      <ar-dialog title="Request" width="min(820px, calc(100vw - 32px))" (dismiss)="closeDetail()">
        @if (detailError(); as e) {
          <ar-banner tone="bad">{{ e }}</ar-banner>
        }
        @if (detail(); as d) {
          <dl class="al__facts">
            <dt>When</dt>
            <dd class="ar-mono">{{ d.executionTime | date: 'dd MMM yyyy, HH:mm:ss' }}</dd>
            <dt>User</dt>
            <dd>
              {{ d.userName || 'Anonymous' }}
              @if (d.impersonatorUserName) {
                <ar-chip tone="amber">support: {{ d.impersonatorUserName }}</ar-chip>
              }
            </dd>
            <dt>Request</dt>
            <dd class="ar-mono">{{ d.httpMethod }} {{ d.url }}</dd>
            <dt>Result</dt>
            <dd>
              <ar-chip [tone]="tone(d)">{{ d.httpStatusCode || '—' }}</ar-chip>
              in {{ duration(d.executionDuration) }}
            </dd>
            <dt>From</dt>
            <dd>
              <span class="ar-mono">{{ d.clientIpAddress || '—' }}</span>
              @if (d.browserInfo) {
                <div class="al__sub">{{ d.browserInfo }}</div>
              }
            </dd>
            @if (d.correlationId) {
              <dt>Correlation</dt>
              <dd class="ar-mono">{{ d.correlationId }}</dd>
            }
          </dl>

          @if (d.exceptions) {
            <h4 class="al__h">Error</h4>
            <pre class="al__pre al__pre--bad">{{ d.exceptions }}</pre>
          }

          @if (d.actions.length) {
            <h4 class="al__h">Calls</h4>
            @for (a of d.actions; track $index) {
              <div class="al__action">
                <div class="al__action-head">
                  <span class="ar-mono">{{ shortType(a.serviceName) }}.{{ a.methodName }}</span>
                  <span class="al__sub">{{ duration(a.executionDuration) }}</span>
                </div>
                @if (a.parameters && a.parameters !== '{}') {
                  <pre class="al__pre">{{ pretty(a.parameters) }}</pre>
                }
              </div>
            }
          }

          @if (d.entityChanges.length) {
            <h4 class="al__h">Changes</h4>
            @for (c of d.entityChanges; track c.id) {
              <ng-container
                [ngTemplateOutlet]="changeBlock"
                [ngTemplateOutletContext]="{ $implicit: c }"
              />
            }
          }
        } @else if (!detailError()) {
          <p class="al__sub">Loading…</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="closeDetail()">Close</button>
        </div>
      </ar-dialog>
    }

    @if (changeOpen(); as c) {
      <ar-dialog
        [title]="changeTitle(c)"
        width="min(760px, calc(100vw - 32px))"
        (dismiss)="closeChange()"
      >
        @if (historyError(); as e) {
          <ar-banner tone="bad">{{ e }}</ar-banner>
        }
        @if (history(); as h) {
          <p class="al__sub">
            {{ h.length }} recorded change{{ h.length === 1 ? '' : 's' }}, oldest first.
          </p>
          @for (item of h; track item.id) {
            <ng-container
              [ngTemplateOutlet]="changeBlock"
              [ngTemplateOutletContext]="{ $implicit: item }"
            />
          }
        } @else {
          <ng-container
            [ngTemplateOutlet]="changeBlock"
            [ngTemplateOutletContext]="{ $implicit: c }"
          />
        }
        <div dialogActions>
          @if (!history() && c.entityId && c.entityTypeFullName) {
            <button
              ar-button
              type="button"
              variant="ghost"
              icon="clock"
              [disabled]="historyBusy()"
              (click)="loadHistory(c)"
            >
              {{ historyBusy() ? 'Loading…' : 'Full history' }}
            </button>
          }
          <button ar-button type="button" variant="ghost" (click)="closeChange()">Close</button>
        </div>
      </ar-dialog>
    }

    <ng-template #changeBlock let-c>
      <div class="al__change">
        <div class="al__action-head">
          <span>
            <ar-chip [tone]="changeTone(c.changeType)">{{ changeLabel(c.changeType) }}</ar-chip>
            {{ shortType(c.entityTypeFullName) }}
          </span>
          <span class="al__sub">
            {{ c.changeTime | date: 'dd MMM yyyy, HH:mm:ss' }}
            @if (c.userName) {
              · {{ c.userName }}
            }
          </span>
        </div>
        @if (c.propertyChanges.length) {
          <ejs-grid
            arGrid="audit-log-property-changes"
            [dataSource]="c.propertyChanges"
            aria-label="Property Changes"
          >
            <e-columns>
              <e-column field="propertyName" headerText="Field" width="160">
                <ng-template #template let-p>
                  <span class="ar-mono">{{ p.propertyName }}</span>
                </ng-template>
              </e-column>
              <e-column headerText="Before" width="180">
                <ng-template #template let-p>
                  <span>{{ value(p.originalValue) }}</span>
                </ng-template>
              </e-column>
              <e-column headerText="After" width="180">
                <ng-template #template let-p>
                  <span>{{ value(p.newValue) }}</span>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        }
      </div>
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      min-width: 0;
    }
    .al {
      flex: 1;
      min-height: 0;
      min-width: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .al__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    .al__filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 10px 12px;
      margin-bottom: 12px;
    }
    .fld {
      display: block;
      min-width: 130px;
      flex: 1 1 130px;
    }
    .fld--wide {
      flex: 2 1 220px;
    }
    .fld--narrow {
      flex: 0 1 110px;
      min-width: 100px;
    }
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .chk {
      display: flex;
      align-items: center;
      gap: 7px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
      padding-bottom: 8px;
    }
    .al__filter-actions {
      display: flex;
      gap: 8px;
    }
    .al__req {
      font-size: 12px;
      word-break: break-all;
    }
    .al__sub {
      font-size: 11px;
      color: var(--ar-ink-400);
    }
    .al__pager {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 10px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .al__pager span {
      margin-right: auto;
    }
    .al__facts {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 6px 12px;
      margin: 0 0 12px;
      font: 400 13px var(--ar-font-sans);
    }
    .al__facts dt {
      color: var(--ar-ink-500);
    }
    .al__facts dd {
      margin: 0;
      color: var(--ar-ink-900);
      word-break: break-all;
    }
    .al__h {
      margin: 16px 0 6px;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .al__pre {
      margin: 6px 0 0;
      padding: 10px;
      max-height: 260px;
      overflow: auto;
      border-radius: 6px;
      background: var(--ar-ink-50);
      font: 400 11.5px var(--ar-font-mono);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .al__pre--bad {
      background: var(--ar-red-50);
      color: var(--ar-red-700);
    }
    .al__action,
    .al__change {
      padding: 8px 0;
      border-top: 1px solid var(--ar-ink-100);
    }
    .al__action-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font: 500 12.5px var(--ar-font-sans);
    }
    .al__props {
      width: 100%;
      margin-top: 6px;
      border-collapse: collapse;
      font: 400 12px var(--ar-font-sans);
    }
    .al__props th {
      text-align: left;
      font-weight: 500;
      color: var(--ar-ink-500);
      padding: 4px 6px;
    }
    .al__props td {
      padding: 4px 6px;
      border-top: 1px solid var(--ar-ink-100);
      vertical-align: top;
      word-break: break-word;
    }
  `,
})
export class ArAdminAuditLogs {
  private readonly api = inject(AuditLogService);
  private readonly exports = inject(ReportExportService);
  private readonly toasts = inject(ToastService);
  private readonly securityLogs = inject(SecurityLogService);

  protected readonly tabs = TABS;
  protected readonly windows = AUDIT_WINDOWS;
  protected readonly methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  protected readonly ChangeType = EntityChangeType;

  protected readonly tab = signal<Tab>('Requests');
  protected readonly window = signal<AuditWindow>('7d');
  /** Moves the window's end to now. Bumped by Refresh and by changing the window. */
  private readonly asOf = signal(Date.now());
  private readonly range = computed(() => windowRange(this.window(), this.asOf()));

  // ---- requests -------------------------------------------------------------------------------

  protected readonly rDraft = signal<RequestFilters>(NO_REQUEST_FILTERS);
  private readonly rApplied = signal<RequestFilters>(NO_REQUEST_FILTERS);
  protected readonly rPage = signal(0);

  protected readonly exporting = signal(false);
  protected readonly exportError = signal<string | null>(null);

  /** The applied request filters, as both the list and the export send them. */
  private requestQuery(f: RequestFilters) {
    return {
      ...this.range(),
      userName: trimmed(f.userName),
      url: trimmed(f.url),
      httpMethod: f.httpMethod || undefined,
      httpStatusCode: numberOrUndefined(f.httpStatusCode),
      hasException: f.errorsOnly ? true : undefined,
      minExecutionDuration: numberOrUndefined(f.slowerThan),
    };
  }

  protected async exportExcel(): Promise<void> {
    this.exporting.set(true);
    this.exportError.set(null);
    try {
      // M12-6: built in the background; it appears under Reports → My exports when ready.
      await firstValueFrom(this.exports.requestAuditLog(this.requestQuery(this.rApplied())));
      this.toasts.info(
        'Preparing the export. You’ll be notified when it’s ready; it will be under Reports → My exports.',
        'Audit log',
      );
    } catch (e) {
      this.exportError.set(readApiError(e));
    } finally {
      this.exporting.set(false);
    }
  }

  private readonly requestsResource = rxResource({
    params: () => ({ filters: this.rApplied(), page: this.rPage(), range: this.range() }),
    stream: ({ params }) => {
      const f = params.filters;
      return this.api.getList({
        ...params.range,
        skipCount: params.page * PAGE_SIZE,
        maxResultCount: PAGE_SIZE,
        userName: trimmed(f.userName),
        url: trimmed(f.url),
        httpMethod: f.httpMethod || undefined,
        httpStatusCode: numberOrUndefined(f.httpStatusCode),
        hasException: f.errorsOnly ? true : undefined,
        minExecutionDuration: numberOrUndefined(f.slowerThan),
      });
    },
    defaultValue: { totalCount: 0, items: [] as AuditLogListItemDto[] },
  });

  private readonly requests = computed(() =>
    paged(settled(this.requestsResource, { totalCount: 0, items: [] })),
  );

  protected readonly requestRows = computed(() =>
    this.requests().items.map((log) => ({
      id: log.id,
      log,
      time: log.executionTime,
      user: log.userName || 'Anonymous',
      request: `${log.httpMethod ?? ''} ${log.url ?? ''}`,
      status: log.hasException
        ? `${log.httpStatusCode ?? ''} error`.trim()
        : String(log.httpStatusCode ?? '—'),
      tone: statusTone(log.httpStatusCode, log.hasException),
      duration: durationLabel(log.executionDuration),
      ip: log.clientIpAddress ?? '—',
    })),
  );

  protected readonly requestPageLabel = computed(() =>
    pageLabel(this.rPage() * PAGE_SIZE, this.requests().items.length, this.requests().totalCount),
  );
  protected readonly requestHasNext = computed(
    () => (this.rPage() + 1) * PAGE_SIZE < this.requests().totalCount,
  );

  protected patchR(p: Partial<RequestFilters>): void {
    this.rDraft.update((f) => ({ ...f, ...p }));
  }

  protected applyRequests(): void {
    this.rPage.set(0);
    this.rApplied.set({ ...this.rDraft() });
  }

  protected clearRequests(): void {
    this.rDraft.set(NO_REQUEST_FILTERS);
    this.applyRequests();
  }

  // ---- changes --------------------------------------------------------------------------------

  protected readonly cDraft = signal<ChangeFilters>(NO_CHANGE_FILTERS);
  private readonly cApplied = signal<ChangeFilters>(NO_CHANGE_FILTERS);
  protected readonly cPage = signal(0);

  private readonly changesResource = rxResource({
    params: () =>
      this.tab() !== 'Changes'
        ? undefined
        : { filters: this.cApplied(), page: this.cPage(), range: this.range() },
    stream: ({ params }) => {
      const f = params.filters;
      return this.api.getEntityChanges({
        ...params.range,
        skipCount: params.page * PAGE_SIZE,
        maxResultCount: PAGE_SIZE,
        entityTypeFullName: trimmed(f.entityTypeFullName),
        entityId: trimmed(f.entityId),
        changeType: f.changeType === '' ? undefined : (Number(f.changeType) as EntityChangeType),
      });
    },
    defaultValue: { totalCount: 0, items: [] as EntityChangeDto[] },
  });

  private readonly changes = computed(() =>
    paged(settled(this.changesResource, { totalCount: 0, items: [] })),
  );

  protected readonly changeRows = computed(() =>
    this.changes().items.map((change) => ({
      id: change.id,
      change,
      time: change.changeTime,
      kind: changeTypeLabel(change.changeType),
      tone: changeTypeTone(change.changeType),
      entity: shortTypeName(change.entityTypeFullName),
      user: change.userName || '—',
      fields: change.propertyChanges.length,
    })),
  );

  protected readonly changePageLabel = computed(() =>
    pageLabel(this.cPage() * PAGE_SIZE, this.changes().items.length, this.changes().totalCount),
  );
  protected readonly changeHasNext = computed(
    () => (this.cPage() + 1) * PAGE_SIZE < this.changes().totalCount,
  );

  protected patchC(p: Partial<ChangeFilters>): void {
    this.cDraft.update((f) => ({ ...f, ...p }));
  }

  protected applyChanges(): void {
    this.cPage.set(0);
    this.cApplied.set({ ...this.cDraft() });
  }

  protected clearChanges(): void {
    this.cDraft.set(NO_CHANGE_FILTERS);
    this.applyChanges();
  }

  // ---- sign-ins -----------------------------------------------------------------------------

  protected readonly securityActions = SECURITY_ACTIONS;
  protected readonly sDraft = signal<SignInFilters>(NO_SIGN_IN_FILTERS);
  private readonly sApplied = signal<SignInFilters>(NO_SIGN_IN_FILTERS);
  protected readonly sPage = signal(0);

  private readonly signInsResource = rxResource({
    params: () =>
      this.tab() !== 'Sign-ins'
        ? undefined
        : { filters: this.sApplied(), page: this.sPage(), range: this.range() },
    stream: ({ params }) =>
      this.securityLogs.getList({
        ...params.range,
        skipCount: params.page * PAGE_SIZE,
        maxResultCount: PAGE_SIZE,
        userName: trimmed(params.filters.userName),
        action: params.filters.action || undefined,
        clientIpAddress: trimmed(params.filters.ip),
      }),
    defaultValue: { totalCount: 0, items: [] as SecurityLogDto[] },
  });

  private readonly signIns = computed(() =>
    paged(settled(this.signInsResource, { totalCount: 0, items: [] })),
  );

  protected readonly signInRows = computed(() =>
    this.signIns().items.map((log) => ({
      id: log.id,
      log,
      time: log.creationTime,
      what: securityActionLabel(log.action),
      tone: securityActionTone(log.action),
      user: log.userName || '—',
      ip: log.clientIpAddress || '—',
      browser: browserSummary(log.browserInfo),
    })),
  );

  protected readonly signInPageLabel = computed(() =>
    pageLabel(this.sPage() * PAGE_SIZE, this.signIns().items.length, this.signIns().totalCount),
  );
  protected readonly signInHasNext = computed(
    () => (this.sPage() + 1) * PAGE_SIZE < this.signIns().totalCount,
  );

  protected patchS(p: Partial<SignInFilters>): void {
    this.sDraft.update((f) => ({ ...f, ...p }));
  }

  protected applySignIns(): void {
    this.sPage.set(0);
    this.sApplied.set({ ...this.sDraft() });
  }

  protected clearSignIns(): void {
    this.sDraft.set(NO_SIGN_IN_FILTERS);
    this.applySignIns();
  }

  // ---- summary --------------------------------------------------------------------------------

  private readonly summaryResource = rxResource({
    params: () => this.range(),
    stream: ({ params }) => this.api.getSummary(params),
    defaultValue: NO_SUMMARY,
  });

  protected readonly tiles = computed(() => {
    const s = settled(this.summaryResource, NO_SUMMARY);
    const failRate = s.totalRequests ? (s.failedRequests / s.totalRequests) * 100 : 0;
    const days = s.dailyAverageDuration;
    const avg = days.length
      ? days.reduce((n, d) => n + d.averageDurationMs, 0) / days.length
      : null;
    const fmt = new Intl.NumberFormat('en-IN');
    return [
      {
        label: 'Requests',
        value: fmt.format(s.totalRequests),
        note: null,
        tone: 'neutral' as const,
      },
      {
        label: 'Failed',
        value: fmt.format(s.failedRequests),
        note: s.totalRequests ? `${failRate.toFixed(failRate < 1 ? 2 : 1)}% of requests` : null,
        tone: s.failedRequests ? ('bad' as const) : ('good' as const),
      },
      {
        label: 'Average time',
        value: durationLabel(avg),
        note: 'per request, by day',
        tone: 'neutral' as const,
      },
    ];
  });

  protected readonly windowLabel = computed(
    () => AUDIT_WINDOWS.find((w) => w.value === this.window())?.label ?? '',
  );

  protected setWindow(w: AuditWindow): void {
    this.window.set(w);
    this.refresh();
  }

  protected refresh(): void {
    this.rPage.set(0);
    this.cPage.set(0);
    this.sPage.set(0);
    this.asOf.set(Date.now());
  }

  // ---- request detail -------------------------------------------------------------------------

  protected readonly detailOpen = signal(false);
  protected readonly detail = signal<AuditLogDto | null>(null);
  protected readonly detailError = signal<string | null>(null);

  protected async openRequest(e: RecordClickEventArgs): Promise<void> {
    const row = e.rowData as { log?: AuditLogListItemDto } | undefined;
    if (!row?.log) return;
    this.detail.set(null);
    this.detailError.set(null);
    this.detailOpen.set(true);
    try {
      const d = await firstValueFrom(this.api.get(row.log.id));
      this.detail.set(d);
    } catch (err) {
      this.detailError.set(readApiError(err));
    }
  }

  protected closeDetail(): void {
    this.detailOpen.set(false);
    this.detail.set(null);
  }

  // ---- change detail and history --------------------------------------------------------------

  protected readonly changeOpen = signal<EntityChangeDto | null>(null);
  protected readonly history = signal<EntityChangeDto[] | null>(null);
  protected readonly historyBusy = signal(false);
  protected readonly historyError = signal<string | null>(null);

  protected openChange(e: RecordClickEventArgs): void {
    const row = e.rowData as { change?: EntityChangeDto } | undefined;
    if (!row?.change) return;
    this.history.set(null);
    this.historyError.set(null);
    this.changeOpen.set(row.change);
  }

  protected async loadHistory(c: EntityChangeDto): Promise<void> {
    if (!c.entityTypeFullName || !c.entityId || this.historyBusy()) return;
    this.historyBusy.set(true);
    this.historyError.set(null);
    try {
      const r = await firstValueFrom(this.api.getEntityHistory(c.entityTypeFullName, c.entityId));
      this.history.set(r.items ?? []);
    } catch (err) {
      this.historyError.set(readApiError(err));
    } finally {
      this.historyBusy.set(false);
    }
  }

  protected closeChange(): void {
    this.changeOpen.set(null);
    this.history.set(null);
  }

  protected changeTitle(c: EntityChangeDto): string {
    return `${shortTypeName(c.entityTypeFullName)} ${c.entityId ?? ''}`.trim();
  }

  // ---- template helpers -----------------------------------------------------------------------

  protected tone(d: AuditLogListItemDto) {
    return statusTone(d.httpStatusCode, d.hasException);
  }
  protected duration = durationLabel;
  protected shortType = shortTypeName;
  protected pretty = prettyJson;
  protected value = propertyValue;
  protected changeLabel = changeTypeLabel;
  protected changeTone = changeTypeTone;
}
