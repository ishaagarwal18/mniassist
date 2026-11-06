import { parseProductRows } from './product-import';

describe('parseProductRows', () => {
  it('reads part, name, price, unit, category and HSN', () => {
    const [r] = parseProductRows('VFD-15KW,15 kW drive,45000,no,Drives,85044090,12');
    expect(r).toMatchObject({
      partNumber: 'VFD-15KW',
      name: '15 kW drive',
      listPriceInPaise: 4_500_000,
      unit: 'no',
      category: 'Drives',
      hsnCode: '85044090',
      taxRateBasisPoints: 1200,
    });
  });

  it('drops a header row', () => {
    expect(parseProductRows('Part number,Name,Price\nA1,Thing,10')).toHaveLength(1);
  });

  it('takes tab-separated rows so a name may hold a comma, and rupee formatting', () => {
    const [r] = parseProductRows('A1\tDrive, 15 kW\t₹1,20,000');
    expect(r.name).toBe('Drive, 15 kW');
    expect(r.listPriceInPaise).toBe(12_000_000);
  });

  it('keeps rows with missing cells for the server to report', () => {
    const rows = parseProductRows('\n,No part number,5\n');
    expect(rows).toHaveLength(1);
    expect(rows[0].partNumber).toBeNull();
  });

  it('leaves the GST rate unset when the column is empty or not a number', () => {
    expect(parseProductRows('A1,Thing,10')[0].taxRateBasisPoints).toBeNull();
    expect(parseProductRows('A1,Thing,10,no,,,abc')[0].taxRateBasisPoints).toBeNull();
    expect(parseProductRows('A1,Thing,10,no,,,5%')[0].taxRateBasisPoints).toBe(500);
  });

  it('reads the purchase price from the eighth column when there is one', () => {
    expect(parseProductRows('A1	Thing	100	Nos			18	₹72.50')[0].purchasePriceInPaise).toBe(7250);
    expect(parseProductRows('A1,Thing,100')[0].purchasePriceInPaise).toBeNull();
  });

  it('reads an unreadable price as zero', () => {
    expect(parseProductRows('A1,Thing,abc')[0].listPriceInPaise).toBe(0);
  });
});
