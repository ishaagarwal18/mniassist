export interface WorkspaceProfileDto {
  legalName?: string | null;
  tradeName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  /** The GSTIN's first two digits, when there is a GSTIN. */
  stateCode?: string | null;
  /** Legal name and a full address are there: enough to issue documents. */
  isComplete: boolean;
}

export interface UpdateWorkspaceProfileInput {
  legalName: string;
  tradeName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  phone?: string | null;
  email?: string | null;
}
