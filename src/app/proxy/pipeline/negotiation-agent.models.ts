import { PagedAndSortedResultRequestDto, FullAuditedEntityDto, EntityDto } from '@abp/ng.core';
import {
  CustomerPersona,
  NegotiationAction,
  NegotiationSessionStatus,
  NegotiationStrategy,
  OfferSender,
} from './negotiation-enums';

export interface NegotiationPolicyDto extends FullAuditedEntityDto<string> {
  name: string;
  isActive: boolean;
  targetMarginPercent: number;
  floorMarginPercent: number;
  maxDiscountPercent: number;
  maxRounds: number;
  strategy: NegotiationStrategy;
  concessionStepPercent: number;
  allowPaymentTermTradeoffs: boolean;
  allowVolumeCommitmentTradeoffs: boolean;
  minVolumeIncreasePercent: number;
  autoApprovalLimitInPaise: number;
  autoApprovalLimitInRupees: number;
  systemPromptGuidance?: string;
}

export interface CreateUpdateNegotiationPolicyDto {
  name: string;
  isActive: boolean;
  targetMarginPercent: number;
  floorMarginPercent: number;
  maxDiscountPercent: number;
  maxRounds: number;
  strategy: NegotiationStrategy;
  concessionStepPercent: number;
  allowPaymentTermTradeoffs: boolean;
  allowVolumeCommitmentTradeoffs: boolean;
  minVolumeIncreasePercent: number;
  autoApprovalLimitInPaise: number;
  systemPromptGuidance?: string;
}

export interface NegotiationOfferDto extends EntityDto<string> {
  sessionId: string;
  roundNumber: number;
  sender: OfferSender;
  offeredAmountInPaise: number;
  offeredAmountInRupees: number;
  discountPercent: number;
  marginPercent: number;
  proposedPaymentTerms?: string;
  proposedQuantity?: number;
  messageContent: string;
  aiReasoning?: string;
  actionTaken: NegotiationAction;
  createdAtUtc: string;
}

export interface NegotiationSessionDto extends FullAuditedEntityDto<string> {
  sessionCode: string;
  quotationId: string;
  quotationReference: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  enquiryId?: string;
  policyId: string;
  status: NegotiationSessionStatus;
  originalAmountInPaise: number;
  originalAmountInRupees: number;
  originalMarginPercent: number;
  estimatedCostInPaise: number;
  estimatedCostInRupees: number;
  currentAmountInPaise: number;
  currentAmountInRupees: number;
  currentMarginPercent: number;
  currentDiscountPercent: number;
  roundCount: number;
  paymentTerms: string;
  volumeUnits: number;
  summaryNotes?: string;
  escalationReason?: string;
  revisedQuotationId?: string;
  completedAtUtc?: string;
  offers: NegotiationOfferDto[];
}

export interface GetNegotiationSessionListInput extends PagedAndSortedResultRequestDto {
  status?: NegotiationSessionStatus;
  searchFilter?: string;
}

export interface EvaluateOfferInput {
  sessionId?: string;
  quotationId?: string;
  baselineAmountInPaise: number;
  estimatedCostInPaise: number;
  proposedAmountInPaise: number;
  proposedDiscountPercent?: number;
  currentRound: number;
  currentPaymentTerms: string;
  proposedPaymentTerms?: string;
  currentQuantity: number;
  proposedQuantity?: number;
  strategyOverride?: NegotiationStrategy;
}

export interface EvaluateOfferResultDto {
  recommendedAction: NegotiationAction;
  counterOfferAmountInPaise: number;
  counterOfferAmountInRupees: number;
  concededDiscountPercent: number;
  resultingMarginPercent: number;
  counterPaymentTerms: string;
  counterQuantity: number;
  requiresHumanApproval: boolean;
  internalRationale: string;
  whatsAppMessageDraft: string;
}

export interface ProcessChatNegotiationInput {
  sessionId?: string;
  quotationId?: string;
  contactId: string;
  customerMessage: string;
}

export interface ProcessChatNegotiationResultDto {
  sessionId: string;
  sessionCode: string;
  status: NegotiationSessionStatus;
  actionTaken: NegotiationAction;
  currentAmountInPaise: number;
  currentAmountInRupees: number;
  currentDiscountPercent: number;
  currentMarginPercent: number;
  replyWhatsAppText: string;
  aiReasoning: string;
  escalated: boolean;
  revisedQuotationId?: string;
}

export interface SimulateNegotiationInput {
  quotationAmountInPaise: number;
  estimatedCostInPaise: number;
  persona: CustomerPersona;
  initialCustomerDiscountDemandPercent: number;
  customUserTurnMessage?: string;
  existingRounds?: NegotiationOfferDto[];
}

export interface SimulateNegotiationResultDto {
  rounds: NegotiationOfferDto[];
  finalStatus: NegotiationSessionStatus;
  finalAmountInPaise: number;
  finalAmountInRupees: number;
  finalMarginPercent: number;
  finalDiscountPercent: number;
  simulationSummary: string;
}

export interface HumanInterventionInput {
  sessionId: string;
  action: NegotiationAction;
  overrideAmountInPaise?: number;
  overridePaymentTerms?: string;
  managerNotes: string;
  whatsAppMessageDraft?: string;
}
