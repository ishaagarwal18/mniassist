import { alertTemplateState } from './alert-template-status';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';

describe('alertTemplateState', () => {
  it('is approved when any number has it approved', () => {
    expect(
      alertTemplateState([
        { name: 'ops_alert', status: TemplateStatus.Rejected },
        { name: 'ops_alert', status: TemplateStatus.Approved },
      ]),
    ).toBe('approved');
  });

  it('is pending while waiting for Meta', () => {
    expect(alertTemplateState([{ name: 'ops_alert', status: TemplateStatus.Pending }])).toBe(
      'pending',
    );
  });

  it('is blocked when rejected or paused only', () => {
    expect(alertTemplateState([{ name: 'ops_alert', status: TemplateStatus.Paused }])).toBe(
      'blocked',
    );
  });

  it('ignores other templates that match the search', () => {
    expect(alertTemplateState([{ name: 'ops_alert_old', status: TemplateStatus.Approved }])).toBe(
      'missing',
    );
  });
});
