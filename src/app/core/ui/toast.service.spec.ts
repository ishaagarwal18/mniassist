import { ToastService } from './toast.service';

describe('deferred toast host', () => {
  it('delivers queued messages once when the host attaches, then streams new notices', () => {
    const service = new ToastService();
    service.info('Before host');
    const messages: string[] = [];
    const subscription = service.messages$.subscribe((message) => messages.push(message.content));
    service.success('After host');
    expect(messages).toEqual(['Before host', 'After host']);
    subscription.unsubscribe();
    const later: string[] = [];
    service.messages$.subscribe((message) => later.push(message.content)).unsubscribe();
    expect(later).toEqual([]);
    expect(service.hasMessages()).toBe(true);
  });
});
