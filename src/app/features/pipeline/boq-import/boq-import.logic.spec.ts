import { describe, expect, it } from 'vitest';

import {
  BoqConfidence,
  BoqImportDto,
  BoqImportLineDto,
  BoqImportSource,
  BoqImportState,
  BoqLineDecision,
  BoqMatchKind,
} from '../../../proxy/pipeline/boq-import.service';
import {
  acceptableSuggestions,
  filterLines,
  isReadable,
  matchLabel,
  maxBytes,
  paiseOf,
  progress,
  size,
  summary,
} from './boq-import.logic';

function line(over: Partial<BoqImportLineDto> = {}): BoqImportLineDto {
  return {
    id: over.id ?? Math.random().toString(36),
    row: 1,
    fileNumber: 1,
    asDescription: 'VFD 2.2 kW',
    quantity: 1,
    matchKind: BoqMatchKind.Exact,
    confidence: BoqConfidence.High,
    alternates: [],
    decision: BoqLineDecision.Accepted,
    partNumber: 'ATV320U22N4',
    ...over,
  };
}

function importOf(lines: BoqImportLineDto[], over: Partial<BoqImportDto> = {}): BoqImportDto {
  return {
    id: 'i',
    reference: 'IMP-2026-0001',
    contactId: 'c',
    source: BoqImportSource.Upload,
    state: BoqImportState.Review,
    filesRead: 0,
    creationTime: '2026-11-06T10:00:00Z',
    files: [],
    lines,
    pendingCount: lines.filter((l) => l.decision === BoqLineDecision.Pending).length,
    matchedCount: 1,
    suggestedCount: 1,
    notFoundCount: 1,
    pricedTotalInPaise: 0,
    ...over,
  };
}

describe('BOQ import logic', () => {
  it('takes the file types the reader can read, by extension', () => {
    expect(isReadable('BOQ Rev2.XLSX')).toBe(true);
    expect(isReadable('scan.pdf')).toBe(true);
    expect(isReadable('notes.docx')).toBe(false);
    expect(isReadable('noextension')).toBe(false);
    expect(maxBytes('photo.jpg')).toBe(5 * 1024 * 1024);
    expect(maxBytes('boq.xlsx')).toBe(10 * 1024 * 1024);
  });

  it('labels a line by what was found, then by what the engineer did', () => {
    expect(matchLabel(line()).label).toBe('Exact');
    expect(matchLabel(line({ confidence: BoqConfidence.Medium })).label).toBe('Exact, check');
    expect(
      matchLabel(line({ matchKind: BoqMatchKind.Search, decision: BoqLineDecision.Pending })).label,
    ).toBe('Suggested');
    expect(matchLabel(line({ matchKind: BoqMatchKind.None, partNumber: null })).tone).toBe('bad');
    expect(matchLabel(line({ decision: BoqLineDecision.ManualPrice })).label).toBe(
      'Priced by hand',
    );
  });

  it('shows the lines to decide, keeping one just decided in view', () => {
    const done = line({ id: 'done' });
    const todo = line({ id: 'todo', decision: BoqLineDecision.Pending });
    const missing = line({
      id: 'missing',
      matchKind: BoqMatchKind.None,
      decision: BoqLineDecision.Pending,
    });
    expect(filterLines([done, todo, missing], 'check').map((l) => l.id)).toEqual([
      'todo',
      'missing',
    ]);
    expect(filterLines([done, todo], 'check', new Set(['done'])).map((l) => l.id)).toEqual([
      'done',
      'todo',
    ]);
    expect(filterLines([done, todo, missing], 'notFound').map((l) => l.id)).toEqual(['missing']);
    expect(filterLines([done, todo, missing], 'all')).toHaveLength(3);
  });

  it('accepts only pending lines that have something matched', () => {
    const lines = [
      line({ id: 'a', decision: BoqLineDecision.Pending }),
      line({ id: 'b', decision: BoqLineDecision.Pending, partNumber: null }),
      line({ id: 'c' }),
    ];
    expect(acceptableSuggestions(lines).map((l) => l.id)).toEqual(['a']);
  });

  it('reads a typed price in rupees as paise and refuses anything else', () => {
    expect(paiseOf('1,250.50')).toBe(125050);
    expect(paiseOf('₹ 99')).toBe(9900);
    expect(paiseOf('')).toBeNull();
    expect(paiseOf('-5')).toBeNull();
    expect(paiseOf('abc')).toBeNull();
  });

  it('says how far the reading has got and sums up the lines', () => {
    const two = importOf([line()], {
      state: BoqImportState.Reading,
      files: [
        { id: '1', number: 1, fileName: 'a.xlsx', mediaType: 'x', sizeBytes: 1, lineCount: 0 },
        { id: '2', number: 2, fileName: 'b.pdf', mediaType: 'x', sizeBytes: 1, lineCount: 0 },
      ],
      filesRead: 1,
    });
    expect(progress(two)).toContain('Reading file 2 of 2');
    expect(summary(importOf([line(), line()]))).toBe(
      '2 lines · 1 matched · 1 suggested · 1 not found',
    );
    expect(size(2.5 * 1024 * 1024)).toBe('2.5 MB');
    expect(size(300)).toBe('1 KB');
  });
});
