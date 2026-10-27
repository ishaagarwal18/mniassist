import { RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface VoiceAgentInput {
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
  concurrencyStamp: string;
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
  profile: VoiceAgentInput;
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
}
