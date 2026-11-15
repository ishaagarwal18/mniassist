import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  FaultCheckRole,
  FaultCodeDto,
  FaultCodeExtractionDto,
  FaultCodeImportPreviewDto,
  FaultCodeManualDto,
  FaultCodeProposalDto,
  FaultCodeService,
  FaultCodeState,
  FaultExtractionState,
  FaultSeverity,
  SaveFaultCodeInput,
} from '../../proxy/support/fault-code.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { savePdf } from '../pipeline/machine/machine-qr.logic';
import {
  CSV_TEMPLATE,
  EXTRACTION_TEXT,
  ROLE_TEXT,
  SOURCE_TEXT,
  STATE_TEXT,
  STATE_TONE,
  approvalWarning,
  blankEntry,
  cleanEntry,
  entryProblem,
  splitList,
} from './fault-code.logic';

type Tab = 'library' | 'proposals' | 'manual' | 'import';

interface ExtractForm {
  documentId: string;
  make: string;
  series: string;
  fromPage: string;
  toPage: string;
}

/**
 * The fault-code library: one entry per make, series and code, with ranked causes, first checks marked with who may do them, a safety
 * note and spares. Entries come typed, from a CSV, drafted from an OEM manual in the Library, or learned from closed tickets; none
 * answers a customer until it is approved.
 */
@Component({
  selector: 'ar-fault-codes-page',
  imports: [ArTopbar, ArButton, ArBanner, ArCard, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fault-codes-page.html',
  styleUrl: './fault-codes-page.scss',
})
export class ArFaultCodesPage {
  private readonly api = inject(FaultCodeService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);

  protected readonly canManage = grantedPolicy('AutoReach.FaultCodes.Manage', this.permissions);

  protected readonly tab = signal<Tab>('library');
  protected readonly entries = signal<FaultCodeDto[]>([]);
  protected readonly total = signal(0);
  protected readonly filter = signal('');
  protected readonly stateFilter = signal<FaultCodeState | null>(null);
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly editingId = signal<string | null>(null);
  protected readonly form = signal<SaveFaultCodeInput | null>(null);
  protected readonly editing = computed(
    () => this.entries().find((e) => e.id === this.editingId()) ?? null,
  );
  protected readonly formProblem = computed(() => {
    const f = this.form();
    return f ? entryProblem(f) : null;
  });
  protected readonly formWarning = computed(() => {
    const f = this.form();
    return f ? approvalWarning(f) : null;
  });

  protected readonly proposals = signal<FaultCodeProposalDto[]>([]);
  protected readonly manuals = signal<FaultCodeManualDto[]>([]);
  protected readonly extractions = signal<FaultCodeExtractionDto[]>([]);
  protected readonly extract = signal<ExtractForm>({
    documentId: '',
    make: '',
    series: '',
    fromPage: '',
    toPage: '',
  });
  protected readonly importFile = signal<File | null>(null);
  protected readonly preview = signal<FaultCodeImportPreviewDto | null>(null);
  protected readonly previewCounts = computed(() => {
    const rows = this.preview()?.rows ?? [];
    return {
      adds: rows.filter((r) => !r.updates).length,
      updates: rows.filter((r) => r.updates).length,
      approved: rows.filter((r) => r.updatesApproved).length,
    };
  });

  protected readonly State = FaultCodeState;
  protected readonly Severity = FaultSeverity;
  protected readonly Role = FaultCheckRole;
  protected readonly roles = [
    FaultCheckRole.Operator,
    FaultCheckRole.Electrician,
    FaultCheckRole.Engineer,
  ];
  protected readonly STATE_TEXT = STATE_TEXT;
  protected readonly STATE_TONE = STATE_TONE;
  protected readonly SOURCE_TEXT = SOURCE_TEXT;
  protected readonly ROLE_TEXT = ROLE_TEXT;
  protected readonly EXTRACTION_TEXT = EXTRACTION_TEXT;
  protected readonly ExtractionState = FaultExtractionState;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getList({
          filter: this.filter() || null,
          state: this.stateFilter(),
          maxResultCount: 500,
        }),
      );
      this.entries.set(page.items ?? []);
      this.total.set(page.totalCount ?? 0);
      this.error.set(null);
    } catch (e) {
      this.error.set(readApiError(e, 'The library could not be loaded.'));
    }
  }

  protected async show(tab: Tab): Promise<void> {
    this.tab.set(tab);

    try {
      if (tab === 'proposals') this.proposals.set(await firstValueFrom(this.api.getProposals()));
      if (tab === 'manual') {
        const [manuals, runs] = await Promise.all([
          firstValueFrom(this.api.getManuals()),
          firstValueFrom(this.api.getExtractions()),
        ]);
        this.manuals.set(manuals);
        this.extractions.set(runs);
      }
    } catch (e) {
      this.toasts.error(readApiError(e, 'This could not be loaded.'));
    }
  }

  // ---- selection and approval -------------------------------------------------------------------------------------------

  protected toggle(id: string, on: boolean): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected async approve(ids: string[]): Promise<void> {
    if (!ids.length) return;
    this.busy.set(true);
    try {
      const result = await firstValueFrom(this.api.approve(ids));
      if (result.approved)
        this.toasts.success(`${result.approved} approved. They can now answer customers.`);
      if (result.problems.length) this.toasts.warning(result.problems.slice(0, 3).join(' '));
      this.selected.set(new Set());
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'Approval failed.'));
    } finally {
      this.busy.set(false);
    }
  }

  // ---- editor -----------------------------------------------------------------------------------------------------------

  protected openNew(): void {
    this.editingId.set(null);
    this.form.set(blankEntry());
  }

  protected openEdit(e: FaultCodeDto): void {
    this.editingId.set(e.id);
    this.form.set({
      make: e.make,
      series: e.series ?? '',
      code: e.code,
      aliases: [...e.aliases],
      title: e.title,
      severity: e.severity,
      causes: e.causes.length ? [...e.causes] : [''],
      checks: e.checks.length
        ? e.checks.map((c) => ({ ...c }))
        : [{ text: '', role: FaultCheckRole.Operator }],
      safetyNote: e.safetyNote ?? '',
      sparePartNumbers: [...e.sparePartNumbers],
      escalateWhen: e.escalateWhen ?? '',
    });
  }

  protected close(): void {
    this.form.set(null);
    this.editingId.set(null);
  }

  protected patch(change: Partial<SaveFaultCodeInput>): void {
    this.form.update((f) => (f ? { ...f, ...change } : f));
  }

  protected setList(field: 'aliases' | 'sparePartNumbers', value: string): void {
    this.patch({ [field]: splitList(value) });
  }

  protected setCause(i: number, value: string): void {
    const f = this.form();
    if (f) this.patch({ causes: f.causes.map((c, k) => (k === i ? value : c)) });
  }

  protected addCause(): void {
    const f = this.form();
    if (f && f.causes.length < 8) this.patch({ causes: [...f.causes, ''] });
  }

  protected removeCause(i: number): void {
    const f = this.form();
    if (f) this.patch({ causes: f.causes.filter((_, k) => k !== i) });
  }

  protected setCheck(i: number, change: Partial<{ text: string; role: FaultCheckRole }>): void {
    const f = this.form();
    if (f) this.patch({ checks: f.checks.map((c, k) => (k === i ? { ...c, ...change } : c)) });
  }

  protected addCheck(): void {
    const f = this.form();
    if (f && f.checks.length < 10)
      this.patch({ checks: [...f.checks, { text: '', role: FaultCheckRole.Operator }] });
  }

  protected removeCheck(i: number): void {
    const f = this.form();
    if (f) this.patch({ checks: f.checks.filter((_, k) => k !== i) });
  }

  protected async save(andApprove = false): Promise<void> {
    const f = this.form();
    if (!f || entryProblem(f)) return;
    this.busy.set(true);
    try {
      const id = this.editingId();
      const saved = await firstValueFrom(
        id ? this.api.update(id, cleanEntry(f)) : this.api.create(cleanEntry(f)),
      );
      if (andApprove && saved.state !== FaultCodeState.Approved) {
        const result = await firstValueFrom(this.api.approve([saved.id]));
        if (result.problems.length) this.toasts.warning(result.problems[0]);
        else this.toasts.success(`${saved.code} approved.`);
      } else {
        this.toasts.success(
          saved.state === FaultCodeState.Approved
            ? `${saved.code} saved as version ${saved.version}.`
            : `${saved.code} saved as a draft.`,
        );
      }
      this.close();
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The entry could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(e: FaultCodeDto): Promise<void> {
    const answered = e.version > 0;
    const ok = await this.dialogs.confirm({
      title: answered ? `Retire ${e.code}?` : `Delete ${e.code}?`,
      message: answered
        ? 'It stops answering customers. It stays on record, because it has been approved before.'
        : 'This draft is deleted.',
      confirmText: answered ? 'Retire' : 'Delete',
    });
    if (!ok) return;
    try {
      await firstValueFrom(answered ? this.api.retire(e.id) : this.api.delete(e.id));
      this.close();
      await this.load();
    } catch (err) {
      this.toasts.error(readApiError(err, 'That could not be done.'));
    }
  }

  protected async reopen(e: FaultCodeDto): Promise<void> {
    try {
      await firstValueFrom(this.api.reopen(e.id));
      await this.load();
    } catch (err) {
      this.toasts.error(readApiError(err, 'That could not be done.'));
    }
  }

  // ---- proposals --------------------------------------------------------------------------------------------------------

  protected async accept(p: FaultCodeProposalDto): Promise<void> {
    try {
      const entry = await firstValueFrom(
        this.api.acceptProposal({ make: p.make, series: p.series, code: p.code, cause: p.cause }),
      );
      this.toasts.success(
        p.faultCodeId
          ? `Cause added to ${entry.code} (version ${entry.version}).`
          : `Draft ${entry.code} made. Review it and approve it in the library.`,
      );
      await Promise.all([this.show('proposals'), this.load()]);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The proposal could not be taken.'));
    }
  }

  // ---- manuals ----------------------------------------------------------------------------------------------------------

  protected patchExtract(change: Partial<ExtractForm>): void {
    this.extract.update((x) => ({ ...x, ...change }));
  }

  protected async startExtraction(): Promise<void> {
    const x = this.extract();
    if (!x.documentId || !x.make.trim()) {
      this.toasts.warning('Choose the manual and enter the make.');
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.api.extractFromDocument({
          libraryDocumentId: x.documentId,
          make: x.make.trim(),
          series: x.series.trim() || null,
          fromPage: +x.fromPage || null,
          toPage: +x.toPage || null,
        }),
      );
      this.toasts.success('Reading the manual. Drafts appear in the library when it is done.');
      await this.show('manual');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The manual could not be read.'));
    } finally {
      this.busy.set(false);
    }
  }

  // ---- CSV --------------------------------------------------------------------------------------------------------------

  protected downloadTemplate(): void {
    savePdf(new Blob([CSV_TEMPLATE], { type: 'text/csv' }), 'fault-codes-template.csv');
  }

  protected async pick(file: File | null): Promise<void> {
    this.importFile.set(file);
    this.preview.set(null);
    if (!file) return;
    try {
      this.preview.set(await firstValueFrom(this.api.previewImport(this.formData(file))));
    } catch (e) {
      this.toasts.error(readApiError(e, 'The file could not be read.'));
    }
  }

  protected async runImport(): Promise<void> {
    const file = this.importFile();
    if (!file) return;
    this.busy.set(true);
    try {
      const r = await firstValueFrom(this.api.import(this.formData(file)));
      this.toasts.success(
        `${r.added} added and ${r.updated} updated. New codes are drafts until approved.`,
      );
      if (r.problems.length) this.toasts.warning(r.problems.slice(0, 3).join(' '));
      this.importFile.set(null);
      this.preview.set(null);
      this.tab.set('library');
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The import failed.'));
    } finally {
      this.busy.set(false);
    }
  }

  private formData(file: File): FormData {
    const data = new FormData();
    data.append('file', file, file.name);
    return data;
  }
}
