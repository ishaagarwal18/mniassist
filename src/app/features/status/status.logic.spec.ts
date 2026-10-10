import { ComponentState, StatusComponents } from '../../proxy/platform/platform-status.service';
import {
  componentNames,
  istTime,
  overallHeadline,
  stateTone,
  toggleComponent,
} from './status.logic';

describe('status page logic', () => {
  it('names the parts an incident flags', () => {
    expect(componentNames(StatusComponents.Messaging | StatusComponents.Payments)).toEqual([
      'WhatsApp, SMS and email messages',
      'Payments and billing',
    ]);
  });

  it('toggles one part on and off', () => {
    const on = toggleComponent(StatusComponents.App, StatusComponents.Campaigns);
    expect(on).toBe(StatusComponents.App | StatusComponents.Campaigns);
    expect(toggleComponent(on, StatusComponents.App)).toBe(StatusComponents.Campaigns);
  });

  it('words the headline and tone from the worst state', () => {
    expect(overallHeadline(ComponentState.Operational)).toBe('All systems operational');
    expect(overallHeadline(ComponentState.Outage)).toBe('Part of MNI Assist is down');
    expect(stateTone(ComponentState.Degraded)).toBe('warn');
  });

  it('shows times in IST', () => {
    expect(istTime('2026-10-10T09:00:00Z')).toBe('10 Oct, 14:30 IST');
  });
});
