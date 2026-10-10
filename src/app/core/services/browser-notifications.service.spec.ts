import { applicationServerKey, deviceLabel } from './browser-notifications.service';

describe('browser notifications', () => {
  it('turns a base64url VAPID key into the 65 bytes of an uncompressed P-256 point', () => {
    const key = applicationServerKey(
      'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
    );
    expect(key.length).toBe(65);
    expect(key[0]).toBe(0x04);
  });

  it('names a device from its user agent', () => {
    expect(
      deviceLabel(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
      ),
    ).toBe('Chrome on Android');
    expect(
      deviceLabel(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0',
      ),
    ).toBe('Edge on Windows');
    expect(deviceLabel(null)).toBe('Browser');
  });
});
