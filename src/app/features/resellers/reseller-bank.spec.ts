import { bankDetailsJson, readBankDetails } from './resellers';

describe('reseller payout bank details', () => {
  it('reads what the API stored and writes it back', () => {
    const v = readBankDetails(
      '{"accountName":"Acme","accountNumber":"1234","ifsc":"HDFC0001234","bankName":"HDFC"}',
    );
    expect(v.bankIfsc).toBe('HDFC0001234');
    expect(JSON.parse(bankDetailsJson({ ...v, bankAccountNumber: '12 34' })!).accountNumber).toBe(
      '1234',
    );
  });

  it('sends nothing when the fields are empty, so saved details stay', () => {
    expect(bankDetailsJson(readBankDetails(null))).toBeUndefined();
    expect(readBankDetails('not json').bankName).toBe('');
  });
});
