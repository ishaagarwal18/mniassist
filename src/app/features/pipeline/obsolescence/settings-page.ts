import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { ArTopbar } from '../../../layout/topbar';
import { TemplateService } from '../../../proxy/messaging/template.service';
import { TemplateStatus } from '../../../proxy/messaging/template-status.enum';
import {
  ObsolescenceService,
  ObsolescenceSettingsDto,
} from '../../../proxy/pipeline/obsolescence.service';
import { ArBanner, ArButton, ArCard } from '../../../ui';
import { environment } from '../../../../environments/environment';
import { POINT_FIELDS, PointKey, settingsProblem } from './obsolescence.logic';

type NumberKey =
  | 'lastBuySoonMonths'
  | 'oldMachineYears'
  | 'highFrom'
  | 'mediumFrom'
  | 'followUpAfterDays'
  | 'maxFollowUps';

/**
 * The obsolescence radar's settings: the points each risk factor adds (saving re-scores the radar), and the customer notice: the
 * approved WhatsApp template, whether notices go by themselves after the nightly scan, and the follow-up.
 */
@Component({
  selector: 'ar-obsolescence-settings-page',
  imports: [ArTopbar, ArButton, ArBanner, ArCard, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class ArObsolescenceSettingsPage {
  private readonly api = inject(ObsolescenceService);
  private readonly templatesApi = inject(TemplateService);
  private readonly toasts = inject(ToastService);

  protected readonly mock = environment.useMockData;
  protected readonly fields = POINT_FIELDS;
  protected readonly settings = signal<ObsolescenceSettingsDto | null>(null);
  protected readonly templates = signal<{ id: string; name: string; lang: string }[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly problem = computed(() => {
    const s = this.settings();
    return s ? settingsProblem(s) : null;
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    if (this.mock) return;
    try {
      const [settings, templates] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(
          this.templatesApi.getList({ status: TemplateStatus.Approved, maxResultCount: 200 }),
        ),
      ]);
      this.settings.set(settings);
      this.templates.set(
        (templates.items ?? []).map((t) => ({
          id: t.id!,
          name: t.name ?? 'Template',
          lang: t.languageCode ?? '',
        })),
      );
    } catch (e) {
      this.error.set(readApiError(e, 'The settings could not be loaded.'));
    }
  }

  protected point(key: PointKey | NumberKey): number {
    return this.settings()?.[key] ?? 0;
  }

  protected setNumber(key: PointKey | NumberKey, value: string): void {
    const n = Number(value);
    this.settings.update((s) => (s ? { ...s, [key]: Number.isFinite(n) ? n : 0 } : s));
  }

  protected patch(change: Partial<ObsolescenceSettingsDto>): void {
    this.settings.update((s) => (s ? { ...s, ...change } : s));
  }

  protected async save(): Promise<void> {
    const s = this.settings();
    if (!s) return;
    const problem = settingsProblem(s);
    if (problem) {
      this.toasts.warning(problem);
      return;
    }
    this.busy.set(true);
    try {
      this.settings.set(
        await firstValueFrom(
          this.api.updateSettings({
            ...s,
            templateId: s.templateId || null,
            followUpTemplateId: s.followUpAfterDays > 0 ? s.followUpTemplateId || null : null,
          }),
        ),
      );
      this.toasts.success('Settings saved. The radar has been re-scored.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The settings could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
