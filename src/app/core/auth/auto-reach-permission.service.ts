import { Injectable } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { environment } from '../../../environments/environment';

/**
 * Custom ABP PermissionService that grants all permissions to Host administrators
 * (when currentUser is authenticated and operates at the platform Host level).
 */
@Injectable({
  providedIn: 'root',
})
export class AutoReachPermissionService extends PermissionService {
  override getGrantedPolicy(name: string): boolean {
    if (!name || environment.useMockData) {
      return true;
    }
    const config = this.configState?.getAll?.() as any;
    const currentUser = config?.currentUser;
    const currentTenant = config?.currentTenant;
    const isHost =
      currentUser?.isAuthenticated &&
      (!currentTenant || !currentTenant.isAvailable) &&
      !currentUser.tenantId;
    if (isHost) {
      return true;
    }
    return super.getGrantedPolicy(name);
  }
}
