import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChannelState } from '../../proxy/channels/channel-state.enum';
import {
  CreateIvrPromptInput,
  IvrBranchAction,
  IvrPromptDto,
  SetIvrBranchInput,
  UpdateIvrPromptInput,
  VoiceChannelDto,
  VoiceChannelService as VoiceApi,
  VoiceNumberSeries,
} from '../../proxy/voice';
import { readApiError } from '../util/api-error';

/**
 * IVR prompt store for the channel's own admin screen (M11's follow-up: a real
 * management UI over the App Service layer `VoiceChannelAppService` already
 * exposed). `useMockData` seeds one small three-prompt tree — main menu branching
 * to sales/support, support transferring to an agent — so the screen is reviewable
 * without a database, same convention as `ChannelService`/`TemplateService`.
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly api = inject(VoiceApi);

  private readonly mockChannel: VoiceChannelDto = {
    id: 'voice-mock-1',
    exoPhone: '07966000000',
    accountSid: 'exotel-mock-sid',
    subdomain: 'api.in.exotel.com',
    numberSeries: VoiceNumberSeries.Transactional,
    state: ChannelState.Active,
    restrictionReason: null,
    passthruWebhookUrl: 'https://api.autoreach.example/api/voice/webhook/****/passthru',
  };

  private readonly mockSales = 'prompt-sales';
  private readonly mockSupport = 'prompt-support';
  private readonly mockPrompts = signal<IvrPromptDto[]>([
    {
      id: 'prompt-main',
      name: 'Main menu',
      sayText: 'Thanks for calling Vertex Automation. Press 1 for sales, 2 for support.',
      isEntryPoint: true,
      maxDigits: 1,
      inputTimeoutSeconds: 5,
      branches: [
        { digit: '1', action: IvrBranchAction.GoToPrompt, nextPromptId: 'prompt-sales' },
        { digit: '2', action: IvrBranchAction.GoToPrompt, nextPromptId: 'prompt-support' },
      ],
      creationTime: new Date().toISOString(),
    },
    {
      id: 'prompt-sales',
      name: 'Sales',
      sayText: 'Connecting you to our sales team.',
      isEntryPoint: false,
      maxDigits: 1,
      inputTimeoutSeconds: 5,
      branches: [
        { digit: '*', action: IvrBranchAction.TransferToAgent, transferToNumber: '919000000001' },
      ],
      creationTime: new Date().toISOString(),
    },
    {
      id: 'prompt-support',
      name: 'Support',
      sayText: 'Connecting you to our support desk.',
      isEntryPoint: false,
      maxDigits: 1,
      inputTimeoutSeconds: 5,
      branches: [
        { digit: '*', action: IvrBranchAction.TransferToAgent, transferToNumber: '919000000002' },
      ],
      creationTime: new Date().toISOString(),
    },
  ]);

  private readonly channelResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.api.getOrCreate(),
  });

  private readonly promptsResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.api.getPrompts(),
    defaultValue: [] as IvrPromptDto[],
  });

  readonly channel = computed<VoiceChannelDto | undefined>(() =>
    environment.useMockData ? this.mockChannel : this.channelResource.value(),
  );

  readonly prompts = computed<readonly IvrPromptDto[]>(() =>
    environment.useMockData ? this.mockPrompts() : this.promptsResource.value(),
  );

  readonly loading = computed(
    () =>
      !environment.useMockData &&
      (this.channelResource.isLoading() || this.promptsResource.isLoading()),
  );

  readonly entryPoint = computed(() => this.prompts().find((p) => p.isEntryPoint));

  private readonly _error = signal<string | null>(null);
  readonly error = computed(() => this._error());

  reload(): void {
    this.promptsResource.reload();
  }

  async createPrompt(input: CreateIvrPromptInput): Promise<boolean> {
    this._error.set(null);
    if (environment.useMockData) {
      const id = `prompt-${Math.random().toString(36).slice(2, 8)}`;
      this.mockPrompts.update((list) => [
        ...(input.isEntryPoint ? list.map((p) => ({ ...p, isEntryPoint: false })) : list),
        {
          id,
          name: input.name,
          sayText: input.sayText,
          isEntryPoint: !!input.isEntryPoint,
          maxDigits: input.maxDigits ?? 1,
          inputTimeoutSeconds: input.inputTimeoutSeconds ?? 5,
          branches: [],
          creationTime: new Date().toISOString(),
        },
      ]);
      return true;
    }

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
    if (environment.useMockData) {
      this.mockPrompts.update((list) =>
        list.map((p) => (p.id === promptId ? { ...p, ...input } : p)),
      );
      return true;
    }

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
    if (environment.useMockData) {
      this.mockPrompts.update((list) =>
        list.map((p) => ({ ...p, isEntryPoint: p.id === promptId })),
      );
      return true;
    }

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
    if (environment.useMockData) {
      this.mockPrompts.update((list) => list.filter((p) => p.id !== promptId));
      return true;
    }

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
    if (environment.useMockData) {
      this.mockPrompts.update((list) =>
        list.map((p) =>
          p.id === promptId
            ? { ...p, branches: [...p.branches.filter((b) => b.digit !== input.digit), input] }
            : p,
        ),
      );
      return true;
    }

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
    if (environment.useMockData) {
      this.mockPrompts.update((list) =>
        list.map((p) =>
          p.id === promptId ? { ...p, branches: p.branches.filter((b) => b.digit !== digit) } : p,
        ),
      );
      return true;
    }

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
