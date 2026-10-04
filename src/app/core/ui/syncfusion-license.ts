import { registerLicense } from '@syncfusion/ej2-base';

import { environment } from '../../../environments/environment';

let registered = false;

/**
 * Registers the Syncfusion licence key (environment.syncfusionLicenseKey) once.
 * Called by every wrapper that starts a Syncfusion component, before it renders,
 * rather than from main.ts: importing @syncfusion/ej2-base there would put it in
 * the initial bundle that every visitor downloads, public pages included.
 * Without a key, Syncfusion shows its licence notice on the page.
 */
export function registerSyncfusionLicense(): void {
  if (registered) return;
  registered = true;
  if (environment.syncfusionLicenseKey) {
    registerLicense(environment.syncfusionLicenseKey);
  }
}
