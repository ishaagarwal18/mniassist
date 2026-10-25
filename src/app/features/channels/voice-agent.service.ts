import { RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface VoiceAgentInput {
  name: string;
  instructions: string;
  greeting: string;
  voice: string;
  language: string;
  maxSeconds: number;
  concurrencyStamp: string;
}

export interface VoiceAgentSettings extends VoiceAgentInput {
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
    return this.rest.request<never, VoiceAgentSettings>({ method: 'GET', url: `/api/auto-reach/voice-agent/${id}` }, { apiName: 'AutoReach' });
  }
  versions(id: string) {
    return this.rest.request<never, VoiceAgentVersion[]>({ method: 'GET', url: `/api/auto-reach/voice-agent/${id}/versions` }, { apiName: 'AutoReach' });
  }
  restore(id: string, versionId: string, concurrencyStamp: string) {
    return this.rest.request<{ versionId: string; concurrencyStamp: string }, VoiceAgentSettings>({ method: 'POST', url: `/api/auto-reach/voice-agent/${id}/restore`,
      body: { versionId, concurrencyStamp } }, { apiName: 'AutoReach' });
  }
  update(id: string, model: VoiceAgentInput) {
    const { name, instructions, greeting, voice, language, maxSeconds, concurrencyStamp } = model;
    return this.rest.request<VoiceAgentInput, VoiceAgentSettings>({ method: 'PUT', url: `/api/auto-reach/voice-agent/${id}`,
      body: { name, instructions, greeting, voice, language, maxSeconds, concurrencyStamp } }, { apiName: 'AutoReach' });
  }
}
