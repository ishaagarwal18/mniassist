import { describe, expect, it } from 'vitest';
import {
  agentFileName,
  agentFileText,
  compareRows,
  diffLines,
  emptyDefinition,
  flowProblems,
  readAgentFile,
  stageKey,
} from './voice-agent-files';
import { VoiceAgentDefinition, cleanSpeech } from './voice-agent.service';

const agent = (): VoiceAgentDefinition => ({
  ...emptyDefinition(),
  name: 'Pump sales',
  instructions: 'Ask about the pump.\nNever promise discounts.',
  greeting: 'Hello, I am an AI assistant.',
  tools: {
    ...emptyDefinition().tools!,
    actingUserId: 'user-1',
    raiseTickets: true,
    transferToPeople: true,
    transferTeamIds: ['team-1'],
  },
  type: 'flow',
  flow: {
    stages: [
      { key: 'ask', name: 'Ask', goal: 'Find the need', next: [{ when: 'ready', to: 'close' }] },
      { key: 'close', name: 'Close', goal: 'Summarise', next: [] },
    ],
  },
});

describe('voice agent files', () => {
  it('exports without this workspace’s people and teams, and reads back the same agent', () => {
    const text = agentFileText(agent(), new Date('2026-10-27T10:00:00Z'));
    expect(text).not.toContain('user-1');
    expect(text).not.toContain('team-1');
    const read = readAgentFile(text);
    expect(read.name).toBe('Pump sales');
    expect(read.tools?.raiseTickets).toBe(true);
    expect(read.tools?.actingUserId).toBeNull();
    expect(read.flow?.stages.map((s) => s.key)).toEqual(['ask', 'close']);
    expect(agentFileName(read)).toBe('pump-sales.voice-agent.json');
  });

  it('carries speech tuning through a file, cleaned, and falls back to defaults for bad values', () => {
    const tuned: VoiceAgentDefinition = {
      ...agent(),
      speech: {
        patience: 'patient',
        interruptible: false,
        speedPercent: 110,
        noiseReduction: 'far_field',
        vocabulary: [' Kirloskar ', '', 'SKU-42'],
        pronunciations: [
          { word: 'Sikarwar', say: 'Sik-ar-vaar' },
          { word: ' ', say: '' },
        ],
      },
    };
    const read = readAgentFile(agentFileText(tuned));
    expect(read.speech).toEqual({
      patience: 'patient',
      interruptible: false,
      speedPercent: 110,
      noiseReduction: 'far_field',
      vocabulary: ['Kirloskar', 'SKU-42'],
      pronunciations: [{ word: 'Sikarwar', say: 'Sik-ar-vaar' }],
    });
    const odd = readAgentFile(
      JSON.stringify({
        format: 'mni-voice-agent',
        version: 1,
        agent: {
          name: 'x',
          instructions: 'y',
          greeting: 'z',
          speech: { patience: 'slow', speedPercent: 300, noiseReduction: 'studio' },
        },
      }),
    );
    expect(odd.speech).toEqual(cleanSpeech(undefined));
  });

  it('refuses files that are not agents', () => {
    expect(() => readAgentFile('{')).toThrow('AutoReach::VoiceAgent.File.notJson');
    expect(() => readAgentFile('{"format":"other","agent":{}}')).toThrow(
      'AutoReach::VoiceAgent.File.notAgent',
    );
    expect(() =>
      readAgentFile('{"format":"mni-voice-agent","agent":{"name":"x","instructions":"y"}}'),
    ).toThrow('AutoReach::VoiceAgent.File.incomplete');
  });

  it('makes unique stage keys and finds broken flows', () => {
    expect(stageKey('Ask for budget!', [])).toBe('ask_for_budget');
    expect(stageKey('Ask', ['ask', 'ask_2'])).toBe('ask_3');
    expect(stageKey('End', [])).toBe('end_stage');
    expect(stageKey('123', [])).toBe('stage');
    expect(flowProblems(agent().flow)).toEqual([]);
    expect(flowProblems({ stages: [] })).toEqual(['AutoReach::VoiceAgent.Flow.needsStage']);
    const broken = agent().flow!;
    broken.stages[1].next = [{ when: 'loop', to: 'close' }];
    broken.stages[0].goal = ' ';
    expect(flowProblems(broken)).toEqual([
      'AutoReach::VoiceAgent.Flow.incomplete',
      'AutoReach::VoiceAgent.Flow.badTransition',
    ]);
  });

  it('diffs instructions line by line', () => {
    expect(diffLines('a\nb\nc', 'a\nc\nd')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'same', text: 'c' },
      { kind: 'added', text: 'd' },
    ]);
  });

  it('lines two versions up setting by setting', () => {
    const before = agent();
    const after = {
      ...agent(),
      greeting: 'Namaste, I am an AI assistant.',
      type: 'prompt' as const,
    };
    const rows = compareRows(before, after, (code) => code);
    expect(rows.filter((r) => r.changed).map((r) => r.label)).toEqual([
      'AutoReach::VoiceAgent.Type',
      'AutoReach::VoiceAgent.Greeting',
      'AutoReach::VoiceAgent.Flow',
    ]);
    expect(rows.find((r) => r.label === 'AutoReach::VoiceAgent.Tools')?.left).toBe(
      'tickets, transfer',
    );
    expect(rows.find((r) => r.label === 'AutoReach::VoiceAgent.Flow')?.left).toBe(
      '1. Ask → 2. Close',
    );
  });
});
