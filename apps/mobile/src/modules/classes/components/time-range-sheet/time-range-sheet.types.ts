import type { TimeRange } from "@rochas-surf-school/classes";

export type TimeRangeSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (range: TimeRange) => void;
};

export type UseTimeRangeSheetProps = TimeRangeSheetProps;
