import { describe, expect, it, vi } from 'vitest';
import { EWayTransportMode, GstCancelReason, GstPortalMode } from '../../../proxy/finance';
import type { ConfirmService } from '../../../core/ui/confirm.service';
import {
  askCancelReason,
  EWayForm,
  eWayInputFrom,
  portalModeLabel,
  unofficialNumberChip,
} from './gst-portal.logic';

const road = (over: Partial<EWayForm> = {}): EWayForm => ({
  transportMode: EWayTransportMode.Road,
  vehicleNumber: 'mh-14 bt 4590',
  transporterGstin: '',
  transporterName: '',
  transportDocumentNumber: '',
  transportDocumentDate: '',
  distanceInKm: 296,
  ...over,
});

describe('gst portal logic', () => {
  it('cleans a road e-way bill into the API shape', () => {
    const built = eWayInputFrom(
      road({ transporterGstin: ' 27aaacg1234a1z5 ', transporterName: ' Jay Trans ' }),
    );
    expect(built.error).toBeUndefined();
    expect(built.input).toEqual({
      transportMode: EWayTransportMode.Road,
      vehicleNumber: 'MH14BT4590',
      transporterGstin: '27AAACG1234A1Z5',
      transporterName: 'Jay Trans',
      transportDocumentNumber: undefined,
      transportDocumentDateUtc: undefined,
      distanceInKm: 296,
    });
  });

  it('lets a transporter stand in for the vehicle by road', () => {
    const built = eWayInputFrom(road({ vehicleNumber: '', transporterGstin: '27AAACG1234A1Z5' }));
    expect(built.input?.vehicleNumber).toBeUndefined();
    expect(eWayInputFrom(road({ vehicleNumber: '' })).error).toContain('vehicle number');
  });

  it('needs a transport document for rail, air and ship, dated in Indian time', () => {
    const rail = road({ transportMode: EWayTransportMode.Rail, vehicleNumber: '' });
    expect(eWayInputFrom(rail).error).toContain('transport document');
    const built = eWayInputFrom({
      ...rail,
      transportDocumentNumber: 'RR123',
      transportDocumentDate: '2026-11-14',
    });
    expect(built.input?.transportDocumentNumber).toBe('RR123');
    expect(built.input?.transportDocumentDateUtc).toBe('2026-11-13T18:30:00.000Z');
  });

  it('refuses a bad vehicle, transporter or distance', () => {
    expect(eWayInputFrom(road({ vehicleNumber: 'TRUCK1' })).error).toContain('vehicle number');
    expect(eWayInputFrom(road({ transporterGstin: '27AAA' })).error).toContain('15 characters');
    expect(eWayInputFrom(road({ distanceInKm: 0 })).error).toContain('distance');
    expect(eWayInputFrom(road({ distanceInKm: 4001 })).error).toContain('distance');
  });

  it('marks every number that is not a live one', () => {
    expect(unofficialNumberChip(GstPortalMode.Live)).toBeNull();
    expect(unofficialNumberChip(GstPortalMode.Test)?.label).toBe('Test');
    expect(unofficialNumberChip(GstPortalMode.Sandbox)?.label).toBe('Sandbox');
    expect(unofficialNumberChip(undefined)?.label).toBe('Not verified');
    expect(portalModeLabel(GstPortalMode.Live)).toBe('Live');
  });

  it('asks why a number is cancelled and backs out cleanly', async () => {
    const prompt = vi.fn();
    const confirm = { prompt } as unknown as ConfirmService;

    prompt.mockResolvedValueOnce({
      reason: String(GstCancelReason.OrderCancelled),
      remarks: ' Buyer cancelled ',
    });
    expect(await askCancelReason(confirm, 'e-way bill', '471008880909', true)).toEqual({
      reason: GstCancelReason.OrderCancelled,
      remarks: 'Buyer cancelled',
    });
    expect(prompt.mock.calls[0][0].message).toContain('24 hours');

    prompt.mockResolvedValueOnce(null);
    expect(await askCancelReason(confirm, 'e-invoice', 'IRN', false)).toBeNull();
  });
});
