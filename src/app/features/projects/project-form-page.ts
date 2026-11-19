import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  ProjectService,
  ProjectUserDto,
  SaveProjectInput,
} from '../../proxy/projects/project.service';
import { ArBanner, ArButton } from '../../ui';
import { ArAccountSearch, PickedAccount } from './account-search';
import { formProblem, parseRupees, rupeesShort } from './project.logic';
import { PickListStore } from '../../core/pick-lists/pick-list.store';

type DateKey =
  | 'identifiedOn'
  | 'specIssueOn'
  | 'tenderCloseOn'
  | 'awardExpectedOn'
  | 'commissioningOn'
  | 'nextStepDueOn';

/** A date the API sent ("2026-11-08T00:00:00") as a date box's value ("2026-11-08"). */
function day(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

/** A new project, or a project's details: name, end-user, site, value, key dates, next step, owner and team. */
@Component({
  selector: 'ar-project-form-page',
  imports: [ArTopbar, ArButton, ArBanner, ArAccountSearch, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-form-page.html',
  styleUrl: './project-form-page.scss',
})
export class ArProjectFormPage {
  private readonly api = inject(ProjectService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  private readonly pickLists = inject(PickListStore);
  protected readonly SECTORS = computed(() => this.pickLists.texts('project.sector'));
  protected readonly dates: { key: DateKey; label: string }[] = [
    { key: 'identifiedOn', label: 'Identified' },
    { key: 'specIssueOn', label: 'Spec issue' },
    { key: 'tenderCloseOn', label: 'Tender closes' },
    { key: 'awardExpectedOn', label: 'Award expected' },
    { key: 'commissioningOn', label: 'Commissioning' },
  ];

  protected readonly form = signal<SaveProjectInput>({
    name: '',
    endUserAccountId: '',
    teamUserIds: [],
  });
  protected readonly endUserName = signal('');
  protected readonly value = signal('');
  protected readonly users = signal<ProjectUserDto[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly problem = computed(() => formProblem(this.form()));
  /** Set once Save is pressed, so required-field hints only show after an attempt. */
  protected readonly tried = signal(false);
  protected readonly nameMissing = computed(() => this.tried() && !this.form().name.trim());
  protected readonly endUserMissing = computed(() => this.tried() && !this.form().endUserAccountId);
  protected readonly valueBad = computed(
    () => !!this.value().trim() && this.form().ourScopeValueInPaise === null,
  );
  protected readonly valuePreview = computed(() => {
    const v = this.form().ourScopeValueInPaise;
    return v === null || v === undefined ? null : rupeesShort(v);
  });
  protected readonly ownerName = computed(() => {
    const id = this.form().ownerUserId;
    return id ? (this.users().find((u) => u.userId === id)?.name ?? 'Someone else') : 'You';
  });
  protected readonly teamNames = computed(() =>
    this.users()
      .filter((u) => this.form().teamUserIds.includes(u.userId) && u.userId !== this.form().ownerUserId)
      .map((u) => u.name),
  );
  /** The key dates that are set, in date order, for the summary timeline. */
  protected readonly timeline = computed(() =>
    this.dates
      .map((d) => ({ label: d.label, on: this.date(d.key) }))
      .filter((d) => !!d.on)
      .sort((a, b) => a.on.localeCompare(b.on)),
  );
  /** Sections filled, for the progress line in the summary. */
  protected readonly filled = computed(() => {
    const f = this.form();
    return [
      !!f.name.trim() && !!f.endUserAccountId,
      !!(f.siteName || f.siteCity || f.siteState || f.sector),
      f.ourScopeValueInPaise !== null && f.ourScopeValueInPaise !== undefined,
      this.timeline().length > 0,
      !!f.nextStep?.trim(),
    ];
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.users.set(await firstValueFrom(this.api.getUsers()));
      if (!this.id) return;
      const p = await firstValueFrom(this.api.get(this.id));
      this.form.set({
        name: p.name,
        endUserAccountId: p.endUserAccountId,
        siteName: p.siteName ?? '',
        siteCity: p.siteCity ?? '',
        siteState: p.siteState ?? '',
        sector: p.sector ?? '',
        ourScopeValueInPaise: p.ourScopeValueInPaise ?? null,
        identifiedOn: day(p.identifiedOn),
        specIssueOn: day(p.specIssueOn),
        tenderCloseOn: day(p.tenderCloseOn),
        awardExpectedOn: day(p.awardExpectedOn),
        commissioningOn: day(p.commissioningOn),
        nextStep: p.nextStep ?? '',
        nextStepDueOn: day(p.nextStepDueOn),
        statusNote: p.statusNote ?? '',
        ownerUserId: p.ownerUserId,
        teamUserIds: p.team.map((t) => t.userId),
      });
      this.endUserName.set(p.endUserName ?? '');
      this.value.set(p.ourScopeValueInPaise ? String(p.ourScopeValueInPaise / 100) : '');
    } catch (e) {
      this.error.set(readApiError(e, 'The project could not be loaded.'));
    }
  }

  protected patch(change: Partial<SaveProjectInput>): void {
    this.form.update((f) => ({ ...f, ...change }));
  }

  protected date(key: DateKey): string {
    return (this.form()[key] as string | null | undefined) ?? '';
  }

  protected setDate(key: DateKey, value: string): void {
    this.patch({ [key]: value || null });
  }

  protected pickEndUser(a: PickedAccount): void {
    this.patch({ endUserAccountId: a.id });
    this.endUserName.set(a.name);
  }

  protected setValue(text: string): void {
    this.value.set(text);
    this.patch({ ourScopeValueInPaise: parseRupees(text) });
  }

  protected onTeam(userId: string): boolean {
    return this.form().teamUserIds.includes(userId);
  }

  protected toggleTeam(userId: string, on: boolean): void {
    const team = new Set(this.form().teamUserIds);
    if (on) team.add(userId);
    else team.delete(userId);
    this.patch({ teamUserIds: [...team] });
  }

  protected async save(): Promise<void> {
    this.tried.set(true);
    const f = this.form();
    if (formProblem(f) || this.busy()) return;
    if (this.value().trim() && f.ourScopeValueInPaise === null) {
      this.toasts.warning('Type the value as a number, for example 45,00,000 or 4.5 Cr.');
      return;
    }
    this.busy.set(true);
    const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
    const input: SaveProjectInput = {
      ...f,
      name: f.name.trim(),
      siteName: blank(f.siteName),
      siteCity: blank(f.siteCity),
      siteState: blank(f.siteState),
      sector: blank(f.sector),
      nextStep: blank(f.nextStep),
      statusNote: blank(f.statusNote),
      ownerUserId: f.ownerUserId || null,
    };
    try {
      const saved = await firstValueFrom(
        this.id ? this.api.update(this.id, input) : this.api.create(input),
      );
      this.toasts.success(
        this.id
          ? 'Project saved.'
          : `Project ${saved.reference} created. Add the consultant and contractors next.`,
      );
      void this.router.navigate(['/projects', saved.id]);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The project could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
