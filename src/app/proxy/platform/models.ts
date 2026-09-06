import type { EntityDto } from '@abp/ng.core';

export interface CreateSupportGrantDto {
  reason: string;
  durationHours?: number;
  grantedToSupportUserId?: string | null;
  allowsWrite?: boolean;
  ticketRef?: string | null;
}

export interface StartSupportSessionDto {
  tenantId?: string;
  needsWrite?: boolean;
}

export interface SupportImpersonationGrantDto extends EntityDto<string> {
  tenantId?: string;
  tenantName?: string | null;
  grantedByTenantUserId?: string;
  grantedByName?: string | null;
  grantedToSupportUserId?: string | null;
  grantedToName?: string | null;
  reason?: string;
  ticketRef?: string | null;
  grantedAtUtc?: string;
  expiresAtUtc?: string;
  allowsWrite?: boolean;
  revokedAtUtc?: string | null;
  isActive?: boolean;
  sessionCount?: number;
  lastUsedAtUtc?: string | null;
}

export interface SupportSessionDto extends EntityDto<string> {
  grantId?: string;
  tenantId?: string;
  tenantName?: string | null;
  supportUserId?: string;
  supportUserName?: string;
  startedAtUtc?: string;
  endedAtUtc?: string | null;
  writeEnabled?: boolean;
  actionCount?: number;
  writeCount?: number;
  isOpen?: boolean;
  clientIpAddress?: string | null;
}
