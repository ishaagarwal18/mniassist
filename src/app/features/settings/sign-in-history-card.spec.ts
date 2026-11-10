import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { SecurityLogService } from '../../proxy/identity/security-log.service';
import { ArSignInHistoryCard } from './sign-in-history-card';

describe('Recent sign-in activity', () => {
  it('lists the signed-in user’s own sign-ins from the API', async () => {
    const getMyList = vi.fn(() =>
      of({
        totalCount: 1,
        items: [
          {
            id: 'l1',
            creationTime: '2026-11-10T06:27:29Z',
            action: 'LoginSucceeded',
            identity: 'OpenIddict',
            userName: 'admin',
            clientIpAddress: '::1',
            browserInfo: 'Mozilla/5.0 (Windows NT 10.0) Chrome/142.0',
            clientId: 'AutoReach_App',
          },
        ],
      }),
    );
    TestBed.configureTestingModule({
      imports: [ArSignInHistoryCard],
      providers: [{ provide: SecurityLogService, useValue: { getMyList } }],
    });
    const fixture = TestBed.createComponent(ArSignInHistoryCard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(getMyList).toHaveBeenCalledOnce();
    expect(text).toContain('Signed in');
    expect(text).toContain('Chrome · Windows');
    expect(text).not.toContain('Nothing recorded yet');
  });
});
