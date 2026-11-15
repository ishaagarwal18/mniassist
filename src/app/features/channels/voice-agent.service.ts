import { RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** An agent's settings on their own: a draft, a template or a file. */
export interface VoiceAgentDefinition {
  name: string;
  instructions: string;
  greeting: string;
  voice: string;
  language: string;
  maxSeconds: number;
  silenceReminderSeconds?: number;
  endSilenceSeconds?: number;
  tools?: VoiceAgentTools;
  analysis?: VoiceAgentAnalysis;
  speech?: VoiceAgentSpeech;
  /** Said when a phone call the agent placed reaches voicemail; blank lets the agent compose a short message. */
  voicemailMessage?: string | null;
  /** 'prompt' (single prompt) or 'flow' (conversation flow). Both run speech to speech. */
  type?: VoiceAgentType;
  flow?: VoiceAgentFlow | null;
  /** '' for the platform's realtime model, or a tier from VOICE_AGENT_TIERS (the server picks the model). */
  tier?: string | null;
  /** '' for speech to speech (OpenAI realtime), or 'pipeline': speech to text, a chat model and text to speech. */
  engine?: string | null;
  /** For the pipeline on phone calls: '' lets the relay choose, or one of VOICE_AGENT_SPEECH_PROVIDERS. */
  speechProvider?: string | null;
}

/** Speech engines: '' is speech to speech; 'pipeline' runs on the call relay's speech providers (Deepgram, ElevenLabs). */
export const VOICE_AGENT_ENGINES = ['', 'pipeline'] as const;

/**
 * Speech providers for the pipeline on phone calls: '' lets the relay choose (Sarvam AI, then Bhashini, then Deepgram with
 * ElevenLabs, whichever is set up there and speaks the agent's language). WhatsApp calls always use Deepgram and ElevenLabs.
 */
export const VOICE_AGENT_SPEECH_PROVIDERS = ['', 'sarvam', 'bhashini', 'deepgram'] as const;

/** OpenAI realtime voices an agent may use (the server and relay check the same list). Marin and Cedar are recommended. */
export const VOICE_AGENT_VOICES = [
  'marin',
  'cedar',
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
] as const;

/** Model tiers: '' is the platform default; economy costs less per minute. Agents never name a model. */
export const VOICE_AGENT_TIERS = ['', 'quality', 'economy'] as const;

export interface VoiceAgentInput extends VoiceAgentDefinition {
  concurrencyStamp: string;
}

export type VoiceAgentType = 'prompt' | 'flow';

/** Where the agent goes from a stage: another stage's key, or 'end' to close the call. */
export interface VoiceFlowTransition {
  when: string;
  to: string;
}

export interface VoiceFlowStage {
  key: string;
  name: string;
  goal: string;
  next: VoiceFlowTransition[];
}

/** The stages of a conversation-flow agent, worked through in order. */
export interface VoiceAgentFlow {
  stages: VoiceFlowStage[];
}

export interface VoiceAgentFinding {
  severity: 'warning' | 'suggestion';
  source: 'check' | 'model';
  /** A fixed check's code, shown in the user's language. */
  code?: string | null;
  text: string;
}

export interface VoiceAgentReview {
  modelReviewed: boolean;
  findings: VoiceAgentFinding[];
}

export interface VoiceAgentTemplateRecord {
  id: string;
  name: string;
  folder: string;
  creationTime: string;
  agent: VoiceAgentDefinition;
}

/** One value pulled out of each call. Choices are separated by |. */
export interface VoiceAnalysisField {
  key: string;
  label: string;
  type: 'text' | 'choice' | 'boolean' | 'number' | 'date';
  choices?: string | null;
  description?: string | null;
}

/** What is worked out after each call. */
export interface VoiceAgentAnalysis {
  summarize: boolean;
  sentiment: boolean;
  goal?: string | null;
  fields: VoiceAnalysisField[];
}

/** How the agent listens and speaks. Noise reduction applies to speech to speech only. */
export interface VoiceAgentSpeech {
  /** How long a pause ends the caller's turn. */
  patience: 'quick' | 'normal' | 'patient';
  /** The caller can talk over the agent, which stops and listens. */
  interruptible: boolean;
  /** Speaking speed, 80 to 120. */
  speedPercent: number;
  noiseReduction: '' | 'near_field' | 'far_field';
  /** Names and terms callers say, one per entry, so they are recognised. */
  vocabulary: string[];
  pronunciations: VoicePronunciation[];
}

export interface VoicePronunciation {
  word: string;
  say: string;
}

export const VOICE_SPEECH_PATIENCE = ['quick', 'normal', 'patient'] as const;
export const VOICE_SPEECH_NOISE = ['', 'near_field', 'far_field'] as const;

export const defaultVoiceAgentSpeech = (): VoiceAgentSpeech => ({
  patience: 'normal',
  interruptible: true,
  speedPercent: 100,
  noiseReduction: '',
  vocabulary: [],
  pronunciations: [],
});

/** What is saved: trimmed text, blank lines and empty rows dropped. */
export function cleanSpeech(speech: VoiceAgentSpeech | undefined): VoiceAgentSpeech {
  const s = { ...defaultVoiceAgentSpeech(), ...speech };
  return {
    ...s,
    vocabulary: s.vocabulary.map((t) => t.trim()).filter((t) => t),
    pronunciations: s.pronunciations
      .map((p) => ({ word: p.word.trim(), say: p.say.trim() }))
      .filter((p) => p.word || p.say),
  };
}

export const noVoiceAgentAnalysis = (): VoiceAgentAnalysis => ({
  summarize: false,
  sentiment: false,
  goal: null,
  fields: [],
});

/** Actions the agent may take during calls, all run as the acting user. */
export interface VoiceAgentTools {
  actingUserId?: string | null;
  bookMeetings: boolean;
  meetingMinutes: number;
  workStartMinute: number;
  workEndMinute: number;
  updateCrm: boolean;
  raiseTickets: boolean;
  sendFollowUps: boolean;
  followUpTemplateId?: string | null;
  searchKnowledge: boolean;
  searchCatalogue: boolean;
  rememberCallers: boolean;
  /** Let the agent hand the call to a person, ringing one of these teams (the first is the default). */
  transferToPeople: boolean;
  transferTeamIds: string[];
  /** The workspace's custom functions the agent may call (up to 10). */
  functionIds: string[];
  /** The caller's own account: outstanding invoices and balance, orders and shipments, service contracts. */
  lookUpBalance: boolean;
  lookUpOrders: boolean;
  lookUpContracts: boolean;
  /** Look up an alarm code the caller reads out, in the approved fault-code library. */
  lookUpFaultCodes?: boolean;
  /** Send a WhatsApp payment reminder with its pay link, after the caller confirms (a write: needs the acting user). */
  sendPaymentLinks: boolean;
  /** A Freshdesk or Zendesk connection: look up and raise the caller's tickets there. */
  helpdeskConnectionId?: string | null;
  /** A Shopify connection: look up the caller's orders there. */
  shopConnectionId?: string | null;
}

export const noVoiceAgentTools = (): VoiceAgentTools => ({
  actingUserId: null,
  bookMeetings: false,
  meetingMinutes: 30,
  workStartMinute: 540,
  workEndMinute: 1080,
  updateCrm: false,
  raiseTickets: false,
  sendFollowUps: false,
  followUpTemplateId: null,
  searchKnowledge: false,
  searchCatalogue: false,
  rememberCallers: false,
  transferToPeople: false,
  transferTeamIds: [],
  functionIds: [],
  lookUpBalance: false,
  lookUpOrders: false,
  lookUpContracts: false,
  lookUpFaultCodes: false,
  sendPaymentLinks: false,
  helpdeskConnectionId: null,
  shopConnectionId: null,
});

export interface VoiceAgentSettings extends VoiceAgentInput {
  publishedVersionId?: string | null;
  draftVersionId?: string | null;
  hasUnpublishedChanges?: boolean;
  usesLegacyConfiguration?: boolean;
  /** The number's id, or the shared agent's when isShared. */
  channelId: string;
  hasConfiguration: boolean;
  serverAllowed: boolean;
  /** These are a shared agent's settings; numbers answer with it. */
  isShared?: boolean;
  numbers?: VoiceAgentNumber[];
  /** For a number: the shared agent answering its calls instead, when it is assigned to one. */
  sharedAgentId?: string | null;
  sharedAgentName?: string | null;
  /** The speech engines the call relay can run now ('realtime', 'pipeline'). */
  engines?: string[];
  /** The engines a phone call can run on the relay now. */
  phoneEngines?: string[];
  /** The speech providers set up on the relay for phone calls ('sarvam', 'bhashini', 'deepgram'). */
  speechProviders?: string[];
  /** Speech providers WhatsApp calls can use on the relay now. */
  whatsAppSpeechProviders?: string[];
}

export interface VoiceAgentNumber {
  channelId: string;
  name: string;
  phoneNumber: string;
  assignedAtUtc?: string | null;
}

export interface VoiceAgentVersion {
  id: string;
  savedAtUtc: string | null;
  savedBy: string | null;
  restoredFrom: string | null;
  profile: VoiceAgentDefinition;
}

@Injectable({ providedIn: 'root' })
export class VoiceAgentService {
  private readonly rest = inject(RestService);
  get(id: string) {
    return this.rest.request<never, VoiceAgentSettings>(
      { method: 'GET', url: `/api/auto-reach/voice-agent/${id}` },
      { apiName: 'AutoReach' },
    );
  }
  versions(id: string) {
    return this.rest.request<never, VoiceAgentVersion[]>(
      { method: 'GET', url: `/api/auto-reach/voice-agent/${id}/versions` },
      { apiName: 'AutoReach' },
    );
  }
  restore(id: string, versionId: string, concurrencyStamp: string) {
    return this.rest.request<{ versionId: string; concurrencyStamp: string }, VoiceAgentSettings>(
      {
        method: 'POST',
        url: `/api/auto-reach/voice-agent/${id}/restore`,
        body: { versionId, concurrencyStamp },
      },
      { apiName: 'AutoReach' },
    );
  }
  update(id: string, model: VoiceAgentInput) {
    const {
      name,
      instructions,
      greeting,
      voice,
      language,
      maxSeconds,
      concurrencyStamp,
      silenceReminderSeconds,
      endSilenceSeconds,
      tools,
      analysis,
      type,
      flow,
      tier,
      engine,
      speechProvider,
      speech,
      voicemailMessage,
    } = model;
    return this.rest.request<VoiceAgentInput, VoiceAgentSettings>(
      {
        method: 'PUT',
        url: `/api/auto-reach/voice-agent/${id}`,
        body: {
          name,
          instructions,
          greeting,
          voice,
          language,
          maxSeconds,
          concurrencyStamp,
          silenceReminderSeconds: silenceReminderSeconds ?? 0,
          endSilenceSeconds: endSilenceSeconds ?? 0,
          tools: tools ?? noVoiceAgentTools(),
          analysis: analysis ?? noVoiceAgentAnalysis(),
          type: type ?? 'prompt',
          flow: type === 'flow' ? flow : null,
          tier: tier ?? '',
          engine: engine ?? '',
          // Only the pipeline uses it; a speech-to-speech agent keeps none, so switching back leaves nothing stale.
          speechProvider: engine === 'pipeline' ? (speechProvider ?? '') : '',
          speech: cleanSpeech(speech),
          voicemailMessage: voicemailMessage?.trim() || null,
        },
      },
      { apiName: 'AutoReach' },
    );
  }
  publish(id: string, versionId: string, concurrencyStamp: string) {
    return this.rest.request<{ versionId: string; concurrencyStamp: string }, VoiceAgentSettings>(
      {
        method: 'POST',
        url: `/api/auto-reach/voice-agent/${id}/publish`,
        body: { versionId, concurrencyStamp },
      },
      { apiName: 'AutoReach' },
    );
  }
  /** Drafts an agent from a description with the workspace's analysis model. Saves nothing. */
  draft(description: string, type: VoiceAgentType, language: string) {
    return this.rest.request<unknown, VoiceAgentDefinition>(
      {
        method: 'POST',
        url: '/api/auto-reach/voice-agent/draft',
        body: { description, type, language },
      },
      { apiName: 'AutoReach' },
    );
  }
  /** Fixed checks, plus the analysis model's review when one is set up. */
  review(agent: VoiceAgentDefinition) {
    return this.rest.request<VoiceAgentDefinition, VoiceAgentReview>(
      { method: 'POST', url: '/api/auto-reach/voice-agent/review', body: agent },
      { apiName: 'AutoReach' },
    );
  }
  templates() {
    return this.rest.request<never, VoiceAgentTemplateRecord[]>(
      { method: 'GET', url: '/api/auto-reach/voice-agent-template' },
      { apiName: 'AutoReach' },
    );
  }
  /** Replaces a template with the same folder and name. */
  saveTemplate(name: string, folder: string, agent: VoiceAgentDefinition) {
    return this.rest.request<unknown, VoiceAgentTemplateRecord>(
      {
        method: 'POST',
        url: '/api/auto-reach/voice-agent-template/save',
        body: { name, folder, agent },
      },
      { apiName: 'AutoReach' },
    );
  }
  deleteTemplate(id: string) {
    return this.rest.request<never, void>(
      { method: 'DELETE', url: `/api/auto-reach/voice-agent-template/${id}` },
      { apiName: 'AutoReach' },
    );
  }
  /** An MP3 of the voice saying the text, from the server's OpenAI key. */
  previewVoice(voice: string, text: string) {
    return this.rest.request<unknown, Blob>(
      {
        method: 'POST',
        url: '/api/auto-reach/voice-agent/preview-voice',
        responseType: 'blob',
        headers: { Accept: 'audio/mpeg' },
        body: { voice, text },
      },
      { apiName: 'AutoReach' },
    );
  }
}
