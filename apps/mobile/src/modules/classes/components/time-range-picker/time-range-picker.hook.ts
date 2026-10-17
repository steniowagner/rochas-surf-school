import {
  includesRange,
  isRangeBlocked,
  isSameRange,
  mergeTimeRanges,
  rangeLabel,
  startsByNow,
} from "../../utils/time-ranges";

import { UseTimeRangePickerProps } from "./time-range-picker.types";

export const useTimeRangePicker = ({
  suggestions,
  added,
  selected,
  nowMinutes,
  single = false,
  ownRange = null,
  onToggle,
}: UseTimeRangePickerProps) => {
  const isPast = (range: UseTimeRangePickerProps["selected"][number]) =>
    single &&
    nowMinutes !== null &&
    startsByNow(range, nowMinutes) &&
    !(ownRange !== null && isSameRange(ownRange, range));

  const chips = mergeTimeRanges(suggestions, added).map((range) => {
    const isSelected = includesRange(selected, range);

    return {
      range,
      label: rangeLabel(range),
      selected: isSelected,
      // Only one range is chosen in single mode, so nothing overlaps; the ones that started are blocked instead.
      blocked:
        !isSelected &&
        (single ? isPast(range) : isRangeBlocked(range, selected)),
    };
  });

  const pressChip = (range: UseTimeRangePickerProps["selected"][number], isSelected: boolean) => {
    if (!(single && isSelected)) {
      onToggle(range);
    }
  };

  return {
    chips,
    pressChip,
    showSuggestionsHint: suggestions.length > 0,
    showPastHint: !single && nowMinutes !== null,
    showOverlapHint: !single && selected.length > 0,
  };
};
