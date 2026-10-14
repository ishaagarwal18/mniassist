/** Host status comes from server identities, never from a missing display name. */
export interface HostAccessConfiguration {
  currentUser?: {
    isAuthenticated?: boolean;
    tenantId?: string | null;
    roles?: readonly string[];
  } | null;
  currentTenant?: { id?: string | null; isAvailable?: boolean } | null;
}

export function isHostContext(config: HostAccessConfiguration | null | undefined): boolean {
  return Boolean(
    config?.currentUser?.isAuthenticated &&
      !config.currentUser.tenantId &&
      !config.currentTenant?.id &&
      !config.currentTenant?.isAvailable,
  );
}

/** ABP's built-in admin role is the platform administrator only in host context. */
export function isHostAdministrator(config: HostAccessConfiguration | null | undefined): boolean {
  return isHostContext(config) &&
    Boolean(config?.currentUser?.roles?.some((role) => role.toLowerCase() === 'admin'));
}
