import { RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { VoiceAgentNumber, VoiceAgentType } from './voice-agent.service';

export interface SharedVoiceAgent {
  id: string;
  name: string;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  type: VoiceAgentType;
  numbers: VoiceAgentNumber[];
  creationTime: string;
}

export interface VoiceAgentAssignment {
  channelId: string;
  channelName: string;
  phoneNumber: string;
  assignedAtUtc: string;
  assignedBy?: string | null;
  endedAtUtc?: string | null;
  endedBy?: string | null;
}

export interface VoiceAgentChannel {
  channelId: string;
  name: string;
  phoneNumber: string;
  agentId?: string | null;
  agentName?: string | null;
  hasOwnAgent: boolean;
}

/** Voice agents of the workspace and the numbers they answer on. Their settings go through VoiceAgentService with the agent's id. */
@Injectable({ providedIn: 'root' })
export class SharedVoiceAgentService {
  private readonly rest = inject(RestService);
  private readonly url = '/api/auto-reach/shared-voice-agent';

  list() {
    return this.rest.request<never, SharedVoiceAgent[]>(
      { method: 'GET', url: this.url },
      { apiName: 'AutoReach' },
    );
  }
  create(name: string, copyFromChannelId: string | null) {
    return this.rest.request<unknown, SharedVoiceAgent>(
      { method: 'POST', url: this.url, body: { name, copyFromChannelId } },
      { apiName: 'AutoReach' },
    );
  }
  delete(id: string) {
    return this.rest.request<never, void>(
      { method: 'DELETE', url: `${this.url}/${id}` },
      { apiName: 'AutoReach' },
    );
  }
  assign(id: string, channelId: string) {
    return this.rest.request<unknown, SharedVoiceAgent>(
      { method: 'POST', url: `${this.url}/${id}/assign`, body: { channelId } },
      { apiName: 'AutoReach' },
    );
  }
  unassign(channelId: string) {
    return this.rest.request<unknown, void>(
      { method: 'POST', url: `${this.url}/unassign`, body: { channelId } },
      { apiName: 'AutoReach' },
    );
  }
  assignments(id: string) {
    return this.rest.request<never, VoiceAgentAssignment[]>(
      { method: 'GET', url: `${this.url}/${id}/assignments` },
      { apiName: 'AutoReach' },
    );
  }
  channels() {
    return this.rest.request<never, VoiceAgentChannel[]>(
      { method: 'GET', url: `${this.url}/channels` },
      { apiName: 'AutoReach' },
    );
  }
}
