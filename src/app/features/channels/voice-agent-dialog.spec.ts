import { LocalizationPipe } from '@abp/ng.core';
import { Component, Pipe, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityDirectoryService } from '../../proxy/activities/activity.service';
import { TemplateService } from '../../proxy/messaging/template.service';
import { ArDialog } from '../../ui/dialog';
import { isSubmitClick } from '../../ui/form-validation';
import { ArVoiceAgentDialog } from './voice-agent-dialog';
import { ArVoiceAgentTest } from './voice-agent-test';
import { VoiceAgentService, VoiceAgentSettings } from './voice-agent.service';

vi.mock('@syncfusion/ej2-angular-popups', () => ({ DialogComponent: class {} }));
vi.mock('@syncfusion/ej2-angular-navigations', () => ({
  TabAllModule: class {},
  TabComponent: class {},
  TabItemsDirective: class {},
  TabItemDirective: class {},
}));

@Component({
  selector: 'ar-dialog',
  template: '<ng-content /><ng-content select="[dialogActions]" />',
})
class TestDialog {
  readonly title = input<string>();
  readonly width = input<string>();
  readonly dismiss = output<void>();
}
@Component({ selector: 'ar-voice-agent-test', template: '' })
class TestAgentTest {
  readonly channelId = input<string>();
}
@Pipe({ name: 'abpLocalization' })
class TestLocalization {
  transform(value: string) {
    return value;
  }
}

const initial: VoiceAgentSettings = {
  channelId: 'host-channel',
  hasConfiguration: false,
  serverAllowed: false,
  name: 'Enquiry agent',
  instructions: 'Answer enquiries.',
  greeting: 'I am an AI assistant.',
  voice: 'marin',
  language: 'auto',
  maxSeconds: 120,
  concurrencyStamp: 'revision-1',
};

describe('voice agent settings', () => {
  const api = {
    get: vi.fn(),
    update: vi.fn(),
    versions: vi.fn(),
    restore: vi.fn(),
    publish: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.get.mockReturnValue(of({ ...initial }));
    api.update.mockReturnValue(
      of({ ...initial, hasConfiguration: true, concurrencyStamp: 'revision-2' }),
    );
    api.versions.mockReturnValue(
      of([
        {
          id: 'version-1',
          savedAtUtc: '2026-10-25T10:00:00Z',
          savedBy: null,
          restoredFrom: null,
          profile: { ...initial, name: 'Previous agent' },
        },
      ]),
    );
    api.restore.mockReturnValue(
      of({ ...initial, name: 'Previous agent', concurrencyStamp: 'revision-3' }),
    );
    TestBed.configureTestingModule({
      imports: [ArVoiceAgentDialog],
      providers: [
        { provide: VoiceAgentService, useValue: api },
        {
          provide: ActivityDirectoryService,
          useValue: { getUsers: () => of([{ userId: 'user-1', name: 'Priya Sales' }]) },
        },
        {
          provide: TemplateService,
          useValue: {
            getList: () =>
              of({
                items: [{ id: 'tpl-1', name: 'call_follow_up', languageCode: 'en' }],
                totalCount: 1,
              }),
          },
        },
      ],
    }).overrideComponent(ArVoiceAgentDialog, {
      remove: { imports: [ArDialog, LocalizationPipe, ArVoiceAgentTest] },
      add: { imports: [TestDialog, TestLocalization, TestAgentTest] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArVoiceAgentDialog);
    fixture.componentRef.setInput('channelId', initial.channelId);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  function button(root: HTMLElement, key: string): HTMLButtonElement {
    return [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(key))!;
  }

  it('loads only the selected channel and explains that saving does not enable answering', async () => {
    const fixture = await create();
    expect(api.get).toHaveBeenCalledWith('host-channel');
    expect(fixture.nativeElement.textContent).toContain('VoiceAgent.Disabled');
    expect(fixture.nativeElement.querySelector('input').value).toBe('Enquiry agent');
  });
  it('requires explicit confirmation to publish the last saved version with its current revision', async () => {
    api.get.mockReturnValue(
      of({ ...initial, draftVersionId: 'saved-draft', hasUnpublishedChanges: true }),
    );
    api.publish.mockReturnValue(
      of({
        ...initial,
        draftVersionId: 'saved-draft',
        publishedVersionId: 'saved-draft',
        concurrencyStamp: 'revision-2',
      }),
    );
    const fixture = await create();
    button(fixture.nativeElement, 'VoiceAgent.Publication.publish').click();
    fixture.detectChanges();
    expect(api.publish).not.toHaveBeenCalled();
    button(fixture.nativeElement, 'VoiceAgent.Publication.confirmButton').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.publish).toHaveBeenCalledWith('host-channel', 'saved-draft', 'revision-1');
    expect(fixture.nativeElement.textContent).toContain('VoiceAgent.Publication.live');
  });

  it('keeps an unpublished draft available after publication fails', async () => {
    api.get.mockReturnValue(
      of({ ...initial, draftVersionId: 'saved-draft', hasUnpublishedChanges: true }),
    );
    api.publish.mockReturnValue(throwError(() => new Error('conflict')));
    const fixture = await create();
    button(fixture.nativeElement, 'VoiceAgent.Publication.publish').click();
    fixture.detectChanges();
    button(fixture.nativeElement, 'VoiceAgent.Publication.confirmButton').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'VoiceAgent.SaveFailed',
    );
    expect(button(fixture.nativeElement, 'VoiceAgent.Publication.publish').disabled).toBe(false);
  });
  it('saves the edited fields and uses the returned revision for the next save', async () => {
    const fixture = await create();
    const name: HTMLInputElement = fixture.nativeElement.querySelector('input');
    name.value = 'Support agent';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.update.mock.calls[0][1].name).toBe('Support agent');
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    expect(api.update.mock.calls[1][1].concurrencyStamp).toBe('revision-2');
  });
  it('rejects an out-of-range duration before calling the API', async () => {
    const fixture = await create();
    const seconds: HTMLInputElement = fixture.nativeElement.querySelector('input[type=number]');
    seconds.value = '601';
    seconds.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    fixture.detectChanges();
    expect(api.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'VoiceAgent.Invalid',
    );
  });
  it('rejects silence timeout shorter than the reminder plus five seconds', async () => {
    api.get.mockReturnValue(of({ ...initial, silenceReminderSeconds: 15, endSilenceSeconds: 19 }));
    const fixture = await create();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    fixture.detectChanges();
    expect(api.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'VoiceAgent.Invalid',
    );
  });
  it('keeps the dialog open and prevents a second save while a save is pending', async () => {
    const pending = new Subject<VoiceAgentSettings>();
    api.update.mockReturnValue(pending);
    const fixture = await create();
    const close = vi.fn();
    fixture.componentInstance.close.subscribe(close);
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    fixture.detectChanges();
    button(fixture.nativeElement, 'VoiceAgent.Close').click();
    expect(close).not.toHaveBeenCalled();
    expect(api.update).toHaveBeenCalledTimes(1);
    pending.next({ ...initial });
    pending.complete();
    await fixture.whenStable();
  });
  it('does not offer to save when loading fails', async () => {
    api.get.mockReturnValue(throwError(() => new Error('unavailable')));
    const fixture = await create();
    expect(button(fixture.nativeElement, 'VoiceAgent.Save').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'VoiceAgent.LoadFailed',
    );
  });
  it('does not show success after a failed save', async () => {
    api.update.mockReturnValue(throwError(() => new Error('conflict')));
    const fixture = await create();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'VoiceAgent.SaveFailed',
    );
    expect(fixture.nativeElement.textContent).not.toContain('VoiceAgent.Saved');
  });
  it('keeps template selection local and only replaces draft text when applied', async () => {
    const fixture = await create();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'support';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(isSubmitClick(button(fixture.nativeElement, 'Template.apply'), true)).toBeNull();
    expect(isSubmitClick(button(fixture.nativeElement, 'VoiceAgent.Save'), true)).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input').value).toBe(initial.name);
    expect(api.update).not.toHaveBeenCalled();
    button(fixture.nativeElement, 'Template.apply').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input').value).toBe('Support triage assistant');
    expect(api.update).not.toHaveBeenCalled();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    const saved = api.update.mock.calls[0][1];
    expect(saved.instructions).toContain('cannot create tickets');
    expect(saved.voice).toBe(initial.voice);
    expect(saved.language).toBe(initial.language);
    expect(saved.maxSeconds).toBe(initial.maxSeconds);
    expect(saved.concurrencyStamp).toBe(initial.concurrencyStamp);
    expect(saved.serverAllowed).toBe(false);
  });
  it('does not allow a template to replace draft text during a pending save', async () => {
    const pending = new Subject<VoiceAgentSettings>();
    api.update.mockReturnValue(pending);
    const fixture = await create();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'sales';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(select.disabled).toBe(true);
    expect(button(fixture.nativeElement, 'Template.apply').disabled).toBe(true);
    pending.next({ ...initial });
    pending.complete();
    await fixture.whenStable();
  });
  async function openHistory(fixture: Awaited<ReturnType<typeof create>>) {
    const details: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    await fixture.whenStable();
    fixture.detectChanges();
  }
  it('loads history only on demand and restores only after confirmation using the current revision', async () => {
    const fixture = await create();
    expect(api.versions).not.toHaveBeenCalled();
    await openHistory(fixture);
    expect(api.versions).toHaveBeenCalledWith('host-channel');
    button(fixture.nativeElement, 'History.restore').click();
    fixture.detectChanges();
    expect(api.restore).not.toHaveBeenCalled();
    expect(isSubmitClick(button(fixture.nativeElement, 'History.restore'), true)).toBeNull();
    expect(isSubmitClick(button(fixture.nativeElement, 'History.confirmButton'), true)).toBeNull();
    expect(isSubmitClick(button(fixture.nativeElement, 'History.cancel'), true)).toBeNull();
    button(fixture.nativeElement, 'History.confirmButton').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.restore).toHaveBeenCalledWith('host-channel', 'version-1', 'revision-1');
    expect(fixture.nativeElement.querySelector('input').value).toBe('Previous agent');
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    expect(api.update.mock.calls[0][1].concurrencyStamp).toBe('revision-3');
  });
  it('allows cancelling a restore without changing the draft or saving', async () => {
    const fixture = await create();
    await openHistory(fixture);
    button(fixture.nativeElement, 'History.restore').click();
    fixture.detectChanges();
    button(fixture.nativeElement, 'History.cancel').click();
    fixture.detectChanges();
    expect(api.restore).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('input').value).toBe(initial.name);
  });
  it('preserves the draft and does not show success when restore conflicts', async () => {
    api.restore.mockReturnValue(throwError(() => new Error('conflict')));
    const fixture = await create();
    await openHistory(fixture);
    button(fixture.nativeElement, 'History.restore').click();
    fixture.detectChanges();
    button(fixture.nativeElement, 'History.confirmButton').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').value).toBe(initial.name);
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'VoiceAgent.SaveFailed',
    );
    expect(fixture.nativeElement.textContent).not.toContain('VoiceAgent.Saved');
  });
  it('allows retrying failed history loading without blocking normal settings editing', async () => {
    api.versions.mockReturnValueOnce(throwError(() => new Error('unavailable')));
    const fixture = await create();
    await openHistory(fixture);
    expect(fixture.nativeElement.textContent).toContain('History.failed');
    expect(button(fixture.nativeElement, 'VoiceAgent.Save').disabled).toBe(false);
    button(fixture.nativeElement, 'History.retry').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('History.failed');
    expect(api.versions).toHaveBeenCalledTimes(2);
  });

  it('refuses enabled actions without an acting user, then saves them with the chosen user', async () => {
    const fixture = await create();
    const checkbox = (index: number) =>
      fixture.nativeElement.querySelectorAll('.tools input[type="checkbox"]')[
        index
      ] as HTMLInputElement;
    checkbox(2).click(); // raise tickets
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('VoiceAgent.Tools.invalid');

    const actingUser: HTMLSelectElement = fixture.nativeElement.querySelector('.tools select');
    expect(actingUser.textContent).toContain('Priya Sales');
    actingUser.value = actingUser.options[1].value;
    actingUser.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    const tools = api.update.mock.calls[0][1].tools;
    expect(tools.actingUserId).toBe('user-1');
    expect(tools.raiseTickets).toBe(true);
    expect(tools.bookMeetings).toBe(false);
  });

  it('offers only approved templates for follow-ups once follow-ups are enabled', async () => {
    const fixture = await create();
    expect(fixture.nativeElement.textContent).not.toContain('call_follow_up');
    (
      fixture.nativeElement.querySelectorAll('.tools input[type="checkbox"]')[3] as HTMLInputElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('call_follow_up (en)');
  });
});
