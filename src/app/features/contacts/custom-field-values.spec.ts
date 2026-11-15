import { CustomFieldDefinitionDto, CustomFieldType } from '../../proxy/contacts';
import { visitStatus } from '../helpdesk/field-visits-card';
import {
  customFieldAttributes,
  customFieldProblem,
  customFieldProblems,
  customFieldValuesOf,
  showCustomValue,
  sortFields,
  toggleMulti,
} from './custom-field-values';

const field = (over: Partial<CustomFieldDefinitionDto>): CustomFieldDefinitionDto => ({
  id: over.key ?? 'f',
  key: 'f',
  label: 'Field',
  type: CustomFieldType.Text,
  ...over,
});

const select = field({
  key: 'brands',
  label: 'Brands',
  type: CustomFieldType.MultiSelect,
  options: [
    { value: 'Siemens', order: 2 },
    { value: 'ABB', order: 1 },
  ],
});

describe('custom field values', () => {
  it('puts fields in the workspace order', () => {
    const sorted = sortFields([field({ key: 'b', order: 2 }), field({ key: 'a', order: 1 })]);
    expect(sorted.map((f) => f.key)).toEqual(['a', 'b']);
  });

  it('checks each type the way the API does', () => {
    const num = field({ type: CustomFieldType.Number, label: 'Lines' });
    expect(customFieldProblem(num, '1,250')).toBeNull();
    expect(customFieldProblem(num, 'ten')).toMatch(/number/);
    const date = field({ type: CustomFieldType.Date });
    expect(customFieldProblem(date, '2026-11-15')).toBeNull();
    expect(customFieldProblem(date, '15/11/2026')).toMatch(/date/);
    expect(customFieldProblem(select, 'ABB, Siemens')).toBeNull();
    expect(customFieldProblem(select, 'ABB, Omron')).toMatch(/options/);
  });

  it('needs a required field and allows an empty optional one', () => {
    expect(customFieldProblem(field({ isRequired: true, label: 'Plant' }), ' ')).toMatch(
      /Plant is required/,
    );
    expect(customFieldProblem(field({}), '')).toBeNull();
    expect(customFieldProblems([field({ key: 'p', isRequired: true })], {})).toHaveProperty('p');
  });

  it('keeps multi-select choices in the option order', () => {
    expect(toggleMulti(select, 'Siemens', 'ABB')).toBe('ABB, Siemens');
    expect(toggleMulti(select, 'ABB, Siemens', 'ABB')).toBe('Siemens');
  });

  it('sends every field, a cleared one as empty so the API removes it', () => {
    const num = field({ key: 'lines', type: CustomFieldType.Number });
    expect(customFieldAttributes([num, field({ key: 'site' })], { lines: '1,250' })).toEqual({
      lines: '1250',
      site: '',
    });
  });

  it('reads stored values whatever the key case', () => {
    expect(customFieldValuesOf([field({ key: 'site' })], { Site: 'Pune' })).toEqual({
      site: 'Pune',
    });
  });

  it('shows yes/no and dates the way people read them', () => {
    expect(showCustomValue(field({ type: CustomFieldType.Boolean }), 'true')).toBe('Yes');
    expect(showCustomValue(field({}), '')).toBe('—');
    expect(showCustomValue(field({ type: CustomFieldType.Date }), '2026-11-15')).toMatch(/2026/);
  });
});

describe('visitStatus', () => {
  it('names each visit state', () => {
    expect(visitStatus('SignedOff')).toEqual({ label: 'Signed off', tone: 'good' });
    expect(visitStatus('AwaitingSignOff').tone).toBe('warn');
    expect(visitStatus('Open').label).toBe('On site');
  });
});
