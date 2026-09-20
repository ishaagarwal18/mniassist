import { CustomerAccount, MAX_ACCOUNT_DEPTH, descendantIds, moveProblem } from './account.store';

const acc = (id: string, parentId?: string): CustomerAccount => ({ id, name: id, contactCount: 0, childCount: 0, parentId });

// group > north > plant > line ;  other (top level)
const tree = [acc('group'), acc('north', 'group'), acc('plant', 'north'), acc('line', 'plant'), acc('other')];

describe('account hierarchy rules (client side)', () => {
  it('lists every account below one, at any depth', () => {
    expect(descendantIds('group', tree).sort()).toEqual(['line', 'north', 'plant']);
    expect(descendantIds('other', tree)).toEqual([]);
  });

  it('allows a top-level placement and an ordinary move', () => {
    expect(moveProblem('north', null, tree)).toBeNull();
    expect(moveProblem('plant', 'other', tree)).toBeNull();
  });

  it('refuses an account as its own parent, and a loop', () => {
    expect(moveProblem('north', 'north', tree)).toMatch(/own parent/);
    expect(moveProblem('group', 'plant', tree)).toMatch(/loops/);
  });

  it('refuses a move that would push the deepest descendant past the limit', () => {
    expect(MAX_ACCOUNT_DEPTH).toBe(5);
    // group's subtree is 4 levels tall; under z (level 4 of another chain) it would reach level 8
    expect(moveProblem('group', 'z', [...tree, acc('x', 'other'), acc('y', 'x'), acc('z', 'y')])).toMatch(/at most 5/);
  });

  it('places a brand new account by its parent depth alone', () => {
    expect(moveProblem(null, 'line', tree)).toBeNull(); // level 5: allowed
    const deeper = [...tree, acc('cell', 'line')]; // level 5 exists
    expect(moveProblem(null, 'cell', deeper)).toMatch(/at most 5/);
  });

  it('does not hang on data that already contains a loop', () => {
    const loop = [acc('a', 'b'), acc('b', 'a')];
    expect(descendantIds('a', loop)).toEqual(['b']);
    expect(moveProblem('a', 'b', loop)).not.toBeNull();
  });
});
