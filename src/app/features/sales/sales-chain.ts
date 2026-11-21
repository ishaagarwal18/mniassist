import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArIcon } from '../../ui';
import { ChainState, SalesChain } from './sales-chain.logic';

const STATE_TEXT: Record<ChainState, string> = {
  done: 'Done',
  partly: 'Partly done',
  current: 'You are here',
  todo: 'Not yet',
  skipped: 'Not used',
};

/**
 * The sale's progress at the top of an order, challan or invoice page: the earlier documents
 * (each a link), this one, what is left, and one sentence on what to do next.
 */
@Component({
  selector: 'ar-sales-chain',
  imports: [RouterLink, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = chain();
    <section class="sc" aria-label="Progress of this sale">
      <ol class="sc__steps">
        @for (s of c.steps; track s.key) {
          <li class="sc__step" [class]="'sc__step sc__step--' + s.state">
            <span class="sc__dot" aria-hidden="true">
              @if (s.state === 'done') {
                <ar-icon name="check" [size]="12" />
              }
            </span>
            <span class="sc__text">
              @if (s.route) {
                <a class="sc__name" [routerLink]="s.route">{{ s.label }}</a>
              } @else {
                <span class="sc__name">{{ s.label }}</span>
              }
              <span class="sc__state">
                @if (s.number) {
                  <span translate="no">{{ s.number }}</span> ·
                }
                {{ stateText(s.state) }}
              </span>
            </span>
          </li>
        }
      </ol>
      @if (c.cancelled) {
        <p class="sc__next sc__next--stop">This document is cancelled. Nothing more to do here.</p>
      } @else if (c.next) {
        <p class="sc__next"><strong>Next step:</strong> {{ c.next }}</p>
      } @else {
        <p class="sc__next sc__next--done">All done. This sale is paid in full.</p>
      }
    </section>
  `,
  styleUrl: './sales-chain.scss',
})
export class ArSalesChain {
  readonly chain = input.required<SalesChain>();

  protected stateText(state: ChainState): string {
    return STATE_TEXT[state];
  }
}
