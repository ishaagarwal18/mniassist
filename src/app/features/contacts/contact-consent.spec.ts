import { ConsentSource } from '../../proxy/contacts/consent-source.enum';
import { sourceLabel } from './contact-consent';

describe('sourceLabel', () => {
  it('names every consent source the API has', () => {
    const values = Object.values(ConsentSource).filter(
      (x): x is ConsentSource => typeof x === 'number',
    );
    for (const s of values) {
      expect(sourceLabel(s), String(s)).not.toBe('Other');
    }
  });

  it('says Unknown when there is no source', () => {
    expect(sourceLabel(undefined)).toBe('Unknown');
  });
});
