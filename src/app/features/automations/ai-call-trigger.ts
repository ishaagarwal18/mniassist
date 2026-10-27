import { AutomationTriggerKind } from '../../proxy/messaging';

/** What an "AI call completed / not connected" trigger waits for. Blank means any (VoiceCallAutomations.Matches). */
export interface AiCallTriggerConfig {
  direction?: 'inbound' | 'outbound';
  outcome?: 'goalMet' | 'goalNotMet';
}

export const AI_CALL_DIRECTIONS = [
  { value: '', label: 'Calls in either direction' },
  { value: 'inbound', label: 'Calls the customer made' },
  { value: 'outbound', label: 'Calls the agent made' },
];

export const AI_CALL_OUTCOMES = [
  { value: '', label: 'Any result' },
  { value: 'goalMet', label: 'The goal was met' },
  { value: 'goalNotMet', label: 'The goal was not met' },
];

export const isAiCallTrigger = (t: AutomationTriggerKind): boolean =>
  t === AutomationTriggerKind.AiCallCompleted || t === AutomationTriggerKind.AiCallNotConnected;

/** The trigger config to save; the outcome only applies to answered calls. */
export function aiCallTriggerConfig(
  trigger: AutomationTriggerKind,
  direction: string,
  outcome: string,
): AiCallTriggerConfig {
  return {
    direction: (direction || undefined) as AiCallTriggerConfig['direction'],
    outcome:
      trigger === AutomationTriggerKind.AiCallCompleted
        ? ((outcome || undefined) as AiCallTriggerConfig['outcome'])
        : undefined,
  };
}
