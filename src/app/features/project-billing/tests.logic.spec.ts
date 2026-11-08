import { describe, expect, it } from 'vitest';

import { TestItemResult } from '../../proxy/project-billing/acceptance-test.service';
import { ResultRow, signatureProblem } from './tests.logic';

const row = (
  result: TestItemResult,
  critical = false,
  closedOn: string | null = null,
): ResultRow => ({
  itemId: 'i',
  text: 'Loop check',
  result,
  remark: '',
  critical,
  dueOn: '',
  closedOn,
});

describe('acceptance test logic', () => {
  it('needs every item recorded and no open critical punch item', () => {
    expect(signatureProblem([row(TestItemResult.Pass), row(TestItemResult.Pending)])).toBe(
      '1 items have no result yet.',
    );
    expect(signatureProblem([row(TestItemResult.Fail, true)])).toContain('critical');
    expect(signatureProblem([row(TestItemResult.Fail, true, '2026-11-09')])).toBeNull();
    expect(
      signatureProblem([row(TestItemResult.Fail, false), row(TestItemResult.NotApplicable)]),
    ).toBeNull();
  });
});
