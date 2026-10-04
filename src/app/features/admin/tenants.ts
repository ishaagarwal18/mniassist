import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { readApiError } from '../../core/util/api-error';
import { TenantDto, TenantService } from '../../proxy/tenant-management';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArDialog } from '../../ui';
import { ArGrid } from '../../ui/grid';

const SEED: TenantDto[] = [
  { id: 't-1', name: 'vertex-automation' },
  { id: 't-2', name: 'meridian-foods' },
];

/**
 * Host-only workspace management. Creating one provisions its admin, roles and
 * billing defaults server-side; renaming and deleting are the other two things a
 * platform operator needs. Everything inside a workspace is the tenant admin's job,
 * done from Users and Roles.
 */
@Component({
  selector: 'ar-admin-tenants',
  imports: [ArTopbar, ArCard, ArButton, ArBanner, ArDialog, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Workspaces"
      [subtitle]="subtitle()"
      help="Every tenant workspace on this platform instance. Creating one here is a host-admin action — most customers should sign up for their own instead."
    >
      <button ar-button type="button" variant="primary" icon="plus" (click)="openCreate()">
        New workspace
      </button>
    </ar-topbar>

    <div class="page ar-scroll">
      <div class="page__col">
        @if (error(); as e) {
          <ar-banner tone="bad">{{ e }}</ar-banner>
        }
        @if (notice(); as n) {
          <ar-banner tone="good">{{ n }}</ar-banner>
        }

        <ar-card heading="All workspaces">
          <ejs-grid arGrid="workspaces" [dataSource]="tenants()" aria-label="All workspaces">
            <e-columns>
              <e-column field="name" headerText="Name">
                <ng-template #template let-t>
                  <span class="ar-mono">{{ t.name }}</span>
                </ng-template>
              </e-column>
              <e-column
                headerText="Actions"
                width="170"
                textAlign="Right"
                [allowSorting]="false"
                [allowFiltering]="false"
                [showInColumnChooser]="false"
              >
                <ng-template #template let-t>
                  <span class="ta-actions">
                    <button type="button" class="link" (click)="openRename(t)">Rename</button>
                    <button type="button" class="link link--danger" (click)="remove(t)">
                      Delete
                    </button>
                  </span>
                </ng-template>
              </e-column>
            </e-columns>
            <ng-template #emptyRecordTemplate>No workspaces yet.</ng-template>
          </ejs-grid>
        </ar-card>
      </div>
    </div>

    @if (dialog(); as mode) {
      <ar-dialog
        [title]="mode === 'create' ? 'New workspace' : 'Rename workspace'"
        (dismiss)="dialog.set(null)"
      >
        <label class="fld">
          <span class="fld__k">Workspace name</span>
          <input
            class="ar-field__input"
            autocapitalize="none"
            placeholder="e.g. vertex-automation"
            [value]="fName()"
            (input)="fName.set($any($event.target).value)"
          />
        </label>

        @if (mode === 'create') {
          <label class="fld">
            <span class="fld__k">Admin email</span>
            <input
              class="ar-field__input"
              type="email"
              [value]="fEmail()"
              (input)="fEmail.set($any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Admin password</span>
            <input
              class="ar-field__input"
              type="password"
              [value]="fPassword()"
              (input)="fPassword.set($any($event.target).value)"
            />
          </label>
        }

        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="dialog.set(null)">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !canSave()"
            (click)="save()"
          >
            {{ busy() ? 'Saving…' : mode === 'create' ? 'Create workspace' : 'Save' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    .page {
      padding: 20px;
    }
    .page__col {
      max-width: 720px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .ta-actions {
      text-align: right;
      white-space: nowrap;
    }
    .ta-empty {
      color: var(--ar-ink-400);
      padding: 14px 0;
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
    .fld {
      display: block;
    }
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
  `,
})
export class ArAdminTenants {
  private readonly api = inject(TenantService);
  private readonly mock = environment.useMockData;

  private readonly tick = signal(0);
  private readonly resource = rxResource({
    params: () => (this.mock ? undefined : { t: this.tick() }),
    stream: () => this.api.getList({ maxResultCount: 200, sorting: 'name' }),
    defaultValue: { totalCount: 0, items: [] as TenantDto[] },
  });

  protected readonly tenants = computed<readonly TenantDto[]>(() =>
    this.mock ? SEED : this.resource.value().items,
  );
  protected readonly subtitle = computed(() => {
    const n = this.tenants().length;
    return `${n} workspace${n === 1 ? '' : 's'}`;
  });

  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly dialog = signal<'create' | 'rename' | null>(null);
  private readonly editingId = signal<string | null>(null);
  protected readonly fName = signal('');
  protected readonly fEmail = signal('');
  protected readonly fPassword = signal('');

  protected readonly canSave = computed(() => {
    if (!this.fName().trim()) return false;
    if (this.dialog() === 'create') {
      return this.fEmail().trim().length > 0 && this.fPassword().length >= 6;
    }
    return true;
  });

  protected openCreate(): void {
    this.editingId.set(null);
    this.fName.set('');
    this.fEmail.set('');
    this.fPassword.set('');
    this.error.set(null);
    this.dialog.set('create');
  }

  protected openRename(t: TenantDto): void {
    this.editingId.set(t.id);
    this.fName.set(t.name);
    this.error.set(null);
    this.dialog.set('rename');
  }

  protected async save(): Promise<void> {
    if (!this.canSave() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.dialog() === 'create') {
        await firstValueFrom(
          this.api.create({
            name: this.fName().trim().toLowerCase(),
            adminEmailAddress: this.fEmail().trim(),
            adminPassword: this.fPassword(),
          }),
        );
        this.notice.set(`Workspace "${this.fName().trim().toLowerCase()}" created.`);
      } else {
        await firstValueFrom(
          this.api.update(this.editingId()!, { name: this.fName().trim().toLowerCase() }),
        );
        this.notice.set('Workspace renamed.');
      }
      this.dialog.set(null);
      this.reload();
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(t: TenantDto): Promise<void> {
    if (!confirm(`Delete workspace "${t.name}"? This removes all of its data.`)) return;
    this.error.set(null);
    try {
      await firstValueFrom(this.api.delete(t.id));
      this.notice.set(`Workspace "${t.name}" deleted.`);
      this.reload();
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  private reload(): void {
    this.tick.update((n) => n + 1);
  }
}
