import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { EnquiryService } from '../../proxy/pipeline/enquiry.service';
import type { SalesPipelineDto } from '../../proxy/pipeline/models';
import { SalesPipelineService } from '../../proxy/pipeline/sales-pipeline.service';
import { ArButton } from '../../ui';

/** Moves an enquiry to another sales pipeline, optionally straight into one of its stages. */
@Component({
  selector: 'ar-enquiry-move-pipeline',
  imports: [ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
  `,
  template: `
    @if (others().length > 0) {
      <div class="wp__row">
        <select
          class="ar-field__input"
          aria-label="Pipeline"
          [value]="target()"
          (change)="pick($any($event.target).value)"
        >
          <option value="">Move to pipeline…</option>
          @for (p of others(); track p.id) {
            <option [value]="p.id" translate="no">{{ p.name }}</option>
          }
        </select>
        @if (stages().length > 0) {
          <select
            class="ar-field__input"
            aria-label="Stage"
            [value]="stage()"
            (change)="stage.set($any($event.target).value)"
          >
            <option value="">First stage</option>
            @for (s of stages(); track s.id) {
              <option [value]="s.id" translate="no">{{ s.name }}</option>
            }
          </select>
        }
        <button
          ar-button
          type="button"
          variant="ghost"
          [disabled]="!target() || busy()"
          (click)="move()"
        >
          {{ busy() ? 'Moving…' : 'Move' }}
        </button>
      </div>
    }
  `,
})
export class ArEnquiryMovePipeline implements OnInit {
  private readonly enquiries = inject(EnquiryService);
  private readonly pipelines = inject(SalesPipelineService);
  private readonly toasts = inject(ToastService);

  readonly enquiryId = input.required<string>();
  readonly pipelineId = input<string | null | undefined>(null);
  readonly moved = output<void>();

  private readonly all = signal<SalesPipelineDto[]>([]);
  protected readonly target = signal('');
  protected readonly stage = signal('');
  protected readonly busy = signal(false);

  protected readonly others = computed(() => {
    const current = this.pipelineId() ?? this.all().find((p) => p.isDefault)?.id;
    return this.all().filter((p) => p.id && p.id !== current);
  });
  protected readonly stages = computed(
    () => this.all().find((p) => p.id === this.target())?.stages ?? [],
  );

  async ngOnInit(): Promise<void> {
    try {
      this.all.set(
        (await firstValueFrom(this.pipelines.getList({ skipHandleError: true }))).items ?? [],
      );
    } catch {
      this.all.set([]);
    }
  }

  protected pick(id: string): void {
    this.target.set(id);
    this.stage.set('');
  }

  protected async move(): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.enquiries.moveToPipeline(
          this.enquiryId(),
          { pipelineId: this.target(), stageId: this.stage() || null },
          { skipHandleError: true },
        ),
      );
      this.toasts.success('Enquiry moved to the other pipeline.', 'Enquiry');
      this.moved.emit();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The enquiry could not be moved.'), 'Enquiry');
    } finally {
      this.busy.set(false);
    }
  }
}
