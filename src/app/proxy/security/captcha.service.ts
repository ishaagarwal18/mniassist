import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface CaptchaConfigDto {
  /** `turnstile`, or empty when no captcha is configured. */
  provider?: string | null;
  siteKey?: string | null;
}

/** Whether a public form shows a human-verification widget, and its public site key. */
@Injectable({ providedIn: 'root' })
export class CaptchaService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getConfig = (config?: Partial<Rest.Config>) =>
    this.restService.request<void, CaptchaConfigDto>(
      { method: 'GET', url: '/api/auto-reach/captcha/config' },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );
}
