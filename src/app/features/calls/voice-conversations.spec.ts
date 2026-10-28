import { LocalizationPipe, RestService } from '@abp/ng.core';
import { Component, Pipe, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VoiceConversationListItemDto,
  VoiceConversationSnapshotDto,
} from '../../proxy/messaging/whats-app-call.service';
import { ArDialog } from '../../ui/dialog';
import { ArVoiceConversations } from './voice-conversations';

vi.mock('@syncfusion/ej2-angular-popups', () => ({ DialogComponent: class {} }));

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

const row = (
  callId: string,
  contactName: string | null,
  transcriptIncomplete = false,
): VoiceConversationListItemDto => ({
  callId,
  contactId: 'contact-' + callId,
  contactName,
  callStartedAtUtc: '2026-10-26T09:00:00Z',
  expiresAtUtc: '2027-04-24T09:00:00Z',
  ended: true,
  transcriptIncomplete,
  preview: 'Preview of ' + callId,
});
const detail = (callId: string, transcriptIncomplete = false): VoiceConversationSnapshotDto => ({
  callId,
  persisted: true,
  ended: true,
  completedResponses: 1,
  expiresAtUtc: '2027-04-24T09:00:00Z',
  truncated: false,
  transcriptEnabled: true,
  transcriptIncomplete,
  inputTokens: 1,
  outputTokens: 1,
  turns: [
    {
      itemId: 'i1',
      speaker: 'caller',
      text: 'Text of ' + callId,
      receivedAtUtc: '2026-10-26T09:00:05Z',
    },
  ],
});

describe('AI conversations', () => {
  const request = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    request.mockImplementation((req: { url: string }) =>
      req.url.endsWith('/conversations')
        ? of({ items: [row('a', 'Asha Pumps'), row('b', null, true)], totalCount: 2 })
        : of(detail('a')),
    );
    TestBed.configureTestingModule({
      imports: [ArVoiceConversations],
      providers: [{ provide: RestService, useValue: { request } }],
    }).overrideComponent(ArVoiceConversations, {
      remove: { imports: [ArDialog, LocalizationPipe] },
      add: { imports: [TestDialog, TestLocalization] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArVoiceConversations);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  const buttons = (root: HTMLElement, text: string) =>
    [...root.querySelectorAll('button')].filter((b) => b.textContent?.includes(text));

  it('lists the first page with caller names, a fallback name, the range and lost-state notice', async () => {
    const fixture = await create();
    expect(request.mock.calls[0][0].params).toEqual({
      query: '',
      skipCount: 0,
      maxResultCount: 10,
    });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Asha Pumps');
    expect(text).toContain('VoiceConversation.UnknownContact');
    expect(text).toContain('VoiceConversation.TranscriptIncomplete');
    expect(text).toContain('VoiceConversation.Range 1 2 2');
  });

  it('opens an attributed transcript and flags one whose final state was lost', async () => {
    request.mockImplementation((req: { url: string }) =>
      req.url.endsWith('/conversations')
        ? of({ items: [row('a', 'Asha Pumps')], totalCount: 1 })
        : of(detail('a', true)),
    );
    const fixture = await create();
    buttons(fixture.nativeElement, 'Asha Pumps')[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(request.mock.calls[1][0].url).toBe('/api/auto-reach/whats-app-call/a/conversation');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('VoiceConversation.caller');
    expect(text).toContain('Text of a');
    expect(text).toContain('VoiceConversation.TranscriptIncomplete');
  });

  it('shows how quickly the agent answered', async () => {
    request.mockImplementation((req: { url: string }) =>
      req.url.endsWith('/conversations')
        ? of({ items: [row('a', 'Asha Pumps')], totalCount: 1 })
        : of({
            ...detail('a'),
            latency: { replies: 4, medianMs: 820, p90Ms: 1340, maxMs: 1500, greetingMs: 1100 },
          }),
    );
    const fixture = await create();
    buttons(fixture.nativeElement, 'Asha Pumps')[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('VoiceConversation.Latency 0.8 s 1.3 s 4');
    expect(text).toContain('VoiceConversation.GreetingLatency 1.1 s');
  });

  it('shows the estimated cost and what it is made of', async () => {
    request.mockImplementation((req: { url: string }) =>
      req.url.endsWith('/conversations')
        ? of({ items: [row('a', 'Asha Pumps')], totalCount: 1 })
        : of({
            ...detail('a'),
            cost: { modelPaise: 56, speechPaise: 0, linePaise: 60, totalPaise: 116 },
          }),
    );
    const fixture = await create();
    buttons(fixture.nativeElement, 'Asha Pumps')[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'VoiceConversation.Cost ₹1.16 ₹0.56 ₹0.00 ₹0.60',
    );
  });

  it('drops a transcript that arrives after a new search started', async () => {
    const late = new Subject<VoiceConversationSnapshotDto>();
    request.mockImplementation((req: { url: string }) =>
      req.url.endsWith('/conversations')
        ? of({ items: [row('a', 'Asha Pumps')], totalCount: 1 })
        : late,
    );
    const fixture = await create();
    buttons(fixture.nativeElement, 'Asha Pumps')[0].click();
    fixture.detectChanges();
    buttons(fixture.nativeElement, 'VoiceConversation.Search')[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    late.next(detail('a'));
    late.complete();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Text of a');
    expect(buttons(fixture.nativeElement, 'Asha Pumps')[0].disabled).toBe(false);
  });

  it('reports a failed search instead of showing an empty result as success', async () => {
    request.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = await create();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'VoiceConversation.Error',
    );
  });
});
