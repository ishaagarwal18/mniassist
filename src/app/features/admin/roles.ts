import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FilterService, ToolbarService, TreeGridModule } from '@syncfusion/ej2-angular-treegrid';
import { PermissionDirective } from '@abp/ng.core';

import { environment } from '../../../environments/environment';
import { readApiError } from '../../core/util/api-error';
import { IdentityRoleDto, IdentityRoleService } from '../../proxy/identity';
import {
  GetPermissionListResultDto,
  PermissionGroup,
  PermissionsService,
} from '../../proxy/permission-management';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArChip, ArDialog } from '../../ui';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ensureSyncfusionTheme } from '../../core/ui/syncfusion-theme';
import { registerSyncfusionLicense } from '../../core/ui/syncfusion-license';
import { describeGroup, describePermission } from './permission-text';

// Syncfusion checks the licence in each component's constructor, before ours runs.
registerSyncfusionLicense();

const SEED: IdentityRoleDto[] = [
  { id: 'r-1', name: 'admin', isDefault: false, isStatic: true, isPublic: true },
  { id: 'r-2', name: 'Manager', isDefault: false, isStatic: false, isPublic: true },
  { id: 'r-3', name: 'Agent', isDefault: true, isStatic: false, isPublic: true },
];

interface RolePermData {
  groups: PermissionGroup[];
  draft: Set<string>;
  initial: Set<string>;
}

export interface RoleTreeRow {
  id: string;
  parentId: string | null;
  name: string;
  /** The raw permission key, shown only as a tooltip. */
  key: string;
  /** One sentence on what the permission allows (empty for role and group rows). */
  detail: string;
  isRole: boolean;
  isGroup: boolean;
  isPerm: boolean;
  roleName: string;
  role?: IdentityRoleDto;
  isStatic?: boolean;
  isDefault?: boolean;
}

/**
 * Single unified Syncfusion TreeGrid displaying roles and their permissions.
 * Top-level rows are roles; expanding a role displays its permission groups
 * and granular permissions with full search and batch save capabilities.
 */
@Component({
  selector: 'ar-admin-roles',
  standalone: true,
  imports: [
    ArTopbar,
    ArCard,
    ArButton,
    ArChip,
    ArBanner,
    ArDialog,
    TreeGridModule,
    PermissionDirective,
  ],
  providers: [ToolbarService, FilterService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Roles &amp; permissions"
      [subtitle]="subtitle()"
      help="Define what each role can see and do across the workspace. Expand a role to inspect and edit its permissions. Changing a role's permissions applies immediately to everyone holding it."
    >
      <button
        ar-button
        type="button"
        variant="primary"
        icon="plus"
        *abpPermission="'AbpIdentity.Roles.Create'"
        (click)="openCreate()"
      >
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

      <ar-card heading="Roles &amp; permissions hierarchy">
        <span card-actions>
          @if (dirtyRolesCount() > 0) {
            <button
              ar-button
              type="button"
              variant="primary"
              *abpPermission="'AbpIdentity.Roles.ManagePermissions'"
              [disabled]="savingRole() !== null"
              (click)="saveAllDirtyPermissions()"
            >
              {{
                savingRole() !== null ? 'Saving…' : 'Save all changes (' + dirtyRolesCount() + ')'
              }}
            </button>
          }
        </span>

        <ejs-treegrid
          #tree
          id="roles-and-permissions-tree"
          class="ar-grid roles-perms-tree"
          [dataSource]="treeRows()"
          idMapping="id"
          parentIdMapping="parentId"
          [treeColumnIndex]="0"
          [toolbar]="['Search', 'ExpandAll', 'CollapseAll']"
          gridLines="Horizontal"
          [enableHover]="true"
          [allowSelection]="false"
          height="540"
        >
          <e-columns>
            <e-column field="name" headerText="Role / Permission" minWidth="320">
              <ng-template #template let-r>
                @if (r.isRole) {
                  <div class="row-role">
                    <span class="row-role__name">{{ r.name }}</span>
                    <div class="row-role__chips">
                      @if (r.isStatic) {
                        <ar-chip tone="neutral">system</ar-chip>
                      }
                      @if (r.isDefault) {
                        <ar-chip tone="good">default</ar-chip>
                      }
                    </div>
                  </div>
                } @else {
                  <label
                    class="perm"
                    [class.perm--group]="r.isGroup"
                    (click)="$event.stopPropagation()"
                  >
                    <input
                      type="checkbox"
                      [checked]="stateOf(r.roleName, r.id) === 'all'"
                      [indeterminate]="stateOf(r.roleName, r.id) === 'some'"
                      [attr.aria-label]="(r.isGroup ? 'All of ' : '') + r.name"
                      (change)="toggleRow(r.roleName, r.id, $any($event.target).checked)"
                    />
                    <span>{{ r.name }}</span>
                  </label>
                }
              </ng-template>
            </e-column>

            <e-column field="detail" headerText="What it allows" width="340">
              <ng-template #template let-r>
                @if (r.isRole) {
                  <span class="row-role__type">{{
                    r.isStatic ? 'System role' : 'Custom workspace role'
                  }}</span>
                } @else if (!r.isGroup) {
                  <span class="perm__detail" [attr.title]="'Permission key: ' + r.key">{{
                    r.detail
                  }}</span>
                }
              </ng-template>
            </e-column>

            <e-column headerText="Granted" width="160" textAlign="Right">
              <ng-template #template let-r>
                @if (r.isRole) {
                  <span class="perm__count">{{ roleGrantedCount(r.roleName) }}</span>
                } @else if (r.isGroup) {
                  <span class="perm__count">{{ countIn(r.roleName, r.id) }}</span>
                } @else if (stateOf(r.roleName, r.id) === 'all') {
                  <ar-chip tone="good">Granted</ar-chip>
                }
              </ng-template>
            </e-column>

            <e-column headerText="Actions" width="200" textAlign="Right">
              <ng-template #template let-r>
                @if (r.isRole && r.role) {
                  <div class="row-actions">
                    @if (isRoleDirty(r.roleName)) {
                      <button
                        ar-button
                        type="button"
                        variant="primary"
                        *abpPermission="'AbpIdentity.Roles.ManagePermissions'"
                        [disabled]="savingRole() === r.roleName"
                        (click)="saveRolePermissions(r.roleName)"
                      >
                        {{ savingRole() === r.roleName ? 'Saving…' : 'Save' }}
                      </button>
                    }
                    <button
                      type="button"
                      class="link"
                      *abpPermission="'AbpIdentity.Roles.Update'"
                      (click)="openEditRole(r.role)"
                    >
                      Edit
                    </button>
                    @if (!r.isStatic) {
                      <button
                        type="button"
                        class="link link--danger"
                        *abpPermission="'AbpIdentity.Roles.Delete'"
                        (click)="removeRole(r.role)"
                      >
                        Delete
                      </button>
                    }
                  </div>
                }
              </ng-template>
            </e-column>
          </e-columns>
          <ng-template #emptyRecordTemplate>No roles or permissions found.</ng-template>
        </ejs-treegrid>
      </ar-card>
    </div>

    @if (roleDialog(); as mode) {
      <ar-dialog
        [title]="mode === 'create' ? 'New role' : 'Edit role'"
        (dismiss)="roleDialog.set(null)"
      >
        <label class="fld">
          <span class="fld__k">Name</span>
          <input
            required
            maxlength="256"
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
            [disabled]="roleBusy()"
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
      min-width: 0;
      overflow-x: auto;
    }
    .roles-perms-tree {
      display: block;
      width: 100%;
    }
    .row-role {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .row-role__name {
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .row-role__chips {
      display: inline-flex;
      gap: 4px;
    }
    .row-role__type {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .row-actions {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }
    .perm {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .perm--group {
      font-weight: 600;
      color: var(--ar-ink-900);
    }
    .perm__detail {
      display: block;
      white-space: normal;
      line-height: 1.4;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .perm__count {
      font: 600 12px var(--ar-font-mono);
      color: var(--ar-ink-500);
    }
    .link {
      border: 0;
      background: none;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
      padding: 2px 4px;
    }
    .link--danger {
      color: var(--ar-red-600);
    }
    .chk {
      display: flex;
      align-items: center;
      gap: 7px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
      margin-top: 10px;
    }
    .fld {
      display: block;
      margin-bottom: 8px;
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
  private readonly dialogs = inject(ConfirmService);
  private readonly roleApi = inject(IdentityRoleService);
  private readonly permApi = inject(PermissionsService);
  private readonly mock = environment.useMockData;

  protected readonly tick = signal(0);
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

  protected readonly rolePermsMap = signal<Map<string, RolePermData>>(new Map());
  protected readonly savingRole = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly roleDialog = signal<'create' | 'edit' | null>(null);
  protected readonly editRoleTarget = signal<IdentityRoleDto | null>(null);
  protected readonly rName = signal('');
  protected readonly rDefault = signal(false);
  protected readonly rPublic = signal(true);
  protected readonly roleBusy = signal(false);

  constructor() {
    ensureSyncfusionTheme('grid');
    effect(() => {
      const list = this.roles();
      for (const r of list) {
        if (!this.rolePermsMap().has(r.name)) {
          void this.loadRolePermissions(r.name);
        }
      }
    });
  }

  protected async loadRolePermissions(roleName: string): Promise<void> {
    try {
      let res: GetPermissionListResultDto;
      if (this.mock) {
        res = this.getMockPermissions(roleName);
      } else {
        res = await firstValueFrom(this.permApi.get('R', roleName));
      }
      const initial = new Set<string>();
      for (const g of res.groups ?? []) {
        for (const p of g.permissions) {
          if (p.isGranted) initial.add(p.name);
        }
      }
      const draft = new Set<string>(initial);
      this.rolePermsMap.update((m) => {
        const next = new Map(m);
        next.set(roleName, { groups: res.groups ?? [], draft, initial });
        return next;
      });
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  /**
   * Unified hierarchical dataset for Syncfusion TreeGrid:
   * Level 1: Role
   * Level 2: Permission Group
   * Level 3: Permissions (with hierarchy supported)
   */
  protected readonly treeRows = computed<RoleTreeRow[]>(() => {
    const rows: RoleTreeRow[] = [];
    const rolesList = this.roles();
    const permsMap = this.rolePermsMap();

    for (const r of rolesList) {
      const roleRowId = `role:${r.name}`;
      rows.push({
        id: roleRowId,
        parentId: null,
        name: r.name,
        key: '',
        detail: r.isStatic ? 'System role' : 'Custom workspace role',
        isRole: true,
        isGroup: false,
        isPerm: false,
        roleName: r.name,
        role: r,
        isStatic: r.isStatic,
        isDefault: r.isDefault,
      });

      const pData = permsMap.get(r.name);
      if (pData) {
        for (const g of pData.groups) {
          const groupId = `${roleRowId}:group:${g.name}`;
          rows.push({
            id: groupId,
            parentId: roleRowId,
            name: describeGroup(g.name, g.displayName),
            key: '',
            detail: '',
            isRole: false,
            isGroup: true,
            isPerm: false,
            roleName: r.name,
          });
          const labels = new Map(g.permissions.map((p) => [p.name, p.displayName]));
          for (const p of g.permissions) {
            const parentPermId = p.parentName ? `${roleRowId}:perm:${p.parentName}` : groupId;
            const text = describePermission(
              p.name,
              p.displayName,
              p.parentName ? (labels.get(p.parentName) ?? p.parentName) : null,
            );
            rows.push({
              id: `${roleRowId}:perm:${p.name}`,
              parentId: parentPermId,
              name: text.title,
              key: p.name,
              detail: text.detail,
              isRole: false,
              isGroup: false,
              isPerm: true,
              roleName: r.name,
            });
          }
        }
      }
    }

    return rows;
  });

  /** Map of parentId and children per role for hierarchy walks */
  private readonly treeIndex = computed(() => {
    const parentMap = new Map<string, string | null>();
    const childrenMap = new Map<string, string[]>();

    for (const r of this.treeRows()) {
      parentMap.set(r.id, r.parentId);
      if (r.parentId) {
        const list = childrenMap.get(r.parentId) ?? [];
        list.push(r.id);
        childrenMap.set(r.parentId, list);
      }
    }

    return { parentMap, childrenMap };
  });

  private permsUnder(roleName: string, rowId: string): string[] {
    const { childrenMap } = this.treeIndex();
    const result: string[] = [];

    const walk = (id: string) => {
      const children = childrenMap.get(id) ?? [];
      for (const childId of children) {
        if (childId.includes(':perm:')) {
          result.push(this.permKeyFromRowId(childId));
        }
        walk(childId);
      }
    };

    if (rowId.includes(':perm:')) {
      result.push(this.permKeyFromRowId(rowId));
    }
    walk(rowId);
    return result;
  }

  private permKeyFromRowId(rowId: string): string {
    const idx = rowId.indexOf(':perm:');
    return idx >= 0 ? rowId.substring(idx + ':perm:'.length) : rowId;
  }

  protected stateOf(roleName: string, rowId: string): 'all' | 'some' | 'none' {
    const data = this.rolePermsMap().get(roleName);
    if (!data) return 'none';
    const under = this.permsUnder(roleName, rowId);
    if (under.length === 0) return 'none';
    const count = under.filter((k) => data.draft.has(k)).length;
    return count === 0 ? 'none' : count === under.length ? 'all' : 'some';
  }

  protected countIn(roleName: string, groupId: string): string {
    const data = this.rolePermsMap().get(roleName);
    if (!data) return '0 / 0';
    const under = this.permsUnder(roleName, groupId);
    const count = under.filter((k) => data.draft.has(k)).length;
    return `${count} / ${under.length}`;
  }

  protected roleGrantedCount(roleName: string): string {
    const data = this.rolePermsMap().get(roleName);
    if (!data) return '0 granted';
    let total = 0;
    for (const g of data.groups) total += g.permissions.length;
    return `${data.draft.size} / ${total} granted`;
  }

  protected toggleRow(roleName: string, rowId: string, on: boolean): void {
    const data = this.rolePermsMap().get(roleName);
    if (!data) return;
    const nextDraft = new Set(data.draft);
    const under = this.permsUnder(roleName, rowId);
    for (const permKey of under) {
      if (on) nextDraft.add(permKey);
      else nextDraft.delete(permKey);
    }

    // Ticking a child permission requires its parent permission
    if (on && rowId.includes(':perm:')) {
      const { parentMap } = this.treeIndex();
      let parent = parentMap.get(rowId);
      while (parent && parent.includes(':perm:')) {
        nextDraft.add(this.permKeyFromRowId(parent));
        parent = parentMap.get(parent);
      }
    }

    this.rolePermsMap.update((m) => {
      const next = new Map(m);
      next.set(roleName, { ...data, draft: nextDraft });
      return next;
    });
  }

  protected isRoleDirty(roleName: string): boolean {
    const data = this.rolePermsMap().get(roleName);
    if (!data) return false;
    if (data.draft.size !== data.initial.size) return true;
    for (const k of data.draft) {
      if (!data.initial.has(k)) return true;
    }
    return false;
  }

  protected readonly dirtyRolesCount = computed(() => {
    let count = 0;
    for (const r of this.roles()) {
      if (this.isRoleDirty(r.name)) count++;
    }
    return count;
  });

  protected async saveRolePermissions(roleName: string): Promise<void> {
    const data = this.rolePermsMap().get(roleName);
    if (!data || this.savingRole() !== null) return;
    this.savingRole.set(roleName);
    this.error.set(null);
    try {
      const allPerms: string[] = [];
      for (const g of data.groups) {
        for (const p of g.permissions) {
          allPerms.push(p.name);
        }
      }
      const permissions = allPerms.map((name) => ({
        name,
        isGranted: data.draft.has(name),
      }));
      await firstValueFrom(this.permApi.update('R', roleName, { permissions }));
      this.rolePermsMap.update((m) => {
        const next = new Map(m);
        const cur = next.get(roleName);
        if (cur) {
          next.set(roleName, { ...cur, initial: new Set(cur.draft) });
        }
        return next;
      });
      this.notice.set(`Permissions saved for role "${roleName}".`);
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.savingRole.set(null);
    }
  }

  protected async saveAllDirtyPermissions(): Promise<void> {
    for (const r of this.roles()) {
      if (this.isRoleDirty(r.name)) {
        await this.saveRolePermissions(r.name);
      }
    }
  }

  protected openCreate(): void {
    this.editRoleTarget.set(null);
    this.rName.set('');
    this.rDefault.set(false);
    this.rPublic.set(true);
    this.roleDialog.set('create');
  }

  protected openEditRole(role: IdentityRoleDto): void {
    this.editRoleTarget.set(role);
    this.rName.set(role.name);
    this.rDefault.set(role.isDefault ?? false);
    this.rPublic.set(role.isPublic ?? true);
    this.roleDialog.set('edit');
  }

  protected async saveRole(): Promise<void> {
    const name = this.rName().trim();
    if (!name || this.roleBusy()) return;
    this.roleBusy.set(true);
    this.error.set(null);
    try {
      if (this.roleDialog() === 'create') {
        await firstValueFrom(
          this.roleApi.create({
            name,
            isDefault: this.rDefault(),
            isPublic: this.rPublic(),
          }),
        );
        this.notice.set(`Role "${name}" created.`);
      } else {
        const target = this.editRoleTarget();
        if (target) {
          await firstValueFrom(
            this.roleApi.update(target.id, {
              name,
              isDefault: this.rDefault(),
              isPublic: this.rPublic(),
            }),
          );
          this.notice.set(`Role "${name}" updated.`);
        }
      }
      this.roleDialog.set(null);
      this.tick.update((n) => n + 1);
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.roleBusy.set(false);
    }
  }

  protected async removeRole(role: IdentityRoleDto): Promise<void> {
    if (role.isStatic) return;
    if (
      !(await this.dialogs.confirm({
        title: `Delete role "${role.name}"?`,
        message: 'Users with this role will lose any permissions granted only through it.',
        confirmText: 'Delete',
      }))
    ) {
      return;
    }
    this.error.set(null);
    try {
      await firstValueFrom(this.roleApi.delete(role.id));
      this.notice.set(`Role "${role.name}" deleted.`);
      this.tick.update((n) => n + 1);
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  private getMockPermissions(roleName: string): GetPermissionListResultDto {
    const isAdmin = roleName.toLowerCase() === 'admin';
    const isManager = roleName.toLowerCase() === 'manager';
    return {
      entityDisplayName: roleName,
      groups: [
        {
          name: 'AutoReach',
          displayName: 'AutoReach',
          permissions: [
            {
              name: 'AutoReach.Channels',
              displayName: 'Channels',
              isGranted: true,
              parentName: undefined,
            },
            {
              name: 'AutoReach.Channels.Manage',
              displayName: 'Manage channels',
              isGranted: isAdmin || isManager,
              parentName: 'AutoReach.Channels',
            },
            {
              name: 'AutoReach.Contacts',
              displayName: 'Contacts',
              isGranted: true,
              parentName: undefined,
            },
            {
              name: 'AutoReach.Contacts.Create',
              displayName: 'Create contacts',
              isGranted: true,
              parentName: 'AutoReach.Contacts',
            },
            {
              name: 'AutoReach.Contacts.Update',
              displayName: 'Update contacts',
              isGranted: true,
              parentName: 'AutoReach.Contacts',
            },
            {
              name: 'AutoReach.Contacts.Delete',
              displayName: 'Delete contacts',
              isGranted: isAdmin,
              parentName: 'AutoReach.Contacts',
            },
            {
              name: 'AutoReach.Campaigns',
              displayName: 'Campaigns',
              isGranted: true,
              parentName: undefined,
            },
            {
              name: 'AutoReach.Campaigns.Create',
              displayName: 'Create campaigns',
              isGranted: isAdmin || isManager,
              parentName: 'AutoReach.Campaigns',
            },
            {
              name: 'AutoReach.Campaigns.Send',
              displayName: 'Send campaigns',
              isGranted: isAdmin,
              parentName: 'AutoReach.Campaigns',
            },
            {
              name: 'AutoReach.Inbox',
              displayName: 'Inbox',
              isGranted: true,
              parentName: undefined,
            },
            {
              name: 'AutoReach.Inbox.Reply',
              displayName: 'Reply to chats',
              isGranted: true,
              parentName: 'AutoReach.Inbox',
            },
          ],
        },
        {
          name: 'AbpIdentity',
          displayName: 'Identity Management',
          permissions: [
            {
              name: 'AbpIdentity.Roles',
              displayName: 'Roles',
              isGranted: isAdmin,
              parentName: undefined,
            },
            {
              name: 'AbpIdentity.Roles.Create',
              displayName: 'Create roles',
              isGranted: isAdmin,
              parentName: 'AbpIdentity.Roles',
            },
            {
              name: 'AbpIdentity.Roles.Update',
              displayName: 'Update roles',
              isGranted: isAdmin,
              parentName: 'AbpIdentity.Roles',
            },
            {
              name: 'AbpIdentity.Roles.Delete',
              displayName: 'Delete roles',
              isGranted: isAdmin,
              parentName: 'AbpIdentity.Roles',
            },
            {
              name: 'AbpIdentity.Roles.ManagePermissions',
              displayName: 'Manage permissions',
              isGranted: isAdmin,
              parentName: 'AbpIdentity.Roles',
            },
            {
              name: 'AbpIdentity.Users',
              displayName: 'Users',
              isGranted: isAdmin || isManager,
              parentName: undefined,
            },
            {
              name: 'AbpIdentity.Users.Create',
              displayName: 'Create users',
              isGranted: isAdmin || isManager,
              parentName: 'AbpIdentity.Users',
            },
            {
              name: 'AbpIdentity.Users.Update',
              displayName: 'Update users',
              isGranted: isAdmin || isManager,
              parentName: 'AbpIdentity.Users',
            },
            {
              name: 'AbpIdentity.Users.Delete',
              displayName: 'Delete users',
              isGranted: isAdmin,
              parentName: 'AbpIdentity.Users',
            },
            {
              name: 'AbpIdentity.Users.ManagePermissions',
              displayName: 'Manage user permissions',
              isGranted: isAdmin,
              parentName: 'AbpIdentity.Users',
            },
          ],
        },
      ],
    } as unknown as GetPermissionListResultDto;
  }
}
