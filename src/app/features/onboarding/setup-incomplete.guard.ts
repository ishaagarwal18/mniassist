import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { OnboardingStore } from '../../core/services/onboarding.store';

/**
 * Get started is for setting up: once every step of the checklist is done it leaves the menu, and its address goes to Home
 * instead. If the checklist can't be read, the page opens as before.
 */
export const setupIncompleteGuard: CanActivateFn = async () => {
  const router = inject(Router);
  try {
    const checklist = await inject(OnboardingStore).current();
    return checklist.isComplete ? router.parseUrl('/home') : true;
  } catch {
    return true;
  }
};
