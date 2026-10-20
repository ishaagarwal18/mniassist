/** A point on the map. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

const PAIR = /(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)/;

/**
 * Reads a location typed or pasted by an agent: "18.5204, 73.8567", a Google Maps link (…/@18.52,73.85,15z, ?q=18.52,73.85,
 * …!3d18.52!4d73.85, ?ll= or ?query=) or a geo: URI. Null when there are no coordinates in it — a short maps.app.goo.gl link
 * carries none until opened, so the agent is asked for the full link or the numbers.
 */
export function parseCoordinates(text: string): Coordinates | null {
  const value = text.trim();
  if (!value) return null;

  const decoded = safeDecode(value);
  const candidates = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(decoded), // the dropped pin, more exact than the map's centre
    /[?&](?:q|query|ll|destination|daddr)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(decoded),
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(decoded),
    /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i.exec(decoded),
    /^[^a-z]*$/i.test(decoded) ? PAIR.exec(decoded) : null,
  ];
  for (const match of candidates) {
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180 &&
      !(latitude === 0 && longitude === 0)
    ) {
      return { latitude, longitude };
    }
  }
  return null;
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** What went wrong reading this device's location, in words the agent can act on. */
export function locationErrorText(code: number | undefined): string {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return 'Location is blocked for this site. Allow it from the icon left of the address bar, or type the place below.';
    case 2: // POSITION_UNAVAILABLE
      return "This computer couldn't find its location (on Windows, turn on Settings → Privacy → Location). Type the place below instead.";
    case 3: // TIMEOUT
      return 'Finding the location took too long. Try again, or type the place below.';
    default:
      return 'The location could not be read. Type the place below instead.';
  }
}
