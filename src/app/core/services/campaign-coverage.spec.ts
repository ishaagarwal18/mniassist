import { sendTimeCoverage } from './campaign.service';

describe('sendTimeCoverage', () => {
  it('says how many recipients have a learned hour and what happens to the rest', () => {
    expect(sendTimeCoverage(12, 40)).toBe(
      '12 of 40 recipients (30%) have a learned hour; the other 28 go out at the scheduled time.',
    );
  });

  it('covers the all, none and empty cases', () => {
    expect(sendTimeCoverage(5, 5)).toBe('All 5 recipients have a learned hour.');
    expect(sendTimeCoverage(0, 5)).toContain('all go out at the scheduled time');
    expect(sendTimeCoverage(0, 0)).toContain('No recipients');
  });
});
