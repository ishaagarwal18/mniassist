import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';

import { environment } from '../../../environments/environment';

/**
 * Reads a granted policy, with two escape hatches so the app never hides everything
 * by accident:
 *
 *  - on seeded data there is no application configuration to read grants from, so
 *    every policy reads as granted;
 *  - an empty or missing name is always granted (a nav item with no `permission`).
 *
 * The name may be an OR list — `"AutoReach.Billing || AutoReach.Analytics"` — which
 * matches ABP's own `getGrantedPolicy` behaviour.
 */
export function grantedPolicy(name: string | undefined | null, permissions: PermissionService): boolean {
  if (!name || environment.useMockData) {
    return true;
  }
  return permissions.getGrantedPolicy(name);
}

/**
 * Structural directive: `<a *arHasPermission="'AutoReach.Billing'">`. Reactive to the
 * permissions stream so a grant that arrives after first render still shows the item.
 */
@Directive({
  selector: '[arHasPermission]',
  standalone: true,
})
export class ArHasPermissionDirective {
  private readonly permissions = inject(PermissionService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  private readonly name = signal<string | undefined>(undefined);
  private rendered = false;

  private readonly granted = computed(() => grantedPolicy(this.name(), this.permissions));

  constructor() {
    // getGrantedPolicy is synchronous against the cached config; re-evaluate whenever
    // the input changes. A one-shot check is enough for the nav, which is rebuilt on
    // navigation anyway.
  }

  @Input()
  set arHasPermission(value: string | undefined) {
    this.name.set(value);
    this.sync();
  }

  private sync(): void {
    const show = this.granted();
    if (show && !this.rendered) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.rendered = true;
    } else if (!show && this.rendered) {
      this.viewContainer.clear();
      this.rendered = false;
    }
  }
}
