export interface EmailTemplateSummaryDto {
  key: string;
  displayName: string;
  description: string;
  isCustomized: boolean;
  usesHostWording: boolean;
}

export interface EmailTemplateDto extends EmailTemplateSummaryDto {
  hasSubject: boolean;
  subject?: string | null;
  body: string;
  defaultSubject?: string | null;
  defaultBody: string;
  variables: EmailTemplateVariableDto[];
}

export interface EmailTemplateVariableDto {
  name: string;
  description: string;
  sample: string;
}

export interface UpdateEmailTemplateInput {
  subject?: string | null;
  body: string;
}

export interface EmailTemplatePreviewDto {
  subject: string;
  html: string;
}
