import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LibraryService } from '../../proxy/library';
import { ArDraggable, ArIcon } from '../../ui';

export interface PickedDocument {
  id: string;
  title: string;
}

interface Row {
  id: string;
  title: string;
  category?: string;
  sizeLabel: string;
  parts: string[];
  sendCount: number;
}

const SEED: Row[] = [
  {
    id: 'd-1',
    title: 'S7-1200 CPU 1214C datasheet',
    category: 'datasheet',
    sizeLabel: '1.8 MB',
    parts: ['6ES7214-1AG40-0XB0'],
    sendCount: 214,
  },
  {
    id: 'd-2',
    title: 'FC-302 wiring diagram (frame B)',
    category: 'drawing',
    sizeLabel: '620 KB',
    parts: ['131B0080'],
    sendCount: 88,
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
  },
];

/**
 * The library-document picker for the inbox composer. A popover, not a route: the
 * agent is mid-reply and the conversation is the context. Ordered by how often each
 * document is actually sent, because "which datasheet do people ask for" is the
 * question that matters at this moment.
 */
@Component({
  selector: 'ar-document-picker',
  imports: [ArIcon, ArDraggable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dp__scrim" (click)="close.emit()"></div>
    <div class="dp" role="dialog" aria-label="Attach a document" arDraggable=".dp__head">
      <header class="dp__head">
        <ar-icon name="search" [size]="15" />
        <input
          class="dp__search"
          type="search"
          placeholder="Search the library…"
          autofocus
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
        <button type="button" class="dp__x" aria-label="Close" (click)="close.emit()">×</button>
      </header>

      <ul class="dp__list">
        @for (d of results(); track d.id) {
          <li>
            <button type="button" class="dp__row" (click)="pick.emit({ id: d.id, title: d.title })">
              <ar-icon name="document" [size]="16" />
              <span class="dp__meta">
                <span class="dp__title">{{ d.title }}</span>
                <span class="dp__sub">
                  {{ d.sizeLabel }}
                  @if (d.parts.length) {
                    · {{ d.parts.join(', ') }}
                  }
                  · sent {{ d.sendCount }}×
                </span>
              </span>
            </button>
          </li>
        } @empty {
          <li class="dp__none">Nothing matches “{{ query() }}”.</li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 30;
    }
    .dp__scrim {
      position: absolute;
      inset: 0;
    }
    .dp {
      position: absolute;
      left: 12px;
      bottom: 12px;
      width: min(420px, calc(100% - 24px));
      max-height: 340px;
      display: flex;
      flex-direction: column;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: 0 12px 40px rgba(16, 20, 26, 0.16);
    }
    .dp__head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--ar-line-200);
    }
    .dp__search {
      flex: 1;
      border: 0;
      outline: none;
      background: none;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .dp__x {
      background: none;
      border: 0;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: var(--ar-ink-400);
    }
    .dp__list {
      list-style: none;
      margin: 0;
      padding: 6px;
      overflow-y: auto;
    }
    .dp__row {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      text-align: left;
      padding: 8px 10px;
      border: 0;
      border-radius: var(--ar-radius-control);
      background: none;
      cursor: pointer;
      color: var(--ar-ink-900);
    }
    .dp__row:hover {
      background: var(--ar-bg-50);
    }
    .dp__meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .dp__title {
      font: 500 12.5px var(--ar-font-sans);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dp__sub {
      font: 400 11px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .dp__none {
      padding: 18px 12px;
      text-align: center;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
  `,
})
export class ArDocumentPicker {
  private readonly api = inject(LibraryService);

  readonly pick = output<PickedDocument>();
  readonly close = output<void>();

  protected readonly query = signal('');

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { q: this.query() }),
    stream: ({ params }) =>
      this.api.getList({ filter: params.q || undefined, skipCount: 0, maxResultCount: 100 }).pipe(
        map((page) =>
          (page.items ?? []).map((d): Row => {
            const kb = (d.sizeBytes ?? 0) / 1024;
            return {
              id: d.id!,
              title: d.title ?? '(untitled)',
              category: d.category ?? undefined,
              sizeLabel: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`,
              parts: d.partNumbers ?? [],
              sendCount: d.sendCount ?? 0,
            };
          }),
        ),
      ),
    defaultValue: SEED,
  });

  protected readonly results = computed<Row[]>(() => {
    const list = environment.useMockData ? SEED : this.resource.value();
    const q = this.query().trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (d) =>
            d.title.toLowerCase().includes(q) || d.parts.some((p) => p.toLowerCase().includes(q)),
        )
      : list;
    return [...filtered].sort((a, b) => b.sendCount - a.sendCount);
  });
}
