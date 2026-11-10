import { Injectable, inject } from '@angular/core';

import {
  ActivityDirectoryService,
  CrmTaskService,
  MeetingService,
} from '../../proxy/activities/activity.service';

/** Where tasks, meetings and the people list come from: the server. */
@Injectable({ providedIn: 'root' })
export class ActivityGateway {
  readonly tasks = inject(CrmTaskService);
  readonly meetings = inject(MeetingService);
  readonly directory = inject(ActivityDirectoryService);
}
