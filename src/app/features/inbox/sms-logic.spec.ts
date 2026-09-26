import { SmsTemplateStatus } from '../../proxy/sms/sms-channel.service';
import { previewSms, sendableSmsTemplates, smsVariablesComplete } from './sms-logic';

const template = { content: 'Dear {#var#}, your order {#var#} has shipped.', variableNames: ['name', 'order'] };

describe('SMS reply helpers', () => {
  it('fills each placeholder in order, showing the ones still empty by name', () => {
    expect(previewSms(template, { name: 'Asha', order: 'SO-12' })).toBe('Dear Asha, your order SO-12 has shipped.');
    expect(previewSms(template, { name: 'Asha' })).toBe('Dear Asha, your order {order} has shipped.');
  });

  it('knows when every variable has a value', () => {
    expect(smsVariablesComplete(template, { name: 'Asha', order: ' ' })).toBe(false);
    expect(smsVariablesComplete(template, { name: 'Asha', order: 'SO-12' })).toBe(true);
  });

  it('offers only approved templates', () => {
    const base = { id: '', name: '', dltTemplateId: '', flowId: '', content: '', category: 0, variableNames: [] };
    const list = [
      { ...base, id: 'a', status: SmsTemplateStatus.Approved },
      { ...base, id: 'p', status: SmsTemplateStatus.Pending },
      { ...base, id: 'r', status: SmsTemplateStatus.Rejected },
    ];
    expect(sendableSmsTemplates(list).map((t) => t.id)).toEqual(['a']);
  });
});
