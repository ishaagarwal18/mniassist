/**
 * Plain-language error wording. A first-time user should read what happened and what to do
 * next, never a framework's stock sentence or an HTTP status line.
 */

/** ABP's built-in English messages, which mean nothing to a vendor, and what to say instead. */
const STOCK_MESSAGES: readonly (readonly [RegExp, string])[] = [
  [
    /^Authorization failed!?/i,
    'Your role does not allow this. Ask your workspace administrator to give you access.',
  ],
  [
    /^You are not allowed/i,
    'Your role does not allow this. Ask your workspace administrator to give you access.',
  ],
  [
    /^An internal error occurred/i,
    'Something on our side failed while saving or loading this. Try again in a minute. If it keeps happening, tell your administrator or our support team.',
  ],
  [
    /^Your request is not valid!?$/i,
    'Some details are missing or not in the right format. Check the highlighted fields.',
  ],
  [
    /^There is no entity/i,
    'This record no longer exists. Someone may have deleted it. Refresh the page to see the current list.',
  ],
  [
    /^The data you have submitted has already changed/i,
    'Someone else changed this record while you were editing. Refresh the page, then make your change again.',
  ],
];

/** Replaces a stock framework message with plain wording; other messages pass through. */
export function plainServerMessage(message: string): string {
  const text = message.trim();
  for (const [pattern, plain] of STOCK_MESSAGES) if (pattern.test(text)) return plain;
  return text;
}

/** Angular's own "Http failure response for …" text, which carries a URL and a status code. */
export function isRawHttpText(message: string): boolean {
  return /^Http failure (response|during parsing)/i.test(message.trim());
}

/** What to tell someone when the server gave no message of its own, by HTTP status. */
export function statusExplanation(status: number): { title: string; content: string } {
  if (status === 0) {
    return {
      title: 'Cannot reach the server',
      content:
        'Check your internet connection and try again. If it keeps happening, the service may be down for a few minutes.',
    };
  }
  switch (status) {
    case 400:
    case 422:
      return {
        title: 'Please check the details',
        content:
          'Some details are missing or not in the right format. Check the form and try again.',
      };
    case 401:
      return { title: 'Signed out', content: 'Your session has ended. Sign in again to continue.' };
    case 403:
      return {
        title: 'Not allowed',
        content:
          'Your role does not allow this. Ask your workspace administrator to give you access.',
      };
    case 404:
      return {
        title: 'Not found',
        content: 'It may have been deleted or moved. Refresh the page to see the current list.',
      };
    case 408:
    case 504:
      return {
        title: 'Took too long',
        content: 'The server took too long to answer. Wait a moment and try again.',
      };
    case 409:
      return {
        title: 'Already changed',
        content:
          'Someone else changed this while you were working. Refresh the page and try again.',
      };
    case 413:
      return {
        title: 'File too large',
        content: 'The file is too big to upload. Try a smaller file, or split it into parts.',
      };
    case 429:
      return {
        title: 'Too many tries',
        content: 'You did this many times in a short time. Wait a minute, then try again.',
      };
  }
  if (status >= 500) {
    return {
      title: 'Server problem',
      content:
        'Something on our side failed. Your work was not saved. Try again in a minute. If it keeps happening, tell your administrator or our support team.',
    };
  }
  return {
    title: 'Couldn’t complete that',
    content: `That didn’t work (code ${status}). Try again. If it keeps happening, tell your administrator or our support team.`,
  };
}

/** Server "details" that are a stack trace or exception dump, not something to show a person. */
export function isStackLike(text: string): boolean {
  return /\bat [\w.<>]+\(|Exception:|\n\s+at /.test(text);
}
