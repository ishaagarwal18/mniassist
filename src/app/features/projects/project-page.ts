import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  PersonAttitude,
  PersonInfluence,
  ProjectContactOptionDto,
  ProjectDetailDto,
  ProjectOutcome,
  ProjectPersonInput,
  ProjectRole,
  ProjectService,
  ProjectStage,
} from '../../proxy/projects/project.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { environment } from '../../../environments/environment';
import { ArAccountSearch, PickedAccount } from './account-search';
import {
  ATTITUDE_TEXT,
  ATTITUDE_TONE,
  INFLUENCE_TEXT,
  OUTCOME_TEXT,
  ROLES,
  STAGE_TEXT,
  STAGES,
  eventText,
  hasRole,
  rolesText,
  rupeesShort,
  toggleRole,
} from './project.logic';

type Tab = 'overview' | 'parties' | 'timeline';

interface PartyDraft {
  accountId: string;
  accountName: string;
  roles: ProjectRole;
  note: string;
}

/**
 * One project: the overview (stage, dates, value, next step), the parties as an influence map (companies by role, their people,
 * influence and attitude), and the timeline. The stage moves here; Awarded asks who won, Closed asks how it ended.
 */
@Component({
  selector: 'ar-project-page',
  imports: [ArTopbar, ArButton, ArBanner, ArCard, ArChip, ArAccountSearch, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-page.html',
  styleUrl: './project-page.scss',
})
export class ArProjectPage {
  private readonly api = inject(ProjectService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly id = this.route.snapshot.paramMap.get('id')!;
  protected readonly mock = environment.useMockData;

  protected readonly tab = signal<Tab>('overview');
  protected readonly project = signal<ProjectDetailDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  // stage move
  protected readonly moveTo = signal<ProjectStage | null>(null);
  protected readonly winner = signal('');
  protected readonly outcome = signal<ProjectOutcome>(ProjectOutcome.None);
  protected readonly moveNote = signal('');

  // parties
  protected readonly parties = signal<PartyDraft[]>([]);
  protected readonly partiesDirty = signal(false);

  // people
  protected readonly peopleFor = signal<string | null>(null);
  protected readonly peopleDraft = signal<ProjectPersonInput[]>([]);
  protected readonly contactOptions = signal<ProjectContactOptionDto[]>([]);

  protected readonly note = signal('');

  protected readonly STAGES = STAGES;
  protected readonly STAGE_TEXT = STAGE_TEXT;
  protected readonly OUTCOME_TEXT = OUTCOME_TEXT;
  protected readonly ROLES = ROLES;
  protected readonly INFLUENCE_TEXT = INFLUENCE_TEXT;
  protected readonly ATTITUDE_TEXT = ATTITUDE_TEXT;
  protected readonly ATTITUDE_TONE = ATTITUDE_TONE;
  protected readonly Stage = ProjectStage;
  protected readonly Outcome = ProjectOutcome;
  protected readonly Role = ProjectRole;
  protected readonly influences = [
    PersonInfluence.DecisionMaker,
    PersonInfluence.Influencer,
    PersonInfluence.User,
    PersonInfluence.Gatekeeper,
  ];
  protected readonly attitudes = [
    PersonAttitude.Unknown,
    PersonAttitude.Supporter,
    PersonAttitude.Neutral,
    PersonAttitude.Blocker,
  ];
  protected readonly rupees = rupeesShort;
  protected readonly eventText = eventText;
  protected readonly rolesText = rolesText;
  protected readonly hasRole = hasRole;

  /** The influence map: companies grouped under their first role, in the order a project is decided. */
  protected readonly map = computed(() => {
    const p = this.project();
    if (!p) return [];
    return ROLES.map((r) => ({
      role: r,
      parties: p.partyList.filter(
        (x) => ROLES.find((y) => hasRole(x.roles, y.role))?.role === r.role,
      ),
    })).filter((g) => g.parties.length > 0);
  });

  protected readonly bidders = computed(() =>
    (this.project()?.partyList ?? []).filter(
      (p) =>
        hasRole(p.roles, ProjectRole.PanelBuilder) ||
        hasRole(p.roles, ProjectRole.EpcContractor) ||
        hasRole(p.roles, ProjectRole.SystemIntegrator),
    ),
  );

  constructor() {
    void this.load();
  }

  protected site(p: ProjectDetailDto): string {
    return [p.siteName, p.siteCity, p.siteState].filter((x) => !!x).join(', ') || '—';
  }

  private async load(): Promise<void> {
    if (this.mock) return;
    try {
      this.apply(await firstValueFrom(this.api.get(this.id)));
      const move = this.route.snapshot.queryParamMap.get('move');
      if (move !== null && !Number.isNaN(+move)) this.moveTo.set(+move as ProjectStage);
    } catch (e) {
      this.error.set(readApiError(e, 'The project could not be loaded.'));
    }
  }

  private apply(p: ProjectDetailDto): void {
    this.project.set(p);
    this.parties.set(
      p.partyList.map((x) => ({
        accountId: x.accountId,
        accountName: x.accountName,
        roles: x.roles,
        note: x.note ?? '',
      })),
    );
    this.partiesDirty.set(false);
  }

  private async run(
    call: () => ReturnType<ProjectService['get']>,
    success: string,
  ): Promise<boolean> {
    this.busy.set(true);
    try {
      this.apply(await firstValueFrom(call()));
      if (success) this.toasts.success(success);
      return true;
    } catch (e) {
      this.toasts.error(readApiError(e, 'That could not be saved.'));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  // ---- stage ----

  protected async move(): Promise<void> {
    const stage = this.moveTo();
    if (stage === null) return;
    const ok = await this.run(
      () =>
        this.api.moveStage(this.id, {
          stage,
          note: this.moveNote().trim() || null,
          awardedToAccountId: stage === ProjectStage.Awarded ? this.winner() || null : null,
          outcome: stage === ProjectStage.Closed ? this.outcome() : ProjectOutcome.None,
        }),
      `Moved to ${STAGE_TEXT[stage]}.`,
    );
    if (ok) {
      this.moveTo.set(null);
      this.moveNote.set('');
      void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  // ---- parties ----

  protected addParty(a: PickedAccount): void {
    if (this.parties().some((p) => p.accountId === a.id)) {
      this.toasts.warning(`${a.name} is already on the project. Give it another role instead.`);
      return;
    }
    this.parties.update((list) => [
      ...list,
      { accountId: a.id, accountName: a.name, roles: ProjectRole.Consultant, note: '' },
    ]);
    this.partiesDirty.set(true);
  }

  protected setRole(i: number, role: ProjectRole, on: boolean): void {
    this.parties.update((list) =>
      list.map((p, k) => (k === i ? { ...p, roles: toggleRole(p.roles, role, on) } : p)),
    );
    this.partiesDirty.set(true);
  }

  protected removeParty(i: number): void {
    this.parties.update((list) => list.filter((_, k) => k !== i));
    this.partiesDirty.set(true);
  }

  protected saveParties(): Promise<boolean> {
    return this.run(
      () =>
        this.api.setParties(
          this.id,
          this.parties().map((p) => ({
            accountId: p.accountId,
            roles: p.roles,
            note: p.note.trim() || null,
          })),
        ),
      'Parties saved.',
    );
  }

  // ---- people ----

  protected async editPeople(accountId: string): Promise<void> {
    const party = this.project()?.partyList.find((p) => p.accountId === accountId);
    if (!party) return;
    this.peopleFor.set(accountId);
    this.peopleDraft.set(
      party.people.map((x) => ({
        contactId: x.contactId,
        influence: x.influence,
        attitude: x.attitude,
        note: x.note ?? '',
      })),
    );
    try {
      this.contactOptions.set(await firstValueFrom(this.api.getAccountContacts(accountId)));
    } catch {
      this.contactOptions.set([]);
    }
  }

  protected contactName(id: string): string {
    return this.contactOptions().find((c) => c.contactId === id)?.name ?? 'Contact';
  }

  protected addPerson(contactId: string): void {
    if (!contactId || this.peopleDraft().some((p) => p.contactId === contactId)) return;
    this.peopleDraft.update((list) => [
      ...list,
      {
        contactId,
        influence: PersonInfluence.Influencer,
        attitude: PersonAttitude.Unknown,
        note: '',
      },
    ]);
  }

  protected setPerson(i: number, change: Partial<ProjectPersonInput>): void {
    this.peopleDraft.update((list) => list.map((p, k) => (k === i ? { ...p, ...change } : p)));
  }

  protected removePerson(i: number): void {
    this.peopleDraft.update((list) => list.filter((_, k) => k !== i));
  }

  protected async savePeople(): Promise<void> {
    const accountId = this.peopleFor();
    if (!accountId) return;
    const ok = await this.run(
      () =>
        this.api.setPeople(
          this.id,
          accountId,
          this.peopleDraft().map((p) => ({
            ...p,
            influence: +p.influence,
            attitude: +p.attitude,
            note: p.note?.trim() || null,
          })),
        ),
      'People saved.',
    );
    if (ok) this.peopleFor.set(null);
  }

  // ---- notes and delete ----

  protected async addNote(): Promise<void> {
    const text = this.note().trim();
    if (!text) return;
    if (await this.run(() => this.api.addNote(this.id, text), '')) this.note.set('');
  }

  protected async remove(): Promise<void> {
    const p = this.project();
    if (!p) return;
    const ok = await this.dialogs.confirm({
      title: `Delete ${p.name}?`,
      message: 'The project and its parties go. Enquiries and contacts stay as they are.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(this.id));
      void this.router.navigate(['/projects']);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The project could not be deleted.'));
    }
  }
}
