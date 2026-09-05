import type { EntityDto, PagedResultRequestDto } from '@abp/ng.core';

export interface SupportImpersonationGrantDto extends EntityDto<string> {
  tenantId: string;
  tenantName?: string;
  grantedByTenantUserId: string;
  grantedByName?: string;
  grantedToSupportUserId?: string;
  grantedToName?: string;
  reason: string;
  ticketRef?: string;
  grantedAtUtc: string;
  expiresAtUtc: string;
  allowsWrite: boolean;
  revokedAtUtc?: string;
  isActive: boolean;
  sessionCount: number;
  lastUsedAtUtc?: string;
}

export interface CreateSupportGrantDto {
  /** Why support asked. Shown back to the tenant in their own audit view. */
  reason: string;
  /** Capped at seven days server-side regardless of what is requested. */
  durationHours: number;
  /** A named engineer is the tighter grant, and what the UI defaults to. */
  grantedToSupportUserId?: string;
  /** Off by default. "Let me see what you're seeing" should not include changing it. */
  allowsWrite: boolean;
  ticketRef?: string;
}

export interface SupportSessionDto extends EntityDto<string> {
  grantId: string;
  tenantId: string;
  tenantName?: string;
  supportUserId: string;
  supportUserName: string;
  startedAtUtc: string;
  endedAtUtc?: string;
  writeEnabled: boolean;
  actionCount: number;
  writeCount: number;
  isOpen: boolean;
  clientIpAddress?: string;
}

export interface GetSupportSessionsInput extends PagedResultRequestDto {}
