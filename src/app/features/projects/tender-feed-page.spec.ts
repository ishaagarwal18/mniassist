import { TenderAlertStatus } from '../../proxy/projects/tender-feed.service';
import { alertFilter, daysToClose } from './tender-feed-page';

describe('tender feed', () => {
  it('groups statuses into filter tabs', () => {
    expect(alertFilter(TenderAlertStatus.Suggested)).toBe('suggested');
    expect(alertFilter(TenderAlertStatus.ProjectCreated)).toBe('created');
    expect(alertFilter(TenderAlertStatus.Queued)).toBe('queued');
    expect(alertFilter(TenderAlertStatus.Failed)).toBe('other');
  });

  it('counts whole days to the closing date', () => {
    const now = new Date(2026, 10, 19, 15, 0);
    expect(daysToClose(null, now)).toBeNull();
    expect(daysToClose('2026-11-19', now)).toBe(0);
    expect(daysToClose('2026-11-26', now)).toBe(7);
    expect(daysToClose('2026-11-18', now)).toBe(-1);
  });
});
