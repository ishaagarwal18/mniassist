import { IvrBranchAction, IvrPromptDto } from '../../proxy/voice';

export type VoiceIvrTab = 'Phone menu' | 'Exotel setup' | 'Other lines';

export interface MenuNode {
  prompt: IvrPromptDto;
  /** 0 for the start of the call. */
  level: number;
  /** How a caller gets here: "Key 1 on Main menu". Empty for the start. */
  via: string;
}

/**
 * The menu as a caller walks it: the start of the call first, then each menu under the key that
 * plays it, depth first so a sub-menu sits right under its parent. A menu that two keys play is
 * shown once, under the first. Menus no key reaches are listed apart, since callers never hear them.
 */
export function buildMenuTree(prompts: readonly IvrPromptDto[]): {
  reached: MenuNode[];
  unreached: IvrPromptDto[];
} {
  const byId = new Map(prompts.map((p) => [p.id, p]));
  const start = prompts.find((p) => p.isEntryPoint);
  const reached: MenuNode[] = [];
  const seen = new Set<string | undefined>();

  const visit = (p: IvrPromptDto, level: number, via: string): void => {
    if (seen.has(p.id)) return;
    seen.add(p.id);
    reached.push({ prompt: p, level, via });
    for (const b of p.branches ?? []) {
      if (b.action !== IvrBranchAction.GoToPrompt || !b.nextPromptId) continue;
      const next = byId.get(b.nextPromptId);
      if (next)
        visit(
          next,
          level + 1,
          `${b.digit === '*' ? 'Any other key' : 'Key ' + b.digit} on ${p.name}`,
        );
    }
  };
  if (start) visit(start, 0, '');

  return { reached, unreached: prompts.filter((p) => !seen.has(p.id)) };
}

export interface StatusTile {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad';
  tab: VoiceIvrTab;
}

/** The four facts that say whether calls work, each pointing at the tab that fixes it. */
export function setupStatus(
  channel:
    { exoPhone?: string | null; flowUrl?: string | null; aiFlowUrl?: string | null } | undefined,
  startName: string | null,
  problems: number,
): StatusTile[] {
  return [
    channel
      ? {
          label: 'Exotel account',
          value: channel.exoPhone || 'Connected',
          tone: 'good',
          tab: 'Exotel setup',
        }
      : { label: 'Exotel account', value: 'Not connected', tone: 'bad', tab: 'Exotel setup' },
    channel?.flowUrl
      ? { label: 'Call flow', value: 'Connected', tone: 'good', tab: 'Exotel setup' }
      : { label: 'Call flow', value: 'Not built yet', tone: 'warn', tab: 'Exotel setup' },
    startName
      ? { label: 'Start of call', value: startName, tone: 'good', tab: 'Phone menu' }
      : { label: 'Start of call', value: 'No menu yet', tone: 'warn', tab: 'Phone menu' },
    problems
      ? { label: 'Menu check', value: `${problems} to fix`, tone: 'bad', tab: 'Phone menu' }
      : { label: 'Menu check', value: 'All good', tone: 'good', tab: 'Phone menu' },
  ];
}
