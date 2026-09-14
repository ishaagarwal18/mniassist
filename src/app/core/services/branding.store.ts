import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BrandingService, TenantBrandingDto, UpdateTenantBrandingInput } from '../../proxy/branding';

/**
 * Tenant identity: a logo and two accent colours, applied to the app shell as CSS
 * custom properties (`--ar-tenant-primary`, `--ar-tenant-accent`) so a tenant can make
 * AutoReach feel like their own product without touching any of the WCAG-audited
 * status/semantic tokens the rest of the app relies on for contrast — this only
 * repaints decorative chrome (the sidebar brand mark and the active-nav indicator),
 * never text that a contrast ratio was measured against.
 */
@Injectable({ providedIn: 'root' })
export class BrandingStore {
  private readonly api = inject(BrandingService);
  private readonly reloadTick = signal(0);

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () => this.api.get(),
    defaultValue: undefined as TenantBrandingDto | undefined,
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());

  /** Mock mode has no server-side branding to fetch — showing AutoReach's own
   *  defaults there (rather than a fabricated tenant colour) is the honest choice. */
  readonly branding = computed<TenantBrandingDto | null>(() =>
    environment.useMockData ? null : (this.resource.value() ?? null),
  );

  readonly tenantName = computed(() => this.branding()?.tenantName ?? null);
  readonly primaryColor = computed(() => this.branding()?.primaryColor ?? null);
  readonly accentColor = computed(() => this.branding()?.accentColor ?? null);
  readonly logoDataUrl = computed(() => this.branding()?.logoDataUrl ?? null);
  readonly hasLogo = computed(() => this.branding()?.hasLogo ?? false);

  constructor() {
    effect(() => {
      const root = document.documentElement.style;
      const primary = this.primaryColor();
      const accent = this.accentColor();
      primary ? root.setProperty('--ar-tenant-primary', primary) : root.removeProperty('--ar-tenant-primary');
      accent ? root.setProperty('--ar-tenant-accent', accent) : root.removeProperty('--ar-tenant-accent');
    });
  }

  reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async updateColors(input: UpdateTenantBrandingInput): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.api.updateColors(input));
    this.reload();
  }

  async uploadLogo(file: File): Promise<void> {
    if (environment.useMockData) return;
    const body = new FormData();
    body.append('file', file, file.name);
    // Same trick the document library upload uses: the generated proxy types this as
    // the DTO, but Angular's HttpClient sends a FormData body as multipart, which is
    // what the [FromForm] endpoint expects.
    await firstValueFrom(this.api.uploadLogo(body as unknown as { file: unknown }));
    this.reload();
  }

  async removeLogo(): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.api.removeLogo());
    this.reload();
  }
}
