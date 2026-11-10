import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { PermissionDirective } from '@abp/ng.core';

import { environment } from '../../../environments/environment';
import { readApiError } from '../../core/util/api-error';
import { IdentityRoleDto, IdentityUserDto, IdentityUserService } from '../../proxy/identity';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArChip, ArDialog } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArUserSecurityDialog } from './user-security-dialog';
import { ArPermissionDialog } from './permission-dialog';

const SEED: IdentityUserDto[] = [
  {
    id: 'u-1',
    userName: 'admin',
    name: 'Rahul',
    surname: 'Kanade',
    email: 'admin@sun-energy-automation.test',
    phoneNumber: '+91 98765 43210',
    isActive: true,
    lockoutEnabled: true,
    roleNames: ['admin'],
  },
];

interface Row extends IdentityUserDto {
  roleNames: string[];
}

/**
 * ABP-native user management for a workspace using Syncfusion Grid:
 * create, edit, deactivate, manage permissions, manage security lockout, and delete users.
 */
@Component({
  selector: 'ar-admin-users',
  standalone: true,
  imports: [
    ArTopbar,
    ArCard,
    ArButton,
    ArChip,
    ArBanner,
    ArDialog,
    ArGrid,
    GridModule,
    ArUserSecurityDialog,
    ArPermissionDialog,
    PermissionDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Users"
      [subtitle]="subtitle()"
      help="Every identity that can sign in to this platform instance, across every workspace. To invite a teammate into one workspace, use Members & invites instead."
    >
      <button
        ar-button
        type="button"
        variant="primary"
        icon="plus"
        *abpPermission="'AbpIdentity.Users.Create'"
        (click)="openCreate()"
      >
        New user
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

        <ar-card heading="Workspace users">
          <ejs-grid arGrid="users" [dataSource]="rows()" aria-label="Workspace users">
            <e-columns>
              <e-column field="displayName" headerText="User">
                <ng-template #template let-u>
                  <div class="u-name">{{ u.displayName }}</div>
                  <div class="u-sub ar-mono">{{ u.userName }}</div>
                </ng-template>
              </e-column>
              <e-column field="email" headerText="Email & Contact">
                <ng-template #template let-u>
                  <div>{{ u.email }}</div>
                  @if (u.phoneNumber) {
                    <div class="u-sub ar-mono">{{ u.phoneNumber }}</div>
                  }
                </ng-template>
              </e-column>
              <e-column field="roles" headerText="Roles">
                <ng-template #template let-u>
                  @for (r of u.roleNames; track r) {
                    <ar-chip tone="neutral">{{ r }}</ar-chip>
                  }
                </ng-template>
              </e-column>
              <e-column field="status" headerText="Status" width="130">
                <ng-template #template let-u>
                  @if (!u.isActive) {
                    <ar-chip tone="amber">Inactive</ar-chip>
                  } @else {
                    <ar-chip tone="good">Active</ar-chip>
                  }
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
                <ng-template #template let-u>
                  <span class="ta-actions">
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="edit"
                      title="Edit user"
                      *abpPermission="'AbpIdentity.Users.Update'"
                      (click)="openEdit(u.user)"
                    ></button>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="shield"
                      title="Permissions"
                      *abpPermission="'AbpIdentity.Users.ManagePermissions'"
                      (click)="openPermissions(u.user)"
                    ></button>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="user"
                      title="Security"
                      *abpPermission="'AbpIdentity.Users.Update'"
                      (click)="security.set(u.user)"
                    ></button>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="trash"
                      title="Delete user"
                      *abpPermission="'AbpIdentity.Users.Delete'"
                      (click)="remove(u.user)"
                    ></button>
                  </span>
                </ng-template>
              </e-column>
            </e-columns>
            <ng-template #emptyRecordTemplate>No users.</ng-template>
          </ejs-grid>
        </ar-card>
      </div>
    </div>

    @if (permsUser(); as pu) {
      <ar-permission-dialog
        providerName="U"
        [providerKey]="pu.id"
        [entityDisplayName]="display(pu) + ' (' + pu.userName + ')'"
        (closed)="permsUser.set(null)"
      />
    }

    @if (security(); as su) {
      <ar-user-security-dialog
        [userId]="su.id"
        [userName]="su.userName"
        (closed)="security.set(null)"
      />
    }

    @if (dialog(); as mode) {
      <ar-dialog
        [title]="mode === 'create' ? 'New user' : 'Edit user'"
        (dismiss)="dialog.set(null)"
      >
        <label class="fld">
          <span class="fld__k">Username</span>
          <input
            required
            maxlength="256"
            class="ar-field__input"
            autocapitalize="none"
            [disabled]="mode === 'edit'"
            [value]="fUserName()"
            (input)="fUserName.set($any($event.target).value)"
          />
        </label>
        <div class="fld-row">
          <label class="fld">
            <span class="fld__k">First name <span class="ar-field__opt">optional</span></span>
            <input
              class="ar-field__input"
              [value]="fName()"
              (input)="fName.set($any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Last name <span class="ar-field__opt">optional</span></span>
            <input
              class="ar-field__input"
              [value]="fSurname()"
              (input)="fSurname.set($any($event.target).value)"
            />
          </label>
        </div>
        <div class="fld-row">
          <label class="fld">
            <span class="fld__k">Email</span>
            <input
              required
              class="ar-field__input"
              type="email"
              [value]="fEmail()"
              (input)="fEmail.set($any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Phone <span class="ar-field__opt">optional</span></span>
            <input
              class="ar-field__input"
              type="tel"
              placeholder="+91 98200 12345"
              [value]="fPhoneNumber()"
              (input)="fPhoneNumber.set($any($event.target).value)"
            />
            <span class="ar-field__opt"
              >They can sign in with it. Each user needs their own number.</span
            >
          </label>
        </div>
        @if (mode === 'create') {
          <label class="fld">
            <span class="fld__k">Password</span>
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
        <div class="chk-row">
          <label class="chk">
            <input
              type="checkbox"
              [checked]="fActive()"
              (change)="fActive.set($any($event.target).checked)"
            />
            Active
          </label>
          <label class="chk">
            <input
              type="checkbox"
              [checked]="fLockoutEnabled()"
              (change)="fLockoutEnabled.set($any($event.target).checked)"
            />
            Lockout enabled
          </label>
        </div>

        <div class="fld">
          <span class="fld__k">Roles</span>
          @if (rolesLoading()) {
            <span class="fld__hint">Loading this user's roles…</span>
          }
          <div class="roles">
            @for (r of assignableRoles(); track r.id) {
              <label class="chk">
                <input
                  type="checkbox"
                  [checked]="fRoles().includes(r.name)"
                  (change)="toggleRole(r.name, $any($event.target).checked)"
                />
                {{ r.name }}
              </label>
            }
          </div>
        </div>

        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="dialog.set(null)">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || rolesLoading()"
            (click)="save()"
          >
            {{ busy() ? 'Saving…' : 'Save' }}
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
      max-width: 980px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .u-name {
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .u-sub {
      font-size: 11px;
      color: var(--ar-ink-400);
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
    .fld-row {
      display: flex;
      gap: 12px;
    }
    .fld-row .fld {
      flex: 1;
    }
    .chk-row {
      display: flex;
      gap: 24px;
      margin: 4px 0;
    }
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .fld__hint {
      display: block;
      margin-bottom: 4px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .chk {
      display: flex;
      align-items: center;
      gap: 7px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .roles {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 16px;
      margin-top: 4px;
    }
  `,
})
export class ArAdminUsers {
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(IdentityUserService);
  private readonly mock = environment.useMockData;

  private readonly tick = signal(0);
  private readonly resource = rxResource({
    params: () => (this.mock ? undefined : { t: this.tick() }),
    stream: () => this.api.getList({ maxResultCount: 200, sorting: 'userName' }),
    defaultValue: { totalCount: 0, items: [] as IdentityUserDto[] },
  });

  private readonly rolesResource = rxResource({
    params: () => (this.mock ? undefined : {}),
    stream: () => this.api.getAssignableRoles(),
    defaultValue: { items: [] as IdentityRoleDto[] },
  });

  protected readonly assignableRoles = computed<readonly IdentityRoleDto[]>(() =>
    this.mock
      ? [{ id: 'r', name: 'admin', isDefault: false, isStatic: true, isPublic: true }]
      : this.rolesResource.value().items,
  );

  protected readonly users = computed<readonly Row[]>(() =>
    (this.mock ? SEED : this.resource.value().items).map((u) => ({
      ...u,
      roleNames: u.roleNames ?? u.extraProperties?.RoleNames ?? [],
    })),
  );

  /** Grid rows: plain values to sort, filter and export by, plus the user for the actions. */
  protected readonly rows = computed(() =>
    this.users().map((u) => ({
      id: u.id,
      user: u,
      displayName: this.display(u),
      userName: u.userName,
      email: u.email,
      phoneNumber: u.phoneNumber,
      roleNames: u.roleNames,
      roles: u.roleNames.join(', '),
      isActive: u.isActive,
      lockoutEnabled: u.lockoutEnabled ?? false,
      status: u.isActive ? 'Active' : 'Inactive',
    })),
  );

  protected readonly subtitle = computed(() => {
    const n = this.users().length;
    return `${n} user${n === 1 ? '' : 's'}`;
  });

  protected display(u: IdentityUserDto): string {
    return [u.name, u.surname].filter(Boolean).join(' ').trim() || u.userName;
  }

  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly dialog = signal<'create' | 'edit' | null>(null);
  /** The user whose security dialog is open. */
  protected readonly security = signal<Row | null>(null);
  /** The user whose permissions dialog is open. */
  protected readonly permsUser = signal<Row | null>(null);

  private readonly editingId = signal<string | null>(null);
  protected readonly fUserName = signal('');
  protected readonly fName = signal('');
  protected readonly fSurname = signal('');
  protected readonly fEmail = signal('');
  protected readonly fPhoneNumber = signal('');
  protected readonly fPassword = signal('');
  protected readonly fActive = signal(true);
  protected readonly fLockoutEnabled = signal(true);
  protected readonly fRoles = signal<string[]>([]);

  /** The edited user's roles are being read; saving before they arrive would replace them with none. */
  protected readonly rolesLoading = signal(false);

  protected readonly canSave = computed(() => {
    if (this.rolesLoading()) return false;
    if (!this.fUserName().trim() || !this.fEmail().trim()) return false;
    if (this.dialog() === 'create' && this.fPassword().length < 6) return false;
    return true;
  });

  protected toggleRole(name: string, on: boolean): void {
    this.fRoles.update((rs) => (on ? [...new Set([...rs, name])] : rs.filter((r) => r !== name)));
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.rolesLoading.set(false);
    this.fUserName.set('');
    this.fName.set('');
    this.fSurname.set('');
    this.fEmail.set('');
    this.fPhoneNumber.set('');
    this.fPassword.set('');
    this.fActive.set(true);
    this.fLockoutEnabled.set(true);
    this.fRoles.set([]);
    this.error.set(null);
    this.dialog.set('create');
  }

  protected openEdit(u: Row): void {
    this.editingId.set(u.id);
    this.fUserName.set(u.userName);
    this.fName.set(u.name ?? '');
    this.fSurname.set(u.surname ?? '');
    this.fEmail.set(u.email);
    this.fPhoneNumber.set(u.phoneNumber ?? '');
    this.fActive.set(u.isActive);
    this.fLockoutEnabled.set(u.lockoutEnabled ?? true);
    this.fRoles.set([...u.roleNames]);
    this.savedRoles = [...u.roleNames];
    this.error.set(null);
    this.dialog.set('edit');
    if (!this.mock) void this.loadRoles(u.id);
  }

  /** The roles the edited user held when the dialog opened: changing them signs the user out (said in the notice). */
  private savedRoles: string[] = [];

  /** Ticks the roles the user holds now, read on their own so the dialog never starts from a list without them. */
  private async loadRoles(id: string): Promise<void> {
    this.rolesLoading.set(true);
    try {
      const { items } = await firstValueFrom(this.api.getRoles(id));
      if (this.editingId() === id) {
        this.fRoles.set(items.map((r) => r.name));
        this.savedRoles = items.map((r) => r.name);
      }
    } catch (e) {
      if (this.editingId() === id) this.error.set(readApiError(e));
    } finally {
      if (this.editingId() === id) this.rolesLoading.set(false);
    }
  }

  protected openPermissions(u: Row): void {
    this.permsUser.set(u);
  }

  protected async save(): Promise<void> {
    if (!this.canSave() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const base = {
      userName: this.fUserName().trim(),
      name: this.fName().trim() || undefined,
      surname: this.fSurname().trim() || undefined,
      email: this.fEmail().trim(),
      phoneNumber: this.fPhoneNumber().trim() || undefined,
      isActive: this.fActive(),
      lockoutEnabled: this.fLockoutEnabled(),
      roleNames: this.fRoles(),
    };
    try {
      if (this.dialog() === 'create') {
        await firstValueFrom(this.api.create({ ...base, password: this.fPassword() }));
        this.notice.set(`User "${base.userName}" created.`);
      } else {
        await firstValueFrom(this.api.update(this.editingId()!, base));
        const before = new Set(this.savedRoles);
        const rolesChanged =
          before.size !== base.roleNames.length || base.roleNames.some((r) => !before.has(r));
        this.notice.set(
          rolesChanged
            ? 'User updated. Their role changed, so they are signed out and asked to sign in again.'
            : 'User updated.',
        );
      }
      this.dialog.set(null);
      this.reload();
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(u: Row): Promise<void> {
    if (!(await this.dialogs.delete('this user', u.userName, 'They can no longer sign in.')))
      return;
    this.error.set(null);
    try {
      await firstValueFrom(this.api.delete(u.id));
      this.notice.set(`User "${u.userName}" deleted.`);
      this.reload();
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  private reload(): void {
    this.tick.update((n) => n + 1);
  }
}
