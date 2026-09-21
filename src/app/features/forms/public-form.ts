import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  PublicWebFormDto,
  PublicWebFormFieldDto,
  WebFormFieldKind,
  WebFormPublicService,
} from '../../proxy/web-forms';
import { apiMessage } from '../signing/signing-logic';
import { campaignTags, checkAnswers, embedded, serverFieldErrors } from './form-logic';

/**
 * The page a visitor fills in to enquire: no login, no app shell. Shown at its own address, or inside a frame on the workspace's website. What
 * the form asks and what happens to the answers are decided by the server; this page presents the questions and sends what was typed.
 */
@Component({
  selector: 'ar-public-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-form.html',
  styleUrl: './public-form.scss',
})
export class ArPublicForm implements AfterViewInit {
  private readonly api = inject(WebFormPublicService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';

  protected readonly Kind = WebFormFieldKind;
  protected readonly isEmbedded = embedded(window.location.search);

  protected readonly form = signal<PublicWebFormDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly unavailable = signal<string | null>(null);

  protected readonly answers = signal<Record<string, string>>({});
  protected readonly consent = signal(false);
  protected readonly marketing = signal(false);
  protected readonly honeypot = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly busy = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly done = signal<string | null>(null);

  protected readonly hasErrors = computed(() => Object.keys(this.errors()).length > 0);

  constructor() {
    void this.load();
  }

  ngAfterViewInit(): void {
    // Inside a frame, tell the page around us how tall the form is, so it can size the frame to fit.
    if (!this.isEmbedded || window.parent === window) return;
    const tell = () => window.parent.postMessage({ autoreachFormHeight: Math.ceil(this.host.nativeElement.scrollHeight) + 8 }, '*');
    const observer = new ResizeObserver(tell);
    observer.observe(this.host.nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
    tell();
  }

  private async load(): Promise<void> {
    try {
      this.form.set(await firstValueFrom(this.api.get(this.code)));
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      this.unavailable.set(
        status === 429
          ? apiMessage(e, 'Too many requests. Please wait a few minutes and try again.')
          : 'This form is not available.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected value(f: PublicWebFormFieldDto): string {
    return this.answers()[f.key] ?? '';
  }

  protected set(f: PublicWebFormFieldDto, value: string): void {
    this.answers.update((a) => ({ ...a, [f.key]: value }));
    // A mistake is cleared as soon as the person starts putting it right.
    if (this.errors()[f.key]) this.errors.update(({ [f.key]: _, ...rest }) => rest);
  }

  protected inputType(f: PublicWebFormFieldDto): string {
    return f.kind === WebFormFieldKind.Email ? 'email' : f.kind === WebFormFieldKind.Phone ? 'tel' : 'text';
  }

  protected autocomplete(f: PublicWebFormFieldDto): string {
    return f.kind === WebFormFieldKind.Email ? 'email' : f.kind === WebFormFieldKind.Phone ? 'tel' : 'off';
  }

  protected setConsent(ticked: boolean): void {
    this.consent.set(ticked);
    if (this.errors()['consent']) this.errors.update(({ consent: _, ...rest }) => rest);
  }

  protected async submit(): Promise<void> {
    const form = this.form();
    if (!form || this.busy()) return;

    const found = checkAnswers(form.fields, this.answers());
    if (!this.consent()) found['consent'] = 'Please tick the box to agree, so we can get back to you.';
    this.errors.set(found);
    this.failure.set(null);
    if (Object.keys(found).length > 0) {
      queueMicrotask(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    this.busy.set(true);
    try {
      const result = await firstValueFrom(
        this.api.submit(this.code, {
          answers: this.answers(),
          consent: this.consent(),
          marketingOptIn: this.marketing(),
          website: this.honeypot() || null,
          sourceUrl: (this.isEmbedded ? document.referrer : window.location.href.split('?')[0]) || null,
          ...campaignTags(window.location.search),
        }),
      );
      if (result.redirectUrl && result.redirectUrl.startsWith('https://')) {
        window.location.href = result.redirectUrl;
        return;
      }
      this.done.set(result.message);
    } catch (e: unknown) {
      const fromServer = serverFieldErrors(e);
      if (Object.keys(fromServer).length > 0) {
        this.errors.set(fromServer);
        this.failure.set('Please check the highlighted answers and try again.');
      } else if ((e as { status?: number })?.status === 429) {
        this.failure.set(apiMessage(e, 'Too many attempts. Please wait a few minutes and try again.'));
      } else if ((e as { status?: number })?.status === 404) {
        this.unavailable.set('This form is not available.');
      } else {
        this.failure.set('Your details could not be sent. Please try again.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
