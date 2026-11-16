import { LocalizationPipe, PermissionService } from '@abp/ng.core';
import { Component, Pipe, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
import { ArContactPicker } from '../pipeline/contact-picker';

@Component({ selector: 'ar-contact-picker', template: '' })
class TestContactPicker {
  readonly multiple = input(false);
  readonly picked = output<unknown>();
}

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
        provideRouter([]),
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
      remove: { imports: [ArDialog, ArTopbar, LocalizationPipe, ArContactPicker] },
      add: { imports: [TestDialog, TestTopbar, TestLocalization, TestContactPicker] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  /** Lets the page's loads and their follow-ups finish: under a full test run one stable check is not always enough. */
  async function settle(fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) {
    for (let i = 0; i < 3; i++) {
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    }
  }

  async function create() {
    const fixture = TestBed.createComponent(ArVoiceCallBatches);
    fixture.detectChanges();
    await settle(fixture);
    return fixture;
  }
  const button = (root: HTMLElement, text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;

  it('lists batches and starts a selected draft', async () => {
    const fixture = await create();
    button(fixture.nativeElement, 'AMC renewals').click();
    await settle(fixture);
    expect(api.getRecipients).toHaveBeenCalledWith('b1', { maxResultCount: 200 });
    expect(fixture.nativeElement.textContent).toContain('Asha');
    button(fixture.nativeElement, 'VoiceBatch.Start').click();
    await settle(fixture);
    expect(api.start).toHaveBeenCalledWith('b1');
  });

  it('uploads a CSV and shows what could not be added', async () => {
    const fixture = await create();
    button(fixture.nativeElement, 'AMC renewals').click();
    await settle(fixture);
    const file = new File(['phone,plan\n9876543210,Gold\n'], 'people.csv', { type: 'text/csv' });
    const upload: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    Object.defineProperty(upload, 'files', { value: [file] });
    upload.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    await settle(fixture);
    expect(api.importRecipients).toHaveBeenCalledWith('b1', 'phone,plan\n9876543210,Gold\n');
    expect(fixture.nativeElement.textContent).toContain('Line 3: no valid phone number.');
  });

  // Creating a batch is on its own page now: see new-voice-batch-page.spec.ts.
});
