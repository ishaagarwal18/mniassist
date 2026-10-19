import { CallAlert, ringingTitle } from './call-alert';

describe('ringing call alert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = 'Inbox · MNI Assist';
  });
  afterEach(() => vi.useRealTimers());

  it('flashes the tab title while ringing and puts it back when it stops', () => {
    const alert = new CallAlert();
    alert.start('call-1:', 'Asha', 'WhatsApp call');

    vi.advanceTimersByTime(1000);
    expect(document.title).toBe(ringingTitle('Asha'));
    vi.advanceTimersByTime(1000);
    expect(document.title).toBe('Inbox · MNI Assist');
    vi.advanceTimersByTime(1000);

    alert.stop();
    expect(document.title).toBe('Inbox · MNI Assist');
  });

  it('keeps ringing for the same call on every poll, and rings again when it changes', () => {
    const alert = new CallAlert();
    alert.start('call-1:', 'Asha', 'WhatsApp call');
    vi.advanceTimersByTime(1000);
    alert.start('call-1:', 'Asha', 'WhatsApp call'); // same call, next poll: no restart
    expect(document.title).toBe(ringingTitle('Asha'));

    alert.start('call-1:Queued', 'Asha', 'WhatsApp call · chose Hindi'); // the IVR queued it: ring again
    vi.advanceTimersByTime(1000);
    expect(document.title).toBe(ringingTitle('Asha'));
    alert.stop();
    expect(document.title).toBe('Inbox · MNI Assist');
  });
});
