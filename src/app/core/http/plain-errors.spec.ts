import { HttpErrorResponse } from '@angular/common/http';
import { readApiError } from '../util/api-error';
import { errorFor } from './api-feedback';
import { isRawHttpText, plainServerMessage, statusExplanation } from './plain-errors';

const abp = (status: number, error: Record<string, unknown>) =>
  new HttpErrorResponse({ status, error: { error } });

describe('plain error wording', () => {
  it('replaces ABP stock sentences', () => {
    expect(plainServerMessage('Authorization failed! Given policy has not granted.')).toContain(
      'Ask your workspace administrator',
    );
    expect(plainServerMessage('An internal error occurred during your request!')).toContain(
      'Try again in a minute',
    );
    expect(plainServerMessage('This GSTIN is already used.')).toBe('This GSTIN is already used.');
  });

  it('explains statuses the server gave no words for', () => {
    expect(statusExplanation(413).title).toBe('File too large');
    expect(statusExplanation(429).title).toBe('Too many tries');
    expect(statusExplanation(504).title).toBe('Took too long');
  });

  it('never shows the browser’s raw HTTP text', () => {
    const raw = new HttpErrorResponse({ status: 500, url: 'https://api/x' });
    expect(isRawHttpText(raw.message)).toBe(true);
    expect(readApiError(raw)).not.toContain('Http failure');
    expect(readApiError(raw)).toContain('Your work was not saved');
  });

  it('keeps field messages but drops the "request is not valid" headline', () => {
    const e = errorFor(
      abp(400, {
        message: 'Your request is not valid!',
        validationErrors: [{ message: 'GSTIN must be 15 characters.' }],
      }),
    );
    expect(e.content).toBe('• GSTIN must be 15 characters.');
  });

  it('points a plan refusal at Billing', () => {
    const e = errorFor(
      abp(403, {
        code: 'AutoReach:PlanFeatureNotIncluded',
        message: 'Flows are not in your plan.',
      }),
    );
    expect(e.title).toBe('Not in your plan');
    expect(e.content).toContain('Open Billing');
  });

  it('hides stack traces sent as details', () => {
    const e = errorFor(
      abp(500, { message: 'Saving failed.', details: 'System.Exception: boom\n   at X.Y()' }),
    );
    expect(e.content).toBe('Saving failed.');
  });
});
