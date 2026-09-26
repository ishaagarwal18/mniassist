export interface PublicTicketPortalDto {
  ready: boolean;
}

export interface SubmitPublicTicketInput {
  name: string;
  phone: string;
  email?: string | null;
  subject: string;
  description?: string | null;
  consent: boolean;
  /** A field real visitors never see. Anything here means a script filled in the form. */
  website?: string | null;
}

export interface SubmitPublicTicketResultDto {
  message: string;
  reference?: string | null;
}
