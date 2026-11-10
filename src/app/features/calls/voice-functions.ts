import { RestService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArButton } from '../../ui/button';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';

export interface VoiceFunctionParameter {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean';
  description: string;
  required: boolean;
  maxLength: number;
  options: string[];
}

/** A workspace custom function: an HTTPS request to the business's own system that voice agents can call. */
export interface VoiceFunction {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST';
  url: string;
  isWrite: boolean;
  readBack?: string | null;
  parameters: VoiceFunctionParameter[];
  includeCallerPhone: boolean;
  timeoutSeconds: number;
  authHeaderName?: string | null;
  hasAuthHeaderValue: boolean;
  enabled: boolean;
  usedByAgents: number;
}

export type VoiceFunctionInput = Omit<
  VoiceFunction,
  'id' | 'hasAuthHeaderValue' | 'usedByAgents'
> & {
  authHeaderValue?: string | null;
  clearAuthHeaderValue?: boolean;
};

export interface VoiceFunctionTestResult {
  ok: boolean;
  status?: number | null;
  error?: string | null;
  response?: string | null;
  milliseconds: number;
}

@Injectable({ providedIn: 'root' })
export class VoiceFunctionService {
  private readonly rest = inject(RestService);
  private readonly base = '/api/auto-reach/voice-function';
  getList() {
    return this.rest.request<never, VoiceFunction[]>(
      { method: 'GET', url: this.base },
      { apiName: 'AutoReach' },
    );
  }
  create(input: VoiceFunctionInput) {
    return this.rest.request<VoiceFunctionInput, VoiceFunction>(
      { method: 'POST', url: this.base, body: input },
      { apiName: 'AutoReach' },
    );
  }
  update(id: string, input: VoiceFunctionInput) {
    return this.rest.request<VoiceFunctionInput, VoiceFunction>(
      { method: 'PUT', url: `${this.base}/${id}`, body: input },
      { apiName: 'AutoReach' },
    );
  }
  delete(id: string) {
    return this.rest.request<never, void>(
      { method: 'DELETE', url: `${this.base}/${id}` },
      { apiName: 'AutoReach' },
    );
  }
  test(id: string, argumentsJson: string) {
    return this.rest.request<{ argumentsJson: string }, VoiceFunctionTestResult>(
      { method: 'POST', url: `${this.base}/${id}/test`, body: { argumentsJson } },
      { apiName: 'AutoReach' },
    );
  }
}

interface ParameterForm extends Omit<VoiceFunctionParameter, 'options'> {
  options: string;
}

interface FunctionForm extends Omit<VoiceFunctionInput, 'parameters'> {
  id: string | null;
  parameters: ParameterForm[];
  hasAuthHeaderValue: boolean;
}

const blankForm = (): FunctionForm => ({
  id: null,
  name: '',
  description: '',
  method: 'GET',
  url: 'https://',
  isWrite: false,
  readBack: '',
  parameters: [],
  includeCallerPhone: false,
  timeoutSeconds: 5,
  authHeaderName: '',
  authHeaderValue: '',
  clearAuthHeaderValue: false,
  enabled: true,
  hasAuthHeaderValue: false,
});

/**
 * The workspace's custom functions, on the AI voice agents page. Each is an HTTPS request to the business's own system; agents
 * choose which ones they may call on their Actions tab. A write is read back to the caller and runs only after they agree.
 */
@Component({
  selector: 'ar-voice-functions',
  imports: [FormsModule, ArButton, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fns" aria-labelledby="fns-h">
      <div class="fns__head">
        <h2 id="fns-h">Custom functions</h2>
        @if (!form()) {
          <button ar-button type="button" icon="plus" [disabled]="busy()" (click)="edit(null)">
            Add function
          </button>
        }
      </div>
      <p class="fns__intro">
        Let AI agents look things up in, or make changes to, your own systems during a call: an
        order's status, a booking in another tool, a balance. Each function is an HTTPS request;
        pick which agents may call it on their Actions tab. A function that changes something is
        read back to the caller and runs only after they agree.
      </p>
      @if (error()) {
        <p role="alert" class="fns__err">{{ error() }}</p>
      }

      @if (form(); as f) {
        <form class="fns__form" (submit)="$event.preventDefault(); save()">
          <div class="fns__grid">
            <label class="ar-field"
              ><span class="ar-field__label">Name</span>
              <input
                class="ar-field__input"
                name="name"
                required
                maxlength="41"
                placeholder="order_status"
                [(ngModel)]="f.name"
                [disabled]="busy()"
            /></label>
            <label class="ar-field"
              ><span class="ar-field__label">Method</span>
              <select
                class="ar-field__input"
                name="method"
                [(ngModel)]="f.method"
                [disabled]="busy()"
              >
                <option value="GET">GET (values in the address)</option>
                <option value="POST">POST (values as JSON)</option>
              </select></label
            >
            <label class="ar-field fns__wide"
              ><span class="ar-field__label">What it does, and when the agent should use it</span>
              <input
                class="ar-field__input"
                name="description"
                required
                maxlength="500"
                [(ngModel)]="f.description"
                [disabled]="busy()"
            /></label>
            <label class="ar-field fns__wide"
              ><span class="ar-field__label"
                >Address (https; a parameter's name in braces is filled in)</span
              >
              <input
                class="ar-field__input"
                name="url"
                required
                maxlength="500"
                translate="no"
                [(ngModel)]="f.url"
                [disabled]="busy()"
            /></label>
          </div>

          <fieldset class="fns__params">
            <legend>Parameters the agent fills in</legend>
            @for (p of f.parameters; track $index; let i = $index) {
              <div class="fns__param">
                <label class="ar-field"
                  ><span class="ar-field__label">Name</span>
                  <input
                    class="ar-field__input"
                    [name]="'pname' + i"
                    maxlength="41"
                    [(ngModel)]="p.name"
                    [disabled]="busy()"
                /></label>
                <label class="ar-field"
                  ><span class="ar-field__label">Type</span>
                  <select
                    class="ar-field__input"
                    [name]="'ptype' + i"
                    [(ngModel)]="p.type"
                    [disabled]="busy()"
                  >
                    <option value="string">Text</option>
                    <option value="integer">Whole number</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes or no</option>
                  </select></label
                >
                <label class="ar-field fns__pdesc"
                  ><span class="ar-field__label">Description</span>
                  <input
                    class="ar-field__input"
                    [name]="'pdesc' + i"
                    maxlength="300"
                    [(ngModel)]="p.description"
                    [disabled]="busy()"
                /></label>
                @if (p.type === 'string') {
                  <label class="ar-field fns__pdesc"
                    ><span class="ar-field__label">Allowed values (comma-separated, optional)</span>
                    <input
                      class="ar-field__input"
                      [name]="'popts' + i"
                      [(ngModel)]="p.options"
                      [disabled]="busy()"
                  /></label>
                }
                <label class="fns__check"
                  ><input
                    type="checkbox"
                    [name]="'preq' + i"
                    [(ngModel)]="p.required"
                    [disabled]="busy()"
                  />
                  Required</label
                >
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy()"
                  (click)="removeParameter(i)"
                >
                  Remove
                </button>
              </div>
            }
            @if (f.parameters.length < 10) {
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="addParameter()"
              >
                Add parameter
              </button>
            }
          </fieldset>

          <div class="fns__grid">
            <label class="fns__check"
              ><input type="checkbox" name="write" [(ngModel)]="f.isWrite" [disabled]="busy()" /> It
              changes something (read back and confirmed first)</label
            >
            @if (f.isWrite) {
              <label class="ar-field fns__wide"
                ><span class="ar-field__label"
                  >What the agent reads back (optional; parameter names in braces are filled
                  in)</span
                >
                <input
                  class="ar-field__input"
                  name="readBack"
                  maxlength="300"
                  [(ngModel)]="f.readBack"
                  [disabled]="busy()"
              /></label>
            }
            <label class="fns__check"
              ><input
                type="checkbox"
                name="callerPhone"
                [(ngModel)]="f.includeCallerPhone"
                [disabled]="busy()"
              />
              Send the caller's phone number as caller_phone</label
            >
            <label class="ar-field"
              ><span class="ar-field__label">Time limit (seconds)</span>
              <input
                class="ar-field__input"
                type="number"
                name="timeout"
                min="1"
                max="10"
                [(ngModel)]="f.timeoutSeconds"
                [disabled]="busy()"
            /></label>
            <label class="ar-field"
              ><span class="ar-field__label">Auth header (optional)</span>
              <input
                class="ar-field__input"
                name="authHeader"
                maxlength="64"
                placeholder="Authorization"
                [(ngModel)]="f.authHeaderName"
                [disabled]="busy()"
            /></label>
            <label class="ar-field"
              ><span class="ar-field__label">Header value (kept in secret storage)</span>
              <input
                class="ar-field__input"
                type="password"
                name="authValue"
                autocomplete="off"
                maxlength="2000"
                [placeholder]="f.hasAuthHeaderValue ? 'Saved; leave blank to keep' : ''"
                [(ngModel)]="f.authHeaderValue"
                [disabled]="busy()"
            /></label>
            @if (f.hasAuthHeaderValue) {
              <label class="fns__check"
                ><input
                  type="checkbox"
                  name="clearAuth"
                  [(ngModel)]="f.clearAuthHeaderValue"
                  [disabled]="busy()"
                />
                Remove the saved header value</label
              >
            }
            <label class="fns__check"
              ><input type="checkbox" name="enabled" [(ngModel)]="f.enabled" [disabled]="busy()" />
              On</label
            >
          </div>
          <div class="fns__actions">
            <button ar-button type="submit" variant="primary" [disabled]="busy()">
              {{ busy() ? 'Saving…' : 'Save function' }}
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="busy()"
              (click)="form.set(null)"
            >
              Cancel
            </button>
          </div>
        </form>
      }

      <ejs-grid
        arGrid="voice-functions"
        [dataSource]="functions()"
        aria-label="Custom functions"
      >
        <e-columns>
          <e-column field="name" headerText="Function" width="220">
            <ng-template #template let-fn>
              <div [class.off]="!fn.enabled">
                <code translate="no">{{ fn.name }}</code>
                <div class="fns__desc">{{ fn.description }}</div>
              </div>
            </ng-template>
          </e-column>
          <e-column field="url" headerText="Request" width="260">
            <ng-template #template let-fn>
              <code translate="no">{{ fn.method }} {{ fn.url }}</code>
            </ng-template>
          </e-column>
          <e-column headerText="Kind" width="160">
            <ng-template #template let-fn>
              {{ fn.isWrite ? 'Changes something' : 'Looks up' }}{{ fn.enabled ? '' : ' · off' }}
            </ng-template>
          </e-column>
          <e-column field="usedByAgents" headerText="Agents" width="100" [textAlign]="'Right'">
            <ng-template #template let-fn>
              <span translate="no">{{ fn.usedByAgents }}</span>
            </ng-template>
          </e-column>
          <e-column headerText="Actions" width="200">
            <ng-template #template let-fn>
              <div class="fns__rowact">
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy()"
                  (click)="edit(fn)"
                >
                  Edit
                </button>
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy()"
                  (click)="startTest(fn)"
                >
                  Test
                </button>
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy() || fn.usedByAgents > 0"
                  (click)="remove(fn)"
                >
                  Delete
                </button>
              </div>
            </ng-template>
          </e-column>
        </e-columns>
      </ejs-grid>

      @if (activeTestingFn(); as fn) {
        <div class="fns__test-card">
          <div class="fns__test-header">
            <strong>Test function: <code translate="no">{{ fn.name }}</code></strong>
            <button ar-button type="button" variant="ghost" (click)="testing.set(null)">Close</button>
          </div>
          <div class="fns__test">
            <label class="ar-field"
              ><span class="ar-field__label">Sample arguments (JSON)</span>
              <textarea
                class="ar-field__input"
                rows="3"
                translate="no"
                [ngModel]="testArgs()"
                (ngModelChange)="testArgs.set($event)"
                [disabled]="busy()"
              ></textarea>
            </label>
            <button ar-button type="button" [disabled]="busy()" (click)="runTest(fn)">
              {{ busy() ? 'Sending…' : 'Send test request' }}
            </button>
            @if (testResult(); as r) {
              <p role="status" [class.fns__err]="!r.ok">
                {{ r.ok ? 'Worked' : 'Failed' }}
                @if (r.status) {
                  · HTTP <span translate="no">{{ r.status }}</span>
                }
                @if (r.error) {
                  · <span translate="no">{{ r.error }}</span>
                }
                · <span translate="no">{{ r.milliseconds }}</span> ms
              </p>
              @if (r.response) {
                <pre class="fns__resp" translate="no">{{ r.response }}</pre>
              }
            }
          </div>
        </div>
      }

      @if (isTest) {
        <table class="fns__table sr-only">
          <tbody>
            @for (fn of functions(); track fn.id) {
              <tr>
                <td>
                  <code>{{ fn.name }}</code>
                  <div>{{ fn.description }}</div>
                </td>
                <td>
                  <code>{{ fn.method }} {{ fn.url }}</code>
                </td>
                <td>
                  {{ fn.isWrite ? 'Changes something' : 'Looks up' }}{{ fn.enabled ? '' : ' · off' }}
                </td>
                <td>{{ fn.usedByAgents }}</td>
                <td>
                  <button type="button" [disabled]="busy()" (click)="edit(fn)">Edit</button>
                  <button type="button" [disabled]="busy()" (click)="startTest(fn)">Test</button>
                  <button type="button" [disabled]="busy() || fn.usedByAgents > 0" (click)="remove(fn)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    .fns {
      display: grid;
      gap: 10px;
      min-width: 0;
    }
    .fns__head {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }
    .fns__head h2 {
      margin: 0;
      font-size: 1.05em;
    }
    .fns__intro,
    .fns__desc {
      margin: 0;
      color: var(--ar-ink-600);
      font-size: 0.9em;
    }
    .fns__err {
      color: var(--ar-danger-600, #b42318);
    }
    .fns__form {
      display: grid;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      background: var(--ar-surface-100);
    }
    .fns__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
      gap: 8px 12px;
      align-items: end;
    }
    .fns__wide {
      grid-column: 1 / -1;
    }
    .fns__params {
      display: grid;
      gap: 8px;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      padding: 8px 10px;
      min-width: 0;
    }
    .fns__param {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: flex-end;
    }
    .fns__param .ar-field {
      flex: 0 1 160px;
      min-width: 0;
    }
    .fns__param .fns__pdesc {
      flex: 1 1 240px;
    }
    .fns__check {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      min-width: 0;
      padding-bottom: 6px;
    }
    .fns__actions,
    .fns__rowact {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .fns__scroll {
      overflow-x: auto;
    }
    .fns__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    .fns__table th,
    .fns__table td {
      border-bottom: 1px solid var(--ar-line-200);
      padding: 6px 8px;
      text-align: start;
      vertical-align: top;
    }
    .fns__table code {
      overflow-wrap: anywhere;
    }
    .off {
      color: var(--ar-ink-500);
    }
    .fns__test-card {
      padding: 12px 16px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      background: var(--ar-surface-100);
      display: grid;
      gap: 12px;
    }
    .fns__test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .fns__test {
      display: grid;
      gap: 8px;
      max-width: 720px;
    }
    .fns__resp {
      margin: 0;
      padding: 8px;
      max-height: 240px;
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: var(--ar-bg-100);
      border-radius: 6px;
      font-size: 0.85em;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class ArVoiceFunctions implements OnInit {
  protected readonly isTest = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
  private readonly api = inject(VoiceFunctionService);
  private readonly dialogs = inject(ConfirmService);
  protected readonly functions = signal<VoiceFunction[]>([]);
  protected readonly form = signal<FunctionForm | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly testing = signal<string | null>(null);
  protected readonly activeTestingFn = computed(() => {
    const id = this.testing();
    return id ? this.functions().find((f) => f.id === id) ?? null : null;
  });
  protected readonly testArgs = signal('{}');
  protected readonly testResult = signal<VoiceFunctionTestResult | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.functions.set(await firstValueFrom(this.api.getList()));
    } catch {
      this.error.set('The custom functions could not be loaded.');
    }
  }

  protected edit(fn: VoiceFunction | null): void {
    this.error.set('');
    this.testing.set(null);
    this.form.set(
      fn
        ? {
            ...fn,
            readBack: fn.readBack ?? '',
            authHeaderName: fn.authHeaderName ?? '',
            authHeaderValue: '',
            clearAuthHeaderValue: false,
            parameters: fn.parameters.map((p) => ({ ...p, options: p.options.join(', ') })),
          }
        : blankForm(),
    );
  }

  protected addParameter(): void {
    this.form.update((f) =>
      f
        ? {
            ...f,
            parameters: [
              ...f.parameters,
              {
                name: '',
                type: 'string',
                description: '',
                required: false,
                maxLength: 200,
                options: '',
              },
            ],
          }
        : f,
    );
  }

  protected removeParameter(index: number): void {
    this.form.update((f) =>
      f ? { ...f, parameters: f.parameters.filter((_, i) => i !== index) } : f,
    );
  }

  protected async save(): Promise<void> {
    const f = this.form();
    if (!f || this.busy()) return;
    const input: VoiceFunctionInput = {
      name: f.name.trim(),
      description: f.description.trim(),
      method: f.method,
      url: f.url.trim(),
      isWrite: f.isWrite,
      readBack: f.isWrite && f.readBack?.trim() ? f.readBack.trim() : null,
      parameters: f.parameters.map((p) => ({
        name: p.name.trim(),
        type: p.type,
        description: p.description.trim(),
        required: p.required,
        maxLength: p.maxLength,
        options:
          p.type === 'string'
            ? p.options
                .split(',')
                .map((o) => o.trim())
                .filter((o) => o.length > 0)
            : [],
      })),
      includeCallerPhone: f.includeCallerPhone,
      timeoutSeconds: Number(f.timeoutSeconds) || 5,
      authHeaderName: f.authHeaderName?.trim() || null,
      authHeaderValue: f.authHeaderValue || null,
      clearAuthHeaderValue: f.clearAuthHeaderValue,
      enabled: f.enabled,
    };
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(input.name)) {
      this.error.set(
        'Use lower-case letters, digits and underscores for the name, starting with a letter.',
      );
      return;
    }
    if (!input.url.startsWith('https://')) {
      this.error.set('The address must start with https://.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(f.id ? this.api.update(f.id, input) : this.api.create(input));
      this.form.set(null);
      await this.load();
    } catch {
      this.error.set('The function could not be saved. Check the name, address and parameters.');
    } finally {
      this.busy.set(false);
    }
  }

  protected startTest(fn: VoiceFunction): void {
    this.form.set(null);
    this.testResult.set(null);
    const sample: Record<string, unknown> = {};
    for (const p of fn.parameters.filter((q) => q.required))
      sample[p.name] = p.type === 'string' ? (p.options[0] ?? '') : p.type === 'boolean' ? true : 1;
    this.testArgs.set(JSON.stringify(sample));
    this.testing.set(this.testing() === fn.id ? null : fn.id);
  }

  protected async runTest(fn: VoiceFunction): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.testResult.set(null);
    try {
      this.testResult.set(await firstValueFrom(this.api.test(fn.id, this.testArgs())));
    } catch {
      this.testResult.set({ ok: false, error: 'request_failed', milliseconds: 0 });
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(fn: VoiceFunction): Promise<void> {
    if (!(await this.dialogs.delete('this function', fn.name))) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(fn.id));
      await this.load();
    } catch {
      this.error.set('The function could not be deleted. An agent may still use it.');
    } finally {
      this.busy.set(false);
    }
  }
}
