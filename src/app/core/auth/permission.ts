import {
  Directive,
  Input,
  Signal,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import type { NavItem } from '../../layout/nav.model';
import type { PlanService } from '../services/plan.service';
import type { CurrentUserService } from '../services/current-user.service';

/**
 * Checks if a policy is granted synchronously as a boolean.
 *
 * An empty or missing name is always granted (a nav item with no `permission`).
 *
 * The name may be an OR list — `"AutoReach.Billing || AutoReach.Analytics"` — which
 * matches ABP's own `getGrantedPolicy` behaviour.
 */
export function checkPolicy(
  name: string | undefined | null,
  permissions: PermissionService,
): boolean {
  if (!name) {
    return true;
  }
  return permissions.getGrantedPolicy(name);
}

/**
 * Reads a granted policy as an Angular Signal<boolean>.
 */
export function grantedPolicy(
  name: string | undefined | null,
  permissions: PermissionService,
): Signal<boolean> {
  if (!name) {
    return computed(() => true);
  }
  return toSignal(permissions.getGrantedPolicy$(name), {
    initialValue: checkPolicy(name, permissions),
  });
}

/**
 * Evaluates whether a navigation item or app menu should be displayed
 * based on role permissions, active subscription plan, unlocked features,
 * and host vs. tenant segregation.
 */
/** Set by FeatureFlagStore once it exists; until then every flagged item reads as off. */
let flagIsOn: (key: string) => boolean = () => false;
export function registerFlagChecker(check: (key: string) => boolean): void {
  flagIsOn = check;
}

export function canAccessNavItem(
  item: NavItem,
  permissions: PermissionService,
  planService: PlanService,
  account: CurrentUserService,
): boolean {
  if ((item.hostOnly && !account.isHost()) || !checkPolicy(item.permission, permissions)) {
    return false;
  }

  if (account.isHostAdmin()) {
    return true;
  }

  // 3. Subscription Plan check
  if (item.plan != null && !planService.hasPlan(item.plan)) {
    return false;
  }

  // 4. Plan feature check
  if (item.feature && !planService.hasFeature(item.feature)) {
    return false;
  }

  // 5. Platform feature flag
  if (item.flag && !flagIsOn(item.flag)) {
    return false;
  }

  return true;
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

  private readonly granted = toSignal(
    toObservable(this.name).pipe(
      switchMap((name) => (!name ? of(true) : this.permissions.getGrantedPolicy$(name))),
    ),
    { initialValue: false },
  );

  constructor() {
    effect(() => this.sync());
  }

  @Input()
  set arHasPermission(value: string | undefined) {
    this.name.set(value);
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
