import { LocalizationPipe } from '@abp/ng.core';
import { Component, Pipe, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArTopbar } from '../../layout/topbar';
import { SharedVoiceAgentService } from '../channels/shared-voice-agent.service';
import { ArVoiceAgentDialog } from '../channels/voice-agent-dialog';
import { ArVoiceAgents } from './voice-agents';

vi.mock('@syncfusion/ej2-angular-popups', () => ({ DialogComponent: class {} }));
vi.mock('@syncfusion/ej2-angular-navigations', () => ({
  TabAllModule: class {},
  TabComponent: class {},
  TabItemsDirective: class {},
  TabItemDirective: class {},
}));

@Component({ selector: 'ar-topbar', template: '<ng-content />' })
class TestTopbar {
  readonly title = input<string>();
  readonly help = input<string>();
}
@Component({
  selector: 'ar-voice-agent-dialog',
  template: '<p class="editing">{{ channelId() }}</p>',
})
class TestAgentDialog {
  readonly channelId = input<string>();
  readonly close = output<void>();
}
@Pipe({ name: 'abpLocalization' })
class TestLocalization {
  transform(value: string) {
    return value;
  }
}

describe('AI voice agents', () => {
  const api = {
    list: vi.fn(),
    channels: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    assign: vi.fn(),
    unassign: vi.fn(),
    assignments: vi.fn(),
  };
  const frontDesk = {
    id: 'a1',
    name: 'Front desk',
    isPublished: false,
    hasUnpublishedChanges: true,
    type: 'prompt' as const,
    numbers: [{ channelId: 'ch1', name: 'Meridian Sales', phoneNumber: '+91 98000 00001' }],
    creationTime: '2026-10-27T05:00:00Z',
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockReturnValue(of([frontDesk]));
    api.channels.mockReturnValue(
      of([
        {
          channelId: 'ch1',
          name: 'Meridian Sales',
          phoneNumber: '+91 98000 00001',
          agentId: 'a1',
          agentName: 'Front desk',
          hasOwnAgent: true,
        },
        {
          channelId: 'ch2',
          name: 'Meridian Service',
          phoneNumber: '+91 98000 00002',
          agentId: 'a9',
          agentName: 'Night desk',
          hasOwnAgent: false,
        },
      ]),
    );
    api.create.mockReturnValue(of({ ...frontDesk, id: 'a2', name: 'Spares', numbers: [] }));
    api.assign.mockReturnValue(of(frontDesk));
    api.unassign.mockReturnValue(of(undefined));
    api.delete.mockReturnValue(of(undefined));
    api.assignments.mockReturnValue(
      of([
        {
          channelId: 'ch1',
          channelName: 'Meridian Sales',
          phoneNumber: '+91 98000 00001',
          assignedAtUtc: '2026-10-27T05:00:00Z',
          assignedBy: 'Priya',
        },
      ]),
    );
    TestBed.configureTestingModule({
      imports: [ArVoiceAgents],
      providers: [{ provide: SharedVoiceAgentService, useValue: api }],
    }).overrideComponent(ArVoiceAgents, {
      remove: { imports: [ArTopbar, LocalizationPipe, ArVoiceAgentDialog] },
      add: { imports: [TestTopbar, TestLocalization, TestAgentDialog] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArVoiceAgents);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve)); // the list and numbers load together
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }
  const button = (root: HTMLElement, key: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(key))!;
  const settle = async (fixture: Awaited<ReturnType<typeof create>>['fixture']) => {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  it('lists agents with their numbers and warns when an unpublished agent has numbers', async () => {
    const { root } = await create();
    expect(root.querySelector('h2')!.textContent).toContain('Front desk');
    expect(root.querySelector('.numbers')!.textContent).toContain('Meridian Sales');
    expect(root.textContent).toContain('SharedAgents.NotAnswering');
    const options = [...root.querySelectorAll('.assign option')].map((o) => o.textContent!.trim());
    expect(options.some((o) => o.includes('Meridian Service') && o.includes('Night desk'))).toBe(
      true,
    );
    expect(options.some((o) => o.includes('Meridian Sales'))).toBe(false);
  });

  it('creates an agent from a number’s agent and opens it for editing', async () => {
    const { fixture, root } = await create();
    const name = root.querySelector('.create input') as HTMLInputElement;
    name.value = 'Spares';
    name.dispatchEvent(new Event('input'));
    const from = root.querySelector('.create select') as HTMLSelectElement;
    from.value = 'ch2';
    from.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    button(root, 'SharedAgents.Create').click();
    await settle(fixture);
    expect(api.create).toHaveBeenCalledWith('Spares', 'ch2');
    expect(root.querySelector('.editing')!.textContent).toBe('a2');
  });

  it('assigns, unassigns, shows history and deletes only after confirmation', async () => {
    const { fixture, root } = await create();
    const assign = root.querySelector('.assign select') as HTMLSelectElement;
    assign.value = 'ch2';
    assign.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(api.assign).toHaveBeenCalledWith('a1', 'ch2');

    button(root, 'SharedAgents.Unassign').click();
    await settle(fixture);
    expect(api.unassign).toHaveBeenCalledWith('ch1');

    button(root, 'SharedAgents.History').click();
    await settle(fixture);
    expect(root.querySelector('.history')!.textContent).toContain('Priya');
    expect(root.querySelector('.history')!.textContent).toContain('SharedAgents.Current');

    button(root, 'SharedAgents.Delete').click();
    fixture.detectChanges();
    expect(api.delete).not.toHaveBeenCalled();
    const confirm = [...root.querySelectorAll('[role="alert"] button')].find((b) =>
      b.textContent?.includes('SharedAgents.Delete'),
    ) as HTMLButtonElement;
    confirm.click();
    await settle(fixture);
    expect(api.delete).toHaveBeenCalledWith('a1');
  });
});
