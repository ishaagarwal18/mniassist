import { describe, expect, it } from 'vitest';

import { NewsletterIssueStatus, NewsletterSubscriberStatus, type NewsletterIssueDto } from '../../proxy/newsletter/newsletter.service';
import { issueProgress, issueStatus, subscriberStatus } from './newsletter-logic';

const issue = (over: Partial<NewsletterIssueDto>): NewsletterIssueDto => ({
  id: 'i',
  subject: 'November',
  bodyHtml: '<p>x</p>',
  status: NewsletterIssueStatus.Draft,
  recipientCount: 0,
  sentCount: 0,
  failedCount: 0,
  creationTime: '2026-11-20T10:00:00Z',
  ...over,
});

describe('issueProgress', () => {
  it('counts delivered and failed against the recipients when sending started', () => {
    expect(issueProgress({ recipientCount: 200, sentCount: 90, failedCount: 10 })).toBe(50);
  });

  it('is 0 with no recipients and never above 100', () => {
    expect(issueProgress({ recipientCount: 0, sentCount: 0, failedCount: 0 })).toBe(0);
    expect(issueProgress({ recipientCount: 10, sentCount: 11, failedCount: 0 })).toBe(100);
  });
});

describe('issueStatus', () => {
  it('shows progress while sending', () => {
    expect(issueStatus(issue({ status: NewsletterIssueStatus.Sending, recipientCount: 4, sentCount: 1 })).label).toBe(
      'Sending · 25%',
    );
  });

  it('names drafts and sent issues', () => {
    expect(issueStatus(issue({})).label).toBe('Draft');
    expect(issueStatus(issue({ status: NewsletterIssueStatus.Sent })).tone).toBe('good');
  });
});

describe('subscriberStatus', () => {
  it('describes each state in plain words', () => {
    expect(subscriberStatus(NewsletterSubscriberStatus.Pending).label).toBe('Waiting to confirm');
    expect(subscriberStatus(NewsletterSubscriberStatus.Confirmed).tone).toBe('good');
    expect(subscriberStatus(NewsletterSubscriberStatus.Unsubscribed).label).toBe('Unsubscribed');
  });
});
