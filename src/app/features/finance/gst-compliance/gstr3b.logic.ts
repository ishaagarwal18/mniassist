import type { GstHeadsDto, Gstr3bSummaryDto } from '../../../proxy/finance';

export type Gstr3bRowType = 'outward' | 'itc' | 'reversal' | 'info' | 'cash';

export interface Gstr3bRow {
  heading: string;
  /** Rupees; null where the form has no taxable value. */
  taxable: number | null;
  igst: number | null;
  cgst: number | null;
  sgst: number | null;
  cess: number | null;
  totalTax: number;
  type: Gstr3bRowType;
}

const rupees = (paise: number) => paise / 100;

function row(
  heading: string,
  h: GstHeadsDto,
  type: Gstr3bRowType,
  taxable: number | null = null,
): Gstr3bRow {
  return {
    heading,
    taxable: taxable == null ? null : rupees(taxable),
    igst: rupees(h.igstInPaise),
    cgst: rupees(h.cgstInPaise),
    sgst: rupees(h.sgstInPaise),
    cess: rupees(h.cessInPaise),
    totalTax: rupees(h.igstInPaise + h.cgstInPaise + h.sgstInPaise + h.cessInPaise),
    type,
  };
}

const empty: GstHeadsDto = {
  igstInPaise: 0,
  cgstInPaise: 0,
  sgstInPaise: 0,
  cessInPaise: 0,
  totalInPaise: 0,
};

/** Tables 3.1 and 4 of GSTR-3B, in the form's own order and wording. */
export function gstr3bTableRows(b: Gstr3bSummaryDto): Gstr3bRow[] {
  return [
    row(
      '3.1(a) Outward taxable supplies (other than zero rated, nil rated and exempted)',
      b.outwardTax,
      'outward',
      b.outwardTaxableInPaise,
    ),
    row('3.1(c) Other outward supplies (nil rated, exempted)', empty, 'info', b.nilRatedInPaise),
    row(
      '3.1(d) Inward supplies liable to reverse charge',
      b.reverseChargeTax,
      'outward',
      b.reverseChargeTaxableInPaise,
    ),
    row('4(A)(1) ITC: import of goods', b.itcImports, 'itc'),
    row('4(A)(3) ITC: inward supplies liable to reverse charge', b.itcReverseCharge, 'itc'),
    row('4(A)(4) ITC: inward supplies from ISD', b.itcIsd ?? empty, 'itc'),
    row('4(A)(5) ITC: all other', b.itcAllOther, 'itc'),
    row('4(B)(2) ITC reversed: others (Rule 37, unpaid after 180 days)', b.itcReversed, 'reversal'),
    row('4(C) Net ITC available', b.netItc, 'itc'),
    row('4(D)(2) Ineligible ITC (not available as per GSTR-2B)', b.itcIneligible, 'info'),
  ];
}

export interface SetOffRow {
  heading: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  total: number;
}

function setOffRow(heading: string, h: GstHeadsDto): SetOffRow {
  return {
    heading,
    igst: rupees(h.igstInPaise),
    cgst: rupees(h.cgstInPaise),
    sgst: rupees(h.sgstInPaise),
    cess: rupees(h.cessInPaise),
    total: rupees(h.igstInPaise + h.cgstInPaise + h.sgstInPaise + h.cessInPaise),
  };
}

/** Tax owed, what credit pays, what is left in cash, and the credit carried forward. */
export function setOffRows(b: Gstr3bSummaryDto): SetOffRow[] {
  return [
    setOffRow('Tax on outward supplies', b.outwardTax),
    ...(b.hasOpeningCreditBalance
      ? [setOffRow('Credit ledger opening balance', b.openingCreditBalance)]
      : []),
    setOffRow('Paid from input tax credit', b.paidFromCredit),
    setOffRow('Reverse-charge tax (cash only)', b.reverseChargeTax),
    setOffRow('Payable in cash', b.payableInCash),
    setOffRow('Credit carried forward', b.creditCarriedForward),
  ];
}
