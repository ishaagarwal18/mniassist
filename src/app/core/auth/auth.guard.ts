import { CanActivateFn } from '@angular/router';
import { authGuard as abpAuthGuard } from '@abp/ng.core';

import { environment } from '../../../environments/environment';

/**
 * Route guard for the whole shell.
 *
 * In mock mode there is no auth server to talk to, so every route is open — the
 * design is meant to be reviewable without a backend. Once the API is wired
 * (`useMockData: false`) this delegates to ABP's own `authGuard`, which redirects
 * an unauthenticated visitor to the login flow the OAuth provider set up.
 */
export const appAuthGuard: CanActivateFn = (route, state) => {
  if ((environment as unknown as { useMockData?: boolean }).useMockData) {
    return true;
  }
  return abpAuthGuard(route, state);
};
