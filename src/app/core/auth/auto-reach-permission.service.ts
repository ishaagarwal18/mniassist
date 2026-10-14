import { Injectable } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { environment } from '../../../environments/environment';
import { isHostAdministrator } from './host-access';

/**
 * Custom ABP PermissionService that grants all permissions to Host administrators
 * (the built-in admin role, authenticated and operating at the Host level).
 */
@Injectable({
  providedIn: 'root',
})
export class AutoReachPermissionService extends PermissionService {
  // ABP's sync checks, permission streams and item filters all use this method.
  protected override isPolicyGranted(
    name: string | undefined,
    grants: Record<string, boolean>,
  ): boolean {
    if (!name || environment.useMockData) {
      return true;
    }
    if (isHostAdministrator(this.configState.getAll())) {
      return true;
    }
    return super.isPolicyGranted(name, grants);
  }
}
