import { ArCatalogueItem } from '../sales/catalogue-item';
import type { ProductDto } from '../../proxy/library/product.service';
import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import {
  DealRegistrationService,
  OemSettingsService,
  OemSupplierDto,
  SaveSpaInput,
  SaveSpaLineInput,
  SpaDto,
  SpaMode,
  SpaRequestFormat,
  SpaResaleRule,
  SpaService,
  SpaStatus,
} from '../../proxy/oem/oem-pricing.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { ArAccountSearch, PickedAccount } from '../projects/account-search';
import {
  RESALE_TEXT,
  SPA_STATUS_TEXT,
  SPA_STATUS_TONE,
  indiaDay,
  parsePastedDecision,
  resaleLabel,
  resaleText,
  resaleValue,
  rupees,
  toPaise,
} from './oem.logic';

/** A part as typed: money and quantities stay text until saved. */
interface LineForm {
  /** The item's name, typed or picked from the catalogue; saved at the start of the description. */
  partName: string;
  partNumber: string;
  description: string;
  productId: string | null;
  qty: string;
  normal: string;
  target: string;
  rule: SpaResaleRule;
  resale: string;
}

/** The OEM's answer for one line, as typed. */
interface DecisionForm {
  lineId: string;
  approved: string;
  special: string;
  rule: SpaResaleRule;
  resale: string;
}

const RULES = [SpaResaleRule.Floor, SpaResaleRule.Fixed, SpaResaleRule.MaxDiscount];

function blankLine(): LineForm {
  return {
    partName: '',
    partNumber: '',
    description: '',
    productId: null,
    qty: '1',
    normal: '',
    target: '',
    rule: SpaResaleRule.Floor,
    resale: '',
  };
}

function toForm(l: SaveSpaLineInput): LineForm {
  return {
    partName: '',
    partNumber: l.partNumber,
    description: l.description ?? '',
    productId: l.productId ?? null,
    qty: String(l.requestedQty),
    normal: l.normalBuyInPaise ? String(l.normalBuyInPaise / 100) : '',
    target: l.targetBuyInPaise ? String(l.targetBuyInPaise / 100) : '',
    rule: l.resaleRule,
    resale: resaleText(l.resaleValue),
  };
}

/**
 * A special price agreement: the request (header and parts, filled from an enquiry with ?enquiry=), the request pack for the OEM,
 * the OEM's decision (typed, or pasted from its email or Excel), and extending or cancelling it.
 */
@Component({
  selector: 'ar-spa-page',
  imports: [
    ArTopbar,
    ArBanner,
    ArButton,
    ArCard,
    ArChip,
    ArAccountSearch,
    RouterLink,
    ArCatalogueItem,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './spa-page.html',
  styleUrl: './oem-pages.scss',
})
export class ArSpaPage {
  private readonly api = inject(SpaService);
  private readonly oemsApi = inject(OemSettingsService);
  private readonly registrationsApi = inject(DealRegistrationService);
  private readonly accounts = inject(CustomerAccountService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);

  protected readonly canCreate = grantedPolicy('AutoReach.Spa.Create', this.permissions);
  protected readonly canApprove = grantedPolicy('AutoReach.Spa.Approve', this.permissions);

  protected readonly saved = signal<SpaDto | null>(null);
  protected readonly oems = signal<OemSupplierDto[]>([]);
  protected readonly customerName = signal('');
  protected readonly projectName = signal<string | null>(null);
  protected readonly enquiryReference = signal<string | null>(null);
  protected readonly header = signal<Omit<SaveSpaInput, 'lines'>>({
    supplierId: '',
    mode: SpaMode.ClaimBack,
  });
  protected readonly lines = signal<LineForm[]>([blankLine()]);
  protected readonly decisions = signal<DecisionForm[]>([]);
  protected readonly decisionRef = signal('');
  protected readonly decisionFrom = signal('');
  protected readonly decisionTo = signal('');
  protected readonly pasteText = signal('');
  protected readonly extendTo = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly Status = SpaStatus;
  protected readonly Mode = SpaMode;
  protected readonly Rule = SpaResaleRule;
  protected readonly rules = RULES;
  protected readonly rupees = rupees;
  protected readonly resaleLabel = resaleLabel;

  /** The parts are still the request's: editable. */
  protected readonly editingLines = computed(() => {
    const s = this.saved();
    return this.canCreate() && (!s || s.status === SpaStatus.Requested);
  });

  protected readonly problem = computed(() => {
    const h = this.header();
    if (!h.supplierId) return 'Choose the OEM.';
    if (!h.customerAccountId && !h.projectId) return 'Find the customer.';
    if (this.editingLines()) {
      const ls = this.lines();
      if (ls.length === 0) return 'Add at least one part.';
      for (const l of ls) {
        if (!l.partNumber.trim()) return 'Every line needs a part number.';
        if (!(Number(l.qty) > 0)) return `Give a quantity for ${l.partNumber}.`;
        if (!toPaise(l.normal)) return `Give the normal buy price for ${l.partNumber}.`;
      }
      const keys = ls.map((l) => l.partNumber.trim().toUpperCase());
      const dupe = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dupe) return `Part ${dupe} is listed twice.`;
    }
    return null;
  });

  constructor() {
    void this.load();
  }

  protected statusText(s: SpaStatus): string {
    return SPA_STATUS_TEXT[s];
  }

  protected tone(s: SpaStatus) {
    return SPA_STATUS_TONE[s];
  }

  protected ruleText(r: SpaResaleRule): string {
    return RESALE_TEXT[r];
  }

  protected patch(change: Partial<Omit<SaveSpaInput, 'lines'>>): void {
    this.header.update((h) => ({ ...h, ...change }));
  }

  protected pickCustomer(a: PickedAccount): void {
    this.patch({ customerAccountId: a.id });
    this.customerName.set(a.name);
  }

  protected setLine(i: number, change: Partial<LineForm>): void {
    this.lines.update((ls) => ls.map((l, j) => (j === i ? { ...l, ...change } : l)));
  }

  /** Typing a part name: a description still empty (or still the old name) follows it; it is no longer the picked item. */
  protected setPartName(i: number, value: string): void {
    this.lines.update((ls) =>
      ls.map((l, j) => {
        if (j !== i) return l;
        const followed = !l.description.trim() || l.description === l.partName;
        return {
          ...l,
          partName: value,
          description: followed ? value : l.description,
          productId: null,
        };
      }),
    );
  }

  /** A catalogue item fills the part number, description and, when not typed yet, the normal buy price. */
  protected pickPart(i: number, p: ProductDto): void {
    const name = p.name?.trim() ?? '';
    this.lines.update((ls) =>
      ls.map((l, j) =>
        j !== i
          ? l
          : {
              ...l,
              partName: name,
              partNumber: p.partNumber?.trim() ?? '',
              description: p.description?.trim() || name,
              productId: p.id ?? null,
              normal:
                l.normal.trim() || !p.purchasePriceInPaise
                  ? l.normal
                  : String(p.purchasePriceInPaise / 100),
            },
      ),
    );
  }

  protected addLine(): void {
    this.lines.update((ls) => [...ls, blankLine()]);
  }

  protected removeLine(i: number): void {
    this.lines.update((ls) => ls.filter((_, j) => j !== i));
  }

  protected setDecision(i: number, change: Partial<DecisionForm>): void {
    this.decisions.update((ds) => ds.map((d, j) => (j === i ? { ...d, ...change } : d)));
  }

  protected partOf(lineId: string): string {
    return this.saved()?.lines.find((l) => l.id === lineId)?.partNumber ?? '';
  }

  protected requestedOf(lineId: string): number {
    return this.saved()?.lines.find((l) => l.id === lineId)?.requestedQty ?? 0;
  }

  private async load(): Promise<void> {
    try {
      this.oems.set((await firstValueFrom(this.oemsApi.getList())).filter((o) => o.isOem));
      const id = this.route.snapshot.paramMap.get('id');
      if (id && id !== 'new') {
        this.fill(await firstValueFrom(this.api.get(id)));
        return;
      }
      const query = this.route.snapshot.queryParamMap;
      const registrationId = query.get('registration');
      const enquiryId = query.get('enquiry');
      if (enquiryId) {
        const draft = await firstValueFrom(this.api.getDraftFromEnquiry(enquiryId));
        const { lines, ...rest } = draft;
        this.header.update((h) => ({ ...h, ...rest }));
        if (lines.length) this.lines.set(lines.map(toForm));
        if (draft.customerAccountId) {
          const account = await firstValueFrom(this.accounts.get(draft.customerAccountId));
          this.customerName.set(account.name ?? '');
        }
      }
      if (registrationId) {
        const r = await firstValueFrom(this.registrationsApi.get(registrationId));
        this.patch({
          dealRegistrationId: r.id,
          supplierId: r.supplierId,
          customerAccountId: r.customerAccountId,
          enquiryId: r.enquiryId ?? this.header().enquiryId ?? null,
          projectId: r.projectId ?? this.header().projectId ?? null,
        });
        this.customerName.set(r.customerName);
        this.enquiryReference.set(r.enquiryReference ?? null);
        this.projectName.set(r.projectName ?? null);
      }
    } catch (e) {
      this.error.set(readApiError(e, 'The special price could not be loaded.'));
    }
  }

  private fill(s: SpaDto): void {
    this.saved.set(s);
    this.customerName.set(s.customerName ?? '');
    this.projectName.set(s.projectName ?? null);
    this.enquiryReference.set(s.enquiryReference ?? null);
    this.header.set({
      supplierId: s.supplierId,
      oemReference: s.oemReference,
      mode: s.mode,
      dealRegistrationId: s.dealRegistrationId,
      customerAccountId: s.customerAccountId,
      projectId: s.projectId,
      enquiryId: s.enquiryId,
      validFrom: indiaDay(s.validFrom) || null,
      validTo: indiaDay(s.validTo) || null,
      documentId: s.documentId,
      note: s.note,
      ownerUserId: s.ownerUserId,
    });
    this.lines.set(
      s.lines.map((l) =>
        toForm({
          partNumber: l.partNumber,
          description: l.description,
          productId: l.productId,
          requestedQty: l.requestedQty,
          normalBuyInPaise: l.normalBuyInPaise,
          targetBuyInPaise: l.targetBuyInPaise,
          resaleRule: l.resaleRule,
          resaleValue: l.resaleValue,
        }),
      ),
    );
    this.decisions.set(
      s.lines.map((l) => ({
        lineId: l.id,
        approved: String(s.status === SpaStatus.Requested ? l.requestedQty : l.approvedQty),
        special: l.specialBuyInPaise
          ? String(l.specialBuyInPaise / 100)
          : l.targetBuyInPaise
            ? String(l.targetBuyInPaise / 100)
            : '',
        rule: l.resaleRule,
        resale: resaleText(l.resaleValue),
      })),
    );
    this.decisionRef.set(s.oemReference ?? '');
    this.decisionFrom.set(indiaDay(s.validFrom));
    this.decisionTo.set(indiaDay(s.validTo));
  }

  private input(): SaveSpaInput {
    return {
      ...this.header(),
      oemReference: this.header().oemReference?.trim() || null,
      lines: this.lines().map((l) => ({
        partNumber: l.partNumber.trim(),
        description: spaLineDescription(l) || null,
        productId: l.productId,
        requestedQty: Number(l.qty),
        normalBuyInPaise: toPaise(l.normal) ?? 0,
        targetBuyInPaise: toPaise(l.target),
        resaleRule: l.rule,
        resaleValue: resaleValue(l.rule, l.resale),
      })),
    };
  }

  protected async save(): Promise<void> {
    if (this.problem()) return;
    this.busy.set(true);
    try {
      const id = this.saved()?.id;
      const saved = id
        ? await firstValueFrom(this.api.update(id, this.input()))
        : await firstValueFrom(this.api.create(this.input()));
      this.toasts.success(`${saved.reference} saved.`);
      if (!id) await this.router.navigate(['/oem/spa', saved.id]);
      this.fill(saved);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The special price could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async download(format: SpaRequestFormat): Promise<void> {
    const s = this.saved();
    if (!s) return;
    try {
      const blob = await firstValueFrom(this.api.getRequestPack(s.id, format));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${s.reference}-request.${format === SpaRequestFormat.Pdf ? 'pdf' : 'xlsx'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The request could not be made.'));
    }
  }

  protected applyPaste(): void {
    const s = this.saved();
    if (!s) return;
    const { matched, unmatched } = parsePastedDecision(this.pasteText(), s.lines);
    this.decisions.update((ds) =>
      ds.map((d) => {
        const m = matched.find((x) => x.lineId === d.lineId);
        if (!m) return d;
        return {
          ...d,
          approved: String(m.approvedQty),
          special: m.specialBuyInPaise ? String(m.specialBuyInPaise / 100) : d.special,
          resale: m.resaleValueText ?? d.resale,
        };
      }),
    );
    this.toasts.success(
      `${matched.length} lines filled.` +
        (unmatched.length ? ` Not on this agreement: ${unmatched.join(', ')}.` : ''),
    );
    this.pasteText.set('');
  }

  protected async recordDecision(): Promise<void> {
    const s = this.saved();
    if (!s) return;
    this.busy.set(true);
    try {
      this.fill(
        await firstValueFrom(
          this.api.recordDecision(s.id, {
            oemReference: this.decisionRef().trim() || null,
            validFrom: this.decisionFrom() || null,
            validTo: this.decisionTo() || null,
            lines: this.decisions().map((d) => ({
              lineId: d.lineId,
              approvedQty: Number(d.approved) || 0,
              specialBuyInPaise: toPaise(d.special),
              resaleRule: d.rule,
              resaleValue: resaleValue(d.rule, d.resale),
            })),
          }),
        ),
      );
      this.toasts.success('Decision recorded.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The decision could not be recorded.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async extend(): Promise<void> {
    const s = this.saved();
    if (!s || !this.extendTo()) return;
    this.busy.set(true);
    try {
      this.fill(await firstValueFrom(this.api.extend(s.id, { validTo: this.extendTo() })));
      this.extendTo.set('');
      this.toasts.success('Extended.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'It could not be extended.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async cancel(): Promise<void> {
    const s = this.saved();
    if (!s) return;
    const ok = await this.dialogs.confirm({
      title: `Cancel ${s.reference}?`,
      message: 'Quotes can no longer use it. Claims already made from invoices stay.',
      confirmText: 'Cancel it',
    });
    if (!ok) return;
    try {
      this.fill(await firstValueFrom(this.api.cancel(s.id)));
    } catch (e) {
      this.toasts.error(readApiError(e, 'It could not be cancelled.'));
    }
  }

  protected async remove(): Promise<void> {
    const s = this.saved();
    if (!s) return;
    const ok = await this.dialogs.confirm({
      title: `Delete ${s.reference}?`,
      message: 'One that has been used on invoices can only be cancelled.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(s.id));
      await this.router.navigate(['/oem/spa']);
    } catch (e) {
      this.toasts.error(readApiError(e, 'It could not be deleted.'));
    }
  }

  protected readonly Format = SpaRequestFormat;
}

/** The saved description: the part name, then any extra description that does not already start with it. */
function spaLineDescription(l: LineForm): string {
  const name = l.partName.trim();
  const desc = l.description.trim();
  if (!name) return desc;
  if (!desc || desc.toLowerCase().startsWith(name.toLowerCase())) return desc || name;
  return `${name} – ${desc}`;
}
