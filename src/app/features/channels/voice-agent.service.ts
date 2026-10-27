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
  /** 'prompt' (single prompt) or 'flow' (conversation flow). Both run speech to speech. */
  type?: VoiceAgentType;
  flow?: VoiceAgentFlow | null;
}

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
});

export interface VoiceAgentSettings extends VoiceAgentInput {
  publishedVersionId?: string | null;
  draftVersionId?: string | null;
  hasUnpublishedChanges?: boolean;
  usesLegacyConfiguration?: boolean;
  channelId: string;
  hasConfiguration: boolean;
  serverAllowed: boolean;
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
}
