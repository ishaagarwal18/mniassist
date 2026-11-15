import { CustomFieldEntity } from '../../proxy/contacts/custom-field-entity.enum';
import { CustomFieldType } from '../../proxy/contacts/custom-field-type.enum';
import {
  FieldDraft,
  draftToInput,
  fieldDraftProblems,
  keyFromLabel,
  optionLines,
} from './custom-fields-card';

const draft = (over: Partial<FieldDraft> = {}): FieldDraft => ({
  appliesTo: CustomFieldEntity.Contact,
  key: 'plant_site',
  keyTouched: false,
  label: 'Plant site',
  type: CustomFieldType.Text,
  isRequired: false,
  order: '10',
  helpText: '',
  options: '',
  ...over,
});

describe('custom field editor', () => {
  it('makes a key from the name the way the API stores it', () => {
    expect(keyFromLabel('Plant site / Unit')).toBe('plant_site_unit');
    expect(keyFromLabel('  OEM — brand ')).toBe('oem_brand');
  });

  it('reads one choice per line, once each', () => {
    expect(optionLines('ABB\n\n siemens \nSiemens\nOmron')).toEqual(['ABB', 'siemens', 'Omron']);
  });

  it('needs a name, a free key and choices for a pick list', () => {
    expect(fieldDraftProblems(draft({ label: ' ' }), [])).toHaveProperty('label');
    const taken = [{ id: 'x', key: 'plant_site', appliesTo: CustomFieldEntity.Contact }];
    expect(fieldDraftProblems(draft(), taken)).toHaveProperty('key');
    expect(fieldDraftProblems(draft({ appliesTo: CustomFieldEntity.Enquiry }), taken)).toEqual({});
    expect(
      fieldDraftProblems(draft({ type: CustomFieldType.SingleSelect, options: ' ' }), []),
    ).toHaveProperty('options');
  });

  it('does not re-check the key of a field being edited', () => {
    const taken = [{ id: 'x', key: 'plant_site', appliesTo: CustomFieldEntity.Contact }];
    expect(fieldDraftProblems(draft({ id: 'x' }), taken)).toEqual({});
  });

  it('sends choices only for pick lists', () => {
    expect(draftToInput(draft({ options: 'A\nB' })).options).toEqual([]);
    expect(
      draftToInput(draft({ type: CustomFieldType.MultiSelect, options: 'A\nB' })).options,
    ).toEqual(['A', 'B']);
    expect(draftToInput(draft({ order: '' })).order).toBe(0);
  });
});
