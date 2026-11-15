import { abTestProblem } from './ab-test-page';

const v = (label: string, templateId: string, weight = 1) => ({ label, templateId, weight });

describe('abTestProblem', () => {
  it('accepts two labelled variants with different templates', () => {
    expect(abTestProblem([v('A', 't1'), v('B', 't2')], 20)).toBeNull();
  });

  it('needs at least two variants', () => {
    expect(abTestProblem([v('A', 't1')], 20)).toMatch(/two variants/);
  });

  it('needs a label and template on every variant', () => {
    expect(abTestProblem([v('A', 't1'), v(' ', 't2')], 20)).toMatch(/label and a template/);
    expect(abTestProblem([v('A', 't1'), v('B', '')], 20)).toMatch(/label and a template/);
  });

  it('refuses the same template twice', () => {
    expect(abTestProblem([v('A', 't1'), v('B', 't1')], 20)).toMatch(/different template/);
  });

  it('refuses a zero weight', () => {
    expect(abTestProblem([v('A', 't1'), v('B', 't2', 0)], 20)).toMatch(/weight/);
  });

  it('keeps the test audience between 1 and 100%', () => {
    expect(abTestProblem([v('A', 't1'), v('B', 't2')], 0)).toMatch(/1–100%/);
    expect(abTestProblem([v('A', 't1'), v('B', 't2')], 101)).toMatch(/1–100%/);
    expect(abTestProblem([v('A', 't1'), v('B', 't2')], 100)).toBeNull();
  });
});
