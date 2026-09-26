import { describe, expect, it } from 'vitest';

import {
  PublicWebFormFieldDto,
  WebFormFieldDto,
  WebFormFieldKind as K,
  WebFormFieldTarget as T,
} from '../../proxy/web-forms';
import {
  campaignTags,
  checkAnswers,
  embedded,
  fieldsProblem,
  keyFromLabel,
  kindFor,
  serverFieldErrors,
  targetsFor,
} from './form-logic';

const f = (
  key: string,
  kind = K.Text,
  target = T.None,
  over: Partial<WebFormFieldDto> = {},
): WebFormFieldDto => ({
  key,
  label: key,
  kind,
  required: false,
  options: [],
  target,
  ...over,
});
const usable = (): WebFormFieldDto[] => [
  f('name', K.Text, T.Name),
  f('email', K.Email, T.Email, { required: true }),
];

describe('fieldsProblem', () => {
  it('accepts a form with a way to reach the person', () => {
    expect(fieldsProblem(usable())).toBeNull();
    expect(fieldsProblem([f('phone', K.Phone, T.Phone)])).toBeNull();
  });

  it('refuses no questions, nobody to follow up, and an email question that fills in nothing', () => {
    expect(fieldsProblem([])).toContain('at least one');
    expect(fieldsProblem([f('name', K.Text, T.Name)])).toContain('nobody to follow up');
    expect(fieldsProblem([f('email', K.Email)])).toContain('nobody to follow up');
  });

  it('refuses a name the page uses, a repeated name, a repeated target and a mismatched target', () => {
    expect(fieldsProblem([...usable(), f('consent')])).toContain('not allowed');
    expect(fieldsProblem([...usable(), f('name')])).toContain('Two questions');
    expect(fieldsProblem([...usable(), f('full_name', K.Text, T.Name)])).toContain('Only one');
    expect(fieldsProblem([...usable(), f('budget', K.Text, T.EstimatedValue)])).toContain(
      'different kind',
    );
  });

  it('a choice needs two different options', () => {
    expect(fieldsProblem([...usable(), f('size', K.Select, T.None, { options: ['A'] })])).toContain(
      'two options',
    );
    expect(
      fieldsProblem([...usable(), f('size', K.Select, T.None, { options: ['A', 'a'] })]),
    ).toContain('different');
    expect(
      fieldsProblem([...usable(), f('size', K.Select, T.None, { options: ['A', 'B'] })]),
    ).toBeNull();
  });
});

describe('targets and kinds', () => {
  it('a question only offers the targets that fit it', () => {
    expect(targetsFor(K.Email)).toEqual([T.None, T.Email]);
    expect(targetsFor(K.Number)).toEqual([T.None, T.EstimatedValue]);
    expect(targetsFor(K.Text)).toEqual([T.None, T.Name, T.Company, T.City, T.Requirement]);
    expect(targetsFor(K.Checkbox)).toEqual([T.None]);
  });

  it('picking a target first moves the question to a kind that fits', () => {
    expect(kindFor(T.Email, K.Text)).toBe(K.Email);
    expect(kindFor(T.Requirement, K.LongText)).toBe(K.LongText);
    expect(kindFor(T.None, K.Select)).toBe(K.Select);
  });
});

describe('keyFromLabel', () => {
  it('makes a plain name from the words and keeps it unique', () => {
    expect(keyFromLabel('Your phone number')).toBe('your_phone_number');
    expect(keyFromLabel('  Company / Plant?  ')).toBe('company_plant');
    expect(keyFromLabel('123 go')).toBe('go');
    expect(keyFromLabel('???')).toBe('question');
    expect(keyFromLabel('Name', new Set(['name']))).toBe('name_2');
    expect(keyFromLabel('Consent')).toBe('consent_2');
  });
});

describe('checkAnswers', () => {
  const q = (
    key: string,
    kind: K,
    required = false,
    options: string[] = [],
  ): PublicWebFormFieldDto => ({ key, label: key.toUpperCase(), kind, required, options });
  const fields = [
    q('name', K.Text, true),
    q('email', K.Email, true),
    q('phone', K.Phone),
    q('budget', K.Number),
    q('size', K.Select, false, ['Small', 'Large']),
    q('amc', K.Checkbox, true),
  ];

  it('passes good answers', () => {
    expect(
      checkAnswers(fields, {
        name: 'A',
        email: 'a@b.co',
        phone: '98123 45678',
        budget: '12,50,000',
        size: 'large',
        amc: 'yes',
      }),
    ).toEqual({});
  });

  it('names each wrong answer', () => {
    const errors = checkAnswers(fields, {
      name: '',
      email: 'nope',
      phone: '12',
      budget: 'lots',
      size: 'huge',
      amc: 'no',
    });
    expect(Object.keys(errors).sort()).toEqual(['amc', 'budget', 'email', 'name', 'phone', 'size']);
  });

  it('blank optional questions are fine', () => {
    expect(checkAnswers(fields, { name: 'A', email: 'a@b.co', amc: 'yes' })).toEqual({});
  });
});

describe('campaignTags and embedded', () => {
  it('reads only the three campaign tags, trimmed and capped', () => {
    expect(
      campaignTags('?utm_source=google&utm_medium=%20cpc%20&utm_campaign=spring&other=1'),
    ).toEqual({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'spring' });
    expect(campaignTags('?utm_source=' + 'x'.repeat(300)).utmSource).toHaveLength(100);
    expect(campaignTags('')).toEqual({
      utmSource: undefined,
      utmMedium: undefined,
      utmCampaign: undefined,
    });
  });

  it('knows when the page is inside a frame', () => {
    expect(embedded('?embed=1')).toBe(true);
    expect(embedded('?embed=0')).toBe(false);
    expect(embedded('')).toBe(false);
  });
});

describe('serverFieldErrors', () => {
  it('maps the server messages to questions and lower-cases a member named in camel case', () => {
    const e = {
      error: {
        error: {
          validationErrors: [
            { message: 'Email is required.', members: ['email'] },
            { message: 'Please tick.', members: ['Consent'] },
          ],
        },
      },
    };
    expect(serverFieldErrors(e)).toEqual({ email: 'Email is required.', consent: 'Please tick.' });
    expect(serverFieldErrors({})).toEqual({});
  });
});
