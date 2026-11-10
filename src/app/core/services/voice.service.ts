import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import {
  CreateIvrPromptInput,
  IvrIssueDto,
  IvrPromptDto,
  IvrSimulationStepDto,
  SetIvrBranchInput,
  SetSoftphoneInput,
  SetVoiceAccountInput,
  SimulateIvrInput,
  UpdateIvrPromptInput,
  VoiceChannelDto,
  VoiceChannelService as VoiceApi,
} from '../../proxy/voice';
import { readApiError } from '../util/api-error';
import { settled } from '../util/resource';

/**
 * IVR prompt store for the channel's own admin screen (M11's follow-up: a real
 * management UI over the App Service layer `VoiceChannelAppService` already
 * exposed).
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly api = inject(VoiceApi);

  private readonly channelResource = rxResource({
    params: () => ({}),
    stream: () => this.api.getOrCreate(),
  });

  private readonly promptsResource = rxResource({
    params: () => ({}),
    stream: () => this.api.getPrompts(),
    defaultValue: [] as IvrPromptDto[],
  });

  private readonly issuesResource = rxResource({
    params: () => ({}),
    stream: () => this.api.getIvrIssues(),
    defaultValue: [] as IvrIssueDto[],
  });

  /** What would go wrong for a caller in the current menu — from the same rules a live call runs. */
  readonly issues = computed<readonly IvrIssueDto[]>(() =>
    settled(this.issuesResource, [] as IvrIssueDto[]),
  );

  readonly channel = computed<VoiceChannelDto | undefined>(() =>
    settled(this.channelResource, undefined),
  );

  readonly prompts = computed<readonly IvrPromptDto[]>(() =>
    settled(this.promptsResource, [] as IvrPromptDto[]),
  );

  readonly loading = computed(
    () => this.channelResource.isLoading() || this.promptsResource.isLoading(),
  );

  readonly entryPoint = computed(() => this.prompts().find((p) => p.isEntryPoint));

  private readonly _error = signal<string | null>(null);
  readonly error = computed(() => this._error());

  reload(): void {
    this.promptsResource.reload();
    this.issuesResource.reload();
  }

  async setAccount(input: SetVoiceAccountInput): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.setAccount(input));
      this.channelResource.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the Exotel account.'));
      return false;
    }
  }

  /** Records the Exotel call-flow URL of the one-time skeleton flow. Blank clears it. */
  async setFlowUrl(flowUrl: string): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.setFlowUrl({ flowUrl: flowUrl.trim() || null }));
      this.channelResource.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the flow URL.'));
      return false;
    }
  }

  /** Records the AI call flow's URL (Voicebot applet, then Hangup). Blank clears it, which stops AI calls on the line. */
  async setAiFlowUrl(flowUrl: string): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.setAiFlowUrl({ flowUrl: flowUrl.trim() || null }));
      this.channelResource.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the AI call flow URL.'));
      return false;
    }
  }

  /** Chooses the agent (a WhatsApp number's) that answers incoming calls reaching the AI call flow; null for nobody. */
  async setInboundAiAgent(agentChannelId: string | null): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.setInboundAiAgent({ agentChannelId }));
      this.channelResource.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the agent for incoming calls.'));
      return false;
    }
  }

  /** Turns the in-browser phone on or off and records the SIP identity reps' browsers register with. */
  async setSoftphone(input: SetSoftphoneInput): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.setSoftphone(input));
      this.channelResource.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the in-browser phone settings.'));
      return false;
    }
  }

  /** Walks the saved menu with these key presses exactly as a live call would — the server runs the real rules. */
  async simulate(input: SimulateIvrInput): Promise<IvrSimulationStepDto[] | null> {
    this._error.set(null);

    try {
      return await firstValueFrom(this.api.simulateIvr(input));
    } catch (e) {
      this._error.set(readApiError(e, 'Could not run the simulation.'));
      return null;
    }
  }

  async createPrompt(input: CreateIvrPromptInput): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.createPrompt(input));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not create the prompt.'));
      return false;
    }
  }

  async updatePrompt(promptId: string, input: UpdateIvrPromptInput): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.updatePrompt(promptId, input));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not update the prompt.'));
      return false;
    }
  }

  async setEntryPoint(promptId: string): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.setEntryPoint(promptId));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not set the entry point.'));
      return false;
    }
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.deletePrompt(promptId));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not delete the prompt.'));
      return false;
    }
  }

  async setBranch(promptId: string, input: SetIvrBranchInput): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.setBranch(promptId, input));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not save the branch.'));
      return false;
    }
  }

  async removeBranch(promptId: string, digit: string): Promise<boolean> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.removeBranch(promptId, digit));
      this.reload();
      return true;
    } catch (e) {
      this._error.set(readApiError(e, 'Could not remove the branch.'));
      return false;
    }
  }
}
