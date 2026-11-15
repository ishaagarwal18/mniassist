/**
 * The API's purchasing action permissions (AutoReachPermissions in the API). Opening a purchasing screen is checked by its menu
 * item (`canOpenUrl`); these say whether the user may also create or act on records there, so buttons and links to actions their
 * role can't do stay hidden instead of failing with a 403.
 */
export const PURCHASING_PERMISSIONS = {
  /** Suppliers and purchase orders: create, edit, send, receive. */
  manageInventory: 'AutoReach.Inventory.Manage',
  createGrn: 'AutoReach.GoodsReceiptNotes.Create',
  inspectGrn: 'AutoReach.GoodsReceiptNotes.Inspect',
  cancelGrn: 'AutoReach.GoodsReceiptNotes.Cancel',
  createBill: 'AutoReach.VendorBills.Create',
  approveBill: 'AutoReach.VendorBills.Approve',
  payBill: 'AutoReach.VendorBills.RecordPayment',
  cancelBill: 'AutoReach.VendorBills.Cancel',
  createDebitNote: 'AutoReach.VendorDebitNotes.Create',
  issueDebitNote: 'AutoReach.VendorDebitNotes.Issue',
  cancelDebitNote: 'AutoReach.VendorDebitNotes.Cancel',
} as const;
