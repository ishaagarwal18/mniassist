import { HttpErrorResponse } from '@angular/common/http';

import { errorFor, isQuietFailure, successFor } from './api-feedback';

const api = 'https://api.mniassist.com/api/auto-reach';
const id = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('successFor', () => {
  it('names creates, updates and deletes after the resource', () => {
    expect(successFor('POST', `${api}/contact`)).toEqual({
      title: 'Contact',
      content: 'Contact created.',
    });
    expect(successFor('PUT', `${api}/customer-account/${id}`)).toEqual({
      title: 'Customer account',
      content: 'Customer account updated.',
    });
    expect(successFor('DELETE', `${api}/segment/${id}`)).toEqual({
      title: 'Segment',
      content: 'Segment deleted.',
    });
  });

  it('describes actions in the past tense, and generic ones as saved', () => {
    expect(successFor('POST', `${api}/enquiry/${id}/move`)?.content).toBe('Moved.');
    expect(successFor('POST', `${api}/quotation/${id}/mark-won`)?.content).toBe('Marked as won.');
    expect(successFor('POST', `${api}/channel/${id}/set-two-step-pin`)?.content).toBe(
      'Changes saved.',
    );
    expect(successFor('POST', `${api}/thing/${id}/frobnicate`)?.content).toBe('Saved.');
    expect(successFor('PUT', '/api/identity/users/' + id)?.title).toBe('Users');
  });

  it('stays quiet for reads, previews, downloads, background calls and ABP itself', () => {
    expect(successFor('GET', `${api}/contact`)).toBeNull();
    expect(successFor('POST', `${api}/contact-import/dry-run`)).toBeNull();
    expect(successFor('POST', `${api}/contact-import/inspect`)).toBeNull();
    expect(successFor('POST', `${api}/business-card/read`)).toBeNull();
    expect(successFor('POST', `${api}/conversation/${id}/mark-read`)).toBeNull();
    expect(successFor('POST', `${api}/quotation/${id}/download-pdf`)).toBeNull();
    expect(
      successFor('POST', 'https://api.mniassist.com/api/abp/application-configuration'),
    ).toBeNull();
    expect(successFor('POST', 'https://api.mniassist.com/connect/token')).toBeNull();
  });

  it('can quiet one endpoint by entity and action without quieting the action everywhere', () => {
    expect(successFor('POST', `${api}/two-factor/disable`)).toBeNull();
    expect(successFor('POST', `${api}/two-factor/enable-authenticator`)).toBeNull();
    expect(successFor('POST', `${api}/session/end-current`)).toBeNull();
    expect(successFor('POST', `${api}/feature-flag/disable`)).not.toBeNull();
  });
});

describe('errorFor', () => {
  it("uses the server's message and lists validation errors", () => {
    const e = errorFor(
      new HttpErrorResponse({
        status: 400,
        error: {
          error: {
            message: 'Your request is not valid!',
            validationErrors: [{ message: 'The Name field is required.', members: ['name'] }],
          },
        },
      }),
    );
    expect(e.title).toBe('Please check the details');
    // ABP's stock headline adds nothing above the field messages, so it is dropped.
    expect(e.content).toBe('• The Name field is required.');
  });

  it('titles a broken business rule apart from a missing permission', () => {
    const rule = new HttpErrorResponse({
      status: 403,
      error: {
        error: { code: 'AutoReach:PhotoNotReadable', message: 'The photo could not be read.' },
      },
    });
    expect(errorFor(rule).title).toBe('Couldn’t complete that');
    expect(errorFor(new HttpErrorResponse({ status: 403 })).title).toBe('Not allowed');
  });

  it('explains statuses that come without a message', () => {
    expect(errorFor(new HttpErrorResponse({ status: 0 })).title).toBe('Cannot reach the server');
    expect(errorFor(new HttpErrorResponse({ status: 403 })).content).toContain(
      'Ask your workspace administrator',
    );
    expect(errorFor(new HttpErrorResponse({ status: 500 })).title).toBe('Server problem');
  });
});

describe('isQuietFailure', () => {
  const failure = (code: string) =>
    new HttpErrorResponse({ status: 403, error: { error: { code, message: 'x' } } });

  it('keeps the email template preview quiet while someone types, and nothing else', () => {
    const syntax = new HttpErrorResponse({
      status: 403,
      error: { error: { code: 'AutoReach:TextTemplateSyntaxError' } },
    });
    expect(isQuietFailure('POST', syntax, `${api}/text-template/Invitation/preview`)).toBe(true);
    expect(isQuietFailure('PUT', syntax, `${api}/text-template/Invitation`)).toBe(false);
    expect(isQuietFailure('POST', syntax, `${api}/campaign/${id}/preview`)).toBe(false);
  });

  it('keeps background feature checks quiet on reads only', () => {
    expect(isQuietFailure('GET', failure('AutoReach:PlanFeatureNotIncluded'))).toBe(true);
    expect(isQuietFailure('GET', failure('AutoReach:BrandingRequiresTenant'))).toBe(true);
    expect(isQuietFailure('POST', failure('AutoReach:PlanFeatureNotIncluded'))).toBe(false);
    expect(isQuietFailure('GET', failure('AutoReach:SomethingElse'))).toBe(false);
  });
});
