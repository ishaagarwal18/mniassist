import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { FlowService } from '../../proxy/flows/flow.service';
import type { FlowResponseDto } from '../../proxy/flows/models';
import { ArButton } from '../../ui';

/** A submitted Flow's answers as label/value pairs; anything that isn't a flat JSON object is shown raw. */
export function responseFields(
  payloadJson: string | undefined | null,
): { key: string; value: string }[] {
  if (!payloadJson) return [];
  try {
    const parsed: unknown = JSON.parse(payloadJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return [{ key: 'Answer', value: payloadJson }];
    }
    return Object.entries(parsed as Record<string, unknown>)
      .filter(([k]) => k !== 'flow_token')
      .map(([k, v]) => ({
        key: k.replace(/_/g, ' '),
        value: typeof v === 'string' ? v : JSON.stringify(v),
      }));
  } catch {
    return [{ key: 'Answer', value: payloadJson }];
  }
}

/** The answers customers submitted through one Flow, newest first, with a link to any enquiry it created. */
@Component({
  selector: 'ar-flow-responses',
  imports: [ArButton, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 2px 12px;
      margin: 6px 0 0;
      font-size: 13px;
    }
    dt {
      color: var(--ar-ink-500);
      text-transform: capitalize;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
  `,
  template: `
    <ul class="wp__list">
      @for (r of responses(); track r.id) {
        <li class="wp__item">
          <div class="wp__grow">
            <span class="wp__name" translate="no">{{ r.contactDisplayName ?? 'Customer' }}</span>
            <span class="wp__sub">{{ r.submittedAtUtc | date: 'd MMM y, HH:mm' }}</span>
            <dl translate="no">
              @for (f of fields(r); track f.key) {
                <dt>{{ f.key }}</dt>
                <dd>{{ f.value }}</dd>
              }
            </dl>
          </div>
          @if (r.createdEnquiryId) {
            <a routerLink="/enquiries" [queryParams]="{ open: r.createdEnquiryId }">Open enquiry</a>
          }
        </li>
      } @empty {
        <li class="wp__empty">
          {{ loading() ? 'Loading…' : 'Nobody has submitted this Flow yet.' }}
        </li>
      }
    </ul>
    @if (responses().length < total()) {
      <div class="wp__actions">
        <button ar-button type="button" variant="ghost" (click)="load(responses().length)">
          Show more
        </button>
      </div>
    }
  `,
})
export class ArFlowResponses implements OnInit {
  private readonly api = inject(FlowService);

  readonly flowId = input.required<string>();

  protected readonly responses = signal<FlowResponseDto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.load(0);
    this.loading.set(false);
  }

  protected fields(r: FlowResponseDto) {
    return responseFields(r.payloadJson);
  }

  protected async load(skip: number): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getResponses(
          this.flowId(),
          { skipCount: skip, maxResultCount: 25 },
          { skipHandleError: true },
        ),
      );
      this.total.set(page.totalCount ?? 0);
      this.responses.update((list) =>
        skip === 0 ? (page.items ?? []) : [...list, ...(page.items ?? [])],
      );
    } catch {
      /* keep what is shown */
    }
  }
}
