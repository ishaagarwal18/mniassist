import { mapEnumToOptions } from '@abp/ng.core';

export enum VoiceCallMode {
  /** The platform rings the customer into the IVR flow. No rep is on the line. */
  Ivr = 0,
  /** A rep clicked to call: their phone rings first, then the customer's. */
  ClickToCall = 1,
  /** Made or taken outside the platform and written up afterwards. */
  Manual = 2,
  /** Made or answered on the in-browser phone — no separate handset rings. */
  Softphone = 3,
}

export const voiceCallModeOptions = mapEnumToOptions(VoiceCallMode);
