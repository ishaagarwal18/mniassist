/** What a prospect enters on the ROI calculator. */
export interface RoiInputs {
  /** Calls a month an AI agent could take: enquiries, service requests, reminders, payment follow-ups. */
  callsPerMonth: number;
  /** Average length of one of those calls, in minutes. */
  averageCallMinutes: number;
  /** A person's time per call, talking and noting it down, in minutes. */
  staffMinutesPerCall: number;
  /** What an hour of that person's time costs, in rupees (salary and overheads). */
  staffCostPerHour: number;
  /** Share of the calls the AI handles to the end, without a person, from 0 to 100. */
  aiHandledPercent: number;
  /** The AI call rate quoted by the sales team, in rupees a minute. Null until the visitor enters it. */
  aiPricePerMinute: number | null;
  /** The plan's monthly fee, in rupees, excluding GST. */
  planFeePerMonth: number;
}

export interface RoiEstimate {
  aiHandledCalls: number;
  staffHoursSaved: number;
  staffCostSaved: number;
  aiMinutes: number;
  aiCallCost: number;
  planFee: number;
  monthlySaving: number;
  /** Saving as a multiple of what the AI and plan cost; null when they cost nothing. */
  returnMultiple: number | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/**
 * A month's estimate: the calls the AI handles save a person's time at their hourly cost; against that, those calls' AI minutes at
 * the quoted rate and the plan fee. Every figure excludes GST. Null without an AI rate, so nothing is shown on a price we didn't give.
 */
export function roiEstimate(inputs: RoiInputs): RoiEstimate | null {
  if (
    inputs.aiPricePerMinute === null ||
    !Number.isFinite(inputs.aiPricePerMinute) ||
    inputs.aiPricePerMinute < 0
  )
    return null;
  const calls = clamp(Math.round(inputs.callsPerMonth), 0, 1_000_000);
  const share = clamp(inputs.aiHandledPercent, 0, 100) / 100;
  const aiHandledCalls = Math.round(calls * share);
  const staffHoursSaved = (aiHandledCalls * clamp(inputs.staffMinutesPerCall, 0, 120)) / 60;
  const staffCostSaved = staffHoursSaved * clamp(inputs.staffCostPerHour, 0, 100_000);
  // Every call the AI takes uses AI minutes, including the ones it hands to a person.
  const aiMinutes = calls * clamp(inputs.averageCallMinutes, 0, 60);
  const aiCallCost = aiMinutes * inputs.aiPricePerMinute;
  const planFee = clamp(inputs.planFeePerMonth, 0, 10_000_000);
  const cost = aiCallCost + planFee;
  const monthlySaving = staffCostSaved - cost;
  return {
    aiHandledCalls,
    staffHoursSaved: Math.round(staffHoursSaved * 10) / 10,
    staffCostSaved: Math.round(staffCostSaved),
    aiMinutes: Math.round(aiMinutes),
    aiCallCost: Math.round(aiCallCost),
    planFee: Math.round(planFee),
    monthlySaving: Math.round(monthlySaving),
    returnMultiple: cost > 0 ? Math.round((staffCostSaved / cost) * 10) / 10 : null,
  };
}
