import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { PermissionDirective } from '@abp/ng.core';

import { environment } from '../../../environments/environment';
import { readApiError } from '../../core/util/api-error';
import { workspaceNameProblem, workspaceSlug } from '../../core/util/workspace-slug';
import { TenantDto, TenantService } from '../../proxy/tenant-management';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArDialog } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArTenantFeaturesDialog } from './tenant-features-dialog';
import { ArWorkspaceManageDialog } from './workspace-manage-dialog';

const SEED: TenantDto[] = [
  { id: 't-1', name: 'sun-energy-automation' },
  { id: 't-2', name: 'meridian-foods' },
];

/**
 * Host-only workspace management using Syncfusion Grid:
 * create, rename, delete workspaces, manage tenant feature flags via ABP Feature Management,
 * and the platform controls in the Manage dialog: suspend, plan, feature overrides, own database, enter.
 */
@Component({
  selector: 'ar-admin-tenants',
  standalone: true,
  imports: [
    ArTopbar,
    ArCard,
    ArButton,
    ArBanner,
    ArDialog,
    ArGrid,
    GridModule,
    ArTenantFeaturesDialog,
    ArWorkspaceManageDialog,
    PermissionDirective,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isPage) {
      <ar-topbar [title]="pageTitle()">
        <button ar-button type="button" variant="ghost" (click)="close()">Back to Workspaces</button>
      </ar-topbar>
      <div class="ar-form-page ar-scroll">
        <ng-container *ngTemplateOutlet="formsTpl" />
      </div>
    } @else {
      <ar-topbar
        title="Workspaces"
        [subtitle]="subtitle()"
        help="Every tenant workspace on this platform instance. Creating one here is a host-admin action — most customers should sign up for their own instead."
      >
        <button
          ar-button
          type="button"
          variant="primary"
          icon="plus"
          *abpPermission="'AbpTenantManagement.Tenants.Create'"
          (click)="goCreate()"
        >
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
                width="140"
                textAlign="Right"
                [allowSorting]="false"
                [allowFiltering]="false"
                [showInColumnChooser]="false"
              >
                <ng-template #template let-t>
                  <span class="ta-actions">
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="settings"
                      title="Manage workspace"
                      *abpPermission="'AutoReach.Administration.ManageTenants'"
                      (click)="goManage(t)"
                    ></button>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="bolt"
                      title="Features"
                      *abpPermission="'AbpTenantManagement.Tenants.ManageFeatures'"
                      (click)="goFeatures(t)"
                    ></button>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="edit"
                      title="Rename workspace"
                      *abpPermission="'AbpTenantManagement.Tenants.Update'"
                      (click)="goRename(t)"
                    ></button>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="trash"
                      title="Delete workspace"
                      *abpPermission="'AbpTenantManagement.Tenants.Delete'"
                      (click)="remove(t)"
                    ></button>
                  </span>
                </ng-template>
              </e-column>
            </e-columns>
            <ng-template #emptyRecordTemplate>No workspaces yet.</ng-template>
          </ejs-grid>
        </ar-card>
      </div>
    </div>
  }

  <ng-template #formsTpl>
    @if (featuresTenant(); as ft) {
      <ar-tenant-features-dialog
        [tenantId]="ft.id"
        [tenantName]="ft.name"
        (closed)="close()"
      />
    }

    @if (manageTenant(); as mt) {
      <ar-workspace-manage-dialog
        [tenantId]="mt.id"
        [tenantName]="mt.name"
        (closed)="manageClosed($event)"
      />
    }

    @if (dialog(); as mode) {
      <ar-dialog
        [title]="mode === 'create' ? 'New workspace' : 'Rename workspace'"
        (dismiss)="close()"
      >
        <label class="fld">
          <span class="fld__k">Workspace name</span>
          <input
            required
            maxlength="64"
            class="ar-field__input"
            autocapitalize="none"
            placeholder="e.g. Sun Energy Automation"
            [value]="fName()"
            (input)="fName.set($any($event.target).value)"
          />
          @if (fName().trim() && nameProblem(); as e) {
            <span class="fld__bad">{{ e }}</span>
          } @else if (fSlug()) {
            <span class="fld__hint"
              >Signs in as <strong>{{ fSlug() }}</strong></span
            >
          }
        </label>

        @if (mode === 'create') {
          <label class="fld">
            <span class="fld__k">Admin email</span>
            <input
              required
              class="ar-field__input"
              type="email"
              [value]="fEmail()"
              (input)="fEmail.set($any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Admin password</span>
            <input
              required
              minlength="6"
              class="ar-field__input"
              type="password"
              [value]="fPassword()"
              (input)="fPassword.set($any($event.target).value)"
            />
          </label>
        }

        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="close()">Cancel</button>
          <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
            {{ busy() ? 'Saving…' : mode === 'create' ? 'Create workspace' : 'Save' }}
          </button>
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
      max-width: 800px;
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
    .fld__hint,
    .fld__bad {
      display: block;
      margin-top: 4px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .fld__bad {
      color: var(--ar-red-600, #b91c1c);
    }
  `,
})
export class ArAdminTenants {
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(TenantService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly pageTitle = computed(() => {
    switch (this.mode) {
      case 'new': return 'New workspace';
      case 'rename': return 'Rename workspace';
      case 'features': return 'Workspace features';
      case 'manage': return 'Manage workspace';
      default: return 'Workspaces';
    }
  });

  constructor() {
    effect(() => {
      const list = this.tenants();
      if (list.length > 0) {
        this.checkRouteParam();
      }
    });
    if (this.mode === 'new') {
      this.openCreate();
    }
  }

  private checkRouteParam(): void {
    if (this.mode === 'new') {
      this.openCreate();
    } else if (this.mode === 'rename') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const t = this.tenants().find((x) => x.id === id);
      if (t) this.openRename(t);
    } else if (this.mode === 'features') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const t = this.tenants().find((x) => x.id === id);
      if (t) this.openFeatures(t);
    } else if (this.mode === 'manage') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const t = this.tenants().find((x) => x.id === id);
      if (t) this.manageTenant.set(t);
    }
  }

  protected goCreate(): void {
    if (this.router) void this.router.navigate(['/admin/tenants/new']);
    else this.openCreate();
  }

  protected goRename(t: TenantDto): void {
    if (this.router && t.id) void this.router.navigate(['/admin/tenants', t.id, 'rename']);
    else this.openRename(t);
  }

  protected goFeatures(t: TenantDto): void {
    if (this.router && t.id) void this.router.navigate(['/admin/tenants', t.id, 'features']);
    else this.openFeatures(t);
  }

  protected goManage(t: TenantDto): void {
    if (this.router && t.id) void this.router.navigate(['/admin/tenants', t.id, 'manage']);
    else this.manageTenant.set(t);
  }

  protected close(): void {
    this.dialog.set(null);
    this.featuresTenant.set(null);
    this.manageTenant.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/admin/tenants']);
    }
  }

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
  /** The tenant whose features dialog is open. */
  protected readonly featuresTenant = signal<TenantDto | null>(null);
  /** The tenant whose platform controls (status, plan, database, entry) are open. */
  protected readonly manageTenant = signal<TenantDto | null>(null);

  protected manageClosed(changed: boolean): void {
    this.close();
    if (changed) this.reload();
  }

  private readonly editingId = signal<string | null>(null);
  protected readonly fName = signal('');
  protected readonly fEmail = signal('');
  protected readonly fPassword = signal('');

  /** The sign-in name the typed name becomes ("Sun Energy" → "sun-energy"). */
  protected readonly fSlug = computed(() => workspaceSlug(this.fName()));
  protected readonly nameProblem = computed(() => workspaceNameProblem(this.fName()));

  protected readonly canSave = computed(() => {
    if (this.nameProblem()) return false;
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

  protected openFeatures(t: TenantDto): void {
    this.featuresTenant.set(t);
  }

  protected async save(): Promise<void> {
    if (!this.canSave() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.dialog() === 'create') {
        await firstValueFrom(
          this.api.create({
            name: this.fSlug(),
            adminEmailAddress: this.fEmail().trim(),
            adminPassword: this.fPassword(),
          }),
        );
        this.notice.set(`Workspace "${this.fSlug()}" created.`);
      } else {
        await firstValueFrom(this.api.update(this.editingId()!, { name: this.fSlug() }));
        this.notice.set('Workspace renamed.');
      }
      this.close();
      this.reload();
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(t: TenantDto): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'this workspace',
        t.name,
        'All of its data is removed. This cannot be undone.',
      ))
    )
      return;
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
