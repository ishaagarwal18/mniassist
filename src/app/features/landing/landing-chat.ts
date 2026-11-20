import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ArIcon } from '../../ui';

/** The landing hero's example conversation: a customer reports a fault, AI
 *  suggests the reply, the team acts. Its own component so the landing page's
 *  styles stay inside the per-component style budget. */
@Component({
  selector: 'ar-landing-chat',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="chat" aria-label="Example: a service request handled on WhatsApp">
      <div class="chat__bar">
        <span class="chat__avatar">PK</span>
        <span class="chat__who">
          <strong>Prakash Kulkarni</strong>
          <small>Precision Tools Pvt Ltd · Pune</small>
        </span>
        <span class="chat__ctx">VMC-850 · AMC active</span>
      </div>
      <div class="chat__body">
        <p class="msg msg--in">
          Our VMC-850 (S/N 21-0457) spindle is overheating again. Can someone come this week?
          <span class="msg__meta">10:02 am</span>
        </p>
        <div class="ai">
          <span class="ai__h"><ar-icon name="sparkle" [size]="13" /> AI suggested reply</span>
          <p>
            Sorry about that, Mr. Kulkarni. Your machine is under AMC, so the visit is covered. I
            have raised a service ticket and an engineer will call you today.
          </p>
        </div>
        <p class="msg msg--out">
          Ticket TK-2481 raised. Ravi from field service will visit tomorrow at 10 am.
          <span class="msg__meta">10:05 am ✓✓</span>
        </p>
      </div>
      <figcaption>Example conversation</figcaption>
    </figure>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .chat {
      margin: 0;
      background: var(--ar-bg-100);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--ar-radius-modal);
      overflow: hidden;
      color: var(--ar-ink-900);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      animation: gentleFloat 7s ease-in-out infinite;
      will-change: transform;
    }
    @keyframes gentleFloat {
      0% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-8px);
      }
      100% {
        transform: translateY(0);
      }
    }
    .chat__bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: var(--ar-white);
      border-bottom: 1px solid var(--ar-line-200);
      font-size: 13px;
    }
    .chat__who {
      flex: 1;
      min-width: 0;
    }
    .chat__who small {
      display: block;
      font-size: 11px;
      color: var(--ar-ink-400);
    }
    .chat__avatar {
      flex: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
      font-weight: 700;
      font-size: 12px;
    }
    .chat__ctx {
      flex: none;
      padding: 2px 8px;
      border: 1px solid var(--ar-green-200);
      border-radius: 999px;
      background: var(--ar-green-100);
      color: var(--ar-green-600);
      font: 500 11px var(--ar-font-mono);
    }
    .chat__body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px 14px;
    }
    .msg {
      margin: 0;
      max-width: 88%;
      padding: 8px 10px;
      border-radius: var(--ar-radius-inset);
      font-size: 13px;
      line-height: 1.5;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
    }
    .msg--out {
      align-self: flex-end;
      background: var(--ar-blue-100);
      border-color: var(--ar-blue-200);
    }
    .msg__meta {
      display: block;
      text-align: right;
      font-size: 10.5px;
      color: var(--ar-ink-400);
    }
    .ai {
      align-self: flex-end;
      max-width: 92%;
      padding: 9px 11px;
      border: 1px solid rgba(0, 184, 169, 0.35);
      border-left: 3px solid var(--ar-ai-500);
      border-radius: var(--ar-radius-inset);
      background: var(--ar-ai-100);
      font-size: 12.5px;
      line-height: 1.5;
      box-shadow: 0 0 14px rgba(0, 184, 169, 0.22), inset 0 0 8px rgba(0, 184, 169, 0.05);
      animation: tealGlowPulse 4s ease-in-out infinite alternate;
    }
    @keyframes tealGlowPulse {
      0% {
        box-shadow: 0 0 10px rgba(0, 184, 169, 0.16), inset 0 0 6px rgba(0, 184, 169, 0.03);
        border-color: rgba(0, 184, 169, 0.28);
      }
      100% {
        box-shadow: 0 0 20px rgba(0, 184, 169, 0.38), inset 0 0 12px rgba(0, 184, 169, 0.08);
        border-color: rgba(0, 184, 169, 0.6);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .chat,
      .ai {
        animation: none;
      }
    }
    .ai p {
      margin: 4px 0 0;
      color: var(--ar-ink-700);
    }
    .ai__h {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font: 600 11px var(--ar-font-sans);
      color: var(--ar-ai-700);
    }
    figcaption {
      padding: 0 14px 10px;
      font: 400 11px var(--ar-font-mono);
      color: var(--ar-ink-400);
    }
    @media (max-width: 420px) {
      .chat__bar {
        padding: 10px 12px;
        gap: 8px;
      }
      .chat__ctx {
        font-size: 10px;
        padding: 2px 6px;
      }
      .msg {
        max-width: 95%;
        font-size: 12.5px;
      }
    }
  `,
})
export class ArLandingChat {}
