import { cardsToCsv, parseVCards } from './vcard';

describe('parseVCards', () => {
  it('reads a vCard 3.0 card, preferring the mobile number', () => {
    const [c] = parseVCards(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'FN:Sandeep Rao',
        'N:Rao;Sandeep;;;',
        'ORG:Sun Energy Automation;Projects',
        'TITLE:Plant Head',
        'TEL;TYPE=WORK,VOICE:+91 22 4000 1234',
        'TEL;TYPE=CELL:+91 98200 11234',
        'EMAIL;TYPE=INTERNET:sandeep@Sun Energy.example',
        'ADR;TYPE=WORK:;;Plot 4\\, MIDC;Pune;Maharashtra;411026;India',
        'END:VCARD',
      ].join('\r\n'),
    );
    expect(c.name).toBe('Sandeep Rao');
    expect(c.phone).toBe('+919820011234');
    expect(c.phones).toEqual(['+919820011234', '+912240001234']);
    expect(c.company).toBe('Sun Energy Automation');
    expect(c.designation).toBe('Plant Head');
    expect(c.email).toBe('sandeep@Sun Energy.example');
    expect(c.city).toBe('Pune');
    expect(c.state).toBe('Maharashtra');
  });

  it('reads several cards, folded lines, bare 2.1 types and quoted-printable names', () => {
    const cards = parseVCards(
      [
        'BEGIN:VCARD',
        'VERSION:2.1',
        'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Nambiar;Priya;;;',
        'TEL;CELL:9876543210',
        'END:VCARD',
        'BEGIN:VCARD',
        'VERSION:4.0',
        'FN:Imtiaz',
        '  Ahmed',
        'item1.TEL;type=WhatsApp:+44 7700 900123',
        'END:VCARD',
        'BEGIN:VCARD',
        'VERSION:3.0',
        'NOTE:no name or number',
        'END:VCARD',
      ].join('\n'),
    );
    expect(cards.map((c) => c.name)).toEqual(['Priya Nambiar', 'Imtiaz Ahmed']);
    expect(cards[0].phone).toBe('9876543210');
    expect(cards[1].phone).toBe('+447700900123');
  });

  it('writes CSV with quoted cells where needed', () => {
    const csv = cardsToCsv(
      parseVCards('BEGIN:VCARD\nFN:A\\, B\nTEL:+911234567890\nORG:Say "hi"\nEND:VCARD'),
    );
    expect(csv.split('\r\n')[0]).toBe('Name,Phone,Company,Designation,City,State,Email,Website');
    expect(csv.split('\r\n')[1]).toBe('"A, B",+911234567890,"Say ""hi""",,,,,');
  });
});
