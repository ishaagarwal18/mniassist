import { describe, expect, it } from 'vitest';

import { ConversationDto, MessageDirection, MessageDto } from '../../proxy/messaging';
import { toConversation, toMessage } from './mapping';

describe('email in the inbox', () => {
  const conversation = (channelKind: number): ConversationDto =>
    ({ id: 'c1', contactDisplayName: 'Asha', channelKind, isWindowOpen: false }) as ConversationDto;

  it('an email conversation is labelled Email and has no service window to wait for', () => {
    const c = toConversation(conversation(4));

    expect(c.channel).toBe('Email');
    expect(c.windowless).toBe(true);
    expect(c.window.expiresAt).toBeNull();
  });

  it('WhatsApp and the other channels are not windowless', () => {
    expect(toConversation(conversation(0)).windowless).toBeUndefined();
    expect(toConversation(conversation(0)).channel).toBeUndefined();
    expect(toConversation(conversation(2)).windowless).toBeUndefined();
    expect(toConversation(conversation(1)).channel).toBe('Instagram');
  });

  it('a sent email that was opened carries how many times and when last', () => {
    const m = toMessage({
      id: 'm1',
      direction: MessageDirection.Outbound,
      body: 'Subject\n\nHello',
      openCount: 3,
      lastOpenedAtUtc: '2027-03-01T10:30:00Z',
      sentAtUtc: '2027-03-01T09:00:00Z',
    } as MessageDto);

    expect(m.opens).toBe(3);
    expect(m.lastOpenedAt).toBeTruthy();
  });

  it('an email never opened shows no open count at all rather than a zero', () => {
    const m = toMessage({
      id: 'm2',
      direction: MessageDirection.Outbound,
      body: 'x',
      openCount: 0,
    } as MessageDto);

    expect(m.opens).toBeUndefined();
    expect(m.lastOpenedAt).toBeUndefined();
  });
});
