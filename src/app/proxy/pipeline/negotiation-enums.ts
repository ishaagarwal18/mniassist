export enum NegotiationStrategy {
  ConcessionCurve = 0,
  VolumeCommitment = 1,
  PaymentTermTradeoff = 2,
  FirmFixed = 3,
}

export const negotiationStrategyOptions = [
  { value: NegotiationStrategy.ConcessionCurve, label: 'Concession Curve (Progressive Steps)' },
  {
    value: NegotiationStrategy.PaymentTermTradeoff,
    label: 'Payment Terms Trade-off (Advance / Net 7)',
  },
  { value: NegotiationStrategy.VolumeCommitment, label: 'Volume Tier Requirement (+20% Qty)' },
  { value: NegotiationStrategy.FirmFixed, label: 'Firm Fixed Price (Defend Value & Warranty)' },
];

export enum NegotiationSessionStatus {
  Negotiating = 0,
  Agreed = 1,
  EscalatedToHuman = 2,
  WalkedAway = 3,
  Expired = 4,
}

export enum OfferSender {
  Customer = 0,
  AiAgent = 1,
  HumanSalesManager = 2,
}

export enum NegotiationAction {
  InitialQuote = 0,
  CounterOffer = 1,
  AcceptOffer = 2,
  RejectAndWalkAway = 3,
  EscalateToHuman = 4,
}

export enum CustomerPersona {
  AggressiveProcurement = 0,
  BudgetConstrained = 1,
  VolumeBuyer = 2,
  SpeedFocused = 3,
}
