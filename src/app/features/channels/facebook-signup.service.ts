import { Injectable } from '@angular/core';
import { loadFacebookSdk, openEmbeddedSignup } from './facebook-sdk';

/** Keeps preparation separate from the sign-in call made directly by the user's click. */
@Injectable({ providedIn: 'root' })
export class FacebookSignupService {
  readonly prepare = loadFacebookSdk;
  readonly launch = openEmbeddedSignup;
}
