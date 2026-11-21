import type { ChipTone } from '../../ui/chip';
import {
  NewsletterIssueStatus,
  NewsletterSubscriberStatus,
  type NewsletterIssueDto,
} from '../../proxy/newsletter/newsletter.service';

export function subscriberStatus(s: NewsletterSubscriberStatus): { label: string; tone: ChipTone } {
  switch (s) {
    case NewsletterSubscriberStatus.Confirmed:
      return { label: 'Confirmed', tone: 'good' };
    case NewsletterSubscriberStatus.Unsubscribed:
      return { label: 'Unsubscribed', tone: 'neutral' };
    default:
      return { label: 'Waiting to confirm', tone: 'amber' };
  }
}

export function issueStatus(i: NewsletterIssueDto): { label: string; tone: ChipTone } {
  switch (i.status) {
    case NewsletterIssueStatus.Sending:
      return { label: `Sending · ${issueProgress(i)}%`, tone: 'teal' };
    case NewsletterIssueStatus.Sent:
      return { label: 'Sent', tone: 'good' };
    default:
      return { label: 'Draft', tone: 'neutral' };
  }
}

/** How far a send has got, 0–100, from the tried count over the recipients when it started. */
export function issueProgress(i: Pick<NewsletterIssueDto, 'recipientCount' | 'sentCount' | 'failedCount'>): number {
  if (i.recipientCount <= 0) return 0;
  return Math.min(100, Math.round(((i.sentCount + i.failedCount) / i.recipientCount) * 100));
}

/** A starting point for a new issue, in the simple HTML the email wraps in its own layout. */
export const STARTER_BODY = `<h1 style="margin:0 0 12px;font-size:22px;color:#0b1220">What's new in MNI Assist</h1>
<p>Hello,</p>
<p>Here's what changed this month, and one idea you can use with your customers this week.</p>
<h2 style="font-size:17px;color:#0b1220">New in the product</h2>
<ul>
  <li>…</li>
</ul>
<p><a href="https://mniassist.com" style="color:#1769ff">Open MNI Assist</a></p>`;

/** Saves the CSV the API built as a file, with a BOM so Excel reads ₹ and non-English names correctly. */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
