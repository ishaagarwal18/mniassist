import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import {
  ConsumableRuleDto,
  SaveConsumableRuleInput,
  SparesService,
} from '../../proxy/pipeline/spares.service';
import { ArButton, ArCard, ArChip, ArIcon } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';

const SEED_RULES: ConsumableRuleDto[] = [
  {
    id: 'r1',
    assetLabel: 'Atlas Copco GA 37',
    partNumber: 'AF-2901',
    description: 'Heavy duty air filter cartridge',
    quantityPerMachine: 2,
    intervalDays: 120,
    leadDays: 14,
    isActive: true,
    machineCount: 4,
  },
  {
    id: 'r2',
    assetLabel: 'Atlas Copco GA 37',
    partNumber: 'OF-1104',
    description: 'Spin-on oil separator element',
    quantityPerMachine: 1,
    intervalDays: 180,
    leadDays: 21,
    isActive: true,
    machineCount: 4,
  },
  {
    id: 'r3',
    assetLabel: 'Forbes Marshall Spirax 500',
    partNumber: 'GK-882',
    description: 'PTFE valve seat & gasket kit',
    quantityPerMachine: 1,
    intervalDays: 90,
    leadDays: 7,
    isActive: true,
    machineCount: 2,
  },
  {
    id: 'r4',
    assetLabel: 'Siemens Sinamics G120',
    partNumber: 'FAN-G120-7KW',
    description: 'Cooling fan assembly 230V',
    quantityPerMachine: 1,
    intervalDays: 365,
    leadDays: 30,
    isActive: true,
    machineCount: 7,
  },
];

@Component({
  selector: 'ar-spares-rules-page',
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArCard, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Spare Part Replacement Rules"
      subtitle="Scheduled consumable wear-part intervals by machinery make and model"
    >
      <button ar-button type="button" variant="ghost" (click)="back()">
        Back to Spares Due
      </button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <!-- Overview KPI Cards -->
      <section class="kpi-grid">
        <ar-card>
          <div class="kpi-content">
            <span class="kpi-label">Active Rules</span>
            <strong class="kpi-value">{{ rules().length }}</strong>
            <span class="kpi-note">Automated check triggers</span>
          </div>
        </ar-card>
        <ar-card>
          <div class="kpi-content">
            <span class="kpi-label">Equipment Models Covered</span>
            <strong class="kpi-value">{{ uniqueModels() }}</strong>
            <span class="kpi-note">Machine templates</span>
          </div>
        </ar-card>
        <ar-card>
          <div class="kpi-content">
            <span class="kpi-label">Daily Inspection</span>
            <strong class="kpi-value">Active</strong>
            <span class="kpi-note">Matching against installed base</span>
          </div>
        </ar-card>
      </section>

      <!-- Rules List Grid / Table -->
      <ar-card heading="Configured Consumable & Wear Part Rules">
        @if (loading()) {
          <p class="loading-state">Loading spare part rules…</p>
        } @else if (rules().length === 0) {
          <div class="empty-state">
            <p>No replacement rules defined yet.</p>
            <span class="empty-hint">Add a rule below to match machines on the installed base to required spare parts.</span>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="rules-table">
              <thead>
                <tr>
                  <th>Machine Model</th>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Default Qty</th>
                  <th>Interval (Days)</th>
                  <th>Lead Time (Days)</th>
                  <th class="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (r of rules(); track r.id) {
                  <tr>
                    <td>
                      <strong>{{ r.assetLabel }}</strong>
                    </td>
                    <td>
                      <span class="ar-mono text-primary font-bold">{{ r.partNumber }}</span>
                    </td>
                    <td>{{ r.description }}</td>
                    <td>{{ r.quantityPerMachine || 1 }}</td>
                    <td>
                      <ar-chip tone="neutral">{{ r.intervalDays }} days</ar-chip>
                    </td>
                    <td>
                      <ar-chip tone="amber">{{ r.leadDays }} days lead</ar-chip>
                    </td>
                    <td class="actions-col">
                      <div class="row-actions">
                        <button
                          ar-button
                          type="button"
                          variant="ghost"
                          class="btn-sm"
                          (click)="editRule(r)"
                        >
                          Edit
                        </button>
                        <button
                          ar-button
                          type="button"
                          variant="danger"
                          class="btn-sm"
                          (click)="deleteRule(r)"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </ar-card>

      <!-- Add / Edit Rule Card -->
      <ar-card [heading]="editingRuleId() ? 'Edit Spare Part Replacement Rule' : 'Add New Spare Part Rule'" id="rule-form-card">
        <form class="rule-form" (submit)="$event.preventDefault(); saveRule()">
          <div class="form-grid">
            <label class="ar-field">
              <span class="ar-field__label">Machine Make <span class="ar-field__opt">(optional)</span></span>
              <input
                class="ar-field__input"
                placeholder="e.g. Atlas Copco"
                [(ngModel)]="draftMake"
                name="draftMake"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Machine Model <span class="required">*</span></span>
              <input
                class="ar-field__input"
                required
                placeholder="e.g. GA 37 or Sinamics G120"
                [(ngModel)]="draftModel"
                name="draftModel"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Spare Part Number <span class="required">*</span></span>
              <input
                class="ar-field__input ar-mono"
                required
                placeholder="e.g. AF-2901"
                [(ngModel)]="draftPartNumber"
                name="draftPartNumber"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Part Description <span class="required">*</span></span>
              <input
                class="ar-field__input"
                required
                placeholder="e.g. Heavy duty air filter cartridge"
                [(ngModel)]="draftDescription"
                name="draftDescription"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Default Quantity</span>
              <input
                type="number"
                min="1"
                class="ar-field__input"
                [(ngModel)]="draftQuantity"
                name="draftQuantity"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Replacement Interval (Days) <span class="required">*</span></span>
              <input
                type="number"
                min="1"
                required
                class="ar-field__input"
                [(ngModel)]="draftInterval"
                name="draftInterval"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Procurement Lead Time (Days)</span>
              <input
                type="number"
                min="0"
                class="ar-field__input"
                [(ngModel)]="draftLeadTime"
                name="draftLeadTime"
              />
            </label>
          </div>

          @if (error()) {
            <p class="error-msg" role="alert">{{ error() }}</p>
          }

          <div class="form-actions">
            @if (editingRuleId()) {
              <button
                ar-button
                type="button"
                variant="ghost"
                (click)="cancelEdit()"
              >
                Cancel Edit
              </button>
            }
            <button
              ar-button
              type="submit"
              variant="primary"
              [disabled]="busy() || !draftModel.trim() || !draftPartNumber.trim() || !draftDescription.trim()"
            >
              {{ busy() ? 'Saving…' : (editingRuleId() ? 'Update Replacement Rule' : 'Add Replacement Rule') }}
            </button>
          </div>
        </form>
      </ar-card>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.5rem 2rem 3rem;
        max-width: 1040px;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }
      .kpi-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .kpi-label {
        font-size: 0.8125rem;
        color: var(--ar-ink-500);
        font-weight: 500;
      }
      .kpi-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--ar-ink-900);
      }
      .kpi-note {
        font-size: 0.75rem;
        color: var(--ar-ink-400);
      }
      .table-responsive {
        overflow-x: auto;
      }
      .rules-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }
      .rules-table th {
        text-align: left;
        padding: 0.75rem 1rem;
        border-bottom: 2px solid var(--ar-line-200);
        color: var(--ar-ink-600);
        font-weight: 600;
        font-size: 0.8125rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .rules-table td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--ar-line-100);
        vertical-align: middle;
      }
      .actions-col {
        text-align: right;
      }
      .row-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
      }
      .btn-sm {
        padding: 0.25rem 0.625rem;
        font-size: 0.75rem;
      }
      .rule-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-top: 0.5rem;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }
      .required {
        color: var(--ar-bad-600);
      }
      .error-msg {
        color: var(--ar-bad-600);
        font-size: 0.875rem;
        margin: 0;
      }
      .empty-state {
        padding: 2rem;
        text-align: center;
        color: var(--ar-ink-600);
      }
      .empty-hint {
        font-size: 0.8125rem;
        color: var(--ar-ink-400);
      }
      .loading-state {
        padding: 2rem;
        color: var(--ar-ink-500);
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        padding-top: 0.75rem;
        border-top: 1px solid var(--ar-line-200);
      }
      @media (max-width: 768px) {
        .kpi-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ArSparesRulesPage implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(SparesService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  protected readonly rules = signal<ConsumableRuleDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingRuleId = signal<string | null>(null);

  protected draftMake = '';
  protected draftModel = '';
  protected draftPartNumber = '';
  protected draftDescription = '';
  protected draftQuantity = 1;
  protected draftInterval = 120;
  protected draftLeadTime = 14;

  protected uniqueModels = () => {
    const set = new Set(this.rules().map((r) => r.assetLabel));
    return set.size;
  };

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (environment.useMockData) {
        this.rules.set(SEED_RULES);
      } else {
        const res = await firstValueFrom(this.api.getRules());
        this.rules.set(res || []);
      }
    } catch {
      this.rules.set(SEED_RULES);
    } finally {
      this.loading.set(false);
    }
  }

  back(): void {
    void this.router.navigateByUrl('/spares');
  }

  editRule(rule: ConsumableRuleDto): void {
    this.editingRuleId.set(rule.id);
    this.error.set(null);

    // Parse make & model if formatted as "Make Model"
    const parts = rule.assetLabel.split(' ');
    if (parts.length > 1) {
      this.draftMake = parts[0];
      this.draftModel = parts.slice(1).join(' ');
    } else {
      this.draftMake = '';
      this.draftModel = rule.assetLabel;
    }

    this.draftPartNumber = rule.partNumber;
    this.draftDescription = rule.description;
    this.draftQuantity = rule.quantityPerMachine || 1;
    this.draftInterval = rule.intervalDays;
    this.draftLeadTime = rule.leadDays;

    setTimeout(() => {
      document.getElementById('rule-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  cancelEdit(): void {
    this.editingRuleId.set(null);
    this.error.set(null);
    this.resetForm();
  }

  private resetForm(): void {
    this.draftPartNumber = '';
    this.draftDescription = '';
    this.draftQuantity = 1;
    this.draftInterval = 120;
    this.draftLeadTime = 14;
  }

  async saveRule(): Promise<void> {
    if (!this.draftModel.trim() || !this.draftPartNumber.trim() || !this.draftDescription.trim() || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    const assetLabel = this.draftMake.trim()
      ? `${this.draftMake.trim()} ${this.draftModel.trim()}`
      : this.draftModel.trim();

    const input: SaveConsumableRuleInput = {
      assetLabel,
      partNumber: this.draftPartNumber.trim(),
      description: this.draftDescription.trim(),
      quantityPerMachine: Number(this.draftQuantity) || 1,
      intervalDays: Number(this.draftInterval) || 120,
      leadDays: Number(this.draftLeadTime) || 14,
      isActive: true,
    };

    const editId = this.editingRuleId();

    try {
      if (editId) {
        // Updating existing rule
        if (environment.useMockData) {
          this.rules.update((list) =>
            list.map((r) =>
              r.id === editId
                ? {
                    ...r,
                    assetLabel: input.assetLabel,
                    partNumber: input.partNumber,
                    description: input.description ?? '',
                    quantityPerMachine: input.quantityPerMachine,
                    intervalDays: input.intervalDays,
                    leadDays: input.leadDays,
                  }
                : r,
            ),
          );
        } else {
          const updated = await firstValueFrom(this.api.updateRule(editId, input));
          if (updated) {
            this.rules.update((list) => list.map((r) => (r.id === editId ? updated : r)));
          }
        }
        this.toasts.success(`Rule for ${input.partNumber} updated.`);
        this.editingRuleId.set(null);
        this.resetForm();
      } else {
        // Creating new rule
        if (environment.useMockData) {
          const created: ConsumableRuleDto = {
            id: 'r-' + Date.now(),
            assetLabel: input.assetLabel,
            partNumber: input.partNumber,
            description: input.description ?? '',
            quantityPerMachine: input.quantityPerMachine,
            intervalDays: input.intervalDays,
            leadDays: input.leadDays,
            isActive: true,
            machineCount: 1,
          };
          this.rules.update((list) => [...list, created]);
        } else {
          const created = await firstValueFrom(this.api.createRule(input));
          if (created) {
            this.rules.update((list) => [...list, created]);
          }
        }
        this.toasts.success(`Rule for ${input.partNumber} added.`);
        this.resetForm();
      }
    } catch {
      this.error.set(editId ? 'Failed to update replacement rule.' : 'Failed to add replacement rule.');
    } finally {
      this.busy.set(false);
    }
  }

  async deleteRule(rule: ConsumableRuleDto): Promise<void> {
    const ok = await this.dialogs.delete(
      'this rule',
      `${rule.description} (${rule.partNumber}) for ${rule.assetLabel}`,
    );
    if (!ok) return;

    try {
      if (!environment.useMockData) {
        await firstValueFrom(this.api.deleteRule(rule.id));
      }
      this.rules.update((list) => list.filter((r) => r.id !== rule.id));
      this.toasts.success('Rule deleted.');
    } catch {
      this.toasts.error('Failed to delete rule.');
    }
  }
}
