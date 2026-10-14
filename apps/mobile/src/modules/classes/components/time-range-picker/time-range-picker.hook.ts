import { includesRange, isRangeBlocked, mergeTimeRanges, rangeLabel } from "../../utils/time-ranges";

import { UseTimeRangePickerProps } from "./time-range-picker.types";

export const useTimeRangePicker = ({
  suggestions,
  added,
  selected,
  nowMinutes,
}: UseTimeRangePickerProps) => {
  const chips = mergeTimeRanges(suggestions, added).map((range) => {
    const isSelected = includesRange(selected, range);

    return {
      range,
      label: rangeLabel(range),
      selected: isSelected,
      // A selected range can always be turned off, even when it has since gone past.
      blocked: !isSelected && isRangeBlocked(range, selected, nowMinutes),
    };
  });

  return {
    chips,
    showSuggestionsHint: suggestions.length > 0,
    showPastHint: nowMinutes !== null,
    showOverlapHint: selected.length > 0,
  };
};
