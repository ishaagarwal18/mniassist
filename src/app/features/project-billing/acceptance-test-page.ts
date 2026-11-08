import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  AcceptanceTestDto,
  AcceptanceTestService,
  AcceptanceTestStatus,
  TestItemResult,
  TestSigningLinkDto,
} from '../../proxy/project-billing/acceptance-test.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { environment } from '../../../environments/environment';
import {
  ResultRow,
  TEST_STATUS_TEXT,
  TEST_STATUS_TONE,
  resultRowOf,
  signatureProblem,
} from './tests.logic';

/**
 * One FAT, SAT or commissioning record: the checklist (items can be added or removed until it is signed), each item's result, the
 * punch list, sending the signing link, the certificate, and re-issuing a signed test to correct it.
 */
@Component({
  selector: 'ar-acceptance-test-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, ArChip, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './acceptance-test-page.html',
  styleUrl: './milestones-due-page.scss',
})
export class ArAcceptanceTestPage {
  private readonly api = inject(AcceptanceTestService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);

  protected readonly mock = environment.useMockData;
  protected readonly canPlan = grantedPolicy('AutoReach.ProjectBilling.Plans', this.permissions);
  protected readonly test = signal<AcceptanceTestDto | null>(null);
  protected readonly rows = signal<ResultRow[]>([]);
  protected readonly newItem = signal('');
  protected readonly signer = signal('');
  protected readonly designation = signal('');
  protected readonly email = signal('');
  protected readonly link = signal<TestSigningLinkDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly dirty = signal(false);

  protected readonly Result = TestItemResult;
  protected readonly Status = AcceptanceTestStatus;
  protected readonly results = [
    TestItemResult.Pass,
    TestItemResult.Fail,
    TestItemResult.NotApplicable,
  ];

  protected readonly locked = computed(() => {
    const s = this.test()?.status;
    return s === AcceptanceTestStatus.Signed || s === AcceptanceTestStatus.Reissued;
  });
  protected readonly problem = computed(() => signatureProblem(this.rows()));

  constructor() {
    void this.load();
  }

  protected statusText(s: AcceptanceTestStatus): string {
    return TEST_STATUS_TEXT[s];
  }

  protected tone(s: AcceptanceTestStatus) {
    return TEST_STATUS_TONE[s];
  }

  protected resultText(r: TestItemResult): string {
    return r === TestItemResult.Pass ? 'Pass' : r === TestItemResult.Fail ? 'Fail' : 'N/A';
  }

  private fill(t: AcceptanceTestDto): void {
    this.test.set(t);
    this.rows.set(t.checklist.map(resultRowOf));
    this.signer.set(t.signerName ?? this.signer());
    this.designation.set(t.signerDesignation ?? this.designation());
    this.email.set(t.signerEmail ?? this.email());
    this.dirty.set(false);
  }

  private async load(): Promise<void> {
    if (this.mock) return;
    try {
      this.fill(await firstValueFrom(this.api.get(this.route.snapshot.paramMap.get('id')!)));
    } catch (e) {
      this.error.set(readApiError(e, 'The test could not be loaded.'));
    }
  }

  protected setRow(i: number, change: Partial<ResultRow>): void {
    this.rows.update((rs) => rs.map((r, j) => (j === i ? { ...r, ...change } : r)));
    this.dirty.set(true);
  }

  private async run(
    call: () => Promise<AcceptanceTestDto>,
    done: string,
    fallback: string,
  ): Promise<boolean> {
    this.busy.set(true);
    try {
      this.fill(await call());
      if (done) this.toasts.success(done);
      return true;
    } catch (e) {
      this.toasts.error(readApiError(e, fallback));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  protected saveResults(): Promise<boolean> {
    const t = this.test()!;
    return this.run(
      () =>
        firstValueFrom(
          this.api.recordResults(t.id, {
            results: this.rows().map((r) => ({
              itemId: r.itemId,
              result: r.result,
              remark: r.remark.trim() || null,
              punchCritical: r.result === TestItemResult.Fail && r.critical,
              punchDueOn: r.result === TestItemResult.Fail && r.dueOn ? r.dueOn : null,
            })),
          }),
        ),
      'Results saved.',
      'The results could not be saved.',
    );
  }

  protected async addItem(): Promise<void> {
    const text = this.newItem().trim();
    const t = this.test();
    if (!text || !t) return;
    const ok = await this.run(
      () =>
        firstValueFrom(
          this.api.updateItems(t.id, {
            items: [...t.checklist.map((i) => ({ id: i.id, text: i.text })), { text }],
          }),
        ),
      '',
      'The item could not be added.',
    );
    if (ok) this.newItem.set('');
  }

  protected removeItem(itemId: string): Promise<boolean> {
    const t = this.test()!;
    return this.run(
      () =>
        firstValueFrom(
          this.api.updateItems(t.id, {
            items: t.checklist
              .filter((i) => i.id !== itemId)
              .map((i) => ({ id: i.id, text: i.text })),
          }),
        ),
      '',
      'The item could not be removed.',
    );
  }

  protected async send(sendEmail: boolean): Promise<void> {
    const t = this.test();
    if (!t || !this.signer().trim()) return;
    if (this.dirty() && !(await this.saveResults())) return;
    this.busy.set(true);
    try {
      const link = await firstValueFrom(
        this.api.sendForSignature(t.id, {
          signerName: this.signer().trim(),
          signerDesignation: this.designation().trim() || null,
          signerEmail: this.email().trim() || null,
          sendEmail,
        }),
      );
      this.link.set(link);
      if (sendEmail && !link.emailed) {
        this.toasts.warning(
          `The link is ready, but the email didn't go: ${link.emailProblem}. Share the link below.`,
          'Sign-off',
        );
      } else {
        this.toasts.success(sendEmail ? 'Signing link emailed.' : 'Signing link ready to share.');
      }
      this.fill(await firstValueFrom(this.api.get(t.id)));
    } catch (e) {
      this.toasts.error(readApiError(e, 'It could not be sent for signature.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async copyLink(): Promise<void> {
    const l = this.link();
    if (!l) return;
    await navigator.clipboard.writeText(l.url);
    this.toasts.success('Link copied.');
  }

  protected closePunch(itemId: string): Promise<boolean> {
    const t = this.test()!;
    return this.run(
      () => firstValueFrom(this.api.closePunch(t.id, itemId)),
      'Punch item closed.',
      'It could not be closed.',
    );
  }

  protected async reissue(): Promise<void> {
    const t = this.test()!;
    const ok = await this.dialogs.confirm({
      title: `Re-issue ${t.title}?`,
      message:
        'The signed version is kept as it is. A new version starts with the same checklist, to correct and sign again.',
      confirmText: 'Re-issue',
    });
    if (!ok) return;
    try {
      const next = await firstValueFrom(this.api.reissue(t.id));
      await this.router.navigate(['/billing/tests', next.id]);
      this.fill(next);
    } catch (e) {
      this.toasts.error(readApiError(e, 'It could not be re-issued.'));
    }
  }

  protected async download(kind: 'certificate' | 'addendum'): Promise<void> {
    const t = this.test()!;
    try {
      const blob = await firstValueFrom(
        kind === 'certificate' ? this.api.getCertificate(t.id) : this.api.getAddendum(t.id),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t.title}-${kind}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The PDF could not be downloaded.'));
    }
  }
}
