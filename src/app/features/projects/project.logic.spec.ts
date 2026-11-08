import { describe, expect, it } from 'vitest';

import { ProjectEventKind, ProjectRole, ProjectStage } from '../../proxy/projects/project.service';
import {
  eventText,
  formProblem,
  hasRole,
  needsDetails,
  parseRupees,
  rolesText,
  rupeesShort,
  toggleRole,
} from './project.logic';

describe('project logic', () => {
  it('keeps several roles on one account', () => {
    let roles = toggleRole(ProjectRole.None, ProjectRole.EpcContractor, true);
    roles = toggleRole(roles, ProjectRole.PanelBuilder, true);
    expect(hasRole(roles, ProjectRole.PanelBuilder)).toBe(true);
    expect(rolesText(roles)).toEqual(['EPC contractor', 'Panel builder']);
    roles = toggleRole(roles, ProjectRole.EpcContractor, false);
    expect(roles).toBe(ProjectRole.PanelBuilder);
  });

  it('writes and reads project sizes in lakh and crore', () => {
    expect(rupeesShort(4_50_00_000_00)).toBe('₹4.5 Cr');
    expect(rupeesShort(75_00_000_00)).toBe('₹75 L');
    expect(rupeesShort(40_000_00)).toBe('₹40,000');
    expect(rupeesShort(null)).toBe('—');
    expect(parseRupees('4.5 Cr')).toBe(4_50_00_000_00);
    expect(parseRupees('75 lakh')).toBe(75_00_000_00);
    expect(parseRupees('₹45,00,000')).toBe(45_00_000_00);
    expect(parseRupees('abc')).toBeNull();
    expect(parseRupees('')).toBeNull();
  });

  it('asks for the name and the end-user', () => {
    const base = { name: '', endUserAccountId: '', teamUserIds: [] };
    expect(formProblem(base)).toContain('name');
    expect(formProblem({ ...base, name: 'Line 3' })).toContain('end-user');
    expect(formProblem({ ...base, name: 'Line 3', endUserAccountId: 'a' })).toBeNull();
  });

  it('says what happened on the timeline', () => {
    expect(
      eventText({
        atUtc: '',
        kind: ProjectEventKind.StageChanged,
        fromValue: 'Design',
        toValue: 'Specified',
      }),
    ).toBe('Stage Design → Specified');
    expect(eventText({ atUtc: '', kind: ProjectEventKind.PartyRemoved, fromValue: 'Mecon' })).toBe(
      'Removed Mecon',
    );
  });

  it('asks for details only when moving to Awarded or Closed', () => {
    expect(needsDetails(ProjectStage.Tender)).toBe(false);
    expect(needsDetails(ProjectStage.Awarded)).toBe(true);
    expect(needsDetails(ProjectStage.Closed)).toBe(true);
  });
});
