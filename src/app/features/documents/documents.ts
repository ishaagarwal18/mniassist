import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
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
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import type { DocumentDeliveryDto } from '../../proxy/library/models';

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

const SEED: Doc[] = [
  {
    id: 'd-1',
    title: 'S7-1200 CPU 1214C datasheet',
    category: 'datasheet',
    sizeLabel: '1.8 MB',
    parts: ['6ES7214-1AG40-0XB0'],
    sendCount: 214,
    version: 1,
    lastSentAt: '2026-09-04',
  },
  {
    id: 'd-2',
    title: 'FC-302 wiring diagram (frame B)',
    category: 'drawing',
    sizeLabel: '620 KB',
    parts: ['131B0080'],
    sendCount: 88,
    version: 1,
    lastSentAt: '2026-09-01',
  },
  {
    id: 'd-3',
    title: 'AMC scope & SLA — standard',
    category: 'contract',
    sizeLabel: '210 KB',
    parts: [],
    sendCount: 46,
    version: 1,
  },
  {
    id: 'd-4',
    title: 'Palletiser GA drawing rev C',
    category: 'drawing',
    sizeLabel: '3.1 MB',
    parts: ['VX-PL-44'],
    sendCount: 12,
    version: 1,
    lastSentAt: '2026-08-19',
  },
];

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
@Component({
  selector: 'ar-documents',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSearchBox, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class ArDocuments {
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(LibraryService);

  protected readonly canCreate = grantedPolicy('AutoReach.Library.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Library.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Library.Delete', this.permissions);

  protected readonly query = signal('');
  private readonly mockDocs = signal<Doc[]>([...SEED]);

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
        if (!environment.useMockData) {
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
        } else {
          this.mockDocs.update((docs) =>
            docs.map((x) =>
              x.id === editing.id
                ? { ...x, title, category: category || undefined, parts: partsList }
                : x,
            ),
          );
        }
        this.toasts.success('Document updated.');
      } else {
        const f = this.file()!;
        if (!environment.useMockData) {
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
        } else {
          const kb = f.size / 1024;
          const sizeLabel = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
          this.mockDocs.update((docs) => [
            {
              id: 'd-' + Date.now(),
              title,
              category: category || undefined,
              sizeLabel,
              parts: partsList,
              sendCount: 0,
              version: 1,
            },
            ...docs,
          ]);
        }
        this.toasts.success('Document uploaded.');
      }
      this.resource.reload();
      this.dialogOpen.set(false);
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
      if (!environment.useMockData) {
        await firstValueFrom(this.api.delete(d.id));
        this.resource.reload();
      } else {
        this.mockDocs.update((docs) => docs.filter((x) => x.id !== d.id));
      }
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
    if (environment.useMockData) return;
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
      if (!environment.useMockData) {
        const blob = await firstValueFrom(this.api.download(d.id));
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = d.title;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([`Datasheet: ${d.title}\nPart numbers: ${d.parts.join(', ')}`], {
          type: 'text/plain',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${d.title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      this.toasts.error(`Could not download “${d.title}”.`);
    }
  }

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { q: this.query() }),
    stream: ({ params }) =>
      this.api
        .getList({ filter: params.q, skipCount: 0, maxResultCount: 200 })
        .pipe(map((p) => (p.items ?? []).map(toDoc))),
    defaultValue: SEED,
  });

  protected readonly loading = computed(
    () => !environment.useMockData && this.resource.isLoading(),
  );
  protected readonly documents = computed<Doc[]>(() => {
    const list = environment.useMockData ? this.mockDocs() : (this.resource.value() ?? []);
    const q = this.query().trim().toLowerCase();
    return q
      ? list.filter(
          (d) =>
            d.title.toLowerCase().includes(q) || d.parts.some((p) => p.toLowerCase().includes(q)),
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
