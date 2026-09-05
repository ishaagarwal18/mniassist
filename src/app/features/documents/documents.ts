import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LibraryDocumentDto, LibraryService } from '../../proxy/library';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArSearchBox } from '../../ui';

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
  const kb = d.sizeBytes / 1024;
  return {
    id: d.id!,
    title: d.title,
    category: d.category,
    sizeLabel: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`,
    parts: d.partNumbers ?? [],
    sendCount: d.sendCount,
    lastSentAt: d.lastSentAtUtc,
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
  imports: [ArTopbar, ArButton, ArChip, ArSearchBox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class ArDocuments {
  private readonly api = inject(LibraryService);

  protected readonly query = signal('');

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
