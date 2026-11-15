import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { TemplateDto, TemplateLanguageGroupDto } from '../../proxy/messaging/models';
import { TemplateService } from '../../proxy/messaging/template.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

const LANGUAGES: Record<string, string> = {
  en: 'English',
  en_US: 'English (US)',
  en_GB: 'English (UK)',
  hi: 'Hindi',
  mr: 'Marathi',
  gu: 'Gujarati',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  bn: 'Bengali',
  pa: 'Punjabi',
  ml: 'Malayalam',
};

export function languageName(code: string | undefined): string {
  if (!code) return '—';
  return LANGUAGES[code] ?? LANGUAGES[code.split('_')[0]] ?? code;
}

const STATUS: Partial<Record<TemplateStatus, ChipTone>> = {
  [TemplateStatus.Approved]: 'good',
  [TemplateStatus.Pending]: 'warn',
  [TemplateStatus.Rejected]: 'bad',
  [TemplateStatus.Paused]: 'bad',
};

/**
 * Templates grouped by name across languages, so gaps show (an RFQ reply approved in English but not Hindi), and a
 * "which version would a customer get" check: pick a language and see the template that send would use.
 */
@Component({
  selector: 'ar-template-languages',
  imports: [ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
  `,
  template: `
    <section class="wp__card">
      <h2 class="wp__title">Languages</h2>
      <p class="wp__muted">
        Each template with the languages it exists in. A send uses the customer's language when it
        is approved.
      </p>
      <ul class="wp__list">
        @for (g of groups(); track g.name) {
          <li class="wp__item">
            <span class="wp__name wp__grow" translate="no">{{ g.name }}</span>
            @for (v of g.languages ?? []; track v.languageCode) {
              <ar-chip [tone]="tone(v.status)" [dot]="true">{{ language(v.languageCode) }}</ar-chip>
            }
            <select
              class="ar-field__input"
              aria-label="Customer language"
              (change)="resolve(g, $any($event.target).value)"
            >
              <option value="">A customer speaking…</option>
              @for (l of languageCodes; track l) {
                <option [value]="l">{{ language(l) }}</option>
              }
            </select>
          </li>
          @if (resolved()?.name === g.name) {
            <li class="wp__sub" role="status" style="padding-bottom: 8px">
              {{ resolved()!.text }}
            </li>
          }
        } @empty {
          <li class="wp__empty">{{ loading() ? 'Loading…' : 'No templates yet.' }}</li>
        }
      </ul>
      @if (groups().length >= shown()) {
        <button ar-button type="button" variant="ghost" (click)="shown.set(shown() + 50)">
          Show more
        </button>
      }
    </section>
  `,
})
export class ArTemplateLanguages {
  private readonly api = inject(TemplateService);

  readonly channelId = input<string | null | undefined>(null);

  protected readonly languageCodes = ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'kn', 'bn'];
  private readonly all = signal<TemplateLanguageGroupDto[]>([]);
  protected readonly shown = signal(50);
  protected readonly loading = signal(true);
  protected readonly resolved = signal<{ name: string; text: string } | null>(null);

  protected groups(): TemplateLanguageGroupDto[] {
    return this.all().slice(0, this.shown());
  }

  constructor() {
    effect(() => {
      const id = this.channelId();
      untracked(() => void this.load(id ?? undefined));
    });
  }

  protected language(code: string | undefined): string {
    return languageName(code);
  }

  protected tone(s: TemplateStatus | undefined): ChipTone {
    return (s !== undefined && STATUS[s]) || 'neutral';
  }

  private async load(channelId: string | undefined): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(
        this.api.getLanguageGroups(channelId, { skipHandleError: true }),
      );
      this.all.set([...(r.items ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')));
    } catch {
      this.all.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  protected async resolve(g: TemplateLanguageGroupDto, languageCode: string): Promise<void> {
    if (!languageCode || !g.name || !g.channelId) return;
    try {
      const t: TemplateDto = await firstValueFrom(
        this.api.resolveForLocale(g.channelId, g.name, languageCode, { skipHandleError: true }),
      );
      this.resolved.set({
        name: g.name,
        text:
          t.languageCode === languageCode
            ? `A ${languageName(languageCode)} speaker gets the ${languageName(languageCode)} version.`
            : `A ${languageName(languageCode)} speaker gets the ${languageName(t.languageCode)} version: there is no approved ${languageName(languageCode)} one.`,
      });
    } catch {
      this.resolved.set({
        name: g.name,
        text: `No approved version of this template can be sent to a ${languageName(languageCode)} speaker.`,
      });
    }
  }
}
