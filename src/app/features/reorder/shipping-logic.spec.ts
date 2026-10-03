import { deliveryLabel, isPincode, isTrackingUrl, parseKg } from './shipping-logic';

describe('shipping logic', () => {
  it('reads PIN codes, weights and tracking links the way the API accepts them', () => {
    expect(isPincode('422007')).toBe(true);
    expect(isPincode('022007')).toBe(false);
    expect(isPincode('42200')).toBe(false);
    expect(parseKg('2.5')).toBe(2.5);
    expect(parseKg('0')).toBeNull();
    expect(parseKg('two')).toBeNull();
    expect(isTrackingUrl('')).toBe(true);
    expect(isTrackingUrl('https://www.vrlgroup.in/track?lr=1')).toBe(true);
    expect(isTrackingUrl('javascript:alert(1)')).toBe(false);
  });

  it('names delivery states for customers', () => {
    expect(deliveryLabel('OutForDelivery')).toBe('Out for delivery');
    expect(deliveryLabel('Exception')).toBe('Problem');
    expect(deliveryLabel(null)).toBe('');
  });
});
