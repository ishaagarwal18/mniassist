/** The pricing category Meta reports on the status webhook.
 *  Never inferred locally — billing meters on what Meta actually said. */
export type PricingCategory = 'marketing' | 'utility' | 'authentication' | 'service';

/** Outcomes that campaign reporting must keep distinct.
 *  `withheld` is Meta's per-user frequency cap (error 131049): not a failure,
 *  not billed, and excluded from the delivery rate. */
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'withheld';

export interface CampaignCounters {
  readonly queued: number;
  readonly sent: number;
  readonly delivered: number;
  readonly read: number;
  readonly replied: number;
  readonly failed: number;
  readonly withheld: number;
  readonly optedOut: number;
}

export interface CostLine {
  readonly label: string;
  readonly category: PricingCategory;
  readonly volume: number;
  readonly billable: number;
  readonly amountPaise: number;
  readonly free: boolean;
}
