export interface ServiceWindow {
  /** null when the window is closed — the composer must fall back to templates. */
  readonly expiresAt: Date | null;
}

export interface MessageMedia {
  /** Absolute URL to stream the file from the API. */
  readonly url: string;
  readonly mimeType: string;
  /** 'image' | 'video' | 'audio' | 'document' — drives which element renders it. */
  readonly kind: 'image' | 'video' | 'audio' | 'document';
}

export interface Message {
  readonly id: string;
  readonly direction: 'in' | 'out';
  readonly body: string;
  readonly at: string;
  readonly status?: 'sent' | 'delivered' | 'read';
  readonly media?: MessageMedia;
}

export interface Conversation {
  readonly id: string;
  readonly contactName: string;
  readonly company: string;
  readonly phoneE164: string;
  readonly snippet: string;
  readonly at: string;
  readonly unread: number;
  readonly window: ServiceWindow;
  readonly messages: readonly Message[];
}
