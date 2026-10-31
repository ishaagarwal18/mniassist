import { LocalizationService } from '@abp/ng.core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArVoiceAgentBuilder, VoiceAgentApply } from './voice-agent-builder';
import { agentFileText, emptyDefinition } from './voice-agent-files';
import { VoiceAgentService } from './voice-agent.service';
import { VoicePlaybookService } from './voice-playbooks';

describe('voice agent builder', () => {
  const api = {
    draft: vi.fn(),
    templates: vi.fn(),
    saveTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  };
  const current = {
    ...emptyDefinition(),
    name: 'Pump sales',
    instructions: 'Sell pumps.',
    greeting: 'Hello, I am an AI assistant.',
    language: 'hi',
    tools: { ...emptyDefinition().tools!, actingUserId: 'user-1', raiseTickets: true },
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.templates.mockReturnValue(
      of([
        {
          id: 't1',
          name: 'Boiler service',
          folder: '',
          creationTime: '',
          agent: { ...current, name: 'Boiler' },
        },
        { id: 't2', name: 'Pump sales', folder: 'Sales', creationTime: '', agent: current },
      ]),
    );
    TestBed.configureTestingModule({
      imports: [ArVoiceAgentBuilder],
      providers: [
        { provide: VoiceAgentService, useValue: api },
        { provide: VoicePlaybookService, useValue: { getList: () => of([]) } },
        { provide: LocalizationService, useValue: { instant: (key: string) => key } },
      ],
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArVoiceAgentBuilder);
    fixture.componentRef.setInput('current', current);
    const applied: VoiceAgentApply[] = [];
    fixture.componentInstance.apply.subscribe((a) => applied.push(a));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement, applied };
  }
  const button = (root: HTMLElement, key: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(key))!;

  it('drafts from a description in the agent’s language and keeps the draft’s own actions', async () => {
    api.draft.mockReturnValue(of({ ...emptyDefinition(), name: 'Spares desk' }));
    const { fixture, root, applied } = await create();
    const description = root.querySelector('textarea')!;
    description.value = 'We sell spares for industrial pumps across Gujarat.';
    description.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button(root, 'VoiceAgent.Builder.draft').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.draft).toHaveBeenCalledWith(
      'We sell spares for industrial pumps across Gujarat.',
      'prompt',
      'hi',
    );
    expect(applied).toEqual([
      { agent: expect.objectContaining({ name: 'Spares desk' }), keepTools: true },
    ]);
    expect(root.textContent).toContain('VoiceAgent.Builder.drafted');
  });

  it('says when no analysis model is set up', async () => {
    api.draft.mockReturnValue(
      throwError(() => ({ error: { error: { code: 'AutoReach:VoiceAgentBuilderUnavailable' } } })),
    );
    const { fixture, root, applied } = await create();
    const description = root.querySelector('textarea')!;
    description.value = 'An agent that books boiler service visits.';
    description.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button(root, 'VoiceAgent.Builder.draft').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(applied).toEqual([]);
    expect(root.querySelector('[role="alert"]')!.textContent).toContain(
      'VoiceAgent.Builder.unavailable',
    );
  });

  it('lists templates by folder, applies one without workspace ids, and saves the draft without them', async () => {
    api.saveTemplate.mockReturnValue(
      of({ id: 't3', name: 'Copy', folder: 'Sales', creationTime: '', agent: current }),
    );
    const { fixture, root, applied } = await create();
    const groups = [...root.querySelectorAll('optgroup')].map((g) => g.label);
    expect(groups).toEqual(['AutoReach::VoiceAgent.Library.noFolder', 'Sales']);
    const select = [...root.querySelectorAll('select')].find((s) =>
      s.querySelector('option[value="t2"]'),
    )!;
    select.value = 't2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    button(root, 'VoiceAgent.Template.apply').click();
    expect(applied[0].keepTools).toBe(false);
    expect(applied[0].agent.tools?.actingUserId).toBeNull();
    expect(applied[0].agent.tools?.raiseTickets).toBe(true);

    fixture.detectChanges();
    button(root, 'VoiceAgent.Library.save').click();
    await fixture.whenStable();
    const [name, folder, agent] = api.saveTemplate.mock.calls[0];
    expect([name, folder]).toEqual(['Pump sales', 'Sales']);
    expect(agent.tools.actingUserId).toBeNull();
  });

  it('imports an exported file and refuses anything else', async () => {
    const { fixture, root, applied } = await create();
    const input = root.querySelector('input[type="file"]') as HTMLInputElement;
    const pick = async (text: string) => {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [new File([text], 'agent.json', { type: 'application/json' })],
      });
      input.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 0));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await pick(agentFileText(current));
    expect(applied[0].agent.name).toBe('Pump sales');
    expect(applied[0].agent.tools?.actingUserId).toBeNull();
    await pick('{"format":"something-else"}');
    expect(applied.length).toBe(1);
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('VoiceAgent.File.notAgent');
  });
});
