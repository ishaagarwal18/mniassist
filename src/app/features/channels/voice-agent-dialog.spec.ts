import { LocalizationPipe, LocalizationService } from '@abp/ng.core';
import { Component, Pipe, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityDirectoryService } from '../../proxy/activities/activity.service';
import { TeamService } from '../../proxy/identity/team.service';
import { TemplateService } from '../../proxy/messaging/template.service';
import { ArDialog } from '../../ui/dialog';
import { isSubmitClick } from '../../ui/form-validation';
import { ArVoiceAgentDialog } from './voice-agent-dialog';
import { ArVoiceAgentTest } from './voice-agent-test';
import { VoiceAgentService, VoiceAgentSettings } from './voice-agent.service';
import { VoiceFunctionService } from '../calls/voice-functions';
import { IntegrationService } from '../../proxy/integrations/integration.service';

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
    templates: vi.fn(),
    review: vi.fn(),
    draft: vi.fn(),
    saveTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    previewVoice: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.get.mockReturnValue(of({ ...initial }));
    api.templates.mockReturnValue(of([]));
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
        { provide: VoiceFunctionService, useValue: { getList: () => of([]) } },
        {
          provide: IntegrationService,
          useValue: { getList: () => of({ items: [], totalCount: 0 }) },
        },
        // The builder, flow and compare components use ABP's own pipe, which reads this.
        { provide: LocalizationService, useValue: { instant: (key: string) => key } },
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
        {
          provide: TeamService,
          useValue: {
            getList: () =>
              of({
                items: [
                  { id: 'team-1', name: 'Sales', isActive: true },
                  { id: 'team-2', name: 'Service desk', isActive: true },
                  { id: 'team-3', name: 'Old desk', isActive: false },
                ],
                totalCount: 3,
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
    const details = [...fixture.nativeElement.querySelectorAll('details')].find(
      (d: HTMLDetailsElement) =>
        d.querySelector('summary')?.textContent?.trim() === 'AutoReach::VoiceAgent.History',
    ) as HTMLDetailsElement;
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

  it('looks up the caller’s account without an acting user, but sends payment links only with one', async () => {
    const fixture = await create();
    const tick = (key: string) =>
      (
        [...fixture.nativeElement.querySelectorAll('.tools label.check')].find((l: Element) =>
          l.textContent?.includes(`VoiceAgent.Tools.${key}`),
        ) as HTMLElement
      )
        .querySelector('input')!
        .click();
    tick('balance');
    tick('orders');
    tick('contracts');
    tick('paymentLinks');
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.update).not.toHaveBeenCalled(); // a payment reminder is a write

    tick('paymentLinks');
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    const tools = api.update.mock.calls[0][1].tools;
    expect(tools).toMatchObject({
      lookUpBalance: true,
      lookUpOrders: true,
      lookUpContracts: true,
      sendPaymentLinks: false,
    });
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

  it('hands calls to people only with a team, keeping the order the teams were ticked', async () => {
    const fixture = await create();
    const root: HTMLElement = fixture.nativeElement;
    const check = (text: string) =>
      [...root.querySelectorAll('label.check')]
        .find((l) => l.textContent?.includes(text))!
        .querySelector('input') as HTMLInputElement;
    check('VoiceAgent.Tools.transfer').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.textContent).not.toContain('Old desk');
    button(root, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.update).not.toHaveBeenCalled();
    expect(root.textContent).toContain('VoiceAgent.Tools.invalid');

    check('Service desk').click();
    check('Sales').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(check('Service desk').parentElement!.textContent).toContain('transferDefault');
    button(root, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    const tools = api.update.mock.calls[0][1].tools;
    expect(tools.transferToPeople).toBe(true);
    expect(tools.transferTeamIds).toEqual(['team-2', 'team-1']);
  });

  it('saves a conversation flow only once every stage has a name and a goal', async () => {
    const fixture = await create();
    const root: HTMLElement = fixture.nativeElement;
    const type = [...root.querySelectorAll('select')].find((s) =>
      s.textContent?.includes('VoiceAgent.Type.flow'),
    )!;
    type.value = 'flow';
    type.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    button(root, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.update).not.toHaveBeenCalled();
    expect(root.textContent).toContain('VoiceAgent.Flow.incomplete');

    const stage = root.querySelector('ar-voice-agent-flow .stage')!;
    const name = stage.querySelector('input') as HTMLInputElement;
    name.value = 'Ask for budget';
    name.dispatchEvent(new Event('input'));
    const goal = stage.querySelector('textarea') as HTMLTextAreaElement;
    goal.value = 'Find the budget range.';
    goal.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    button(root, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    const saved = api.update.mock.calls[0][1];
    expect(saved.type).toBe('flow');
    expect(saved.flow.stages).toEqual([
      { key: 'ask_for_budget', name: 'Ask for budget', goal: 'Find the budget range.', next: [] },
    ]);
  });

  it('reviews the saved draft before publishing, showing fixed checks in the user language', async () => {
    api.get.mockReturnValue(of({ ...initial, draftVersionId: 'saved-draft' }));
    api.review.mockReturnValue(
      of({
        modelReviewed: true,
        findings: [
          { severity: 'warning', source: 'check', code: 'transfer_off', text: 'English text' },
          { severity: 'suggestion', source: 'model', text: 'Ask one thing at a time.' },
        ],
      }),
    );
    const fixture = await create();
    const root: HTMLElement = fixture.nativeElement;
    button(root, 'VoiceAgent.Publication.publish').click();
    fixture.detectChanges();
    button(root, 'VoiceAgent.Review').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.review).toHaveBeenCalledWith(expect.objectContaining({ name: 'Enquiry agent' }));
    expect(api.publish).not.toHaveBeenCalled();
    const findings = root.querySelector('.findings')!.textContent!;
    expect(findings).toContain('VoiceAgent.Review.transfer_off');
    expect(findings).not.toContain('English text');
    expect(findings).toContain('Ask one thing at a time.');
    expect(root.textContent).toContain('VoiceAgent.Review.byModel');
  });

  it('compares two picked versions, older on the left', async () => {
    api.versions.mockReturnValue(
      of([
        {
          id: 'v2',
          savedAtUtc: '2026-10-26T10:00:00Z',
          savedBy: null,
          restoredFrom: null,
          profile: { ...initial, greeting: 'Namaste, I am an AI assistant.' },
        },
        {
          id: 'v1',
          savedAtUtc: '2026-10-25T10:00:00Z',
          savedBy: null,
          restoredFrom: null,
          profile: { ...initial },
        },
      ]),
    );
    const fixture = await create();
    await openHistory(fixture);
    const root: HTMLElement = fixture.nativeElement;
    const picks = [...root.querySelectorAll('label.check')]
      .filter((l) => l.textContent?.includes('VoiceAgent.Compare.pick'))
      .map((l) => l.querySelector('input') as HTMLInputElement);
    expect(picks.length).toBe(2);
    picks[0].click();
    picks[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const changed = [...root.querySelectorAll('ar-voice-agent-compare tr.changed')];
    expect(changed.length).toBe(1);
    expect(changed[0].textContent).toContain('VoiceAgent.Greeting');
    const cells = changed[0].querySelectorAll('td');
    expect(cells[0].textContent).toContain('I am an AI assistant.');
    expect(cells[1].textContent).toContain('Namaste');
    expect(root.querySelector('ar-voice-agent-compare')!.textContent).toContain(
      'VoiceAgent.Compare.sameInstructions',
    );
  });

  it('shows which numbers a shared agent answers on', async () => {
    api.get.mockReturnValue(
      of({
        ...initial,
        isShared: true,
        numbers: [{ channelId: 'ch1', name: 'Meridian Sales', phoneNumber: '+91 98000 00001' }],
      }),
    );
    const fixture = await create();
    const notice = fixture.nativeElement.querySelector('.shared').textContent;
    expect(notice).toContain('SharedAgents.AnswersOn');
    expect(notice).toContain('Meridian Sales (+91 98000 00001)');
  });

  it('tells a number that a shared agent answers its calls instead', async () => {
    api.get.mockReturnValue(of({ ...initial, sharedAgentId: 'a1', sharedAgentName: 'Front desk' }));
    const fixture = await create();
    const notice = fixture.nativeElement.querySelector('.shared').textContent;
    expect(notice).toContain('SharedAgents.NumberUses');
    expect(notice).toContain('Front desk');
  });

  it('saves the chosen model tier and voice, and previews the greeting in that voice', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    // The test DOM has no object URLs; the dialog only needs one to hand to an Audio element.
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:preview',
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
    api.previewVoice.mockReturnValue(of(new Blob(['mp3'], { type: 'audio/mpeg' })));
    const fixture = await create();
    const root: HTMLElement = fixture.nativeElement;
    const select = (option: string) =>
      [...root.querySelectorAll('select')].find((s) =>
        s.querySelector(`option[value="${option}"]`),
      )!;
    const voice = select('coral');
    voice.value = 'coral';
    voice.dispatchEvent(new Event('change'));
    const model = select('economy');
    model.value = 'economy';
    model.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    button(root, 'VoiceAgent.Voice.preview').click();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    expect(api.previewVoice).toHaveBeenCalledWith('coral', 'I am an AI assistant.');
    expect(play).toHaveBeenCalled();

    button(root, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    const saved = api.update.mock.calls[0][1];
    expect(saved.voice).toBe('coral');
    expect(saved.tier).toBe('economy');
    play.mockRestore();
  });

  it('offers the speech pipeline only when the call relay can run it, and saves it', async () => {
    const fixture = await create();
    const root: HTMLElement = fixture.nativeElement;
    const pipeline = () => root.querySelector<HTMLOptionElement>('option[value="pipeline"]')!;
    expect(pipeline().disabled).toBe(true);

    api.get.mockReturnValue(of({ ...initial, engines: ['realtime', 'pipeline'] }));
    const ready = await create();
    const page: HTMLElement = ready.nativeElement;
    const engine = page.querySelector<HTMLOptionElement>('option[value="pipeline"]')!
      .parentElement as HTMLSelectElement;
    expect((engine.querySelector('option[value="pipeline"]') as HTMLOptionElement).disabled).toBe(
      false,
    );
    engine.value = 'pipeline';
    engine.dispatchEvent(new Event('change'));
    ready.detectChanges();
    await ready.whenStable();
    expect(page.querySelector('option[value="coral"]')).toBeNull(); // realtime voices don't apply
    expect(page.textContent).toContain('VoiceAgent.Engine.help');
    expect(page.textContent).not.toContain('VoiceAgent.Engine.unavailable');

    button(page, 'VoiceAgent.Save').click();
    await ready.whenStable();
    expect(api.update.mock.calls.at(-1)![1].engine).toBe('pipeline');
  });

  it('saves speech tuning: patience, interruptions, words to recognise and pronunciations', async () => {
    const fixture = await create();
    const root: HTMLElement = fixture.nativeElement;
    const patience = root.querySelector('option[value="patient"]')!
      .parentElement as HTMLSelectElement;
    patience.value = 'patient';
    patience.dispatchEvent(new Event('change'));
    const interruptible = [...root.querySelectorAll<HTMLLabelElement>('label.check')]
      .find((l) => l.textContent?.includes('VoiceAgent.Speech.interruptible'))!
      .querySelector('input') as HTMLInputElement;
    expect(interruptible.checked).toBe(true);
    interruptible.click();
    const vocabulary = [...root.querySelectorAll<HTMLLabelElement>('label.ar-field')]
      .find((l) => l.textContent?.includes('VoiceAgent.Speech.vocabulary'))!
      .querySelector('textarea') as HTMLTextAreaElement;
    vocabulary.value = 'Kirloskar\nSKU-42';
    vocabulary.dispatchEvent(new Event('input'));
    button(root, 'VoiceAgent.Speech.addPronunciation').click();
    fixture.detectChanges();
    await fixture.whenStable();
    const [word, say] = [...root.querySelectorAll<HTMLInputElement>('.speech .field-row input')];
    word.value = 'Sikarwar';
    word.dispatchEvent(new Event('input'));
    say.value = 'Sik-ar-vaar';
    say.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    button(root, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    const saved = api.update.mock.calls.at(-1)![1];
    expect(saved.speech).toMatchObject({
      patience: 'patient',
      interruptible: false,
      vocabulary: ['Kirloskar', 'SKU-42'],
      pronunciations: [{ word: 'Sikarwar', say: 'Sik-ar-vaar' }],
    });
  });

  it('saves the message the agent leaves on voicemail', async () => {
    const fixture = await create();
    const root: HTMLElement = fixture.nativeElement;
    const field = [...root.querySelectorAll<HTMLLabelElement>('label.ar-field')]
      .find((l) => l.textContent?.includes('VoiceAgent.Voicemail'))!
      .querySelector('textarea') as HTMLTextAreaElement;
    field.value = 'Hello, this is Meridian calling about your renewal.';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    button(root, 'VoiceAgent.Save').click();
    await fixture.whenStable();
    expect(api.update.mock.calls.at(-1)![1].voicemailMessage).toBe(
      'Hello, this is Meridian calling about your renewal.',
    );
  });

  it('says when a voice preview is unavailable', async () => {
    api.previewVoice.mockReturnValue(throwError(() => new Error('no key')));
    const fixture = await create();
    button(fixture.nativeElement, 'VoiceAgent.Voice.preview').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('VoiceAgent.Voice.previewFailed');
  });
});
