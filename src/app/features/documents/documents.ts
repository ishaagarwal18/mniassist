import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import {
  CreateLibraryDocumentDto,
  DocumentVisibility,
  LibraryDocumentDto,
  LibraryService,
} from '../../proxy/library';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog, ArSearchBox } from '../../ui';
import { ArSelect } from '../../ui/select';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import type { DocumentDeliveryDto } from '../../proxy/library/models';
import { initialSearch } from '../../core/util/customer-scope';

interface Doc {
  id: string;
  title: string;
  category?: string;
  sizeLabel: string;
  parts: string[];
  sendCount: number;
  lastSentAt?: string;
  version: number;
}

function toDoc(d: LibraryDocumentDto): Doc {
  const kb = (d.sizeBytes ?? 0) / 1024;
  return {
    id: d.id!,
    title: d.title ?? '(untitled)',
    category: d.category ?? undefined,
    sizeLabel: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`,
    parts: d.partNumbers ?? [],
    sendCount: d.sendCount ?? 0,
    lastSentAt: d.lastSentAtUtc ?? undefined,
    version: d.version ?? 1,
  };
}

/**
 * Document & catalogue library (M09). Datasheets and drawings keyed to a part
 * number — the store the datasheet-on-demand bot resolves against. Delivery counts
 * are shown because "which datasheet do customers actually ask for" is the useful
 * question here.
 */
/** One token with at least one digit and 3+ characters (6ES7214-1AG40, 3RT2026), worth a part-number search. */
export function looksLikePartNumber(q: string | undefined | null): q is string {
  const t = (q ?? '').trim();
  return t.length >= 3 && !/\s/.test(t) && /\d/.test(t);
}

@Component({
  selector: 'ar-documents',
  imports: [
    NgTemplateOutlet,
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArSearchBox,
    ArSelect,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class ArDocuments {
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(LibraryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Which form this route shows as a page ('new', 'edit'), or the list. */
  protected readonly mode = (this.route.snapshot.data['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';
  protected readonly loadError = signal<string | null>(null);

  constructor() {
    if (this.mode === 'new') this.openDialog();
    else if (this.mode === 'edit') void this.loadForEdit(this.route.snapshot.paramMap.get('id'));
  }

  /** The document with its access settings, which the list does not carry. */
  private async loadForEdit(id: string | null): Promise<void> {
    if (!id) return;

    try {
      const dto = await firstValueFrom(this.api.get(id, { skipHandleError: true }));
      this.openEdit(toDoc(dto));
      this.visibility.set(dto.visibility ?? DocumentVisibility.Public);
      this.allowedAccounts.set((dto.allowedAccountIds ?? []).join(', '));
    } catch {
      this.loadError.set('This document could not be found. It may have been deleted.');
    }
  }

  protected goNew(): void {
    void this.router.navigate(['/documents/new']);
  }
  protected goEdit(d: Doc): void {
    void this.router.navigate(['/documents', d.id, 'edit']);
  }
  /** Back to the library (Cancel, and after a save). */
  protected close(): void {
    this.dialogOpen.set(false);
    if (this.isPage) void this.router.navigate(['/documents']);
  }

  protected readonly canCreate = grantedPolicy('AutoReach.Library.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Library.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Library.Delete', this.permissions);

  /** Starts from `?q=` (Customer 360 links here for one customer). */
  protected readonly query = signal(initialSearch());

  // ---- Upload / Edit dialog ---------------------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly editingDoc = signal<Doc | null>(null);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly file = signal<File | null>(null);
  protected readonly title = signal('');
  protected readonly category = signal('');
  protected readonly parts = signal('');
  protected readonly visibility = signal(DocumentVisibility.Public);
  protected readonly allowedAccounts = signal('');
  protected readonly visibilityOptions = [
    { value: DocumentVisibility.Public, label: 'Public — anyone you message' },
    { value: DocumentVisibility.VerifiedDealers, label: 'Verified dealers only' },
    { value: DocumentVisibility.NamedAccounts, label: 'Named accounts only' },
  ];
  protected readonly DV = DocumentVisibility;

  protected openDialog(): void {
    this.editingDoc.set(null);
    this.file.set(null);
    this.title.set('');
    this.category.set('');
    this.parts.set('');
    this.visibility.set(DocumentVisibility.Public);
    this.allowedAccounts.set('');
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(d: Doc): void {
    this.editingDoc.set(d);
    this.file.set(null);
    this.title.set(d.title);
    this.category.set(d.category ?? '');
    this.parts.set(d.parts.join(', '));
    this.visibility.set(DocumentVisibility.Public);
    this.allowedAccounts.set('');
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected onFile(event: Event): void {
    const picked = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.file.set(picked);
    if (picked && !this.title().trim()) {
      this.title.set(picked.name.replace(/\.[^.]+$/, ''));
    }
  }

  protected async save(): Promise<void> {
    const editing = this.editingDoc();
    const title = this.title().trim();
    if (!title) {
      this.toasts.warning('Give the document a title.', 'Document');
      return;
    }
    const category = this.category().trim();
    const partsList = this.parts()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!editing && !this.file()) {
      this.toasts.warning('Choose a file to upload.', 'Document');
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    try {
      if (editing) {
        await firstValueFrom(
          this.api.update(editing.id, {
            title,
            category: category || null,
            partNumbers: partsList,
            visibility: this.visibility(),
            allowedAccountIds:
              this.visibility() === DocumentVisibility.NamedAccounts
                ? this.allowedAccounts()
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : [],
          }),
        );
        this.toasts.success('Document updated.');
      } else {
        const f = this.file()!;

        const body = new FormData();
        body.append('title', title);
        if (category) body.append('category', category);
        body.append('visibility', String(this.visibility()));
        if (this.visibility() === DocumentVisibility.NamedAccounts) {
          for (const a of this.allowedAccounts()
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)) {
            body.append('allowedAccountIds', a);
          }
        }
        for (const p of partsList) {
          body.append('partNumbers', p);
        }
        body.append('file', f, f.name);
        await firstValueFrom(this.api.create(body as unknown as CreateLibraryDocumentDto));
        this.toasts.success('Document uploaded.');
      }
      this.resource.reload();
      this.close();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The action failed.');
    } finally {
      this.uploading.set(false);
    }
  }

  protected async deleteDoc(d: Doc): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'document',
        d.title,
        'This document will no longer be available in the library.',
      ))
    ) {
      return;
    }
    try {
      await firstValueFrom(this.api.delete(d.id));
      this.resource.reload();
      this.toasts.success(`“${d.title}” deleted.`);
    } catch {
      this.toasts.error(`Could not delete “${d.title}”.`);
    }
  }

  // ---- versions and deliveries (M09-1, M09-3) ----------------------------------------------

  protected readonly deliveriesFor = signal<Doc | null>(null);
  protected readonly deliveries = signal<DocumentDeliveryDto[]>([]);

  protected async showDeliveries(d: Doc): Promise<void> {
    this.deliveriesFor.set(d);
    this.deliveries.set([]);

    try {
      this.deliveries.set((await firstValueFrom(this.api.getDeliveries(d.id))).items ?? []);
    } catch (e) {
      this.toasts.error(readApiError(e, 'Could not load the deliveries.'));
    }
  }

  protected deliveryState(r: DocumentDeliveryDto): string {
    return r.failed ? 'Failed' : r.readAtUtc ? 'Read' : r.deliveredAtUtc ? 'Delivered' : 'Sent';
  }

  protected async replaceFile(d: Doc, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (
      !(await this.dialogs.confirm({
        title: `Replace the file of “${d.title}”?`,
        message: `It becomes version ${d.version + 1}. Every send from now on carries the new file; the old one is not kept.`,
        confirmText: 'Replace',
      }))
    )
      return;
    const body = new FormData();
    body.append('file', file, file.name);
    try {
      await firstValueFrom(this.api.replaceFile(d.id, body));
      this.resource.reload();
    } catch (e) {
      this.toasts.error(readApiError(e, 'Could not replace the file.'));
    }
  }

  protected async downloadDoc(d: Doc): Promise<void> {
    try {
      const blob = await firstValueFrom(this.api.download(d.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = d.title;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.toasts.error(`Could not download “${d.title}”.`);
    }
  }

  private readonly resource = rxResource({
    params: () => (this.isPage ? undefined : { q: this.query() }),
    stream: ({ params }) =>
      forkJoin({
        list: this.api.getList({ filter: params.q, skipCount: 0, maxResultCount: 200 }),
        // A part number is matched on the server too, which ignores spaces, dashes and case.
        parts: looksLikePartNumber(params.q)
          ? this.api
              .searchByPartNumber(params.q.trim(), { skipHandleError: true })
              .pipe(catchError(() => of({ items: [] })))
          : of({ items: [] }),
      }).pipe(
        map(({ list, parts }) => {
          const byPart = (parts.items ?? []).map(toDoc);
          this.partMatches.set(new Set(byPart.map((d) => d.id)));
          const seen = new Set(byPart.map((d) => d.id));
          return [...byPart, ...(list.items ?? []).map(toDoc).filter((d) => !seen.has(d.id))];
        }),
      ),
    defaultValue: [] as Doc[],
  });

  /** Documents the server matched by part number; they stay listed even if the title doesn't match. */
  private readonly partMatches = signal<ReadonlySet<string>>(new Set());

  protected readonly loading = computed(() => this.resource.isLoading());
  protected readonly documents = computed<Doc[]>(() => {
    const list = this.resource.error() ? [] : (this.resource.value() ?? []);
    const q = this.query().trim().toLowerCase();
    return q
      ? list.filter(
          (d) =>
            this.partMatches().has(d.id) ||
            d.title.toLowerCase().includes(q) ||
            d.parts.some((p) => p.toLowerCase().includes(q)),
        )
      : list;
  });

  protected when(iso?: string): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'never sent';
  }
}
