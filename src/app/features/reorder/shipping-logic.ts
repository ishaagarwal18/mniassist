import type { ChipTone } from '../../ui/chip';
import type { ShipmentStatus } from '../../proxy/shipping/shipping.service';

export const SHIPMENT_STATE: Record<ShipmentStatus, { label: string; tone: ChipTone }> = {
  Dispatched: { label: 'Dispatched', tone: 'teal' },
  InTransit: { label: 'In transit', tone: 'teal' },
  OutForDelivery: { label: 'Out for delivery', tone: 'amber' },
  Delivered: { label: 'Delivered', tone: 'good' },
  Exception: { label: 'Problem', tone: 'warn' },
};

/** What the customer reads about a delivery: "Dispatched", "In transit", "Delivered"… */
export function deliveryLabel(status: string | null | undefined): string {
  return status ? (SHIPMENT_STATE[status as ShipmentStatus]?.label ?? status) : '';
}

/** A six-digit Indian PIN code (never starting with 0). */
export function isPincode(text: string): boolean {
  return /^[1-9]\d{5}$/.test(text.trim());
}

/** Kilograms as typed: "2", "2.5", "0.75"; anything else, or zero, is null. */
export function parseKg(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,6}(\.\d{1,3})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

/** A tracking link has to be a web address. Blank is fine. */
export function isTrackingUrl(text: string): boolean {
  const t = text.trim();
  return t === '' || /^https?:\/\/\S+$/i.test(t);
}
