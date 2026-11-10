import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  NetworkLeadDto,
  NetworkService,
  RoutingSuggestionDto,
} from '../../proxy/network/network.service';
import { ArButton, ArDialog } from '../../ui';
import { place, title } from './network-logic';

/**
 * S3: send one of the OEM's enquiries to a dealer. Shows what it will be routed on and the dealers that cover it, best first;
 * the OEM confirms its customers know a dealer may contact them, then routes to the best match or a dealer it picks.
 */
@Component({
  selector: 'ar-route-lead-dialog',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog title="Route to a dealer" (dismiss)="closed.emit(null)">
      @if (s(); as sg) {
        <p class="rl__facts">
          Routed on <strong>{{ where(sg) }}</strong>
          @if (sg.productLine) {
            · product line <strong>{{ sg.productLine }}</strong>
          }
        </p>
        @if (!sg.pin) {
          <p class="rl__hint">
            Add the customer's PIN code to the enquiry (attribute “pincode”) for the closest match.
          </p>
        }
        @if (sg.candidates.length) {
          <fieldset class="rl__list">
            <legend>Dealers covering this customer</legend>
            <label class="rl__opt" for="rl-best">
              <input
                id="rl-best"
                type="radio"
                name="rl-dealer"
                [checked]="choice() === ''"
                (change)="choice.set('')"
              />
              <span
                ><b>Best match</b>: {{ sg.candidates[0].dealerName }}
                <small>{{ reason(sg.candidates[0].reason) }}; equals take turns</small></span
              >
            </label>
            @for (c of sg.candidates; track c.linkId) {
              <label class="rl__opt" [for]="'rl-' + c.linkId">
                <input
                  [id]="'rl-' + c.linkId"
                  type="radio"
                  name="rl-dealer"
                  [checked]="choice() === c.linkId"
                  (change)="choice.set(c.linkId)"
                />
                <span
                  >{{ c.dealerName }} <small>{{ reason(c.reason) }}</small></span
                >
              </label>
            }
          </fieldset>
        } @else {
          <p class="rl__hint">
            No active dealer covers this customer (or every one has declined it). Routing puts it in
            your queue on the Dealer network page until a dealer's territory is widened.
          </p>
        }
        <label class="rl__consent" for="rl-consent">
          <input
            id="rl-consent"
            type="checkbox"
            [checked]="consent()"
            (change)="consent.set($any($event.target).checked)"
          />
          <span
            >The customer may be contacted by a dealer{{
              sg.sharesConversation
                ? ', and the dealer who accepts will see their WhatsApp conversation with us'
                : ''
            }}. <small>{{ sg.consentNote }}</small></span
          >
        </label>
      } @else if (!error()) {
        <p class="rl__hint">Finding dealers…</p>
      }
      @if (error(); as e) {
        <p class="rl__err" role="alert">{{ e }}</p>
      }
      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(null)">Cancel</button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="!s() || !consent() || busy()"
          (click)="route()"
        >
          {{ busy() ? 'Routing…' : s()?.candidates?.length ? 'Offer to dealer' : 'Put in queue' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .rl__facts,
    .rl__hint {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-600, #475467);
    }
    .rl__hint {
      color: var(--ar-ink-500);
      font-size: 12.5px;
    }
    .rl__list {
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      margin: 0;
      padding: 6px 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rl__list legend {
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
      padding: 0 4px;
    }
    .rl__opt,
    .rl__consent {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font: 400 13px/1.45 var(--ar-font-sans);
    }
    .rl__opt small,
    .rl__consent small {
      display: block;
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .rl__opt input,
    .rl__consent input {
      margin-top: 3px;
    }
    .rl__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
  `,
})
export class ArRouteLeadDialog {
  private readonly api = inject(NetworkService);

  readonly enquiryId = input.required<string>();
  /** The lead as routed, or null when cancelled. */
  readonly closed = output<NetworkLeadDto | null>();

  protected readonly s = signal<RoutingSuggestionDto | null>(null);
  protected readonly choice = signal('');
  protected readonly consent = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.enquiryId();
      this.s.set(null);
      this.error.set(null);

      firstValueFrom(this.api.suggest(id))
        .then((sg) => this.s.set(sg))
        .catch((e: unknown) =>
          this.error.set(problem(e, 'Could not find dealers for this enquiry.')),
        );
    });
  }

  protected where(sg: RoutingSuggestionDto): string {
    return place(sg.pin, sg.city, sg.state);
  }

  protected reason(r: string): string {
    return r.replace(/covers ([A-Z][A-Z ]+)$/, (_, name: string) => 'covers ' + title(name));
  }

  protected async route(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.closed.emit(
        await firstValueFrom(
          this.api.route({
            enquiryId: this.enquiryId(),
            linkId: this.choice() || null,
            consentConfirmed: this.consent(),
          }),
        ),
      );
    } catch (e: unknown) {
      this.error.set(problem(e, 'The enquiry could not be routed.'));
    } finally {
      this.busy.set(false);
    }
  }
}

export function problem(e: unknown, fallback: string): string {
  return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
}
