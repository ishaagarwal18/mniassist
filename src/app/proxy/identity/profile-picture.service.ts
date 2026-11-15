import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface ProfilePictureDto {
  hasPicture: boolean;
  /** A data: URL of the stored picture; null when there is none. */
  dataUrl?: string | null;
}

/** ProfilePictureAppService: the signed-in person's picture, and anyone's for display. */
@Injectable({ providedIn: 'root' })
export class ProfilePictureService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getMine = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProfilePictureDto>(
      { method: 'GET', url: '/api/auto-reach/profile-picture/mine' },
      { apiName: this.apiName, ...config },
    );

  get = (userId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProfilePictureDto>(
      { method: 'GET', url: '/api/auto-reach/profile-picture', params: { userId } },
      { apiName: this.apiName, ...config },
    );

  /** Sent as the multipart field "File" (UploadProfilePictureInput.File). */
  upload = (file: File, config?: Partial<Rest.Config>) => {
    const form = new FormData();
    form.append('File', file, file.name);
    return this.restService.request<FormData, ProfilePictureDto>(
      { method: 'POST', url: '/api/auto-reach/profile-picture/upload', body: form },
      { apiName: this.apiName, ...config },
    );
  };

  delete = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: '/api/auto-reach/profile-picture' },
      { apiName: this.apiName, ...config },
    );
}
