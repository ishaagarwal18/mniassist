import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  AiAssistantService,
  ChatbotOutcome,
  ChatbotReplyDto,
  ChatbotSettingsDto,
  ChatbotStatusDto,
  KnowledgeArticleDto,
  KnowledgeAskResultDto,
  KnowledgeSource,
} from '../../proxy/knowledge/ai-assistant.service';
import { environment } from '../../../environments/environment';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { ChipTone } from '../../ui/chip';

const SEED_SETTINGS: ChatbotSettingsDto = {
  enabled: false,
  minSimilarity: 0.45,
  persona: 'Polite and concise. We are Meridian Automation, an ABB and Siemens channel partner.',
  handoffMessage: "Thanks for your message — I'm passing this to our team, who will reply here shortly.",
  maxRepliesPerConversation: 6,
  answerWhatsApp: true,
  answerInstagram: false,
  answerMessenger: false,
  answerEmail: false,
};

/** The channels the assistant can answer on, in the order the form lists them. */
export const ASSISTANT_CHANNELS = [
  { key: 'answerWhatsApp', label: 'WhatsApp' },
  { key: 'answerInstagram', label: 'Instagram direct messages' },
  { key: 'answerMessenger', label: 'Facebook Messenger' },
  { key: 'answerEmail', label: 'Email replies' },
] as const;

export type AssistantChannelKey = (typeof ASSISTANT_CHANNELS)[number]['key'];

const SEED_STATUS: ChatbotStatusDto = {
  modelConfigured: false,
  modelName: 'claude-sonnet-5',
  embeddingModel: 'hashing-512',
  embeddingIsSemantic: false,
  recommendedMinSimilarity: 0.2,
  articleCount: 2,
  enabledArticleCount: 2,
  indexedChunkCount: 5,
  staleArticleCount: 0,
};

const SEED_ARTICLES: KnowledgeArticleDto[] = [
  {
    id: 'kb-1',
    title: 'Warranty and returns',
    body: 'All drives carry a 24 month warranty from the date of dispatch. Returns are accepted within 7 days if unopened.',
    source: KnowledgeSource.Manual,
    isEnabled: true,
    chunkCount: 1,
    indexedAtUtc: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: 'kb-2',
    title: 'ACS580 datasheet',
    body: 'ACS580 general purpose drive, 0.75 to 250 kW …',
    source: KnowledgeSource.LibraryDocument,
    libraryDocumentId: 'doc-1',
    isEnabled: true,
    chunkCount: 4,
    indexedAtUtc: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

const OUTCOME_TONE: Record<ChatbotOutcome, ChipTone> = {
  [ChatbotOutcome.Answered]: 'good',
  [ChatbotOutcome.HandedOff]: 'warn',
  [ChatbotOutcome.Skipped]: 'neutral',
};

const OUTCOME_LABEL: Record<ChatbotOutcome, string> = {
  [ChatbotOutcome.Answered]: 'Answered',
  [ChatbotOutcome.HandedOff]: 'Handed off',
  [ChatbotOutcome.Skipped]: 'Skipped',
};

/**
 * The autonomous WhatsApp assistant: what it may answer from (the knowledge base), how
 * cautious it is (the similarity threshold and reply cap), and an audit of what it did.
 *
 * Deliberately leads with what is missing — no model key, or keyword-only matching —
 * because an enabled assistant that silently hands off every message looks exactly like
 * a working one until a customer complains.
 */
@Component({
  selector: 'ar-ai-assistant',
  imports: [ArTopbar, ArBanner, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-assistant.html',
  styleUrl: './ai-assistant.scss',
})
export class ArAiAssistant {
  private readonly api = inject(AiAssistantService);

  protected readonly Source = KnowledgeSource;

  protected readonly status = signal<ChatbotStatusDto | null>(null);
  protected readonly articles = signal<KnowledgeArticleDto[]>([]);
  protected readonly recent = signal<ChatbotReplyDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  // ---- settings form ----
  protected readonly enabled = signal(false);
  protected readonly minSimilarity = signal(0.45);
  protected readonly persona = signal('');
  protected readonly handoffMessage = signal('');
  protected readonly maxReplies = signal(6);
  protected readonly channels = ASSISTANT_CHANNELS;
  protected readonly answerOn = signal<Record<AssistantChannelKey, boolean>>({
    answerWhatsApp: true, answerInstagram: false, answerMessenger: false, answerEmail: false,
  });
  protected readonly savingSettings = signal(false);

  // ---- try a question ----
  protected readonly question = signal('');
  protected readonly asking = signal(false);
  protected readonly askResult = signal<KnowledgeAskResultDto | null>(null);

  // ---- articles ----
  protected readonly busy = signal<'sync' | 'reindex' | null>(null);
  protected readonly editing = signal<{ id: string | null } | null>(null);
  protected readonly draftTitle = signal('');
  protected readonly draftBody = signal('');
  protected readonly draftEnabled = signal(true);
  protected readonly savingArticle = signal(false);
  protected readonly articleError = signal<string | null>(null);

  protected readonly subtitle = computed(() => {
    const s = this.status();
    if (!s) return '';
    return `${this.enabled() ? 'On' : 'Off'} · ${s.enabledArticleCount} of ${s.articleCount} articles in use`;
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    if (environment.useMockData) {
      this.applySettings(SEED_SETTINGS);
      this.status.set(SEED_STATUS);
      this.articles.set(SEED_ARTICLES);
      return;
    }
    try {
      const [settings, status, articles, recent] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(this.api.getStatus()),
        firstValueFrom(this.api.getArticles()),
        firstValueFrom(this.api.getRecent(30)),
      ]);
      this.applySettings(settings);
      this.status.set(status);
      this.articles.set(articles);
      this.recent.set(recent);
    } catch (e: unknown) {
      this.error.set(this.messageOf(e, 'Could not load the assistant.'));
    }
  }

  private applySettings(s: ChatbotSettingsDto): void {
    this.enabled.set(s.enabled);
    this.minSimilarity.set(s.minSimilarity);
    this.persona.set(s.persona ?? '');
    this.handoffMessage.set(s.handoffMessage);
    this.maxReplies.set(s.maxRepliesPerConversation);
    this.answerOn.set({
      answerWhatsApp: s.answerWhatsApp ?? true,
      answerInstagram: s.answerInstagram ?? false,
      answerMessenger: s.answerMessenger ?? false,
      answerEmail: s.answerEmail ?? false,
    });
  }

  protected setChannel(key: AssistantChannelKey, on: boolean): void {
    this.answerOn.update((c) => ({ ...c, [key]: on }));
  }

  private async refreshStatus(): Promise<void> {
    if (environment.useMockData) return;
    this.status.set(await firstValueFrom(this.api.getStatus()));
    this.articles.set(await firstValueFrom(this.api.getArticles()));
  }

  protected async saveSettings(): Promise<void> {
    this.savingSettings.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      const input: ChatbotSettingsDto = {
        enabled: this.enabled(),
        minSimilarity: this.minSimilarity(),
        persona: this.persona().trim() || null,
        handoffMessage: this.handoffMessage().trim(),
        maxRepliesPerConversation: this.maxReplies(),
        ...this.answerOn(),
      };
      if (!environment.useMockData) {
        this.applySettings(await firstValueFrom(this.api.updateSettings(input)));
      }
      this.notice.set('Assistant settings saved.');
    } catch (e: unknown) {
      // The API refuses to switch it on with no model behind it — show that, and leave the
      // switch where the server says it is rather than displaying a state that isn't real.
      this.error.set(this.messageOf(e, 'The settings could not be saved.'));
      this.enabled.set(false);
    } finally {
      this.savingSettings.set(false);
    }
  }

  protected async ask(): Promise<void> {
    const q = this.question().trim();
    if (!q) return;
    this.asking.set(true);
    this.error.set(null);
    try {
      this.askResult.set(
        environment.useMockData
          ? {
              wouldAnswer: false,
              topScore: 0.31,
              threshold: this.minSimilarity(),
              handoffReason: 'Mock data — connect to the real API to test retrieval.',
              passages: [],
            }
          : await firstValueFrom(this.api.ask(q)),
      );
    } catch (e: unknown) {
      this.error.set(this.messageOf(e, 'The question could not be tested.'));
    } finally {
      this.asking.set(false);
    }
  }

  protected async syncLibrary(): Promise<void> {
    this.busy.set('sync');
    this.error.set(null);
    this.notice.set(null);
    try {
      if (environment.useMockData) {
        this.notice.set('Mock data — nothing synced.');
        return;
      }
      const r = await firstValueFrom(this.api.syncLibrary());
      this.notice.set(
        `Library synced — ${r.created} added, ${r.updated} updated, ${r.unchanged} unchanged` +
          (r.disabled ? `, ${r.disabled} switched off (no longer Public)` : '') +
          (r.failed ? `, ${r.failed} failed` : '') +
          '. Only Public documents are read into the knowledge base.',
      );
      await this.refreshStatus();
    } catch (e: unknown) {
      this.error.set(this.messageOf(e, 'The Library could not be synced.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async reindex(): Promise<void> {
    this.busy.set('reindex');
    this.error.set(null);
    this.notice.set(null);
    try {
      if (!environment.useMockData) {
        const r = await firstValueFrom(this.api.reindex());
        this.notice.set(`Re-indexed ${r.reindexed} article${r.reindexed === 1 ? '' : 's'}.`);
        await this.refreshStatus();
      }
    } catch (e: unknown) {
      this.error.set(this.messageOf(e, 'Re-indexing failed.'));
    } finally {
      this.busy.set(null);
    }
  }

  // ---- article dialog ----
  protected openArticle(article?: KnowledgeArticleDto): void {
    this.articleError.set(null);
    this.draftTitle.set(article?.title ?? '');
    this.draftBody.set(article?.body ?? '');
    this.draftEnabled.set(article?.isEnabled ?? true);
    this.editing.set({ id: article?.id ?? null });
  }

  protected async saveArticle(): Promise<void> {
    const target = this.editing();
    if (!target) return;
    if (!this.draftTitle().trim() || !this.draftBody().trim()) {
      this.articleError.set('An article needs a title and some text.');
      return;
    }
    this.savingArticle.set(true);
    this.articleError.set(null);
    try {
      const input = {
        title: this.draftTitle().trim(),
        body: this.draftBody().trim(),
        isEnabled: this.draftEnabled(),
      };
      if (!environment.useMockData) {
        await firstValueFrom(
          target.id ? this.api.updateArticle(target.id, input) : this.api.createArticle(input),
        );
        await this.refreshStatus();
      }
      this.editing.set(null);
    } catch (e: unknown) {
      this.articleError.set(this.messageOf(e, 'The article could not be saved.'));
    } finally {
      this.savingArticle.set(false);
    }
  }

  protected async toggleArticle(article: KnowledgeArticleDto): Promise<void> {
    try {
      if (!environment.useMockData) {
        await firstValueFrom(
          this.api.updateArticle(article.id, {
            title: article.title,
            body: article.body,
            isEnabled: !article.isEnabled,
          }),
        );
        await this.refreshStatus();
      }
    } catch (e: unknown) {
      this.error.set(this.messageOf(e, 'The article could not be updated.'));
    }
  }

  protected async removeArticle(article: KnowledgeArticleDto): Promise<void> {
    if (!window.confirm(`Delete "${article.title}"? The assistant will stop answering from it.`)) return;
    try {
      if (!environment.useMockData) {
        await firstValueFrom(this.api.deleteArticle(article.id));
        await this.refreshStatus();
      }
    } catch (e: unknown) {
      this.error.set(this.messageOf(e, 'The article could not be deleted.'));
    }
  }

  // ---- presentation ----
  protected outcomeTone(o: ChatbotOutcome): ChipTone {
    return OUTCOME_TONE[o] ?? 'neutral';
  }

  protected outcomeLabel(o: ChatbotOutcome): string {
    return OUTCOME_LABEL[o] ?? 'Unknown';
  }

  protected score(v: number): string {
    return v.toFixed(2);
  }

  protected when(iso?: string | null): string {
    if (!iso) return 'never';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private messageOf(e: unknown, fallback: string): string {
    const body = (e as { error?: { error?: { message?: string }; message?: string } })?.error;
    return body?.error?.message ?? body?.message ?? (e instanceof Error ? e.message : fallback);
  }
}
