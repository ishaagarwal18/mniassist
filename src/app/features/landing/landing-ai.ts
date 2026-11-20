import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ArIcon } from '../../ui';

/**
 * The AI section: what the AI actually does in the product (suggested replies,
 * conversation summaries, the knowledge-base assistant with hand-off, template
 * drafting), beside a product-style example. Teal marks AI, and only AI.
 */
@Component({
  selector: 'ar-landing-ai',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ai">
      <div class="ai__copy">
        <p class="ai__eyebrow"><ar-icon name="sparkle" [size]="13" /> AI built into the work</p>
        <h2>AI that drafts. Your team decides.</h2>
        <p class="ai__lede">
          MNI Assist's AI reads the conversation and your own knowledge base, then suggests the next
          reply. Nothing reaches a customer without a person, unless you switch on the assistant for
          questions it can answer with confidence.
        </p>
        <ul class="ai__list">
          @for (f of features; track f.title) {
            <li>
              <span class="ai__dot"><ar-icon name="sparkle" [size]="13" /></span>
              <span>
                <strong>{{ f.title }}</strong>
                {{ f.text }}
              </span>
            </li>
          }
        </ul>
      </div>

      <figure class="demo" aria-label="Example: AI summary and suggested replies in the inbox">
        <div class="demo__head">
          <span class="demo__avatar">SR</span>
          <span>
            <strong>Sunil Rao</strong>
            <small>Kaveri Packaging · 14 messages</small>
          </span>
        </div>
        <div class="demo__summary">
          <span class="demo__tag"><ar-icon name="sparkle" [size]="12" /> AI summary</span>
          <p>
            Wants a quote for 3 replacement servo drives for the line installed in 2023. Asked about
            delivery before the plant shutdown on 18 Nov.
          </p>
        </div>
        <p class="demo__msg">Can you confirm the price and delivery date for the 3 drives?</p>
        <div class="demo__suggest">
          <span class="demo__tag"><ar-icon name="sparkle" [size]="12" /> Suggested replies</span>
          <button type="button" tabindex="-1">
            I'll send the quotation for 3 drives today, with delivery before 18 Nov.
          </button>
          <button type="button" tabindex="-1">
            Let me check stock for the 3 drives and confirm the date within the hour.
          </button>
        </div>
        <figcaption>Example</figcaption>
      </figure>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .ai {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr);
      gap: 56px;
      align-items: center;
    }
    .ai__eyebrow {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 14px;
      font: 600 11.5px var(--ar-font-mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0a776f;
    }
    h2 {
      margin: 0;
      font-size: clamp(24px, 3vw, 32px);
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .ai__lede {
      margin: 14px 0 0;
      max-width: 52ch;
      font-size: 15px;
      line-height: 1.6;
      color: #475467;
    }
    .ai__list {
      display: grid;
      gap: 14px;
      margin: 24px 0 0;
      padding: 0;
      list-style: none;
      font-size: 14px;
      line-height: 1.5;
      color: #475467;
    }
    .ai__list li {
      display: flex;
      gap: 12px;
    }
    .ai__list strong {
      display: block;
      color: #0f172a;
    }
    .ai__dot {
      flex: none;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: #e6f8f6;
      border: 1px solid #a6ebe4;
      color: #0a776f;
    }
    .demo {
      margin: 0;
      padding: 16px;
      display: grid;
      gap: 12px;
      background: #fff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 14px;
      box-shadow:
        0 28px 68px -14px rgba(15, 23, 42, 0.09),
        0 12px 28px -8px rgba(15, 23, 42, 0.04);
      font-size: 13px;
      line-height: 1.5;
      color: #17202a;
      transition:
        transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
        box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1),
        border-color 260ms ease;
      animation: demoFloat 7s ease-in-out infinite;
      will-change: transform;
    }
    .demo:hover {
      animation-play-state: paused;
      transform: translateY(-4px);
    }
    @keyframes demoFloat {
      0% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-6px);
      }
      100% {
        transform: translateY(0);
      }
    }
    .demo__head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    }
    .demo__head small {
      display: block;
      font-size: 11.5px;
      color: #5f6b7c;
    }
    .demo__avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #ebf2ff;
      color: #0e47b8;
      font-weight: 700;
      font-size: 12px;
    }
    .demo__summary {
      padding: 10px 12px;
      border: 1px solid #a6ebe4;
      border-left: 3px solid #00b8a9;
      border-radius: 8px;
      background: #f3fcfb;
    }
    .demo__summary p {
      margin: 4px 0 0;
      color: #344054;
    }
    .demo__tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font: 600 11px var(--ar-font-sans);
      color: #0a776f;
    }
    .demo__msg {
      margin: 0;
      max-width: 85%;
      padding: 8px 10px;
      border: 1px solid rgba(15, 23, 42, 0.06);
      border-radius: 8px;
      background: #f9fafb;
    }
    .demo__suggest {
      display: grid;
      gap: 6px;
    }
    .demo__suggest button {
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #a6ebe4;
      border-radius: 8px;
      background: #f3fcfb;
      font: 400 12.5px/1.45 var(--ar-font-sans);
      color: #17202a;
      cursor: default;
    }
    figcaption {
      font: 400 11px var(--ar-font-mono);
      color: #5f6b7c;
    }
    @media (max-width: 960px) {
      .ai {
        grid-template-columns: minmax(0, 1fr);
        gap: 32px;
      }
    }
    @media (max-width: 480px) {
      .demo {
        padding: 12px;
      }
      .demo__msg {
        max-width: 95%;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .demo {
        animation: none;
        transform: none;
      }
    }
  `,
})
export class ArLandingAi {
  protected readonly features = [
    {
      title: 'Suggested replies',
      text: 'Ready-to-send answers in the inbox, written from the conversation so far.',
    },
    {
      title: 'Conversation summaries',
      text: 'Long threads condensed to what the customer needs, before you reply.',
    },
    {
      title: 'An assistant for common questions',
      text: 'Answers from your own articles inside the reply window, and hands over to a person when unsure.',
    },
    {
      title: 'Templates drafted for you',
      text: 'Describe the message; get Meta-ready template drafts to review and submit.',
    },
  ];
}
