import { describe, expect, it } from 'vitest';
import {
  calculateAvailableCredit,
  calculateCreditUtilization,
  calculateOverdueRatio,
  getAmcStatusTone,
  getChallanStatusLabel,
  getChallanStatusTone,
  getCreditStatusTone,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
  getOrderStatusLabel,
  getOrderStatusTone,
  getTicketPriorityTone,
  isInvoiceOverdue,
} from './customer-360.logic';
import {
  DeliveryChallanStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
} from '../../proxy/sales/sales-enums';

describe('Customer 360 Logic', () => {
  describe('calculateCreditUtilization', () => {
    it('returns 0 when credit limit is not set or zero', () => {
      expect(calculateCreditUtilization(undefined, 100, 50)).toBe(0);
      expect(calculateCreditUtilization(0, 100, 50)).toBe(0);
    });

    it('calculates correct utilization percentage', () => {
      // Limit: 10,00,000 paise (₹10,000), Owed: 3,00,000 paise, On Order: 2,00,000 paise => 50%
      expect(calculateCreditUtilization(1_000_000, 300_000, 200_000)).toBe(50);
    });

    it('caps utilization at 100%', () => {
      expect(calculateCreditUtilization(100_000, 80_000, 40_000)).toBe(100);
    });
  });

  describe('calculateAvailableCredit', () => {
    it('returns null when credit limit is undefined', () => {
      expect(calculateAvailableCredit(undefined, 100, 50)).toBeNull();
    });

    it('returns remaining credit accurately', () => {
      expect(calculateAvailableCredit(1_000_000, 400_000, 100_000)).toBe(500_000);
    });

    it('floors available credit to 0 if committed exceeds limit', () => {
      expect(calculateAvailableCredit(100_000, 80_000, 40_000)).toBe(0);
    });
  });

  describe('calculateOverdueRatio', () => {
    it('returns 0 when total owed is 0 or negative', () => {
      expect(calculateOverdueRatio(0, 0)).toBe(0);
      expect(calculateOverdueRatio(-100, 50)).toBe(0);
    });

    it('calculates correct percentage of overdue amount', () => {
      expect(calculateOverdueRatio(500_000, 100_000)).toBe(20);
    });
  });

  describe('getCreditStatusTone', () => {
    it('returns bad when account is on hold', () => {
      expect(getCreditStatusTone(true, 10, 0)).toBe('bad');
    });

    it('returns warn when overdue balance exists or utilization >= 90%', () => {
      expect(getCreditStatusTone(false, 92, 0)).toBe('warn');
      expect(getCreditStatusTone(false, 30, 5000)).toBe('warn');
    });

    it('returns good for healthy credit profile', () => {
      expect(getCreditStatusTone(false, 40, 0)).toBe('good');
    });
  });

  describe('Status Labels and Tones', () => {
    it('maps SalesOrderStatus correctly', () => {
      expect(getOrderStatusLabel(SalesOrderStatus.Draft)).toBe('Draft');
      expect(getOrderStatusLabel(SalesOrderStatus.Confirmed)).toBe('Confirmed');
      expect(getOrderStatusLabel(SalesOrderStatus.Completed)).toBe('Completed');

      expect(getOrderStatusTone(SalesOrderStatus.Confirmed)).toBe('teal');
      expect(getOrderStatusTone(SalesOrderStatus.Completed)).toBe('good');
      expect(getOrderStatusTone(SalesOrderStatus.Cancelled)).toBe('bad');
    });

    it('maps DeliveryChallanStatus correctly', () => {
      expect(getChallanStatusLabel(DeliveryChallanStatus.Dispatched)).toBe('In Transit');
      expect(getChallanStatusLabel(DeliveryChallanStatus.Delivered)).toBe('Delivered');

      expect(getChallanStatusTone(DeliveryChallanStatus.Dispatched)).toBe('amber');
      expect(getChallanStatusTone(DeliveryChallanStatus.Delivered)).toBe('good');
    });

    it('maps SalesInvoiceStatus correctly', () => {
      expect(getInvoiceStatusLabel(SalesInvoiceStatus.Issued)).toBe('Issued');
      expect(getInvoiceStatusLabel(SalesInvoiceStatus.Paid)).toBe('Paid');

      expect(getInvoiceStatusTone(SalesInvoiceStatus.Paid)).toBe('good');
      expect(getInvoiceStatusTone(SalesInvoiceStatus.PartiallyPaid)).toBe('amber');
    });

    it('maps TicketPriority and AMC status tones', () => {
      expect(getTicketPriorityTone('Urgent')).toBe('bad');
      expect(getTicketPriorityTone('High')).toBe('warn');
      expect(getTicketPriorityTone('Low')).toBe('neutral');

      expect(getAmcStatusTone('Active')).toBe('good');
      expect(getAmcStatusTone('Expired')).toBe('bad');
      expect(getAmcStatusTone('Expiring Soon')).toBe('warn');
    });

    it('checks overdue invoice status accurately', () => {
      const pastDate = new Date(Date.now() - 5 * 86_400_000).toISOString();
      const futureDate = new Date(Date.now() + 5 * 86_400_000).toISOString();

      expect(isInvoiceOverdue(100_00, pastDate)).toBe(true);
      expect(isInvoiceOverdue(0, pastDate)).toBe(false);
      expect(isInvoiceOverdue(100_00, futureDate)).toBe(false);
    });
  });
});
