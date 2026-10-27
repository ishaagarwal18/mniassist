import { TestBed } from '@angular/core/testing';
import { RestService } from '@abp/ng.core';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeadAdsService } from './lead-ads/lead-ads.service';
import { MetaAdsService } from './meta-ads/meta-ads.service';

describe('Meta OAuth completion', () => {
  afterEach(() => TestBed.resetTestingModule());

  for (const [service, url] of [
    [LeadAdsService, '/api/auto-reach/lead-ads/complete-login'],
    [MetaAdsService, '/api/auto-reach/meta-ads/complete-login'],
  ] as const) {
    it(`sends the callback state with the code to ${url}`, () => {
      const request = vi.fn(() => of({}));
      TestBed.configureTestingModule({
        providers: [{ provide: RestService, useValue: { request } }],
      });
      const api = TestBed.inject(service as typeof LeadAdsService);
      api.completeLogin('synthetic-code', 'synthetic-state');
      expect(request).toHaveBeenCalledWith(
        { method: 'POST', url, body: { code: 'synthetic-code', state: 'synthetic-state' } },
        expect.objectContaining({ apiName: 'AutoReach' }),
      );
    });
  }
});
