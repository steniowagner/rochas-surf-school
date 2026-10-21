export type SaveSchoolSettingsVariables = {
  /** Sent only when it differs from the saved switch. */
  waitingListEnabled?: boolean;
  /** E.164; sent only when it differs from the saved number. */
  whatsappNumber?: string;
};
