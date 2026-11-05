import { describe, expect, it } from 'vitest';

import { SalesExportFormat } from '../../proxy/sales/sales-enums';
import { blobErrorMessage, exportExtension, safeFileName } from './sales-export.logic';

describe('sales downloads', () => {
  it('names the file after what the server sent', () => {
    expect(exportExtension(new Blob([], { type: 'application/pdf' }), SalesExportFormat.Pdf)).toBe(
      'pdf',
    );
    // The server hands back a printable page when it could not draw the PDF.
    expect(
      exportExtension(new Blob([], { type: 'text/html; charset=utf-8' }), SalesExportFormat.Pdf),
    ).toBe('html');
    expect(exportExtension(new Blob([]), SalesExportFormat.Excel)).toBe('xlsx');
    expect(safeFileName('INV/2026-27/0042')).toBe('INV-2026-27-0042');
    expect(safeFileName('  ')).toBe('document');
  });

  it("reads the server's message out of a failed blob request", async () => {
    const body = new Blob([
      JSON.stringify({ error: { message: 'More than 5,000 records match.' } }),
    ]);
    expect(await blobErrorMessage({ error: body }, 'fallback')).toBe(
      'More than 5,000 records match.',
    );
    expect(await blobErrorMessage({ error: new Blob(['<html>']) }, 'fallback')).toBe('fallback');
    expect(await blobErrorMessage(new Error('offline'), 'fallback')).toBe('fallback');
  });
});
