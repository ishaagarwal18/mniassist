import { SmsTemplateDto, SmsTemplateStatus } from '../../proxy/sms/sms-channel.service';

/** Only an approved DLT template can be sent. */
export const sendableSmsTemplates = (templates: readonly SmsTemplateDto[]): SmsTemplateDto[] =>
  templates.filter((t) => t.status === SmsTemplateStatus.Approved);

/**
 * The SMS as it will read: each {#var#} replaced, in registration order, by the value typed for that variable — or by its name
 * in braces while it is still empty, so an agent can see what is missing.
 */
export function previewSms(
  template: Pick<SmsTemplateDto, 'content' | 'variableNames'>,
  values: Record<string, string>,
): string {
  let text = template.content;
  for (const name of template.variableNames) {
    const value = values[name]?.trim();
    text = text.replace('{#var#}', value ? value : `{${name}}`);
  }
  return text;
}

/** Every variable has a value. */
export const smsVariablesComplete = (
  template: Pick<SmsTemplateDto, 'variableNames'>,
  values: Record<string, string>,
): boolean => template.variableNames.every((n) => !!values[n]?.trim());
