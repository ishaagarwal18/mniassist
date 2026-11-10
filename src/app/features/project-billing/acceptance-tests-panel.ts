import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import {
  AcceptanceTestKind,
  AcceptanceTestService,
  AcceptanceTestSummaryDto,
} from '../../proxy/project-billing/acceptance-test.service';
import { ArButton, ArChip } from '../../ui';
import { TEST_KIND_TEXT, TEST_STATUS_TEXT, TEST_STATUS_TONE } from './tests.logic';

/** The order's FAT, SAT and commissioning records: create one from the standard checklist, open it to record and send for signature. */
@Component({
  selector: 'ar-acceptance-tests-panel',
  imports: [ArButton, ArChip, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (canSee() && loaded()) {
      <section class="bp" aria-labelledby="so-tests">
        <header class="bp__head">
          <div>
            <h2 id="so-tests">Tests and sign-off</h2>
            <p>
              FAT, SAT and commissioning checklists the customer signs by link. Signing makes the
              milestone billed on it ready.
            </p>
          </div>
          @if (canPlan()) {
            <div class="bp__bar">
              <select
                class="ar-field__input"
                aria-label="Test"
                (change)="kind.set(+$any($event.target).value)"
              >
                @for (k of kinds; track k) {
                  <option [value]="k" [selected]="k === kind()">{{ kindText(k) }}</option>
                }
              </select>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="create()"
              >
                New test
              </button>
            </div>
          }
        </header>
        @if (tests().length) {
          <table class="bp__table">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col" class="bp__num">Checks</th>
                <th scope="col" class="bp__num">Open punch</th>
                <th scope="col">Status</th>
                <th scope="col">Signed</th>
              </tr>
            </thead>
            <tbody>
              @for (t of tests(); track t.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/billing/tests', t.id]">{{ t.title }}</a>
                    @if (t.version > 1) {
                      <span class="bp__muted"> · v{{ t.version }}</span>
                    }
                  </td>
                  <td class="bp__num">{{ t.passed }} / {{ t.items }}</td>
                  <td class="bp__num">{{ t.openPunch }}</td>
                  <td>
                    <ar-chip [tone]="tone(t.status)">{{ statusText(t.status) }}</ar-chip>
                  </td>
                  <td>
                    @if (t.signedAtUtc) {
                      {{ t.signedByName }} · {{ t.signedAtUtc | date: 'd MMM yyyy' }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    }
  `,
  styleUrl: './billing-plan-panel.scss',
})
export class ArAcceptanceTestsPanel {
  private readonly api = inject(AcceptanceTestService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionService);

  readonly orderId = input.required<string>();

  protected readonly canSee = grantedPolicy('AutoReach.ProjectBilling', this.permissions);
  protected readonly canPlan = grantedPolicy('AutoReach.ProjectBilling.Plans', this.permissions);
  protected readonly tests = signal<AcceptanceTestSummaryDto[]>([]);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly kind = signal(AcceptanceTestKind.Fat);
  protected readonly kinds = [
    AcceptanceTestKind.Fat,
    AcceptanceTestKind.Sat,
    AcceptanceTestKind.Commissioning,
  ];

  constructor() {
    effect(() => {
      const id = this.orderId();
      if (this.canSee()) void this.load(id);
    });
  }

  protected kindText(k: AcceptanceTestKind): string {
    return TEST_KIND_TEXT[k];
  }

  protected statusText(s: number): string {
    return TEST_STATUS_TEXT[s as keyof typeof TEST_STATUS_TEXT];
  }

  protected tone(s: number) {
    return TEST_STATUS_TONE[s as keyof typeof TEST_STATUS_TONE];
  }

  private async load(id: string): Promise<void> {
    try {
      this.tests.set(await firstValueFrom(this.api.getListForOrder(id)));
    } catch {
      this.tests.set([]);
    } finally {
      this.loaded.set(true);
    }
  }

  protected async create(): Promise<void> {
    this.busy.set(true);
    try {
      const t = await firstValueFrom(
        this.api.create(this.orderId(), { kind: this.kind(), items: [] }),
      );
      await this.router.navigate(['/billing/tests', t.id]);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The test could not be made.'));
    } finally {
      this.busy.set(false);
    }
  }
}
