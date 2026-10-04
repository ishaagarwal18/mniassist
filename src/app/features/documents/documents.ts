import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateLibraryDocumentDto,
  DocumentVisibility,
  LibraryDocumentDto,
  LibraryService,
} from '../../proxy/library';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog, ArSearchBox } from '../../ui';
import { ArSelect } from '../../ui/select';

interface Doc {
  id: string;
  title: string;
  category?: string;
  sizeLabel: string;
  parts: string[];
  sendCount: number;
  lastSentAt?: string;
}

const SEED: Doc[] = [
  {
    id: 'd-1',
    title: 'S7-1200 CPU 1214C datasheet',
    category: 'datasheet',
    sizeLabel: '1.8 MB',
    parts: ['6ES7214-1AG40-0XB0'],
    sendCount: 214,
    lastSentAt: '2026-09-04',
  },
  {
    id: 'd-2',
    title: 'FC-302 wiring diagram (frame B)',
    category: 'drawing',
    sizeLabel: '620 KB',
    parts: ['131B0080'],
    sendCount: 88,
    lastSentAt: '2026-09-01',
  },
  {
    id: 'd-3',
    title: 'AMC scope & SLA — standard',
    category: 'contract',
    sizeLabel: '210 KB',
    parts: [],
    sendCount: 46,
  },
  {
    id: 'd-4',
    title: 'Palletiser GA drawing rev C',
    category: 'drawing',
    sizeLabel: '3.1 MB',
    parts: ['VX-PL-44'],
    sendCount: 12,
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
  private readonly api = inject(LibraryService);

  protected readonly query = signal('');

  // ---- Upload dialog ---------------------------------------------
  protected readonly dialogOpen = signal(false);
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
    this.file.set(null);
    this.title.set('');
    this.category.set('');
    this.parts.set('');
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

  protected async upload(): Promise<void> {
    const f = this.file();
    if (!f) {
      window.alert('Choose a file to upload.');
      return;
    }
    if (!this.title().trim()) {
      window.alert('Give the document a title.');
      return;
    }
    this.uploading.set(true);
    this.error.set(null);
    try {
      if (!environment.useMockData) {
        const body = new FormData();
        body.append('title', this.title().trim());
        if (this.category().trim()) body.append('category', this.category().trim());
        body.append('visibility', String(this.visibility()));
        if (this.visibility() === DocumentVisibility.NamedAccounts) {
          for (const a of this.allowedAccounts()
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)) {
            body.append('allowedAccountIds', a);
          }
        }
        for (const p of this.parts()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)) {
          body.append('partNumbers', p);
        }
        body.append('file', f, f.name);
        // The generated proxy types `create` as the DTO; Angular's HttpClient sends
        // a FormData body as multipart, which is what the [FromForm] endpoint wants.
        await firstValueFrom(this.api.create(body as unknown as CreateLibraryDocumentDto));
      }
      this.resource.reload();
      this.dialogOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The upload failed.');
    } finally {
      this.uploading.set(false);
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
    const list = environment.useMockData ? SEED : this.resource.value();
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
