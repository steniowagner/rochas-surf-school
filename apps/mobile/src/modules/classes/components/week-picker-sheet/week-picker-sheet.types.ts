export type WeekPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The Monday of the selected week, `YYYY-MM-DD`: its row is highlighted and its month opens first. */
  weekStart: string;
  /** Today, `YYYY-MM-DD`. */
  today: string;
  /** Any day the admin picked: its week becomes the selected one. */
  onSelectDate: (date: string) => void;
};

export type UseWeekPickerSheetProps = Pick<
  WeekPickerSheetProps,
  "visible" | "weekStart" | "onClose" | "onSelectDate"
>;
