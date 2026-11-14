import { DOCUMENT } from '@angular/common';
import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BRAND_NAME } from '../brand-name';
import { PublicWhiteLabelBrandingDto } from '../../proxy/resellers/reseller.models';
import { ResellerService } from '../../proxy/resellers/reseller.service';

/** The platform's own hosts: no reseller branding is looked up on them. */
export function isPlatformHost(
  hostname: string,
  platformBaseUrl: string = environment.application.baseUrl ?? '',
): boolean {
  const host = hostname.toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost'))
    return true;
  let platform = '';
  try {
    platform = new URL(platformBaseUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  const bare = platform.replace(/^www\./, '');
  return host === platform || host === bare || host.endsWith('.' + bare);
}

/** A reseller brand is real when the API named one other than the platform default. */
export function isResellerBrand(
  b: PublicWhiteLabelBrandingDto | null | undefined,
): b is PublicWhiteLabelBrandingDto {
  return !!b && !!b.brandName && b.brandName !== 'AutoReach' && b.brandName !== BRAND_NAME;
}

/**
 * Who the app is presented as on this host. On the platform's own domains it is MNI Assist; on a reseller's custom domain
 * (served through Cloudflare for SaaS) it is the reseller's brand — name, logo, favicon and colours — before anyone signs
 * in. Workspace branding (BrandingStore) still applies on top once a user is signed in.
 */
@Injectable({ providedIn: 'root' })
export class HostBrandStore {
  // Fetched only on a reseller domain, so screens that show the brand do not need the API client.
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  private readonly brand = signal<PublicWhiteLabelBrandingDto | null>(null);
  private loaded: Promise<void> | null = null;

  /** True on a reseller's domain once its branding is loaded. */
  readonly isReseller = computed(() => isResellerBrand(this.brand()));
  readonly name = computed(() => (this.isReseller() ? this.brand()!.brandName : BRAND_NAME));
  readonly logoUrl = computed(() =>
    this.isReseller() ? (this.brand()!.logoUrlLight ?? null) : null,
  );
  readonly logoUrlDark = computed(() =>
    this.isReseller() ? (this.brand()!.logoUrlDark ?? this.brand()!.logoUrlLight ?? null) : null,
  );
  readonly primaryColor = computed(() =>
    this.isReseller() ? this.brand()!.primaryColorHex : null,
  );
  readonly secondaryColor = computed(() =>
    this.isReseller() ? this.brand()!.secondaryColorHex : null,
  );
  /** The reseller asked to hide every mention of the platform (e.g. "New to MNI Assist?" and sign-up). */
  readonly hidePlatform = computed(() => this.isReseller() && this.brand()!.hidePlatformBranding);
  readonly supportEmail = computed(() =>
    this.isReseller() ? (this.brand()!.supportEmail ?? null) : null,
  );
  readonly privacyUrl = computed(() =>
    this.isReseller() ? (this.brand()!.privacyPolicyUrl ?? null) : null,
  );
  readonly termsUrl = computed(() => (this.isReseller() ? (this.brand()!.termsUrl ?? null) : null));

  /** Looks the host up once; on the platform's own hosts it does nothing. Never throws. */
  load(hostname = this.document.location?.hostname ?? ''): Promise<void> {
    if (this.loaded) return this.loaded;
    this.loaded = (async () => {
      if (isPlatformHost(hostname)) return;
      try {
        const brand = await firstValueFrom(
          this.injector
            .get(ResellerService)
            .getPublicBrandingByDomain(hostname, { skipHandleError: true }),
        );
        if (isResellerBrand(brand)) {
          this.brand.set(brand);
          this.apply(brand);
        }
      } catch {
        // The platform's own look stays; a branding lookup must never stop the app opening.
      }
    })();
    return this.loaded;
  }

  /** "Inbox · MNI Assist" becomes "Inbox · <reseller>". */
  title(title: string): string {
    return this.isReseller() ? title.split(BRAND_NAME).join(this.name()) : title;
  }

  private apply(brand: PublicWhiteLabelBrandingDto): void {
    const doc = this.document;
    doc.title = this.title(doc.title || BRAND_NAME);
    for (const meta of Array.from(
      doc.querySelectorAll<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-title"], meta[name="application-name"]',
      ),
    )) {
      meta.content = brand.brandName;
    }

    if (brand.faviconUrl && /^https:\/\//i.test(brand.faviconUrl)) {
      const icons = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
      if (icons.length === 0) {
        const link = doc.createElement('link');
        link.rel = 'icon';
        doc.head.appendChild(link);
        icons.push(link);
      }
      for (const icon of icons) icon.href = brand.faviconUrl;
    }

    // The reseller's colours as the accent; a workspace's own colours (BrandingStore) replace them once signed in.
    const root = doc.documentElement.style;
    if (brand.primaryColorHex) root.setProperty('--ar-tenant-primary', brand.primaryColorHex);
    if (brand.secondaryColorHex) root.setProperty('--ar-tenant-accent', brand.secondaryColorHex);

    // Route titles carry the platform's name ("Inbox · MNI Assist"); rename each as it is set.
    const titleEl = doc.querySelector('title');
    if (titleEl && typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => {
        if (doc.title.includes(BRAND_NAME)) doc.title = this.title(doc.title);
      }).observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
  }
}
