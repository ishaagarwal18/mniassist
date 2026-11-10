import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FieldDayDto, FieldServiceService } from '../../proxy/support/field-service.service';
import { FieldOp, LocalVisit, daySummary, enqueue, retryable } from './field-logic';

const DB = 'autoreach-field';
const STORES = ['kv', 'visits', 'photos'] as const;

/** A tiny IndexedDB wrapper: three stores, promise-based, nothing clever. */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () =>
      STORES.forEach(
        (s) => req.result.objectStoreNames.contains(s) || req.result.createObjectStore(s),
      );
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  store: (typeof STORES)[number],
  mode: IDBTransactionMode,
  work: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = work(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const get = <T>(store: (typeof STORES)[number], key: string) =>
  tx<T | undefined>(store, 'readonly', (s) => s.get(key));
const put = (store: (typeof STORES)[number], key: string, value: unknown) =>
  tx(store, 'readwrite', (s) => s.put(value, key));

/**
 * M2: the field app's memory. Today's jobs, the engineer's visits and photos live on the phone (IndexedDB) and every change goes
 * into an outbox that is sent, in order, whenever there is a connection. A save the server refuses outright is dropped with a
 * note; one that fails for lack of signal waits for the next try.
 */
@Injectable({ providedIn: 'root' })
export class FieldStore {
  private readonly api = inject(FieldServiceService);

  readonly day = signal<FieldDayDto | null>(null);
  readonly visits = signal<Record<string, LocalVisit>>({});
  readonly outbox = signal<FieldOp[]>([]);
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly syncing = signal(false);
  readonly lastSyncedAt = signal<string | null>(null);
  readonly problems = signal<string[]>([]);

  readonly summary = computed(() => daySummary(this.day(), this.outbox()));

  private started = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    window.addEventListener('online', () => {
      this.online.set(true);
      void this.sync();
    });
    window.addEventListener('offline', () => this.online.set(false));

    this.day.set((await get<FieldDayDto>('kv', 'day')) ?? null);
    this.outbox.set((await get<FieldOp[]>('kv', 'outbox')) ?? []);
    this.lastSyncedAt.set((await get<string>('kv', 'lastSyncedAt')) ?? null);
    const visits: Record<string, LocalVisit> = {};
    const all = await tx<LocalVisit[]>(
      'visits',
      'readonly',
      (s) => s.getAll() as IDBRequest<LocalVisit[]>,
    );
    all.forEach((v) => (visits[v.ticketId] = v));
    this.visits.set(visits);

    await this.sync();
  }

  /** Saves the phone's copy and queues it for the server. */
  async saveVisit(visit: LocalVisit): Promise<void> {
    this.visits.update((all) => ({ ...all, [visit.ticketId]: visit }));
    await put('visits', visit.clientVisitId, visit);
    await this.queue({
      id: crypto.randomUUID(),
      kind: 'visit',
      clientVisitId: visit.clientVisitId,
      at: new Date().toISOString(),
    });
  }

  async addPhoto(visit: LocalVisit, blob: Blob): Promise<LocalVisit> {
    const photoId = crypto.randomUUID();
    await put('photos', photoId, blob);
    const next = { ...visit, photoIds: [...visit.photoIds, photoId] };
    this.visits.update((all) => ({ ...all, [visit.ticketId]: next }));
    await put('visits', next.clientVisitId, next);
    await this.queue({
      id: photoId,
      kind: 'photo',
      clientVisitId: visit.clientVisitId,
      photoId,
      at: new Date().toISOString(),
    });
    return next;
  }

  photo(photoId: string): Promise<Blob | undefined> {
    return get<Blob>('photos', photoId);
  }

  /** After sign-off the server's copy is final; the phone's is no longer needed. */
  async settle(visit: LocalVisit): Promise<void> {
    this.visits.update((all) => ({ ...all, [visit.ticketId]: visit }));
    await put('visits', visit.clientVisitId, visit);
  }

  /** Sends the outbox in order, then refreshes today's jobs. Safe to call any time. */
  async sync(): Promise<void> {
    if (this.syncing()) return;
    this.syncing.set(true);
    try {
      while (this.outbox().length > 0 && navigator.onLine) {
        const op = this.outbox()[0];
        try {
          await this.send(op);
        } catch (e: unknown) {
          const status = e instanceof HttpErrorResponse ? e.status : 0;
          if (retryable(status)) break;
          const message =
            (e as HttpErrorResponse)?.error?.error?.message ??
            `The server refused a saved change (${status}).`;
          this.problems.update((p) => [...p, message]);
        }
        this.outbox.update((box) => box.slice(1));
        await put('kv', 'outbox', this.outbox());
      }

      if (navigator.onLine) {
        const day = await firstValueFrom(this.api.getMyDay());
        this.day.set(day);
        await put('kv', 'day', day);
        const at = new Date().toISOString();
        this.lastSyncedAt.set(at);
        await put('kv', 'lastSyncedAt', at);
      }
    } catch {
      // No signal or the server is down: everything stays on the phone for the next try.
    } finally {
      this.syncing.set(false);
    }
  }

  private async queue(op: FieldOp): Promise<void> {
    this.outbox.update((box) => enqueue(box, op));
    await put('kv', 'outbox', this.outbox());
    void this.sync();
  }

  private async send(op: FieldOp): Promise<void> {
    const visit = Object.values(this.visits()).find((v) => v.clientVisitId === op.clientVisitId);
    if (!visit) return;

    if (op.kind === 'visit') {
      await firstValueFrom(
        this.api.syncVisit({
          clientVisitId: visit.clientVisitId,
          ticketId: visit.ticketId,
          arrivedAtUtc: visit.arrivedAtUtc,
          completedAtUtc: visit.completedAtUtc ?? null,
          notes: visit.notes || null,
          checklist: visit.checklist,
        }),
      );
      return;
    }

    const blob = await this.photo(op.photoId);
    if (!blob) return;
    const form = new FormData();
    form.append('ClientVisitId', op.clientVisitId);
    form.append('PhotoId', op.photoId);
    form.append('File', blob, `${op.photoId}.jpg`);
    await firstValueFrom(this.api.uploadPhoto(form));
  }
}
