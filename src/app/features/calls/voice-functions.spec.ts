import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArVoiceFunctions, VoiceFunction, VoiceFunctionService } from './voice-functions';

const orderStatus: VoiceFunction = {
  id: 'f1',
  name: 'order_status',
  description: 'Look up an order.',
  method: 'GET',
  url: 'https://erp.example.in/orders/{order_id}',
  isWrite: false,
  readBack: null,
  parameters: [
    {
      name: 'order_id',
      type: 'string',
      description: 'Order number.',
      required: true,
      maxLength: 20,
      options: [],
    },
  ],
  includeCallerPhone: false,
  timeoutSeconds: 5,
  authHeaderName: 'Authorization',
  hasAuthHeaderValue: true,
  enabled: true,
  usedByAgents: 2,
};

describe('Custom functions', () => {
  const api = {
    getList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    test: vi.fn(),
  };
  const dialogs = { delete: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.getList.mockReturnValue(of([orderStatus]));
    api.create.mockReturnValue(of(orderStatus));
    api.update.mockReturnValue(of(orderStatus));
    api.test.mockReturnValue(
      of({ ok: true, status: 200, response: '{"status":"Packed"}', milliseconds: 84 }),
    );
    TestBed.configureTestingModule({
      imports: [ArVoiceFunctions],
      providers: [
        { provide: VoiceFunctionService, useValue: api },
        { provide: ConfirmService, useValue: dialogs },
      ],
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArVoiceFunctions);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }
  const button = (root: HTMLElement, text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(text))!;

  it('lists functions with their request and how many agents use them, and keeps a used one', async () => {
    const { root } = await create();
    const row = root.querySelector('tbody tr')!.textContent!;
    expect(row).toContain('order_status');
    expect(row).toContain('GET https://erp.example.in/orders/{order_id}');
    expect(row).toContain('Looks up');
    expect(button(root, 'Delete').disabled).toBe(true);
  });

  it('adds a function with a parameter and refuses a plain http address first', async () => {
    const { fixture, root } = await create();
    button(root, 'Add function').click();
    fixture.detectChanges();
    await fixture.whenStable();
    const set = (name: string, value: string) => {
      const input = root.querySelector(`[name="${name}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('name', 'cancel_order');
    set('description', 'Cancel an order.');
    set('url', 'http://erp.example.in/cancel');
    button(root, 'Add parameter').click();
    fixture.detectChanges();
    await fixture.whenStable();
    // The parameter row's inputs, in order: name, then description (its [name] goes to ngModel, not the DOM).
    const row = [...root.querySelectorAll<HTMLInputElement>('.fns__param input.ar-field__input')];
    for (const [input, value] of [
      [row[0], 'order_id'],
      [row[1], 'Order number.'],
    ] as const) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(api.create).not.toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('https://');

    set('url', 'https://erp.example.in/cancel');
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'cancel_order',
        url: 'https://erp.example.in/cancel',
        parameters: [expect.objectContaining({ name: 'order_id', type: 'string', options: [] })],
        authHeaderValue: null,
      }),
    );
  });

  it('sends a test request with sample arguments and shows the reply', async () => {
    const { fixture, root } = await create();
    button(root, 'Test').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect((root.querySelector('textarea') as HTMLTextAreaElement).value).toBe('{"order_id":""}');
    button(root, 'Send test request').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.test).toHaveBeenCalledWith('f1', '{"order_id":""}');
    expect(root.textContent).toContain('Worked');
    expect(root.querySelector('pre')?.textContent).toContain('Packed');
  });
});
