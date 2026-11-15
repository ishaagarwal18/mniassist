import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { AbTestMetric } from '../../proxy/campaigns/ab-test-metric.enum';
import { CampaignService } from '../../proxy/campaigns/campaign.service';
import { CampaignState } from '../../proxy/campaigns/campaign-state.enum';
import type { CampaignAbTestReportDto, CampaignDto } from '../../proxy/campaigns/models';
import { TemplateService } from '../../proxy/messaging/template.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import type { TemplateDto } from '../../proxy/messaging/models';
import { ArButton, ArChip } from '../../ui';

interface VariantRow {
  label: string;
  templateId: string;
  weight: number;
}

const METRICS: { value: AbTestMetric; label: string }[] = [
  { value: AbTestMetric.ReplyRate, label: 'Reply rate' },
  { value: AbTestMetric.ReadRate, label: 'Read rate' },
  { value: AbTestMetric.ClickRate, label: 'Click rate' },
];

/** The first problem with an A/B set-up, or null when it can be saved. */
export function abTestProblem(variants: readonly VariantRow[], testPercent: number): string | null {
  if (variants.length < 2) return 'Add at least two variants.';
  if (variants.some((v) => !v.label.trim() || !v.templateId))
    return 'Give every variant a label and a template.';
  if (new Set(variants.map((v) => v.templateId)).size !== variants.length)
    return 'Each variant needs a different template.';
  if (variants.some((v) => !(v.weight > 0))) return 'Every weight must be more than 0.';
  if (!(testPercent >= 1 && testPercent <= 100))
    return 'The test audience must be 1–100% of recipients.';
  return null;
}

/**
 * A campaign's A/B test (M05-9): send different approved templates to a slice of the audience, pick the winner by
 * the chosen metric, and send the winner to everyone else. Set up while the campaign is a draft; afterwards the
 * page shows the report.
 */
@Component({
  selector: 'ar-ab-test-page',
  imports: [ArTopbar, ArButton, ArChip, DatePipe, DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  template: `
    <ar-topbar
      [title]="'A/B test · ' + (campaign()?.name ?? 'Campaign')"
      subtitle="Try templates on part of the audience, then send the winner"
      help="The test audience is split between the variants by weight. When results are in, the variant with the best rate for the chosen metric goes to the rest."
    />
    <div class="wp">
      <p class="wp__muted"><a routerLink="/campaigns">← Campaigns</a></p>

      @if (isDraft()) {
        <section class="wp__card">
          <h2 class="wp__title">Set up the test</h2>
          <div class="wp__grid">
            <label class="wp__field">
              <span>Pick the winner by</span>
              <select
                class="ar-field__input"
                [value]="metric()"
                (change)="metric.set(+$any($event.target).value)"
              >
                @for (m of metrics; track m.value) {
                  <option [value]="m.value">{{ m.label }}</option>
                }
              </select>
            </label>
            <label class="wp__field">
              <span>Test audience (% of recipients)</span>
              <input
                class="ar-field__input"
                type="number"
                min="1"
                max="100"
                [value]="testPercent()"
                (input)="testPercent.set(+$any($event.target).value)"
              />
            </label>
          </div>

          <table class="wp__table" style="margin-top: 14px">
            <thead>
              <tr>
                <th>Label</th>
                <th>Template</th>
                <th>Weight</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (v of variants(); track $index; let i = $index) {
                <tr>
                  <td>
                    <input
                      class="ar-field__input"
                      maxlength="32"
                      [value]="v.label"
                      (input)="patch(i, { label: $any($event.target).value })"
                    />
                  </td>
                  <td>
                    <select
                      class="ar-field__input"
                      [value]="v.templateId"
                      (change)="patch(i, { templateId: $any($event.target).value })"
                    >
                      <option value="">Choose…</option>
                      @for (t of templates(); track t.id) {
                        <option [value]="t.id" translate="no">
                          {{ t.name }} ({{ t.languageCode }})
                        </option>
                      }
                    </select>
                  </td>
                  <td style="width: 110px">
                    <input
                      class="ar-field__input"
                      type="number"
                      min="1"
                      [value]="v.weight"
                      (input)="patch(i, { weight: +$any($event.target).value })"
                    />
                  </td>
                  <td>
                    @if (variants().length > 2) {
                      <button ar-button type="button" variant="ghost" (click)="removeVariant(i)">
                        Remove
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (templates().length === 0) {
            <p class="wp__error">This campaign's number has no approved templates to test.</p>
          }
          @if (problem(); as p) {
            <p class="wp__error">{{ p }}</p>
          }
          <div class="wp__actions">
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="variants().length >= 5"
              (click)="addVariant()"
            >
              Add variant
            </button>
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="saving() || problem() !== null"
              (click)="save()"
            >
              {{ saving() ? 'Saving…' : 'Save A/B test' }}
            </button>
          </div>
        </section>
      } @else if (campaign()) {
        <p class="wp__muted">The campaign has left draft, so the test can no longer be changed.</p>
      }

      @if (report(); as r) {
        @if ((r.variants ?? []).length > 0) {
          <section class="wp__card">
            <h2 class="wp__title">Results</h2>
            <p class="wp__muted">
              {{ metricLabel(r.metric) }} on {{ r.testPercent }}% of recipients ·
              @if (r.decidedAtUtc) {
                winner picked {{ r.decidedAtUtc | date: 'd MMM y, HH:mm' }}
              } @else {
                no winner yet
              }
            </p>
            <table class="wp__table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Template</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Read</th>
                  <th>Replied</th>
                  <th>Rate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (v of r.variants; track v.variantId) {
                  <tr>
                    <td>{{ v.label }}</td>
                    <td translate="no">{{ v.templateName ?? '—' }}</td>
                    <td>{{ v.sent ?? 0 }}</td>
                    <td>{{ v.delivered ?? 0 }}</td>
                    <td>{{ v.read ?? 0 }}</td>
                    <td>{{ v.replied ?? 0 }}</td>
                    <td>{{ (v.rate ?? 0) * 100 | number: '1.0-1' }}%</td>
                    <td>
                      @if (v.isWinner) {
                        <ar-chip tone="good" [dot]="true">Winner</ar-chip>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
      }
    </div>
  `,
})
export class ArAbTestPage implements OnInit {
  private readonly campaigns = inject(CampaignService);
  private readonly templateApi = inject(TemplateService);
  private readonly toasts = inject(ToastService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly metrics = METRICS;
  protected readonly campaign = signal<CampaignDto | null>(null);
  protected readonly templates = signal<TemplateDto[]>([]);
  protected readonly report = signal<CampaignAbTestReportDto | null>(null);
  protected readonly metric = signal<AbTestMetric>(AbTestMetric.ReplyRate);
  protected readonly testPercent = signal(20);
  protected readonly variants = signal<VariantRow[]>([
    { label: 'A', templateId: '', weight: 1 },
    { label: 'B', templateId: '', weight: 1 },
  ]);
  protected readonly saving = signal(false);

  protected readonly isDraft = computed(() => this.campaign()?.state === CampaignState.Draft);
  protected readonly problem = computed(() => abTestProblem(this.variants(), this.testPercent()));

  async ngOnInit(): Promise<void> {
    try {
      const c = await firstValueFrom(this.campaigns.get(this.id));
      this.campaign.set(c);
      if (c.channelId) {
        const page = await firstValueFrom(
          this.templateApi.getList({
            channelId: c.channelId,
            status: TemplateStatus.Approved,
            maxResultCount: 200,
          }),
        );
        this.templates.set(page.items ?? []);
      }
    } catch {
      return;
    }
    await this.loadReport();
  }

  private async loadReport(): Promise<void> {
    try {
      const r = await firstValueFrom(
        this.campaigns.getAbTestReport(this.id, { skipHandleError: true }),
      );
      this.report.set(r);
      if (r.metric) this.metric.set(r.metric);
      if (r.testPercent) this.testPercent.set(r.testPercent);
      if ((r.variants ?? []).length >= 2) {
        this.variants.set(
          r.variants!.map((v) => ({
            label: v.label ?? '',
            templateId: v.templateId ?? '',
            weight: v.weight ?? 1,
          })),
        );
      }
    } catch {
      this.report.set(null);
    }
  }

  protected metricLabel(m: AbTestMetric | undefined): string {
    return METRICS.find((x) => x.value === m)?.label ?? 'No metric';
  }

  protected patch(i: number, change: Partial<VariantRow>): void {
    this.variants.update((list) => list.map((v, j) => (j === i ? { ...v, ...change } : v)));
  }

  protected addVariant(): void {
    this.variants.update((list) => [
      ...list,
      { label: String.fromCharCode(65 + list.length), templateId: '', weight: 1 },
    ]);
  }

  protected removeVariant(i: number): void {
    this.variants.update((list) => list.filter((_, j) => j !== i));
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.campaigns.configureAbTest(
          this.id,
          {
            metric: this.metric(),
            testPercent: this.testPercent(),
            variants: this.variants().map((v) => ({
              label: v.label.trim(),
              templateId: v.templateId,
              weight: v.weight,
            })),
          },
          { skipHandleError: true },
        ),
      );
      this.toasts.success('A/B test saved. It runs when the campaign is sent.', 'Campaign');
      await this.loadReport();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The A/B test could not be saved.'), 'Campaign');
    } finally {
      this.saving.set(false);
    }
  }
}
