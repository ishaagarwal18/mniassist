import { workspaceNameProblem, workspaceSlug } from './workspace-slug';

describe('workspaceSlug', () => {
  it('turns a company name with spaces into its sign-in name', () => {
    expect(workspaceSlug('Sun Energy Automation')).toBe('sun-energy-automation');
    expect(workspaceSlug('  Sun   Energy -- Automation  ')).toBe('sun-energy-automation');
    expect(workspaceSlug('acme_controls.demo')).toBe('acme-controls-demo');
  });

  it('drops characters a workspace name cannot hold', () => {
    expect(workspaceSlug('Kalyani & Sons (Pune)!')).toBe('kalyani-sons-pune');
    expect(workspaceSlug('-leading and trailing-')).toBe('leading-and-trailing');
  });

  it('leaves an existing sign-in name as it is', () => {
    expect(workspaceSlug('emnisoft')).toBe('emnisoft');
    expect(workspaceSlug('throttle-test-2')).toBe('throttle-test-2');
  });

  it('explains what is wrong with a name', () => {
    expect(workspaceNameProblem('')).toBe('Enter a workspace name.');
    expect(workspaceNameProblem('!!')).toContain('letters (a–z) or digits');
    expect(workspaceNameProblem('ab')).toContain('at least 3');
    expect(workspaceNameProblem('a'.repeat(31))).toContain('at most 30');
    expect(workspaceNameProblem('Sun Energy Automation')).toBeNull();
  });
});
