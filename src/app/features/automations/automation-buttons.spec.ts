import { buttonId, buttonProblems } from './automation-buttons';

describe('automation reply buttons', () => {
  it('makes a stable id from the title, unique on the message', () => {
    expect(buttonId('Product enquiry', [])).toBe('product_enquiry');
    expect(buttonId('Service / repair', [])).toBe('service_repair');
    expect(buttonId('Spares', ['spares'])).toBe('spares_2');
    expect(buttonId('  ', [])).toBe('option');
  });

  it("follows WhatsApp's limits: three buttons, 20 characters, distinct titles", () => {
    const ok = [
      { id: 'a', title: 'Product enquiry' },
      { id: 'b', title: 'Service / repair' },
      { id: 'c', title: 'Spares' },
    ];
    expect(buttonProblems(ok)).toEqual([]);
    expect(buttonProblems([...ok, { id: 'd', title: 'More' }]).length).toBe(1);
    expect(buttonProblems([{ id: 'a', title: '' }])).toEqual([
      'give every button a title, or remove it.',
    ]);
    expect(buttonProblems([{ id: 'a', title: 'A very long button title' }])).toEqual([
      'keep button titles to 20 characters.',
    ]);
    expect(
      buttonProblems([
        { id: 'a', title: 'Spares' },
        { id: 'b', title: 'spares' },
      ]),
    ).toEqual(['give each button a different title.']);
  });
});
