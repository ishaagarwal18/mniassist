/**
 * A [Flags] enum on the server, so values combine bitwise. `InApp | Email` is 3.
 * Test membership with `(value & NotificationChannels.Email) !== 0` rather than
 * equality — an equality check silently fails for every combined value.
 */
export enum NotificationChannels {
  None = 0,
  InApp = 1,
  Email = 2,
  WhatsApp = 4,
}
