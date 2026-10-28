import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArTopbar } from '../../layout/topbar';
import { AiProviderSettings, AiProviderSettingsService, ArAiProviders } from './ai-providers';

@Component({ selector: 'ar-topbar', template: '<ng-content />' })
class TestTopbar {
  readonly title = input<string>();
  readonly help = input<string>();
}

const fromConfig: AiProviderSettings = {
  analysisProvider: 'openai',
  analysisSource: 'config',
  effectiveModel: 'gpt-4.1-mini',
  providers: [
    { key: 'openai', name: 'OpenAI', configured: true, configKey: 'Ai:OpenAi:ApiKey', inUse: true },
    {
      key: 'sarvam',
      name: 'Sarvam AI',
      configured: false,
      configKey: 'Ai:Sarvam:ApiKey',
      inUse: false,
    },
  ],
  voiceEngineFallback: true,
  voiceEngines: ['realtime'],
  voiceCostRates: {
    realtimeInputPerMillion: 281600,
    realtimeOutputPerMillion: 563200,
    economyInputPerMillion: 88000,
    economyOutputPerMillion: 176000,
    chatInputPerMillion: 3520,
    chatOutputPerMillion: 14080,
    speechToTextPerMinute: 68,
    textToSpeechPerThousandCharacters: 500,
    whatsAppPerMinute: 0,
    exotelPerMinute: 60,
    sipPerMinute: 38,
  },
};

describe('AI providers', () => {
  const api = { get: vi.fn(), update: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.get.mockReturnValue(of(fromConfig));
    api.update.mockReturnValue(
      of({
        ...fromConfig,
        analysisProvider: 'anthropic',
        analysisSource: 'setting',
        effectiveModel: 'claude',
      }),
    );
    TestBed.configureTestingModule({
      imports: [ArAiProviders],
      providers: [{ provide: AiProviderSettingsService, useValue: api }],
    }).overrideComponent(ArAiProviders, {
      remove: { imports: [ArTopbar] },
      add: { imports: [TestTopbar] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArAiProviders);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('shows the model in use and which keys are set, never their values', async () => {
    const { root } = await create();
    expect(root.textContent).toContain('In use now: gpt-4.1-mini');
    expect(root.textContent).toContain('Chosen by the server configuration');
    const rows = [...root.querySelectorAll('tbody tr')].map((r) => r.textContent!);
    expect(rows[0]).toContain('Set');
    expect(rows[1]).toContain('Not set');
    expect(rows[1]).toContain('(not used yet)');
    expect(rows[1]).toContain('Ai:Sarvam:ApiKey');
  });

  it('saves the administrator’s choice', async () => {
    const { fixture, root } = await create();
    const select = root.querySelector('select') as HTMLSelectElement;
    select.value = 'anthropic';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Save'))!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.update).toHaveBeenCalledWith('anthropic', true);
    expect(root.textContent).toContain('In use now: claude');
    expect(root.textContent).toContain('Saved.');
  });

  it('turns engine fallback off, and says when the relay has no second engine', async () => {
    const { fixture, root } = await create();
    expect(root.textContent).toContain('no engine to switch to');
    const box = root.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(box.checked).toBe(true);
    box.click();
    fixture.detectChanges();
    const saves = [...root.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('Save'),
    );
    expect(saves[1].disabled).toBe(false);
    saves[1].click();
    await fixture.whenStable();
    expect(api.update).toHaveBeenCalledWith('openai', false);
  });

  it('shows the call rates in rupees and saves them in paise without touching the analysis choice', async () => {
    const { fixture, root } = await create();
    const inputs = [...root.querySelectorAll<HTMLInputElement>('.rates input')];
    expect(inputs).toHaveLength(11);
    await fixture.whenStable();
    expect(Number(inputs[0].value)).toBe(2816);
    expect(Number(inputs[10].value)).toBe(0.38);
    inputs[9].value = '0.75';
    inputs[9].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Save rates'))!
      .click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.update).toHaveBeenCalledWith(null, true, {
      ...fromConfig.voiceCostRates,
      exotelPerMinute: 75,
    });
    expect(root.textContent).toContain('Rates saved.');
  });

  it('refuses a negative rate before sending anything', async () => {
    const { fixture, root } = await create();
    const input = root.querySelectorAll<HTMLInputElement>('.rates input')[6];
    input.value = '-1';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Save rates'))!
      .click();
    fixture.detectChanges();
    expect(api.update).not.toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('speech to text');
  });
});
