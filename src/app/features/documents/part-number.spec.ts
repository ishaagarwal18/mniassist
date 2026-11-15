import { isCallableNumber } from '../account/calling-number-card';
import { rupeeTextToPaise } from '../pipeline/ai-negotiator/counter-offer-check';
import { languageName } from '../templates/template-languages';
import { looksLikePartNumber } from './documents';

describe('looksLikePartNumber', () => {
  it('accepts one token with a digit', () => {
    expect(looksLikePartNumber('6ES7214-1AG40')).toBe(true);
    expect(looksLikePartNumber(' 3RT2026 ')).toBe(true);
  });

  it('refuses words, short text and phrases', () => {
    expect(looksLikePartNumber('brochure')).toBe(false);
    expect(looksLikePartNumber('a1')).toBe(false);
    expect(looksLikePartNumber('PLC 1200 manual')).toBe(false);
    expect(looksLikePartNumber(undefined)).toBe(false);
  });
});

describe('isCallableNumber', () => {
  it('accepts Indian mobiles and numbers with a country code', () => {
    expect(isCallableNumber('98765 43210')).toBe(true);
    expect(isCallableNumber('+919876543210')).toBe(true);
  });

  it('refuses short or lettered numbers', () => {
    expect(isCallableNumber('12345')).toBe(false);
    expect(isCallableNumber('98765abcde')).toBe(false);
  });
});

describe('rupeeTextToPaise', () => {
  it('reads Indian-style amounts', () => {
    expect(rupeeTextToPaise('₹1,23,450.50')).toBe(12_345_050);
  });

  it('refuses zero and junk', () => {
    expect(rupeeTextToPaise('0')).toBeNull();
    expect(rupeeTextToPaise('lots')).toBeNull();
  });
});

describe('languageName', () => {
  it('names a language, falling back on the base code', () => {
    expect(languageName('hi')).toBe('Hindi');
    expect(languageName('en_IN')).toBe('English');
    expect(languageName('xx')).toBe('xx');
  });
});
