import { Injectable, inject } from '@angular/core';

import { CallService } from '../../proxy/voice/call.service';

/** Where calls come from: the server. One code path for every page and dialog that shows or starts a call. */
@Injectable({ providedIn: 'root' })
export class CallGateway {
  readonly api = inject(CallService);
}
