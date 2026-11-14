import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import { VoiceCallBatchService } from '../../proxy/calling/voice-call-batch.service';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ArNewVoiceBatchPage } from './new-voice-batch-page';

@Component({ selector: 'ar-topbar', template: '<ng-content />' })
class TestTopbar {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly help = input<string>();
}

describe('New AI call batch page', () => {
  let api: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { create: vi.fn(() => of({ id: 'b9' })) };
    TestBed.configureTestingModule({
      imports: [ArNewVoiceBatchPage],
      providers: [
        provideRouter([]),
        { provide: VoiceCallBatchService, useValue: api },
        {
          provide: ChannelService,
          useValue: {
            getList: () =>
              of({
                items: [
                  { id: 'ch1', verifiedName: 'Meridian' },
                  { id: 'ch2', verifiedName: 'Meridian Service' },
                ],
                totalCount: 2,
              }),
          },
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).overrideComponent(ArNewVoiceBatchPage, {
      remove: { imports: [ArTopbar] },
      add: { imports: [TestTopbar] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArNewVoiceBatchPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root };
  }

  async function type(
    fixture: { whenStable(): Promise<unknown>; detectChanges(): void },
    el: HTMLInputElement | HTMLSelectElement,
    value: string,
  ) {
    el.value = value;
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function submit(
    fixture: { whenStable(): Promise<unknown>; detectChanges(): void },
    root: HTMLElement,
  ) {
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('offers every connected number and refuses a window outside 09:00–21:00 before calling the API', async () => {
    const { fixture, root } = await create();
    const channel = root.querySelector('select[name="channelId"]') as HTMLSelectElement;
    expect([...channel.options].map((o) => o.value)).toEqual(['ch1', 'ch2']);

    await type(
      fixture,
      root.querySelector('input[name="batchName"]') as HTMLInputElement,
      'Late calls',
    );
    await type(fixture, root.querySelector('input[name="windowEnd"]') as HTMLInputElement, '22:00');
    await submit(fixture, root);

    expect(api.create).not.toHaveBeenCalled();
    expect(root.textContent).toContain('between 09:00 and 21:00');
  });

  it('creates a batch that calls on the phone line, then returns to the list', async () => {
    const { fixture, root } = await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await type(
      fixture,
      root.querySelector('input[name="batchName"]') as HTMLInputElement,
      'Renewals by phone',
    );
    await type(fixture, root.querySelector('select[name="line"]') as HTMLSelectElement, 'phone');
    await submit(fixture, root);

    expect(api.create).toHaveBeenCalledOnce();
    const input = api.create.mock.calls[0][0];
    expect(input.line).toBe('phone');
    expect(input.channelId).toBe('ch1');
    expect(input.name).toBe('Renewals by phone');
    expect(navigate).toHaveBeenCalledWith('/calls/ai-batches');
  });
});
