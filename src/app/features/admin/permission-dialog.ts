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
import { FilterService, ToolbarService, TreeGridModule } from '@syncfusion/ej2-angular-treegrid';

import { readApiError } from '../../core/util/api-error';
import { GetPermissionListResultDto, PermissionsService } from '../../proxy/permission-management';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { ensureSyncfusionTheme } from '../../core/ui/syncfusion-theme';
import { registerSyncfusionLicense } from '../../core/ui/syncfusion-license';

registerSyncfusionLicense();

interface TreeRow {
  id: string;
  parentId: string | null;
  name: string;
  key: string;
  isGroup: boolean;
}

/**
 * ABP permission editor using Syncfusion TreeGrid.
 * Supports both Role permissions (`providerName='R'`) and User permissions (`providerName='U'`).
 */
@Component({
  selector: 'ar-permission-dialog',
  standalone: true,
  imports: [ArDialog, ArButton, ArBanner, ArChip, TreeGridModule],
  providers: [ToolbarService, FilterService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      [title]="'Permissions · ' + entityDisplayName()"
      width="min(860px, calc(100vw - 32px))"
      (dismiss)="closed.emit(false)"
    >
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (notice(); as n) {
        <ar-banner tone="good">{{ n }}</ar-banner>
      }

      @if (permsLoading()) {
        <div class="hint">Loading permissions…</div>
      } @else {
        <div class="perm-toolbar">
          <div class="perm-toolbar__counts">
            <span class="ar-mono">{{ grantedCount() }}</span> granted of
            <span class="ar-mono">{{ totalCount() }}</span> permissions
          </div>
          <div class="perm-toolbar__actions">
            <button ar-button type="button" variant="ghost" size="sm" (click)="grantAll()">
              Grant all
            </button>
            <button ar-button type="button" variant="ghost" size="sm" (click)="revokeAll()">
              Revoke all
            </button>
          </div>
        </div>

        <ejs-treegrid
          #tree
          id="entity-permissions-tree"
          class="ar-grid perms-tree"
          [dataSource]="treeRows()"
          idMapping="id"
          parentIdMapping="parentId"
          [treeColumnIndex]="0"
          [toolbar]="['Search', 'ExpandAll', 'CollapseAll']"
          gridLines="Horizontal"
          [enableHover]="true"
          [allowSelection]="false"
          height="420"
        >
          <e-columns>
            <e-column field="name" headerText="Permission">
              <ng-template #template let-r>
                <label
                  class="perm"
                  [class.perm--group]="r.isGroup"
                  (click)="$event.stopPropagation()"
                >
                  <input
                    type="checkbox"
                    [checked]="stateOf(r.id) === 'all'"
                    [indeterminate]="stateOf(r.id) === 'some'"
                    [attr.aria-label]="(r.isGroup ? 'All of ' : '') + r.name"
                    (change)="toggleRow(r.id, $any($event.target).checked)"
                  />
                  <span>{{ r.name }}</span>
                </label>
              </ng-template>
            </e-column>
            <e-column field="key" headerText="Permission key" width="280">
              <ng-template #template let-r>
                <span class="ar-mono perm__key">{{ r.key }}</span>
              </ng-template>
            </e-column>
            <e-column headerText="Granted" width="120" textAlign="Right">
              <ng-template #template let-r>
                @if (r.isGroup) {
                  <span class="perm__count">{{ countIn(r.id) }}</span>
                } @else if (stateOf(r.id) === 'all') {
                  <ar-chip tone="good">Granted</ar-chip>
                }
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-treegrid>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(false)">Cancel</button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="saving() || !dirty()"
          (click)="save()"
        >
          {{ saving() ? 'Saving…' : 'Save permissions' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .hint {
      color: var(--ar-ink-400);
      font: 400 13px var(--ar-font-sans);
      padding: 16px 0;
    }
    .perm-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .perm-toolbar__counts {
      font-size: 12px;
    }
    .perm-toolbar__actions {
      display: flex;
      gap: 8px;
    }
    .perms-tree {
      display: block;
      margin-bottom: 12px;
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
    .perm__key {
      font-size: 11.5px;
      color: var(--ar-ink-400);
    }
    .perm__count {
      font: 600 12px var(--ar-font-mono);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArPermissionDialog {
  private readonly permApi = inject(PermissionsService);

  readonly providerName = input.required<string>();
  readonly providerKey = input.required<string>();
  readonly entityDisplayName = input.required<string>();

  readonly closed = output<boolean>();

  constructor() {
    ensureSyncfusionTheme('grid');
  }

  private readonly permsResource = rxResource({
    params: () => ({
      providerName: this.providerName(),
      providerKey: this.providerKey(),
    }),
    stream: ({ params }) => this.permApi.get(params.providerName, params.providerKey),
    defaultValue: { entityDisplayName: '', groups: [] } as GetPermissionListResultDto,
  });

  protected readonly permsLoading = computed(() => this.permsResource.isLoading());
  protected readonly groups = computed(() => this.permsResource.value().groups ?? []);

  protected readonly treeRows = computed<TreeRow[]>(() => {
    const rows: TreeRow[] = [];
    for (const g of this.groups()) {
      const gid = 'group:' + g.name;
      rows.push({
        id: gid,
        parentId: null,
        name: g.displayName ?? g.name ?? '',
        key: '',
        isGroup: true,
      });
      for (const p of g.permissions) {
        rows.push({
          id: p.name,
          parentId: p.parentName ?? gid,
          name: p.displayName ?? p.name,
          key: p.name,
          isGroup: false,
        });
      }
    }
    return rows;
  });

  private readonly below = computed(() => {
    const children = new Map<string, string[]>();
    for (const r of this.treeRows()) {
      if (r.parentId) {
        children.set(r.parentId, [...(children.get(r.parentId) ?? []), r.id]);
      }
    }
    const all = new Map<string, string[]>();
    const walk = (id: string): string[] => {
      const cached = all.get(id);
      if (cached) return cached;
      const out = (children.get(id) ?? []).flatMap((c) => [c, ...walk(c)]);
      all.set(id, out);
      return out;
    };
    for (const r of this.treeRows()) walk(r.id);
    return {
      all,
      parentOf: new Map(this.treeRows().map((r) => [r.id, r.parentId])),
    };
  });

  private permsUnder(id: string): string[] {
    const under = this.below().all.get(id) ?? [];
    return id.startsWith('group:') ? under : [id, ...under];
  }

  protected readonly draft = signal<Set<string> | null>(null);

  protected readonly ticked = computed<Set<string>>(() => {
    const d = this.draft();
    if (d !== null) return d;
    const res = this.permsResource.value();
    const granted = new Set<string>();
    for (const g of res?.groups ?? []) {
      for (const p of g.permissions) {
        if (p.isGranted) granted.add(p.name);
      }
    }
    return granted;
  });

  protected readonly totalCount = computed(() => {
    let count = 0;
    for (const g of this.groups()) {
      count += g.permissions.length;
    }
    return count;
  });

  protected readonly grantedCount = computed(() => {
    const t = this.ticked();
    let count = 0;
    for (const g of this.groups()) {
      for (const p of g.permissions) {
        if (t.has(p.name)) count++;
      }
    }
    return count;
  });

  protected readonly dirty = computed(() => {
    const res = this.permsResource.value();
    if (!res) return false;
    const original = new Set<string>();
    for (const g of res.groups ?? []) {
      for (const p of g.permissions) {
        if (p.isGranted) original.add(p.name);
      }
    }
    const now = this.ticked();
    if (now.size !== original.size) return true;
    for (const n of now) {
      if (!original.has(n)) return true;
    }
    return false;
  });

  protected stateOf(id: string): 'all' | 'some' | 'none' {
    const names = this.permsUnder(id);
    const ticked = this.ticked();
    const on = names.filter((n) => ticked.has(n)).length;
    return on === 0 ? 'none' : on === names.length ? 'all' : 'some';
  }

  protected countIn(groupId: string): string {
    const names = this.permsUnder(groupId);
    const ticked = this.ticked();
    return `${names.filter((n) => ticked.has(n)).length} / ${names.length}`;
  }

  protected toggleRow(id: string, on: boolean): void {
    const next = new Set(this.ticked());
    for (const n of this.permsUnder(id)) {
      if (on) next.add(n);
      else next.delete(n);
    }
    if (on && !id.startsWith('group:')) {
      let parent = this.below().parentOf.get(id);
      while (parent && !parent.startsWith('group:')) {
        next.add(parent);
        parent = this.below().parentOf.get(parent);
      }
    }
    this.draft.set(next);
  }

  protected grantAll(): void {
    const next = new Set<string>();
    for (const g of this.groups()) {
      for (const p of g.permissions) {
        next.add(p.name);
      }
    }
    this.draft.set(next);
  }

  protected revokeAll(): void {
    this.draft.set(new Set<string>());
  }

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected async save(): Promise<void> {
    const res = this.permsResource.value();
    if (!res || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const now = this.ticked();
    const permissions: { name: string; isGranted: boolean }[] = [];
    for (const g of res.groups ?? []) {
      for (const p of g.permissions) {
        permissions.push({ name: p.name, isGranted: now.has(p.name) });
      }
    }
    try {
      await firstValueFrom(
        this.permApi.update(this.providerName(), this.providerKey(), { permissions }),
      );
      this.notice.set('Permissions saved.');
      this.closed.emit(true);
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.saving.set(false);
    }
  }
}
