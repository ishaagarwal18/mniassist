import { EntityChangeType } from '../../proxy/auditing/entity-change-type.enum';
import {
  changeTypeLabel,
  changeTypeTone,
  durationLabel,
  pageLabel,
  prettyJson,
  propertyValue,
  shortTypeName,
  statusTone,
  windowRange,
} from './audit-log.util';

describe('the audit window', () => {
  it('ends now and reaches back the chosen number of hours', () => {
    const now = Date.UTC(2026, 9, 5, 12, 0);
    const r = windowRange('24h', now);
    expect(r.endTime).toBe('2026-10-05T12:00:00.000Z');
    expect(r.startTime).toBe('2026-10-04T12:00:00.000Z');
    expect(windowRange('7d', now).startTime).toBe('2026-09-28T12:00:00.000Z');
  });
});

describe('a request status', () => {
  it('is red when the call threw, whatever the status code says', () => {
    expect(statusTone(200, true)).toBe('bad');
  });

  it('follows the status class otherwise', () => {
    expect(statusTone(204, false)).toBe('good');
    expect(statusTone(403, false)).toBe('amber');
    expect(statusTone(502, false)).toBe('bad');
    expect(statusTone(undefined, false)).toBe('neutral');
  });
});

describe('labels', () => {
  it('shows short durations in milliseconds and long ones in seconds', () => {
    expect(durationLabel(42)).toBe('42 ms');
    expect(durationLabel(1530)).toBe('1.53 s');
    expect(durationLabel(12_400)).toBe('12.4 s');
    expect(durationLabel(undefined)).toBe('—');
  });

  it('drops the namespace and any generic arity from a type name', () => {
    expect(shortTypeName('Volo.Abp.Identity.IdentityUser')).toBe('IdentityUser');
    expect(shortTypeName('Mni.AutoReach.Things.Box`1')).toBe('Box');
    expect(shortTypeName(null)).toBe('—');
  });

  it('names and colours each kind of change', () => {
    expect(changeTypeLabel(EntityChangeType.Created)).toBe('Created');
    expect(changeTypeTone(EntityChangeType.Created)).toBe('good');
    expect(changeTypeTone(EntityChangeType.Deleted)).toBe('bad');
    expect(changeTypeTone(EntityChangeType.Updated)).toBe('teal');
  });

  it('counts a page in Indian digit grouping', () => {
    expect(pageLabel(0, 20, 123456)).toBe('1–20 of 1,23,456');
    expect(pageLabel(0, 0, 0)).toBe('No records');
  });
});

describe('recorded values', () => {
  it('indents JSON and leaves anything else alone', () => {
    expect(prettyJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(prettyJson('not json')).toBe('not json');
    expect(prettyJson(undefined)).toBe('');
  });

  it('unwraps a JSON string value but keeps other values as stored', () => {
    expect(propertyValue('"Rahul"')).toBe('Rahul');
    expect(propertyValue('true')).toBe('true');
    expect(propertyValue(null)).toBe('—');
  });
});
