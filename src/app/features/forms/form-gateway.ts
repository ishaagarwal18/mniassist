import { Injectable, inject } from '@angular/core';

import { WebFormService } from '../../proxy/web-forms/web-form.service';

/** Where lead forms come from: the server. */
@Injectable({ providedIn: 'root' })
export class WebFormGateway {
  readonly api = inject(WebFormService);
}
