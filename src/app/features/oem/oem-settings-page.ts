import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  OemClaimPeriod,
  OemSettingsService,
  OemSupplierDto,
} from '../../proxy/oem/oem-pricing.service';
import {
  OemPostingSettingsDto,
  SpaReportService,
  UpdateOemPostingSettingsInput,
} from '../../proxy/oem/spa-report.service';
import { ArBanner, ArButton, ArCard } from '../../ui';

/** Which suppliers are OEMs, how often claims go to each, and how long after the invoice each accepts a claim. */
@Component({
  selector: 'ar-oem-settings-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Choose which suppliers are OEMs, and set how deal registrations and claims are handled."
      title="OEM settings" subtitle="The suppliers you get special prices from">
      <a ar-button variant="ghost" routerLink="/oem/spa">Special prices</a>
    </ar-topbar>
    <div class="oe ar-scroll">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (posting(); as ps) {
        <ar-card heading="Journal posting">
          <p class="oe__muted">
            Off by default. On, every claim posts to the accounts below: claim lines debit claims
            receivable and credit OEM support income; the OEM's credit note debits its payable;
            write-offs and rejected lines debit the write-off account. Have your accountant check
            the accounts first.
          </p>
          <label class="oe__check">
            <input
              type="checkbox"
              [checked]="postForm().postJournals"
              [disabled]="!canPost()"
              (change)="patchPosting({ postJournals: $any($event.target).checked })"
            />
            Post journal entries for special-price claims
          </label>
          <div class="oe__grid">
            @for (f of postingFields; track f.key) {
              <label class="ar-field">
                <span class="ar-field__label">{{ f.label }}</span>
                <select
                  class="ar-field__input"
                  [disabled]="!canPost()"
                  (change)="setAccount(f.key, $any($event.target).value)"
                >
                  <option value="" [selected]="!postForm()[f.key]">Choose an account</option>
                  @for (a of ps.accounts; track a.id) {
                    <option [value]="a.id" [selected]="a.id === postForm()[f.key]">
                      {{ a.code }} · {{ a.name }}
                    </option>
                  }
                </select>
              </label>
            }
          </div>
          @if (canPost()) {
            <div class="oe__foot">
              <button ar-button type="button" (click)="savePosting()">Save posting</button>
            </div>
          }
        </ar-card>
      }

      <ar-card heading="Suppliers">
        <p class="oe__muted">
          Mark the brands you get special prices from as OEMs. Claims are grouped by the period, and
          you're warned before the claim deadline.
        </p>
        <table class="oe__table">
          <thead>
            <tr>
              <th scope="col">Supplier</th>
              <th scope="col">OEM</th>
              <th scope="col">Claims</th>
              <th scope="col">Claim within (days of invoice)</th>
              <th scope="col" class="oe__num">Open special prices</th>
            </tr>
          </thead>
          <tbody>
            @for (s of rows(); track s.supplierId) {
              <tr>
                <td translate="no">{{ s.name }}</td>
                <td>
                  <label class="oe__check">
                    <input
                      type="checkbox"
                      [checked]="s.isOem"
                      [disabled]="!canEdit()"
                      (change)="save(s, { isOem: $any($event.target).checked })"
                    />
                    {{ s.isOem ? 'Yes' : 'No' }}
                  </label>
                </td>
                <td>
                  <select
                    class="ar-field__input"
                    aria-label="Claim period"
                    [disabled]="!canEdit() || !s.isOem"
                    (change)="save(s, { claimPeriod: +$any($event.target).value })"
                  >
                    <option [value]="Period.Monthly" [selected]="s.claimPeriod === Period.Monthly">
                      Monthly
                    </option>
                    <option
                      [value]="Period.Quarterly"
                      [selected]="s.claimPeriod === Period.Quarterly"
                    >
                      Quarterly
                    </option>
                  </select>
                </td>
                <td>
                  <input
                    class="ar-field__input"
                    type="number"
                    min="1"
                    max="730"
                    aria-label="Claim deadline in days"
                    placeholder="No limit"
                    [disabled]="!canEdit() || !s.isOem"
                    [value]="s.claimDeadlineDays ?? ''"
                    (change)="save(s, { claimDeadlineDays: days($any($event.target).value) })"
                  />
                </td>
                <td class="oe__num">{{ s.openSpas }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="oe__muted">
                  No suppliers yet. Add them under Purchasing & stock → Suppliers.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </ar-card>
    </div>
  `,
  styleUrl: './oem-pages.scss',
})
export class ArOemSettingsPage {
  private readonly api = inject(OemSettingsService);
  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly canEdit = grantedPolicy('AutoReach.Spa.Approve', this.permissions);
  protected readonly rows = signal<OemSupplierDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly Period = OemClaimPeriod;

  private readonly postingApi = inject(SpaReportService);
  protected readonly canPost = grantedPolicy('AutoReach.Spa.Claims', this.permissions);
  protected readonly posting = signal<OemPostingSettingsDto | null>(null);
  protected readonly postForm = signal<UpdateOemPostingSettingsInput>({ postJournals: false });
  protected readonly postingFields: {
    key: Exclude<keyof UpdateOemPostingSettingsInput, 'postJournals'>;
    label: string;
  }[] = [
    { key: 'claimsReceivableAccountId', label: 'OEM claims receivable' },
    { key: 'supportIncomeAccountId', label: 'OEM support income' },
    { key: 'oemPayableAccountId', label: 'OEM payable' },
    { key: 'writeOffAccountId', label: 'Write-offs (support reversal or bad debts)' },
  ];

  protected setAccount(
    key: Exclude<keyof UpdateOemPostingSettingsInput, 'postJournals'>,
    value: string,
  ): void {
    this.postForm.update((f) => ({ ...f, [key]: value || null }));
  }

  protected patchPosting(change: Partial<UpdateOemPostingSettingsInput>): void {
    this.postForm.update((f) => ({ ...f, ...change }));
  }

  private fillPosting(p: OemPostingSettingsDto): void {
    this.posting.set(p);
    const { accounts: _accounts, ...form } = p;
    void _accounts;
    this.postForm.set(form);
  }

  protected async savePosting(): Promise<void> {
    try {
      this.fillPosting(await firstValueFrom(this.postingApi.updatePosting(this.postForm())));
      this.toasts.success(
        this.postForm().postJournals ? 'Journal posting is on.' : 'Journal posting is off.',
      );
    } catch (e) {
      this.toasts.error(readApiError(e, 'The posting settings could not be saved.'));
    }
  }

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.rows.set(await firstValueFrom(this.api.getList()));
      this.fillPosting(await firstValueFrom(this.postingApi.getPosting()));
    } catch (e) {
      this.error.set(readApiError(e, 'The suppliers could not be loaded.'));
    }
  }

  protected days(value: string): number | null {
    const n = Number(value);
    return value.trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  protected async save(s: OemSupplierDto, change: Partial<OemSupplierDto>): Promise<void> {
    const next = { ...s, ...change };
    try {
      const saved = await firstValueFrom(
        this.api.update(s.supplierId, {
          isOem: next.isOem,
          claimPeriod: next.claimPeriod,
          claimDeadlineDays: next.claimDeadlineDays ?? null,
        }),
      );
      this.rows.update((list) => list.map((r) => (r.supplierId === s.supplierId ? saved : r)));
    } catch (e) {
      this.toasts.error(readApiError(e, 'The supplier could not be saved.'));
      await this.load();
    }
  }
}
