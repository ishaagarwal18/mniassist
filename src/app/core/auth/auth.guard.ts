import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { authGuard as abpAuthGuard } from '@abp/ng.core';

import { environment } from '../../../environments/environment';
import { CurrentUserService } from '../services/current-user.service';

/**
 * Route guard for the whole shell.
 *
 * In mock mode there is no auth server, so "signed in" is a local flag the login
 * screen flips — an unauthenticated visitor is sent to `/login` rather than shown
 * the app chrome. Once the API is wired (`useMockData: false`) this delegates to
 * ABP's own `authGuard`, which redirects to the OAuth provider's login.
 */
export const appAuthGuard: CanActivateFn = (route, state) => {
  if ((environment as unknown as { useMockData?: boolean }).useMockData) {
    if (inject(CurrentUserService).isAuthenticated()) {
      return true;
    }
    return inject(Router).createUrlTree(['/login']);
  }
  return abpAuthGuard(route, state);
};
