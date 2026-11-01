import { useState } from "react";

import { UseTimeFieldProps } from "./time-field.types";

export const useTimeField = ({ onChange }: UseTimeFieldProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = () => setIsDialogOpen(true);
  const closeDialog = () => setIsDialogOpen(false);
  const selectTime = (event: unknown, date: Date) => {
    setIsDialogOpen(false);
    onChange(event, date);
  };

  return { isDialogOpen, openDialog, closeDialog, selectTime };
};
