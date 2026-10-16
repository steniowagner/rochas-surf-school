import { useState } from "react";

import { rangeOf } from "../../utils/time-ranges";

import { UseTimeRangeSheetProps } from "./time-range-sheet.types";

// As in the design: a new range opens at 12:00 to 13:00.
const defaultStart = () => new Date(2000, 0, 1, 12, 0);
const defaultEnd = () => new Date(2000, 0, 1, 13, 0);

export const useTimeRangeSheet = ({
  visible,
  onClose,
  onSubmit,
}: UseTimeRangeSheetProps) => {
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [wasVisible, setWasVisible] = useState(visible);

  // The times never outlive the sheet: whatever closes it, it opens at 12:00 to 13:00.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) {
      setStart(defaultStart());
      setEnd(defaultEnd());
    }
  }

  const { range, valid } = rangeOf(start, end);
  const changeStart = (_event: unknown, date: Date) => setStart(date);
  const changeEnd = (_event: unknown, date: Date) => setEnd(date);
  const submit = () => onSubmit(range);

  return { start, end, valid, changeStart, changeEnd, submit, close: onClose };
};
