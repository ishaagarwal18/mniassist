import type { FieldJobDto, FieldVisitDto } from '../../proxy/support/field-service.service';
import {
  FieldOp,
  daySummary,
  enqueue,
  fitWithin,
  retryable,
  startVisit,
  visitFor,
} from './field-logic';

const CHECKLIST = ['Checked the fault', 'Tested under load'];

const NOW = new Date('2026-10-01T09:00:00Z');

const visitOp = (v: string, id = 'o' + Math.random()): FieldOp => ({
  id,
  kind: 'visit',
  clientVisitId: v,
  at: NOW.toISOString(),
});
const photoOp = (v: string, p: string): FieldOp => ({
  id: p,
  kind: 'photo',
  clientVisitId: v,
  photoId: p,
  at: NOW.toISOString(),
});

function job(visit?: Partial<FieldVisitDto>): FieldJobDto {
  return {
    ticketId: 't1',
    reference: 'TKT-1',
    subject: 'Drive tripping',
    priority: 'High',
    status: 'Open',
    contactId: 'c1',
    visit: visit
      ? {
          clientVisitId: 'v1',
          ticketId: 't1',
          arrivedAtUtc: NOW.toISOString(),
          checklist: [],
          photos: [],
          state: 'Open',
          ...visit,
        }
      : null,
  };
}

describe('field logic', () => {
  it('starts a visit with the default checklist, nothing ticked', () => {
    const v = startVisit('t1', 'v1', NOW, CHECKLIST);
    expect(v.arrivedAtUtc).toBe(NOW.toISOString());
    expect(v.checklist.map((c) => c.label)).toEqual(CHECKLIST);
    expect(v.checklist.every((c) => !c.done)).toBe(true);
  });

  it('keeps one pending save per visit, ahead of that visit’s photos', () => {
    let box: FieldOp[] = [];
    box = enqueue(box, visitOp('v1', 'a'));
    box = enqueue(box, photoOp('v1', 'p1'));
    box = enqueue(box, visitOp('v2', 'b'));
    box = enqueue(box, visitOp('v1', 'c'));
    expect(box.map((o) => o.id)).toEqual(['c', 'p1', 'b']);
  });

  it('keeps every photo', () => {
    let box: FieldOp[] = [];
    box = enqueue(box, photoOp('v1', 'p1'));
    box = enqueue(box, photoOp('v1', 'p2'));
    expect(box.length).toBe(2);
  });

  it('retries what can succeed later and drops what cannot', () => {
    for (const s of [0, 401, 408, 429, 500, 503]) expect(retryable(s), String(s)).toBe(true);
    for (const s of [400, 403, 404, 409]) expect(retryable(s), String(s)).toBe(false);
  });

  it('prefers the phone’s copy until the visit is signed off', () => {
    const local = { ...startVisit('t1', 'v1', NOW, CHECKLIST), notes: 'on the phone' };
    expect(visitFor(job({ notes: 'server' }), local)?.notes).toBe('on the phone');
    expect(visitFor(job({ notes: 'signed', state: 'SignedOff' }), local)?.notes).toBe('signed');
    expect(visitFor(job({ notes: 'server' }), undefined)?.notes).toBe('server');
    expect(visitFor(job(), undefined)).toBeNull();
  });

  it('counts visits waiting to send, not ops', () => {
    const s = daySummary({ generatedAtUtc: '', jobs: [job(), job()] }, [
      visitOp('v1'),
      photoOp('v1', 'p'),
      visitOp('v2'),
    ]);
    expect(s).toEqual({ jobs: 2, waiting: 2 });
  });

  it('shrinks big photos and leaves small ones', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
