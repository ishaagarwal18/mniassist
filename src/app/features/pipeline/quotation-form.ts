import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { PickerOption, PipelineStore } from '../../core/services/pipeline.service';
import { TemplateService } from '../../core/services/template.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ContactService as ContactApi } from '../../proxy/contacts/contact.service';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import type { ContactDto } from '../../proxy/contacts/models';
import { PriceListDto } from '../../proxy/library';
import {
  CatalogueMatchDto,
  QuotationDto,
  QuotationState,
  QuotePriceSource,
  RepriceResultDto,
} from '../../proxy/pipeline';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { ArContactPicker } from './contact-picker';
import { QuoteContext, QuoteEditorApi } from './quote-editor.api';
import {
  QuoteRow,
  belowListPaise,
  belowMinimum,
  blankRow,
  lineTotalPaise,
  rowFromLine,
  rowFromMatch,
  totalsOf,
} from './quote-pricing';
import {
  QuoteFor,
  QuoteHeader,
  QuoteRecipient,
  canIssueState,
  isQuotationLocked,
  parseEmails,
  quotationPayload,
  unreachable,
  validateIssue,
  validateQuotation,
} from './quotation-form.logic';

/** A manual quotation is for a person, or for a company account (addressed to one of its people). */
export type ManualFor = 'contact' | 'account';

const personName = (c: ContactDto): string =>
  c.displayName || c.waId || c.emailAddress || 'Unnamed';

const STATE_LABEL: Record<QuotationState, { label: string; tone: ChipTone }> = {
  [QuotationState.Draft]: { label: 'draft', tone: 'neutral' },
  [QuotationState.Issued]: { label: 'issued', tone: 'amber' },
  [QuotationState.Revised]: { label: 'revised', tone: 'amber' },
  [QuotationState.Won]: { label: 'won', tone: 'good' },
  [QuotationState.Lost]: { label: 'lost', tone: 'bad' },
  [QuotationState.Expired]: { label: 'expired', tone: 'warn' },
};

/**
 * A quotation on its own page: who it is for (an open enquiry, or a customer directly for a manual quotation), its lines
 * priced from the catalogue or typed by hand, and issuing it to the customer. `/quotations/new` creates one
 * (`?enquiry=<id>`, or `?contact=<id>&name=` / `?account=<id>&name=` for a manual one); `/quotations/:id/edit` changes one, or shows
 * a decided one. Issuing sends it on WhatsApp and/or by email, to the quotation's contact and any other people of the same account.
 */
@Component({
  selector: 'ar-quotation-form',
  imports: [ArTopbar, ArButton, ArCard, ArChip, ArBanner, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quotation-form.html',
  styleUrl: './quotation-form.scss',
})
export class ArQuotationForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly origin = inject(CockpitOriginService);
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(PipelineStore);
  private readonly api = inject(QuoteEditorApi);
  private readonly contactsApi = inject(ContactApi);
  private readonly accountsApi = inject(CustomerAccountService);
  private readonly templateStore = inject(TemplateService);

  protected readonly canCreate = grantedPolicy('AutoReach.Quotations.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Quotations.Update', this.permissions);
  protected readonly canIssuePolicy = grantedPolicy('AutoReach.Quotations.Issue', this.permissions);

  /** Null on the new page; the saved quotation on the edit page. */
  protected readonly quote = signal<QuotationDto | null>(null);
  protected readonly isNew = signal(true);

  // ---- Who it is for (new only) --------------------------------------------
  protected readonly header = signal<QuoteHeader>({
    mode: 'enquiry',
    enquiryId: '',
    contactId: '',
    title: '',
  });
  /** Open enquiries on the board; it may still be loading when the page opens, so this follows it. */
  protected readonly enquiryOptions = computed(() => this.store.openEnquiryOptions());
  protected readonly initialContact = signal<PickerOption | null>(null);
  /** The customer of the chosen enquiry, so parts are priced for them before the quotation is saved. */
  private readonly enquiryContactId = signal<string | null>(null);
  /** Edit page: who the quotation is for, as a name. */
  protected readonly customerLabel = signal<string>('');

  // ---- Manual quotation for an account ---------------------------------------
  protected readonly manualFor = signal<ManualFor>('contact');
  protected readonly accountTerm = signal('');
  protected readonly accountResults = signal<{ id: string; name: string; place: string }[]>([]);
  protected readonly account = signal<{ id: string; name: string } | null>(null);
  /** The chosen account's people; the quotation is addressed to one of them. */
  protected readonly accountPeople = signal<ContactDto[]>([]);
  protected readonly accountPeopleLoading = signal(false);
  private accountTimer: ReturnType<typeof setTimeout> | undefined;
  private accountSeq = 0;

  // ---- Lines ---------------------------------------------------------------
  protected readonly lists = signal<PriceListDto[]>([]);
  protected readonly listId = signal('');
  protected readonly rows = signal<QuoteRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly locked = computed(() => isQuotationLocked(this.quote()?.state));
  protected readonly readOnly = computed(
    () => this.locked() || (this.isNew() ? !this.canCreate() : !this.canUpdate()),
  );
  protected readonly issuedBefore = computed(() => {
    const s = this.quote()?.state;
    return s === QuotationState.Issued || s === QuotationState.Revised;
  });
  protected readonly stateChip = computed(() => {
    const s = this.quote()?.state;
    return s == null ? null : STATE_LABEL[s];
  });

  /** The GST percent for lines that have no rate of their own, as typed. */
  protected readonly quoteRatePct = signal('18');
  protected readonly taxRate = computed(() =>
    Math.min(3000, Math.max(0, Math.round((Number(this.quoteRatePct()) || 0) * 100))),
  );
  protected readonly totals = computed(() => totalsOf(this.rows(), this.taxRate()));

  // ---- Catalogue picker ----------------------------------------------------
  protected readonly term = signal('');
  protected readonly matches = signal<CatalogueMatchDto[]>([]);
  protected readonly searching = signal(false);
  protected readonly pickerOpen = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private searchSeq = 0;
  private nextKey = 1;

  // ---- Issue ---------------------------------------------------------------
  protected readonly canIssue = computed(
    () => this.canIssuePolicy() && !this.readOnly() && canIssueState(this.quote()?.state),
  );
  protected readonly validDays = signal('30');
  protected readonly issueSendWa = signal(true);
  protected readonly issueSendEmail = signal(false);
  protected readonly issueTemplateId = signal('');
  protected readonly extraEmails = signal('');
  /** Who it can go to: the quotation's contact first, then the other people of their account. */
  protected readonly recipients = signal<QuoteRecipient[]>([]);
  protected readonly recipientsLoading = signal(false);
  protected readonly sendTo = signal<string[]>([]);
  private recipientsSeq = 0;
  /** The quotation's contact: saved, or as chosen on the new page. */
  private readonly primaryContactId = computed(() => {
    const saved = this.quote()?.contactId;
    if (saved) return saved;
    const h = this.header();
    return (h.mode === 'manual' ? h.contactId : this.enquiryContactId()) || '';
  });
  private readonly issueChoice = computed(() => ({
    validDays: this.validDays(),
    whatsApp: this.issueSendWa(),
    email: this.issueSendEmail(),
    to: this.sendTo(),
    extraEmails: this.extraEmails(),
    templateId: this.issueTemplateId(),
  }));
  /** Ticked people the chosen channels cannot reach, to say so before issuing. */
  protected readonly unreachable = computed(() =>
    unreachable(this.issueChoice(), this.recipients()),
  );
  /** Approved templates for when the customer's 24-hour window is closed (name, reference and total fill the variables). */
  protected readonly issueTemplates = computed(() =>
    this.templateStore.all().filter((t) => t.status === 'approved' && t.variableCount <= 3),
  );

  // ---- Reprice (saved quotations only) -------------------------------------
  protected readonly reprice = signal<RepriceResultDto | null>(null);
  protected readonly repricing = signal(false);
  protected readonly changedLines = computed(() =>
    (this.reprice()?.lines ?? []).filter((l) => l.changed),
  );

  protected readonly Source = QuotePriceSource;

  protected readonly title = computed(() => {
    const q = this.quote();
    if (!q) return 'New quotation';
    return this.readOnly() ? `Quotation ${q.reference ?? ''}` : `Edit ${q.reference ?? ''}`;
  });

  constructor() {
    // Whoever the quotation is for, the people it can be sent to follow: them, and the rest of their account.
    effect(() => {
      const id = this.primaryContactId();
      untracked(() => void this.loadRecipients(id));
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    try {
      const lists = await this.api.priceLists();
      this.lists.set(lists);
      if (id) {
        this.isNew.set(false);
        this.load(await this.api.get(id));
        void this.loadCustomerLabel();
      } else {
        this.startNew();
      }
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The quotation could not be opened.'));
    } finally {
      this.loading.set(false);
    }
  }

  private startNew(): void {
    const q = this.route.snapshot.queryParamMap;
    const accountId = q.get('account');
    if (accountId) {
      this.header.set({ mode: 'manual', enquiryId: '', contactId: '', title: '' });
      this.manualFor.set('account');
      void this.chooseAccount({ id: accountId, name: q.get('name') || 'Selected account' });
      return;
    }
    const contactId = q.get('contact');
    if (contactId) {
      this.initialContact.set({ id: contactId, label: q.get('name') || 'Selected customer' });
      this.header.set({ mode: 'manual', enquiryId: '', contactId, title: '' });
      return;
    }
    const enquiryId = q.get('enquiry') ?? '';
    this.header.set({ mode: 'enquiry', enquiryId, contactId: '', title: '' });
    if (enquiryId) void this.loadEnquiryContact(enquiryId);
  }

  private load(quote: QuotationDto): void {
    this.quote.set(quote);
    this.listId.set(quote.priceListId ?? '');
    this.quoteRatePct.set(String((quote.taxRateBasisPoints ?? 1800) / 100));
    this.rows.set(
      [...(quote.lines ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((l) => rowFromLine(l, this.nextKey++)),
    );
    this.dirty.set(false);
    this.reprice.set(null);
  }

  private async loadCustomerLabel(): Promise<void> {
    const q = this.quote();
    const enquiry = this.store.openEnquiryOptions().find((o) => o.id === q?.enquiryId);
    if (enquiry) this.customerLabel.set(enquiry.label);
    if (!q?.contactId || environment.useMockData) return;
    try {
      const c = await firstValueFrom(this.contactsApi.get(q.contactId));
      const who = [c.displayName ?? c.waId, c.companyName].filter(Boolean).join(' — ');
      this.customerLabel.set(enquiry ? `${who} · ${enquiry.label}` : who);
    } catch {
      // The page works without the name.
    }
  }

  private async loadEnquiryContact(enquiryId: string): Promise<void> {
    this.enquiryContactId.set(null);
    try {
      const detail = await this.store.loadEnquiry(enquiryId);
      if (this.header().enquiryId === enquiryId)
        this.enquiryContactId.set(detail.contactId ?? null);
    } catch {
      // Parts are then priced without the customer's own list.
    }
  }

  /** Whose prices parts are looked up at. */
  private context(): QuoteContext {
    const q = this.quote();
    if (q?.id) return { quotationId: q.id };
    const h = this.header();
    const contactId = h.mode === 'manual' ? h.contactId : this.enquiryContactId();
    return { contactId: contactId || null };
  }

  // ---- Header edits ----------------------------------------------------------

  protected setMode(mode: QuoteFor): void {
    this.header.update((h) => ({ ...h, mode }));
    this.matches.set([]);
    this.error.set(null);
    this.dirty.set(true);
  }

  protected setEnquiry(id: string): void {
    this.header.update((h) => ({ ...h, enquiryId: id }));
    this.matches.set([]);
    this.error.set(null);
    this.dirty.set(true);
    if (id) void this.loadEnquiryContact(id);
  }

  protected onContactPicked(option: PickerOption | null): void {
    this.header.update((h) => ({ ...h, contactId: option?.id ?? '' }));
    this.matches.set([]);
    this.error.set(null);
    this.dirty.set(true);
  }

  protected setManualFor(value: ManualFor): void {
    this.manualFor.set(value);
    this.header.update((h) => ({ ...h, contactId: '' }));
    this.initialContact.set(null);
    this.account.set(null);
    this.accountPeople.set([]);
    this.matches.set([]);
    this.error.set(null);
  }

  protected onAccountTerm(value: string): void {
    this.accountTerm.set(value);
    clearTimeout(this.accountTimer);
    if (value.trim().length < 2) {
      this.accountResults.set([]);
      return;
    }
    this.accountTimer = setTimeout(() => void this.searchAccounts(value.trim()), 250);
  }

  private async searchAccounts(term: string): Promise<void> {
    const seq = ++this.accountSeq;
    try {
      const page = await firstValueFrom(
        this.accountsApi.getList({ filter: term, skipCount: 0, maxResultCount: 8 }),
      );
      if (seq !== this.accountSeq) return;
      this.accountResults.set(
        (page.items ?? []).map((a) => ({
          id: a.id!,
          name: a.name ?? '',
          place: [a.city, a.state].filter(Boolean).join(', '),
        })),
      );
    } catch {
      if (seq === this.accountSeq) this.accountResults.set([]);
    }
  }

  protected async chooseAccount(a: { id: string; name: string }): Promise<void> {
    this.account.set(a);
    this.accountResults.set([]);
    this.accountTerm.set('');
    this.accountPeople.set([]);
    this.header.update((h) => ({ ...h, contactId: '' }));
    this.dirty.set(true);
    this.accountPeopleLoading.set(true);
    try {
      const people = await this.peopleOf(a.id);
      if (this.account()?.id !== a.id) return;
      this.accountPeople.set(people);
      // Addressed to the first of them until someone else is picked.
      if (people[0]?.id) this.setAddressee(people[0].id);
    } catch {
      this.error.set('The people of this account could not be loaded.');
    } finally {
      this.accountPeopleLoading.set(false);
    }
  }

  protected clearAccount(): void {
    this.account.set(null);
    this.accountPeople.set([]);
    this.header.update((h) => ({ ...h, contactId: '' }));
  }

  protected setAddressee(contactId: string): void {
    this.header.update((h) => ({ ...h, contactId }));
    this.matches.set([]);
    this.error.set(null);
    this.dirty.set(true);
  }

  protected personName(c: ContactDto): string {
    return personName(c);
  }

  private async peopleOf(accountId: string): Promise<ContactDto[]> {
    if (environment.useMockData) return [];
    const page = await firstValueFrom(
      this.contactsApi.getList({ accountId, skipCount: 0, maxResultCount: 100 }),
    );
    return page.items ?? [];
  }

  /** The quotation's contact, then everyone else on their account, each ticked or not to receive it. */
  private async loadRecipients(contactId: string): Promise<void> {
    const seq = ++this.recipientsSeq;
    if (!contactId || environment.useMockData) {
      this.recipients.set([]);
      this.sendTo.set(contactId ? [contactId] : []);
      return;
    }
    this.recipientsLoading.set(true);
    try {
      const own = await firstValueFrom(this.contactsApi.get(contactId));
      const others = own.accountId
        ? (await this.peopleOf(own.accountId)).filter((c) => c.id !== own.id)
        : [];
      if (seq !== this.recipientsSeq) return;
      this.recipients.set(
        [own, ...others].map((c) => ({
          id: c.id!,
          name: personName(c),
          waId: c.waId || null,
          email: c.emailAddress || null,
        })),
      );
      this.sendTo.set([own.id!]);
      // Email is the way to reach them when they have an address and no WhatsApp number.
      if (own.emailAddress && !own.waId) {
        this.issueSendEmail.set(true);
        this.issueSendWa.set(false);
      }
    } catch {
      if (seq === this.recipientsSeq) {
        this.recipients.set([]);
        this.sendTo.set([contactId]);
      }
    } finally {
      if (seq === this.recipientsSeq) this.recipientsLoading.set(false);
    }
  }

  protected toggleRecipient(id: string, on: boolean): void {
    this.sendTo.update((ids) => (on ? [...new Set([...ids, id])] : ids.filter((x) => x !== id)));
  }

  protected setTitle(value: string): void {
    this.header.update((h) => ({ ...h, title: value }));
    this.dirty.set(true);
  }

  // ---- Display helpers -------------------------------------------------------

  protected money(paise: number): string {
    return inr(paise);
  }
  protected lineTotal(r: QuoteRow): number {
    return lineTotalPaise(r);
  }
  protected below(r: QuoteRow): boolean {
    return belowMinimum(r);
  }
  protected discountedBy(r: QuoteRow): number {
    return belowListPaise(r);
  }
  protected ratePct(basisPoints: number): string {
    return String(basisPoints / 100);
  }

  protected listLabel(l: PriceListDto): string {
    const scope = [l.region, l.distributorTier].filter(Boolean).join(' · ');
    return scope ? `${l.name} (${scope})` : (l.name ?? '');
  }

  protected sourceLabel(r: QuoteRow): string {
    if (!r.fromList) return 'Typed';
    return r.source === QuotePriceSource.PriceList
      ? `Price list${r.listName ? ' · ' + r.listName : ''}`
      : 'Catalogue';
  }

  protected setQuoteRate(value: string): void {
    this.quoteRatePct.set(value);
    this.dirty.set(true);
  }

  protected setListId(id: string): void {
    this.listId.set(id);
    this.matches.set([]);
    this.dirty.set(true);
    this.reprice.set(null);
  }

  // ---- Line edits ------------------------------------------------------------

  protected edit(key: number, field: keyof QuoteRow, value: string): void {
    this.rows.update((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, [field]: value } as QuoteRow;
        // A price typed over a list price is a manual price from then on, and so is a part that was swapped.
        if (field === 'price' || field === 'partNumber') {
          next.fromList = false;
          next.keep = false;
          next.source = QuotePriceSource.Manual;
          next.priceListId = null;
          next.listName = null;
          if (field === 'partNumber') {
            next.listPaise = null;
            next.moq = 0;
          }
        }
        return next;
      }),
    );
    this.dirty.set(true);
  }

  protected remove(key: number): void {
    this.rows.update((rows) => rows.filter((r) => r.key !== key));
    this.dirty.set(true);
  }

  protected addBlank(): void {
    this.rows.update((rows) => [...rows, blankRow(this.nextKey++)]);
    this.dirty.set(true);
  }

  /** Puts a typed-over line back on the list price. */
  protected async useListPrice(r: QuoteRow): Promise<void> {
    if (!r.partNumber.trim()) return;
    try {
      const priced = await this.api.resolve(
        this.context(),
        this.listId() || null,
        r.partNumber.trim(),
        Number(r.quantity) || 1,
      );
      if (!priced.found) {
        this.error.set(
          `${r.partNumber} is not in a price list or the catalogue: price it by hand.`,
        );
        return;
      }
      this.error.set(null);
      this.rows.update((rows) =>
        rows.map((x) =>
          x.key !== r.key
            ? x
            : {
                ...x,
                price: String((priced.unitPriceInPaise ?? 0) / 100),
                unit: priced.unit ?? x.unit,
                fromList: true,
                keep: false,
                source: priced.source ?? QuotePriceSource.Catalogue,
                priceListId: priced.priceListId ?? null,
                listName: priced.priceListName ?? null,
                tax:
                  x.tax === '' && priced.taxRateBasisPoints != null
                    ? String(priced.taxRateBasisPoints / 100)
                    : x.tax,
                listPaise: priced.unitPriceInPaise ?? null,
                moq: priced.minimumOrderQuantity ?? 0,
              },
        ),
      );
      this.dirty.set(true);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The price could not be looked up.'));
    }
  }

  // ---- Picker ------------------------------------------------------------------

  protected onTerm(value: string): void {
    this.term.set(value);
    this.pickerOpen.set(true);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.search(), 200);
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
    if (!this.matches().length) void this.search();
  }

  protected closePickerSoon(): void {
    // Late enough for a click on a match to land first.
    setTimeout(() => this.pickerOpen.set(false), 150);
  }

  private async search(): Promise<void> {
    const seq = ++this.searchSeq;
    this.searching.set(true);
    try {
      const found = await this.api.search(
        this.context(),
        this.listId() || null,
        this.term().trim() || null,
      );
      if (seq === this.searchSeq) this.matches.set(found);
    } catch {
      if (seq === this.searchSeq) this.matches.set([]);
    } finally {
      if (seq === this.searchSeq) this.searching.set(false);
    }
  }

  protected pick(m: CatalogueMatchDto): void {
    this.rows.update((rows) => [...rows, rowFromMatch(m, this.nextKey++)]);
    this.dirty.set(true);
    this.term.set('');
    this.pickerOpen.set(false);
  }

  // ---- Save and issue ----------------------------------------------------------

  protected async save(issue: boolean): Promise<void> {
    const header = this.isNew() ? this.header() : null;
    const message =
      this.accountProblem() ??
      validateQuotation(header, this.rows(), issue) ??
      (issue ? validateIssue(this.issueChoice(), this.recipients()) : null);
    if (message) {
      this.error.set(message);
      this.toasts.warning(message, 'Quotation');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    let saved = this.quote();
    try {
      const body = quotationPayload(
        header,
        saved?.enquiryId ?? null,
        this.listId(),
        this.taxRate(),
        this.rows(),
      );
      if (!saved?.id) {
        saved = await this.api.create(body);
      } else if (this.dirty()) {
        saved = await this.api.update(saved.id, body);
      }
      this.load(saved!);
    } catch (e: unknown) {
      this.fail(readApiError(e, 'The quotation could not be saved.'));
      return;
    }

    if (!issue) {
      this.toasts.success(`${saved!.reference} saved.`);
      this.done();
      return;
    }

    try {
      const days = Number(this.validDays().trim());
      const result = await this.store.issueQuote(saved!.id!, {
        validUntilUtc: new Date(Date.now() + days * 86_400_000).toISOString(),
        sendOnWhatsApp: this.issueSendWa(),
        templateId: this.issueSendWa() && this.issueTemplateId() ? this.issueTemplateId() : null,
        sendByEmail: this.issueSendEmail(),
        recipientContactIds: this.sendTo().length ? this.sendTo() : null,
        extraEmails: this.issueSendEmail() ? parseEmails(this.extraEmails()) : null,
      });
      const notes = [result.note, result.emailNote].filter((n): n is string => !!n);
      const text = [`${saved!.reference} issued.`, ...notes].join(' ');
      const allWent =
        (!this.issueSendWa() || result.sent !== false) &&
        (!this.issueSendEmail() || result.emailSent !== false);
      if (allWent) this.toasts.success(text);
      else this.toasts.warning(text, 'Quotation');
      this.done();
    } catch (e: unknown) {
      // Saved but not issued: stay on the saved quotation so trying again does not make a second one.
      this.isNew.set(false);
      if (!this.route.snapshot.paramMap.get('id')) {
        void this.router.navigate(['/quotations', saved!.id, 'edit'], { replaceUrl: true });
      }
      this.fail(`Saved, but not issued: ${readApiError(e, 'the quotation could not be issued.')}`);
    }
  }

  /** A manual quotation for an account is addressed to one of its people, so it needs one. */
  private accountProblem(): string | null {
    if (!this.isNew() || this.header().mode !== 'manual' || this.manualFor() !== 'account') {
      return null;
    }
    if (!this.account()) return 'Pick the account this quotation is for.';
    if (!this.header().contactId) {
      return this.accountPeople().length
        ? 'Pick who at the account it is addressed to.'
        : 'This account has no people yet. Add a contact to it in Accounts, or quote a contact instead.';
    }
    return null;
  }

  private fail(message: string): void {
    this.error.set(message);
    this.toasts.error(message, 'Quotation');
    this.saving.set(false);
  }

  private done(): void {
    this.saving.set(false);
    this.dirty.set(false);
    this.store.reloadQuotes();
    void this.router.navigateByUrl(this.origin.returnUrl('/quotations'));
  }

  protected readonly downloading = signal(false);

  /** The saved quotation's document: a draft as last saved, an issued one as it was sent. */
  protected async downloadPdf(): Promise<void> {
    const q = this.quote();
    if (!q?.id) return;
    this.downloading.set(true);
    try {
      await this.store.downloadQuote(q.id, q.reference ?? '');
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The PDF could not be made.'), 'Quotation');
    } finally {
      this.downloading.set(false);
    }
  }

  protected async previewReprice(): Promise<void> {
    const id = this.quote()?.id;
    if (!id) return;
    this.repricing.set(true);
    this.error.set(null);
    try {
      this.reprice.set(await this.api.reprice(id, { keepManualPrices: true, apply: false }));
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The prices could not be checked.'));
    } finally {
      this.repricing.set(false);
    }
  }

  protected async applyReprice(): Promise<void> {
    const id = this.quote()?.id;
    if (!id) return;
    this.repricing.set(true);
    this.error.set(null);
    try {
      await this.api.reprice(id, { keepManualPrices: true, apply: true });
      this.load(await this.api.get(id));
      this.store.reloadQuotes();
      this.toasts.success('Lines updated to today’s prices.');
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The prices could not be updated.'));
    } finally {
      this.repricing.set(false);
    }
  }

  protected async cancel(): Promise<void> {
    if (
      this.dirty() &&
      !this.readOnly() &&
      !(await this.dialogs.confirm({
        title: 'Discard your changes?',
        message: 'The changes to this quotation have not been saved.',
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        tone: 'danger',
      }))
    )
      return;
    void this.router.navigateByUrl(this.origin.returnUrl('/quotations'));
  }
}
