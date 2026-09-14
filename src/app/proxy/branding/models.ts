export interface TenantBrandingDto {
  tenantName?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  hasLogo: boolean;
  logoDataUrl?: string | null;
}

export interface UpdateTenantBrandingInput {
  primaryColor?: string | null;
  accentColor?: string | null;
}

export interface UploadLogoInput {
  file: unknown;
}

export interface PublicTenantBrandingDto {
  primaryColor?: string | null;
  accentColor?: string | null;
  hasLogo: boolean;
  logoDataUrl?: string | null;
}
