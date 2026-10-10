import type { EntityDto } from '@abp/ng.core';
import type { DecisionRole } from '../contacts/decision-role.enum';
import type { TeamAssignmentStrategy } from './team-assignment-strategy.enum';
import type { InvitationState } from './invitation-state.enum';
import type { OnboardingChecklistStep } from './onboarding-checklist-step.enum';

export interface AcceptInvitationDto {
  token: string;
  userName: string;
  password: string;
  name?: string | null;
  surname?: string | null;
}

export interface AssignmentRuleDto extends EntityDto<string> {
  name?: string;
  priority?: number;
  isEnabled?: boolean;
  channelId?: string | null;
  keywords?: string | null;
  contactRole?: DecisionRole | null;
  attributeKey?: string | null;
  attributeValue?: string | null;
  contactState?: string | null;
  assignToUserId?: string | null;
  assignToUserName?: string | null;
  assignToTeamId?: string | null;
  assignToTeamName?: string | null;
}

export interface ConfirmMobileVerificationDto {
  code: string;
}

export interface CreateInvitationDto {
  email: string;
  roleName: string;
  teamId?: string | null;
  note?: string | null;
  expiryDays?: number;
}

export interface CreateUpdateAssignmentRuleDto {
  name: string;
  priority?: number;
  isEnabled?: boolean;
  channelId?: string | null;
  keywords?: string | null;
  contactRole?: DecisionRole | null;
  attributeKey?: string | null;
  attributeValue?: string | null;
  contactState?: string | null;
  assignToUserId?: string | null;
  assignToTeamId?: string | null;
}

export interface CreateUpdateTeamDto {
  name: string;
  description?: string | null;
  leadUserId?: string | null;
  assignmentStrategy?: TeamAssignmentStrategy;
  memberUserIds?: string[];
  channelIds?: string[];
}

export interface DeactivateMemberDto {
  userId?: string;
  handoverToUserId?: string | null;
  reason?: string | null;
}

export interface DeactivationResultDto {
  userId?: string;
  conversationsHandedOver?: number;
  handedOverTo?: string | null;
  sessionsRevoked?: boolean;
}

export interface InvitationCreatedDto {
  invitation?: InvitationDto;
  acceptUrl?: string;
}

export interface InvitationDto extends EntityDto<string> {
  email?: string;
  roleName?: string;
  teamId?: string | null;
  teamName?: string | null;
  state?: InvitationState;
  expiresAtUtc?: string;
  creationTime?: string;
  acceptedAtUtc?: string | null;
  note?: string | null;
  isExpired?: boolean;
}

export interface OnboardingChecklistDto extends EntityDto<string> {
  items?: OnboardingChecklistItemDto[];
  completedCount?: number;
  totalCount?: number;
  isComplete?: boolean;
  dismissed?: boolean;
  nextStep?: OnboardingChecklistStep | null;
  mobileVerified?: boolean;
  verifiedMobile?: string | null;
}

export interface OnboardingChecklistItemDto {
  step?: OnboardingChecklistStep;
  label?: string;
  description?: string;
  done?: boolean;
  route?: string;
}

export interface RevokeSessionsDto {
  userId?: string;
  reason?: string | null;
}

export interface StartMobileVerificationDto {
  mobile: string;
}

export interface TeamDto extends EntityDto<string> {
  name?: string;
  description?: string | null;
  leadUserId?: string | null;
  leadUserName?: string | null;
  assignmentStrategy?: TeamAssignmentStrategy;
  isActive?: boolean;
  members?: TeamMemberDto[];
  channelIds?: string[];
  openConversationCount?: number;
}

export interface TeamMemberDto {
  userId?: string;
  userName?: string;
  name?: string | null;
  openConversationCount?: number;
}

export interface WorkspaceMemberDto {
  userId?: string;
  userName?: string;
  name?: string | null;
  email?: string;
  isActive?: boolean;
  roles?: string[];
  teamNames?: string[];
  openConversationCount?: number;
  lastSessionRevokedAtUtc?: string | null;
  twoFactorEnabled?: boolean;
}

// --- SSO (SsoController; the schematics did not emit these because the
//     controller sits in the 'app' module, not 'auto-reach'). ---

export interface TenantSsoConfigurationDto {
  isConfigured: boolean;
  isEnabled: boolean;
  displayName?: string | null;
  issuer?: string | null;
  metadataAddress?: string | null;
  authorizationEndpoint?: string | null;
  allowedEmailDomains: string[];
  defaultRoleName: string;
  enforceSso: boolean;
}

export interface SaveSsoConfigurationInput {
  displayName: string;
  issuer: string;
  metadataAddress?: string | null;
  authorizationEndpoint?: string | null;
  allowedEmailDomains: string[];
  defaultRoleName: string;
  enforceSso: boolean;
  enable: boolean;
}

export interface SsoDiscoveryDto {
  ssoAvailable: boolean;
  ssoEnforced: boolean;
  displayName?: string | null;
  authorizationEndpoint?: string | null;
  issuer?: string | null;
}

export interface UserSessionDto {
  sessionId: string;
  device?: string | null;
  deviceInfo?: string | null;
  clientId?: string | null;
  ipAddresses?: string | null;
  signedInUtc?: string;
  lastAccessedUtc?: string | null;
  isCurrent?: boolean;
}

export interface TwoFactorStatusDto {
  isEnabled: boolean;
  recoveryCodesLeft: number;
  hasPassword: boolean;
}

export interface AuthenticatorSetupDto {
  sharedKey: string;
  authenticatorUri: string;
}

export interface VerifyTwoFactorCodeInput {
  code: string;
}

export interface DisableTwoFactorInput {
  password?: string;
  code?: string;
}

export interface RecoveryCodesDto {
  codes: string[];
}

export interface GetSecurityLogsInput {
  skipCount?: number;
  maxResultCount?: number;
  startTime?: string;
  endTime?: string;
  action?: string;
  userName?: string;
  clientIpAddress?: string;
}

export interface SecurityLogDto {
  id: string;
  creationTime: string;
  action?: string | null;
  identity?: string | null;
  userName?: string | null;
  clientIpAddress?: string | null;
  browserInfo?: string | null;
  clientId?: string | null;
}

export interface UpdateSecurityPolicyDto {
  passwordRequiredLength: number;
  passwordRequiredUniqueChars: number;
  passwordRequireDigit: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireUppercase: boolean;
  passwordRequireNonAlphanumeric: boolean;
  forcePeriodicPasswordChange: boolean;
  passwordChangePeriodDays: number;
  lockoutAllowedForNewUsers: boolean;
  lockoutMaxFailedAttempts: number;
  lockoutDurationMinutes: number;
  requireConfirmedEmail: boolean;
}

export interface SecurityPolicyDto extends UpdateSecurityPolicyDto {
  unconfirmedEmailUsers: number;
}

export interface LockUserInput {
  until?: string | null;
}

export interface AdminSetPasswordInput {
  newPassword: string;
  mustChangeOnNextSignIn: boolean;
}

export interface UserSecurityStatusDto {
  userId: string;
  isLockedOut: boolean;
  lockedOutUntil?: string | null;
  failedSignInAttempts: number;
  emailConfirmed: boolean;
  twoFactorEnabled: boolean;
  mustChangePasswordOnNextSignIn: boolean;
  lastPasswordChangeTime?: string | null;
}

export interface LinkAccountInput {
  /** The other account's workspace; empty for the host. */
  workspace?: string | null;
  userNameOrEmail: string;
  password: string;
  /** Needed when the other account uses two-step verification. */
  twoFactorCode?: string | null;
}

export interface LinkedAccountDto {
  userId: string;
  tenantId?: string | null;
  /** Empty for the host. */
  tenantName?: string | null;
  userName: string;
  email?: string | null;
}

export interface CreateDelegationInput {
  targetUserId: string;
  startTime: string;
  endTime: string;
}

export interface DelegationDto {
  id: string;
  /** The other person: the delegate in "my delegations", the delegator in "delegated to me". */
  userId: string;
  userName: string;
  name?: string | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface DelegateCandidateDto {
  userId: string;
  userName: string;
  name?: string | null;
}
