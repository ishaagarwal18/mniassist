import { RestService } from '@abp/ng.core';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Injectable,
  Renderer2,
  effect,
  inject,
  input,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

/** How many files stay loaded; older ones are released as new ones load. */
const KEEP = 80;

/**
 * Files the API serves only to a signed-in user (inbox photos, voice notes, attachments). A browser sends no token with an
 * <img>, <video> or <a href>, so those requests were refused and the photos never showed. These are fetched like any other API call
 * — the token added by the app — and shown from an in-page copy.
 */
@Injectable({ providedIn: 'root' })
export class ProtectedMediaService {
  private readonly rest = inject(RestService);
  private readonly loaded = new Map<string, Promise<string>>();

  /** An object URL for the file at url, fetched once and kept while it is in recent use. */
  load(url: string): Promise<string> {
    const cached = this.loaded.get(url);
    if (cached) {
      this.loaded.delete(url); // most recently used goes last
      this.loaded.set(url, cached);
      return cached;
    }

    const loading = firstValueFrom(
      this.rest.request<unknown, Blob>(
        {
          method: 'GET',
          url: apiPath(url),
          responseType: 'blob',
          headers: { Accept: '*/*' },
        },
        { apiName: 'AutoReach', skipHandleError: true },
      ),
    ).then((blob) => URL.createObjectURL(blob));
    loading.catch(() => this.loaded.delete(url)); // try again next time
    this.loaded.set(url, loading);

    while (this.loaded.size > KEEP) {
      const [oldest, entry] = this.loaded.entries().next().value as [string, Promise<string>];
      this.loaded.delete(oldest);
      void entry.then((objectUrl) => URL.revokeObjectURL(objectUrl)).catch(() => undefined);
    }
    return loading;
  }

  /** Opens the file in a new tab (or saves it, if the browser blocks the tab). */
  async open(url: string, fileName?: string): Promise<void> {
    // The tab is opened now, while the click still counts as the user's, and pointed at the file once it has loaded.
    const tab = window.open('', '_blank');
    try {
      const objectUrl = await this.load(url);
      if (tab) {
        tab.location.href = objectUrl;
      } else {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName || 'attachment';
        a.click();
      }
    } catch {
      tab?.close();
      throw new Error('The file could not be loaded.');
    }
  }
}

/** The path the API's base is added to; the inbox builds full URLs. */
function apiPath(url: string): string {
  const base = (environment.apis['AutoReach']?.url ?? environment.apis.default.url ?? '').replace(
    /\/$/,
    '',
  );
  return base && url.startsWith(base) ? url.slice(base.length) : url;
}

/** Shows a protected file in an <img>, <video> or <audio>: `<img [arAuthSrc]="media.url">`. */
@Directive({ selector: '[arAuthSrc]' })
export class ArAuthSrc {
  readonly arAuthSrc = input<string | null | undefined>();

  constructor() {
    const media = inject(ProtectedMediaService);
    const host = inject<ElementRef<HTMLImageElement | HTMLMediaElement>>(ElementRef);
    const renderer = inject(Renderer2);
    let current = 0;
    let alive = true;
    inject(DestroyRef).onDestroy(() => (alive = false));

    effect(() => {
      const url = this.arAuthSrc();
      const request = ++current;
      renderer.removeClass(host.nativeElement, 'ar-media--failed');
      if (!url) {
        renderer.removeAttribute(host.nativeElement, 'src');
        return;
      }
      renderer.addClass(host.nativeElement, 'ar-media--loading');
      media
        .load(url)
        .then((objectUrl) => {
          if (alive && request === current) {
            renderer.setAttribute(host.nativeElement, 'src', objectUrl);
          }
        })
        .catch(() => {
          if (alive && request === current) {
            renderer.addClass(host.nativeElement, 'ar-media--failed');
            renderer.setAttribute(host.nativeElement, 'title', 'This file could not be loaded.');
          }
        })
        .finally(() => {
          if (alive && request === current) {
            renderer.removeClass(host.nativeElement, 'ar-media--loading');
          }
        });
    });
  }
}

/** Opens a protected file from a link: `<a [arAuthHref]="media.url" [fileName]="...">`. */
@Directive({
  selector: 'a[arAuthHref]',
  host: { '[attr.href]': 'arAuthHref() ? "#" : null', '(click)': 'onClick($event)' },
})
export class ArAuthHref {
  readonly arAuthHref = input<string | null | undefined>();
  readonly fileName = input<string | null | undefined>();
  private readonly media = inject(ProtectedMediaService);

  protected onClick(event: MouseEvent): void {
    const url = this.arAuthHref();
    if (!url) return;
    event.preventDefault();
    void this.media.open(url, this.fileName() ?? undefined).catch(() => undefined);
  }
}
