import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArGoogleCalendarCard, GoogleCalendarService } from './google-calendar-card';

describe('Google Calendar card', () => {
  const api = { status: vi.fn(), start: vi.fn(), disconnect: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      imports: [ArGoogleCalendarCard],
      providers: [{ provide: GoogleCalendarService, useValue: api }],
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArGoogleCalendarCard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('says when the platform has no Google client yet', async () => {
    api.status.mockReturnValue(of({ available: false, connected: false }));
    const { root } = await create();
    expect(root.textContent).toContain('Not available yet');
    expect(root.querySelector('button')).toBeNull();
  });

  it('shows the connected account and disconnects it', async () => {
    api.status.mockReturnValue(
      of({
        available: true,
        connected: true,
        email: 'priya@meridian.in',
        connectedAtUtc: '2026-10-31T05:00:00Z',
      }),
    );
    api.disconnect.mockReturnValue(of({ available: true, connected: false }));
    const { fixture, root } = await create();
    expect(root.textContent).toContain('Connected as priya@meridian.in');
    root.querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.disconnect).toHaveBeenCalled();
    expect(root.textContent).toContain('Connect Google Calendar');
  });
});
