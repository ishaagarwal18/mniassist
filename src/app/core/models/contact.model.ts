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
  /**
   * The contact's stored fields as the API has them. The edit form starts from these and
   * sends back what it does not show (owner, tags, language), so saving never clears them.
   */
  readonly stored?: StoredContactFields;
}

export interface StoredContactFields {
  readonly companyName?: string;
  readonly accountId?: string;
  readonly city?: string;
  readonly state?: string;
  readonly designation?: string;
  readonly role?: number;
  readonly languageCode?: string;
  readonly ownerUserId?: string;
  readonly tags: readonly string[];
}

export interface Segment {
  readonly id: string;
  readonly name: string;
  readonly count: number;
}
