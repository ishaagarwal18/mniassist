import { PermissionService } from '@abp/ng.core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArAiCallCompliance, VoiceCompliance, VoiceComplianceService } from './ai-calls';

const rules: VoiceCompliance = {
  noticeEnabled: true,
  notice: 'This call is recorded and transcribed.',
  callingFrom: '09:00',
  callingTo: '21:00',
  transcriptRetentionDays: 180,
  optedOutOfCalls: 3,
};

describe('AI call compliance', () => {
  const api = { get: vi.fn(), update: vi.fn() };
  let granted = true;
  beforeEach(() => {
    vi.resetAllMocks();
    granted = true;
    api.get.mockReturnValue(of(rules));
    api.update.mockReturnValue(of({ ...rules, noticeEnabled: false }));
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    TestBed.configureTestingModule({
      imports: [ArAiCallCompliance],
      providers: [
        { provide: VoiceComplianceService, useValue: api },
        { provide: PermissionService, useValue: { getGrantedPolicy: () => granted } },
      ],
    });
    const fixture = TestBed.createComponent(ArAiCallCompliance);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('shows the notice and the rules every AI call follows', async () => {
    const { root } = await create();
    const text = root.textContent!;
    expect(text).toContain('09:00');
    expect(text).toContain('21:00');
    expect(text).toContain('3 contacts are opted out of calls');
    expect(text).toContain('180');
    expect((root.querySelector('.ac__text input') as HTMLInputElement).value).toBe(
      'This call is recorded and transcribed.',
    );
  });

  it('turns the notice off and saves', async () => {
    const { fixture, root } = await create();
    (root.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    fixture.detectChanges();
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Save'))!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.update).toHaveBeenCalledWith(false, 'This call is recorded and transcribed.');
    expect(root.textContent).toContain('Saved. New AI calls use it.');
  });

  it('refuses an empty notice that is turned on', async () => {
    const { fixture, root } = await create();
    const input = root.querySelector('.ac__text input') as HTMLInputElement;
    input.value = '  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Save'))!.click();
    fixture.detectChanges();
    expect(api.update).not.toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Enter the notice');
  });

  it('is read-only without the consent text permission', async () => {
    granted = false;
    const { root } = await create();
    expect([...root.querySelectorAll('button')].some((b) => b.textContent?.includes('Save'))).toBe(
      false,
    );
    expect((root.querySelector('.ac__text input') as HTMLInputElement).disabled).toBe(true);
  });
});
