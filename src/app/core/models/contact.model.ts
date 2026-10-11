export type ConsentSource =
  | 'website'
  | 'whatsapp_optin'
  | 'import'
  | 'ctwa'
  | 'qr'
  | 'manual'
  | 'api'
  | 'email_optin'
  | 'sms_optin'
  | 'voice_optin'
  | 'instagram'
  | 'messenger'
  | 'consent_manager'
  | 'lead_ad';

export interface ConsentRecord {
  readonly source: ConsentSource;
  readonly evidence: string;
  readonly textVersion: string;
  readonly grantedAt: string;
  readonly withdrawnAt?: string;
}

/** The industrial field pack — what a generic contact record does not model. */
export interface IndustrialAttributes {
  readonly industry?: string;
  readonly plantLocation?: string;
  readonly systems?: readonly string[];
  readonly decisionRole?: 'Maintenance' | 'Purchase' | 'Engineering' | 'Plant head' | 'Dealer';
  readonly capexBand?: string;
}

export interface Contact {
  readonly id: string;
  readonly name: string;
  readonly phoneE164: string;
  readonly company: string;
  readonly attributes: IndustrialAttributes;
  readonly consent: ConsentRecord;
  readonly amcExpiry?: string;
  readonly lastActivity: string;
  /** 0–100 engagement score (M03-10). */
  readonly score?: number;
}

export interface Segment {
  readonly id: string;
  readonly name: string;
  readonly count: number;
}
