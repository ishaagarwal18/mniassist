import { InjectionToken } from '@angular/core';

/**
 * Provided (as `true`) by a page that shows a form normally used in a dialog, e.g. `/sales/orders/new`. Every `ar-dialog` under
 * it renders in the page instead: a card with the title, the fields and the actions, the same checks before the main button,
 * no overlay. The form component itself does not change.
 */
export const AR_DIALOG_INLINE = new InjectionToken<boolean>('AR_DIALOG_INLINE');
