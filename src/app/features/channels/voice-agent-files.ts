import {
  VoiceAgentDefinition,
  VoiceAgentFlow,
  VoiceAgentTools,
  VoiceAnalysisField,
  VOICE_AGENT_TIERS,
  VOICE_AGENT_ENGINES,
  VOICE_SPEECH_NOISE,
  VOICE_SPEECH_PATIENCE,
  VoiceAgentSpeech,
  cleanSpeech,
  defaultVoiceAgentSpeech,
  VOICE_AGENT_VOICES,
  noVoiceAgentAnalysis,
  noVoiceAgentTools,
} from './voice-agent.service';

/** What an exported agent file says it is, so another workspace can tell it from any other JSON. */
export const AGENT_FILE_FORMAT = 'mni-voice-agent';
export const AGENT_FILE_VERSION = 1;

/**
 * The agent without what belongs to this workspace's setup (the acting user, follow-up template and transfer teams): ticked actions
 * stay ticked and need those chosen again where the agent is used.
 */
export function portableAgent(agent: VoiceAgentDefinition): VoiceAgentDefinition {
  const copy: VoiceAgentDefinition = JSON.parse(JSON.stringify(agent));
  copy.tools = {
    ...noVoiceAgentTools(),
    ...copy.tools,
    actingUserId: null,
    followUpTemplateId: null,
    transferTeamIds: [],
    functionIds: [],
    helpdeskConnectionId: null,
    shopConnectionId: null,
  };
  copy.analysis = { ...noVoiceAgentAnalysis(), ...copy.analysis };
  copy.speech = cleanSpeech(copy.speech);
  copy.type = copy.type === 'flow' ? 'flow' : 'prompt';
  if (copy.type !== 'flow') copy.flow = null;
  delete (copy as Partial<{ concurrencyStamp: string }>).concurrencyStamp;
  return copy;
}

export function agentFileText(agent: VoiceAgentDefinition, now = new Date()): string {
  return JSON.stringify(
    {
      format: AGENT_FILE_FORMAT,
      version: AGENT_FILE_VERSION,
      exportedAt: now.toISOString(),
      agent: portableAgent(agent),
    },
    null,
    2,
  );
}

/** A file name from the agent's name: "pump-sales.voice-agent.json". */
export function agentFileName(agent: Pick<VoiceAgentDefinition, 'name'>): string {
  const slug = agent.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'voice-agent'}.voice-agent.json`;
}

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.slice(0, max) : '';

/**
 * Reads an exported agent file. Throws an Error whose message is a localization key when the file isn't one. Everything is bounded
 * and re-typed here; the server still checks it all again when the draft is saved.
 */
export function readAgentFile(raw: string): VoiceAgentDefinition {
  let file: { format?: unknown; agent?: Record<string, unknown> };
  try {
    file = JSON.parse(raw);
  } catch {
    throw new Error('AutoReach::VoiceAgent.File.notJson');
  }
  const agent = file?.agent;
  if (file?.format !== AGENT_FILE_FORMAT || !agent || typeof agent !== 'object') {
    throw new Error('AutoReach::VoiceAgent.File.notAgent');
  }
  const analysis = (agent['analysis'] ?? {}) as Record<string, unknown>;
  const fields = Array.isArray(analysis['fields']) ? analysis['fields'] : [];
  const flow = agent['flow'] as { stages?: unknown } | null | undefined;
  const speech = (agent['speech'] ?? {}) as Record<string, unknown>;
  const speed = speech['speedPercent'];
  const definition: VoiceAgentDefinition = {
    name: text(agent['name'], 100),
    instructions: text(agent['instructions'], 12000),
    greeting: text(agent['greeting'], 1000),
    voice: (VOICE_AGENT_VOICES as readonly string[]).includes(agent['voice'] as string)
      ? (agent['voice'] as string)
      : 'marin',
    tier: (VOICE_AGENT_TIERS as readonly string[]).includes(agent['tier'] as string)
      ? (agent['tier'] as string)
      : '',
    engine: (VOICE_AGENT_ENGINES as readonly string[]).includes(agent['engine'] as string)
      ? (agent['engine'] as string)
      : '',
    language: text(agent['language'], 10) || 'auto',
    maxSeconds: Number.isInteger(agent['maxSeconds']) ? (agent['maxSeconds'] as number) : 120,
    silenceReminderSeconds: Number.isInteger(agent['silenceReminderSeconds'])
      ? (agent['silenceReminderSeconds'] as number)
      : 0,
    endSilenceSeconds: Number.isInteger(agent['endSilenceSeconds'])
      ? (agent['endSilenceSeconds'] as number)
      : 0,
    tools: readTools(agent['tools']),
    analysis: {
      summarize: analysis['summarize'] === true,
      sentiment: analysis['sentiment'] === true,
      goal: text(analysis['goal'], 500) || null,
      fields: fields.slice(0, 20).map((f: Record<string, unknown>) => ({
        key: text(f?.['key'], 40),
        label: text(f?.['label'], 80),
        type: (['text', 'choice', 'boolean', 'number', 'date'].includes(f?.['type'] as string)
          ? f['type']
          : 'text') as VoiceAnalysisField['type'],
        choices: text(f?.['choices'], 500) || null,
        description: text(f?.['description'], 300) || null,
      })),
    },
    voicemailMessage: text(agent['voicemailMessage'], 500) || null,
    speech: cleanSpeech({
      patience: (VOICE_SPEECH_PATIENCE as readonly string[]).includes(speech['patience'] as string)
        ? (speech['patience'] as VoiceAgentSpeech['patience'])
        : 'normal',
      interruptible: speech['interruptible'] !== false,
      speedPercent:
        Number.isInteger(speed) && (speed as number) >= 80 && (speed as number) <= 120
          ? (speed as number)
          : 100,
      noiseReduction: (VOICE_SPEECH_NOISE as readonly string[]).includes(
        speech['noiseReduction'] as string,
      )
        ? (speech['noiseReduction'] as VoiceAgentSpeech['noiseReduction'])
        : '',
      vocabulary: (Array.isArray(speech['vocabulary']) ? speech['vocabulary'] : [])
        .slice(0, 50)
        .map((t: unknown) => text(t, 50)),
      pronunciations: (Array.isArray(speech['pronunciations']) ? speech['pronunciations'] : [])
        .slice(0, 30)
        .map((p: Record<string, unknown>) => ({
          word: text(p?.['word'], 50),
          say: text(p?.['say'], 100),
        })),
    }),
    type: agent['type'] === 'flow' ? 'flow' : 'prompt',
    flow: agent['type'] === 'flow' ? readFlow(flow?.stages) : null,
  };
  if (!definition.name || !definition.instructions || !definition.greeting) {
    throw new Error('AutoReach::VoiceAgent.File.incomplete');
  }
  return definition;
}

/** Only the known switches and numbers, typed as they should be; ids are this workspace's to choose. */
function readTools(raw: unknown): VoiceAgentTools {
  const given = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const tools = noVoiceAgentTools() as unknown as Record<string, unknown>;
  for (const [key, fallback] of Object.entries(tools)) {
    const value = given[key];
    if (typeof fallback === 'boolean' && typeof value === 'boolean') tools[key] = value;
    if (typeof fallback === 'number' && Number.isInteger(value)) tools[key] = value;
  }
  return tools as unknown as VoiceAgentTools;
}

function readFlow(stages: unknown): VoiceAgentFlow {
  const list = Array.isArray(stages) ? stages.slice(0, 12) : [];
  return {
    stages: list.map((s: Record<string, unknown>) => ({
      key: text(s?.['key'], 30),
      name: text(s?.['name'], 60),
      goal: text(s?.['goal'], 800),
      next: (Array.isArray(s?.['next']) ? (s['next'] as Record<string, unknown>[]) : [])
        .slice(0, 4)
        .map((t) => ({ when: text(t?.['when'], 200), to: text(t?.['to'], 30) })),
    })),
  };
}

export function emptyDefinition(): VoiceAgentDefinition {
  return {
    name: '',
    instructions: '',
    greeting: '',
    voice: 'marin',
    language: 'auto',
    maxSeconds: 120,
    silenceReminderSeconds: 0,
    endSilenceSeconds: 0,
    tools: noVoiceAgentTools(),
    analysis: noVoiceAgentAnalysis(),
    speech: defaultVoiceAgentSpeech(),
    type: 'prompt',
    flow: null,
  };
}

/** A stage key from its name, unique among `taken`: "Ask for budget" → "ask_for_budget". */
export function stageKey(name: string, taken: readonly string[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^[^a-z]+/, '')
      .slice(0, 26) || 'stage';
  let key = base === 'end' ? 'end_stage' : base;
  for (let n = 2; taken.includes(key); n++) key = `${base}_${n}`;
  return key;
}

/** The problems that stop a flow being saved, as localization keys (empty when it can be saved). */
export function flowProblems(flow: VoiceAgentFlow | null | undefined): string[] {
  const stages = flow?.stages ?? [];
  if (stages.length === 0) return ['AutoReach::VoiceAgent.Flow.needsStage'];
  const keys = stages.map((s) => s.key);
  const problems = new Set<string>();
  if (stages.length > 12) problems.add('AutoReach::VoiceAgent.Flow.tooMany');
  if (new Set(keys).size !== keys.length) problems.add('AutoReach::VoiceAgent.Flow.duplicate');
  for (const stage of stages) {
    if (!stage.name.trim() || !stage.goal.trim())
      problems.add('AutoReach::VoiceAgent.Flow.incomplete');
    for (const next of stage.next) {
      if (!next.when.trim() || !next.to || next.to === stage.key) {
        problems.add('AutoReach::VoiceAgent.Flow.badTransition');
      } else if (next.to !== 'end' && !keys.includes(next.to)) {
        problems.add('AutoReach::VoiceAgent.Flow.badTransition');
      }
    }
  }
  return [...problems];
}

export interface DiffLine {
  kind: 'same' | 'removed' | 'added';
  text: string;
}

/** A line diff of two texts (longest common subsequence), old lines first where they differ. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  const rows = a.length + 1;
  const cols = b.length + 1;
  const lcs: number[] = new Array(rows * cols).fill(0);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * cols + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * cols + j + 1] + 1
          : Math.max(lcs[(i + 1) * cols + j], lcs[i * cols + j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i++] });
      j++;
    } else if (lcs[(i + 1) * cols + j] >= lcs[i * cols + j + 1]) {
      out.push({ kind: 'removed', text: a[i++] });
    } else {
      out.push({ kind: 'added', text: b[j++] });
    }
  }
  while (i < a.length) out.push({ kind: 'removed', text: a[i++] });
  while (j < b.length) out.push({ kind: 'added', text: b[j++] });
  return out;
}

export interface CompareRow {
  /** Localization key of the setting. */
  label: string;
  left: string;
  right: string;
  changed: boolean;
}

const ACTIONS: [keyof NonNullable<VoiceAgentDefinition['tools']>, string][] = [
  ['bookMeetings', 'book'],
  ['updateCrm', 'crm'],
  ['raiseTickets', 'tickets'],
  ['sendFollowUps', 'followUps'],
  ['searchKnowledge', 'knowledge'],
  ['searchCatalogue', 'catalogue'],
  ['rememberCallers', 'memory'],
  ['transferToPeople', 'transfer'],
  ['lookUpBalance', 'balance'],
  ['lookUpOrders', 'orders'],
  ['lookUpContracts', 'contracts'],
  ['sendPaymentLinks', 'paymentLinks'],
];

/** The settings of two versions side by side, one row each; instructions are compared line by line separately. */
export function compareRows(
  left: VoiceAgentDefinition,
  right: VoiceAgentDefinition,
  actionLabel: (code: string) => string,
): CompareRow[] {
  const actions = (agent: VoiceAgentDefinition) =>
    ACTIONS.filter(([key]) => agent.tools?.[key])
      .map(([, code]) => actionLabel(code))
      .join(', ') || '—';
  const fields = (agent: VoiceAgentDefinition) =>
    (agent.analysis?.fields ?? []).map((f) => `${f.label} (${f.key})`).join(', ') || '—';
  const stages = (agent: VoiceAgentDefinition) =>
    agent.type === 'flow'
      ? (agent.flow?.stages ?? []).map((s, i) => `${i + 1}. ${s.name}`).join(' → ')
      : '—';
  const row = (label: string, read: (agent: VoiceAgentDefinition) => string): CompareRow => {
    const l = read(left);
    const r = read(right);
    return { label: `AutoReach::VoiceAgent.${label}`, left: l, right: r, changed: l !== r };
  };
  return [
    row('Name', (a) => a.name),
    row('Type', (a) => (a.type === 'flow' ? 'flow' : 'prompt')),
    row('Greeting', (a) => a.greeting),
    row('Voice', (a) => a.voice),
    row('Model', (a) => a.tier || 'default'),
    row('Engine', (a) => a.engine || 'speech to speech'),
    row('Language', (a) => a.language),
    row('Duration', (a) => `${a.maxSeconds}s`),
    row(
      'Silence.reminder',
      (a) => `${a.silenceReminderSeconds ?? 0}s / ${a.endSilenceSeconds ?? 0}s`,
    ),
    row('Tools', actions),
    row('Speech', (a) => {
      const s = cleanSpeech(a.speech);
      return `${s.patience}, ${s.interruptible ? 'interruptible' : 'not interruptible'}, ${s.speedPercent}%${s.noiseReduction ? ', ' + s.noiseReduction : ''}`;
    }),
    row('Voicemail', (a) => a.voicemailMessage || '—'),
    row('Speech.vocabulary', (a) => cleanSpeech(a.speech).vocabulary.join(', ') || '—'),
    row(
      'Speech.pronunciations',
      (a) =>
        cleanSpeech(a.speech)
          .pronunciations.map((p) => `${p.word} → ${p.say}`)
          .join(', ') || '—',
    ),
    row('Analysis.goal', (a) => a.analysis?.goal || '—'),
    row('Analysis.fields', fields),
    row('Flow', stages),
  ];
}
