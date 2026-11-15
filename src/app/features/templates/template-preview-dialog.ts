import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import type { RenderedTemplateDto } from '../../proxy/messaging/models';
import { TemplateService } from '../../proxy/messaging/template.service';
import { ArButton } from '../../ui';
import { ArDialog } from '../../ui/dialog';

/** The variables {{1}}…{{n}} as the API expects them: keyed by number, blanks left out. */
export function toVariables(values: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  values.forEach((v, i) => {
    if (v.trim()) out[String(i + 1)] = v.trim();
  });
  return out;
}

/** Shows a template exactly as a customer would get it, with the values typed here filled in by the server. */
@Component({
  selector: 'ar-template-preview-dialog',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      [title]="'Preview ' + name()"
      width="min(560px, calc(100vw - 32px))"
      (dismiss)="closed.emit()"
    >
      @if (values().length > 0) {
        <div class="pv__vars">
          @for (v of values(); track $index) {
            <label class="ar-field">
              <span class="ar-field__label">Value for {{ '{{' + ($index + 1) + '}}' }}</span>
              <input
                class="ar-field__input"
                [value]="v"
                (input)="setValue($index, $any($event.target).value)"
              />
            </label>
          }
        </div>
      }
      @if (result(); as r) {
        <div class="pv__msg" translate="no">
          @if (r.headerText) {
            <p class="pv__h">{{ r.headerText }}</p>
          }
          <p class="pv__b">{{ r.bodyText }}</p>
          @if (r.footerText) {
            <p class="pv__f">{{ r.footerText }}</p>
          }
          @for (b of r.buttonLabels ?? []; track $index) {
            <span class="pv__btn">{{ b }}</span>
          }
        </div>
        @if ((r.unresolvedVariables ?? []).length > 0) {
          <p class="pv__warn">Still empty: {{ r.unresolvedVariables!.join(', ') }}</p>
        }
      }
      @if (error(); as e) {
        <p class="pv__warn" role="alert">{{ e }}</p>
      }
      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Close</button>
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="render()">
          {{ busy() ? 'Filling in…' : 'Fill in values' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .pv__vars {
      display: grid;
      gap: 10px;
      margin-bottom: 12px;
    }
    .pv__msg {
      background: var(--ar-surface-100, #f3f4f6);
      border-radius: 10px;
      padding: 12px;
      white-space: pre-wrap;
      font: 400 13.5px/1.5 var(--ar-font-sans);
    }
    .pv__h {
      font-weight: 600;
      margin: 0 0 6px;
    }
    .pv__b {
      margin: 0;
    }
    .pv__f {
      margin: 6px 0 0;
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .pv__btn {
      display: inline-block;
      margin: 8px 6px 0 0;
      padding: 4px 10px;
      border: 1px solid var(--ar-line-200, #d1d5db);
      border-radius: 999px;
      font-size: 12.5px;
    }
    .pv__warn {
      margin: 8px 0 0;
      color: var(--ar-warn-600, #b45309);
      font: 500 12.5px var(--ar-font-sans);
    }
  `,
})
export class ArTemplatePreviewDialog implements OnInit {
  readonly templateId = input.required<string>();
  readonly name = input('');
  readonly variableCount = input(0);
  readonly closed = output<void>();
  private readonly api = inject(TemplateService);

  protected readonly values = signal<string[]>([]);
  protected readonly result = signal<RenderedTemplateDto | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.values.set(Array.from({ length: this.variableCount() }, () => ''));
    void this.render();
  }

  protected setValue(i: number, v: string): void {
    this.values.update((all) => all.map((x, j) => (j === i ? v : x)));
  }

  protected async render(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.result.set(
        await firstValueFrom(
          this.api.render(
            this.templateId(),
            { variables: toVariables(this.values()) },
            { skipHandleError: true },
          ),
        ),
      );
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The preview could not be made.'));
    } finally {
      this.busy.set(false);
    }
  }
}
