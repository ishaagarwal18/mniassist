import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { ConfirmService } from '../../core/ui/confirm.service';
import {
  FeatureDto,
  FeatureGroupDto,
  FeaturesService,
  GetFeatureListResultDto,
} from '../../proxy/feature-management';
import { ArBanner, ArButton, ArCard, ArDialog } from '../../ui';

@Component({
  selector: 'ar-tenant-features-dialog',
  standalone: true,
  imports: [ArDialog, ArButton, ArBanner, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      [title]="'Features · ' + tenantName()"
      width="min(720px, calc(100vw - 32px))"
      (dismiss)="closed.emit(false)"
    >
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (notice(); as n) {
        <ar-banner tone="good">{{ n }}</ar-banner>
      }

      @if (loading()) {
        <div class="hint">Loading features…</div>
      } @else if (groups().length === 0) {
        <div class="hint">No features configured on this platform instance.</div>
      } @else {
        <div class="feat-list ar-scroll">
          @for (g of groups(); track g.name) {
            <ar-card [heading]="g.displayName || g.name">
              <div class="feat-group">
                @for (f of g.features; track f.name) {
                  <div class="feat-row">
                    <div class="feat-info">
                      <div class="feat-title">
                        <span class="feat-name">{{ f.displayName || f.name }}</span>
                        <span class="feat-key ar-mono">{{ f.name }}</span>
                      </div>
                      @if (f.description) {
                        <p class="feat-desc">{{ f.description }}</p>
                      }
                    </div>

                    <div class="feat-control">
                      @if (isBoolean(f)) {
                        <label class="toggle-chk">
                          <input
                            type="checkbox"
                            [checked]="valOf(f) === 'true'"
                            (change)="
                              setVal(f.name, $any($event.target).checked ? 'true' : 'false')
                            "
                          />
                          <span>{{ valOf(f) === 'true' ? 'Enabled' : 'Disabled' }}</span>
                        </label>
                      } @else {
                        <input
                          class="ar-field__input feat-input"
                          [value]="valOf(f)"
                          (input)="setVal(f.name, $any($event.target).value)"
                        />
                      }
                    </div>
                  </div>
                }
              </div>
            </ar-card>
          }
        </div>
      }

      <div dialogActions class="feat-actions">
        <button
          ar-button
          type="button"
          variant="ghost"
          [disabled]="busy() || resetting()"
          (click)="resetToDefault()"
        >
          {{ resetting() ? 'Resetting…' : 'Reset to default' }}
        </button>
        <div class="feat-actions__right">
          <button ar-button type="button" variant="ghost" (click)="closed.emit(false)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !dirty()"
            (click)="save()"
          >
            {{ busy() ? 'Saving…' : 'Save features' }}
          </button>
        </div>
      </div>
    </ar-dialog>
  `,
  styles: `
    .hint {
      color: var(--ar-ink-400);
      font: 400 13px var(--ar-font-sans);
      padding: 16px 0;
    }
    .feat-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 480px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .feat-group {
      display: flex;
      flex-direction: column;
      divide-y: 1px solid var(--ar-line-200);
    }
    .feat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid var(--ar-line-200);
    }
    .feat-row:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .feat-row:first-child {
      padding-top: 0;
    }
    .feat-info {
      flex: 1;
      min-width: 0;
    }
    .feat-title {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }
    .feat-name {
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .feat-key {
      font-size: 11px;
      color: var(--ar-ink-400);
    }
    .feat-desc {
      margin: 2px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .feat-control {
      flex-shrink: 0;
    }
    .feat-input {
      width: 140px;
    }
    .toggle-chk {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
      cursor: pointer;
    }
    .feat-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .feat-actions__right {
      display: flex;
      gap: 8px;
    }
  `,
})
export class ArTenantFeaturesDialog {
  private readonly featuresApi = inject(FeaturesService);
  private readonly dialogs = inject(ConfirmService);

  readonly tenantId = input.required<string>();
  readonly tenantName = input.required<string>();
  readonly closed = output<boolean>();

  private readonly res = rxResource({
    params: () => ({ tenantId: this.tenantId() }),
    stream: ({ params }) => this.featuresApi.get('T', params.tenantId),
    defaultValue: { groups: [] } as GetFeatureListResultDto,
  });

  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly groups = computed(() => this.res.value().groups ?? []);

  protected readonly draft = signal<Map<string, string>>(new Map());

  protected isBoolean(f: FeatureDto): boolean {
    const valName = f.valueType?.name?.toLowerCase();
    const validatorName = f.valueType?.validator?.name?.toLowerCase();
    return (
      valName === 'boolean' ||
      valName === 'toggle' ||
      validatorName === 'boolean' ||
      f.value === 'true' ||
      f.value === 'false'
    );
  }

  protected valOf(f: FeatureDto): string {
    const d = this.draft();
    if (d.has(f.name)) return d.get(f.name)!;
    return f.value ?? '';
  }

  protected setVal(name: string, value: string): void {
    this.draft.update((m) => {
      const next = new Map(m);
      next.set(name, value);
      return next;
    });
  }

  protected readonly dirty = computed(() => {
    const d = this.draft();
    if (d.size === 0) return false;
    for (const g of this.groups()) {
      for (const f of g.features) {
        if (d.has(f.name) && d.get(f.name) !== f.value) {
          return true;
        }
      }
    }
    return false;
  });

  protected readonly busy = signal(false);
  protected readonly resetting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected async save(): Promise<void> {
    if (this.busy() || !this.dirty()) return;
    this.busy.set(true);
    this.error.set(null);
    const updates: { name: string; value: string }[] = [];
    const d = this.draft();
    for (const g of this.groups()) {
      for (const f of g.features) {
        if (d.has(f.name)) {
          updates.push({ name: f.name, value: d.get(f.name)! });
        }
      }
    }
    try {
      await firstValueFrom(this.featuresApi.update('T', this.tenantId(), { features: updates }));
      this.notice.set('Features updated.');
      this.closed.emit(true);
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async resetToDefault(): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: 'Reset features?',
        message: 'Reset all features for ' + this.tenantName() + ' to default values?',
        confirmText: 'Reset to default',
        tone: 'danger',
      }))
    )
      return;
    this.resetting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.featuresApi.delete('T', this.tenantId()));
      this.notice.set('Features reset to default.');
      this.res.reload();
      this.draft.set(new Map());
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.resetting.set(false);
    }
  }
}
