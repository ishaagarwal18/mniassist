import type {
  FieldChecklistItemDto,
  FieldDayDto,
  FieldJobDto,
  FieldVisitDto,
} from '../../proxy/support/field-service.service';

/** One thing the phone still has to tell the server, in the order it happened. */
export type FieldOp =
  | { id: string; kind: 'visit'; clientVisitId: string; at: string }
  | { id: string; kind: 'photo'; clientVisitId: string; photoId: string; at: string };

/** The engineer's copy of a visit, kept on the phone until the server has it. */
export interface LocalVisit {
  clientVisitId: string;
  ticketId: string;
  arrivedAtUtc: string;
  completedAtUtc?: string | null;
  notes: string;
  checklist: FieldChecklistItemDto[];
  /** Photos taken on the phone, by id; the blobs live in IndexedDB. */
  photoIds: string[];
  state: FieldVisitDto['state'];
  signedByName?: string | null;
}

/** The checklist every visit starts with. The engineer can add to it. */
export const DEFAULT_CHECKLIST: readonly string[] = [
  'Checked the fault the customer reported',
  'Inspected wiring, terminals and earthing',
  'Cleaned filters and fans',
  'Tested the machine running under load',
  'Explained the work and advice to the customer',
];

/** A new visit on arrival. */
export function startVisit(ticketId: string, id: string, now: Date): LocalVisit {
  return {
    clientVisitId: id,
    ticketId,
    arrivedAtUtc: now.toISOString(),
    notes: '',
    checklist: DEFAULT_CHECKLIST.map((label) => ({ label, done: false })),
    photoIds: [],
    state: 'Open',
  };
}

/** The server's copy of a visit, as the phone's starting point when the phone has none. */
export function fromServer(v: FieldVisitDto): LocalVisit {
  return {
    clientVisitId: v.clientVisitId,
    ticketId: v.ticketId,
    arrivedAtUtc: v.arrivedAtUtc,
    completedAtUtc: v.completedAtUtc,
    notes: v.notes ?? '',
    checklist: v.checklist,
    photoIds: v.photos.map((p) => p.id),
    state: v.state,
    signedByName: v.signedByName,
  };
}

/**
 * The visit to show for a job: the phone's copy while it has unsent changes or the server has nothing newer to say; the server's
 * once signed off (a signed visit is final wherever it was signed).
 */
export function visitFor(job: FieldJobDto, local: LocalVisit | undefined): LocalVisit | null {
  if (job.visit?.state === 'SignedOff') return fromServer(job.visit);
  if (local) return local;
  return job.visit ? fromServer(job.visit) : null;
}

/**
 * Adds an op to the outbox. A newer visit save replaces an older one for the same visit that hasn't gone yet (the server takes the
 * whole visit each time); photos are never merged.
 */
export function enqueue(outbox: readonly FieldOp[], op: FieldOp): FieldOp[] {
  if (op.kind === 'visit') {
    const rest = outbox.filter(
      (o) => !(o.kind === 'visit' && o.clientVisitId === op.clientVisitId),
    );
    // Keep the save ahead of that visit's photos: a photo needs its visit to exist on the server.
    const firstPhoto = rest.findIndex(
      (o) => o.kind === 'photo' && o.clientVisitId === op.clientVisitId,
    );
    if (firstPhoto >= 0) return [...rest.slice(0, firstPhoto), op, ...rest.slice(firstPhoto)];
    return [...rest, op];
  }
  return [...outbox, op];
}

/**
 * What a failed send means for the outbox: offline, a timeout, a server fault or an expired sign-in can succeed later, so the op
 * stays and sending stops for now. Anything else (a 4xx the server meant) will fail identically forever, so the op is dropped.
 */
export function retryable(status: number): boolean {
  return status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;
}

/** How many jobs, and how many have something waiting to send. */
export function daySummary(
  day: FieldDayDto | null,
  outbox: readonly FieldOp[],
): { jobs: number; waiting: number } {
  return {
    jobs: day?.jobs.length ?? 0,
    waiting: new Set(outbox.map((o) => o.clientVisitId)).size,
  };
}

/** Shrinks a camera photo before it is stored or sent: 1600 px on the long side is plenty to read a nameplate. */
export function fitWithin(
  width: number,
  height: number,
  max = 1600,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
