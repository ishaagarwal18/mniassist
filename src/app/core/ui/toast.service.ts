import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  readonly tone: ToastTone;
  readonly title: string;
  readonly content: string;
}

/** How long the same message is swallowed after it was shown, so a burst of failing calls toasts once. */
const DEDUPE_MS = 4000;

/**
 * Short, self-dismissing notices in the top-right corner: "Contact created",
 * "Enquiry deleted", or what the server said when something failed. Shown by
 * the toast host in the app shell (layout/toast-host.ts). Most come from the API
 * feedback interceptor without the screen asking; a screen calls this directly
 * only for things that are not an API call (a copied link, a file it read).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly stream = new Subject<ToastMessage>();
  readonly messages$ = this.stream.asObservable();
  private readonly recent = new Map<string, number>();

  success(content: string, title = 'Done'): void {
    this.show({ tone: 'success', title, content });
  }
  error(content: string, title = 'Something went wrong'): void {
    this.show({ tone: 'error', title, content });
  }
  warning(content: string, title = 'Check this'): void {
    this.show({ tone: 'warning', title, content });
  }
  info(content: string, title = 'Note'): void {
    this.show({ tone: 'info', title, content });
  }

  show(message: ToastMessage): void {
    const key = `${message.tone}|${message.title}|${message.content}`;
    const now = Date.now();
    const last = this.recent.get(key);
    if (last !== undefined && now - last < DEDUPE_MS) return;
    this.recent.set(key, now);
    for (const [k, at] of this.recent) if (now - at > DEDUPE_MS) this.recent.delete(k);
    this.stream.next(message);
  }
}
