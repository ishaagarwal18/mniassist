/** What the portal page asks for, checked the moment someone tries to send it — before the round trip that would say the same thing. */
export interface TicketPortalAnswers {
  name: string;
  phone: string;
  subject: string;
  consent: boolean;
}

/** Field key → message, matching the wording ServiceTicketPublicAppService itself would give for the same problem. Empty when
 *  everything required is there — the server still has the last word (a phone number's actual validity, for one). */
export function checkTicketAnswers(a: TicketPortalAnswers): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!a.name.trim()) errors['name'] = 'Enter your name.';
  if (!a.phone.trim()) errors['phone'] = 'Enter a valid phone number, with the country code if it is not an Indian number.';
  if (!a.subject.trim()) errors['subject'] = "Tell us what this is about.";
  if (!a.consent) errors['consent'] = 'Please tick the box to agree, so we can get back to you.';
  return errors;
}
