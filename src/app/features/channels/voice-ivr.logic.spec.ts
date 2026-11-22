import { IvrBranchAction, IvrPromptDto } from '../../proxy/voice';
import { buildMenuTree, setupStatus } from './voice-ivr.logic';

const menu = (
  id: string,
  name: string,
  branches: IvrPromptDto['branches'],
  isEntryPoint = false,
): IvrPromptDto => ({ id, name, sayText: '', branches, isEntryPoint }) as IvrPromptDto;

describe('phone menu tree', () => {
  const main = menu(
    'm',
    'Main',
    [
      { digit: '1', action: IvrBranchAction.GoToPrompt, nextPromptId: 's' },
      { digit: '2', action: IvrBranchAction.TransferToAgent, transferToNumber: '919000000000' },
      { digit: '*', action: IvrBranchAction.GoToPrompt, nextPromptId: 'm' },
    ],
    true,
  );
  const sales = menu('s', 'Sales', [
    { digit: '1', action: IvrBranchAction.GoToPrompt, nextPromptId: 'q' },
  ]);
  const quotes = menu('q', 'Quotes', []);
  const old = menu('o', 'Old menu', []);

  it('walks from the start of the call, each sub-menu under the key that plays it', () => {
    const { reached, unreached } = buildMenuTree([old, quotes, sales, main]);
    expect(reached.map((n) => [n.prompt.name, n.level, n.via])).toEqual([
      ['Main', 0, ''],
      ['Sales', 1, 'Key 1 on Main'],
      ['Quotes', 2, 'Key 1 on Sales'],
    ]);
    expect(unreached.map((p) => p.name)).toEqual(['Old menu']);
  });

  it('lists everything as unreached when no menu starts the call', () => {
    expect(buildMenuTree([sales]).unreached.map((p) => p.name)).toEqual(['Sales']);
  });
});

describe('set-up status tiles', () => {
  it('flags what is missing and points at the tab that fixes it', () => {
    const tiles = setupStatus(undefined, null, 0);
    expect(tiles.map((t) => [t.value, t.tone, t.tab])).toEqual([
      ['Not connected', 'bad', 'Exotel setup'],
      ['Not built yet', 'warn', 'Exotel setup'],
      ['No menu yet', 'warn', 'Phone menu'],
      ['All good', 'good', 'Phone menu'],
    ]);
  });

  it('shows the number, the start menu and problems to fix', () => {
    const tiles = setupStatus({ exoPhone: '08069990001', flowUrl: 'http://x' }, 'Main', 2);
    expect(tiles.map((t) => t.value)).toEqual(['08069990001', 'Connected', 'Main', '2 to fix']);
  });
});
