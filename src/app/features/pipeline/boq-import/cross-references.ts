import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { ArTopbar } from '../../../layout/topbar';
import {
  CrossReferenceDto,
  CrossReferenceRelation,
  CrossReferenceService,
  CrossReferenceSource,
} from '../../../proxy/pipeline/cross-reference.service';
import { ArBanner, ArButton, ArChip } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { CROSS_REFERENCE_TEMPLATE } from './boq-import.logic';

const RELATION_LABEL: Record<CrossReferenceRelation, string> = {
  [CrossReferenceRelation.Equivalent]: 'Equivalent',
  [CrossReferenceRelation.Functional]: 'Functional',
  [CrossReferenceRelation.Upgrade]: 'Upgrade',
};

const SOURCE_LABEL: Record<CrossReferenceSource, string> = {
  [CrossReferenceSource.Imported]: 'Imported',
  [CrossReferenceSource.Learned]: 'Learned',
  [CrossReferenceSource.Manual]: 'Typed in',
};

/**
 * Cross-references for BOQ matching: another make's part number, or a customer's wording, and the part we quote for it. Imported
 * from a CSV, typed in here, or learned from corrections on the review page; a learned one waits here for a manager's approval.
 */
@Component({
  selector: 'ar-cross-references',
  imports: [ArTopbar, ArButton, ArBanner, ArChip, ArGrid, GridModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cross-references.html',
  styleUrl: './cross-references.scss',
})
export class ArCrossReferences {
  private readonly api = inject(CrossReferenceService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);

  protected readonly relations = [
    CrossReferenceRelation.Equivalent,
    CrossReferenceRelation.Functional,
    CrossReferenceRelation.Upgrade,
  ];
  protected readonly canApprove = grantedPolicy(
    'AutoReach.Quotations.ApproveCrossReferences',
    this.permissions,
  );

  protected readonly rows = signal<CrossReferenceDto[]>([]);
  protected readonly total = signal(0);
  protected readonly waiting = signal(0);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly onlyWaiting = signal(false);
  protected readonly filter = signal('');
  protected readonly importProblems = signal<string[]>([]);

  protected readonly otherMake = signal('');
  protected readonly otherPart = signal('');
  protected readonly ourPart = signal('');
  protected readonly relation = signal(CrossReferenceRelation.Equivalent);
  protected readonly note = signal('');
  protected readonly canAdd = computed(
    () => this.otherPart().trim().length > 0 && this.ourPart().trim().length > 0 && !this.busy(),
  );

  constructor() {
    void this.load();
  }

  protected relationText(r: CrossReferenceRelation): string {
    return RELATION_LABEL[r];
  }

  protected sourceText(s: CrossReferenceSource): string {
    return SOURCE_LABEL[s];
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [page, waiting] = await Promise.all([
        firstValueFrom(
          this.api.getList({
            filter: this.filter().trim() || null,
            approved: this.onlyWaiting() ? false : null,
            maxResultCount: 500,
          }),
        ),
        firstValueFrom(this.api.getList({ approved: false, maxResultCount: 1 })),
      ]);
      this.rows.set(page.items ?? []);
      this.total.set(page.totalCount ?? 0);
      this.waiting.set(waiting.totalCount ?? 0);
      this.error.set(null);
    } catch (e) {
      this.error.set(readApiError(e, 'The cross-references could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected showWaiting(on: boolean): void {
    this.onlyWaiting.set(on);
    void this.load();
  }

  /** The cross-reference being changed in the form above, or null when the form adds a new one. */
  protected readonly editingId = signal<string | null>(null);

  protected edit(r: CrossReferenceDto): void {
    this.editingId.set(r.id);
    this.otherMake.set(r.otherMake ?? '');
    this.otherPart.set(r.otherPartNumber);
    this.ourPart.set(r.ourPartNumber);
    this.relation.set(r.relation);
    this.note.set(r.note ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.otherPart.set('');
    this.ourPart.set('');
    this.note.set('');
  }

  protected async add(): Promise<void> {
    if (!this.canAdd()) return;
    this.busy.set(true);
    const editing = this.editingId();
    try {
      const input = {
        otherMake: this.otherMake().trim() || null,
        otherPartNumber: this.otherPart().trim(),
        ourPartNumber: this.ourPart().trim(),
        relation: this.relation(),
        note: this.note().trim() || null,
      };
      await firstValueFrom(editing ? this.api.update(editing, input) : this.api.create(input));
      this.toasts.success(editing ? 'Cross-reference saved.' : 'Cross-reference added.');
      this.editingId.set(null);
      this.otherPart.set('');
      this.ourPart.set('');
      this.note.set('');
      await this.load();
    } catch (e) {
      this.toasts.error(
        readApiError(
          e,
          editing
            ? 'The cross-reference could not be saved.'
            : 'The cross-reference could not be added.',
        ),
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busy.set(true);
    this.importProblems.set([]);
    try {
      const body = new FormData();
      body.append('file', file, file.name);
      const result = await firstValueFrom(this.api.import(body));
      this.importProblems.set(result.problems ?? []);
      this.toasts.success(
        `${result.added} added, ${result.updated} updated${result.problems?.length ? `, ${result.problems.length} rows skipped` : ''}.`,
      );
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The file could not be imported.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected downloadTemplate(): void {
    const url = URL.createObjectURL(new Blob([CROSS_REFERENCE_TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cross-references.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  protected async approve(ids: string[]): Promise<void> {
    if (!ids.length) return;
    try {
      const n = await firstValueFrom(this.api.approve(ids));
      this.toasts.success(`${n} approved.`);
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The cross-references could not be approved.'));
    }
  }

  protected approveAllShown(): void {
    void this.approve(
      this.rows()
        .filter((r) => !r.isApproved)
        .map((r) => r.id),
    );
  }

  protected async remove(r: CrossReferenceDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Delete this cross-reference?',
      message: `${r.otherPartNumber} will no longer be matched to ${r.ourPartNumber}.`,
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(r.id));
      this.toasts.success('Cross-reference deleted.');
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The cross-reference could not be deleted.'));
    }
  }
}
