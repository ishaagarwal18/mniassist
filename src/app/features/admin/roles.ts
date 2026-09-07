import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { readApiError } from '../../core/util/api-error';
import { IdentityRoleDto, IdentityRoleService } from '../../proxy/identity';
import { GetPermissionListResultDto, PermissionsService } from '../../proxy/permission-management';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArChip, ArDialog } from '../../ui';

const SEED: IdentityRoleDto[] = [
  { id: 'r-1', name: 'admin', isDefault: false, isStatic: true, isPublic: true },
  { id: 'r-2', name: 'Manager', isDefault: false, isStatic: false, isPublic: true },
  { id: 'r-3', name: 'Agent', isDefault: true, isStatic: false, isPublic: true },
];

/**
 * ABP-native roles and their permission grid. Pick a role on the left, tick the
 * permissions it should carry on the right, save. The six job roles a workspace
 * starts with are editable here like any other.
 */
@Component({
  selector: 'ar-admin-roles',
  imports: [ArTopbar, ArCard, ArButton, ArChip, ArBanner, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="Roles &amp; permissions" [subtitle]="subtitle()">
      <button ar-button type="button" variant="primary" icon="plus" (click)="openCreate()">
        New role
      </button>
    </ar-topbar>

    <div class="page ar-scroll">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (notice(); as n) {
        <ar-banner tone="good">{{ n }}</ar-banner>
      }

      <div class="grid">
        <ar-card heading="Roles">
          <ul class="roles">
            @for (r of roles(); track r.id) {
              <li>
                <button
                  type="button"
                  class="role"
                  [class.role--on]="r.name === selected()"
                  (click)="select(r.name)"
                >
                  <span class="role__name">{{ r.name }}</span>
                  @if (r.isStatic) {
                    <ar-chip tone="neutral">system</ar-chip>
                  }
                  @if (r.isDefault) {
                    <ar-chip tone="good">default</ar-chip>
                  }
                </button>
              </li>
            }
          </ul>
        </ar-card>

        <ar-card [heading]="selected() ? 'Permissions · ' + selected() : 'Permissions'">
          <span card-actions>
            @if (selected()) {
              <button type="button" class="link" (click)="openEditRole()">Edit role</button>
              <button type="button" class="link link--danger" (click)="removeRole()">Delete</button>
            }
          </span>

          @if (!selected()) {
            <p class="hint">Select a role to see and change what it can do.</p>
          } @else if (permsLoading()) {
            <p class="hint">Loading…</p>
          } @else {
            @for (g of groups(); track g.name) {
              <div class="pgroup">
                <h3 class="pgroup__t">{{ g.displayName }}</h3>
                <div class="pgroup__items">
                  @for (p of g.permissions; track p.name) {
                    <label class="chk" [style.paddingLeft.px]="p.parentName ? 16 : 0">
                      <input
                        type="checkbox"
                        [checked]="ticked().has(p.name)"
                        (change)="toggle(p.name, $any($event.target).checked)"
                      />
                      {{ p.displayName }}
                    </label>
                  }
                </div>
              </div>
            }
            <div class="save-row">
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="savingPerms() || !dirty()"
                (click)="savePermissions()"
              >
                {{ savingPerms() ? 'Saving…' : 'Save permissions' }}
              </button>
            </div>
          }
        </ar-card>
      </div>
    </div>

    @if (roleDialog(); as mode) {
      <ar-dialog
        [title]="mode === 'create' ? 'New role' : 'Edit role'"
        (dismiss)="roleDialog.set(null)"
      >
        <label class="fld">
          <span class="fld__k">Name</span>
          <input
            class="ar-field__input"
            [value]="rName()"
            (input)="rName.set($any($event.target).value)"
          />
        </label>
        <label class="chk">
          <input
            type="checkbox"
            [checked]="rDefault()"
            (change)="rDefault.set($any($event.target).checked)"
          />
          Assign to new users by default
        </label>
        <label class="chk">
          <input
            type="checkbox"
            [checked]="rPublic()"
            (change)="rPublic.set($any($event.target).checked)"
          />
          Visible when assigning roles
        </label>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="roleDialog.set(null)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="roleBusy() || !rName().trim()"
            (click)="saveRole()"
          >
            {{ roleBusy() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    .page {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 16px;
      align-items: start;
      max-width: 1100px;
    }
    .roles {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .role {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border: 0;
      border-radius: var(--ar-radius-inset);
      background: none;
      cursor: pointer;
      text-align: left;
    }
    .role:hover {
      background: var(--ar-bg-100);
    }
    .role--on {
      background: var(--ar-teal-100);
    }
    .role__name {
      flex: 1;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .hint {
      color: var(--ar-ink-400);
      font: 400 12px var(--ar-font-sans);
    }
    .pgroup {
      padding: 10px 0;
      border-top: 1px solid var(--ar-line-200);
    }
    .pgroup:first-of-type {
      border-top: 0;
    }
    .pgroup__t {
      margin: 0 0 6px;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .pgroup__items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .chk {
      display: flex;
      align-items: center;
      gap: 7px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .save-row {
      margin-top: 14px;
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
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
  `,
})
export class ArAdminRoles {
  private readonly roleApi = inject(IdentityRoleService);
  private readonly permApi = inject(PermissionsService);
  private readonly mock = environment.useMockData;

  private readonly tick = signal(0);
  private readonly rolesResource = rxResource({
    params: () => (this.mock ? undefined : { t: this.tick() }),
    stream: () => this.roleApi.getList(),
    defaultValue: { totalCount: 0, items: [] as IdentityRoleDto[] },
  });

  protected readonly roles = computed<readonly IdentityRoleDto[]>(() =>
    this.mock ? SEED : this.rolesResource.value().items,
  );
  protected readonly subtitle = computed(() => {
    const n = this.roles().length;
    return `${n} role${n === 1 ? '' : 's'}`;
  });

  protected readonly selected = signal<string | null>(null);

  private readonly permsResource = rxResource({
    params: () => {
      const role = this.selected();
      return this.mock || !role ? undefined : { role };
    },
    stream: ({ params }) => this.permApi.get('R', params.role),
    defaultValue: { entityDisplayName: '', groups: [] } as GetPermissionListResultDto,
  });

  protected readonly permsLoading = computed(() => this.permsResource.isLoading());
  protected readonly groups = computed(() => this.permsResource.value().groups);

  /** Names currently ticked, seeded from the loaded grid and edited locally. */
  protected readonly draft = signal(new Set<string>());
  private readonly loadedInto = signal<string | null>(null);

  protected readonly savingPerms = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  /**
   * The ticked set, tracking the loaded grid until the operator touches it. Read as
   * a computed so it re-seeds whenever a fresh grid arrives for a newly picked role.
   */
  protected readonly ticked = computed<Set<string>>(() => {
    const res = this.permsResource.value();
    const role = this.selected();
    if (res && role && this.loadedInto() === role) {
      return this.draft();
    }
    const granted = new Set<string>();
    for (const g of res?.groups ?? []) {
      for (const p of g.permissions) if (p.isGranted) granted.add(p.name);
    }
    return granted;
  });

  protected readonly dirty = computed(() => {
    const res = this.permsResource.value();
    if (!res) return false;
    const original = new Set<string>();
    for (const g of res.groups)
      for (const p of g.permissions) if (p.isGranted) original.add(p.name);
    const now = this.ticked();
    if (now.size !== original.size) return true;
    for (const n of now) if (!original.has(n)) return true;
    return false;
  });

  protected select(role: string): void {
    this.selected.set(role);
    this.loadedInto.set(null);
    this.error.set(null);
  }

  protected toggle(name: string, on: boolean): void {
    const next = new Set(this.ticked());
    if (on) next.add(name);
    else next.delete(name);
    this.draft.set(next);
    this.loadedInto.set(this.selected());
  }

  protected async savePermissions(): Promise<void> {
    const role = this.selected();
    const res = this.permsResource.value();
    if (!role || !res || this.savingPerms()) return;
    this.savingPerms.set(true);
    this.error.set(null);
    const now = this.ticked();
    const permissions: { name: string; isGranted: boolean }[] = [];
    for (const g of res.groups) {
      for (const p of g.permissions) permissions.push({ name: p.name, isGranted: now.has(p.name) });
    }
    try {
      await firstValueFrom(this.permApi.update('R', role, { permissions }));
      this.notice.set(`Permissions for "${role}" saved.`);
      this.loadedInto.set(null);
      this.permsResource.reload();
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.savingPerms.set(false);
    }
  }

  // ---- role CRUD ---------------------------------------------------------

  protected readonly roleDialog = signal<'create' | 'edit' | null>(null);
  private readonly editingRoleId = signal<string | null>(null);
  protected readonly rName = signal('');
  protected readonly rDefault = signal(false);
  protected readonly rPublic = signal(true);
  protected readonly roleBusy = signal(false);

  protected openCreate(): void {
    this.editingRoleId.set(null);
    this.rName.set('');
    this.rDefault.set(false);
    this.rPublic.set(true);
    this.roleDialog.set('create');
  }

  protected openEditRole(): void {
    const r = this.roles().find((x) => x.name === this.selected());
    if (!r) return;
    this.editingRoleId.set(r.id);
    this.rName.set(r.name);
    this.rDefault.set(r.isDefault);
    this.rPublic.set(r.isPublic);
    this.roleDialog.set('edit');
  }

  protected async saveRole(): Promise<void> {
    if (!this.rName().trim() || this.roleBusy()) return;
    this.roleBusy.set(true);
    this.error.set(null);
    const body = {
      name: this.rName().trim(),
      isDefault: this.rDefault(),
      isPublic: this.rPublic(),
    };
    try {
      if (this.roleDialog() === 'create') {
        await firstValueFrom(this.roleApi.create(body));
      } else {
        await firstValueFrom(this.roleApi.update(this.editingRoleId()!, body));
        if (this.selected() && this.selected() !== body.name) this.selected.set(body.name);
      }
      this.roleDialog.set(null);
      this.notice.set('Role saved.');
      this.reloadRoles();
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.roleBusy.set(false);
    }
  }

  protected async removeRole(): Promise<void> {
    const r = this.roles().find((x) => x.name === this.selected());
    if (!r || !confirm(`Delete role "${r.name}"?`)) return;
    this.error.set(null);
    try {
      await firstValueFrom(this.roleApi.delete(r.id));
      this.notice.set(`Role "${r.name}" deleted.`);
      this.selected.set(null);
      this.reloadRoles();
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  private reloadRoles(): void {
    this.tick.update((n) => n + 1);
  }
}
