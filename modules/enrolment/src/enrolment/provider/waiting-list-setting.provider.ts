export interface WaitingListSetting {
  /** Whether students may ask for a seat in a full class. */
  isEnabled(): Promise<boolean>;
}
