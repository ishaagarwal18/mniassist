import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import type { ServiceTicketDto } from '../../proxy/support/service-ticket.models';
import { ServiceTicketService } from '../../proxy/support/service-ticket.service';
import { ArButton, ArCard } from '../../ui';

/**
 * A breakdown's fix, recorded by the engineer: the code seen, the real cause, what fixed it and the spares used. Three closed tickets
 * with the same code and cause on the same make and series propose a fault-code library entry.
 */
@Component({
  selector: 'ar-record-fix-card',
  imports: [ArCard, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './record-fix-card.html',
  styleUrl: './record-fix-card.scss',
})
export class ArRecordFixCard implements OnInit {
  readonly ticket = input.required<ServiceTicketDto>();
  readonly canEdit = input(false);
  readonly saved = output<ServiceTicketDto>();

  private readonly api = inject(ServiceTicketService);
  private readonly toasts = inject(ToastService);

  protected readonly code = signal('');
  protected readonly cause = signal('');
  protected readonly fix = signal('');
  protected readonly spares = signal('');
  protected readonly busy = signal(false);

  ngOnInit(): void {
    const t = this.ticket();
    this.code.set(t.closedCode ?? '');
    this.cause.set(t.closedCause ?? '');
    this.fix.set(t.closedFix ?? '');
    this.spares.set(t.closedSpares ?? '');
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(
        this.api.recordFix(this.ticket().id, {
          code: this.code().trim() || null,
          cause: this.cause().trim() || null,
          fix: this.fix().trim() || null,
          spares: this.spares().trim() || null,
        }),
      );
      this.toasts.success('Fix recorded. It helps the fault-code library learn.');
      this.saved.emit(updated);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The fix could not be recorded.'));
    } finally {
      this.busy.set(false);
    }
  }
}
