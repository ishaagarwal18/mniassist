import { CallAlert, ringingTitle } from './call-alert';

describe('ringing call alert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = 'Inbox · MNI Assist';
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not initialize audio for an unrelated click', () => {
    const audio = vi.fn();
    vi.stubGlobal('AudioContext', audio);
    const alert = new CallAlert();
    document.dispatchEvent(new Event('pointerdown'));
    expect(audio).not.toHaveBeenCalled();
    expect(alert.audioReady()).toBe(false);
  });

  it('initializes audio only when the agent enables call alerts', () => {
    const audio = vi.fn(function () {
      return { state: 'running' };
    });
    vi.stubGlobal('AudioContext', audio);
    const alert = new CallAlert();
    alert.unlock();
    expect(audio).toHaveBeenCalledOnce();
    expect(alert.audioReady()).toBe(true);
  });

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
