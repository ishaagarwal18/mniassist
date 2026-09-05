// Hand-written to match Mni.AutoReach.Identity SSO contracts (ISsoAppService).

export interface TenantSsoConfigurationDto {
  isConfigured: boolean;
  isEnabled: boolean;
  displayName?: string;
  issuer?: string;
  metadataAddress?: string;
  authorizationEndpoint?: string;
  allowedEmailDomains: string[];
  defaultRoleName: string;
  enforceSso: boolean;
}

export interface SaveSsoConfigurationInput {
  displayName: string;
  issuer: string;
  metadataAddress?: string;
  authorizationEndpoint?: string;
  allowedEmailDomains: string[];
  defaultRoleName: string;
  enforceSso: boolean;
  enable: boolean;
}

export interface SsoDiscoveryDto {
  ssoAvailable: boolean;
  ssoEnforced: boolean;
  displayName?: string;
  authorizationEndpoint?: string;
  issuer?: string;
}
