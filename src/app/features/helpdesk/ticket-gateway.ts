import { Injectable, inject } from '@angular/core';

import { ServiceTicketService } from '../../proxy/support/service-ticket.service';

/** Where tickets come from: the server. */
@Injectable({ providedIn: 'root' })
export class ServiceTicketGateway {
  readonly api = inject(ServiceTicketService);
}
