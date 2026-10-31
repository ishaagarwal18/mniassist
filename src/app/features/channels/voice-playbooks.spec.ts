import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArVoicePlaybooks, VoicePlaybook, VoicePlaybookService } from './voice-playbooks';

const collections: VoicePlaybook = {
  key: 'collections',
  name: 'Payment collections',
  purpose: 'Remind customers about overdue invoices.',
  direction: 'outbound',
  agent: {
    name: 'Payments caller',
    instructions: 'Use get_balance.',
    greeting: 'Hello, I am the AI assistant.',
    voice: 'marin',
    language: 'auto',
    maxSeconds: 240,
    tools: { lookUpBalance: true, sendPaymentLinks: true } as never,
    analysis: { summarize: true, sentiment: true, goal: 'A payment date is agreed.', fields: [] },
  },
  requirements: [
    { key: 'acting_user', label: 'The person the agent acts for', met: null, hint: 'Actions tab' },
    { key: 'invoices', label: 'Outstanding invoices', met: false, hint: 'Settings, Integrations' },
    { key: 'outbound_line', label: 'A way to call customers', met: true, hint: 'Voice line' },
  ],
  scenarios: [{ say: 'I’ll pay on Friday.', expect: 'Records the promised date.' }],
};

describe('Voice playbooks', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ArVoicePlaybooks],
      providers: [
        { provide: VoicePlaybookService, useValue: { getList: () => of([collections]) } },
      ],
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  it('shows what each playbook does, what is missing and what to try, and applies it to the draft', async () => {
    const fixture = TestBed.createComponent(ArVoicePlaybooks);
    const applied = vi.fn();
    fixture.componentInstance.apply.subscribe(applied);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent!;
    expect(text).toContain('Payment collections');
    expect(text).toContain('calls customers');
    expect(text).toContain('The agent tells balances and sends payment links.');
    expect(text).toContain('Missing: Outstanding invoices');
    expect(text).toContain('Choose: The person the agent acts for');
    expect(text).toContain('✓ A way to call customers');
    expect(text).toContain('I’ll pay on Friday.');

    root.querySelector('button')!.click();
    fixture.detectChanges();
    expect(applied).toHaveBeenCalledWith({ agent: collections.agent, keepTools: false });
    expect(root.textContent).toContain('Payment collections is in the draft');
  });
});
