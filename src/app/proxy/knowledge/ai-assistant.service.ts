import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum KnowledgeSource {
  Manual = 0,
  LibraryDocument = 1,
}

export enum ChatbotOutcome {
  Answered = 0,
  HandedOff = 1,
  Skipped = 2,
}

export interface KnowledgeArticleDto {
  id: string;
  title: string;
  body: string;
  source: KnowledgeSource;
  libraryDocumentId?: string | null;
  isEnabled: boolean;
  chunkCount: number;
  indexedAtUtc?: string | null;
  lastIndexError?: string | null;
}

export interface SaveKnowledgeArticleDto {
  title: string;
  body: string;
  isEnabled: boolean;
}

export interface KnowledgeLibrarySyncResultDto {
  created: number;
  updated: number;
  unchanged: number;
  disabled: number;
  failed: number;
}

export interface KnowledgePassageDto {
  articleId: string;
  articleTitle: string;
  text: string;
  score: number;
}

export interface KnowledgeAskResultDto {
  wouldAnswer: boolean;
  topScore: number;
  threshold: number;
  answer?: string | null;
  handoffReason?: string | null;
  passages: KnowledgePassageDto[];
}

export interface ChatbotSettingsDto {
  enabled: boolean;
  minSimilarity: number;
  persona?: string | null;
  handoffMessage: string;
  maxRepliesPerConversation: number;
  /** Channels it answers on. SMS is never offered: replies there must be DLT-registered templates. */
  answerWhatsApp: boolean;
  answerInstagram: boolean;
  answerMessenger: boolean;
  answerEmail: boolean;
}

export interface ChatbotStatusDto {
  modelConfigured: boolean;
  modelName: string;
  embeddingModel: string;
  embeddingIsSemantic: boolean;
  recommendedMinSimilarity: number;
  articleCount: number;
  enabledArticleCount: number;
  indexedChunkCount: number;
  staleArticleCount: number;
}

export interface ChatbotReplyDto {
  id: string;
  conversationId: string;
  outcome: ChatbotOutcome;
  topScore: number;
  reason?: string | null;
  question?: string | null;
  answer?: string | null;
  createdAtUtc: string;
}

/**
 * The knowledge base and the autonomous assistant. Hand-written against the explicit
 * KnowledgeController / ChatbotController routes — neither is an ABP conventional
 * service, so there is nothing for `abp generate-proxy` to read.
 */
@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  private req = <T>(
    method: string,
    url: string,
    body?: unknown,
    params?: Record<string, unknown>,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, T>(
      { method, headers: { Accept: 'application/json' }, url, body, params },
      { apiName: this.apiName, ...config },
    );

  getArticles = () => this.req<KnowledgeArticleDto[]>('GET', '/api/auto-reach/knowledge/articles');
  createArticle = (input: SaveKnowledgeArticleDto) =>
    this.req<KnowledgeArticleDto>('POST', '/api/auto-reach/knowledge/articles', input);
  updateArticle = (id: string, input: SaveKnowledgeArticleDto) =>
    this.req<KnowledgeArticleDto>('PUT', `/api/auto-reach/knowledge/articles/${id}`, input);
  deleteArticle = (id: string) =>
    this.req<void>('DELETE', `/api/auto-reach/knowledge/articles/${id}`);
  syncLibrary = () =>
    this.req<KnowledgeLibrarySyncResultDto>('POST', '/api/auto-reach/knowledge/sync-library');
  reindex = () => this.req<{ reindexed: number }>('POST', '/api/auto-reach/knowledge/reindex');
  ask = (question: string) =>
    this.req<KnowledgeAskResultDto>('POST', '/api/auto-reach/knowledge/ask', { question });

  getSettings = () => this.req<ChatbotSettingsDto>('GET', '/api/auto-reach/chatbot/settings');
  updateSettings = (input: ChatbotSettingsDto) =>
    this.req<ChatbotSettingsDto>('PUT', '/api/auto-reach/chatbot/settings', input);
  getStatus = () => this.req<ChatbotStatusDto>('GET', '/api/auto-reach/chatbot/status');
  getRecent = (take = 30) =>
    this.req<ChatbotReplyDto[]>('GET', '/api/auto-reach/chatbot/recent', undefined, { take });
}
