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
  ProjectPickListsDto,
  ProjectStage,
  SpecStatus,
} from '../../proxy/projects/project.service';
import { EnquiryService } from '../../proxy/pipeline/enquiry.service';
import { EnquiryStage } from '../../proxy/pipeline';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { ArAccountSearch, PickedAccount } from './account-search';
import {
  ATTITUDE_TEXT,
  ATTITUDE_TONE,
  INFLUENCE_TEXT,
  OUTCOME_TEXT,
  ROLES,
  STAGE_TEXT,
  STAGES,
  SPEC_STATUSES,
  SPEC_TEXT,
  SPEC_TONE,
  eventText,
  hasRole,
  parseRupees,
  percent,
  specProblem,
  rolesText,
  rupeesShort,
  toggleRole,
} from './project.logic';

type Tab = 'overview' | 'parties' | 'spec' | 'enquiries' | 'timeline';

interface SpecDraft {
  category: string;
  status: SpecStatus;
  ourMakes: string[];
  competitorBrandIds: string[];
  clauseText: string;
  value: string;
}

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

  // specification
  protected readonly picks = signal<ProjectPickListsDto>({
    categories: [],
    ourBrands: [],
    competitorBrands: [],
  });
  protected readonly specDraft = signal<SpecDraft | null>(null);
  protected readonly newCategory = signal('');

  // enquiries
  protected readonly bidder = signal('');
  protected readonly bidderContacts = signal<ProjectContactOptionDto[]>([]);
  protected readonly bidderContact = signal('');
  protected readonly linkRef = signal('');
  private readonly enquiriesApi = inject(EnquiryService);

  protected readonly SPEC_STATUSES = SPEC_STATUSES;
  protected readonly SPEC_TEXT = SPEC_TEXT;
  protected readonly SPEC_TONE = SPEC_TONE;
  protected readonly Spec = SpecStatus;
  protected readonly percent = percent;

  /** One row per category: the settings' categories, plus any the project already has. */
  protected readonly specRows = computed(() => {
    const p = this.project();
    const items = p?.specItems ?? [];
    const names = [...this.picks().categories];
    for (const i of items)
      if (!names.some((n) => n.toLowerCase() === i.category.toLowerCase())) names.push(i.category);
    return names.map((category) => ({
      category,
      item: items.find((i) => i.category.toLowerCase() === category.toLowerCase()) ?? null,
    }));
  });

  protected readonly specDraftProblem = computed(() => {
    const d = this.specDraft();
    return d ? specProblem(d.status, d.ourMakes, d.competitorBrandIds) : null;
  });

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
    try {
      this.apply(await firstValueFrom(this.api.get(this.id)));
      void firstValueFrom(this.api.getPickLists()).then(
        (picks) => this.picks.set(picks),
        () => undefined,
      );
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

  // ---- specification ----

  protected editSpec(category: string): void {
    const item = this.project()?.specItems.find(
      (i) => i.category.toLowerCase() === category.toLowerCase(),
    );
    this.specDraft.set({
      category: item?.category ?? category,
      status: item?.status ?? SpecStatus.Unknown,
      ourMakes: [...(item?.ourMakes ?? [])],
      competitorBrandIds: (item?.competitorBrands ?? []).map((b) => b.id),
      clauseText: item?.clauseText ?? '',
      value: item?.estimatedValueInPaise ? String(item.estimatedValueInPaise / 100) : '',
    });
  }

  protected addCategory(): void {
    const name = this.newCategory().trim();
    if (!name) return;
    this.newCategory.set('');
    this.editSpec(name);
  }

  protected patchSpec(change: Partial<SpecDraft>): void {
    this.specDraft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected toggleIn(list: 'ourMakes' | 'competitorBrandIds', value: string, on: boolean): void {
    const d = this.specDraft();
    if (!d) return;
    const set = new Set(d[list]);
    if (on) set.add(value);
    else set.delete(value);
    this.patchSpec({ [list]: [...set] });
  }

  protected async saveSpec(): Promise<void> {
    const d = this.specDraft();
    if (!d || this.specDraftProblem()) return;
    const value = d.value.trim() ? parseRupees(d.value) : null;
    if (d.value.trim() && value === null) {
      this.toasts.warning('Type the value as a number, for example 45,00,000 or 4.5 Cr.');
      return;
    }
    const ok = await this.run(
      () =>
        this.api.setSpecItem(this.id, {
          category: d.category,
          status: +d.status,
          ourMakes: d.ourMakes,
          competitorBrandIds: d.competitorBrandIds,
          clauseText: d.clauseText.trim() || null,
          estimatedValueInPaise: value,
        }),
      `${d.category} saved.`,
    );
    if (ok) this.specDraft.set(null);
  }

  protected async removeSpec(category: string): Promise<void> {
    await this.run(() => this.api.removeSpecItem(this.id, category), `${category} removed.`);
  }

  // ---- enquiries ----

  protected async pickBidder(accountId: string): Promise<void> {
    this.bidder.set(accountId);
    this.bidderContact.set('');
    this.bidderContacts.set([]);
    if (!accountId) return;
    try {
      this.bidderContacts.set(await firstValueFrom(this.api.getAccountContacts(accountId)));
    } catch {
      this.bidderContacts.set([]);
    }
  }

  protected async openEnquiry(): Promise<void> {
    if (!this.bidder() || !this.bidderContact()) return;
    this.busy.set(true);
    try {
      const made = await firstValueFrom(
        this.api.openEnquiry(this.id, this.bidder(), this.bidderContact()),
      );
      this.toasts.success(`Enquiry ${made.reference} opened.`);
      void this.router.navigate(['/enquiries'], { queryParams: { open: made.enquiryId } });
    } catch (e) {
      this.toasts.error(readApiError(e, 'The enquiry could not be opened.'));
    } finally {
      this.busy.set(false);
    }
  }

  /** Links an existing enquiry by its reference (ENQ-2026-0042). */
  protected async linkByReference(): Promise<void> {
    const ref = this.linkRef().trim().toUpperCase();
    if (!ref) return;
    try {
      const page = await firstValueFrom(
        this.enquiriesApi.getList({ filter: ref, maxResultCount: 10 } as never),
      );
      const match = (page.items ?? []).find((e) => (e.reference ?? '').toUpperCase() === ref);
      if (!match?.id) {
        this.toasts.warning(`No enquiry ${ref} found.`);
        return;
      }
      if (await this.run(() => this.api.linkEnquiry(this.id, match.id!), `${ref} linked.`))
        this.linkRef.set('');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The enquiry could not be linked.'));
    }
  }

  protected async unlink(enquiryId: string, reference: string): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Unlink ${reference}?`,
      message: 'The enquiry stays as it is; it is no longer part of this project.',
      confirmText: 'Unlink',
    });
    if (ok)
      await this.run(() => this.api.unlinkEnquiry(this.id, enquiryId), `${reference} unlinked.`);
  }

  protected stageText(stage: number): string {
    return EnquiryStage[stage] ?? String(stage);
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
