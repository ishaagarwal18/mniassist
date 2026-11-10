import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { CurrentUserService } from '../services/current-user.service';

/**
 * Route guard for the whole shell.
 *
 * Sign-in is the resource-owner password grant driven by the in-app `/login`
 * screen (the API host issues its own tokens), not an external redirect flow — so
 * the gate is one question: is there a signed-in user? An
 * unauthenticated visitor is sent to `/login` rather than shown the app chrome.
 */
export const appAuthGuard: CanActivateFn = () => {
  if (inject(CurrentUserService).isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login']);
};
