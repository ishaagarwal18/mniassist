import { HttpErrorResponse } from '@angular/common/http';
import { OutageToastGate, isOutage } from './api-feedback';

describe('outage toasts', () => {
  it('treats no answer and proxy gateway errors as an outage', () => {
    for (const status of [0, 502, 503, 504]) expect(isOutage(new HttpErrorResponse({ status }))).toBe(true);
    for (const status of [400, 403, 404, 500]) expect(isOutage(new HttpErrorResponse({ status }))).toBe(false);
  });

  it('keeps background reads silent and shows an action failure once per window', () => {
    const gate = new OutageToastGate(30_000);
    expect(gate.shouldToast('GET', 0)).toBe(false);
    expect(gate.shouldToast('POST', 1_000)).toBe(true);
    expect(gate.shouldToast('PUT', 5_000)).toBe(false);
    expect(gate.shouldToast('POST', 31_001)).toBe(true);
  });
});
