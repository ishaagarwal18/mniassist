import { LocalizationPipe, PermissionService } from '@abp/ng.core';
import { Component, Pipe, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArTopbar } from '../../layout/topbar';
import {
  VoiceCallBatchDto,
  VoiceCallBatchService,
} from '../../proxy/calling/voice-call-batch.service';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ArDialog } from '../../ui/dialog';
import { ArVoiceCallBatches } from './voice-call-batches';

vi.mock('@syncfusion/ej2-angular-popups', () => ({ DialogComponent: class {} }));

@Component({ selector: 'ar-topbar', template: '<ng-content />' })
class TestTopbar {
  readonly title = input<string>();
  readonly help = input<string>();
}
@Component({
  selector: 'ar-dialog',
  template: '<ng-content /><ng-content select="[dialogActions]" />',
})
class TestDialog {
  readonly title = input<string>();
  readonly width = input<string>();
  readonly dismiss = output<void>();
}
@Pipe({ name: 'abpLocalization' })
class TestLocalization {
  transform(value: string, ...args: string[]) {
    return [value, ...args].join(' ');
  }
}

const draft: VoiceCallBatchDto = {
  id: 'b1',
  name: 'AMC renewals',
  channelId: 'ch1',
  purpose: 'Renewal of {{plan}}',
  status: 'Draft',
  creationTime: '2026-10-27T05:00:00Z',
  windowStartMinute: 600,
  windowEndMinute: 1140,
  maxConcurrent: 2,
  maxAttempts: 2,
  retryAfterMinutes: 120,
  total: 2,
  pending: 2,
  calling: 0,
  reached: 0,
  unreached: 0,
  skipped: 0,
  failed: 0,
  cancelled: 0,
};

describe('AI call batches', () => {
  const api = {
    getList: vi.fn(),
    getRecipients: vi.fn(),
    create: vi.fn(),
    importRecipients: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.getList.mockReturnValue(of({ items: [draft], totalCount: 1 }));
    api.getRecipients.mockReturnValue(
      of({
        items: [
          {
            id: 'r1',
            contactId: 'c1',
            contactName: 'Asha',
            status: 'Pending',
            attempts: 0,
            updatedAtUtc: '',
            variables: {},
          },
        ],
        totalCount: 1,
      }),
    );
    api.start.mockReturnValue(of({ ...draft, status: 'Running' }));
    api.importRecipients.mockReturnValue(
      of({ added: 1, alreadyIn: 0, problems: ['Line 3: no valid phone number.'] }),
    );
    api.create.mockReturnValue(of(draft));
    TestBed.configureTestingModule({
      imports: [ArVoiceCallBatches],
      providers: [
        { provide: VoiceCallBatchService, useValue: api },
        {
          provide: ChannelService,
          useValue: {
            getList: () =>
              of({
                items: [
                  { id: 'ch1', provider: 0, verifiedName: 'Meridian' },
                  { id: 'g1', provider: 1 },
                ],
                totalCount: 2,
              }),
          },
        },
        { provide: PermissionService, useValue: { getGrantedPolicy: () => true } },
      ],
    }).overrideComponent(ArVoiceCallBatches, {
      remove: { imports: [ArDialog, ArTopbar, LocalizationPipe] },
      add: { imports: [TestDialog, TestTopbar, TestLocalization] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArVoiceCallBatches);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  const button = (root: HTMLElement, text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;

  it('lists batches and starts a selected draft', async () => {
    const fixture = await create();
    button(fixture.nativeElement, 'AMC renewals').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.getRecipients).toHaveBeenCalledWith('b1', { maxResultCount: 200 });
    expect(fixture.nativeElement.textContent).toContain('Asha');
    button(fixture.nativeElement, 'VoiceBatch.Start').click();
    await fixture.whenStable();
    expect(api.start).toHaveBeenCalledWith('b1');
  });

  it('uploads a CSV and shows what could not be added', async () => {
    const fixture = await create();
    button(fixture.nativeElement, 'AMC renewals').click();
    await fixture.whenStable();
    fixture.detectChanges();
    const file = new File(['phone,plan\n9876543210,Gold\n'], 'people.csv', { type: 'text/csv' });
    const upload: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    Object.defineProperty(upload, 'files', { value: [file] });
    upload.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.importRecipients).toHaveBeenCalledWith('b1', 'phone,plan\n9876543210,Gold\n');
    expect(fixture.nativeElement.textContent).toContain('Line 3: no valid phone number.');
  });

  it('offers only Meta-direct numbers and refuses a window outside 09:00–21:00 before calling the API', async () => {
    const fixture = await create();
    button(fixture.nativeElement, 'VoiceBatch.New').click();
    await fixture.whenStable();
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.options.length).toBe(1);
    const name: HTMLInputElement = fixture.nativeElement.querySelector('ar-dialog input');
    name.value = 'Late calls';
    name.dispatchEvent(new Event('input'));
    const to: HTMLInputElement = fixture.nativeElement.querySelectorAll(
      'ar-dialog input[type="time"]',
    )[1];
    to.value = '22:00';
    to.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement, 'VoiceBatch.Create').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('AutoReach:VoiceCallBatchInvalid');
  });

  it('creates a batch that calls on the phone line', async () => {
    const fixture = await create();
    button(fixture.nativeElement, 'VoiceBatch.New').click();
    await fixture.whenStable();
    fixture.detectChanges();
    const name: HTMLInputElement = fixture.nativeElement.querySelector('ar-dialog input');
    name.value = 'Renewals by phone';
    name.dispatchEvent(new Event('input'));
    const line = fixture.nativeElement.querySelector('option[value="phone"]')
      .parentElement as HTMLSelectElement;
    line.value = 'phone';
    line.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement, 'VoiceBatch.Create').click();
    await fixture.whenStable();
    expect(api.create).toHaveBeenCalled();
    expect(api.create.mock.calls[0][0].line).toBe('phone');
  });
});
