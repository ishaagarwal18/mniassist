import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArTopbar } from '../../layout/topbar';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ArVoiceWebWidgets, VoiceWebWidget, VoiceWebWidgetService } from './voice-web-widgets';

@Component({ selector: 'ar-topbar', template: '' })
class TestTopbar {
  readonly title = input<string>();
  readonly help = input<string>();
}

const widget: VoiceWebWidget = {
  id: 'w1',
  name: 'Main site',
  channelId: 'c1',
  publicKey: 'pk_abc',
  allowedOrigins: ['https://www.meridian.in'],
  buttonLabel: 'Talk to us',
  colour: '#0f766e',
  dailyLimit: 50,
  enabled: true,
  callsToday: 3,
};

describe('Website call button', () => {
  const api = {
    getList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    rotateKey: vi.fn(),
    delete: vi.fn(),
  };
  const channels = { getList: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.getList.mockReturnValue(of([widget]));
    api.create.mockReturnValue(of(widget));
    channels.getList.mockReturnValue(
      of({
        items: [
          { id: 'c1', verifiedName: 'Sales', displayPhoneNumber: '+91 98111 00000', provider: 0 },
        ],
      }),
    );
    TestBed.configureTestingModule({
      imports: [ArVoiceWebWidgets],
      providers: [
        { provide: VoiceWebWidgetService, useValue: api },
        { provide: ChannelService, useValue: channels },
        { provide: ConfirmService, useValue: { delete: vi.fn(), confirm: vi.fn() } },
      ],
    }).overrideComponent(ArVoiceWebWidgets, {
      remove: { imports: [ArTopbar] },
      add: { imports: [TestTopbar] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArVoiceWebWidgets);
    fixture.detectChanges();
    await fixture.whenStable();
    // The numbers load first, then the buttons.
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('shows each button with its embed code and today’s calls', async () => {
    const { root } = await create();
    expect(root.textContent).toContain('3/50');
    expect(root.textContent).toContain('Sales · +91 98111 00000');
    const code = (root.querySelector('.ww__code') as HTMLTextAreaElement).value;
    expect(code).toMatch(
      /^<script src="https?:\/\/[^"]+\/api\/auto-reach\/public\/voice-widget\/pk_abc\/widget\.js" async><\/script>$/,
    );
  });

  it('accepts only website addresses with nothing after them', async () => {
    const { fixture, root } = await create();
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Add a call button'))!
      .click();
    fixture.detectChanges();
    await fixture.whenStable();
    const set = (name: string, value: string) => {
      const el = root.querySelector(`[name="${name}"]`) as HTMLInputElement;
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };
    set('name', 'Shop');
    set('origins', 'https://shop.meridian.in/contact');
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(api.create).not.toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('nothing after it');

    set('origins', 'https://shop.meridian.in\nhttps://meridian.in/');
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Shop',
        channelId: 'c1',
        allowedOrigins: ['https://shop.meridian.in', 'https://meridian.in/'],
        dailyLimit: 50,
      }),
    );
  });
});
