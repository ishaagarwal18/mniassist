import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../../core/auth/permission';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { inr } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import { QuotationDto, QuotationService, QuotationState } from '../../../proxy/pipeline';
import type {
  NegotiationOfferDto,
  NegotiationPolicyDto,
  NegotiationSessionDto,
  ProcessChatNegotiationResultDto,
  SimulateNegotiationResultDto,
} from '../../../proxy/pipeline/negotiation-agent.models';
import { NegotiationAgentService } from '../../../proxy/pipeline/negotiation-agent.service';
import {
  CustomerPersona,
  NegotiationAction,
  NegotiationSessionStatus,
  NegotiationStrategy,
  OfferSender,
} from '../../../proxy/pipeline/negotiation-enums';
import { ArBanner, ArButton, ArCard, ArChip, ArDialog } from '../../../ui';
import {
  ACTION_LABEL,
  PERSONAS,
  SENDER_LABEL,
  STATUS,
  STRATEGIES,
  StatusFilter,
  marginPosition,
  matchesFilter,
  rulesProblem,
  rupeesToPaise,
  totalsOf,
} from './ai-negotiator.logic';

type Tab = 'negotiations' | 'rules' | 'practice';

/** What the negotiator just did, shown above the conversation until dismissed. */
interface Outcome {
  tone: 'good' | 'warn';
  title: string;
  lines: string[];
  /** A reply to paste into the customer's chat. */
  reply?: string;
}

const DEFAULT_RULES = {
  name: 'Default rules',
  isActive: true,
  targetMarginPercent: 25,
  floorMarginPercent: 15,
  maxDiscountPercent: 10,
  maxRounds: 4,
  strategy: NegotiationStrategy.ConcessionCurve,
  concessionStepPercent: 2.5,
  allowPaymentTermTradeoffs: true,
  allowVolumeCommitmentTradeoffs: true,
  minVolumeIncreasePercent: 20,
  autoApprovalLimitInPaise: 5_00_000_00,
  systemPromptGuidance: '',
};

/**
 * The negotiator: when a customer pushes back on a quotation's price, it answers within your rules (target margin, the lowest
 * margin you accept, the largest discount, how many rounds). You type in what the customer said; it works out the reply and keeps
 * the history. It does not message the customer by itself: copy the reply into their chat.
 */
@Component({
  selector: 'ar-ai-negotiator',
  imports: [ArTopbar, ArButton, ArCard, ArChip, ArDialog, ArBanner, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-negotiator.html',
  styleUrl: './ai-negotiator.scss',
})
export class ArAiNegotiator implements OnInit {
  private readonly api = inject(NegotiationAgentService);
  private readonly quotationsApi = inject(QuotationService);
  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly canManageRules = grantedPolicy(
    'AutoReach.NegotiationAgent.ManagePolicy',
    this.permissions,
  );
  protected readonly canIntervene = grantedPolicy(
    'AutoReach.NegotiationAgent.Intervene',
    this.permissions,
  );
  protected readonly canPractise = grantedPolicy(
    'AutoReach.NegotiationAgent.Simulate',
    this.permissions,
  );

  protected readonly tab = signal<Tab>('negotiations');
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly working = signal<string | null>(null);

  protected readonly Status = NegotiationSessionStatus;
  protected readonly Sender = OfferSender;
  protected readonly statusOf = STATUS;
  protected readonly actionLabel = ACTION_LABEL;
  protected readonly senderLabel = SENDER_LABEL;
  protected readonly strategies = STRATEGIES;
  protected readonly personas = PERSONAS;

  // ---- negotiations ---------------------------------------------------------------------------
  protected readonly sessions = signal<NegotiationSessionDto[]>([]);
  protected readonly filter = signal<StatusFilter>('all');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly shown = computed(() =>
    this.sessions().filter((s) => matchesFilter(s, this.filter())),
  );
  protected readonly selected = computed(
    () => this.sessions().find((s) => s.id === this.selectedId()) ?? null,
  );
  protected readonly totals = computed(() => totalsOf(this.sessions()));
  protected readonly outcome = signal<Outcome | null>(null);
  protected readonly customerSaid = signal('');

  // ---- rules ----------------------------------------------------------------------------------
  protected readonly rules = signal<NegotiationPolicyDto | null>(null);
  protected readonly draft = signal({ ...DEFAULT_RULES });
  protected readonly rulesSavedAt = signal<Date | null>(null);
  protected readonly rulesError = signal<string | null>(null);

  // ---- start ----------------------------------------------------------------------------------
  protected readonly startOpen = signal(false);
  protected readonly quotes = signal<QuotationDto[]>([]);
  protected readonly startQuoteId = signal('');
  protected readonly startMessage = signal('');
  protected readonly dialogError = signal<string | null>(null);

  // ---- take over ------------------------------------------------------------------------------
  protected readonly takeOverOpen = signal(false);
  protected readonly toAction = signal<NegotiationAction>(NegotiationAction.CounterOffer);
  protected readonly toAmount = signal('');
  protected readonly toTerms = signal('');
  protected readonly toNotes = signal('');
  protected readonly toMessage = signal('');
  protected readonly Action = NegotiationAction;

  // ---- practice -------------------------------------------------------------------------------
  protected readonly simQuote = signal('500000');
  protected readonly simCost = signal('375000');
  protected readonly simPersona = signal<CustomerPersona>(CustomerPersona.AggressiveProcurement);
  protected readonly simDemand = signal('18');
  protected readonly sim = signal<SimulateNegotiationResultDto | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(selectId?: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const [rules, page] = await Promise.all([
        firstValueFrom(this.api.getActivePolicy()).catch(() => null),
        firstValueFrom(this.api.getSessions({ maxResultCount: 100, skipCount: 0 })),
      ]);
      if (rules) {
        this.rules.set(rules);
        this.draft.set({
          name: rules.name,
          isActive: rules.isActive,
          targetMarginPercent: rules.targetMarginPercent,
          floorMarginPercent: rules.floorMarginPercent,
          maxDiscountPercent: rules.maxDiscountPercent,
          maxRounds: rules.maxRounds,
          strategy: rules.strategy,
          concessionStepPercent: rules.concessionStepPercent,
          allowPaymentTermTradeoffs: rules.allowPaymentTermTradeoffs,
          allowVolumeCommitmentTradeoffs: rules.allowVolumeCommitmentTradeoffs,
          minVolumeIncreasePercent: rules.minVolumeIncreasePercent,
          autoApprovalLimitInPaise: rules.autoApprovalLimitInPaise,
          systemPromptGuidance: rules.systemPromptGuidance ?? '',
        });
      }
      const items = page.items ?? [];
      this.sessions.set(items);
      const keep = selectId ?? this.selectedId();
      this.selectedId.set(items.find((s) => s.id === keep)?.id ?? items[0]?.id ?? null);
    } catch (e: unknown) {
      this.loadError.set(readApiError(e, 'The negotiations could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected select(s: NegotiationSessionDto): void {
    this.selectedId.set(s.id ?? null);
    this.outcome.set(null);
    this.customerSaid.set('');
  }

  private async run(name: string, work: () => Promise<void>, failure: string): Promise<void> {
    this.working.set(name);
    try {
      await work();
    } catch (e: unknown) {
      this.outcome.set({ tone: 'warn', title: failure, lines: [readApiError(e, failure)] });
    } finally {
      this.working.set(null);
    }
  }

  private outcomeOf(r: ProcessChatNegotiationResultDto, title: string): Outcome {
    return {
      tone: r.escalated ? 'warn' : 'good',
      title,
      lines: [
        `${ACTION_LABEL[r.actionTaken]}: ${this.money(r.currentAmountInPaise)} (${r.currentDiscountPercent}% off, ${r.currentMarginPercent}% margin).`,
        r.aiReasoning,
        ...(r.escalated ? ['This is outside your rules, so it needs you: use Take over.'] : []),
      ],
      reply: r.replyWhatsAppText,
    };
  }

  // ---- start a negotiation --------------------------------------------------------------------

  protected async openStart(): Promise<void> {
    this.dialogError.set(null);
    this.startMessage.set('');
    this.startOpen.set(true);
    try {
      const [issued, revised] = await Promise.all([
        firstValueFrom(
          this.quotationsApi.getList({ state: QuotationState.Issued, maxResultCount: 100 }),
        ),
        firstValueFrom(
          this.quotationsApi.getList({ state: QuotationState.Revised, maxResultCount: 100 }),
        ),
      ]);
      const open = new Set(
        this.sessions()
          .filter((s) => matchesFilter(s, 'open'))
          .map((s) => s.quotationId),
      );
      const list = [...(issued.items ?? []), ...(revised.items ?? [])].filter(
        (q) => !open.has(q.id!),
      );
      this.quotes.set(list);
      this.startQuoteId.set(list[0]?.id ?? '');
    } catch (e: unknown) {
      this.dialogError.set(readApiError(e, 'The quotations could not be loaded.'));
    }
  }

  protected async start(): Promise<void> {
    const quote = this.quotes().find((q) => q.id === this.startQuoteId());
    if (!quote) {
      this.dialogError.set('Pick the quotation the customer is negotiating.');
      return;
    }
    if (!this.startMessage().trim()) {
      this.dialogError.set('Type what the customer asked for, e.g. "Can you do 12% less?"');
      return;
    }
    await this.run(
      'start',
      async () => {
        const r = await firstValueFrom(
          this.api.processChatNegotiation({
            quotationId: quote.id,
            contactId: quote.contactId!,
            customerMessage: this.startMessage().trim(),
          }),
        );
        this.startOpen.set(false);
        this.tab.set('negotiations');
        this.filter.set('all');
        await this.load(r.sessionId);
        this.outcome.set(this.outcomeOf(r, `Started ${r.sessionCode} on ${quote.reference}`));
      },
      'The negotiation could not be started.',
    );
  }

  // ---- the customer's next reply --------------------------------------------------------------

  protected async answer(s: NegotiationSessionDto): Promise<void> {
    const said = this.customerSaid().trim();
    if (!said) return;
    await this.run(
      'answer',
      async () => {
        const r = await firstValueFrom(
          this.api.processChatNegotiation({
            sessionId: s.id,
            quotationId: s.quotationId,
            contactId: s.contactId,
            customerMessage: said,
          }),
        );
        this.customerSaid.set('');
        await this.load(s.id);
        this.outcome.set(this.outcomeOf(r, `Round ${(s.roundCount ?? 0) + 1} answered`));
      },
      'The reply could not be worked out.',
    );
  }

  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toasts.success('Reply copied. Paste it into the customer’s chat.');
    } catch {
      this.toasts.warning('Copy did not work here; select the text and copy it.');
    }
  }

  // ---- apply and take over --------------------------------------------------------------------

  protected async apply(s: NegotiationSessionDto): Promise<void> {
    await this.run(
      'apply',
      async () => {
        const q = await firstValueFrom(this.api.applyToQuotation(s.id!));
        await this.load(s.id);
        this.outcome.set({
          tone: 'good',
          title: `${q.reference} revised to the agreed price`,
          lines: [
            `${s.currentDiscountPercent}% discount applied to every line and issued as revision ${q.revisionNumber}, valid for 15 days.`,
            'Send the new PDF to the customer from Quotations.',
          ],
        });
      },
      'The agreed price could not be applied to the quotation.',
    );
  }

  protected openTakeOver(s: NegotiationSessionDto): void {
    this.toAction.set(NegotiationAction.CounterOffer);
    this.toAmount.set(String(Math.round(s.currentAmountInPaise / 100)));
    this.toTerms.set(s.paymentTerms ?? '');
    this.toNotes.set('');
    this.toMessage.set('');
    this.dialogError.set(null);
    this.takeOverOpen.set(true);
  }

  protected async takeOver(s: NegotiationSessionDto): Promise<void> {
    const amount =
      this.toAction() === NegotiationAction.CounterOffer ? rupeesToPaise(this.toAmount()) : null;
    if (this.toAction() === NegotiationAction.CounterOffer && amount === null) {
      this.dialogError.set('Enter the price you are offering, in rupees.');
      return;
    }
    if (!this.toNotes().trim()) {
      this.dialogError.set('Note why, for the history.');
      return;
    }
    await this.run(
      'takeover',
      async () => {
        const updated = await firstValueFrom(
          this.api.intervene({
            sessionId: s.id!,
            action: this.toAction(),
            overrideAmountInPaise: amount ?? undefined,
            overridePaymentTerms: this.toTerms().trim() || undefined,
            managerNotes: this.toNotes().trim(),
            whatsAppMessageDraft: this.toMessage().trim() || undefined,
          }),
        );
        this.takeOverOpen.set(false);
        await this.load(s.id);
        const last = updated.offers[updated.offers.length - 1];
        this.outcome.set({
          tone: 'good',
          title: `You ${ACTION_LABEL[this.toAction()].toLowerCase()} on ${s.sessionCode}`,
          lines: [
            `${this.money(updated.currentAmountInPaise)} (${updated.currentDiscountPercent}% off, ${updated.currentMarginPercent}% margin). Now: ${STATUS[updated.status].label}.`,
            ...(updated.status === NegotiationSessionStatus.Agreed && updated.revisedQuotationId
              ? ['The quotation was revised to this price.']
              : []),
          ],
          reply: last?.messageContent,
        });
      },
      'Your decision could not be saved.',
    );
  }

  // ---- rules ----------------------------------------------------------------------------------

  protected patch<K extends keyof typeof DEFAULT_RULES>(
    key: K,
    value: (typeof DEFAULT_RULES)[K],
  ): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
    this.rulesError.set(null);
  }

  protected num(value: string): number {
    return Number(String(value).replace(/[,\s]/g, ''));
  }

  protected async saveRules(): Promise<void> {
    const d = this.draft();
    const problem = rulesProblem(d);
    if (problem) {
      this.rulesError.set(problem);
      return;
    }
    this.working.set('rules');
    try {
      this.rules.set(
        await firstValueFrom(
          this.api.createOrUpdatePolicy({
            ...d,
            systemPromptGuidance: d.systemPromptGuidance || undefined,
          }),
        ),
      );
      this.rulesSavedAt.set(new Date());
      this.toasts.success('Negotiation rules saved. New replies follow them.');
    } catch (e: unknown) {
      this.rulesError.set(readApiError(e, 'The rules could not be saved.'));
    } finally {
      this.working.set(null);
    }
  }

  // ---- practice -------------------------------------------------------------------------------

  protected async practise(): Promise<void> {
    const quote = rupeesToPaise(this.simQuote());
    const cost = rupeesToPaise(this.simCost());
    const demand = Number(this.simDemand());
    if (quote === null || cost === null) {
      this.toasts.warning('Enter the quoted price and your cost in rupees.', 'Practice');
      return;
    }
    if (cost >= quote) {
      this.toasts.warning('Your cost must be below the quoted price.', 'Practice');
      return;
    }
    if (!Number.isFinite(demand) || demand <= 0 || demand > 60) {
      this.toasts.warning('The discount the customer asks for must be 1 to 60%.', 'Practice');
      return;
    }
    this.working.set('practice');
    try {
      this.sim.set(
        await firstValueFrom(
          this.api.simulateNegotiation({
            quotationAmountInPaise: quote,
            estimatedCostInPaise: cost,
            persona: this.simPersona(),
            initialCustomerDiscountDemandPercent: demand,
          }),
        ),
      );
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The practice run could not be done.'), 'Practice');
    } finally {
      this.working.set(null);
    }
  }

  // ---- display --------------------------------------------------------------------------------

  protected money(paise: number | null | undefined): string {
    return inr(paise ?? 0);
  }

  protected when(iso?: string | Date | null): string {
    return iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
  }

  protected pos(margin: number): number {
    return marginPosition(margin);
  }

  protected side(o: NegotiationOfferDto): string {
    return o.sender === OfferSender.Customer
      ? 'in'
      : o.sender === OfferSender.HumanSalesManager
        ? 'mgr'
        : 'out';
  }

  protected strategyHint(): string {
    return STRATEGIES.find((s) => s.value === this.draft().strategy)?.hint ?? '';
  }

  protected quoteLabel(q: QuotationDto): string {
    return `${q.reference} · ${this.money(q.totalInPaise)}${(q.revisionNumber ?? 0) > 0 ? ' · rev ' + q.revisionNumber : ''}`;
  }

  protected time(d: Date): string {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
}
