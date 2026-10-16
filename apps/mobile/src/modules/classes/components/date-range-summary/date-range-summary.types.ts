export type DateRangeSummaryProps = {
  startDate: string | null;
  /** `null` while a single day (or nothing) is chosen. */
  endDate: string | null;
  /** Days of the range that are left out. */
  excludedDates: string[];
  onClear: () => void;
};

export type UseDateRangeSummaryProps = Pick<
  DateRangeSummaryProps,
  "startDate" | "endDate" | "excludedDates"
>;
